import type { CompanyDna } from "@/lib/company/types";
import { CHANGE_QUERY_CAP, DISCOVERY_GOOGLE_CAP, DISCOVERY_NEWS_CAP } from "@/lib/search/limits";
import type { SearchEngine } from "@/lib/serpapi/types";

export type QueryIntent =
  | "capability"
  | "geography"
  | "procurement"
  | "official_domain"
  | "reference"
  | "change"
  | "news_context";

export type PlannedQuery = {
  engine: SearchEngine;
  query: string;
  intent: QueryIntent;
  parameters: { gl: "in"; hl: "en" };
};

function planned(engine: SearchEngine, intent: QueryIntent, query: string): PlannedQuery {
  return {
    engine,
    query: query.replace(/\s+/g, " ").trim(),
    intent,
    parameters: { gl: "in", hl: "en" },
  };
}

function dedupe(queries: PlannedQuery[], cap: number): PlannedQuery[] {
  const seen = new Set<string>();
  const result: PlannedQuery[] = [];
  for (const query of queries) {
    const key = `${query.engine}:${query.query.toLowerCase()}`;
    if (!query.query || seen.has(key)) continue;
    seen.add(key);
    result.push(query);
    if (result.length >= cap) break;
  }
  return result;
}

export function planDiscoveryQueries(company: CompanyDna, now = new Date()): PlannedQuery[] {
  const capability = company.capabilities[0] ?? company.industry;
  const second = company.capabilities.find((item) => item !== capability) ?? capability;
  const state = company.preferredStates[0] ?? "India";
  const year = String(now.getFullYear());

  const google = dedupe(
    [
      planned("google", "official_domain", `site:eprocure.gov.in "${capability}" ${state} ${year}`),
      planned("google", "official_domain", `site:gem.gov.in "${capability}" ${state} ${year}`),
      planned("google", "procurement", `site:gov.in "Notice Inviting Tender" "${capability}" ${state} ${year}`),
      planned("google", "procurement", `site:nic.in "Request for Proposal" "${second}" ${year}`),
      planned("google", "capability", `"${capability}" (tender OR RFP OR NIT) ${state} ${year}`),
    ],
    DISCOVERY_GOOGLE_CAP,
  );

  const news = dedupe(
    [
      planned("google_news", "news_context", `"${capability}" tender ${state} ${year}`),
      planned("google_news", "news_context", `"${capability}" corrigendum ${state} ${year}`),
    ],
    DISCOVERY_NEWS_CAP,
  );

  return [...google, ...news];
}

export function planChangeQueries(input: {
  title: string;
  tenderReference?: string | null;
  primarySourceDomain?: string | null;
}): PlannedQuery[] {
  const reference = input.tenderReference?.trim();
  const queries: PlannedQuery[] = [];
  if (reference && reference.length >= 4) {
    queries.push(planned("google", "reference", `"${reference}"`));
    queries.push(planned("google", "change", `"${reference}" corrigendum`));
    queries.push(planned("google", "change", `"${reference}" (amendment OR extension OR cancellation)`));
  } else {
    const title = input.title.slice(0, 120);
    const domain = input.primarySourceDomain?.trim();
    queries.push(planned("google", "reference", domain ? `site:${domain} "${title}"` : `"${title}" tender`));
    queries.push(planned("google", "change", `"${title}" (corrigendum OR amendment OR extension)`));
  }
  queries.push(planned("google_news", "news_context", `${reference || input.title} tender`));
  return dedupe(queries, CHANGE_QUERY_CAP);
}
