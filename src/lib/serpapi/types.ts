export type SearchEngine = "google" | "google_news";

export type NormalizedHit = {
  position: number;
  title: string;
  url: string;
  displayedLink: string | null;
  domain: string;
  snippet: string | null;
  dateText: string | null;
  engine: SearchEngine;
};

export class SerpApiError extends Error {
  code: "missing_key" | "invalid_key" | "credits" | "timeout" | "http" | "network" | "invalid_response";

  constructor(
    message: string,
    code: "missing_key" | "invalid_key" | "credits" | "timeout" | "http" | "network" | "invalid_response",
  ) {
    super(message);
    this.name = "SerpApiError";
    this.code = code;
  }
}
