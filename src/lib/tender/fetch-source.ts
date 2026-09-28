import { SOURCE_FETCH_TIMEOUT_MS } from "@/lib/search/limits";

const PRIVATE_HOST = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|\[::1\])$/i;

export async function fetchPublicExcerpt(url: string): Promise<{ excerpt: string | null; note: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
  }
  if (parsed.protocol !== "https:" || PRIVATE_HOST.test(parsed.hostname)) {
    return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(parsed, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "TenderWatchIndia/0.1 (public tender research)" },
    });
    const finalUrl = new URL(response.url);
    if (PRIVATE_HOST.test(finalUrl.hostname)) return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
    if (!response.ok) return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("pdf")) return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
    const html = (await response.text()).slice(0, 350_000);
    if (/captcha|access denied|forbidden/i.test(html.slice(0, 1500)) && html.length < 4000) {
      return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
    }
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
    if (text.length < 80) return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
    return { excerpt: text, note: "Fetched public page text" };
  } catch {
    return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
  } finally {
    clearTimeout(timer);
  }
}
