import type { AuthorityTier } from "@/lib/tender/authority";
import type { SearchEngine } from "@/lib/serpapi/types";

/**
 * DEMO FIXTURES
 * Used only when SERPAPI_API_KEY is absent.
 * These are not live tenders, not government records, and not SerpApi results.
 */
export type DemoFixture = {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  pageText: string;
  engine: SearchEngine;
  query: string;
  authority: AuthorityTier;
};

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    id: "demo-vision-tn",
    title: "DEMO fixture: computer vision notice for a state department",
    url: "https://demo.tenderwatch.invalid/notices/vision-tn",
    domain: "demo.tenderwatch.invalid",
    snippet:
      "DEMO FIXTURE, not a government notice. Computer vision analytics for Tamil Nadu. Last date 15 Dec 2026. EMD Rs. 2,00,000. ISO 9001 required.",
    pageText:
      "DEMO FIXTURE. This page is synthetic. Issued by Demo Civic Systems Department. Computer vision and analytics platform for Tamil Nadu. Last date 15 Dec 2026. EMD Rs. 2,00,000. ISO 9001 required. Estimated value Rs. 80,00,000. NIT No. DEMO-TN-2026-014.",
    engine: "google",
    query: 'site:gov.in "Computer Vision" tender Tamil Nadu',
    authority: "A",
  },
  {
    id: "demo-iso-block",
    title: "DEMO fixture: software RFP with an unmet certification",
    url: "https://demo.tenderwatch.invalid/notices/iso-block",
    domain: "demo.tenderwatch.invalid",
    snippet:
      "DEMO FIXTURE. Python software development in Karnataka. ISO 27001 required. Minimum turnover Rs. 10 crore. Last date 20 Dec 2026.",
    pageText:
      "DEMO FIXTURE. Issued by Demo Digital Services Directorate. Python software development and web applications for Karnataka. Last date 20 Dec 2026. ISO 27001 required. Minimum annual turnover Rs. 10 crore. EMD Rs. 5,00,000. NIT No. DEMO-KA-2026-221.",
    engine: "google",
    query: 'site:nic.in "Python" "request for proposal"',
    authority: "A",
  },
  {
    id: "demo-civil-skip",
    title: "DEMO fixture: unrelated civil works notice",
    url: "https://demo.tenderwatch.invalid/notices/civil-works",
    domain: "demo.tenderwatch.invalid",
    snippet: "DEMO FIXTURE. Construction of a concrete drain in Kerala. Last date 18 Dec 2026. No software scope.",
    pageText:
      "DEMO FIXTURE. Issued by Demo Public Works Circle. Construction of a concrete roadside drain in Kerala. Last date 18 Dec 2026. EMD Rs. 50,000. NIT No. DEMO-KL-CIVIL-009.",
    engine: "google",
    query: '"notice inviting tender" "Computer Vision" Kerala',
    authority: "A",
  },
  {
    id: "demo-news",
    title: "DEMO fixture: department announces an analytics procurement",
    url: "https://demo.tenderwatch.invalid/news/analytics-note",
    domain: "demo.tenderwatch.invalid",
    snippet:
      "DEMO FIXTURE. A department said it will invite proposals for analytics and automation. This is not an authoritative tender document.",
    pageText:
      "DEMO FIXTURE. News-style note only. A department in Tamil Nadu said it plans an analytics and automation procurement. No closing date was stated.",
    engine: "google_news",
    query: "Computer Vision government tender Tamil Nadu India",
    authority: "C",
  },
];
