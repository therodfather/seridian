"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";

type Client = Doc<"clients">;

interface ClientFormProps {
  client?: Client;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);

  const [name, setName] = useState(client?.name ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [website, setWebsite] = useState(client?.website ?? "");
  const [industry, setIndustry] = useState(client?.industry ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(client?.status ?? "active");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      };
      if (client) {
        await updateClient({ clientId: client._id, ...payload });
      } else {
        await createClient(payload);
      }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      id: "contact",
      label: "Contact",
      fields: (
        <FormSection title="Contact Information">
          <FormGrid>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Email" required>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="john@company.com" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Website">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="company.com" className="bg-white/5 border-white/10" />
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "company",
      label: "Company",
      fields: (
        <FormSection title="Company Details">
          <FormGrid>
            <Field label="Company">
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Industry">
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} className="bg-white/5 border-white/10" />
          </Field>
        </FormSection>
      ),
    },
  ];

  return (
    <DialogContent className="max-w-lg border-white/[0.06] bg-[#0c1222]">
      <DialogHeader>
        <DialogTitle className="text-white">{client ? "Edit Client" : "Add Client"}</DialogTitle>
      </DialogHeader>
      <MultiStepForm steps={steps} onSubmit={handleSubmit} onCancel={onCancel} submitting={saving} submitLabel={client ? "Update" : "Add Client"} />
    </DialogContent>
  );
}
