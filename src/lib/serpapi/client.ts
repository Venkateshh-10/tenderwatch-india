import { SEARCH_TIMEOUT_MS } from "@/lib/search/limits";
import { SerpApiError } from "@/lib/serpapi/types";

const ENDPOINT = "https://serpapi.com/search.json";

function sanitizeMessage(message: string): string {
  return message
    .replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[redacted]")
    .replace(/\b[a-f0-9]{32,}\b/gi, "[redacted]")
    .slice(0, 280);
}

export async function serpapiSearch(params: Record<string, string>, timeoutMs = SEARCH_TIMEOUT_MS): Promise<unknown> {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) {
    throw new SerpApiError("SERPAPI_API_KEY is not configured on the server.", "missing_key");
  }

  const url = new URL(ENDPOINT);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("api_key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new SerpApiError("SerpApi returned an unreadable response.", "invalid_response");
    }
    const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const errorText = record && typeof record.error === "string" ? record.error : "";
    if (!response.ok || errorText) {
      const message = sanitizeMessage(errorText || response.statusText || "SerpApi request failed");
      const lower = message.toLowerCase();
      if (response.status === 401 || lower.includes("invalid api key") || lower.includes("api key")) {
        throw new SerpApiError("SerpApi rejected the API key.", "invalid_key");
      }
      if (response.status === 429 || lower.includes("run out of searches") || lower.includes("credit")) {
        throw new SerpApiError("SerpApi search credits are exhausted.", "credits");
      }
      throw new SerpApiError(message || "SerpApi request failed.", "http");
    }
    return payload;
  } catch (error) {
    if (error instanceof SerpApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SerpApiError("SerpApi request timed out.", "timeout");
    }
    throw new SerpApiError("SerpApi request failed due to a network error.", "network");
  } finally {
    clearTimeout(timer);
  }
}
