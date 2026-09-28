"use server";

import { saveCompany } from "@/lib/company/store";
import type { CompanyDna } from "@/lib/company/types";
import { revalidatePath } from "next/cache";

export async function saveCompanyAction(input: CompanyDna): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveCompany(input);
    revalidatePath("/");
    revalidatePath("/company");
    revalidatePath("/discover");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the company profile.";
    return { ok: false, error: message.slice(0, 240) };
  }
}
