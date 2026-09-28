import Link from "next/link";
import { notFound } from "next/navigation";
import { VerdictBadge } from "@/components/verdict-badge";
import { WatchButton } from "@/components/watch-button";
import { formatDateIst, formatInr, formatIst, orUnavailable } from "@/lib/format";
import { authorityLabel } from "@/lib/tender/authority";
import { getTenderDetail } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getTenderDetail(id);
  if (!detail) notFound();
  const { tender, evaluation, rows, matches, reasons } = detail;
  const demo = tender.dataMode === "demo";

  return (
    <div className="space-y-6">
      <Link href="/discover" className="text-sm text-[#16302b] underline">
        Back to Discover
      </Link>
      <header className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#5c564c]">{demo ? "Demo fixture" : "Live notice"}</p>
            <h1 className="font-serif text-3xl text-[#16302b]">{tender.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={evaluation?.verdict ?? null} />
            <WatchButton tenderId={tender.id} watched={Boolean(tender.watch)} />
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
        {demo ? (
          <p className="mt-3 text-sm text-[#6a4b12]">This record is a demo fixture. It was not retrieved from SerpApi.</p>
        ) : (
          <p className="mt-3 text-sm">
            <a className="underline" href={tender.primarySourceUrl} target="_blank" rel="noreferrer">
              Open source
            </a>
          </p>
        )}
      </header>

      <section className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <h2 className="font-serif text-2xl">Bid readiness</h2>
        <p className="mt-1 text-sm font-medium">{evaluation?.summary ?? "Not evaluated"}</p>
        {demo ? (
          <p className="mt-2 text-sm text-[#6a4b12]">
            Demo mode runs the same rules on fixture text. A status of VERIFIED means the fixture stated the fact explicitly. It does not mean a government site was checked.
          </p>
        ) : null}
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
                          Authority:{" "}
                          {demo
                            ? "Demo fixture, not an official source"
                            : row.authority
                              ? authorityLabel(row.authority)
                              : "Not available"}
                        </p>
                        <p>{row.evidenceText ?? "No passage stored."}</p>
                        {row.sourceUrl && !demo ? (
                          <a className="underline" href={row.sourceUrl} target="_blank" rel="noreferrer">
                            Open source
                          </a>
                        ) : null}
                        {demo ? <p>Demo passage. Not an official source.</p> : null}
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
        <ul className="mt-3 space-y-3 text-sm">
          {tender.sources.map((link) => (
            <li key={link.id} className="border-t border-[#efe8da] pt-3">
              <p className="font-medium">{demo ? "Demo fixture · SerpApi not called" : `Google via SerpApi · ${link.source.engine}`}</p>
              <p>{link.source.searchRun.query}</p>
              <p className="text-[#5c564c]">
                gl=in · hl=en · position {link.source.position} · {link.source.domain} · {authorityLabel(link.source.authorityTier)} ·{" "}
                {formatIst(link.source.retrievedAt)}
              </p>
              <p>{link.source.snippet ?? "No snippet stored."}</p>
              {link.source.fetchStatus === "not_directly_verified" ? <p>SOURCE NOT DIRECTLY VERIFIED</p> : null}
              {!demo ? (
                <a className="underline" href={link.source.url} target="_blank" rel="noreferrer">
                  {link.source.url}
                </a>
              ) : (
                <p className="break-all text-[#5c564c]">{link.source.url}</p>
              )}
            </li>
          ))}
        </ul>
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
