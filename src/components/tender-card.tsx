import Link from "next/link";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatDateIst, formatInr, formatIst, orUnavailable } from "@/lib/format";
import { authorityLabel } from "@/lib/tender/authority";
import type { TenderListItem } from "@/lib/tenders/queries";

export function TenderCard({ item }: { item: TenderListItem }) {
  return (
    <article className="rounded-xl border border-[#e4dccb] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/tenders/${item.id}`} className="font-medium text-[#16302b] hover:underline">
            {item.title}
          </Link>
          <p className="mt-1 text-sm text-[#5c564c]">
            {orUnavailable(item.buyer)} · {orUnavailable(item.state)} · {item.domain}
          </p>
        </div>
        <VerdictBadge verdict={item.verdict} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#5c564c]">Closing</dt>
          <dd>{formatDateIst(item.closingDate)}</dd>
        </div>
        <div>
          <dt className="text-[#5c564c]">Estimated value</dt>
          <dd>{formatInr(item.estimatedValueInr)}</dd>
        </div>
        <div>
          <dt className="text-[#5c564c]">Why it matched</dt>
          <dd>{item.match ?? "Not available"}</dd>
        </div>
        <div>
          <dt className="text-[#5c564c]">Blocker</dt>
          <dd>{item.blocker ?? "None recorded"}</dd>
        </div>
        <div>
          <dt className="text-[#5c564c]">Evidence</dt>
          <dd>
            {item.sourceCount} supporting source{item.sourceCount === 1 ? "" : "s"} · {authorityLabel(item.authority)} ·{" "}
            {item.confidence} confidence
            {item.hasNews ? " · includes Google News as context" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[#5c564c]">Last checked</dt>
          <dd>{formatIst(item.lastCheckedAt)}</dd>
        </div>
      </dl>
      {item.summary ? <p className="mt-3 text-sm font-medium">{item.summary}</p> : null}
    </article>
  );
}
