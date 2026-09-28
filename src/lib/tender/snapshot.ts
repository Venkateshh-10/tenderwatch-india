import { createHash } from "node:crypto";
import { formatDateIst, formatInr } from "@/lib/format";

export type SnapshotSource = {
  url: string;
  domain: string;
  authority: string;
};

export type SnapshotPayload = {
  title: string;
  tenderReference: string | null;
  buyer: string | null;
  closingDate: string | null;
  estimatedValueInr: number | null;
  emdInr: number | null;
  turnoverRequirementInr: number | null;
  experienceRequirementYears: number | null;
  certificationsRequired: string[];
  status: string | null;
  primarySourceUrl: string;
  state: string | null;
  sources: SnapshotSource[];
  evidenceText: string;
};

export type ObservedChange = {
  changeType: string;
  summary: string;
  beforeValue: string | null;
  afterValue: string | null;
  evidence: string | null;
};

function dateLabel(value: string | null): string | null {
  if (!value) return null;
  return formatDateIst(new Date(`${value}T00:00:00+05:30`));
}

function moneyLabel(value: number | null): string | null {
  if (value == null) return null;
  return formatInr(value);
}

function changedText(before: string | null, after: string | null): boolean {
  return (before ?? "") !== (after ?? "") && (before != null || after != null);
}

export function payloadHash(payload: SnapshotPayload): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function diffPayloads(previous: SnapshotPayload, next: SnapshotPayload): ObservedChange[] {
  const changes: ObservedChange[] = [];
  const evidence = next.primarySourceUrl;

  const closingBefore = dateLabel(previous.closingDate);
  const closingAfter = dateLabel(next.closingDate);
  if (changedText(closingBefore, closingAfter)) {
    changes.push({
      changeType: "deadline_change",
      summary: "Closing date",
      beforeValue: closingBefore,
      afterValue: closingAfter,
      evidence,
    });
  }

  pushMoney(changes, "emd_change", "EMD", previous.emdInr, next.emdInr, evidence);
  pushMoney(changes, "estimated_value_change", "Estimated value", previous.estimatedValueInr, next.estimatedValueInr, evidence);
  pushMoney(changes, "turnover_requirement_change", "Turnover requirement", previous.turnoverRequirementInr, next.turnoverRequirementInr, evidence);

  if (previous.experienceRequirementYears !== next.experienceRequirementYears) {
    changes.push({
      changeType: "experience_requirement_change",
      summary: "Experience requirement",
      beforeValue: previous.experienceRequirementYears == null ? null : `${previous.experienceRequirementYears} years`,
      afterValue: next.experienceRequirementYears == null ? null : `${next.experienceRequirementYears} years`,
      evidence,
    });
  }

  const beforeCerts = [...previous.certificationsRequired].sort().join(", ");
  const afterCerts = [...next.certificationsRequired].sort().join(", ");
  if (beforeCerts !== afterCerts) {
    changes.push({
      changeType: "certification_change",
      summary: "Certifications",
      beforeValue: beforeCerts || null,
      afterValue: afterCerts || null,
      evidence,
    });
  }

  if ((previous.status ?? "") !== (next.status ?? "") && (previous.status || next.status)) {
    changes.push({
      changeType: "status_change",
      summary: "Status",
      beforeValue: previous.status,
      afterValue: next.status,
      evidence,
    });
  }

  const previousUrls = new Set(previous.sources.map((source) => source.url));
  for (const source of next.sources) {
    if ((source.authority === "A" || source.authority === "B") && !previousUrls.has(source.url)) {
      changes.push({
        changeType: "new_official_source",
        summary: "New official source",
        beforeValue: null,
        afterValue: source.domain,
        evidence: source.url,
      });
    }
  }

  for (const word of ["corrigendum", "amendment", "extension", "cancellation"] as const) {
    const before = previous.evidenceText.toLowerCase().includes(word);
    const after = next.evidenceText.toLowerCase().includes(word);
    if (!before && after) {
      changes.push({
        changeType: word,
        summary: `${word[0].toUpperCase()}${word.slice(1)} discovered`,
        beforeValue: null,
        afterValue: word,
        evidence,
      });
    }
  }

  return changes;
}

function pushMoney(
  changes: ObservedChange[],
  changeType: string,
  summary: string,
  before: number | null,
  after: number | null,
  evidence: string,
) {
  if (before === after) return;
  changes.push({
    changeType,
    summary,
    beforeValue: moneyLabel(before),
    afterValue: moneyLabel(after),
    evidence,
  });
}
