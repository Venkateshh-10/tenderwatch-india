import { serverEnv } from "@/lib/server-env";

export type DataMode = "live";

export function serpApiKeyPresent(): boolean {
  return serverEnv("SERPAPI_API_KEY").length > 0;
}

/** Product rows are live SerpApi results only. A missing key blocks the search; it does not switch on sample tenders. */
export function currentDataMode(): DataMode {
  return "live";
}
