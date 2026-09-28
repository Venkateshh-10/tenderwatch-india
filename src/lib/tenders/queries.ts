import type { ComparisonRow, MatchReason, Verdict } from "@/lib/readiness/evaluate";
import { prisma } from "@/lib/db";
import type { DataMode } from "@/lib/mode";

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

function rankValue(item: Pick<TenderListItem, "verdict" | "strongMatches">): number {
  const verdict = item.verdict === "BID" ? 3 : item.verdict === "REVIEW" ? 2 : item.verdict === "SKIP" ? 1 : 0;
  return verdict * 100 + item.strongMatches * 10;
}

export async function listTenders(): Promise<TenderListItem[]> {
  const tenders = await prisma.tender.findMany({
    where: { dataMode: LIVE },
    include: {
      evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      sources: { include: { source: { select: { engine: true } } } },
      _count: { select: { sources: true, changes: true } },
    },
  });
  const items = tenders.map((tender) => {
    const evaluation = tender.evaluations[0];
    const blockers = parseArray(evaluation?.blockersJson);
    const matches = evaluation ? (JSON.parse(evaluation.matchJson) as MatchReason[]) : [];
    return {
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
    };
  });
  return items.sort((a, b) => {
    const rank = rankValue(b) - rankValue(a);
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
