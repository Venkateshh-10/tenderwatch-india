export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id"]) {
      parsed.searchParams.delete(key);
    }
    const path = parsed.pathname.replace(/\/+$/, "") || "";
    const query = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.hostname}${path}${query ? `?${query}` : ""}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function normalizeRef(ref: string): string {
  return ref.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TITLE_STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "for",
  "and",
  "in",
  "on",
  "to",
  "tender",
  "notice",
  "inviting",
  "government",
  "govt",
  "limited",
  "ltd",
  "private",
  "pvt",
]);

export function titleTokens(value: string): Set<string> {
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .filter((token) => token.length > 2 && !TITLE_STOP.has(token)),
  );
}

export function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function windowAround(text: string, index: number, length: number, radius = 90): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  return normalizeWhitespace(text.slice(start, end));
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
