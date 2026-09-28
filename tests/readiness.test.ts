import { describe, expect, it } from "vitest";
import { EXAMPLE_COMPANY } from "@/lib/company/defaults";
import { evaluateReadiness } from "@/lib/readiness/evaluate";
import { planDiscoveryQueries } from "@/lib/search/query-planner";
import { classifyDomain } from "@/lib/tender/authority";
import { shouldMerge } from "@/lib/tender/dedupe";
import { isPastDeadline } from "@/lib/tender/dates";
import { extractFacts } from "@/lib/tender/extract";
import { turnoverBlocks, certificationBlocks, companyAgeBlocks, emdBlocks } from "@/lib/readiness/rules";
import { buildCacheKey, cacheIsFresh } from "@/lib/serpapi/cache";
import { normalizeSerpApiResults } from "@/lib/serpapi/normalize";
import { currentDataMode } from "@/lib/mode";

describe("query planner", () => {
  it("caps google and news queries", () => {
    const queries = planDiscoveryQueries(EXAMPLE_COMPANY);
    expect(queries.filter((query) => query.engine === "google").length).toBeLessThanOrEqual(5);
    expect(queries.filter((query) => query.engine === "google_news").length).toBeLessThanOrEqual(2);
    expect(new Set(queries.map((query) => query.query.toLowerCase())).size).toBe(queries.length);
  });
});

describe("authority", () => {
  it("classifies official, media, and aggregator domains", () => {
    expect(classifyDomain("tenders.tn.gov.in")).toBe("A");
    expect(classifyDomain("www.thehindu.com")).toBe("C");
    expect(classifyDomain("tenderdetail.com")).toBe("D");
    expect(classifyDomain("example.com")).toBe("U");
  });
});

describe("dedupe", () => {
  it("merges the same reference and keeps distinct urls apart", () => {
    const base = {
      title: "Vision analytics notice",
      tenderReference: "DEMO-TN-2026-014",
      buyer: null,
      primarySourceUrl: "https://demo.tenderwatch.invalid/a",
      primarySourceDomain: "demo.tenderwatch.invalid",
      closingDate: null,
      authority: "A" as const,
    };
    expect(shouldMerge(base, { ...base, primarySourceUrl: "https://demo.tenderwatch.invalid/b" })).toBe(true);
    expect(
      shouldMerge(base, {
        ...base,
        tenderReference: null,
        title: "Unrelated drain construction package",
        primarySourceUrl: "https://demo.tenderwatch.invalid/c",
      }),
    ).toBe(false);
  });
});

describe("rules", () => {
  const now = new Date("2026-09-28T10:00:00+05:30");

  it("blocks verified turnover, age, certification, emd, and past deadlines only", () => {
    expect(turnoverBlocks(10e7, 2.4e7, true, true)).toBe(true);
    expect(turnoverBlocks(10e7, 2.4e7, false, true)).toBe(false);
    expect(companyAgeBlocks(8, 4, true, true)).toBe(true);
    expect(certificationBlocks(false, true, true)).toBe(true);
    expect(certificationBlocks(false, false, true)).toBe(false);
    expect(emdBlocks(500000, 300000, true)).toBe(true);
    expect(emdBlocks(500000, 300000, false)).toBe(false);
    expect(isPastDeadline(new Date("2026-09-01T00:00:00+05:30"), now)).toBe(true);
    expect(isPastDeadline(new Date("2026-12-15T00:00:00+05:30"), now)).toBe(false);
  });
});

describe("readiness", () => {
  it("does not skip on unknown evidence", () => {
    const evaluation = evaluateReadiness({
      company: EXAMPLE_COMPANY,
      title: "Computer vision platform for Tamil Nadu",
      evidenceText: "Computer vision analytics for Tamil Nadu.",
      state: "Tamil Nadu",
      closingDate: null,
      estimatedValueInr: null,
      primaryAuthority: "A",
      primarySourceUrl: "https://tn.gov.in/example",
      requirements: [],
      now: new Date("2026-09-28T10:00:00+05:30"),
    });
    expect(evaluation.verdict).not.toBe("SKIP");
    expect(evaluation.blockers).toHaveLength(0);
    expect(evaluation.rows.find((row) => row.key === "turnover")?.status).toBe("UNKNOWN");
  });

  it("skips a verified certification blocker", () => {
    const facts = extractFacts({
      text: "ISO 27001 required. Last date 20 Dec 2026. Computer vision for Tamil Nadu.",
      authority: "A",
      fromPage: true,
      sourceUrl: "https://tn.gov.in/example",
    });
    const evaluation = evaluateReadiness({
      company: EXAMPLE_COMPANY,
      title: "Computer vision platform",
      evidenceText: "ISO 27001 required. Computer vision for Tamil Nadu.",
      state: "Tamil Nadu",
      closingDate: facts.closingDate,
      estimatedValueInr: null,
      primaryAuthority: "A",
      primarySourceUrl: "https://tn.gov.in/example",
      requirements: facts.requirements,
      fromPage: true,
      now: new Date("2026-09-28T10:00:00+05:30"),
    });
    expect(evaluation.verdict).toBe("SKIP");
    expect(evaluation.blockers.some((item) => item.includes("ISO 27001"))).toBe(true);
  });
});

describe("serpapi normalization and cache", () => {
  it("normalizes a captured search payload shape", () => {
    const hits = normalizeSerpApiResults("google", {
      organic_results: [
        {
          position: 1,
          title: "Example notice",
          link: "https://www.tn.gov.in/tender/1",
          displayed_link: "tn.gov.in",
          snippet: "Notice inviting tender",
        },
      ],
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].domain).toBe("tn.gov.in");
  });

  it("builds a stable cache key and respects expiry", () => {
    expect(buildCacheKey("google", "  Vision Tender ")).toBe(buildCacheKey("google", "vision tender"));
    expect(cacheIsFresh(new Date(Date.now() + 1000))).toBe(true);
    expect(cacheIsFresh(new Date(Date.now() - 1000))).toBe(false);
  });
});

describe("mode", () => {
  it("does not switch to sample tenders when the key is absent", () => {
    const previous = process.env.SERPAPI_API_KEY;
    delete process.env.SERPAPI_API_KEY;
    expect(currentDataMode()).toBe("live");
    if (previous) process.env.SERPAPI_API_KEY = previous;
  });
});
