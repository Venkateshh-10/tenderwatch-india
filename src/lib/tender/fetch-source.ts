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
    if (type.includes("pdf") || parsed.pathname.toLowerCase().endsWith(".pdf")) {
      const bytes = Buffer.from(await response.arrayBuffer());
      const excerpt = extractPdfLiterals(bytes.subarray(0, 2_000_000));
      if (!excerpt) return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
      return { excerpt, note: "Fetched public PDF text" };
    }
    const html = (await response.text()).slice(0, 350_000);
    if (/captcha|access denied|forbidden/i.test(html.slice(0, 1500)) && html.length < 4000) {
      return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
    }
    const text = decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    )
      .replace(/[\u00a0\u1680\u2000-\u200d\u202f\u205f\u3000\ufeff]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 14000);
    if (text.length < 80) return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
    return { excerpt: text, note: "Fetched public page text" };
  } catch {
    return { excerpt: null, note: "SOURCE NOT DIRECTLY VERIFIED" };
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_entity, body: string) => {
    if (body[0] === "#") {
      const code = body[1]?.toLowerCase() === "x" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    }
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    return named[body.toLowerCase()] ?? " ";
  });
}

function extractPdfLiterals(bytes: Buffer): string | null {
  if (bytes.length < 8 || bytes.subarray(0, 4).toString("latin1") !== "%PDF") return null;
  const raw = bytes.toString("latin1");
  const parts: string[] = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)]){2,240}\)\s*Tj/g)) {
    const inner = match[0].slice(1, match[0].lastIndexOf(")"));
    const text = inner
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    if (/[A-Za-z]{3}/.test(text)) parts.push(text);
  }
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  if (joined.length < 80) return null;
  return joined.slice(0, 14000);
}
