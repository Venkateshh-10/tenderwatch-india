import type { AuthorityTier } from "@/lib/tender/authority";
import { firstLabeledDate } from "@/lib/tender/dates";
import { parseInrAmount } from "@/lib/tender/money";
import { normalizeRef, uniqueStrings, windowAround } from "@/lib/tender/text";

export type EvidenceStatus = "VERIFIED" | "SUPPORTED" | "UNVERIFIED" | "UNKNOWN";
export type MandatoryStatus = "mandatory" | "preferred" | "informational";

export type RequirementDraft = {
  type: string;
  label: string;
  value: string | null;
  numericValue: number | null;
  unit: string | null;
  mandatoryStatus: MandatoryStatus;
  evidenceText: string | null;
  sourceUrl: string | null;
  sourceAuthority: AuthorityTier | null;
  evidenceStatus: EvidenceStatus;
  confidence: "high" | "medium" | "low";
};

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Puducherry",
  "Jammu and Kashmir",
  "Ladakh",
];

const CERTS: Array<{ label: string; pattern: RegExp }> = [
  { label: "ISO 9001", pattern: /iso\s*9001/i },
  { label: "ISO 27001", pattern: /iso\s*27001/i },
  { label: "ISO 20000", pattern: /iso\s*20000/i },
  { label: "ISO 14001", pattern: /iso\s*14001/i },
  { label: "CMMI", pattern: /\bcmmi\b/i },
];

const TOPICS = [
  "artificial intelligence",
  "computer vision",
  "machine learning",
  "software",
  "web application",
  "analytics",
  "automation",
  "cloud",
  "python",
  "cybersecurity",
  "data centre",
  "gis",
  "cctv",
];

function mandatoryNear(text: string, index: number): MandatoryStatus {
  const slice = text.slice(Math.max(0, index - 70), index + 90).toLowerCase();
  if (/(must|shall|mandatory|required|minimum)/.test(slice)) return "mandatory";
  if (/(prefer|desirable|advantage)/.test(slice)) return "preferred";
  return "informational";
}

export function evidenceFor(authority: AuthorityTier, fromPage: boolean, kind: "date" | "money" | "prose"): EvidenceStatus {
  if (authority === "A" && (fromPage || kind === "date" || kind === "money")) return "VERIFIED";
  if (authority === "A" || authority === "B") return "SUPPORTED";
  return "UNVERIFIED";
}

function moneyNear(text: string, keyword: RegExp): { amount: number; index: number; raw: string } | null {
  const match = keyword.exec(text);
  if (!match || match.index == null) return null;
  const window = text.slice(match.index, match.index + 90);
  const amountMatch = window.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(crores?|cr\.?|lakhs?|lacs?)?/i);
  if (!amountMatch) return null;
  const amount = parseInrAmount(amountMatch[1], amountMatch[2] ?? null);
  if (amount == null) return null;
  return { amount, index: match.index, raw: window };
}

export function extractReference(text: string): string | null {
  const gem = text.match(/\bGEM\/\d{4}\/[A-Z]\/\d{3,}\b/i);
  if (gem) return gem[0].toUpperCase();
  const labeled = text.match(/\b(?:NIT|RFP|EOI|Tender)\s*(?:No\.?|Number|ID|Ref(?:erence)?)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-.]{4,40})/i);
  if (!labeled) return null;
  const token = labeled[1];
  if (!/\d/.test(token)) return null;
  const normalized = normalizeRef(token);
  if (normalized.length < 5) return null;
  return token.replace(/[.,;:]+$/, "").toUpperCase();
}

export function extractState(text: string): string | null {
  const hits = STATES.filter((state) => new RegExp(`\\b${state}\\b`, "i").test(text));
  if (hits.length === 1) return hits[0];
  return null;
}

export type ExtractedTenderFacts = {
  tenderReference: string | null;
  buyer: string | null;
  state: string | null;
  closingDate: Date | null;
  openingDate: Date | null;
  publicationDate: Date | null;
  estimatedValueInr: number | null;
  emdInr: number | null;
  tenderFeeInr: number | null;
  turnoverRequirementInr: number | null;
  experienceRequirementYears: number | null;
  companyAgeRequirementYears: number | null;
  certifications: string[];
  msmePreference: boolean | null;
  startupPreference: boolean | null;
  status: string | null;
  topics: string[];
  requirements: RequirementDraft[];
};

export function extractFacts(input: {
  text: string;
  authority: AuthorityTier;
  fromPage: boolean;
  sourceUrl: string | null;
}): ExtractedTenderFacts {
  const text = input.text;
  const requirements: RequirementDraft[] = [];
  const push = (draft: RequirementDraft) => requirements.push(draft);

  const closing = firstLabeledDate(text, "closing");
  const opening = firstLabeledDate(text, "opening");
  const publication = firstLabeledDate(text, "publication");
  if (closing) {
    push({
      type: "deadline",
      label: "Closing date",
      value: closing.date.toISOString(),
      numericValue: null,
      unit: "date",
      mandatoryStatus: "mandatory",
      evidenceText: windowAround(text, closing.index, closing.length),
      sourceUrl: input.sourceUrl,
      sourceAuthority: input.authority,
      evidenceStatus: evidenceFor(input.authority, input.fromPage, "date"),
      confidence: "high",
    });
  }

  const emd = moneyNear(text, /(?:earnest money(?: deposit)?|\bemd\b)/i);
  if (emd) {
    push({
      type: "emd",
      label: "EMD",
      value: String(emd.amount),
      numericValue: emd.amount,
      unit: "INR",
      mandatoryStatus: "mandatory",
      evidenceText: windowAround(text, emd.index, 40),
      sourceUrl: input.sourceUrl,
      sourceAuthority: input.authority,
      evidenceStatus: evidenceFor(input.authority, input.fromPage, "money"),
      confidence: "high",
    });
  }

  const turnover = moneyNear(text, /turnover/i);
  if (turnover) {
    const mandatory = mandatoryNear(text, turnover.index);
    push({
      type: "turnover",
      label: "Minimum turnover",
      value: String(turnover.amount),
      numericValue: turnover.amount,
      unit: "INR",
      mandatoryStatus: mandatory === "informational" ? "mandatory" : mandatory,
      evidenceText: windowAround(text, turnover.index, 40),
      sourceUrl: input.sourceUrl,
      sourceAuthority: input.authority,
      evidenceStatus: input.fromPage && input.authority === "A" ? "VERIFIED" : evidenceFor(input.authority, false, "prose"),
      confidence: input.fromPage ? "high" : "medium",
    });
  }

  const experience = text.match(/(\d+)\s*\+?\s*years?(?:'|\s+of)?\s*(?:relevant\s+)?experience/i);
  let experienceYears: number | null = null;
  if (experience && experience.index != null) {
    experienceYears = Number(experience[1]);
    push({
      type: "experience",
      label: "Experience",
      value: String(experienceYears),
      numericValue: experienceYears,
      unit: "years",
      mandatoryStatus: mandatoryNear(text, experience.index),
      evidenceText: windowAround(text, experience.index, experience[0].length),
      sourceUrl: input.sourceUrl,
      sourceAuthority: input.authority,
      evidenceStatus: input.fromPage && input.authority === "A" ? "VERIFIED" : evidenceFor(input.authority, false, "prose"),
      confidence: "medium",
    });
  }

  const age = text.match(/(\d+)\s+years?.{0,40}(?:existence|incorporation|in business|old)/i);
  let companyAge: number | null = null;
  if (age && age.index != null) {
    companyAge = Number(age[1]);
    push({
      type: "company_age",
      label: "Company age",
      value: String(companyAge),
      numericValue: companyAge,
      unit: "years",
      mandatoryStatus: mandatoryNear(text, age.index),
      evidenceText: windowAround(text, age.index, age[0].length),
      sourceUrl: input.sourceUrl,
      sourceAuthority: input.authority,
      evidenceStatus: input.fromPage && input.authority === "A" ? "VERIFIED" : evidenceFor(input.authority, false, "prose"),
      confidence: "medium",
    });
  }

  const certifications: string[] = [];
  for (const cert of CERTS) {
    const match = cert.pattern.exec(text);
    if (!match || match.index == null) continue;
    certifications.push(cert.label);
    push({
      type: `certification:${cert.label}`,
      label: cert.label,
      value: "Required",
      numericValue: null,
      unit: null,
      mandatoryStatus: mandatoryNear(text, match.index),
      evidenceText: windowAround(text, match.index, match[0].length),
      sourceUrl: input.sourceUrl,
      sourceAuthority: input.authority,
      evidenceStatus: input.fromPage && input.authority === "A" ? "VERIFIED" : evidenceFor(input.authority, false, "prose"),
      confidence: "high",
    });
  }

  const estimated = moneyNear(text, /(?:estimated (?:cost|value)|tender value|project cost)/i);
  const fee = moneyNear(text, /tender fee/i);
  const lower = text.toLowerCase();
  let status: string | null = null;
  if (/\bcancell?ed\b/.test(lower)) status = "Cancelled";
  else if (/\bawarded\b/.test(lower)) status = "Awarded";
  else if (/\bcorrigendum\b/.test(lower)) status = "Corrigendum noted";

  const buyerMatch = text.match(/(?:issued by|invited by)\s+([A-Za-z][^.\n]{4,80})/i);

  return {
    tenderReference: extractReference(text),
    buyer: buyerMatch ? buyerMatch[1].trim() : null,
    state: extractState(text),
    closingDate: closing?.date ?? null,
    openingDate: opening?.date ?? null,
    publicationDate: publication?.date ?? null,
    estimatedValueInr: estimated?.amount ?? null,
    emdInr: emd?.amount ?? null,
    tenderFeeInr: fee?.amount ?? null,
    turnoverRequirementInr: turnover?.amount ?? null,
    experienceRequirementYears: experienceYears,
    companyAgeRequirementYears: companyAge,
    certifications,
    msmePreference: /msme/.test(lower) && /preference|exemption|relax/.test(lower) ? true : null,
    startupPreference: /startup/.test(lower) && /preference|exemption|relax/.test(lower) ? true : null,
    status,
    topics: TOPICS.filter((topic) => lower.includes(topic)),
    requirements,
  };
}

export function topicsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return uniqueStrings(TOPICS.filter((topic) => lower.includes(topic)));
}
