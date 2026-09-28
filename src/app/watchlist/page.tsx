import { CheckUpdatesButton } from "@/components/check-updates-button";
import { TenderCard } from "@/components/tender-card";
import { prisma } from "@/lib/db";
import { listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const watched = await prisma.watchlistItem.findMany({
    where: { tender: { dataMode: "live" } },
    select: { tenderId: true },
  });
  const ids = new Set(watched.map((item) => item.tenderId));
  const tenders = (await listTenders()).filter((item) => ids.has(item.id));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl text-[#16302b]">Watchlist</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#5c564c]">
          Watching a live notice stores a snapshot of the fields already captured. Check for updates runs a fresh SerpApi search and records a change only when the next snapshot differs.
        </p>
      </div>
      {tenders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#cfc4ad] bg-white p-6 text-sm">No tenders on the watchlist.</p>
      ) : (
        tenders.map((item) => (
          <div key={item.id} className="space-y-2">
            <TenderCard item={item} />
            <CheckUpdatesButton tenderId={item.id} />
          </div>
        ))
      )}
    </div>
  );
}
