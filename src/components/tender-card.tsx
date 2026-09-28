import Link from "next/link";
import { StatusPill } from "@/components/console/status-pill";
import { formatDateIst, formatInr, formatIst, orUnavailable } from "@/lib/format";
import { authorityLabel } from "@/lib/tender/authority";
import type { TenderListItem } from "@/lib/tenders/queries";

export function TenderCard({ item }: { item: TenderListItem }) {
  return (
    <article className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            {item.verdict ? <StatusPill status={item.verdict} /> : <StatusPill status="UNKNOWN" />}
            {item.changed ? <StatusPill status="CHANGED" /> : null}
          </div>
          <Link href={`/tenders/${item.id}`} className="text-[14px] font-medium hover:text-[#7CB3FF]">
            {item.title}
          </Link>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {orUnavailable(item.buyer)} · {orUnavailable(item.state)} · {item.domain}
          </p>
        </div>
      </div>
      <dl className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-[11px] text-muted-foreground">Closing</dt>
          <dd>{formatDateIst(item.closingDate)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Estimated value</dt>
          <dd>{formatInr(item.estimatedValueInr)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Why it matched</dt>
          <dd>{item.match ?? "Not available"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Blocker</dt>
          <dd>{item.blocker ?? "None recorded"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Evidence</dt>
          <dd>
            {item.sourceCount} supporting source{item.sourceCount === 1 ? "" : "s"} · {authorityLabel(item.authority)} · {item.confidence} confidence
            {item.hasNews ? " · includes Google News as context" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Last checked</dt>
          <dd>{formatIst(item.lastCheckedAt)}</dd>
        </div>
      </dl>
      {item.summary ? <p className="mt-2 text-[12px] font-medium">{item.summary}</p> : null}
    </article>
  );
}
