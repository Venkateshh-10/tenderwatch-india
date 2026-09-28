import { SEARCH_TIMEOUT_MS } from "@/lib/search/limits";
import { serpapiSearch } from "@/lib/serpapi/client";

export function searchGoogleNews(query: string, timeoutMs = SEARCH_TIMEOUT_MS): Promise<unknown> {
  return serpapiSearch(
    {
      engine: "google_news",
      q: query,
      gl: "in",
      hl: "en",
    },
    timeoutMs,
  );
}
