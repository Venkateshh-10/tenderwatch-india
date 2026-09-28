"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { DiscoveryResult } from "@/lib/discovery/run";

export function DiscoverRunner({ mode }: { mode: "live" | "demo" }) {
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
          <h2 className="font-serif text-2xl text-[#16302b]">Discover</h2>
          <p className="text-sm text-[#5c564c]">
            {mode === "live"
              ? "Runs a short Company DNA query plan through Google Search and Google News."
              : "Shows labeled demo fixtures through the same planner, normalizer, and readiness rules."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => run(false)} disabled={pending}>
            {pending ? "Working…" : mode === "live" ? "Discover Live Opportunities" : "Load Demo Opportunities"}
          </Button>
          {mode === "live" ? (
            <Button variant="outline" onClick={() => run(true)} disabled={pending}>
              Refresh Live
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="font-medium">Live search unavailable</p>
          <p className="mt-1">Reason: {error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => run(true)} disabled={pending}>
            Retry Live Search
          </Button>
        </div>
      ) : null}
      {result ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            {result.searchResultCount} search results · {result.uniqueOpportunities} unique opportunities ·{" "}
            {result.relevantOpportunities} relevant opportunities
          </p>
          <ul className="space-y-1 text-[#3d3832]">
            {result.log.map((entry, index) => (
              <li key={`${entry.query}-${index}`}>
                <span className="font-medium">{entry.status === "demo" ? "Demo fixture" : entry.engine}</span>
                {" · "}
                {entry.query}
                {" · "}
                {entry.resultCount} results
                {entry.cacheHit ? " · cached live result" : ""}
                {entry.retrievedAt ? ` · ${entry.retrievedAt}` : ""}
                {entry.message ? ` · ${entry.message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
