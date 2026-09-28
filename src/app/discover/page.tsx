import { DiscoverRunner } from "@/components/discover-runner";
import { TenderCard } from "@/components/tender-card";
import { formatIst } from "@/lib/format";
import { serpApiKeyPresent } from "@/lib/mode";
import { latestLiveRetrieval, listSearchRuns, listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [tenders, runs, lastVerified] = await Promise.all([listTenders(), listSearchRuns(), latestLiveRetrieval()]);
  return (
    <div className="space-y-6">
      <DiscoverRunner liveSearch={serpApiKeyPresent()} />
      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Stored live notices</h2>
        {lastVerified ? <p className="text-sm text-[#5c564c]">Showing last verified live result. Retrieved: {formatIst(lastVerified)}</p> : null}
        {tenders.length === 0 ? (
          <p className="text-sm text-[#5c564c]">No verified data available.</p>
        ) : (
          tenders.map((item) => <TenderCard key={item.id} item={item} />)
        )}
      </section>
      <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <h2 className="font-serif text-2xl">Search provenance</h2>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-[#5c564c]">No searches stored yet.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {runs.map((run) => (
              <li key={run.id} className="border-t border-[#efe8da] pt-3">
                <p className="font-medium">{run.engine === "google_news" ? "Google News via SerpApi" : "Google Search via SerpApi"}</p>
                <p>{run.query}</p>
                <p className="text-[#5c564c]">
                  gl=in · hl=en · {run._count.sources} sources · {run.status}
                  {run.cacheHit ? " · cached live result" : ""} · {formatIst(run.retrievedAt)}
                </p>
                {run.error ? <p className="text-rose-800">{run.error}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
