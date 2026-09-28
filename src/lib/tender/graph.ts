export type EvidenceNode = {
  id: string;
  type: "Tender" | "Buyer" | "Department" | "Corrigendum" | "Amendment" | "Extension" | "Cancellation" | "Official Announcement" | "Related Tender";
  label: string;
  evidence?: string;
  url?: string;
};

export type EvidenceEdge = {
  id: string;
  source: string;
  target: string;
  label: "ISSUED_BY" | "AMENDED_BY" | "EXTENDS" | "CANCELS" | "RELATED_TO";
};

export function buildEvidenceGraph(input: {
  tenderId: string;
  title: string;
  buyer: string | null;
  department: string | null;
  evidenceText: string;
  sources: Array<{ id: string; title: string; url: string; authority: string; snippet: string | null }>;
  changes: Array<{ changeType: string; summary: string; evidence: string | null }>;
  related: Array<{ id: string; title: string }>;
}): { nodes: EvidenceNode[]; edges: EvidenceEdge[] } {
  const nodes: EvidenceNode[] = [
    { id: `tender:${input.tenderId}`, type: "Tender", label: input.title, evidence: input.evidenceText.slice(0, 400) },
  ];
  const edges: EvidenceEdge[] = [];
  const tenderNode = nodes[0].id;

  if (input.buyer?.trim()) {
    const id = `buyer:${input.buyer.trim().toLowerCase()}`;
    nodes.push({ id, type: "Buyer", label: input.buyer.trim() });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "ISSUED_BY" });
  }
  if (input.department?.trim()) {
    const id = `department:${input.department.trim().toLowerCase()}`;
    nodes.push({ id, type: "Department", label: input.department.trim() });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "ISSUED_BY" });
  }

  for (const source of input.sources) {
    if (source.authority !== "A" && source.authority !== "B") continue;
    const id = `source:${source.id}`;
    nodes.push({
      id,
      type: "Official Announcement",
      label: source.title.slice(0, 80),
      evidence: source.snippet ?? undefined,
      url: source.url,
    });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "RELATED_TO" });
  }

  const text = input.evidenceText.toLowerCase();
  const changeTypes = new Set(input.changes.map((change) => change.changeType));
  if (text.includes("corrigendum") || changeTypes.has("corrigendum")) {
    const id = `corrigendum:${input.tenderId}`;
    nodes.push({ id, type: "Corrigendum", label: "Corrigendum", evidence: "The stored evidence mentions a corrigendum." });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "AMENDED_BY" });
  }
  if (text.includes("amendment") || changeTypes.has("amendment")) {
    const id = `amendment:${input.tenderId}`;
    nodes.push({ id, type: "Amendment", label: "Amendment", evidence: "The stored evidence mentions an amendment." });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "AMENDED_BY" });
  }
  if (text.includes("extension") || changeTypes.has("extension")) {
    const id = `extension:${input.tenderId}`;
    nodes.push({ id, type: "Extension", label: "Extension", evidence: "The stored evidence mentions an extension." });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "EXTENDS" });
  }
  if (text.includes("cancellation") || text.includes("cancelled") || changeTypes.has("cancellation")) {
    const id = `cancel:${input.tenderId}`;
    nodes.push({ id, type: "Cancellation", label: "Cancellation", evidence: "The stored evidence mentions a cancellation." });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "CANCELS" });
  }

  for (const related of input.related) {
    if (related.id === input.tenderId) continue;
    const id = `related:${related.id}`;
    nodes.push({ id, type: "Related Tender", label: related.title, url: `/tenders/${related.id}` });
    edges.push({ id: `e:${id}`, source: tenderNode, target: id, label: "RELATED_TO" });
  }

  return { nodes, edges };
}
