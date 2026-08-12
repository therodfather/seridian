"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import {
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

type Client = Doc<"clients">;

interface ClientFormProps {
  client?: Client;
  onSuccess: () => void;
  onCancel?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [errors, setErrors] = useState<{ name?: string; email?: string; company?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email";
    if (!company.trim()) next.company = "Company is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
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
        toastMutationSuccess("Client updated");
      } else {
        await createClient(payload);
        toastMutationSuccess("Client created");
      }
      onSuccess();
    } catch (error) {
      toastMutationError(error, client ? "Failed to update client" : "Failed to create client");
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
            <Field label="Name" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="John Doe"
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                type="email"
                placeholder="john@company.com"
                className="bg-white/5 border-white/10"
              />
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
            <Field label="Company" required error={errors.company}>
              <Input
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  if (errors.company) setErrors((prev) => ({ ...prev, company: undefined }));
                }}
                placeholder="Acme Corp"
                className="bg-white/5 border-white/10"
              />
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
    <MultiStepForm
      steps={steps}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitting={saving}
      submitLabel={client ? "Update" : "Add Client"}
    />
  );
}
