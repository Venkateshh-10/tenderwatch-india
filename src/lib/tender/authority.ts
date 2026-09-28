export type AuthorityTier = "A" | "B" | "C" | "D" | "U";

const MEDIA = [
  "thehindu.com",
  "indianexpress.com",
  "economictimes.com",
  "economictimes.indiatimes.com",
  "livemint.com",
  "business-standard.com",
  "timesofindia.indiatimes.com",
  "hindustantimes.com",
  "reuters.com",
  "bbc.com",
  "bbc.co.uk",
  "ndtv.com",
  "theprint.in",
  "newindianexpress.com",
  "deccanherald.com",
  "financialexpress.com",
  "moneycontrol.com",
  "thehindubusinessline.com",
];

const AGGREGATORS = [
  "tenderdetail.com",
  "tendersinfo.com",
  "tender247.com",
  "indiantenders.in",
  "bidassist.com",
  "tendersontime.com",
  "tendertiger.com",
  "tendertiger.net",
  "globaltenders.com",
  "tendernews.com",
  "indiatenders.com",
  "tendersinfo.net",
  "deepbloo.com",
  "deepbloo.in",
];

const OFFICIAL_COMPANIES = [
  "ongcindia.com",
  "ntpc.co.in",
  "iocl.com",
  "bhel.com",
  "sail.co.in",
  "powergrid.in",
  "bel-india.in",
  "hal-india.co.in",
  "coalindia.in",
  "gailonline.com",
];

function hostMatches(domain: string, candidate: string): boolean {
  return domain === candidate || domain.endsWith(`.${candidate}`);
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifyDomain(domainOrUrl: string): AuthorityTier {
  const domain = domainOrUrl.includes("://")
    ? domainFromUrl(domainOrUrl)
    : domainOrUrl.toLowerCase().replace(/^www\./, "");
  if (!domain) return "U";
  if (domain.endsWith(".gov.in") || domain.endsWith(".nic.in") || domain === "gov.in" || domain === "nic.in") {
    return "A";
  }
  if (OFFICIAL_COMPANIES.some((item) => hostMatches(domain, item))) return "B";
  if (MEDIA.some((item) => hostMatches(domain, item))) return "C";
  if (AGGREGATORS.some((item) => hostMatches(domain, item))) return "D";
  return "U";
}

export function authorityRank(tier: string): number {
  switch (tier) {
    case "A":
      return 1;
    case "B":
      return 2;
    case "C":
      return 3;
    case "U":
      return 4;
    case "D":
      return 5;
    default:
      return 6;
  }
}

export function authorityLabel(tier: string): string {
  switch (tier) {
    case "A":
      return "Tier A · Official";
    case "B":
      return "Tier B · Official announcement";
    case "C":
      return "Tier C · Established media";
    case "D":
      return "Tier D · Aggregator";
    default:
      return "Unclassified source";
  }
}
