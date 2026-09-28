import { CalendarClock, CheckCircle2, History, Radar, ShieldAlert, XCircle } from "lucide-react";

const ICONS = {
  "Live Opportunities": Radar,
  BID: CheckCircle2,
  REVIEW: ShieldAlert,
  SKIP: XCircle,
  "Closing This Week": CalendarClock,
  "Changed Recently": History,
} as const;

export function KpiRow({
  metrics,
}: {
  metrics: readonly { label: keyof typeof ICONS; value: number }[];
}) {
  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => {
        const Icon = ICONS[metric.label];
        return (
          <article key={metric.label} className="rounded-md border border-border bg-card px-3 py-2.5">
            <Icon className="size-3.5 text-muted-foreground" />
            <p className="mt-1.5 text-[22px] leading-none font-semibold tabular-nums">{metric.value}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{metric.label}</p>
          </article>
        );
      })}
    </section>
  );
}
