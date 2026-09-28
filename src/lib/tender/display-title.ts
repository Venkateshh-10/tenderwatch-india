export function verifiedDisplayTitle(
  serpTitle: string,
  facts: { scope: string | null; buyer: string | null; organisation: string | null },
): string {
  const scope = shorten(facts.scope);
  const party = clean(facts.buyer || facts.organisation);
  if (scope && party) return `${scope} — ${party}`;
  if (isGenericGemTitle(serpTitle)) {
    if (scope) return scope;
    if (party) return party;
  }
  return serpTitle.trim();
}

function isGenericGemTitle(title: string): boolean {
  const cleaned = title.replace(/\s+/g, " ").trim();
  return (/bid document/i.test(cleaned) && /gem/i.test(cleaned)) || /^\/?\s*bid document\s*$/i.test(cleaned);
}

function clean(value: string | null): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim() ?? "";
  return cleaned.length >= 4 ? cleaned : null;
}

function shorten(value: string | null): string | null {
  const cleaned = clean(value);
  if (!cleaned) return null;
  if (cleaned.length <= 90) return cleaned;
  return `${cleaned.slice(0, 87).trim()}…`;
}
