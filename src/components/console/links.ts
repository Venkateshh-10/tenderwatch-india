export type ConsoleQuery = {
  q?: string;
  tab?: string;
  sort?: string;
  tender?: string;
  row?: string;
  has?: string;
  view?: string;
};

export function consoleHref(base: string, current: ConsoleQuery, patch: Partial<ConsoleQuery> = {}): string {
  const next: ConsoleQuery = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (!value) continue;
    if (key === "tab" && value === "all") continue;
    if (key === "sort" && value === "rank") continue;
    if (key === "view" && value === "overview") continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
