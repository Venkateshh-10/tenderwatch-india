import type { AuthorityTier } from "@/lib/tender/authority";
import { firstLabeledDate } from "@/lib/tender/dates";
import { parseInrAmount } from "@/lib/tender/money";
import { normalizeRef, normalizeWhitespace, uniqueStrings, windowAround } from "@/lib/tender/text";

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

const REGISTRATIONS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "GST",
    pattern: /\bgst(?:in)?\b[^.\n]{0,40}\b(?:registration|registered)\b|\b(?:registration|registered)\b[^.\n]{0,40}\bgst(?:in)?\b/i,
  },
  {
    label: "GeM",
    pattern: /\bregistered\s+(?:on|with|at)\s+gem\b|\bgem\s+registration\b/i,
  },
  {
    label: "Udyam/MSME",
    pattern: /\b(?:udyam|msme)\b[^.\n]{0,40}\b(?:registration|registered)\b|\b(?:registration|registered)\b[^.\n]{0,40}\b(?:udyam|msme)\b/i,
  },
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

export function normalizeExtractionText(value: string): string {
  return normalizeWhitespace(
    value
      .normalize("NFKC")
      .replace(/[\u00a0\u1680\u2000-\u200d\u202f\u205f\u3000\ufeff]/g, " "),
  );
}

function cleanToken(token: string): string | null {
  const trimmed = token.replace(/[.,;:]+$/, "").replace(/\s+/g, "").toUpperCase();
  if (!/\d/.test(trimmed) || normalizeRef(trimmed).length < 5) return null;
  if (/^(?:19|20)\d{2}$/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return null;
  return trimmed;
}

export function extractReference(text: string): string | null {
  const flat = normalizeExtractionText(text);
  const gem = flat.match(/\bGEM\s*\/\s*\d{4}\s*\/\s*[A-Z]\s*\/\s*\d{3,}\b/i);
  if (gem) return gem[0].replace(/\s+/g, "").toUpperCase();
  const labeled = flat.match(
    /(?:bid\s*numbers?|tender\s*(?:id|no\.?|number|reference)|nit\s*(?:no\.?|number)?|rfp\s*(?:no\.?|number)?|eoi\s*(?:no\.?|number)?|बोली\s*संख्या|निविदा\s*संख्या)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-.\s]{4,48})/i,
  );
  if (labeled) {
    const token = cleanToken(labeled[1].split(/\s{2,}|\s+(?:for|dated|of|the)\b/i)[0] ?? labeled[1]);
    if (token) return token;
  }
  const cppp = flat.match(/\b\d{4}_[A-Z0-9]+_\d{4,}(?:_\d+)?\b/i);
  if (cppp) return cppp[0].toUpperCase();
  const slash = flat.match(/\b[A-Z0-9]{2,}(?:\/[A-Z0-9]{2,}){2,}\b/);
  if (slash) {
    const token = cleanToken(slash[0]);
    if (token) return token;
  }
  const dashed = flat.match(/\b[A-Z]{2,}(?:-[A-Z0-9]{2,}){2,}\b/i);
  if (dashed) return cleanToken(dashed[0]);
  return null;
}

function partyAfter(text: string, label: RegExp): string | null {
  const match = label.exec(text);
  if (!match || match.index == null) return null;
  const raw = match[1]?.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+(invites|has invited|for the|under the)$/i, "").trim();
  if (cleaned.length < 4 || cleaned.length > 120) return null;
  if (!/[A-Za-z]/.test(cleaned)) return null;
  return cleaned;
}

export function extractState(text: string): string | null {
  const hits = STATES.filter((state) => new RegExp(`\\b${state}\\b`, "i").test(text));
  if (hits.length === 1) return hits[0];
  return null;
}

export type ExtractedTenderFacts = {
  tenderReference: string | null;
  bidNumber: string | null;
  buyer: string | null;
  organisation: string | null;
  department: string | null;
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
  registrations: string[];
  location: string | null;
  scope: string | null;
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
  const text = normalizeExtractionText(input.text);
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

  const emd = moneyNear(text, /(?:earnest money(?: deposit)?|\bemd\b|ईएमडी|बयाना\s*राशि)/i);
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
  const registrations: string[] = [];
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

  for (const registration of REGISTRATIONS) {
    const match = registration.pattern.exec(text);
    if (!match || match.index == null) continue;
    registrations.push(registration.label);
    push({
      type: `registration:${registration.label}`,
      label: registration.label,
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

  const location = partyAfter(
    text,
    /(?:place of (?:delivery|supply|work)|consignee location|work location)\s*[:\-]\s*([^.;|\n]{3,80})/i,
  );
  const scopeMatch = text.match(
    /(?:scope of work|brief description(?: of (?:the )?(?:work|goods|services))?|description of (?:the )?(?:work|goods|services)|nature of work)\s*[:\-]\s*(.{12,240}?)(?:\.|$)/i,
  );
  const scope = scopeMatch?.[1]?.trim() && /[A-Za-z]/.test(scopeMatch[1]) ? scopeMatch[1].trim() : null;

  const estimated = moneyNear(text, /(?:estimated (?:cost|value)|tender value|project cost)/i);
  const fee = moneyNear(text, /tender fee/i);
  const lower = text.toLowerCase();
  let status: string | null = null;
  if (/\bcancell?ed\b/.test(lower)) status = "Cancelled";
  else if (/\bawarded\b/.test(lower)) status = "Awarded";
  else if (/\bcorrigendum\b/.test(lower)) status = "Corrigendum noted";

  const buyer =
    partyAfter(text, /(?:name of (?:the )?(?:buyer|organisation|organization)|buyer(?: name)?|issued by|invited by)\s*[:\-]?\s*([^.;|\n]{4,120})/i) ??
    partyAfter(text, /(?:issued by|invited by)\s+([A-Za-z][^.;|\n]{4,90})/i);
  const organisation = partyAfter(text, /(?:organisation|organization)\s*[:\-]\s*([^.;|\n]{4,120})/i);
  const department = partyAfter(text, /(?:department|ministry)\s*[:\-]\s*([^.;|\n]{4,120})/i);
  const reference = extractReference(text);

  return {
    tenderReference: reference,
    bidNumber: reference,
    buyer,
    organisation,
    department,
    state: extractState(text),
    location,
    scope,
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
    registrations,
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
