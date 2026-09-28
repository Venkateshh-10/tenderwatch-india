import { DiscoverRunner } from "@/components/discover-runner";
import { TenderCard } from "@/components/tender-card";
import { formatIst, formatSearchParameters } from "@/lib/format";
import { serpApiKeyPresent } from "@/lib/mode";
import { displayedOpportunities, latestLiveRetrieval, listSearchRuns, listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [tenders, runs, lastVerified] = await Promise.all([listTenders(), listSearchRuns(40), latestLiveRetrieval()]);
  const shown = displayedOpportunities(tenders);
  return (
    <div className="space-y-3">
      <DiscoverRunner liveSearch={serpApiKeyPresent()} />
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Stored live notices</h2>
        {lastVerified ? <p className="text-[12px] text-muted-foreground">Showing last verified live result. Retrieved: {formatIst(lastVerified)}</p> : null}
        {tenders.length === 0 ? <p className="text-[13px] text-muted-foreground">No verified data available.</p> : shown.map((item) => <TenderCard key={item.id} item={item} />)}
      </section>
      <section id="queries" className="rounded-md border border-border bg-card p-3">
        <h2 className="text-base font-semibold">Search provenance</h2>
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
