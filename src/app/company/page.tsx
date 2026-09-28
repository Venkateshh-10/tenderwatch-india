import { CompanyForm } from "@/components/company-form";
import { getCompany } from "@/lib/company/store";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const company = await getCompany();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl text-[#16302b]">Company DNA</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#5c564c]">
          This profile is user input. It steers the query planner and the readiness rules. It is prefilled with an
          example SME so the desk can be demonstrated before you replace it.
        </p>
      </div>
      <div className="rounded-xl border border-[#e4dccb] bg-white p-4">
        <CompanyForm initial={company} />
      </div>
    </div>
  );
}
