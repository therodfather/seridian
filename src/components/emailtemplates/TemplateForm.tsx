"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";

type EmailTemplate = Doc<"emailTemplates">;

interface TemplateFormProps {
  template?: EmailTemplate;
  onSuccess: () => void;
  onCancel?: () => void;
}

const CATEGORIES = ["proposal", "invoice", "follow_up", "welcome", "custom"] as const;

export function TemplateForm({ template, onSuccess, onCancel }: TemplateFormProps) {
  const createTemplate = useMutation(api.emailTemplates.create);
  const updateTemplate = useMutation(api.emailTemplates.update);

  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [category, setCategory] = useState(template?.category ?? "custom");
  const [variables, setVariables] = useState(template?.variables?.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !subject.trim()) return;
    setSaving(true);
    try {
      const vars = variables.split(",").map((v) => v.trim()).filter(Boolean);
      if (template) {
        await updateTemplate({ templateId: template._id, name: name.trim(), subject: subject.trim(), body: body.trim(), category: category as typeof CATEGORIES[number], variables: vars });
      } else {
        await createTemplate({ name: name.trim(), subject: subject.trim(), body: body.trim(), category: category as typeof CATEGORIES[number], variables: vars, createdBy: "current-user" });
      }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      id: "details",
      label: "Details",
      fields: (
        <FormSection title="Template Details">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome Email" className="bg-white/5 border-white/10" />
          </Field>
          <FormGrid>
            <Field label="Subject" required className="sm:col-span-2">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Welcome to Seridian, {{clientName}}!" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Category">
              <Select value={category} onValueChange={(v) => setCategory(v as typeof CATEGORIES[number])}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Variables">
              <Input value={variables} onChange={(e) => setVariables(e.target.value)} placeholder="{{clientName}}, {{proposalTitle}}" className="bg-white/5 border-white/10" />
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "content",
      label: "Content",
      fields: (
        <FormSection title="Email Body">
          <Field label="HTML Content" required>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="<h1>Welcome!</h1><p>Hi {{clientName}},</p>" rows={10} className="bg-white/5 border-white/10 font-mono text-sm" />
          </Field>
        </FormSection>
      ),
    },
  ];

  return (
    <DialogContent className="max-w-lg border-white/[0.06] bg-[#0c1222]">
      <DialogHeader>
        <DialogTitle className="text-white">{template ? "Edit Template" : "New Template"}</DialogTitle>
      </DialogHeader>
      <MultiStepForm steps={steps} onSubmit={handleSubmit} onCancel={onCancel} submitting={saving} submitLabel={template ? "Update" : "Create Template"} />
    </DialogContent>
  );
}
