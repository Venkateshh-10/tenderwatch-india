import { describe, expect, it } from "vitest";
import { opportunityRank } from "@/lib/tender/rank";

describe("opportunity rank", () => {
  it("keeps a thin unverified GeM card below a verified tender", () => {
    const thin = opportunityRank({
      confidence: "HIGH",
      portalScore: 0,
      hasReference: false,
      verified: false,
      completeness: 0,
      fit: 0,
      futureClosing: false,
      position: 1,
    });
    const verified = opportunityRank({
      confidence: "MEDIUM",
      portalScore: 3,
      hasReference: true,
      verified: true,
      completeness: 4,
      fit: 2,
      futureClosing: true,
      position: 5,
    });
    expect(verified).toBeGreaterThan(thin);
  });
});
