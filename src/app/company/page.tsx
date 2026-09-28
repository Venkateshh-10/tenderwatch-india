import { CompanyForm } from "@/components/company-form";
import { getCompany } from "@/lib/company/store";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const company = await getCompany();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold">Company DNA</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
          This profile is user input. It steers the query planner and the readiness rules. It is prefilled with an example SME so the desk can be demonstrated before you replace it.
        </p>
      </div>
      <div className="rounded-md border border-border bg-card p-3">
        <CompanyForm initial={company} />
      </div>
    </div>
  );
}
