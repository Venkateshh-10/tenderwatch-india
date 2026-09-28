export const DISCOVERY_GOOGLE_CAP = 5;
export const DISCOVERY_NEWS_CAP = 2;
export const CHANGE_QUERY_CAP = 4;
export const SEARCH_TIMEOUT_MS = 20_000;
export const SEARCH_CONCURRENCY = 1;
export const MAX_SOURCE_FETCHES = 3;
export const SOURCE_FETCH_TIMEOUT_MS = 8_000;

export function cacheTtlMs(): number {
  const hours = Number(process.env.SEARCH_CACHE_TTL_HOURS ?? 12);
  if (!Number.isFinite(hours) || hours <= 0) return 12 * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}
