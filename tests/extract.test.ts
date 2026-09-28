import { describe, expect, it } from "vitest";
import { istDateKey } from "@/lib/tender/dates";
import { extractFacts, extractReference } from "@/lib/tender/extract";

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

  it("reads a GeM bid number, an NIT reference, and broken Bid Number spacing", () => {
    expect(extractReference("GeM Bid GEM/2026/B/412233")).toBe("GEM/2026/B/412233");
    expect(extractReference("NIT No. TN/CV/2026/014")).toBe("TN/CV/2026/014");
    expect(extractReference("Bid   Number : 2026/TN/CV/0142")).toBe("2026/TN/CV/0142");
    expect(extractReference("बोली संख्या : GEM/2026/B/555111")).toBe("GEM/2026/B/555111");
  });

  it("reads a closing date, EMD, and buyer from government formatting", () => {
    const facts = extractFacts({
      text: "Buyer: Tamil Nadu e-Governance Agency. Earnest Money Deposit of Rs. 25,000. Bid submission end date: 15/12/2026. Department: Information Technology.",
      authority: "A",
      fromPage: true,
      sourceUrl: "https://tenders.tn.gov.in/notice",
    });
    expect(facts.buyer).toBe("Tamil Nadu e-Governance Agency");
    expect(facts.department).toBe("Information Technology");
    expect(facts.emdInr).toBe(25000);
    expect(facts.closingDate ? istDateKey(facts.closingDate) : null).toBe("2026-12-15");
  });

  it("reads a place of supply, a scope line, and a registration", () => {
    const facts = extractFacts({
      text: "Place of supply: Chennai. Scope of work: computer vision cameras for city junctions. GST registration is mandatory.",
      authority: "A",
      fromPage: true,
      sourceUrl: "https://tenders.tn.gov.in/notice",
    });
    expect(facts.location).toBe("Chennai");
    expect(facts.scope).toMatch(/computer vision cameras/);
    expect(facts.requirements.some((item) => item.type === "registration:GST" && item.mandatoryStatus === "mandatory")).toBe(true);
  });
});
