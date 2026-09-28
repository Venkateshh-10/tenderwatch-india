export type DataMode = "live";

export function serpApiKeyPresent(): boolean {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

/** Product rows are live SerpApi results only. A missing key blocks the search; it does not switch on sample tenders. */
export function currentDataMode(): DataMode {
  return "live";
}
