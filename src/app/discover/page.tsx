import { DiscoverRunner } from "@/components/discover-runner";
import { TenderCard } from "@/components/tender-card";
import { formatIst } from "@/lib/format";
import { currentDataMode } from "@/lib/mode";
import { listSearchRuns, listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const mode = currentDataMode();
  const [tenders, runs] = await Promise.all([listTenders(mode), listSearchRuns(mode)]);
  return (
    <div className="space-y-6">
      <DiscoverRunner mode={mode} />
      <section className="space-y-3">
        <h2 className="font-serif text-2xl">{mode === "live" ? "Stored live notices" : "Demo notices"}</h2>
        {tenders.length === 0 ? (
          <p className="text-sm text-[#5c564c]">No notices stored for this mode.</p>
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
                <p className="font-medium">{run.dataMode === "demo" ? "Demo fixture · SerpApi not called" : run.engine}</p>
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
