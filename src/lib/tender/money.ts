const UNIT: Record<string, number> = {
  crore: 1e7,
  crores: 1e7,
  cr: 1e7,
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  lacs: 1e5,
};

export function parseInrAmount(rawNumber: string, unit?: string | null): number | null {
  const amount = Number(rawNumber.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (unit) {
    const multiplier = UNIT[unit.toLowerCase().replace(/\./g, "")];
    if (!multiplier) return null;
    return Math.round(amount * multiplier);
  }
  if (amount < 1000) return null;
  return Math.round(amount);
}

export function parseInrInText(text: string): { amount: number; index: number; length: number } | null {
  const match = text.match(
    /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(crores?|cr\.?|lakhs?|lacs?)?/i,
  );
  if (!match || match.index == null) return null;
  const amount = parseInrAmount(match[1], match[2] ?? null);
  if (amount == null) return null;
  return { amount, index: match.index, length: match[0].length };
}
