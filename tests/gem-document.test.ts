import { describe, expect, it } from "vitest";
import { EXAMPLE_COMPANY } from "@/lib/company/defaults";
import { evaluateReadiness } from "@/lib/readiness/evaluate";
import { isVerifiedClosedTender } from "@/lib/tender/active";
import { classifySearchHit } from "@/lib/tender/candidate-gate";
import { istDateKey } from "@/lib/tender/dates";
import { verifiedDisplayTitle } from "@/lib/tender/display-title";
import { clusterEvidenceText } from "@/lib/tender/evidence-text";
import { extractFacts } from "@/lib/tender/extract";
import { gemDocumentHref, isVerifiedFetch, verificationLabel } from "@/lib/tender/fetch-source";
import { extractPdfText } from "@/lib/tender/pdf-text";

const GEM_TEXT = `[[page:1]]
GeM-Bidding-8779546.pdf
Bid Number: GEM/2025/B/7058481
Bid End Date/Time: 29-01-2026 11:00:00
Bid Opening Date/Time: 29-01-2026 11:30:00
Ministry/State Name: Ministry Of Housing & Urban Affairs
Organisation Name: Chennai Metro Rail Ltd
Office Name: CMRL Headquarters
Total Quantity: 4085
Item Category: Flowmeters and plumbing fixtures
Estimated Bid Value: ₹31,98,973
EMD Amount: ₹31,990
Minimum Average Annual Turnover of the bidder (For 3 Years): ₹9 Lakh
Years of Past Experience required for same/similar service: 3 Year (s)
MSE Purchase Preference: Yes
`;

const NOW = new Date("2026-09-28T10:00:00+05:30");

function factsFrom(text: string) {
  return extractFacts({
    text,
    authority: "A",
    fromPage: true,
    sourceUrl: "https://bidplus.gem.gov.in/showbidDocument/8779546",
  });
}

describe("GeM bid document extraction", () => {
  it("reads the verified bid fields and ignores the document id", () => {
    const facts = factsFrom(GEM_TEXT);
    expect(facts.tenderReference).toBe("GEM/2025/B/7058481");
    expect(facts.tenderReference).not.toBe("8779546");
    expect(facts.closingDate ? istDateKey(facts.closingDate) : null).toBe("2026-01-29");
    expect(facts.openingDate ? istDateKey(facts.openingDate) : null).toBe("2026-01-29");
    expect(facts.buyer).toBe("Chennai Metro Rail Ltd");
    expect(facts.organisation).toBe("Chennai Metro Rail Ltd");
    expect(facts.department).toBe("Ministry Of Housing & Urban Affairs");
    expect(facts.office).toBe("CMRL Headquarters");
    expect(facts.quantity).toBe(4085);
    expect(facts.estimatedValueInr).toBe(3198973);
    expect(facts.emdInr).toBe(31990);
    expect(facts.turnoverRequirementInr).toBe(900000);
    expect(facts.experienceRequirementYears).toBe(3);
    expect(facts.msmePreference).toBe(true);
    expect(facts.scope).toMatch(/flowmeters and plumbing fixtures/i);
    const deadline = facts.requirements.find((item) => item.type === "deadline");
    expect(deadline?.page).toBe(1);
    expect(deadline?.evidenceText).toMatch(/Bid End Date/i);
    expect(deadline?.evidenceStatus).toBe("VERIFIED");
  });

  it("replaces a generic GeM title with scope and buyer", () => {
    const facts = factsFrom(GEM_TEXT);
    expect(verifiedDisplayTitle("/ Bid Document - GeM Portal", facts)).toBe("Flowmeters and plumbing fixtures — Chennai Metro Rail Ltd");
  });

  it("keeps a 2025 GeM bid document as a candidate so the PDF can be read", () => {
    const decision = classifySearchHit({
      engine: "google",
      title: "/ Bid Document - GeM Portal",
      url: "https://bidplus.gem.gov.in/showbidDocument/8779546",
      domain: "bidplus.gem.gov.in",
      snippet: "GEM/2025/B/7058481",
      now: NOW,
    });
    expect(decision.hitClass).toBe("TenderCandidate");
    expect(decision.confidence).toBe("HIGH");
  });
});

describe("verified GeM readiness", () => {
  it("skips a verified expired plumbing bid", () => {
    const facts = factsFrom(GEM_TEXT);
    const evaluation = evaluateReadiness({
      company: EXAMPLE_COMPANY,
      title: verifiedDisplayTitle("/ Bid Document - GeM Portal", facts),
      evidenceText: GEM_TEXT,
      state: facts.state,
      closingDate: facts.closingDate,
      estimatedValueInr: facts.estimatedValueInr,
      primaryAuthority: "A",
      primarySourceUrl: "https://bidplus.gem.gov.in/showbidDocument/8779546",
      requirements: facts.requirements,
      fromPage: true,
      procurementIdentity: true,
      now: NOW,
    });
    expect(evaluation.verdict).toBe("SKIP");
    expect(evaluation.blockers.some((item) => /passed/i.test(item))).toBe(true);
  });

  it("skips an open bid whose verified scope is outside the company", () => {
    const facts = factsFrom(GEM_TEXT.replaceAll("29-01-2026", "20-12-2026"));
    const evaluation = evaluateReadiness({
      company: EXAMPLE_COMPANY,
      title: verifiedDisplayTitle("/ Bid Document - GeM Portal", facts),
      evidenceText: facts.scope ?? "",
      state: null,
      closingDate: facts.closingDate,
      estimatedValueInr: facts.estimatedValueInr,
      primaryAuthority: "A",
      primarySourceUrl: "https://bidplus.gem.gov.in/showbidDocument/8779546",
      requirements: [],
      fromPage: true,
      procurementIdentity: true,
      now: NOW,
    });
    expect(evaluation.verdict).toBe("SKIP");
    expect(evaluation.blockers).toHaveLength(0);
  });

  it("does not use the search snippet once verified document text exists", () => {
    const evidence = clusterEvidenceText([
      {
        title: "/ Bid Document - GeM Portal",
        snippet: "Artificial Intelligence computer vision platform for Tamil Nadu",
        pageText: GEM_TEXT,
        fromPage: true,
      },
    ]);
    expect(evidence.verified).toBe(true);
    expect(evidence.text).not.toMatch(/artificial intelligence/i);
    const facts = factsFrom(evidence.text);
    const evaluation = evaluateReadiness({
      company: EXAMPLE_COMPANY,
      title: verifiedDisplayTitle("/ Bid Document - GeM Portal", facts),
      evidenceText: evidence.text,
      state: facts.state,
      closingDate: new Date("2026-12-20T00:00:00+05:30"),
      estimatedValueInr: facts.estimatedValueInr,
      primaryAuthority: "A",
      primarySourceUrl: "https://bidplus.gem.gov.in/showbidDocument/8779546",
      requirements: facts.requirements.filter((item) => item.type !== "deadline"),
      fromPage: true,
      procurementIdentity: true,
      now: NOW,
    });
    expect(evaluation.verdict).toBe("SKIP");
  });
});

describe("source verification and active discovery", () => {
  it("names verified, discovered, and unverified sources", () => {
    expect(isVerifiedFetch("VERIFIED_SOURCE")).toBe(true);
    expect(isVerifiedFetch("verified_text")).toBe(true);
    expect(verificationLabel("VERIFIED_SOURCE")).toBe("VERIFIED");
    expect(verificationLabel("DISCOVERED_OFFICIAL")).toBe("DISCOVERED OFFICIAL");
    expect(verificationLabel("UNVERIFIED")).toBe("SOURCE NOT VERIFIED");
  });

  it("hides a verified past tender from active discovery and keeps an unverified date visible", () => {
    expect(isVerifiedClosedTender({ status: "Closed", closingDate: new Date("2026-12-20T00:00:00+05:30"), verified: true, now: NOW })).toBe(true);
    expect(isVerifiedClosedTender({ status: null, closingDate: new Date("2026-01-29T00:00:00+05:30"), verified: true, now: NOW })).toBe(true);
    expect(isVerifiedClosedTender({ status: null, closingDate: new Date("2026-01-29T00:00:00+05:30"), verified: false, now: NOW })).toBe(false);
    expect(isVerifiedClosedTender({ status: null, closingDate: new Date("2026-12-20T00:00:00+05:30"), verified: true, now: NOW })).toBe(false);
  });
});

describe("PDF text", () => {
  it("follows a GeM bid document link out of a listing page", () => {
    const href = gemDocumentHref(
      `<a href="/showbidDocument/8779546">बड संख्या/Bid Number</a>`,
      "https://bidplus.gem.gov.in/all-bids",
    );
    expect(href).toBe("https://bidplus.gem.gov.in/showbidDocument/8779546");
  });

  it("reads a bid number from a PDF", async () => {
    const extracted = await extractPdfText(minimalPdf("Bid Number: GEM/2025/B/7058481 Estimated Bid Value 3198973"));
    expect(extracted?.text).toMatch(/GEM\/2025\/B\/7058481/);
    expect(extracted?.text).toMatch(/\[\[page:1\]\]/);
  });
});

function minimalPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) body += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}
