import { SEARCH_TIMEOUT_MS } from "@/lib/search/limits";
import { serpapiSearch } from "@/lib/serpapi/client";

export function searchGoogle(query: string, num = 8, timeoutMs = SEARCH_TIMEOUT_MS): Promise<unknown> {
  return serpapiSearch(
    {
      engine: "google",
      q: query,
      gl: "in",
      hl: "en",
      google_domain: "google.co.in",
      num: String(num),
    },
    timeoutMs,
  );
}
