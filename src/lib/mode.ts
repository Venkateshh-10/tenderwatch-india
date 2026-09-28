export type DataMode = "live" | "demo";

export function serpApiKeyPresent(): boolean {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

export function currentDataMode(): DataMode {
  return serpApiKeyPresent() ? "live" : "demo";
}
