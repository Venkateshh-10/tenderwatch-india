import { describe, expect, it } from "vitest";
import { diffPayloads, type SnapshotPayload } from "@/lib/tender/snapshot";

const base: SnapshotPayload = {
  title: "Vision notice",
  tenderReference: "DEMO-TN-2026-014",
  buyer: "Demo Civic Systems Department",
  closingDate: "2026-10-03",
  estimatedValueInr: 8_000_000,
  emdInr: 200_000,
  turnoverRequirementInr: null,
  experienceRequirementYears: null,
  certificationsRequired: ["ISO 9001"],
  status: null,
  primarySourceUrl: "https://demo.tenderwatch.invalid/notices/vision-tn",
  state: "Tamil Nadu",
  sources: [{ url: "https://demo.tenderwatch.invalid/notices/vision-tn", domain: "demo.tenderwatch.invalid", authority: "A" }],
  evidenceText: "Computer vision notice. Last date 3 Oct 2026.",
};

describe("snapshot diff", () => {
  it("reports no change when the payload is the same", () => {
    expect(diffPayloads(base, { ...base })).toEqual([]);
  });

  it("reports an observed deadline change and a new corrigendum", () => {
    const next: SnapshotPayload = {
      ...base,
      closingDate: "2026-10-08",
      evidenceText: "Corrigendum. Closing date 8 Oct 2026.",
    };
    const changes = diffPayloads(base, next);
    expect(changes.map((change) => change.changeType)).toEqual(["deadline_change", "corrigendum"]);
    expect(changes[0].beforeValue).toContain("3 Oct");
    expect(changes[0].afterValue).toContain("8 Oct");
  });

  it("does not invent a corrigendum when both texts already mention it", () => {
    const previous = { ...base, evidenceText: "Corrigendum already recorded." };
    const next = { ...previous, title: "Vision notice" };
    expect(diffPayloads(previous, next).some((change) => change.changeType === "corrigendum")).toBe(false);
  });
});
