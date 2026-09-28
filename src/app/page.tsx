import Link from "next/link";
import { CompanyDnaPanel } from "@/components/console/company-dna-panel";
import { DiscoveryPanel } from "@/components/console/discovery-panel";
import { KpiRow } from "@/components/console/kpi-row";
import { consoleHref, readParam, type ConsoleQuery } from "@/components/console/links";
import { OpportunityCard } from "@/components/console/opportunity-card";
import { ResultsToolbar } from "@/components/console/results-toolbar";
import { SectionHeading } from "@/components/console/section-heading";
import { TenderWorkbench } from "@/components/console/tender-workbench";
import { getCompany } from "@/lib/company/store";
import { serpApiKeyPresent } from "@/lib/mode";
import {
  dashboardCounts,
  displayedOpportunities,
  getTenderDetail,
  listSearchRuns,
  listTenders,
  searchActivity,
  tendersClosingThisWeek,
  type TenderListItem,
} from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query: ConsoleQuery = {
    q: readParam(params.q),
    tab: readParam(params.tab) || "all",
    sort: readParam(params.sort) || "rank",
    tender: readParam(params.tender),
    row: readParam(params.row),
    has: readParam(params.has),
    view: readParam(params.view) || "overview",
  };
  const [company, tenders, runs, activity] = await Promise.all([getCompany(), listTenders(), listSearchRuns(6), searchActivity()]);
  const counts = dashboardCounts(tenders);
  const changed = tenders.filter((item) => item.changed).length;
  const closing = tendersClosingThisWeek(tenders);
  const filtered = filterTenders(tenders, query, new Set(closing.map((item) => item.id)));
  const shown = displayedOpportunities(sortTenders(filtered, query.sort || "rank"));
  const detail = query.tender ? await getTenderDetail(query.tender) : null;
  const relevant = counts.bid + counts.review;

  return (
    <div className="space-y-3">
      <KpiRow
        metrics={[
          { label: "Live Opportunities", value: counts.total },
          { label: "BID", value: counts.bid },
          { label: "REVIEW", value: counts.review },
          { label: "SKIP", value: counts.skip },
          { label: "Closing This Week", value: counts.closingThisWeek },
          { label: "Changed Recently", value: changed },
        ]}
      />
      <div className="grid items-stretch gap-3 xl:grid-cols-3">
        <CompanyDnaPanel company={company} />
        <DiscoveryPanel
          liveSearch={serpApiKeyPresent()}
          executed={activity.executed}
          searchedGoogle={activity.searchedGoogle}
          searchedNews={activity.searchedNews}
          hasCandidates={tenders.length > 0}
          runs={runs}
        />
        <ResultsPanel
          query={query}
          items={shown}
          raw={activity.rawResults}
          unique={counts.total}
          relevant={relevant}
          counts={{
            all: applyHas(applyQuery(tenders, query.q || ""), query.has || "").length,
            best: applyHas(applyQuery(tenders, query.q || ""), query.has || "").filter((item) => item.verdict === "BID").length,
            review: applyHas(applyQuery(tenders, query.q || ""), query.has || "").filter((item) => item.verdict === "REVIEW").length,
            closing: applyHas(applyQuery(closing, query.q || ""), query.has || "").length,
          }}
        />
      </div>
      <TenderWorkbench detail={detail} basePath="/" query={query} rowKey={query.row || ""} view={query.view || "overview"} />
    </div>
  );
}

function ResultsPanel({
  query,
  items,
  raw,
  unique,
  relevant,
  counts,
}: {
  query: ConsoleQuery;
  items: TenderListItem[];
  raw: number;
  unique: number;
  relevant: number;
  counts: { all: number; best: number; review: number; closing: number };
}) {
  const tabs = [
    ["all", "All", counts.all],
    ["best", "Best Matches", counts.best],
    ["review", "Needs Review", counts.review],
    ["closing", "Closing Soon", counts.closing],
  ] as const;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-md border border-border bg-card p-3">
      <SectionHeading n={3} title="Discovery Results" action={<ResultsToolbar query={query} />} />
      <p className="mt-1 text-[11px] text-muted-foreground">
        {raw} raw results · {unique} unique opportunities · {relevant} relevant matches
      </p>
      <div className="mt-2 flex gap-1 overflow-x-auto">
        {tabs.map(([id, label, count]) => {
          const active = (query.tab || "all") === id;
          return (
            <Link
              key={id}
              href={consoleHref("/", query, { tab: id === "all" ? "" : id })}
              className={
                active
                  ? "rounded-md bg-[#18385E] px-2 py-1 text-[11px] text-foreground"
                  : "rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-elevated"
              }
            >
              {label} {count}
            </Link>
          );
        })}
      </div>
      <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto xl:max-h-[420px]">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-2 py-4 text-[12px] text-muted-foreground">
            {unique === 0 ? "No verified data available." : "No stored opportunities match this view."}
          </p>
        ) : (
          items.map((item) => (
            <OpportunityCard key={item.id} item={item} selected={query.tender === item.id} href={consoleHref("/", query, { tender: item.id, row: "" })} />
          ))
        )}
      </div>
    </section>
  );
}

function applyQuery(items: TenderListItem[], q: string): TenderListItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    [item.title, item.buyer, item.state, item.domain, item.summary].some((value) => value?.toLowerCase().includes(needle)),
  );
}

function applyHas(items: TenderListItem[], has: string): TenderListItem[] {
  if (has === "closing") return items.filter((item) => item.closingDate);
  if (has === "value") return items.filter((item) => item.estimatedValueInr != null);
  if (has === "changed") return items.filter((item) => item.changed);
  return items;
}

function filterTenders(items: TenderListItem[], query: ConsoleQuery, closingIds: Set<string>): TenderListItem[] {
  let next = applyHas(applyQuery(items, query.q || ""), query.has || "");
  if (query.tab === "best") next = next.filter((item) => item.verdict === "BID");
  if (query.tab === "review") next = next.filter((item) => item.verdict === "REVIEW");
  if (query.tab === "closing") next = next.filter((item) => closingIds.has(item.id));
  return next;
}

function sortTenders(items: TenderListItem[], sort: string): TenderListItem[] {
  if (sort === "closing") {
    return [...items].sort((a, b) => (a.closingDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.closingDate?.getTime() ?? Number.MAX_SAFE_INTEGER));
  }
  if (sort === "recent") return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items;
}
