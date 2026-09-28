import Link from "next/link";
import { Check } from "lucide-react";
import { DiscoverRunner } from "@/components/discover-runner";
import { SectionHeading } from "@/components/console/section-heading";
import { formatIst } from "@/lib/format";

type Run = {
  id: string;
  engine: string;
  query: string;
  status: string;
  retrievedAt: Date;
};

export function DiscoveryPanel({
  liveSearch,
  executed,
  searchedGoogle,
  searchedNews,
  hasCandidates,
  runs,
}: {
  liveSearch: boolean;
  executed: number;
  searchedGoogle: boolean;
  searchedNews: boolean;
  hasCandidates: boolean;
  runs: Run[];
}) {
  const planned = executed > 0;
  const filtered = searchedGoogle || searchedNews;
  const steps = [
    ["Planning targeted searches", planned],
    ["Searching Google (SerpApi)", searchedGoogle],
    ["Searching Google News (SerpApi)", searchedNews],
    ["Filtering and normalizing results", filtered],
    ["Removing duplicates", filtered],
    ["Matching with company profile", hasCandidates],
  ] as const;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-md border border-border bg-card p-3">
      <SectionHeading n={2} title="Live Discovery (SerpApi)" />
      <div className="mt-2">
        <DiscoverRunner liveSearch={liveSearch} compact />
      </div>
      <ol className="mt-3 space-y-1.5">
        {steps.map(([label, done]) => (
          <li key={label} className="flex items-center gap-2 text-[12px]">
            <span
              className={
                done
                  ? "inline-flex size-4 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#22C55E]"
                  : "inline-flex size-4 items-center justify-center rounded-full border border-border text-transparent"
              }
            >
              <Check className="size-2.5" />
            </span>
            <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12px] font-medium">Searches executed ({executed})</p>
      {runs.length === 0 ? (
        <p className="mt-1 text-[12px] text-muted-foreground">No searches stored yet.</p>
      ) : (
        <ul className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {runs.map((run) => (
            <li key={run.id} className="rounded border border-border bg-elevated px-2 py-1 font-mono text-[11px] leading-4 text-[#C5D0DC]">
              <span className="text-muted-foreground">{run.engine === "google_news" ? "news" : "google"}</span> {run.query}
              {run.status !== "success" ? <span className="text-[#EF4444]"> · {run.status}</span> : null}
              <span className="mt-0.5 block font-sans text-[10px] text-muted-foreground">{formatIst(run.retrievedAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/discover#queries" className="mt-2 text-[12px] text-[#3182F6] hover:underline">
        View all queries →
      </Link>
    </section>
  );
}
