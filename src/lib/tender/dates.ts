const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export function istDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateFromParts(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2100) return null;
  const value = new Date(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`,
  );
  if (Number.isNaN(value.getTime())) return null;
  if (istDateKey(value) !== `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`) {
    return null;
  }
  return value;
}

export function isPastDeadline(closing: Date, now: Date): boolean {
  return istDateKey(closing) < istDateKey(now);
}

export function daysUntil(closing: Date, now: Date): number {
  const start = Date.parse(`${istDateKey(now)}T00:00:00Z`);
  const end = Date.parse(`${istDateKey(closing)}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export type FoundDate = { date: Date; index: number; length: number; label: "closing" | "opening" | "publication" | "unknown" };

function labelFor(text: string, index: number): FoundDate["label"] {
  const lineStart = text.lastIndexOf("\n", Math.max(0, index - 1));
  const current = classifyDateLabel(text.slice(lineStart + 1, index + 24));
  if (current !== "unknown") return current;
  return classifyDateLabel(text.slice(Math.max(0, index - 40), index + 24));
}

function classifyDateLabel(slice: string): FoundDate["label"] {
  const value = slice.toLowerCase();
  if (/(last date|closing|due date|submission|bid end|end date|bid submission|अंतिम तिथि|समाप्ति)/.test(value)) return "closing";
  if (/opening/.test(value)) return "opening";
  if (/(published|publication|dated)/.test(value)) return "publication";
  return "unknown";
}

export function findDates(text: string): FoundDate[] {
  const found: FoundDate[] = [];
  const numeric = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g;
  for (const match of text.matchAll(numeric)) {
    if (match.index == null) continue;
    const date = dateFromParts(Number(match[3]), Number(match[2]), Number(match[1]));
    if (!date) continue;
    found.push({ date, index: match.index, length: match[0].length, label: labelFor(text, match.index) });
  }
  const named = /(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})/gi;
  for (const match of text.matchAll(named)) {
    if (match.index == null) continue;
    const month = MONTHS[match[2].toLowerCase()];
    const date = dateFromParts(Number(match[3]), month, Number(match[1]));
    if (!date) continue;
    found.push({ date, index: match.index, length: match[0].length, label: labelFor(text, match.index) });
  }
  return found;
}

export function firstLabeledDate(text: string, label: FoundDate["label"]): FoundDate | null {
  return findDates(text).find((item) => item.label === label) ?? null;
}
