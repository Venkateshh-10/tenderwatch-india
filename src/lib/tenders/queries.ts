import type { ComparisonRow, MatchReason, Verdict } from "@/lib/readiness/evaluate";
import { prisma } from "@/lib/db";
import type { DataMode } from "@/lib/mode";
import { OPPORTUNITY_DISPLAY_CAP } from "@/lib/search/limits";
import { classifySearchHit, isDiscoverOpportunity, procurementPortalScore, type TenderConfidence } from "@/lib/tender/candidate-gate";

const LIVE: DataMode = "live";

export type TenderListItem = {
  id: string;
  title: string;
  buyer: string | null;
  state: string | null;
  closingDate: Date | null;
  estimatedValueInr: number | null;
  verdict: Verdict | null;
  summary: string | null;
  blocker: string | null;
  match: string | null;
  sourceCount: number;
  authority: string;
  domain: string;
  lastCheckedAt: Date;
  createdAt: Date;
  dataMode: string;
  status: string | null;
  strongMatches: number;
  changed: boolean;
  hasNews: boolean;
  confidence: TenderConfidence;
  matchLabels: string[];
  watched: boolean;
};

function parseArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rankValue(item: TenderListItem & { portal: number; hasReference: boolean; fetched: boolean; completeness: number; bestPosition: number }, now: number): number {
  const confidence = item.confidence === "HIGH" ? 5 : 2;
  const portal = Math.max(0, 6 - item.portal);
  const fit = (item.verdict === "BID" ? 3 : item.verdict === "REVIEW" ? 2 : item.verdict === "SKIP" ? 1 : 0) + item.strongMatches;
  const future = item.closingDate && item.closingDate.getTime() >= now ? 2 : 0;
  const position = Math.max(0, 8 - item.bestPosition);
  return confidence * 1_000_000 + portal * 100_000 + (item.hasReference ? 4 : 0) * 10_000 + (item.fetched ? 3 : 0) * 1_000 + item.completeness * 100 + fit * 10 + future * 5 + position;
}

export function displayedOpportunities(items: TenderListItem[]): TenderListItem[] {
  return items.slice(0, OPPORTUNITY_DISPLAY_CAP);
}

export async function listTenders(): Promise<TenderListItem[]> {
  const tenders = await prisma.tender.findMany({
    where: { dataMode: LIVE },
    include: {
      evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      sources: { include: { source: { select: { engine: true, fetchStatus: true, position: true } } } },
      watch: { select: { id: true } },
      _count: { select: { sources: true, changes: true } },
    },
  });
  const items = tenders.flatMap((tender) => {
    const engines = tender.sources.map((link) => link.source.engine);
    const snippet = tender.tenderReference ? `Tender Reference ${tender.tenderReference}` : null;
    if (
      !isDiscoverOpportunity({
        title: tender.title,
        url: tender.primarySourceUrl,
        domain: tender.primarySourceDomain,
        snippet,
        engines,
      })
    ) {
      return [];
    }
    const evaluation = tender.evaluations[0];
    const blockers = parseArray(evaluation?.blockersJson);
    const matches = evaluation ? (JSON.parse(evaluation.matchJson) as MatchReason[]) : [];
    const decision = classifySearchHit({
      engine: engines.find((engine) => engine !== "google_news") ?? "google",
      title: tender.title,
      url: tender.primarySourceUrl,
      domain: tender.primarySourceDomain,
      snippet,
    });
    const positions = tender.sources.map((link) => link.source.position);
    return [{
      id: tender.id,
      title: tender.title,
      buyer: tender.buyer,
      state: tender.state,
      closingDate: tender.closingDate,
      estimatedValueInr: tender.estimatedValueInr,
      verdict: (evaluation?.verdict as Verdict | undefined) ?? null,
      summary: evaluation?.summary ?? null,
      blocker: blockers[0] ?? null,
      match: matches[0] ? `${matches[0].label} · ${matches[0].strength}` : null,
      sourceCount: tender._count.sources,
      authority: tender.primaryAuthorityTier,
      domain: tender.primarySourceDomain,
      lastCheckedAt: tender.lastCheckedAt,
      createdAt: tender.createdAt,
      dataMode: tender.dataMode,
      status: tender.status,
      strongMatches: matches.filter((item) => item.strength === "Strong").length,
      changed: tender._count.changes > 0,
      hasNews: tender.sources.some((link) => link.source.engine === "google_news"),
      confidence: decision.confidence === "LOW" ? "MEDIUM" : decision.confidence,
      matchLabels: matches.slice(0, 4).map((item) => item.label),
      watched: Boolean(tender.watch),
      portal: procurementPortalScore(tender.primarySourceUrl, tender.primarySourceDomain),
      hasReference: Boolean(tender.tenderReference),
      fetched: tender.sources.some((link) => link.source.fetchStatus === "verified_text"),
      completeness: [tender.tenderReference, tender.buyer, tender.closingDate, tender.estimatedValueInr, tender.emdInr, tender.state].filter((value) => value != null && value !== "").length,
      bestPosition: positions.length > 0 ? Math.min(...positions) : 20,
    }];
  });
  const now = Date.now();
  return items.sort((a, b) => {
    const rank = rankValue(b, now) - rankValue(a, now);
    if (rank !== 0) return rank;
    const aClose = a.closingDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bClose = b.closingDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aClose !== bClose) return aClose - bClose;
    return b.lastCheckedAt.getTime() - a.lastCheckedAt.getTime();
  });
}

export async function getTenderDetail(id: string) {
  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      requirements: true,
      watch: true,
      sources: {
        include: { source: { include: { searchRun: true } } },
        orderBy: { source: { position: "asc" } },
      },
      snapshots: { orderBy: { capturedAt: "desc" }, take: 8 },
      changes: { orderBy: { detectedAt: "desc" } },
    },
  });
  if (!tender || tender.dataMode !== LIVE) return null;
  const engines = tender.sources.map((link) => link.source.engine);
  if (
    !isDiscoverOpportunity({
      title: tender.title,
      url: tender.primarySourceUrl,
      domain: tender.primarySourceDomain,
      snippet: tender.tenderReference ? `Tender Reference ${tender.tenderReference}` : null,
      engines,
    })
  ) {
    return null;
  }
  const evaluation = tender.evaluations[0];
  const rows: ComparisonRow[] = evaluation ? (JSON.parse(evaluation.rowsJson) as ComparisonRow[]) : [];
  const matches: MatchReason[] = evaluation ? (JSON.parse(evaluation.matchJson) as MatchReason[]) : [];
  const reasons = parseArray(evaluation?.reasonsJson);
  const related = tender.buyer
    ? await prisma.tender.findMany({
        where: { dataMode: tender.dataMode, buyer: tender.buyer, NOT: { id: tender.id } },
        select: { id: true, title: true },
        orderBy: { lastCheckedAt: "desc" },
        take: 4,
      })
    : [];
  return { tender, evaluation, rows, matches, reasons, related };
}

export async function countChangedTenders(): Promise<number> {
  const rows = await prisma.tenderChange.findMany({
    where: { tender: { dataMode: LIVE } },
    select: { tenderId: true },
    distinct: ["tenderId"],
  });
  return rows.length;
}

export async function listRecentChanges(take = 5) {
  return prisma.tenderChange.findMany({
    where: { tender: { dataMode: LIVE } },
    orderBy: { detectedAt: "desc" },
    take,
    include: { tender: { select: { id: true, title: true } } },
  });
}

export async function latestLiveRetrieval(): Promise<Date | null> {
  const run = await prisma.searchRun.findFirst({
    where: { dataMode: LIVE, status: "success" },
    orderBy: { retrievedAt: "desc" },
    select: { retrievedAt: true },
  });
  return run?.retrievedAt ?? null;
}

export async function listSearchRuns(take = 12) {
  return prisma.searchRun.findMany({
    where: { dataMode: LIVE },
    orderBy: { executedAt: "desc" },
    take,
    include: { _count: { select: { sources: true } } },
  });
}

function inClosingWindow(item: TenderListItem, now: number): boolean {
  if (!item.closingDate) return false;
  const time = item.closingDate.getTime();
  return time >= now && time <= now + 7 * 86_400_000;
}

export function tendersClosingThisWeek(items: TenderListItem[]): TenderListItem[] {
  const now = Date.now();
  return items.filter((item) => inClosingWindow(item, now));
}

export async function searchActivity() {
  const [executed, success, google, news] = await Promise.all([
    prisma.searchRun.count({ where: { dataMode: LIVE } }),
    prisma.searchRun.aggregate({
      where: { dataMode: LIVE, status: "success" },
      _sum: { resultCount: true },
    }),
    prisma.searchRun.count({ where: { dataMode: LIVE, status: "success", engine: "google" } }),
    prisma.searchRun.count({ where: { dataMode: LIVE, status: "success", engine: "google_news" } }),
  ]);
  return {
    executed,
    rawResults: success._sum.resultCount ?? 0,
    searchedGoogle: google > 0,
    searchedNews: news > 0,
  };
}

export async function countWatchlist(): Promise<number> {
  return prisma.watchlistItem.count({ where: { tender: { dataMode: LIVE } } });
}

export function dashboardCounts(items: TenderListItem[]) {
  const now = Date.now();
  return {
    total: items.length,
    bid: items.filter((item) => item.verdict === "BID").length,
    review: items.filter((item) => item.verdict === "REVIEW").length,
    skip: items.filter((item) => item.verdict === "SKIP").length,
    closingThisWeek: items.filter((item) => inClosingWindow(item, now)).length,
  };
}
