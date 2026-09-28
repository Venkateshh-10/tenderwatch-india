import { describe, expect, it } from "vitest";
import { EXAMPLE_COMPANY } from "@/lib/company/defaults";
import { planDiscoveryQueries } from "@/lib/search/query-planner";
import { classifySearchHit } from "@/lib/tender/candidate-gate";

describe("tender candidate gate", () => {
  it("accepts an NIT on a state government domain", () => {
    const decision = classifySearchHit({
      engine: "google",
      title: "Notice Inviting Tender for computer vision cameras",
      url: "https://tenders.tn.gov.in/nicgep/app?component=view",
      domain: "tenders.tn.gov.in",
      snippet: "NIT No. 2026_TN_123456_1. Last date for bid submission.",
    });
    expect(decision.hitClass).toBe("TenderCandidate");
    expect(decision.confidence).toBe("HIGH");
  });

  it("accepts an RFP on nic.in and a bid on eprocure and GeM", () => {
    expect(
      classifySearchHit({
        engine: "google",
        title: "Request for Proposal — analytics platform",
        url: "https://www.meity.gov.in/writereaddata/files/rfp-analytics.pdf",
        domain: "meity.gov.in",
        snippet: "Request for Proposal issued for a government analytics platform.",
      }).confidence,
    ).toBe("HIGH");

    const listing = classifySearchHit({
      engine: "google",
      title: "Bid listing",
      url: "https://eprocure.gov.in/eprocure/app",
      domain: "eprocure.gov.in",
      snippet: "Central public procurement portal bid.",
    });
    expect(listing.hitClass).toBe("TenderCandidate");
    expect(listing.confidence).toBe("LOW");

    const gem = classifySearchHit({
      engine: "google",
      title: "GeM Bid GEM/2026/B/412233",
      url: "https://gem.gov.in/view-bid/412233",
      domain: "gem.gov.in",
      snippet: "GeM bid for computer vision equipment.",
    });
    expect(gem.hitClass).toBe("TenderCandidate");
    expect(gem.confidence).toBe("HIGH");
  });

  it("keeps a secondary NIT as medium confidence", () => {
    const decision = classifySearchHit({
      engine: "google",
      title: "Notice Inviting Tender copied by an aggregator",
      url: "https://www.tenderdetail.com/indian-tenders/vision",
      domain: "tenderdetail.com",
      snippet: "Notice Inviting Tender for Tamil Nadu. Buyer: Chennai Corporation. Reference 2026_TN_123456_1.",
    });
    expect(decision.hitClass).toBe("TenderCandidate");
    expect(decision.confidence).toBe("MEDIUM");
  });

  it("rejects wikipedia, social, video, and market-research hosts", () => {
    const cases = [
      ["https://en.wikipedia.org/wiki/Request_for_proposal", "wikipedia.org", "Request for Proposal"],
      ["https://www.linkedin.com/posts/tender-notice", "linkedin.com", "Notice Inviting Tender"],
      ["https://www.instagram.com/p/tender", "instagram.com", "Tender notice"],
      ["https://www.youtube.com/watch?v=recipe", "youtube.com", "YouTube recipe for chicken"],
      ["https://www.grandviewresearch.com/industry-analysis/ai-market", "grandviewresearch.com", "AI market size and tender outlook"],
    ] as const;
    for (const [url, domain, title] of cases) {
      expect(classifySearchHit({ engine: "google", title, url, domain, snippet: title }).hitClass).toBe("RejectedResult");
    }
  });

  it("rejects general news, policy, and government pages without a tender signal", () => {
    expect(
      classifySearchHit({
        engine: "google",
        title: "Canada updates its national AI strategy",
        url: "https://www.example-news.com/canada-ai",
        domain: "example-news.com",
        snippet: "A policy article about artificial intelligence funding.",
      }).hitClass,
    ).toBe("RejectedResult");
    expect(
      classifySearchHit({
        engine: "google",
        title: "About the department",
        url: "https://www.tn.gov.in/about",
        domain: "tn.gov.in",
        snippet: "The department manages citizen services.",
      }).hitClass,
    ).toBe("RejectedResult");
  });

  it("rejects diplomatic, survey, and generic management pages", () => {
    expect(
      classifySearchHit({
        engine: "google",
        title: "Artificial Intelligence cooperation",
        url: "https://www.embassy.gov.in/ai",
        domain: "embassy.gov.in",
        snippet: "Artificial Intelligence",
      }).hitClass,
    ).toBe("RejectedResult");
    expect(
      classifySearchHit({
        engine: "google",
        title: "High Commission of India overview",
        url: "https://www.hci.gov.in/",
        domain: "hci.gov.in",
        snippet: "High Commission services.",
      }).hitClass,
    ).toBe("RejectedResult");
    expect(
      classifySearchHit({
        engine: "google",
        title: "Odisha Economic Survey 2018-19",
        url: "https://finance.odisha.gov.in/economic-survey",
        domain: "finance.odisha.gov.in",
        snippet: "Economic Survey of the state.",
      }).hitClass,
    ).toBe("RejectedResult");
    expect(
      classifySearchHit({
        engine: "google",
        title: "Tender Management",
        url: "https://www.tn.gov.in/tender-management",
        domain: "tn.gov.in",
        snippet: "Department tender management system.",
      }).hitClass,
    ).toBe("RejectedResult");
  });

  it("requires a procurement path and tender identity for HIGH", () => {
    const gem = classifySearchHit({
      engine: "google",
      title: "GeM bid document",
      url: "https://bidplus.gem.gov.in/showbidDocument/412233",
      domain: "bidplus.gem.gov.in",
      snippet: "Bid Document for computer vision equipment.",
    });
    expect(gem.hitClass).toBe("TenderCandidate");
    expect(gem.confidence).toBe("HIGH");

    const nit = classifySearchHit({
      engine: "google",
      title: "Notice Inviting Tender",
      url: "https://eprocure.gov.in/eprocure/app?component=view&id=1",
      domain: "eprocure.gov.in",
      snippet: "NIT for analytics software.",
    });
    expect(nit.hitClass).toBe("TenderCandidate");
    expect(nit.confidence).toBe("HIGH");
  });

  it("keeps a corrigendum as change evidence instead of an opportunity", () => {
    const decision = classifySearchHit({
      engine: "google",
      title: "Corrigendum to the bid document",
      url: "https://eprocure.gov.in/eprocure/app?component=corrigendum",
      domain: "eprocure.gov.in",
      snippet: "Bid Number GEM/2026/B/412233. Extension of closing date.",
    });
    expect(decision.hitClass).toBe("TenderChangeCandidate");
  });

  it("rejects a garbled HTML title", () => {
    expect(
      classifySearchHit({
        engine: "google",
        title: "<div>&&nbsp;&nbsp;</div>",
        url: "https://eprocure.gov.in/eprocure/app",
        domain: "eprocure.gov.in",
        snippet: "Notice Inviting Tender",
      }).hitClass,
    ).toBe("RejectedResult");
  });

  it("rejects a foreign directory listing such as Deepbloo and Philippine Postal", () => {
    const decision = classifySearchHit({
      engine: "google",
      title: "Artificial Intelligence (AI) Tenders – Deepbloo, Asia",
      url: "https://www.deepbloo.com/tenders/artificial-intelligence",
      domain: "deepbloo.com",
      snippet: "Philippine Postal Corporation. Bid Number PHL-2026-88.",
    });
    expect(decision.hitClass).toBe("RejectedResult");
  });

  it("rejects a foreign government portal", () => {
    expect(
      classifySearchHit({
        engine: "google",
        title: "Notice Inviting Tender",
        url: "https://www.phlpost.gov.ph/tenders/ai",
        domain: "phlpost.gov.ph",
        snippet: "NIT for software.",
      }).hitClass,
    ).toBe("RejectedResult");
  });

  it("keeps an official Indian notice that mentions another country", () => {
    const decision = classifySearchHit({
      engine: "google",
      title: "Notice Inviting Tender for a training system",
      url: "https://eprocure.gov.in/eprocure/app?component=view&id=9",
      domain: "eprocure.gov.in",
      snippet: "NIT. The scope is not a Singapore supply. Reference 2026_CPPP_123456_1.",
    });
    expect(decision.hitClass).toBe("TenderCandidate");
    expect(decision.confidence).toBe("HIGH");
  });

  it("rejects an aggregator that has no Indian issuer", () => {
    expect(
      classifySearchHit({
        engine: "google",
        title: "Notice Inviting Tender",
        url: "https://www.tenderdetail.com/global/vision",
        domain: "tenderdetail.com",
        snippet: "Notice Inviting Tender. Reference 2026_XX_123456_1.",
      }).hitClass,
    ).toBe("RejectedResult");
  });

  it("never turns Google News into a tender opportunity", () => {
    const decision = classifySearchHit({
      engine: "google_news",
      title: "Department may invite a tender for cameras",
      url: "https://www.thehindu.com/news/tender-plan",
      domain: "thehindu.com",
      snippet: "Officials said a notice inviting tender may follow.",
    });
    expect(decision.hitClass).toBe("SupportingNews");
  });
});

describe("discovery queries", () => {
  it("prefers procurement portals, tender phrases, state, and the current year", () => {
    const queries = planDiscoveryQueries(EXAMPLE_COMPANY);
    const google = queries.filter((query) => query.engine === "google").map((query) => query.query);
    const year = String(new Date().getFullYear());
    expect(google.length).toBeLessThanOrEqual(5);
    expect(google.some((query) => query.includes("site:eprocure.gov.in"))).toBe(true);
    expect(google.some((query) => query.includes("site:gem.gov.in"))).toBe(true);
    expect(google.some((query) => query.includes('site:gov.in "Notice Inviting Tender"'))).toBe(true);
    expect(google.some((query) => query.includes('site:nic.in "Request for Proposal"'))).toBe(true);
    expect(google.some((query) => query.includes(year) && query.includes("Tamil Nadu"))).toBe(true);
    expect(queries.filter((query) => query.engine === "google_news").length).toBeLessThanOrEqual(2);
  });
});
