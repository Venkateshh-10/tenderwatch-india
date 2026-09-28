import { getCompany } from "@/lib/company/store";
import type { CompanyDna } from "@/lib/company/types";
import { prisma } from "@/lib/db";
import { serpApiKeyPresent, type DataMode } from "@/lib/mode";
import { evaluateReadiness, type Evaluation } from "@/lib/readiness/evaluate";
import { MAX_SOURCE_FETCHES, SEARCH_TIMEOUT_MS, SEARCH_TIMEOUT_RETRY_MS } from "@/lib/search/limits";
import { planChangeQueries, planDiscoveryQueries, type PlannedQuery } from "@/lib/search/query-planner";
import { buildCacheKey, cacheExpiry, cacheIsFresh } from "@/lib/serpapi/cache";
import { searchGoogle } from "@/lib/serpapi/google";
import { searchGoogleNews } from "@/lib/serpapi/news";
import { normalizeSerpApiResults } from "@/lib/serpapi/normalize";
import { SerpApiError, type NormalizedHit } from "@/lib/serpapi/types";
import { authorityRank, classifyDomain, type AuthorityTier } from "@/lib/tender/authority";
import {
  classifySearchHit,
  hasProcurementIdentity,
  isDiscoverOpportunity,
  isNoiseDomain,
  normalizeHitTitle,
  procurementPortalScore,
  type HitClass,
  type TenderConfidence,
} from "@/lib/tender/candidate-gate";
import { clusterItems, dedupeKeyFor, type DedupeInput } from "@/lib/tender/dedupe";
import { extractFacts, type RequirementDraft } from "@/lib/tender/extract";
import { fetchPublicExcerpt, isVerifiedFetch, type SourceVerification } from "@/lib/tender/fetch-source";
import { recordSnapshot } from "@/lib/tender/record-snapshot";
import type { SnapshotPayload } from "@/lib/tender/snapshot";
import { isPastDeadline, istDateKey } from "@/lib/tender/dates";
import { verifiedDisplayTitle } from "@/lib/tender/display-title";
import { clusterEvidenceText } from "@/lib/tender/evidence-text";
import { jaccard, normalizeRef, normalizeUrl, titleTokens } from "@/lib/tender/text";

export type DiscoveryLogEntry = {
  engine: string;
  query: string;
  status: "success" | "error";
  resultCount: number;
  cacheHit: boolean;
  retrievedAt: string | null;
  message?: string;
};

export type DiscoveryResult = {
  mode: DataMode;
  log: DiscoveryLogEntry[];
  planned: PlannedQuery[];
  searchResultCount: number;
  uniqueOpportunities: number;
  relevantOpportunities: number;
  rejectedCount: number;
  supportingNewsCount: number;
  error: string | null;
  notice: string | null;
  lastVerifiedAt: string | null;
};

type Sourced = DedupeInput & {
  sourceId: string;
  snippet: string;
  pageText: string | null;
  fromPage: boolean;
  query: string;
  engine: string;
  position: number;
  hitClass: HitClass;
  confidence: TenderConfidence;
};

function fetchSerpPayload(query: PlannedQuery, timeoutMs: number): Promise<unknown> {
  return query.engine === "google_news" ? searchGoogleNews(query.query, timeoutMs) : searchGoogle(query.query, 8, timeoutMs);
}

function safeError(error: unknown): string {
  if (error instanceof SerpApiError) return error.message;
  return "Live search failed.";
}

async function executeLiveQuery(query: PlannedQuery, refresh: boolean): Promise<{
  hits: NormalizedHit[];
  cacheHit: boolean;
  retrievedAt: Date;
  error: string | null;
}> {
  const cacheKey = buildCacheKey(query.engine, query.query);
  if (!refresh) {
    const cached = await prisma.searchCache.findUnique({ where: { cacheKey } });
    if (cached && cacheIsFresh(cached.expiresAt)) {
      const hits = JSON.parse(cached.responseJson) as NormalizedHit[];
      return { hits, cacheHit: true, retrievedAt: cached.retrievedAt, error: null };
    }
  }

  try {
    const payload = await fetchSerpPayload(query, SEARCH_TIMEOUT_MS).catch(async (error: unknown) => {
      if (error instanceof SerpApiError && error.code === "timeout") {
        return fetchSerpPayload(query, SEARCH_TIMEOUT_RETRY_MS);
      }
      throw error;
    });
    const hits = normalizeSerpApiResults(query.engine, payload);
    const retrievedAt = new Date();
    await prisma.searchCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        engine: query.engine,
        query: query.query,
        parameters: JSON.stringify(query.parameters),
        responseJson: JSON.stringify(hits),
        retrievedAt,
        expiresAt: cacheExpiry(retrievedAt),
      },
      update: {
        responseJson: JSON.stringify(hits),
        retrievedAt,
        expiresAt: cacheExpiry(retrievedAt),
      },
    });
    return { hits, cacheHit: false, retrievedAt, error: null };
  } catch (error) {
    return { hits: [], cacheHit: false, retrievedAt: new Date(), error: safeError(error) };
  }
}

async function storeRun(input: {
  query: PlannedQuery;
  mode: DataMode;
  status: string;
  error: string | null;
  cacheHit: boolean;
  retrievedAt: Date;
  hits: Array<{ title: string; url: string; displayedLink: string | null; domain: string; snippet: string | null; dateText: string | null; position: number; authority: AuthorityTier; pageText: string | null; fromPage: boolean; verification?: SourceVerification }>;
}): Promise<Sourced[]> {
  const run = await prisma.searchRun.create({
    data: {
      engine: input.query.engine,
      query: input.query.query,
      parameters: JSON.stringify({ ...input.query.parameters, intent: input.query.intent, dataMode: input.mode }),
      resultCount: input.hits.length,
      status: input.status,
      error: input.error,
      cacheHit: input.cacheHit,
      purpose: "discovery",
      dataMode: input.mode,
      retrievedAt: input.retrievedAt,
    },
  });

  const sourced: Sourced[] = [];
  for (const hit of input.hits) {
    const title = normalizeHitTitle(hit.title) || hit.title;
    const source = await prisma.source.create({
      data: {
        searchRunId: run.id,
        position: hit.position,
        title,
        url: hit.url,
        displayedLink: hit.displayedLink,
        domain: hit.domain,
        snippet: hit.snippet,
        dateText: hit.dateText,
        retrievedAt: input.retrievedAt,
        engine: input.query.engine,
        authorityTier: hit.authority,
        fetchStatus: hit.verification ?? (hit.fromPage ? "VERIFIED_SOURCE" : "UNVERIFIED"),
        fetchedExcerpt: hit.pageText,
      },
    });
    const facts = extractFacts({
      text: `${title}\n${hit.pageText ?? hit.snippet ?? ""}`,
      authority: hit.authority,
      fromPage: hit.fromPage,
      sourceUrl: hit.url,
    });
    const decision = classifySearchHit({
      engine: input.query.engine,
      title,
      url: hit.url,
      domain: hit.domain,
      snippet: `${hit.snippet ?? ""}\n${hit.pageText ?? ""}`,
    });
    sourced.push({
      sourceId: source.id,
      title,
      tenderReference: facts.tenderReference,
      buyer: facts.buyer,
      primarySourceUrl: hit.url,
      primarySourceDomain: hit.domain,
      closingDate: facts.closingDate,
      authority: hit.authority,
      snippet: hit.snippet ?? "",
      pageText: hit.pageText,
      fromPage: hit.fromPage,
      query: input.query.query,
      engine: input.query.engine,
      position: hit.position,
      hitClass: decision.hitClass,
      confidence: decision.confidence,
    });
  }
  return sourced;
}

async function materialize(
  sourced: Sourced[],
  company: CompanyDna,
  mode: DataMode,
): Promise<{ unique: number; relevant: number; records: Array<{ id: string; title: string; tenderReference: string | null; buyer: string | null }> }> {
  const clusters = clusterItems(sourced);
  let relevant = 0;
  let uniqueActive = 0;
  const records: Array<{ id: string; title: string; tenderReference: string | null; buyer: string | null }> = [];
  for (const cluster of clusters) {
    const ordered = [...cluster].sort((a, b) => authorityRank(a.authority) - authorityRank(b.authority) || a.position - b.position);
    const primary = ordered[0];
    const verified = ordered.some((item) => item.fromPage);
    const evidence = clusterEvidenceText(ordered);
    const text = evidence.text;
    const facts = extractFacts({
      text,
      authority: primary.authority,
      fromPage: verified,
      sourceUrl: primary.primarySourceUrl,
    });
    const title = verifiedDisplayTitle(primary.title, facts);
    const requirementSources = verified ? ordered.filter((item) => item.fromPage) : ordered;
    const requirements = mergeRequirements(requirementSources.map((item) => extractFacts({
      text: item.fromPage && item.pageText ? item.pageText : `${item.title}\n${item.pageText ?? item.snippet}`,
      authority: item.authority,
      fromPage: item.fromPage,
      sourceUrl: item.primarySourceUrl,
    }).requirements).flat());
    const verifiedPast = Boolean(verified && (primary.authority === "A" || primary.authority === "B") && facts.closingDate && isPastDeadline(facts.closingDate, new Date()));
    const evaluation = evaluateReadiness({
      company,
      title,
      evidenceText: text,
      state: facts.state,
      closingDate: facts.closingDate,
      estimatedValueInr: facts.estimatedValueInr,
      primaryAuthority: primary.authority,
      primarySourceUrl: primary.primarySourceUrl,
      requirements,
      fromPage: ordered.some((item) => item.fromPage),
      procurementIdentity: Boolean(facts.tenderReference) || hasProcurementIdentity(`${primary.title}\n${text}`),
    });
    const key = `${mode}:${dedupeKeyFor({ ...primary, tenderReference: facts.tenderReference ?? primary.tenderReference })}`;
    const existing = mode === "live"
      ? await prisma.tender.findFirst({
          where: { dataMode: "live", OR: [{ dedupeKey: key }, { primarySourceUrl: primary.primarySourceUrl }] },
        })
      : null;
    const data = tenderData({
      key,
      mode,
      title,
      facts,
      primary,
      text: text.replace(/\[\[page:\d+\]\]/g, " "),
      closed: verifiedPast,
    });
    const tender = existing
      ? await prisma.tender.update({ where: { id: existing.id }, data })
      : await prisma.tender.create({ data });

    await prisma.requirement.deleteMany({ where: { tenderId: tender.id } });
    if (requirements.length > 0) {
      await prisma.requirement.createMany({
        data: requirements.map((requirement) => ({
          tenderId: tender.id,
          type: requirement.type,
          label: requirement.label,
          value: requirement.value,
          numericValue: requirement.numericValue,
          unit: requirement.unit,
          mandatoryStatus: requirement.mandatoryStatus,
          evidenceText: requirement.evidenceText,
          sourceUrl: requirement.sourceUrl,
          sourceAuthority: requirement.sourceAuthority,
          evidenceStatus: requirement.evidenceStatus,
          confidence: requirement.confidence,
        })),
      });
    }
    await prisma.readinessEvaluation.create({
      data: {
        tenderId: tender.id,
        verdict: evaluation.verdict,
        reasonsJson: JSON.stringify(evaluation.reasons),
        blockersJson: JSON.stringify(evaluation.blockers),
        concernsJson: JSON.stringify(evaluation.concerns),
        rowsJson: JSON.stringify(evaluation.rows),
        matchJson: JSON.stringify(evaluation.matches),
        summary: evaluation.summary,
      },
    });
    for (const item of cluster) {
      await prisma.tenderSource.upsert({
        where: { tenderId_sourceId: { tenderId: tender.id, sourceId: item.sourceId } },
        create: { tenderId: tender.id, sourceId: item.sourceId, role: item.sourceId === primary.sourceId ? "primary" : "supporting" },
        update: { role: item.sourceId === primary.sourceId ? "primary" : "supporting" },
      });
    }
    await recordSnapshot(
      tender.id,
      snapshotFromCluster({ title, facts, primary, text, sources: ordered }),
    );
    if (!verifiedPast) uniqueActive += 1;
    records.push({
      id: tender.id,
      title: tender.title,
      tenderReference: tender.tenderReference,
      buyer: tender.buyer,
    });
    if (evaluation.verdict === "BID" || evaluation.verdict === "REVIEW") relevant += 1;
  }
  return { unique: uniqueActive, relevant, records };
}

function snapshotFromCluster(input: {
  title: string;
  facts: ReturnType<typeof extractFacts>;
  primary: Sourced;
  text: string;
  sources: Sourced[];
}): SnapshotPayload {
  return {
    title: input.title,
    tenderReference: input.facts.tenderReference,
    buyer: input.facts.buyer,
    closingDate: input.facts.closingDate ? istDateKey(input.facts.closingDate) : null,
    estimatedValueInr: input.facts.estimatedValueInr,
    emdInr: input.facts.emdInr,
    turnoverRequirementInr: input.facts.turnoverRequirementInr,
    experienceRequirementYears: input.facts.experienceRequirementYears,
    certificationsRequired: input.facts.certifications,
    status: input.facts.status,
    primarySourceUrl: input.primary.primarySourceUrl,
    state: input.facts.state,
    sources: input.sources.map((source) => ({
      url: source.primarySourceUrl,
      domain: source.primarySourceDomain,
      authority: source.authority,
    })),
    evidenceText: input.text.slice(0, 4000),
  };
}

function mergeRequirements(requirements: RequirementDraft[]): RequirementDraft[] {
  const rank = { VERIFIED: 4, SUPPORTED: 3, UNVERIFIED: 2, UNKNOWN: 1 };
  const map = new Map<string, RequirementDraft>();
  for (const requirement of requirements) {
    const key = requirement.type;
    const current = map.get(key);
    if (!current || rank[requirement.evidenceStatus] > rank[current.evidenceStatus]) map.set(key, requirement);
  }
  return [...map.values()];
}

function tenderData(input: {
  key: string;
  mode: DataMode;
  title: string;
  facts: ReturnType<typeof extractFacts>;
  primary: Sourced;
  text: string;
  closed?: boolean;
}) {
  return {
    dedupeKey: input.key,
    title: input.title,
    tenderReference: input.facts.tenderReference,
    buyer: input.facts.buyer,
    department: input.facts.department,
    organisation: input.facts.organisation ?? input.facts.buyer,
    primarySourceUrl: input.primary.primarySourceUrl,
    primarySourceDomain: input.primary.primarySourceDomain,
    primaryAuthorityTier: input.primary.authority,
    publicationDate: input.facts.publicationDate,
    closingDate: input.facts.closingDate,
    openingDate: input.facts.openingDate,
    estimatedValueInr: input.facts.estimatedValueInr,
    emdInr: input.facts.emdInr,
    tenderFeeInr: input.facts.tenderFeeInr,
    state: input.facts.state,
    location: input.facts.location,
    scope: input.facts.scope,
    categoriesJson: JSON.stringify(input.facts.topics),
    requiredCapabilitiesJson: JSON.stringify(input.facts.topics),
    turnoverRequirementInr: input.facts.turnoverRequirementInr,
    experienceRequirementYears: input.facts.experienceRequirementYears,
    certificationsRequiredJson: JSON.stringify(input.facts.certifications),
    msmePreference: input.facts.msmePreference,
    startupPreference: input.facts.startupPreference,
    status: input.closed ? "Closed" : input.facts.status,
    evidenceCorpus: input.text.slice(0, 40000),
    dataMode: input.mode,
    lastCheckedAt: new Date(),
  };
}

function fetchRank(hit: NormalizedHit): number {
  const decision = classifySearchHit({
    engine: hit.engine,
    title: hit.title,
    url: hit.url,
    domain: hit.domain,
    snippet: hit.snippet,
  });
  const confidence = decision.confidence === "HIGH" ? 0 : decision.confidence === "MEDIUM" ? 1 : 2;
  return confidence * 100 + procurementPortalScore(hit.url, hit.domain) * 10 + hit.position;
}

async function enrichOfficialPages(hits: NormalizedHit[]): Promise<{ excerpts: Map<string, string>; verification: Map<string, SourceVerification> }> {
  const excerpts = new Map<string, string>();
  const verification = new Map<string, SourceVerification>();
  const ranked = [...hits]
    .filter((hit) => !isNoiseDomain(hit.domain) && classifyDomain(hit.domain) !== "D")
    .sort((left, right) => fetchRank(left) - fetchRank(right))
    .slice(0, MAX_SOURCE_FETCHES);
  for (const hit of ranked) {
    const result = await fetchPublicExcerpt(hit.url);
    verification.set(hit.url, result.verification);
    if (result.excerpt) excerpts.set(hit.url, result.excerpt);
  }
  return { excerpts, verification };
}

async function attachVerification(result: Omit<DiscoveryResult, "notice" | "lastVerifiedAt">): Promise<DiscoveryResult> {
  const last = await prisma.searchRun.findFirst({
    where: { dataMode: "live", status: "success" },
    orderBy: { retrievedAt: "desc" },
    select: { retrievedAt: true },
  });
  const lastVerifiedAt = last?.retrievedAt.toISOString() ?? null;
  const exhausted = Boolean(result.error) || result.searchResultCount === 0;
  return {
    ...result,
    lastVerifiedAt,
    notice: exhausted ? (lastVerifiedAt ? "Showing last verified live result" : "No verified data available.") : null,
  };
}

export async function runDiscovery(options: { refresh?: boolean } = {}): Promise<DiscoveryResult> {
  const company = await getCompany();
  const planned = planDiscoveryQueries(company);
  const mode: DataMode = "live";
  const refresh = Boolean(options.refresh);
  const log: DiscoveryLogEntry[] = [];

  if (!serpApiKeyPresent()) {
    return attachVerification({
      mode,
      log,
      planned,
      searchResultCount: 0,
      uniqueOpportunities: 0,
      relevantOpportunities: 0,
      rejectedCount: 0,
      supportingNewsCount: 0,
      error: "Live search unavailable.",
    });
  }

  let failures = 0;
  const liveHits: Array<{ query: PlannedQuery; hits: NormalizedHit[]; retrievedAt: Date; cacheHit: boolean }> = [];
  for (const query of planned) {
    const outcome = await executeLiveQuery(query, refresh);
    if (outcome.error) {
      failures += 1;
      log.push({
        engine: query.engine,
        query: query.query,
        status: "error",
        resultCount: 0,
        cacheHit: false,
        retrievedAt: outcome.retrievedAt.toISOString(),
        message: outcome.error,
      });
      await storeRun({
        query,
        mode: "live",
        status: "error",
        error: outcome.error,
        cacheHit: false,
        retrievedAt: outcome.retrievedAt,
        hits: [],
      });
      continue;
    }
    log.push({
      engine: query.engine,
      query: query.query,
      status: "success",
      resultCount: outcome.hits.length,
      cacheHit: outcome.cacheHit,
      retrievedAt: outcome.retrievedAt.toISOString(),
      message: outcome.cacheHit ? "Cached live result" : "Live SerpApi result",
    });
    liveHits.push({ query, hits: outcome.hits, retrievedAt: outcome.retrievedAt, cacheHit: outcome.cacheHit });
  }

  const allHits = liveHits.flatMap((item) => item.hits);
  const candidateHits = allHits.filter((hit) => {
    const decision = classifySearchHit({
      engine: hit.engine,
      title: hit.title,
      url: hit.url,
      domain: hit.domain,
      snippet: hit.snippet,
    });
    return decision.hitClass === "TenderCandidate" && decision.confidence !== "LOW";
  });
  const enriched = candidateHits.length > 0 ? await enrichOfficialPages(candidateHits) : { excerpts: new Map<string, string>(), verification: new Map<string, SourceVerification>() };
  const excerpts = enriched.excerpts;
  const cards: Sourced[] = [];
  const newsRows: Sourced[] = [];
  const changeRows: Sourced[] = [];
  let rejectedCount = 0;
  for (const batch of liveHits) {
    const rows = await storeRun({
      query: batch.query,
      mode: "live",
      status: "success",
      error: null,
      cacheHit: batch.cacheHit,
      retrievedAt: batch.retrievedAt,
      hits: batch.hits.map((hit) => ({
        title: hit.title,
        url: hit.url,
        displayedLink: hit.displayedLink,
        domain: hit.domain,
        snippet: hit.snippet,
        dateText: hit.dateText,
        position: hit.position,
        authority: classifyDomain(hit.domain),
        pageText: excerpts.get(hit.url) ?? null,
        fromPage: excerpts.has(hit.url),
        verification: excerpts.has(hit.url) ? "VERIFIED_SOURCE" : enriched.verification.get(hit.url) ?? (classifyDomain(hit.domain) === "A" || classifyDomain(hit.domain) === "B" ? "DISCOVERED_OFFICIAL" : "UNVERIFIED"),
      })),
    });
    const batchCards = rows.filter(isOpportunitySource);
    const batchNews = rows.filter((row) => row.hitClass === "SupportingNews");
    const batchChanges = rows.filter((row) => row.hitClass === "TenderChangeCandidate");
    const batchRejected = rows.length - batchCards.length - batchNews.length - batchChanges.length;
    cards.push(...batchCards);
    newsRows.push(...batchNews);
    changeRows.push(...batchChanges);
    rejectedCount += batchRejected;
    const entry = log.find((item) => item.query === batch.query.query && item.engine === batch.query.engine && item.status === "success");
    if (entry) {
      entry.message = `${batchCards.length} tender candidates, ${batchChanges.length} changes, ${batchNews.length} supporting news, ${batchRejected} rejected. ${entry.message ?? ""}`.trim();
    }
  }

  if (allHits.length === 0) {
    return attachVerification({
      mode,
      log,
      planned,
      searchResultCount: 0,
      uniqueOpportunities: 0,
      relevantOpportunities: 0,
      rejectedCount: 0,
      supportingNewsCount: 0,
      error: failures > 0 ? log.find((entry) => entry.message)?.message ?? "Live search unavailable." : null,
    });
  }

  const counts = cards.length > 0 ? await materialize(cards, company, "live") : { unique: 0, relevant: 0, records: [] };
  await attachSupportingNews(counts.records, newsRows);
  await attachChangeCandidates(counts.records, changeRows);
  await retireFailedOpportunities();
  return attachVerification({
    mode,
    log,
    planned,
    searchResultCount: allHits.length,
    uniqueOpportunities: counts.unique,
    relevantOpportunities: counts.relevant,
    rejectedCount,
    supportingNewsCount: newsRows.length,
    error: failures === planned.length ? "Live search unavailable." : null,
  });
}

function isOpportunitySource(row: Sourced): boolean {
  return row.hitClass === "TenderCandidate" && row.confidence !== "LOW";
}

function classifiedSource(engine: string, title: string, url: string, domain: string, snippet: string | null): Pick<Sourced, "hitClass" | "confidence"> {
  const decision = classifySearchHit({ engine, title, url, domain, snippet });
  return { hitClass: decision.hitClass, confidence: decision.confidence };
}

function newsSupportsTender(news: Sourced, tender: { title: string; tenderReference: string | null; buyer: string | null }): boolean {
  const blob = `${news.title}\n${news.snippet}\n${news.pageText ?? ""}`.toLowerCase();
  const reference = tender.tenderReference?.trim();
  if (reference && reference.length >= 5 && blob.includes(reference.toLowerCase())) return true;
  const similarity = jaccard(titleTokens(news.title), titleTokens(tender.title));
  if (similarity >= 0.62) return true;
  const buyer = tender.buyer?.trim().toLowerCase();
  return Boolean(buyer && buyer.length >= 8 && blob.includes(buyer) && similarity >= 0.35);
}

async function attachChangeCandidates(
  records: Array<{ id: string; title: string; tenderReference: string | null; buyer: string | null }>,
  changes: Sourced[],
) {
  for (const item of changes) {
    const match = records.find((record) => {
      if (item.tenderReference && record.tenderReference && normalizeRef(item.tenderReference) === normalizeRef(record.tenderReference)) return true;
      return jaccard(titleTokens(item.title), titleTokens(record.title)) >= 0.62;
    });
    if (!match) continue;
    await prisma.tenderSource.upsert({
      where: { tenderId_sourceId: { tenderId: match.id, sourceId: item.sourceId } },
      create: { tenderId: match.id, sourceId: item.sourceId, role: "change" },
      update: { role: "change" },
    });
  }
}

async function retireFailedOpportunities() {
  const tenders = await prisma.tender.findMany({
    where: { dataMode: "live" },
    select: {
      id: true,
      title: true,
      tenderReference: true,
      primarySourceUrl: true,
      primarySourceDomain: true,
      sources: { select: { source: { select: { engine: true } } } },
    },
  });
  const stale = tenders.filter(
    (tender) =>
      !isDiscoverOpportunity({
        title: tender.title,
        url: tender.primarySourceUrl,
        domain: tender.primarySourceDomain,
        snippet: tender.tenderReference ? `Tender Reference ${tender.tenderReference}` : null,
        engines: tender.sources.map((link) => link.source.engine),
      }),
  );
  if (stale.length === 0) return;
  await prisma.tender.deleteMany({ where: { id: { in: stale.map((tender) => tender.id) } } });
}

async function attachSupportingNews(
  records: Array<{ id: string; title: string; tenderReference: string | null; buyer: string | null }>,
  news: Sourced[],
) {
  for (const item of news) {
    const match = records.find((record) => newsSupportsTender(item, record));
    if (!match) continue;
    await prisma.tenderSource.upsert({
      where: { tenderId_sourceId: { tenderId: match.id, sourceId: item.sourceId } },
      create: { tenderId: match.id, sourceId: item.sourceId, role: "supporting" },
      update: { role: "supporting" },
    });
  }
}

export type RefreshResult = {
  ok: boolean;
  calledSerpApi: boolean;
  message: string;
  newChanges: Array<{ changeType: string; summary: string; beforeValue: string | null; afterValue: string | null; evidence: string | null }>;
  error: string | null;
};

export async function refreshTender(tenderId: string): Promise<RefreshResult> {
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    include: { sources: { include: { source: true } } },
  });
  if (!tender) return { ok: false, calledSerpApi: false, message: "Notice not found.", newChanges: [], error: "Notice not found." };

  if (!serpApiKeyPresent() || tender.dataMode !== "live") {
    return {
      ok: false,
      calledSerpApi: false,
      message: tender.dataMode === "live" ? "Live search unavailable." : "Notice not found.",
      newChanges: [],
      error: tender.dataMode === "live" ? "Live search unavailable." : "Notice not found.",
    };
  }

  const company = await getCompany();
  const queries = planChangeQueries({
    title: tender.title,
    tenderReference: tender.tenderReference,
    primarySourceDomain: tender.primarySourceDomain,
  });
  const matched: Sourced[] = [];
  let failures = 0;
  for (const query of queries) {
    const outcome = await executeLiveQuery(query, true);
    if (outcome.error) {
      failures += 1;
      await storeRun({
        query,
        mode: "live",
        status: "error",
        error: outcome.error,
        cacheHit: false,
        retrievedAt: outcome.retrievedAt,
        hits: [],
      });
      continue;
    }
    const hits = outcome.hits.filter((hit) => sourceMatchesTender(hit.title, hit.snippet, hit.url, tender));
    const rows = await storeRun({
      query,
      mode: "live",
      status: "success",
      error: null,
      cacheHit: outcome.cacheHit,
      retrievedAt: outcome.retrievedAt,
      hits: hits.map((hit) => ({
        title: hit.title,
        url: hit.url,
        displayedLink: hit.displayedLink,
        domain: hit.domain,
        snippet: hit.snippet,
        dateText: hit.dateText,
        position: hit.position,
        authority: classifyDomain(hit.domain),
        pageText: null,
        fromPage: false,
      })),
    });
    matched.push(...rows.filter(isOpportunitySource));
    await attachSupportingNews(
      [{ id: tender.id, title: tender.title, tenderReference: tender.tenderReference, buyer: tender.buyer }],
      rows.filter((row) => row.hitClass === "SupportingNews"),
    );
  }

  const direct = await fetchPublicExcerpt(tender.primarySourceUrl);
  if (direct.excerpt) {
    const link = tender.sources.find((item) => normalizeUrl(item.source.url) === normalizeUrl(tender.primarySourceUrl));
    if (link) {
      await prisma.source.update({
        where: { id: link.source.id },
        data: { fetchStatus: "VERIFIED_SOURCE", fetchedExcerpt: direct.excerpt },
      });
      link.source.fetchStatus = "VERIFIED_SOURCE";
      link.source.fetchedExcerpt = direct.excerpt;
    }
  } else if (failures === queries.length) {
    return {
      ok: false,
      calledSerpApi: true,
      message: "Live search unavailable.",
      newChanges: [],
      error: "Live search unavailable.",
    };
  }

  const previousSources: Sourced[] = tender.sources.map((link) => ({
    sourceId: link.sourceId,
    title: link.source.title,
    tenderReference: tender.tenderReference,
    buyer: tender.buyer,
    primarySourceUrl: link.source.url,
    primarySourceDomain: link.source.domain,
    closingDate: tender.closingDate,
    authority: link.source.authorityTier as AuthorityTier,
    snippet: link.source.snippet ?? "",
    pageText: link.source.fetchedExcerpt,
    fromPage: isVerifiedFetch(link.source.fetchStatus),
    query: "",
    engine: link.source.engine,
    position: link.source.position,
    ...classifiedSource(link.source.engine, link.source.title, link.source.url, link.source.domain, link.source.snippet),
  }));
  const cluster = [...previousSources.filter(isOpportunitySource), ...matched];
  if (cluster.length === 0) {
    await prisma.watchlistItem.updateMany({ where: { tenderId }, data: { lastCheckedAt: new Date() } });
    return {
      ok: true,
      calledSerpApi: true,
      message: "No verified change detected.",
      newChanges: [],
      error: null,
    };
  }
  const ordered = [...cluster].sort((a, b) => authorityRank(a.authority) - authorityRank(b.authority) || a.position - b.position);
  const primary = ordered[0];
  const verified = ordered.some((item) => item.fromPage);
  const text = clusterEvidenceText(ordered).text;
  const facts = extractFacts({
    text,
    authority: primary.authority,
    fromPage: verified,
    sourceUrl: primary.primarySourceUrl,
  });
  const title = verifiedDisplayTitle(primary.title || tender.title, facts);
  const requirementSources = verified ? ordered.filter((item) => item.fromPage) : ordered;
  const requirements = mergeRequirements(
    requirementSources
      .map((item) =>
        extractFacts({
          text: item.fromPage && item.pageText ? item.pageText : `${item.title}\n${item.pageText ?? item.snippet}`,
          authority: item.authority,
          fromPage: item.fromPage,
          sourceUrl: item.primarySourceUrl,
        }).requirements,
      )
      .flat(),
  );
  const verifiedPast = Boolean(verified && (primary.authority === "A" || primary.authority === "B") && facts.closingDate && isPastDeadline(facts.closingDate, new Date()));
  const data = tenderData({
    key: tender.dedupeKey,
    mode: "live",
    title,
    facts,
    primary,
    text: text.replace(/\[\[page:\d+\]\]/g, " "),
    closed: verifiedPast,
  });
  await prisma.tender.update({
    where: { id: tender.id },
    data: { ...data, dedupeKey: tender.dedupeKey },
  });
  await prisma.requirement.deleteMany({ where: { tenderId: tender.id } });
  if (requirements.length > 0) {
    await prisma.requirement.createMany({
      data: requirements.map((requirement) => ({
        tenderId: tender.id,
        type: requirement.type,
        label: requirement.label,
        value: requirement.value,
        numericValue: requirement.numericValue,
        unit: requirement.unit,
        mandatoryStatus: requirement.mandatoryStatus,
        evidenceText: requirement.evidenceText,
        sourceUrl: requirement.sourceUrl,
        sourceAuthority: requirement.sourceAuthority,
        evidenceStatus: requirement.evidenceStatus,
        confidence: requirement.confidence,
      })),
    });
  }
  const evaluation = evaluateReadiness({
    company,
    title,
    evidenceText: text,
    state: facts.state,
    closingDate: facts.closingDate,
    estimatedValueInr: facts.estimatedValueInr,
    primaryAuthority: primary.authority,
    primarySourceUrl: primary.primarySourceUrl,
    requirements,
    fromPage: ordered.some((item) => item.fromPage),
    procurementIdentity: Boolean(facts.tenderReference) || hasProcurementIdentity(`${primary.title || tender.title}\n${text}`),
  });
  await prisma.readinessEvaluation.create({
    data: {
      tenderId: tender.id,
      verdict: evaluation.verdict,
      reasonsJson: JSON.stringify(evaluation.reasons),
      blockersJson: JSON.stringify(evaluation.blockers),
      concernsJson: JSON.stringify(evaluation.concerns),
      rowsJson: JSON.stringify(evaluation.rows),
      matchJson: JSON.stringify(evaluation.matches),
      summary: evaluation.summary,
    },
  });
  for (const item of matched) {
    await prisma.tenderSource.upsert({
      where: { tenderId_sourceId: { tenderId: tender.id, sourceId: item.sourceId } },
      create: { tenderId: tender.id, sourceId: item.sourceId, role: "supporting" },
      update: {},
    });
  }
  const newChanges = await recordSnapshot(
    tender.id,
    snapshotFromCluster({ title, facts, primary, text, sources: ordered }),
  );
  await prisma.watchlistItem.updateMany({ where: { tenderId }, data: { lastCheckedAt: new Date() } });
  return {
    ok: true,
    calledSerpApi: true,
    message: newChanges.length === 0 ? "No verified change detected." : `${newChanges.length} verified change${newChanges.length === 1 ? "" : "s"} detected.`,
    newChanges,
    error: null,
  };
}

function sourceMatchesTender(
  title: string,
  snippet: string | null,
  url: string,
  tender: { title: string; tenderReference: string | null; primarySourceUrl: string },
): boolean {
  const blob = `${title}\n${snippet ?? ""}`.toLowerCase();
  if (tender.tenderReference && blob.includes(tender.tenderReference.toLowerCase())) return true;
  if (normalizeUrl(url) === normalizeUrl(tender.primarySourceUrl)) return true;
  return jaccard(titleTokens(title), titleTokens(tender.title)) >= 0.45;
}

export type { Evaluation };
