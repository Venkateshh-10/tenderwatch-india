import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckUpdatesButton } from "@/components/check-updates-button";
import { EvidenceGraph } from "@/components/evidence-graph";
import { VerdictBadge } from "@/components/verdict-badge";
import { WatchButton } from "@/components/watch-button";
import { formatDateIst, formatInr, formatIst, orUnavailable } from "@/lib/format";
import { authorityLabel } from "@/lib/tender/authority";
import { buildEvidenceGraph } from "@/lib/tender/graph";
import { getTenderDetail } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getTenderDetail(id);
  if (!detail) notFound();
  const { tender, evaluation, rows, matches, reasons, related } = detail;
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

  return (
    <div className="space-y-6">
      <Link href="/discover" className="text-sm text-[#16302b] underline">
        Back to Discover
      </Link>
      <header className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#5c564c]">Live notice</p>
            <h1 className="font-serif text-3xl text-[#16302b]">{tender.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={evaluation?.verdict ?? null} />
            <WatchButton tenderId={tender.id} watched={Boolean(tender.watch)} />
            <CheckUpdatesButton tenderId={tender.id} />
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Buyer" value={orUnavailable(tender.buyer)} />
          <Fact label="Reference" value={orUnavailable(tender.tenderReference)} />
          <Fact label="Location" value={orUnavailable(tender.state)} />
          <Fact label="Closing date" value={formatDateIst(tender.closingDate)} />
          <Fact label="Estimated value" value={formatInr(tender.estimatedValueInr)} />
          <Fact label="Status" value={orUnavailable(tender.status)} />
          <Fact label="Primary source" value={tender.primarySourceDomain} />
          <Fact label="Last checked" value={formatIst(tender.lastCheckedAt)} />
        </dl>
        <p className="mt-3 text-sm">
          <a className="underline" href={tender.primarySourceUrl} target="_blank" rel="noreferrer">
            Open source
          </a>
        </p>
      </header>

      <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <h2 className="font-serif text-2xl">Bid readiness</h2>
        <p className="mt-1 text-sm font-medium">{evaluation?.summary ?? "Not evaluated"}</p>
        <p className="mt-2 text-sm text-[#5c564c]">
          Only a VERIFIED mandatory failure is a hard blocker. Missing text stays UNKNOWN.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[#5c564c]">
              <tr>
                <th className="py-2 pr-3 font-medium">Requirement</th>
                <th className="py-2 pr-3 font-medium">Tender</th>
                <th className="py-2 pr-3 font-medium">Company</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-[#efe8da]">
                  <td className="py-2 pr-3">{row.requirement}</td>
                  <td className="py-2 pr-3">{row.tender}</td>
                  <td className="py-2 pr-3">{row.company}</td>
                  <td className="py-2 pr-3">{row.status}</td>
                  <td className="py-2">
                    <details>
                      <summary className="cursor-pointer text-[#16302b]">View evidence</summary>
                      <div className="mt-2 space-y-1 text-[#3d3832]">
                        <p>Status: {row.evidenceStatus}</p>
                        <p>
                          Authority: {row.authority ? authorityLabel(row.authority) : "Not available"}
                        </p>
                        <p>{row.evidenceText ?? "No passage stored."}</p>
                        {row.sourceUrl ? (
                          <a className="underline" href={row.sourceUrl} target="_blank" rel="noreferrer">
                            Open source
                          </a>
                        ) : null}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reasons.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <h2 className="font-serif text-2xl">Why this matched</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {matches.length === 0 ? <li>Not available</li> : null}
          {matches.map((match) => (
            <li key={`${match.label}-${match.strength}`}>
              {match.label} · {match.strength}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <h2 className="font-serif text-2xl">Search provenance</h2>
        <p className="mt-1 text-sm text-[#5c564c]">This is the exact SerpApi query that discovered the opportunity.</p>
        <ul className="mt-3 space-y-3 text-sm">
          {tender.sources.map((link) => (
            <li key={link.id} className="border-t border-[#efe8da] pt-3">
              <p className="font-medium">
                {link.source.engine === "google_news" ? "Google News via SerpApi" : "Google Search via SerpApi"}
              </p>
              <p>{link.source.searchRun.query}</p>
              <p className="text-[#5c564c]">
                gl=in · hl=en · position {link.source.position} · {link.source.domain} · {authorityLabel(link.source.authorityTier)} ·{" "}
                {formatIst(link.source.retrievedAt)}
              </p>
              <p>{link.source.snippet ?? "No snippet stored."}</p>
              {link.source.fetchStatus === "not_directly_verified" ? <p>SOURCE NOT VERIFIED</p> : null}
              <a className="break-all underline" href={link.source.url} target="_blank" rel="noreferrer">
                {link.source.url}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">Time Machine</h2>
            <p className="mt-1 max-w-2xl text-sm text-[#5c564c]">
              Each check stores a snapshot of the fields already on this notice. A difference is recorded only when a later snapshot changes a stored field. The first snapshot is a baseline.
            </p>
          </div>
          <CheckUpdatesButton tenderId={tender.id} />
        </div>
        <p className="mt-3 text-sm">Check for updates bypasses the search cache, calls SerpApi, and keeps only results that match this notice.</p>
        <h3 className="mt-4 text-sm font-medium">Snapshots</h3>
        {tender.snapshots.length === 0 ? (
          <p className="mt-1 text-sm">No snapshot stored yet. Run Discover, then check again.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {tender.snapshots.map((snapshot, index) => (
              <li key={snapshot.id}>
                {index === tender.snapshots.length - 1 ? "Discovered" : "Checked"} · {formatIst(snapshot.capturedAt)}
              </li>
            ))}
          </ul>
        )}
        <h3 className="mt-4 text-sm font-medium">Verified changes</h3>
        {tender.changes.length === 0 ? (
          <p className="mt-1 text-sm">No verified change detected.</p>
        ) : (
          <ul className="mt-2 space-y-3 text-sm">
            {tender.changes.map((change) => (
              <li key={change.id} className="border-t border-[#efe8da] pt-3">
                <p className="font-medium">
                  {change.summary} · {formatIst(change.detectedAt)}
                </p>
                <p>
                  {change.beforeValue ?? "Not recorded"} → {change.afterValue ?? "Not recorded"}
                </p>
                <p className="break-all text-[#5c564c]">{change.evidence ?? "No source URL stored."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <h2 className="font-serif text-2xl">Evidence graph</h2>
        <div className="mt-3">
          <EvidenceGraph nodes={graph.nodes} edges={graph.edges} />
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[#5c564c]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
