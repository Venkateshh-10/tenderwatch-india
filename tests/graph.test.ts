import { describe, expect, it } from "vitest";
import { buildEvidenceGraph } from "@/lib/tender/graph";

const base = {
  tenderId: "t1",
  title: "Vision notice",
  buyer: "Demo Civic Systems Department",
  department: null,
  evidenceText: "Computer vision notice. Last date 15 Dec 2026.",
  sources: [
    {
      id: "s1",
      title: "Official notice",
      url: "https://example.gov.in/nit",
      authority: "A",
      snippet: "NIT text",
    },
    {
      id: "s2",
      title: "News note",
      url: "https://example.com/news",
      authority: "C",
      snippet: "A department may buy software.",
    },
  ],
  changes: [],
  related: [{ id: "t2", title: "Another notice from the same buyer" }],
};

describe("evidence graph", () => {
  it("links the buyer, an official source, and a related tender", () => {
    const graph = buildEvidenceGraph(base);
    expect(graph.nodes.map((node) => node.type)).toEqual([
      "Tender",
      "Buyer",
      "Official Announcement",
      "Related Tender",
    ]);
    expect(graph.edges.map((edge) => edge.label)).toEqual(["ISSUED_BY", "RELATED_TO", "RELATED_TO"]);
  });

  it("does not add a corrigendum node unless the stored text or a change says so", () => {
    const graph = buildEvidenceGraph(base);
    expect(graph.nodes.some((node) => node.type === "Corrigendum")).toBe(false);
  });

  it("adds a corrigendum only after that word is in the evidence", () => {
    const graph = buildEvidenceGraph({
      ...base,
      evidenceText: "Corrigendum to the vision notice.",
      changes: [{ changeType: "corrigendum", summary: "Corrigendum discovered", evidence: "https://example.gov.in/nit" }],
    });
    expect(graph.nodes.some((node) => node.type === "Corrigendum")).toBe(true);
    expect(graph.edges.some((edge) => edge.label === "AMENDED_BY")).toBe(true);
  });
});
