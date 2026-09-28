import Link from "next/link";
import { TenderCard } from "@/components/tender-card";
import { VerdictChart } from "@/components/verdict-chart";
import { getCompany } from "@/lib/company/store";
import { formatInr, formatIst } from "@/lib/format";
import { serpApiKeyPresent } from "@/lib/mode";
import { countChangedTenders, dashboardCounts, latestLiveRetrieval, listRecentChanges, listTenders, tendersClosingThisWeek, type TenderListItem } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [company, tenders, changed, recentChanges, lastVerified] = await Promise.all([
    getCompany(),
    listTenders(),
    countChangedTenders(),
    listRecentChanges(),
    latestLiveRetrieval(),
  ]);
  const counts = dashboardCounts(tenders);
  const closingSoon = tendersClosingThisWeek(tenders);
  const metrics = [
    ["Live opportunities", counts.total],
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
        <h1 className="font-serif text-3xl text-[#16302b]">From a live search to a bid decision</h1>
        <p className="mt-2 max-w-3xl text-[#3d3832]">
          Tender platforms often list what exists. TenderWatch uses SerpApi to reconstruct the evidence around an opportunity,
          then explains whether {company.companyName} ({company.headquarters}, turnover {formatInr(company.annualTurnoverInr)}) should
          BID, REVIEW, or SKIP.
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
            Counts come from stored live notices. CHANGED is the number of notices with a real snapshot difference.
            {lastVerified ? ` Last successful SerpApi retrieval: ${formatIst(lastVerified)}.` : ""}
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
      ) : (
        <section className="rounded-xl border border-dashed border-[#cfc4ad] bg-white p-6">
          <h2 className="font-serif text-xl">No verified data available.</h2>
          <p className="mt-2 text-sm text-[#5c564c]">
            {serpApiKeyPresent()
              ? "Run Discover to search Google and Google News through SerpApi. Counts stay at zero until a live result is stored."
              : "Live search unavailable until SERPAPI_API_KEY is set in .env.local. TenderWatch does not fill this desk with sample notices."}
          </p>
          <Link href="/discover" className="mt-4 inline-block text-sm font-medium text-[#16302b] underline">
            Go to Discover
          </Link>
        </section>
      )}
      {tenders.length > 0 ? (
        <div className="grid gap-6">
          <TenderSection title="Best matches" items={tenders.filter((item) => item.verdict === "BID")} empty="No BID notices stored." />
          <TenderSection title="Needs review" items={tenders.filter((item) => item.verdict === "REVIEW")} empty="No REVIEW notices stored." />
          <TenderSection title="Closing soon" items={closingSoon} empty="No stored notice closes in the next seven days." />
          <TenderSection title="Changed" items={tenders.filter((item) => item.changed)} empty="No verified change detected." />
          <TenderSection
            title="Recently discovered"
            items={[...tenders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4)}
            empty="No live notices stored yet."
          />
        </div>
      ) : null}
    </div>
  );
}

function TenderSection({ title, items, empty }: { title: string; items: TenderListItem[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-[#5c564c]">{empty}</p> : items.map((item) => <TenderCard key={`${title}-${item.id}`} item={item} />)}
    </section>
  );
}
