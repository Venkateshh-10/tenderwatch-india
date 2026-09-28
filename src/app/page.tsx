import Link from "next/link";
import { TenderCard } from "@/components/tender-card";
import { VerdictChart } from "@/components/verdict-chart";
import { getCompany } from "@/lib/company/store";
import { formatInr, formatIst } from "@/lib/format";
import { currentDataMode } from "@/lib/mode";
import { countChangedTenders, dashboardCounts, listRecentChanges, listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const mode = currentDataMode();
  const [company, tenders, changed, recentChanges] = await Promise.all([
    getCompany(),
    listTenders(mode),
    countChangedTenders(mode),
    listRecentChanges(mode),
  ]);
  const counts = dashboardCounts(tenders);
  const metrics = [
    ["Opportunities", counts.total],
    ["BID", counts.bid],
    ["REVIEW", counts.review],
    ["SKIP", counts.skip],
    ["Closing this week", counts.closingThisWeek],
    ["CHANGED", changed],
  ] as const;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-wide text-[#5c564c]">Procurement desk</p>
        <h1 className="font-serif text-3xl text-[#16302b]">From a search to a bid decision</h1>
        <p className="mt-2 max-w-3xl text-[#3d3832]">
          {company.companyName} · {company.headquarters} · turnover {formatInr(company.annualTurnoverInr)}. TenderWatch
          compares discovered notices with this profile and shows why a result is BID, REVIEW, or SKIP.
        </p>
      </section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#e4dccb] bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-[#5c564c]">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>
      {tenders.length > 0 ? (
        <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
          <h2 className="font-serif text-2xl">Verdicts</h2>
          <p className="mt-1 text-sm text-[#5c564c]">
            CHANGED counts notices in this mode with at least one stored difference. Zero means no verified change yet.
          </p>
          <VerdictChart bid={counts.bid} review={counts.review} skip={counts.skip} changed={changed} />
          {recentChanges.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {recentChanges.map((change) => (
                <li key={change.id}>
                  <Link href={`/tenders/${change.tender.id}`} className="underline">
                    {change.tender.title}
                  </Link>
                  {" · "}
                  {change.summary} · {formatIst(change.detectedAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No verified change detected.</p>
          )}
        </section>
      ) : null}
      {tenders.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[#cfc4ad] bg-white p-6">
          <h2 className="font-serif text-xl">No {mode === "live" ? "live" : "demo"} opportunities yet</h2>
          <p className="mt-2 text-sm text-[#5c564c]">
            {mode === "live"
              ? "Run Discover to search Google and Google News through SerpApi. Empty counts stay empty until a live result is stored."
              : "Load the demo fixtures to see the decision workflow. Add SERPAPI_API_KEY to .env.local to switch this desk to live search."}
          </p>
          <Link href="/discover" className="mt-4 inline-block text-sm font-medium text-[#16302b] underline">
            Go to Discover
          </Link>
        </section>
      ) : (
        <section className="grid gap-3">
          <h2 className="font-serif text-2xl">{mode === "live" ? "Live opportunities" : "Demo opportunities"}</h2>
          {tenders.map((item) => (
            <TenderCard key={item.id} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
