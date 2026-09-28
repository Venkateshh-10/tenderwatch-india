import { z } from "zod";

const phrase = z.string().trim().min(1).max(120);
const phrases = z.array(phrase).max(40);

export const companySchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  industry: z.string().trim().min(2).max(200),
  capabilities: phrases.min(1),
  technologies: phrases,
  headquarters: z.string().trim().min(2).max(200),
  preferredStates: phrases,
  companyAgeYears: z.number().int().min(0).max(200),
  annualTurnoverInr: z.number().nonnegative().max(1e15),
  employeeCount: z.number().int().nonnegative().max(1_000_000),
  certifications: phrases,
  registrations: phrases,
  msmeStatus: z.boolean(),
  udyamRegistered: z.boolean(),
  gstRegistered: z.boolean(),
  gemRegistered: z.boolean(),
  pastProjectCategories: phrases,
  preferredDepartments: phrases,
  minimumContractValue: z.number().nonnegative().max(1e15).nullable(),
  maximumContractValue: z.number().nonnegative().max(1e15).nullable(),
  maximumEmd: z.number().nonnegative().max(1e15).nullable(),
  excludedCategories: phrases,
});

export type CompanyInput = z.infer<typeof companySchema>;
