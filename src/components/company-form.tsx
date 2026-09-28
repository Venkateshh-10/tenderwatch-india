"use client";

import { useState } from "react";
import { saveCompanyAction } from "@/lib/company/actions";
import type { CompanyDna } from "@/lib/company/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function lines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function join(values: string[]): string {
  return values.join("\n");
}

export function CompanyForm({ initial }: { initial: CompanyDna }) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof CompanyDna>(key: K, value: CompanyDna[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await saveCompanyAction(form);
    setMessage(result.ok ? "Company DNA saved." : result.error);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <Field label="Company name">
        <Input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} />
      </Field>
      <Field label="Industry">
        <Input value={form.industry} onChange={(event) => update("industry", event.target.value)} />
      </Field>
      <Field label="Headquarters">
        <Input value={form.headquarters} onChange={(event) => update("headquarters", event.target.value)} />
      </Field>
      <Field label="Company age (years)">
        <Input type="number" value={form.companyAgeYears} onChange={(event) => update("companyAgeYears", Number(event.target.value))} />
      </Field>
      <Field label="Annual turnover (INR)">
        <Input type="number" value={form.annualTurnoverInr} onChange={(event) => update("annualTurnoverInr", Number(event.target.value))} />
      </Field>
      <Field label="Employees">
        <Input type="number" value={form.employeeCount} onChange={(event) => update("employeeCount", Number(event.target.value))} />
      </Field>
      <Field label="Maximum acceptable EMD (INR)">
        <Input
          type="number"
          value={form.maximumEmd ?? ""}
          onChange={(event) => update("maximumEmd", event.target.value === "" ? null : Number(event.target.value))}
        />
      </Field>
      <Field label="Maximum contract value (INR)">
        <Input
          type="number"
          value={form.maximumContractValue ?? ""}
          onChange={(event) => update("maximumContractValue", event.target.value === "" ? null : Number(event.target.value))}
        />
      </Field>
      <ListField label="Capabilities" value={join(form.capabilities)} onChange={(value) => update("capabilities", lines(value))} />
      <ListField label="Technologies" value={join(form.technologies)} onChange={(value) => update("technologies", lines(value))} />
      <ListField label="Preferred states" value={join(form.preferredStates)} onChange={(value) => update("preferredStates", lines(value))} />
      <ListField label="Certifications" value={join(form.certifications)} onChange={(value) => update("certifications", lines(value))} />
      <ListField label="Registrations" value={join(form.registrations)} onChange={(value) => update("registrations", lines(value))} />
      <ListField label="Past project categories" value={join(form.pastProjectCategories)} onChange={(value) => update("pastProjectCategories", lines(value))} />
      <ListField label="Preferred departments" value={join(form.preferredDepartments)} onChange={(value) => update("preferredDepartments", lines(value))} />
      <ListField label="Excluded categories" value={join(form.excludedCategories)} onChange={(value) => update("excludedCategories", lines(value))} />
      <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
        <Check label="MSME" checked={form.msmeStatus} onChange={(checked) => update("msmeStatus", checked)} />
        <Check label="Udyam" checked={form.udyamRegistered} onChange={(checked) => update("udyamRegistered", checked)} />
        <Check label="GST" checked={form.gstRegistered} onChange={(checked) => update("gstRegistered", checked)} />
        <Check label="GeM" checked={form.gemRegistered} onChange={(checked) => update("gemRegistered", checked)} />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Company DNA"}</Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function ListField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
