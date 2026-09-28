import { classifyDomain, domainFromUrl } from "@/lib/tender/authority";

export type HitClass = "TenderCandidate" | "SupportingNews" | "RejectedResult";
export type TenderConfidence = "HIGH" | "MEDIUM" | "LOW";

export type GateDecision = {
  hitClass: HitClass;
  confidence: TenderConfidence;
  signals: string[];
  reason: string;
};

const NOISE_HOSTS = [
  "linkedin.com",
  "instagram.com",
  "facebook.com",
  "fb.com",
  "youtube.com",
  "youtu.be",
  "wikipedia.org",
  "wikimedia.org",
  "wikidata.org",
  "grandviewresearch.com",
  "marketsandmarkets.com",
  "statista.com",
  "fortunebusinessinsights.com",
  "researchandmarkets.com",
  "alliedmarketresearch.com",
  "mordorintelligence.com",
  "medium.com",
  "reddit.com",
  "quora.com",
  "twitter.com",
  "x.com",
  "pinterest.com",
  "tiktok.com",
];

const PORTALS = [
  "eprocure.gov.in",
  "gem.gov.in",
  "etenders.gov.in",
  "defproc.gov.in",
  "eproc.gov.in",
  "tntenders.gov.in",
  "tenders.tn.gov.in",
  "eproc.karnataka.gov.in",
  "etenders.kerala.gov.in",
  "tender.telangana.gov.in",
  "eprocurement.gov.in",
  "cppp.gov.in",
  "etenders.hry.nic.in",
  "govtprocurement.delhi.gov.in",
  "eproc.rajasthan.gov.in",
  "tendersodisha.gov.in",
  "mptenders.gov.in",
  "mahatenders.gov.in",
];

function hostMatches(domain: string, candidate: string): boolean {
  return domain === candidate || domain.endsWith(`.${candidate}`);
}

function cleanDomain(domainOrUrl: string): string {
  if (domainOrUrl.includes("://")) return domainFromUrl(domainOrUrl);
  return domainOrUrl.toLowerCase().replace(/^www\./, "");
}

export function isNoiseDomain(domainOrUrl: string): boolean {
  const domain = cleanDomain(domainOrUrl);
  return NOISE_HOSTS.some((host) => hostMatches(domain, host));
}

export function isKnownProcurementPortal(domainOrUrl: string): boolean {
  const domain = cleanDomain(domainOrUrl);
  if (!domain) return false;
  if (PORTALS.some((host) => hostMatches(domain, host))) return true;
  if (!domain.endsWith(".gov.in") && !domain.endsWith(".nic.in")) return false;
  return domain.split(".").some((label) => /^(eproc|eprocure|etender|etenders|tender|tenders|gem)$/.test(label));
}

function tenderPath(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/(tenders?|nit|e-?proc(?:ure)?|etenders?|procurement|bid-documents?|corrigend)/.test(path);
  } catch {
    return false;
  }
}

function tenderPdf(url: string, text: string): boolean {
  if (!/\.pdf(?:$|\?)/i.test(url)) return false;
  return /tender|nit|rfp|eoi|bid|corrigendum|gem/.test(`${url}\n${text}`.toLowerCase());
}

function strongSignals(text: string, url: string, domain: string): string[] {
  const signals: string[] = [];
  const lower = text.toLowerCase();
  if (/\bgem\/\d{4}\/[a-z]\/\d{3,}\b/i.test(text) || /\b\d{4}_[a-z0-9]+_\d{4,}(?:_\d+)?\b/i.test(text)) signals.push("tender_reference");
  if (/notice inviting tender|\bnits?\b/.test(lower)) signals.push("notice_inviting_tender");
  if (/request for proposal|\brfps?\b/.test(lower)) signals.push("request_for_proposal");
  if (/expression of interest|\beois?\b/.test(lower)) signals.push("expression_of_interest");
  if (/bid document/.test(lower)) signals.push("bid_document");
  if (/tender notice|\be-?tender\b|\be-?procurement\b/.test(lower)) signals.push("tender_notice");
  if (/\bcorrigend(?:um|a)\b/.test(lower)) signals.push("corrigendum");
  if (/\bgem\s*bid\b/.test(lower)) signals.push("gem_bid");
  const procurementContext = /\b(tender|bid|nit|rfp|eoi|procurement|gem)\b/.test(lower);
  if (procurementContext && /\bamendments?\b/.test(lower)) signals.push("amendment");
  if (procurementContext && /\bextensions?\b/.test(lower)) signals.push("extension");
  if (procurementContext && /\bcancellations?\b|\bcancelled\b/.test(lower)) signals.push("cancellation");
  if (isKnownProcurementPortal(domain) || /eprocure|etender|tenders?\//i.test(url)) signals.push("procurement_url");
  if (tenderPath(url) && (domain.endsWith(".gov.in") || domain.endsWith(".nic.in") || isKnownProcurementPortal(domain))) {
    signals.push("procurement_url");
  }
  if (tenderPdf(url, text)) signals.push("tender_pdf");
  if (isKnownProcurementPortal(domain)) signals.push("known_portal");
  return [...new Set(signals)];
}

function officialSource(domain: string): boolean {
  const tier = classifyDomain(domain);
  return tier === "A" || tier === "B" || isKnownProcurementPortal(domain);
}

export function classifySearchHit(input: {
  engine: string;
  title: string;
  url: string;
  domain: string;
  snippet?: string | null;
}): GateDecision {
  const domain = cleanDomain(input.domain || input.url);
  const text = `${input.title}\n${input.snippet ?? ""}`;
  if (isNoiseDomain(domain)) {
    return { hitClass: "RejectedResult", confidence: "LOW", signals: [], reason: "Social, reference, or market-research host." };
  }
  if (/\b(we are hiring|job opening|vacancies|vacancy|walk-?in interview|recruitment notice|now hiring)\b/i.test(text) && strongSignals(text, input.url, domain).length === 0) {
    return { hitClass: "RejectedResult", confidence: "LOW", signals: [], reason: "Recruitment, not a procurement notice." };
  }

  const signals = strongSignals(text, input.url, domain);
  if (input.engine === "google_news") {
    if (signals.length > 0 || /\b(tender|rfp|nit|eoi|procurement|corrigendum|gem bid)\b/i.test(text)) {
      return { hitClass: "SupportingNews", confidence: "LOW", signals, reason: "News stays supporting context and is not an opportunity." };
    }
    return { hitClass: "RejectedResult", confidence: "LOW", signals: [], reason: "News item has no procurement signal." };
  }

  if (signals.length === 0) {
    if (/\b(tenders?|bids?|procurement)\b/i.test(text) && officialSource(domain)) {
      return { hitClass: "TenderCandidate", confidence: "LOW", signals: [], reason: "Official page mentions procurement without a strong notice signal." };
    }
    return { hitClass: "RejectedResult", confidence: "LOW", signals: [], reason: "No strong procurement signal." };
  }

  if (officialSource(domain)) {
    return { hitClass: "TenderCandidate", confidence: "HIGH", signals, reason: "Official procurement source with a tender signal." };
  }
  return { hitClass: "TenderCandidate", confidence: "MEDIUM", signals, reason: "Strong tender language on a secondary source." };
}

export function isDiscoverOpportunity(input: {
  title: string;
  url: string;
  domain: string;
  snippet?: string | null;
  engines?: string[];
}): boolean {
  if (input.engines && input.engines.length > 0 && input.engines.every((engine) => engine === "google_news")) return false;
  const decision = classifySearchHit({
    engine: "google",
    title: input.title,
    url: input.url,
    domain: input.domain,
    snippet: input.snippet,
  });
  return decision.hitClass === "TenderCandidate" && decision.confidence !== "LOW";
}
