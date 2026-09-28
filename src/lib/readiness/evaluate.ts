import type { CompanyDna } from "@/lib/company/types";
import { formatDateIst, formatInr } from "@/lib/format";
import type { AuthorityTier } from "@/lib/tender/authority";
import { daysUntil, isPastDeadline } from "@/lib/tender/dates";
import type { EvidenceStatus, RequirementDraft } from "@/lib/tender/extract";
import {
  certificationBlocks,
  companyAgeBlocks,
  companyHasCertification,
  deadlineBlocks,
  emdBlocks,
  experienceBlocks,
  turnoverBlocks,
} from "@/lib/readiness/rules";

export type Verdict = "BID" | "REVIEW" | "SKIP";
export type RowStatus = "PASS" | "BLOCKER" | "CONCERN" | "UNKNOWN";

export type ComparisonRow = {
  key: string;
  requirement: string;
  tender: string;
  company: string;
  status: RowStatus;
  evidenceStatus: EvidenceStatus;
  evidenceText: string | null;
  sourceUrl: string | null;
  authority: string | null;
  mandatory: boolean;
};

export type MatchReason = {
  label: string;
  strength: "Strong" | "Relevant" | "Preferred region" | "Outside preference" | "Unknown";
};

export type Evaluation = {
  verdict: Verdict;
  summary: string;
  reasons: string[];
  blockers: string[];
  concerns: string[];
  rows: ComparisonRow[];
  matches: MatchReason[];
};

function requirementOf(requirements: RequirementDraft[], type: string): RequirementDraft | undefined {
  return requirements.find((item) => item.type === type);
}

function verified(requirement: RequirementDraft | undefined): boolean {
  return requirement?.evidenceStatus === "VERIFIED";
}

function mandatory(requirement: RequirementDraft | undefined): boolean {
  return !requirement || requirement.mandatoryStatus === "mandatory";
}

export function evaluateReadiness(input: {
  company: CompanyDna;
  title: string;
  evidenceText: string;
  state: string | null;
  closingDate: Date | null;
  estimatedValueInr: number | null;
  primaryAuthority: AuthorityTier;
  primarySourceUrl: string | null;
  requirements: RequirementDraft[];
  fromPage?: boolean;
  now?: Date;
}): Evaluation {
  const now = input.now ?? new Date();
  const rows: ComparisonRow[] = [];
  const blockers: string[] = [];
  const concerns: string[] = [];
  const reasons: string[] = [];
  const title = input.title.toLowerCase();
  const text = `${input.title}\n${input.evidenceText}`.toLowerCase();
  const phrases = [...input.company.capabilities, ...input.company.technologies, ...input.company.pastProjectCategories]
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);

  const matches: MatchReason[] = [];
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase();
    if (title.includes(needle)) matches.push({ label: phrase, strength: "Strong" });
    else if (text.includes(needle)) matches.push({ label: phrase, strength: "Relevant" });
  }
  const uniqueMatches = matches.filter((item, index) => matches.findIndex((other) => other.label.toLowerCase() === item.label.toLowerCase()) === index);
  const strong = uniqueMatches.some((item) => item.strength === "Strong") || uniqueMatches.length >= 2;
  const relevant = uniqueMatches.length > 0;
  const capabilityStatus: RowStatus = strong || relevant ? "PASS" : "CONCERN";
  const capabilityEvidence: EvidenceStatus =
    input.primaryAuthority === "A" && input.fromPage && relevant
      ? "VERIFIED"
      : (input.primaryAuthority === "A" || input.primaryAuthority === "B") && relevant
        ? "SUPPORTED"
        : relevant
          ? "UNVERIFIED"
          : "UNKNOWN";

  rows.push({
    key: "capability",
    requirement: "Capability",
    tender: uniqueMatches.slice(0, 3).map((item) => item.label).join(", ") || "Not available",
    company: input.company.capabilities.slice(0, 3).join(", "),
    status: relevant ? capabilityStatus : "CONCERN",
    evidenceStatus: capabilityEvidence,
    evidenceText: input.evidenceText.slice(0, 280) || null,
    sourceUrl: input.primarySourceUrl,
    authority: input.primaryAuthority,
    mandatory: false,
  });

  if (input.state && input.company.preferredStates.some((state) => state.toLowerCase() === input.state?.toLowerCase())) {
    uniqueMatches.push({ label: input.state, strength: "Preferred region" });
    rows.push({
      key: "geography",
      requirement: "Geography",
      tender: input.state,
      company: input.company.preferredStates.join(", ") || "Not available",
      status: "PASS",
      evidenceStatus: input.primaryAuthority === "A" ? "SUPPORTED" : "UNVERIFIED",
      evidenceText: input.state,
      sourceUrl: input.primarySourceUrl,
      authority: input.primaryAuthority,
      mandatory: false,
    });
  } else if (input.state) {
    uniqueMatches.push({ label: input.state, strength: "Outside preference" });
    concerns.push(`${input.state} is outside the preferred states.`);
    rows.push({
      key: "geography",
      requirement: "Geography",
      tender: input.state,
      company: input.company.preferredStates.join(", ") || "Not available",
      status: "CONCERN",
      evidenceStatus: "UNVERIFIED",
      evidenceText: input.state,
      sourceUrl: input.primarySourceUrl,
      authority: input.primaryAuthority,
      mandatory: false,
    });
  } else {
    uniqueMatches.push({ label: "Geography", strength: "Unknown" });
    rows.push({
      key: "geography",
      requirement: "Geography",
      tender: "Not available",
      company: input.company.preferredStates.join(", ") || "Not available",
      status: "UNKNOWN",
      evidenceStatus: "UNKNOWN",
      evidenceText: null,
      sourceUrl: input.primarySourceUrl,
      authority: input.primaryAuthority,
      mandatory: false,
    });
  }

  uniqueMatches.push({
    label: "Contract size",
    strength: input.estimatedValueInr == null ? "Unknown" : "Relevant",
  });

  const deadline = requirementOf(input.requirements, "deadline");
  if (input.closingDate) {
    const past = isPastDeadline(input.closingDate, now);
    const isVerified = verified(deadline);
    if (deadlineBlocks(past, isVerified)) {
      blockers.push(`Closing date ${formatDateIst(input.closingDate)} has passed.`);
      rows.push(row("deadline", "Closing date", formatDateIst(input.closingDate), "Today", "BLOCKER", deadline));
    } else if (past) {
      concerns.push("A closing date appears to have passed, but it is not verified.");
      rows.push(row("deadline", "Closing date", formatDateIst(input.closingDate), "Today", "CONCERN", deadline));
    } else if (daysUntil(input.closingDate, now) <= 7) {
      concerns.push("Limited preparation time before the closing date.");
      rows.push(row("deadline", "Closing date", formatDateIst(input.closingDate), "Open", "CONCERN", deadline));
    } else {
      rows.push(row("deadline", "Closing date", formatDateIst(input.closingDate), "Open", "PASS", deadline));
    }
  } else {
    concerns.push("Closing date is not available.");
    rows.push({
      key: "deadline",
      requirement: "Closing date",
      tender: "Not available",
      company: "—",
      status: "UNKNOWN",
      evidenceStatus: "UNKNOWN",
      evidenceText: null,
      sourceUrl: input.primarySourceUrl,
      authority: input.primaryAuthority,
      mandatory: true,
    });
  }

  const turnover = requirementOf(input.requirements, "turnover");
  if (turnover?.numericValue != null) {
    const blocked = turnoverBlocks(turnover.numericValue, input.company.annualTurnoverInr, verified(turnover), mandatory(turnover));
    const passes = input.company.annualTurnoverInr >= turnover.numericValue;
    if (blocked) blockers.push(`Minimum turnover ${formatInr(turnover.numericValue)} is above company turnover ${formatInr(input.company.annualTurnoverInr)}.`);
    else if (!passes) concerns.push("Turnover may be below the stated figure, but the requirement is not verified.");
    rows.push(row("turnover", "Turnover", `≥ ${formatInr(turnover.numericValue)}`, formatInr(input.company.annualTurnoverInr), blocked ? "BLOCKER" : passes ? "PASS" : "CONCERN", turnover));
  } else {
    rows.push(unknownRow("turnover", "Turnover", formatInr(input.company.annualTurnoverInr)));
  }

  const age = requirementOf(input.requirements, "company_age");
  if (age?.numericValue != null) {
    const blocked = companyAgeBlocks(age.numericValue, input.company.companyAgeYears, verified(age), mandatory(age));
    const passes = input.company.companyAgeYears >= age.numericValue;
    if (blocked) blockers.push(`Minimum company age of ${age.numericValue} years is not met.`);
    else if (!passes) concerns.push("Company age may be below the stated figure, but it is not verified.");
    rows.push(row("company_age", "Company age", `≥ ${age.numericValue} years`, `${input.company.companyAgeYears} years`, blocked ? "BLOCKER" : passes ? "PASS" : "CONCERN", age));
  } else {
    rows.push(unknownRow("company_age", "Company age", `${input.company.companyAgeYears} years`));
  }

  const experience = requirementOf(input.requirements, "experience");
  if (experience?.numericValue != null) {
    const blocked = experienceBlocks(experience.numericValue, input.company.companyAgeYears, verified(experience), mandatory(experience));
    if (blocked) blockers.push(`Required experience of ${experience.numericValue} years exceeds the company age of ${input.company.companyAgeYears} years.`);
    else concerns.push("Relevant prior experience is not independently verified.");
    rows.push(row("experience", "Experience", `${experience.numericValue} years`, `${input.company.companyAgeYears} years old`, blocked ? "BLOCKER" : "CONCERN", experience));
  }

  for (const requirement of input.requirements.filter((item) => item.type.startsWith("certification:"))) {
    const has = companyHasCertification(input.company.certifications, requirement.label);
    const blocked = certificationBlocks(has, verified(requirement), mandatory(requirement));
    if (blocked) blockers.push(`${requirement.label} is required and missing.`);
    else if (!has && mandatory(requirement)) concerns.push(`${requirement.label} appears required, but the evidence is not verified.`);
    rows.push(row(requirement.type, requirement.label, requirement.value ?? "Required", has ? "Available" : "Missing", blocked ? "BLOCKER" : has ? "PASS" : "CONCERN", requirement));
  }

  const emd = requirementOf(input.requirements, "emd");
  if (emd?.numericValue != null) {
    const blocked = emdBlocks(emd.numericValue, input.company.maximumEmd, verified(emd));
    const within = input.company.maximumEmd == null || emd.numericValue <= input.company.maximumEmd;
    if (blocked) blockers.push(`EMD ${formatInr(emd.numericValue)} exceeds the company limit ${formatInr(input.company.maximumEmd)}.`);
    else if (!within) concerns.push("EMD may exceed the company limit, but the amount is not verified.");
    rows.push(row("emd", "EMD", formatInr(emd.numericValue), input.company.maximumEmd == null ? "No limit set" : `Limit ${formatInr(input.company.maximumEmd)}`, blocked ? "BLOCKER" : within ? "PASS" : "CONCERN", emd));
  } else {
    rows.push(unknownRow("emd", "EMD", input.company.maximumEmd == null ? "No limit set" : `Limit ${formatInr(input.company.maximumEmd)}`));
  }

  const excluded = input.company.excludedCategories.find((category) => text.includes(category.toLowerCase()));
  if (excluded) blockers.push(`Excluded category mentioned: ${excluded}.`);

  const official = input.primaryAuthority === "A" || input.primaryAuthority === "B";
  const materialConcerns = concerns.filter((item) => !item.startsWith("Limited preparation"));
  let verdict: Verdict;
  if (blockers.length > 0 || !relevant) {
    verdict = "SKIP";
    if (!relevant && blockers.length === 0) reasons.push("The notice does not match the company capabilities.");
  } else if (strong && official && materialConcerns.length === 0 && (capabilityEvidence === "VERIFIED" || capabilityEvidence === "SUPPORTED")) {
    verdict = "BID";
    reasons.push("Capabilities match and no verified hard blocker is on file.");
  } else {
    verdict = "REVIEW";
    reasons.push("The opportunity may be relevant, but evidence is incomplete or a concern needs review.");
  }
  reasons.push(...blockers, ...concerns);

  const summary =
    verdict === "SKIP" && blockers.length > 0
      ? `SKIP — ${blockers.length} verified blocker${blockers.length === 1 ? "" : "s"}`
      : verdict === "SKIP"
        ? "SKIP — does not match the company"
        : verdict === "BID"
          ? "BID — no verified hard blocker"
          : `REVIEW — ${materialConcerns.length || concerns.length} open concern${(materialConcerns.length || concerns.length) === 1 ? "" : "s"}`;

  return { verdict, summary, reasons, blockers, concerns, rows, matches: uniqueMatches };
}

function row(
  key: string,
  requirement: string,
  tender: string,
  company: string,
  status: RowStatus,
  source: RequirementDraft | undefined,
): ComparisonRow {
  return {
    key,
    requirement,
    tender,
    company,
    status,
    evidenceStatus: source?.evidenceStatus ?? "UNKNOWN",
    evidenceText: source?.evidenceText ?? null,
    sourceUrl: source?.sourceUrl ?? null,
    authority: source?.sourceAuthority ?? null,
    mandatory: source?.mandatoryStatus === "mandatory",
  };
}

function unknownRow(key: string, requirement: string, company: string): ComparisonRow {
  return {
    key,
    requirement,
    tender: "Not available",
    company,
    status: "UNKNOWN",
    evidenceStatus: "UNKNOWN",
    evidenceText: null,
    sourceUrl: null,
    authority: null,
    mandatory: false,
  };
}
