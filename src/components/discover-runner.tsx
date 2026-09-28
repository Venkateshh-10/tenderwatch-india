"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatIst } from "@/lib/format";
import type { DiscoveryResult } from "@/lib/discovery/run";

export function DiscoverRunner({ liveSearch }: { liveSearch: boolean }) {
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
    <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#16302b]">Discover live opportunities</h2>
          <p className="text-sm text-[#5c564c]">
            Plans a short set of Google Search and Google News queries from Company DNA, then calls SerpApi. News items stay supporting context.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => run(false)} disabled={pending}>
            {pending ? "Searching SerpApi…" : "Discover Live Opportunities"}
          </Button>
          <Button variant="outline" onClick={() => run(true)} disabled={pending || !liveSearch}>
            Refresh Live
          </Button>
        </div>
      </div>
      {pending ? (
        <p className="mt-4 text-sm text-[#5c564c]">Calling SerpApi. This log fills in when each search returns. It does not advance on a timer.</p>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="font-medium">Live search unavailable</p>
          <p className="mt-1">Reason: {error}</p>
          {result?.notice ? <p className="mt-1">{result.notice}</p> : null}
          {result?.lastVerifiedAt ? <p>Retrieved: {formatIst(result.lastVerifiedAt)}</p> : null}
          {!liveSearch && result?.planned?.length ? (
            <div className="mt-3 text-[#3d3832]">
              <p>These queries were planned from Company DNA and were not sent.</p>
              <ul className="mt-1 list-disc pl-5">
                {result.planned.map((query) => (
                  <li key={`${query.engine}-${query.query}`}>
                    {query.engine} · {query.query}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button className="mt-3" size="sm" variant="outline" onClick={() => run(true)} disabled={pending || !liveSearch}>
            Retry Live Search
          </Button>
        </div>
      ) : null}
      {result && !error ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            {result.searchResultCount} search results · {result.uniqueOpportunities} unique opportunities ·{" "}
            {result.relevantOpportunities} relevant opportunities
          </p>
          {result.notice ? (
            <p>
              {result.notice}
              {result.lastVerifiedAt ? ` · Retrieved: ${formatIst(result.lastVerifiedAt)}` : ""}
            </p>
          ) : null}
          <ul className="space-y-1 text-[#3d3832]">
            {result.log.map((entry, index) => (
              <li key={`${entry.query}-${index}`}>
                <span className="font-medium">{entry.engine === "google_news" ? "Google News via SerpApi" : "Google Search via SerpApi"}</span>
                {" · "}
                {entry.query}
                {" · "}
                {entry.resultCount} results
                {entry.cacheHit ? " · cached live result" : ""}
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
