export function formatIst(date: Date | string | null | undefined): string {
  if (!date) return "Not available";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "Not available";
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
  return `${formatted} IST`;
}

export function formatDateIst(date: Date | string | null | undefined): string {
  if (!date) return "Not available";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function formatInr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  if (Math.abs(value) >= 1e7) {
    const crore = value / 1e7;
    return `₹${trimNumber(crore)} crore`;
  }
  if (Math.abs(value) >= 1e5) {
    const lakh = value / 1e5;
    return `₹${trimNumber(lakh)} lakh`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function trimNumber(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function orUnavailable(value: string | null | undefined): string {
  if (!value || !value.trim()) return "Not available";
  return value.trim();
}

export function formatSearchParameters(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Not available";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return raw.trim();
    const parts = Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => value != null && value !== "")
      .map(([key, value]) => `${key}=${String(value)}`);
    return parts.length > 0 ? parts.join(" · ") : "Not available";
  } catch {
    return raw.trim();
  }
}
