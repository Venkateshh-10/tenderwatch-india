import { DiscoverRunner } from "@/components/discover-runner";
import { TenderCard } from "@/components/tender-card";
import { getDeskSnapshot } from "@/lib/desk";
import { formatIst, formatSearchParameters } from "@/lib/format";
import { displayedOpportunities, listSearchRuns, listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [tenders, runs, desk] = await Promise.all([listTenders(), listSearchRuns(40), getDeskSnapshot()]);
  const shown = displayedOpportunities(tenders);
  const lastVerified = desk.lastVerified;
  return (
    <div className="space-y-3">
      <DiscoverRunner liveSearch={desk.liveSearch} />
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Stored live notices</h2>
        {lastVerified ? <p className="text-[12px] text-muted-foreground">Showing last verified live result. Retrieved: {formatIst(lastVerified)}</p> : null}
        {tenders.length === 0 ? <p className="text-[13px] text-muted-foreground">No verified data available.</p> : shown.map((item) => <TenderCard key={item.id} item={item} />)}
      </section>
      <section id="queries" className="rounded-md border border-border bg-card p-3">
        <h2 className="text-base font-semibold">Search provenance</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">Historical: {desk.historicalSearches} searches stored</p>
        {runs.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">No searches stored yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-[12px]">
            {runs.map((run) => (
              <li key={run.id} className="rounded-md border border-border bg-elevated px-2.5 py-2">
                <p className="font-medium">{run.engine === "google_news" ? "Google News via SerpApi" : "Google Search via SerpApi"}</p>
                <p className="font-mono text-[11px]">{run.query}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatSearchParameters(run.parameters)} · {run._count.sources} sources · {run.status}
                  {run.cacheHit ? " · cached live result" : ""} · {formatIst(run.retrievedAt)}
                </p>
                {run.error ? <p className="text-[11px] text-[#EF4444]">{run.error}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
