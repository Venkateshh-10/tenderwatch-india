import { formatIst } from "@/lib/format";
import { serpApiKeyPresent } from "@/lib/mode";
import { countWatchlist, latestLiveRetrieval, listTenders, searchActivity } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [activity, lastVerified, tenders, watchCount] = await Promise.all([
    searchActivity(),
    latestLiveRetrieval(),
    listTenders(),
    countWatchlist(),
  ]);
  const live = serpApiKeyPresent();

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Desk status for live SerpApi search. The API key stays on the server and is not shown here.
        </p>
      </div>
      <section className="rounded-md border border-border bg-card p-3 text-[13px]">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Item label="Live Search" value={live ? "Ready" : "Unavailable"} />
          <Item label="Searches stored" value={String(activity.executed)} />
          <Item label="Raw results stored" value={String(activity.rawResults)} />
          <Item label="Tender candidates" value={String(tenders.length)} />
          <Item label="Watchlist" value={String(watchCount)} />
          <Item label="Last retrieval" value={lastVerified ? formatIst(lastVerified) : "No verified retrieval yet"} />
        </dl>
        {live ? null : (
          <p className="mt-3 text-[12px] text-[#F59E0B]">Set SERPAPI_API_KEY in .env.local to run a live search. The desk stays empty until a real result is stored.</p>
        )}
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-2.5 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
