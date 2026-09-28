import Link from "next/link";
import { SectionHeading } from "@/components/console/section-heading";
import { formatInr } from "@/lib/format";
import type { CompanyDna } from "@/lib/company/types";

export function CompanyDnaPanel({ company }: { company: CompanyDna }) {
  const contract =
    company.minimumContractValue == null && company.maximumContractValue == null
      ? "Not available"
      : [company.minimumContractValue, company.maximumContractValue].filter((value) => value != null).map((value) => formatInr(value)).join(" – ");

  return (
    <section className="flex h-full min-h-0 flex-col rounded-md border border-border bg-card p-3">
      <SectionHeading
        n={1}
        title="Company DNA"
        action={
          <Link href="/company" className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
            Edit Profile
          </Link>
        }
      />
      <dl className="mt-2 min-h-0 flex-1 overflow-y-auto">
        <Row label="Company">{company.companyName}</Row>
        <Row label="Location">{company.headquarters || "Not available"}</Row>
        <Row label="Industry">{company.industry || "Not available"}</Row>
        <Row label="Turnover">{formatInr(company.annualTurnoverInr)}</Row>
        <Row label="Company age">{company.companyAgeYears} years</Row>
        <Row label="Team size">{company.employeeCount}</Row>
        <Row label="Certifications">
          <div className="flex flex-wrap gap-1">
            {company.certifications.length === 0 && company.registrations.length === 0 ? (
              <span className="text-muted-foreground">Not available</span>
            ) : null}
            {company.certifications.map((item) => (
              <Chip key={item} tone="green">
                {item}
              </Chip>
            ))}
            {company.registrations.map((item) => (
              <Chip key={item} tone="green">
                {item}
              </Chip>
            ))}
            <Chip tone={company.gemRegistered ? "green" : "muted"}>{company.gemRegistered ? "GeM" : "GeM not registered"}</Chip>
          </div>
        </Row>
        <Row label="Capabilities">
          <ChipList items={company.capabilities} tone="blue" empty="Not available" />
        </Row>
        <Row label="Preferred states">
          <ChipList items={company.preferredStates} tone="blue" empty="Not available" />
        </Row>
        <Row label="Max EMD">{formatInr(company.maximumEmd)}</Row>
        <Row label="Contract size">{contract}</Row>
      </dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-2 border-b border-border/80 py-1.5 text-[12px] last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ChipList({ items, tone, empty }: { items: string[]; tone: "blue" | "green"; empty: string }) {
  if (items.length === 0) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Chip key={item} tone={tone}>
          {item}
        </Chip>
      ))}
    </div>
  );
}

function Chip({ tone, children }: { tone: "green" | "blue" | "muted"; children: React.ReactNode }) {
  const styles = {
    green: "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]",
    blue: "border-[#3182F6]/30 bg-[#18385E] text-[#7CB3FF]",
    muted: "border-border bg-elevated text-muted-foreground",
  };
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] leading-4 ${styles[tone]}`}>{children}</span>;
}
