export function turnoverBlocks(requiredInr: number, companyInr: number, verified: boolean, mandatory: boolean): boolean {
  return verified && mandatory && companyInr < requiredInr;
}

export function companyAgeBlocks(requiredYears: number, companyYears: number, verified: boolean, mandatory: boolean): boolean {
  return verified && mandatory && companyYears < requiredYears;
}

export function experienceBlocks(requiredYears: number, companyYears: number, verified: boolean, mandatory: boolean): boolean {
  return verified && mandatory && companyYears < requiredYears;
}

export function certificationBlocks(companyHasCertification: boolean, verified: boolean, mandatory: boolean): boolean {
  return verified && mandatory && !companyHasCertification;
}

export function emdBlocks(emdInr: number, maximumEmd: number | null, verified: boolean): boolean {
  return verified && maximumEmd != null && emdInr > maximumEmd;
}

export function deadlineBlocks(past: boolean, verified: boolean): boolean {
  return verified && past;
}

export function normalizeCert(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function companyHasCertification(companyCerts: string[], required: string): boolean {
  const needle = normalizeCert(required);
  return companyCerts.some((cert) => {
    const have = normalizeCert(cert);
    return have.includes(needle) || needle.includes(have);
  });
}
