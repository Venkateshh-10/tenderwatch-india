import { classifyDomain } from "@/lib/tender/authority";
import { extractPdfText } from "@/lib/tender/pdf-text";
import { DOCUMENT_FETCH_TIMEOUT_MS, MAX_DOCUMENT_BYTES } from "@/lib/search/limits";

const PRIVATE_HOST = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|\[::1\])$/i;
const MAX_REDIRECTS = 5;

export type SourceVerification = "VERIFIED_SOURCE" | "DISCOVERED_OFFICIAL" | "UNVERIFIED";

export type PublicFetchResult = {
  excerpt: string | null;
  note: string;
  verification: SourceVerification;
  httpStatus: number | null;
  contentType: string | null;
  redirectUrl: string | null;
  contentLength: number | null;
};

export function isVerifiedFetch(status: string | null | undefined): boolean {
  return status === "VERIFIED_SOURCE" || status === "verified_text";
}

export function verificationLabel(status: string | null | undefined): string {
  if (isVerifiedFetch(status)) return "VERIFIED";
  if (status === "DISCOVERED_OFFICIAL") return "DISCOVERED OFFICIAL";
  if (status === "not_attempted") return "Not fetched";
  return "SOURCE NOT VERIFIED";
}

export async function fetchPublicExcerpt(url: string): Promise<PublicFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return failed(null, "UNVERIFIED", "SOURCE NOT DIRECTLY VERIFIED");
  }
  if (!isSafePublicUrl(parsed)) return failed(parsed, "UNVERIFIED", "SOURCE NOT DIRECTLY VERIFIED");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOCUMENT_FETCH_TIMEOUT_MS);
  let current = parsed;
  let redirectUrl: string | null = null;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "user-agent": "TenderWatchIndia/0.1 (public tender research)",
          accept: "application/pdf,text/html,text/plain;q=0.9,*/*;q=0.1",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) return failed(current, failureVerification(current), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl);
        const next = new URL(location, current);
        if (!isSafePublicUrl(next)) return failed(current, failureVerification(current), "SOURCE NOT DIRECTLY VERIFIED", response.status, next.toString());
        redirectUrl = next.toString();
        current = next;
        continue;
      }
      return await readResponse(current, response, redirectUrl);
    }
    return failed(current, failureVerification(current), "SOURCE NOT DIRECTLY VERIFIED", null, redirectUrl);
  } catch {
    return failed(current, failureVerification(current), "SOURCE NOT DIRECTLY VERIFIED", null, redirectUrl);
  } finally {
    clearTimeout(timer);
  }
}

async function readResponse(url: URL, response: Response, redirectUrl: string | null): Promise<PublicFetchResult> {
  const contentType = response.headers.get("content-type");
  const disposition = response.headers.get("content-disposition") ?? "";
  const declared = Number(response.headers.get("content-length") ?? "");
  if (!response.ok) {
    return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType, Number.isFinite(declared) ? declared : null);
  }
  if (Number.isFinite(declared) && declared > MAX_DOCUMENT_BYTES) {
    return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType, declared);
  }
  const bytes = await readCapped(response, MAX_DOCUMENT_BYTES);
  if (!bytes) {
    return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType, Number.isFinite(declared) ? declared : null);
  }
  const type = (contentType ?? "").toLowerCase();
  if (isPdfResponse(type, disposition, bytes)) {
    const extracted = await extractPdfText(bytes);
    if (!extracted) {
      return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType ?? "application/pdf", bytes.length);
    }
    return done(url, {
      excerpt: extracted.text,
      note: "Fetched public PDF text",
      verification: "VERIFIED_SOURCE",
      httpStatus: response.status,
      contentType: contentType ?? "application/pdf",
      redirectUrl,
      contentLength: bytes.length,
    });
  }
  if (isUnsafeType(type)) {
    return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType, bytes.length);
  }
  if (type.includes("html") || type.startsWith("text/") || type === "") {
    const html = bytes.toString("utf8").slice(0, 350_000);
    if (/captcha|access denied|forbidden/i.test(html.slice(0, 1500)) && html.length < 4000) {
      return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType, bytes.length);
    }
    const text = decodeHtmlEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
      .replace(/[\u00a0\u1680\u2000-\u200d\u202f\u205f\u3000\ufeff]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100_000);
    if (text.length < 80) {
      return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType, bytes.length);
    }
    return done(url, {
      excerpt: text,
      note: "Fetched public page text",
      verification: "VERIFIED_SOURCE",
      httpStatus: response.status,
      contentType,
      redirectUrl,
      contentLength: bytes.length,
    });
  }
  return failed(url, failureVerification(url), "SOURCE NOT DIRECTLY VERIFIED", response.status, redirectUrl, contentType, bytes.length);
}

function isPdfResponse(type: string, disposition: string, bytes: Buffer): boolean {
  if (type.includes("pdf") || /\.pdf/i.test(disposition)) return true;
  return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}

function isUnsafeType(type: string): boolean {
  return /octet-stream|zip|gzip|msdownload|x-sh|x-executable|javascript/.test(type) && !type.includes("pdf");
}

function isSafePublicUrl(url: URL): boolean {
  return url.protocol === "https:" && !PRIVATE_HOST.test(url.hostname);
}

function failureVerification(url: URL): SourceVerification {
  const tier = classifyDomain(url.hostname);
  return tier === "A" || tier === "B" ? "DISCOVERED_OFFICIAL" : "UNVERIFIED";
}

function failed(
  url: URL | null,
  verification: SourceVerification,
  note: string,
  httpStatus: number | null = null,
  redirectUrl: string | null = null,
  contentType: string | null = null,
  contentLength: number | null = null,
): PublicFetchResult {
  const result: PublicFetchResult = { excerpt: null, note, verification, httpStatus, contentType, redirectUrl, contentLength };
  logFetch(url, result);
  return result;
}

function done(url: URL, result: PublicFetchResult): PublicFetchResult {
  logFetch(url, result);
  return result;
}

function logFetch(url: URL | null, result: PublicFetchResult): void {
  console.info(
    JSON.stringify({
      event: "source_fetch",
      host: url?.hostname ?? null,
      path: url?.pathname ?? null,
      httpStatus: result.httpStatus,
      contentType: result.contentType,
      redirectHost: result.redirectUrl ? safeHost(result.redirectUrl) : null,
      contentLength: result.contentLength,
      verification: result.verification,
    }),
  );
}

function safeHost(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

async function readCapped(response: Response, cap: number): Promise<Buffer | null> {
  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    return buf.length > cap ? null : buf;
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done: finished, value } = await reader.read();
    if (finished) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
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
