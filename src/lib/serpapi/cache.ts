import { createHash } from "node:crypto";
import { cacheTtlMs } from "@/lib/search/limits";
import type { SearchEngine } from "@/lib/serpapi/types";

export function buildCacheKey(engine: SearchEngine, query: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ engine, query: query.trim().toLowerCase(), gl: "in", hl: "en" }))
    .digest("hex");
}

export function cacheExpiry(from = new Date()): Date {
  return new Date(from.getTime() + cacheTtlMs());
}

export function cacheIsFresh(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}
