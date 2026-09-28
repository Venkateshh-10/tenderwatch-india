import Link from "next/link";
import { CheckUpdatesButton } from "@/components/check-updates-button";
import { consoleHref, type ConsoleQuery } from "@/components/console/links";
import { SectionHeading } from "@/components/console/section-heading";
import { StatusPill } from "@/components/console/status-pill";
import { WatchButton } from "@/components/watch-button";
import { formatDateIst, formatInr, formatIst, formatSearchParameters, orUnavailable } from "@/lib/format";
import type { ComparisonRow } from "@/lib/readiness/evaluate";
import { authorityLabel } from "@/lib/tender/authority";
import { isVerifiedFetch, verificationLabel } from "@/lib/tender/fetch-source";
import type { getTenderDetail } from "@/lib/tenders/queries";

export type TenderDetail = NonNullable<Awaited<ReturnType<typeof getTenderDetail>>>;

const VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "eligibility", label: "Eligibility & Requirements" },
  { id: "evidence", label: "Evidence" },
  { id: "provenance", label: "Search Provenance" },
  { id: "history", label: "History (Time Machine)" },
] as const;

export function TenderWorkbench({
  detail,
  basePath,
  query,
  rowKey,
  view,
}: {
  detail: TenderDetail | null;
  basePath: string;
  query: ConsoleQuery;
  rowKey: string;
  view: string;
}) {
  const rows = detail?.rows ?? [];
  const selected = rows.find((row) => row.key === rowKey) ?? rows[0] ?? null;
  const activeView = VIEWS.some((item) => item.id === view) ? view : "overview";

  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <section className="min-w-0 rounded-md border border-border bg-card p-3 xl:col-span-6">
        <SectionHeading n={4} title="Tender Detail View" />
        {detail ? (
          <TenderDetailBody
            detail={detail}
            basePath={basePath}
            query={query}
            view={activeView}
            selectedKey={selected?.key ?? ""}
          />
        ) : (
          <p className="mt-3 text-[13px] text-muted-foreground">Select an opportunity to inspect bid readiness.</p>
        )}
      </section>
      <section className="min-w-0 rounded-md border border-border bg-card p-3 xl:col-span-3">
        <SectionHeading n={5} title="Evidence Viewer" />
        {detail && selected ? <EvidenceBody detail={detail} row={selected} /> : <p className="mt-3 text-[13px] text-muted-foreground">Select a requirement to view stored evidence.</p>}
      </section>
      <div className="grid gap-3 xl:col-span-3">
        <ProvenancePanel detail={detail} />
        <TimeMachinePanel detail={detail} />
      </div>
    </div>
  );
}

function TenderDetailBody({
  detail,
  basePath,
  query,
  view,
  selectedKey,
}: {
  detail: TenderDetail;
  basePath: string;
  query: ConsoleQuery;
  view: string;
  selectedKey: string;
}) {
  const { tender, evaluation, rows, reasons } = detail;
  const back = basePath === "/" ? consoleHref("/", query, { tender: "", row: "", view: "" }) : `/?tender=${tender.id}`;
  const buyer = tender.buyer || tender.organisation || "Not available";

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href={back} className="text-[11px] text-[#3182F6] hover:underline">
          Back to results
        </Link>
        {evaluation?.verdict ? <StatusPill status={evaluation.verdict} /> : <StatusPill status="UNKNOWN" />}
        <span className="text-[11px] text-muted-foreground">Updated {formatIst(tender.updatedAt)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <WatchButton tenderId={tender.id} watched={Boolean(tender.watch)} />
          <CheckUpdatesButton tenderId={tender.id} />
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">More</summary>
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-border bg-elevated p-1 text-[12px] shadow-none">
              <a className="block rounded px-2 py-1 hover:bg-card" href={tender.primarySourceUrl} target="_blank" rel="noreferrer">
                Open source
              </a>
              {basePath === "/" ? (
                <Link className="block rounded px-2 py-1 hover:bg-card" href={`/tenders/${tender.id}`}>
                  Open full page
                </Link>
              ) : null}
            </div>
          </details>
        </div>
      </div>
      <h3 className="mt-2 text-[18px] leading-snug font-semibold">{tender.title}</h3>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{buyer}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] lg:grid-cols-5">
        <Meta label="Reference No." value={orUnavailable(tender.tenderReference)} />
        <Meta label="Department" value={orUnavailable(tender.department)} />
        <Meta label="Location" value={orUnavailable(tender.location || tender.state)} />
        <Meta label="Estimated Value" value={formatInr(tender.estimatedValueInr)} />
        <Meta label="Closing Date" value={formatDateIst(tender.closingDate)} />
      </dl>
      <div className="mt-3 flex gap-1 overflow-x-auto border-b border-border">
        {VIEWS.map((item) => {
          const label = item.id === "evidence" ? `Evidence (${rows.length})` : item.label;
          const href = consoleHref(basePath, query, { view: item.id === "overview" ? "" : item.id });
          const active = view === item.id;
          return (
            <Link
              key={item.id}
              href={href}
              className={active ? "border-b-2 border-[#3182F6] px-2 py-1.5 text-[11px] text-foreground" : "px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <div className="mt-3">
        {view === "eligibility" ? <Eligibility detail={detail} /> : null}
        {view === "evidence" ? <EvidenceList basePath={basePath} query={query} rows={rows} selectedKey={selectedKey} /> : null}
        {view === "provenance" ? <ProvenanceList detail={detail} /> : null}
        {view === "history" ? <HistoryList detail={detail} /> : null}
        {view === "overview" ? <Overview detail={detail} basePath={basePath} query={query} reasons={reasons} rows={rows} selectedKey={selectedKey} /> : null}
      </div>
    </div>
  );
}

function Overview({
  detail,
  basePath,
  query,
  reasons,
  rows,
  selectedKey,
}: {
  detail: TenderDetail;
  basePath: string;
  query: ConsoleQuery;
  reasons: string[];
  rows: ComparisonRow[];
  selectedKey: string;
}) {
  const verdict = detail.evaluation?.verdict ?? "UNKNOWN";
  const blockers = rows.filter((row) => row.status === "BLOCKER").length;
  const review = rows.filter((row) => row.status === "CONCERN").length;
  const line =
    blockers === 0 && review === 0
      ? "No verified blocker in the stored comparison."
      : [
          blockers ? `${blockers} verified blocker${blockers === 1 ? "" : "s"}` : null,
          review ? `${review} area${review === 1 ? "" : "s"} need review` : null,
        ]
          .filter(Boolean)
          .join(", ");
  const scope = detail.tender.scope?.trim() || detail.tender.evidenceCorpus?.trim();

  return (
    <div className="space-y-3">
      {scope ? <p className="line-clamp-4 text-[12px] leading-5 text-muted-foreground">{scope}</p> : <p className="text-[12px] text-muted-foreground">Scope not available.</p>}
      <div>
        <p className="text-[12px] font-medium text-[#8B5CF6]">Bid Readiness Assessment</p>
        <div
          className={
            verdict === "BID"
              ? "mt-1.5 rounded-md border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2"
              : verdict === "SKIP"
                ? "mt-1.5 rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2"
                : verdict === "REVIEW"
                  ? "mt-1.5 rounded-md border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2"
                  : "mt-1.5 rounded-md border border-border bg-elevated px-3 py-2"
          }
        >
          <p className="text-[18px] font-semibold">{verdict}</p>
          <p className="text-[12px] text-muted-foreground">{line}</p>
          {reasons.length > 0 ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-[11px] text-[#3182F6]">View Summary</summary>
              <ul className="mt-1 space-y-1 text-[12px]">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">{detail.evaluation?.summary ?? "Not evaluated"}</p>
          )}
        </div>
      </div>
      <ComparisonTable basePath={basePath} query={query} rows={rows} selectedKey={selectedKey} />
    </div>
  );
}

function ComparisonTable({
  basePath,
  query,
  rows,
  selectedKey,
}: {
  basePath: string;
  query: ConsoleQuery;
  rows: ComparisonRow[];
  selectedKey: string;
}) {
  if (rows.length === 0) return <p className="text-[12px] text-muted-foreground">No comparison stored.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[11px]">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1.5 pr-2 font-medium">Requirement</th>
            <th className="py-1.5 pr-2 font-medium">Tender Requirement</th>
            <th className="py-1.5 pr-2 font-medium">Your Company</th>
            <th className="py-1.5 pr-2 font-medium">Result</th>
            <th className="py-1.5 font-medium">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.key === selectedKey ? "border-t border-border bg-elevated" : "border-t border-border"}>
              <td className="py-1.5 pr-2">{row.requirement}</td>
              <td className="py-1.5 pr-2">{row.tender}</td>
              <td className="py-1.5 pr-2">{row.company}</td>
              <td className="py-1.5 pr-2">
                <StatusPill status={row.status} />
              </td>
              <td className="py-1.5">
                <Link className="text-[#3182F6] hover:underline" href={consoleHref(basePath, query, { row: row.key, view: "overview" })}>
                  Evidence
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Eligibility({ detail }: { detail: TenderDetail }) {
  if (detail.tender.requirements.length === 0) {
    return <p className="text-[12px] text-muted-foreground">No extracted requirements stored.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {detail.tender.requirements.map((item) => (
        <li key={item.id} className="rounded-md border border-border bg-elevated px-2 py-1.5 text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{item.label}</p>
            <StatusPill status={item.evidenceStatus} />
          </div>
          <p className="text-muted-foreground">
            {item.value || "Not available"} · {item.mandatoryStatus} · confidence {item.confidence || "Not available"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function EvidenceList({
  basePath,
  query,
  rows,
  selectedKey,
}: {
  basePath: string;
  query: ConsoleQuery;
  rows: ComparisonRow[];
  selectedKey: string;
}) {
  if (rows.length === 0) return <p className="text-[12px] text-muted-foreground">No evidence rows stored.</p>;
  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={row.key}>
          <Link
            href={consoleHref(basePath, query, { row: row.key, view: "evidence" })}
            className={row.key === selectedKey ? "block rounded-md border border-[#3182F6] px-2 py-1.5 text-[12px]" : "block rounded-md border border-border px-2 py-1.5 text-[12px] hover:border-[#3182F6]/50"}
          >
            <span className="font-medium">{row.requirement}</span>
            <span className="mt-1 block text-muted-foreground">{row.evidenceText || "No passage stored."}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProvenanceList({ detail }: { detail: TenderDetail }) {
  return (
    <ul className="space-y-2">
      {detail.tender.sources.map((link) => (
        <li key={link.id} className="rounded-md border border-border bg-elevated px-2 py-1.5 text-[12px]">
          <p>{link.source.engine === "google_news" ? "Google News via SerpApi" : "Google Search via SerpApi"}</p>
          <p className="font-mono text-[11px]">{link.source.searchRun.query}</p>
          <a className="break-all text-[#3182F6]" href={link.source.url} target="_blank" rel="noreferrer">
            {link.source.url}
          </a>
        </li>
      ))}
    </ul>
  );
}

function HistoryList({ detail }: { detail: TenderDetail }) {
  if (detail.tender.changes.length === 0) {
    return <p className="text-[12px] text-muted-foreground">No verified changes detected yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {detail.tender.changes.map((change) => (
        <li key={change.id} className="text-[12px]">
          <p className="font-medium">
            {change.summary} · {formatIst(change.detectedAt)}
          </p>
          <p className="text-muted-foreground">
            {change.beforeValue ?? "Not recorded"} → {change.afterValue ?? "Not recorded"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function EvidenceBody({ detail, row }: { detail: TenderDetail; row: ComparisonRow }) {
  const source = detail.tender.sources.find((link) => link.source.url === row.sourceUrl)?.source;
  const requirement = detail.tender.requirements.find((item) => item.type === row.key || item.label === row.requirement);
  const badge = row.status === "BLOCKER" ? "BLOCKER" : row.evidenceStatus;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium">{row.requirement}</p>
        <StatusPill status={badge} />
      </div>
      <blockquote className="rounded-md border border-border bg-elevated px-2.5 py-2 text-[12px] leading-5 text-[#C5D0DC]">
        {row.evidenceText || "No passage stored."}
      </blockquote>
      <dl className="space-y-1 text-[11px]">
        <Fact label="Source" value={source ? evidenceSourceName(source) : "Not available"} />
        <Fact label="URL" value={row.sourceUrl || source?.url || "Not available"} href={row.sourceUrl || source?.url || undefined} />
        <Fact label="Section" value="Not available" />
        <Fact label="Page" value={row.page ? String(row.page) : "Not available"} />
        <Fact label="Authority" value={row.authority ? authorityLabel(row.authority) : "Not available"} />
        <Fact label="Retrieved" value={formatIst(source?.retrievedAt ?? detail.tender.lastCheckedAt)} />
        <Fact label="Confidence" value={requirement?.confidence || "Not available"} />
      </dl>
      {row.sourceUrl ? (
        <a className="inline-flex rounded-md border border-border px-2 py-1 text-[11px] text-[#3182F6]" href={row.sourceUrl} target="_blank" rel="noreferrer">
          View Full Document
        </a>
      ) : (
        <p className="text-[11px] text-muted-foreground">Full document not available.</p>
      )}
    </div>
  );
}

function ProvenancePanel({ detail }: { detail: TenderDetail | null }) {
  const link = detail
    ? (detail.tender.sources.find((item) => item.source.url === detail.tender.primarySourceUrl) ??
      detail.tender.sources.find((item) => item.source.engine !== "google_news") ??
      detail.tender.sources[0])
    : null;

  return (
    <section className="rounded-md border border-border bg-card p-3">
      <SectionHeading n={6} title="Search Provenance" />
      {!detail || !link ? (
        <p className="mt-2 text-[12px] text-muted-foreground">No search provenance until an opportunity is selected.</p>
      ) : (
        <div className="mt-2 space-y-1.5 text-[12px]">
          <p className="text-[11px] text-muted-foreground">This tender was discovered using the following SerpApi search</p>
          <p className="text-[#8B5CF6]">{link.source.engine === "google_news" ? "Google News via SerpApi" : "Google Search via SerpApi"}</p>
          <p className="font-mono text-[11px] leading-4 text-[#C5D0DC]">{link.source.searchRun.query}</p>
          <Fact label="Search Parameters" value={formatSearchParameters(link.source.searchRun.parameters)} mono />
          <Fact label="Result Position" value={String(link.source.position)} />
          <Fact label="Source Domain" value={link.source.domain} />
          <Fact label="Source URL" value={link.source.url} href={link.source.url} />
          <Fact label="Retrieved" value={formatIst(link.source.retrievedAt)} />
          <p className={isVerifiedFetch(link.source.fetchStatus) ? "text-[11px] text-[#22C55E]" : "text-[11px] text-[#F59E0B]"}>{verificationLabel(link.source.fetchStatus)}</p>
          <details>
            <summary className="cursor-pointer text-[11px] text-[#3182F6]">View All Sources ({detail.tender.sources.length})</summary>
            <ul className="mt-1 space-y-1">
              {detail.tender.sources.map((item) => (
                <li key={item.id} className="font-mono text-[10px] break-all text-muted-foreground">
                  {item.source.domain} · {item.source.searchRun.query}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}

function TimeMachinePanel({ detail }: { detail: TenderDetail | null }) {
  return (
    <section className="rounded-md border border-border bg-card p-3">
      <SectionHeading n={7} title="Tender Time Machine" />
      <p className="mt-1 text-[11px] text-muted-foreground">Timeline of changes detected from official sources</p>
      {detail ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CheckUpdatesButton tenderId={detail.tender.id} />
          <Link href={`/tenders/${detail.tender.id}?view=history`} className="text-[11px] text-[#3182F6] hover:underline">
            View All
          </Link>
        </div>
      ) : null}
      {!detail || detail.tender.changes.length === 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">No verified changes detected yet.</p>
      ) : (
        <ol className="mt-3 space-y-3 border-l border-border pl-3">
          {detail.tender.changes.map((change) => (
            <li key={change.id} className="relative">
              <span className="absolute top-1 -left-[17px] size-2 rounded-full bg-[#8B5CF6]" />
              <p className="text-[10px] text-muted-foreground">{formatDateIst(change.detectedAt)}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-medium">{change.summary}</p>
                <StatusPill status="CHANGED" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {change.beforeValue ?? "Not recorded"} → {change.afterValue ?? "Not recorded"}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function evidenceSourceName(source: { title: string; domain: string; fetchStatus: string }): string {
  if (source.domain.endsWith("gem.gov.in") && isVerifiedFetch(source.fetchStatus)) return "GeM Bid Document";
  return source.title;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-2 py-1.5">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-[12px]">{value}</dd>
    </div>
  );
}

function Fact({ label, value, href, mono = false }: { label: string; value: string; href?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-[11px] break-all" : "text-[11px] break-all"}>
        {href ? (
          <a className="text-[#3182F6] hover:underline" href={href} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
