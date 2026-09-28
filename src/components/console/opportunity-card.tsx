import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/console/status-pill";
import { WatchButton } from "@/components/watch-button";
import { formatDateIst, formatInr, orUnavailable } from "@/lib/format";
import type { TenderListItem } from "@/lib/tenders/queries";
import { cn } from "@/lib/utils";

const ACCENT: Record<string, string> = {
  BID: "border-l-[#22C55E]",
  REVIEW: "border-l-[#F59E0B]",
  SKIP: "border-l-[#EF4444]",
};

export function OpportunityCard({
  item,
  href,
  selected,
}: {
  item: TenderListItem;
  href: string;
  selected: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-md border border-border border-l-2 bg-elevated px-2.5 py-2 transition-colors hover:border-[#3182F6]/60",
        ACCENT[item.verdict ?? ""] ?? "border-l-border",
        selected && "border-[#3182F6]",
      )}
    >
      <div className="flex items-start gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {item.verdict ? <StatusPill status={item.verdict} /> : <StatusPill status="UNKNOWN" />}
            {item.changed ? <StatusPill status="CHANGED" /> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug font-medium">{item.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {orUnavailable(item.buyer)} · {orUnavailable(item.state)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {item.estimatedValueInr == null ? "Value not available" : formatInr(item.estimatedValueInr)}
            {" · "}
            {item.closingDate ? formatDateIst(item.closingDate) : "Closing date not available"}
          </p>
          {item.matchLabels.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.matchLabels.map((label) => (
                <span key={label} className="rounded border border-[#3182F6]/30 bg-[#18385E] px-1.5 py-0.5 text-[10px] text-[#7CB3FF]">
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <WatchButton tenderId={item.id} watched={item.watched} compact />
          <Link href={`/tenders/${item.id}`} aria-label="Open tender" className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
