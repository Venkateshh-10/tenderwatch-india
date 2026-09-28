import type { ComparisonRow, MatchReason, Verdict } from "@/lib/readiness/evaluate";
import { prisma } from "@/lib/db";
import type { DataMode } from "@/lib/mode";

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
  dataMode: string;
  status: string | null;
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

export async function listTenders(mode: DataMode): Promise<TenderListItem[]> {
  const tenders = await prisma.tender.findMany({
    where: { dataMode: mode },
    orderBy: { lastCheckedAt: "desc" },
    include: {
      evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      _count: { select: { sources: true } },
    },
  });
  return tenders.map((tender) => {
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
      dataMode: tender.dataMode,
      status: tender.status,
    };
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
  if (!tender) return null;
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

export async function countChangedTenders(mode: DataMode): Promise<number> {
  const rows = await prisma.tenderChange.findMany({
    where: { tender: { dataMode: mode } },
    select: { tenderId: true },
    distinct: ["tenderId"],
  });
  return rows.length;
}

export async function listRecentChanges(mode: DataMode, take = 5) {
  return prisma.tenderChange.findMany({
    where: { tender: { dataMode: mode } },
    orderBy: { detectedAt: "desc" },
    take,
    include: { tender: { select: { id: true, title: true } } },
  });
}

export async function listSearchRuns(mode: DataMode, take = 12) {
  return prisma.searchRun.findMany({
    where: { dataMode: mode },
    orderBy: { executedAt: "desc" },
    take,
    include: { _count: { select: { sources: true } } },
  });
}

export function dashboardCounts(items: TenderListItem[]) {
  const now = Date.now();
  const week = now + 7 * 86_400_000;
  return {
    total: items.length,
    bid: items.filter((item) => item.verdict === "BID").length,
    review: items.filter((item) => item.verdict === "REVIEW").length,
    skip: items.filter((item) => item.verdict === "SKIP").length,
    closingThisWeek: items.filter((item) => {
      if (!item.closingDate) return false;
      const time = item.closingDate.getTime();
      return time >= now && time <= week;
    }).length,
  };
}
