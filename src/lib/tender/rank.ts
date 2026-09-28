import type { TenderConfidence } from "@/lib/tender/candidate-gate";

export function opportunityRank(input: {
  confidence: TenderConfidence;
  portalScore: number;
  hasReference: boolean;
  verified: boolean;
  completeness: number;
  fit: number;
  futureClosing: boolean;
  position: number;
}): number {
  const confidence = input.confidence === "HIGH" ? 5 : input.confidence === "MEDIUM" ? 2 : 0;
  const portal = Math.max(0, 6 - input.portalScore);
  const verified = input.verified ? 20 : 0;
  const position = Math.max(0, 8 - input.position);
  return (
    verified * 1_000_000 +
    confidence * 1_000_000 +
    portal * 100_000 +
    (input.hasReference ? 4 : 0) * 10_000 +
    input.completeness * 100 +
    input.fit * 10 +
    (input.futureClosing ? 2 : 0) * 5 +
    position
  );
}
