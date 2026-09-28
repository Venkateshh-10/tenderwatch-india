import { domainFromUrl } from "@/lib/tender/authority";
import type { NormalizedHit, SearchEngine } from "@/lib/serpapi/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceName(value: unknown): string | null {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return record ? asString(record.name) : null;
}

export function normalizeSerpApiResults(engine: SearchEngine, payload: unknown): NormalizedHit[] {
  const record = asRecord(payload);
  if (!record) return [];
  const key = engine === "google_news" ? "news_results" : "organic_results";
  const rows = Array.isArray(record[key]) ? record[key] : [];
  const hits: NormalizedHit[] = [];

  rows.forEach((row, index) => {
    const item = asRecord(row);
    if (!item) return;
    const url = asString(item.link) ?? asString(item.url);
    const title = asString(item.title);
    if (!url || !title || !/^https?:\/\//i.test(url)) return;
    const domain = domainFromUrl(url);
    if (!domain) return;
    hits.push({
      position: typeof item.position === "number" ? item.position : index + 1,
      title,
      url,
      displayedLink: asString(item.displayed_link) ?? sourceName(item.source),
      domain,
      snippet: asString(item.snippet) ?? asString(item.snippet_highlighted_words),
      dateText: asString(item.date) ?? asString(item.iso_date),
      engine,
    });
  });

  return hits;
}
