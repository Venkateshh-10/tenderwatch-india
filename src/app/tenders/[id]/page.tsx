import { notFound } from "next/navigation";
import { TenderWorkbench } from "@/components/console/tender-workbench";
import { EvidenceGraph } from "@/components/evidence-graph";
import { readParam } from "@/components/console/links";
import { buildEvidenceGraph } from "@/lib/tender/graph";
import { getTenderDetail } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function TenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const detail = await getTenderDetail(id);
  if (!detail) notFound();
  const { tender, related } = detail;
  const graph = buildEvidenceGraph({
    tenderId: tender.id,
    title: tender.title,
    buyer: tender.buyer,
    department: tender.department,
    evidenceText: tender.evidenceCorpus,
    sources: tender.sources.map((link) => ({
      id: link.source.id,
      title: link.source.title,
      url: link.source.url,
      authority: link.source.authorityTier,
      snippet: link.source.snippet,
    })),
    changes: tender.changes.map((change) => ({
      changeType: change.changeType,
      summary: change.summary,
      evidence: change.evidence,
    })),
    related,
  });
  const query = {
    view: readParam(queryParams.view) || "overview",
    row: readParam(queryParams.row),
  };

  return (
    <div className="space-y-3">
      <TenderWorkbench detail={detail} basePath={`/tenders/${id}`} query={query} rowKey={query.row} view={query.view} />
      <section className="rounded-md border border-border bg-card p-3">
        <h2 className="text-base font-semibold">Evidence graph</h2>
        <div className="mt-2">
          <EvidenceGraph nodes={graph.nodes} edges={graph.edges} />
        </div>
      </section>
    </div>
  );
}
