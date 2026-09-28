import { describe, expect, it } from "vitest";
import { extractFacts } from "@/lib/tender/extract";

describe("fact extraction", () => {
  it("reads a buyer and reference written in sentence case", () => {
    const facts = extractFacts({
      text: "DEMO FIXTURE. Issued by Demo Civic Systems Department. NIT No. DEMO-TN-2026-014.",
      authority: "A",
      fromPage: true,
      sourceUrl: "https://demo.tenderwatch.invalid/notices/vision-tn",
    });
    expect(facts.buyer).toBe("Demo Civic Systems Department");
    expect(facts.tenderReference).toBe("DEMO-TN-2026-014");
  });
});
