"use client";

import { useRouter } from "next/navigation";
import { consoleHref, type ConsoleQuery } from "@/components/console/links";

const SORTS = [
  { value: "rank", label: "Best match" },
  { value: "closing", label: "Closing date" },
  { value: "recent", label: "Recently found" },
];

const FILTERS = [
  { value: "", label: "Filters" },
  { value: "closing", label: "Has closing date" },
  { value: "value", label: "Has estimated value" },
  { value: "changed", label: "Changed recently" },
];

export function ResultsToolbar({ query }: { query: ConsoleQuery }) {
  const router = useRouter();
  const sort = query.sort || "rank";
  const has = query.has || "";

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="Sort opportunities"
        value={sort}
        onChange={(event) => router.push(consoleHref("/", query, { sort: event.target.value === "rank" ? "" : event.target.value }))}
        className="h-7 rounded-md border border-border bg-elevated px-1.5 text-[11px] text-foreground"
      >
        {SORTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter opportunities"
        value={has}
        onChange={(event) => router.push(consoleHref("/", query, { has: event.target.value }))}
        className="h-7 rounded-md border border-border bg-elevated px-1.5 text-[11px] text-foreground"
      >
        {FILTERS.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
