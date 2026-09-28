import { classifyDomain, domainFromUrl } from "@/lib/tender/authority";

export type HitClass = "TenderCandidate" | "TenderChangeCandidate" | "SupportingNews" | "RejectedResult";
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
  "bidplus.gem.gov.in",
  "fulfilment.gem.gov.in",
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

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function hostMatches(domain: string, candidate: string): boolean {
  return domain === candidate || domain.endsWith(`.${candidate}`);
}

function cleanDomain(domainOrUrl: string): string {
  if (domainOrUrl.includes("://")) return domainFromUrl(domainOrUrl);
  return domainOrUrl.toLowerCase().replace(/^www\./, "");
}

export function normalizeHitTitle(raw: string): string {
  const withoutTags = raw.replace(/<[^>]+>/g, " ");
  const decoded = withoutTags.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_entity, body: string) => {
    if (body[0] === "#") {
      const code = body[1]?.toLowerCase() === "x" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? " ";
  });
  return decoded
    .normalize("NFKC")
    .replace(/[\u00a0\u1680\u2000-\u200d\u202f\u205f\u3000\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleIsGarbled(title: string): boolean {
  if (title.length < 8) return true;
  const letters = title.match(/[A-Za-z\u0900-\u097F]/g)?.length ?? 0;
  if (letters < 4) return true;
  if ((title.match(/[<>{}\\|]/g)?.length ?? 0) >= 2) return true;
  if (/^(null|undefined|untitled|document|home|page)$/i.test(title)) return true;
  if (/([^\w\s])\1{4,}/u.test(title)) return true;
  return false;
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
  return domain.split(".").some((label) => /^(eproc|eprocure|etender|etenders|tender|tenders|gem|bidplus)$/.test(label));
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function hasProcurementPath(url: string, domainOrUrl: string): boolean {
  const domain = cleanDomain(domainOrUrl || url);
  if (isKnownProcurementPortal(domain)) return true;
  if (hostMatches(domain, "bidplus.gem.gov.in") || hostMatches(domain, "fulfilment.gem.gov.in")) return true;
  const path = pathnameOf(url);
  const official = domain.endsWith(".gov.in") || domain.endsWith(".nic.in") || classifyDomain(domain) === "A" || classifyDomain(domain) === "B";
  if (!official) return false;
  if (/\/(tenders?|nits?|e-?procurement|etenders?|eprocure|bid-?documents?|view-?bid|bidding)(\/|$)/.test(path)) return true;
  if (/\.pdf(?:$|\?)/i.test(url) && /tender|nit|rfp|eoi|bid[-_ ]?document|corrigend/.test(`${path} ${url}`.toLowerCase())) return true;
  return false;
}

export function hasProcurementIdentity(text: string): boolean {
  return (
    /\bbid\s*numbers?\b/i.test(text) ||
    /\btender\s*(?:id|no\.?|number|reference)\b/i.test(text) ||
    /\bnotice\s+inviting\s+tenders?\b/i.test(text) ||
    /\b(?:nits?|rfps?|eois?)\b/i.test(text) ||
    /\brequest\s+for\s+proposal\b/i.test(text) ||
    /\bexpression\s+of\s+interest\b/i.test(text) ||
    /\bbid\s+documents?\b/i.test(text) ||
    /\btender\s+documents?\b/i.test(text) ||
    /\bgem\s*\/\s*\d{4}\s*\/\s*[a-z]\s*\/\s*\d{3,}\b/i.test(text) ||
    /\b\d{4}_[a-z0-9]+_\d{4,}(?:_\d+)?\b/i.test(text) ||
    /बोली\s*संख्या/.test(text) ||
    /निविदा\s*संख्या/.test(text)
  );
}

function hasReferenceToken(text: string): boolean {
  return (
    /\bgem\s*\/\s*\d{4}\s*\/\s*[a-z]\s*\/\s*\d{3,}\b/i.test(text) ||
    /\b\d{4}_[a-z0-9]+_\d{4,}(?:_\d+)?\b/i.test(text) ||
    /\b[A-Z0-9]{2,}(?:[/-][A-Z0-9]{2,}){2,}\b/.test(text)
  );
}

export function procurementPortalScore(url: string, domainOrUrl: string): number {
  const domain = cleanDomain(domainOrUrl || url);
  const path = `${pathnameOf(url)} ${url}`.toLowerCase();
  if (hostMatches(domain, "bidplus.gem.gov.in")) return 0;
  if (hostMatches(domain, "gem.gov.in") && /bid/.test(path)) return 1;
  if (hostMatches(domain, "fulfilment.gem.gov.in")) return 2;
  if (isKnownProcurementPortal(domain)) return 3;
  if (/\.pdf(?:$|\?)/i.test(url) && /tender|nit|rfp|eoi|bid/.test(path)) return 4;
  if (hasProcurementPath(url, domain)) return 5;
  return 6;
}

function bareHomepage(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/index\.(?:html?|php|aspx)$/i, "").replace(/\/+$/, "");
    return path === "" || path.toLowerCase() === "/home";
  } catch {
    return false;
  }
}

function staleArchive(text: string, now: Date): boolean {
  const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (years.length === 0) return false;
  return years.every((year) => year < now.getFullYear());
}

function standaloneChange(title: string): boolean {
  if (/^\s*(corrigend\w*|amendments?|extensions?|cancellations?|cancelled)\b/i.test(title)) return true;
  return /\b(corrigend(?:um|a)|amendment|bid extension|cancellation of (?:the )?(?:tender|bid))\b/i.test(title) && !/\bnotice\s+inviting\s+tender\b/i.test(title);
}

function reject(reason: string, signals: string[] = []): GateDecision {
  return { hitClass: "RejectedResult", confidence: "LOW", signals, reason };
}

export function classifySearchHit(input: {
  engine: string;
  title: string;
  url: string;
  domain: string;
  snippet?: string | null;
  now?: Date;
}): GateDecision {
  const now = input.now ?? new Date();
  const domain = cleanDomain(input.domain || input.url);
  const title = normalizeHitTitle(input.title);
  const snippet = normalizeHitTitle(input.snippet ?? "");
  const text = `${title}\n${snippet}`;
  const place = `${title}\n${input.url}\n${domain}`;

  if (titleIsGarbled(title)) return reject("Malformed or empty title.");
  if (isNoiseDomain(domain)) return reject("Social, reference, or market-research host.");
  if (/embassy|consulate|high[\s-]*commission|diplomatic note|press note/i.test(place)) {
    return reject("Diplomatic page. Official domain is not a tender.");
  }
  if (/economic survey|annual report|budget speech|union budget/i.test(place)) {
    return reject("Survey, report, or budget document.");
  }
  if (/\bpolic(?:y|ies)\b/i.test(title) && !hasProcurementIdentity(title)) {
    return reject("Policy document without a tender identity.");
  }
  if (/\b(we are hiring|job opening|vacancies|vacancy|walk-?in interview|recruitment)\b/i.test(text)) {
    return reject("Recruitment, not a procurement notice.");
  }
  if (input.engine === "google_news") {
    if (hasProcurementIdentity(text) || /\b(tender|rfp|nit|eoi|procurement|corrigendum|gem bid)\b/i.test(text)) {
      return {
        hitClass: "SupportingNews",
        confidence: "LOW",
        signals: [],
        reason: "News stays supporting context and is not an opportunity.",
      };
    }
    return reject("News item has no procurement signal.");
  }
  if (staleArchive(`${title}\n${snippet}`, now)) return reject("Stale archive page.");
  if (bareHomepage(input.url)) return reject("Generic department homepage.");

  const path = hasProcurementPath(input.url, domain);
  const identity = hasProcurementIdentity(text);
  const signals = [path ? "procurement_path" : null, identity ? "procurement_identity" : null].filter((item): item is string => Boolean(item));

  if (standaloneChange(title)) {
    const confidence: TenderConfidence = path && (identity || hasReferenceToken(text)) ? "HIGH" : identity || hasReferenceToken(text) ? "MEDIUM" : "LOW";
    return {
      hitClass: "TenderChangeCandidate",
      confidence,
      signals,
      reason: "Corrigendum, amendment, extension, or cancellation is change evidence, not a new opportunity.",
    };
  }
  if (/\btender\s+management\b/i.test(title) && !identity) {
    return reject("Generic tender-management page without a tender identity.");
  }
  if (classifyDomain(domain) === "D" && !hasReferenceToken(text)) {
    return reject("Aggregator listing without a tender reference.");
  }
  if (path && identity && (domain.endsWith(".gov.in") || domain.endsWith(".nic.in") || isKnownProcurementPortal(domain) || classifyDomain(domain) === "A" || classifyDomain(domain) === "B")) {
    return { hitClass: "TenderCandidate", confidence: "HIGH", signals, reason: "Procurement path and tender identity are both present." };
  }
  if (identity) {
    return { hitClass: "TenderCandidate", confidence: "MEDIUM", signals, reason: "Tender identity without an official procurement path." };
  }
  if (path) {
    return { hitClass: "TenderCandidate", confidence: "LOW", signals, reason: "Procurement portal without a tender identity." };
  }
  if (/\b(tenders?|bids?|procurement)\b/i.test(text) && (classifyDomain(domain) === "A" || classifyDomain(domain) === "B")) {
    return { hitClass: "TenderCandidate", confidence: "LOW", signals: [], reason: "Official page mentions procurement without a tender identity." };
  }
  return reject("No procurement path and no tender identity.", signals);
}

export function isDiscoverOpportunity(input: {
  title: string;
  url: string;
  domain: string;
  snippet?: string | null;
  engines?: string[];
  now?: Date;
}): boolean {
  if (input.engines && input.engines.length > 0 && input.engines.every((engine) => engine === "google_news")) return false;
  const decision = classifySearchHit({
    engine: "google",
    title: input.title,
    url: input.url,
    domain: input.domain,
    snippet: input.snippet,
    now: input.now,
  });
  return decision.hitClass === "TenderCandidate" && decision.confidence !== "LOW";
}
