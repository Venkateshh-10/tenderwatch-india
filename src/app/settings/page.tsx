import { getDeskSnapshot } from "@/lib/desk";
import { formatIst } from "@/lib/format";
import { listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [desk, tenders] = await Promise.all([getDeskSnapshot(), listTenders()]);
  const live = desk.liveSearch;

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
          <Item label="Latest discovery raw" value={String(desk.session?.rawCount ?? 0)} />
          <Item label="Latest discovery queries" value={String(desk.session?.queryCount ?? 0)} />
          <Item label="Historical searches stored" value={String(desk.historicalSearches)} />
          <Item label="Historical raw results" value={String(desk.historicalRaw)} />
          <Item label="Tender candidates" value={String(tenders.length)} />
          <Item label="Watchlist" value={String(desk.watchCount)} />
          <Item label="Last retrieval" value={desk.lastVerified ? formatIst(desk.lastVerified) : "No verified retrieval yet"} />
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
