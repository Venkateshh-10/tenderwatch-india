import { serpapiSearch } from "@/lib/serpapi/client";

export function searchGoogleNews(query: string): Promise<unknown> {
  return serpapiSearch({
    engine: "google_news",
    q: query,
    gl: "in",
    hl: "en",
  });
}
