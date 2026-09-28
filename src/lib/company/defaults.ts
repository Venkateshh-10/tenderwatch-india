import type { CompanyDna } from "@/lib/company/types";

/** Example SME profile. This is user/company input, not tender data. */
export const EXAMPLE_COMPANY: CompanyDna = {
  companyName: "Acme Vision Systems Pvt Ltd",
  industry: "Computer vision and artificial intelligence",
  capabilities: [
    "Artificial Intelligence",
    "Computer Vision",
    "Python Development",
    "Web Applications",
    "Analytics",
    "Automation",
    "Cloud Deployment",
  ],
  technologies: ["Python", "Web Applications", "Analytics", "Cloud Deployment"],
  headquarters: "Chennai, Tamil Nadu",
  preferredStates: ["Tamil Nadu", "Karnataka", "Kerala", "Telangana"],
  companyAgeYears: 4,
  annualTurnoverInr: 2.4 * 1e7,
  employeeCount: 18,
  certifications: ["ISO 9001"],
  registrations: ["GST", "Udyam/MSME"],
  msmeStatus: true,
  udyamRegistered: true,
  gstRegistered: true,
  gemRegistered: false,
  pastProjectCategories: ["Computer vision", "Analytics", "Automation"],
  preferredDepartments: [],
  minimumContractValue: null,
  maximumContractValue: null,
  maximumEmd: 3 * 1e5,
  excludedCategories: [],
};
