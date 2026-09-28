import { CheckUpdatesButton } from "@/components/check-updates-button";
import { TenderCard } from "@/components/tender-card";
import { currentDataMode } from "@/lib/mode";
import { prisma } from "@/lib/db";
import { listTenders } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const mode = currentDataMode();
  const watched = await prisma.watchlistItem.findMany({ select: { tenderId: true } });
  const ids = new Set(watched.map((item) => item.tenderId));
  const tenders = (await listTenders(mode)).filter((item) => ids.has(item.id));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl text-[#16302b]">Watchlist</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#5c564c]">
          Saved notices for this mode. Check for updates compares the notice with the next snapshot. Demo mode does not call SerpApi. Live mode re-queries Google and Google News and records only observed differences.
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
