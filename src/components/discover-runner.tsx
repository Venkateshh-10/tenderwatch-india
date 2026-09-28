"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatIst } from "@/lib/format";
import type { DiscoveryResult } from "@/lib/discovery/run";

export function DiscoverRunner({ liveSearch, compact = false }: { liveSearch: boolean; compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(refresh: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const payload = (await response.json()) as DiscoveryResult;
      setResult(payload);
      if (payload.error) setError(payload.error);
      router.refresh();
    } catch {
      setError("Live search unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={compact ? "" : "rounded-md border border-border bg-card p-3"}>
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}>
        {compact ? null : (
          <div>
            <h2 className="text-base font-semibold">Discover Live Opportunities</h2>
            <p className="text-[12px] text-muted-foreground">
              Plans Google Search and Google News queries from Company DNA, then calls SerpApi. News stays supporting context.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => run(false)} disabled={pending}>
            {pending ? "Searching SerpApi…" : "Discover Live Opportunities"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(true)} disabled={pending || !liveSearch}>
            Refresh Live
          </Button>
        </div>
      </div>
      {pending ? (
        <div className="mt-3 space-y-1.5" aria-hidden>
          <div className="h-2 w-2/3 animate-pulse rounded bg-elevated" />
          <div className="h-2 w-1/2 animate-pulse rounded bg-elevated" />
          <p className="text-[11px] text-muted-foreground">Calling SerpApi. Checks update when a search returns.</p>
        </div>
      ) : null}
      {error ? (
        <div className="mt-3 rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 p-2.5 text-[12px] text-[#F5F7FA]">
          <p className="font-medium text-[#EF4444]">Live search unavailable</p>
          <p className="mt-1">Reason: {error}</p>
          {result?.notice ? <p className="mt-1">{result.notice}</p> : null}
          {result?.lastVerifiedAt ? <p>Retrieved: {formatIst(result.lastVerifiedAt)}</p> : null}
          {!liveSearch && result?.planned?.length ? (
            <div className="mt-2 text-muted-foreground">
              <p>These queries were planned from Company DNA and were not sent.</p>
              <ul className="mt-1 space-y-1 font-mono text-[11px]">
                {result.planned.map((query) => (
                  <li key={`${query.engine}-${query.query}`}>
                    {query.engine} · {query.query}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button className="mt-2" size="sm" variant="outline" onClick={() => run(true)} disabled={pending || !liveSearch}>
            Retry Live Search
          </Button>
        </div>
      ) : null}
      {result && !error ? (
        <div className="mt-3 space-y-1.5 text-[12px]">
          <p>
            {result.searchResultCount} search results · {result.uniqueOpportunities} tender candidates · {result.relevantOpportunities} bid or review ·{" "}
            {result.rejectedCount ?? 0} rejected · {result.supportingNewsCount ?? 0} news items kept as context
          </p>
          {result.notice ? (
            <p>
              {result.notice}
              {result.lastVerifiedAt ? ` · Retrieved: ${formatIst(result.lastVerifiedAt)}` : ""}
            </p>
          ) : null}
          <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
            {result.log.map((entry, index) => (
              <li key={`${entry.query}-${index}`}>
                {entry.engine === "google_news" ? "news" : "google"} · {entry.query} · {entry.resultCount} results
                {entry.cacheHit ? " · cached" : ""}
                {entry.retrievedAt ? ` · ${formatIst(entry.retrievedAt)}` : ""}
                {entry.message ? ` · ${entry.message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
