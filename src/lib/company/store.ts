import { EXAMPLE_COMPANY } from "@/lib/company/defaults";
import { companySchema } from "@/lib/company/schema";
import type { CompanyDna } from "@/lib/company/types";
import { prisma } from "@/lib/db";
import { parseStringArray, stringifyArray } from "@/lib/json";

function toDna(row: {
  companyName: string;
  industry: string;
  capabilitiesJson: string;
  technologiesJson: string;
  headquarters: string;
  preferredStatesJson: string;
  companyAgeYears: number;
  annualTurnoverInr: number;
  employeeCount: number;
  certificationsJson: string;
  registrationsJson: string;
  msmeStatus: boolean;
  udyamRegistered: boolean;
  gstRegistered: boolean;
  gemRegistered: boolean;
  pastProjectCategoriesJson: string;
  preferredDepartmentsJson: string;
  minimumContractValue: number | null;
  maximumContractValue: number | null;
  maximumEmd: number | null;
  excludedCategoriesJson: string;
}): CompanyDna {
  return {
    companyName: row.companyName,
    industry: row.industry,
    capabilities: parseStringArray(row.capabilitiesJson),
    technologies: parseStringArray(row.technologiesJson),
    headquarters: row.headquarters,
    preferredStates: parseStringArray(row.preferredStatesJson),
    companyAgeYears: row.companyAgeYears,
    annualTurnoverInr: row.annualTurnoverInr,
    employeeCount: row.employeeCount,
    certifications: parseStringArray(row.certificationsJson),
    registrations: parseStringArray(row.registrationsJson),
    msmeStatus: row.msmeStatus,
    udyamRegistered: row.udyamRegistered,
    gstRegistered: row.gstRegistered,
    gemRegistered: row.gemRegistered,
    pastProjectCategories: parseStringArray(row.pastProjectCategoriesJson),
    preferredDepartments: parseStringArray(row.preferredDepartmentsJson),
    minimumContractValue: row.minimumContractValue,
    maximumContractValue: row.maximumContractValue,
    maximumEmd: row.maximumEmd,
    excludedCategories: parseStringArray(row.excludedCategoriesJson),
  };
}

export async function getCompany(): Promise<CompanyDna> {
  const existing = await prisma.companyProfile.findUnique({ where: { id: "default" } });
  if (!existing) {
    await saveCompany(EXAMPLE_COMPANY);
    return EXAMPLE_COMPANY;
  }
  return toDna(existing);
}

export async function saveCompany(input: CompanyDna): Promise<CompanyDna> {
  const company = companySchema.parse(input);
  const data = {
    companyName: company.companyName,
    industry: company.industry,
    capabilitiesJson: stringifyArray(company.capabilities),
    technologiesJson: stringifyArray(company.technologies),
    headquarters: company.headquarters,
    preferredStatesJson: stringifyArray(company.preferredStates),
    companyAgeYears: company.companyAgeYears,
    annualTurnoverInr: company.annualTurnoverInr,
    employeeCount: company.employeeCount,
    certificationsJson: stringifyArray(company.certifications),
    registrationsJson: stringifyArray(company.registrations),
    msmeStatus: company.msmeStatus,
    udyamRegistered: company.udyamRegistered,
    gstRegistered: company.gstRegistered,
    gemRegistered: company.gemRegistered,
    pastProjectCategoriesJson: stringifyArray(company.pastProjectCategories),
    preferredDepartmentsJson: stringifyArray(company.preferredDepartments),
    minimumContractValue: company.minimumContractValue,
    maximumContractValue: company.maximumContractValue,
    maximumEmd: company.maximumEmd,
    excludedCategoriesJson: stringifyArray(company.excludedCategories),
  };
  await prisma.companyProfile.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
  return company;
}
