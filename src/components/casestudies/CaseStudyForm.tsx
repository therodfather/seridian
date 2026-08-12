"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import {
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";

type CaseStudy = Doc<"caseStudies">;

interface CaseStudyFormProps {
  caseStudy?: CaseStudy;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CaseStudyForm({ caseStudy, onSuccess, onCancel }: CaseStudyFormProps) {
  const createCaseStudy = useMutation(api.caseStudies.create);
  const updateCaseStudy = useMutation(api.caseStudies.update);
  const clients = useQuery(api.clients.list, { status: "active" });

  const [title, setTitle] = useState(caseStudy?.title ?? "");
  const [clientId, setClientId] = useState<string>(caseStudy?.clientId ?? "");
  const [industry, setIndustry] = useState(caseStudy?.industry ?? "");
  const [technologiesInput, setTechnologiesInput] = useState(
    caseStudy?.technologies.join(", ") ?? ""
  );
  const [summary, setSummary] = useState(caseStudy?.summary ?? "");
  const [challenge, setChallenge] = useState(caseStudy?.challenge ?? "");
  const [solution, setSolution] = useState(caseStudy?.solution ?? "");
  const [results, setResults] = useState(caseStudy?.results ?? "");
  const [imageUrl, setImageUrl] = useState(caseStudy?.imageUrl ?? "");
  const [published, setPublished] = useState(caseStudy?.published ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !summary.trim() || !challenge.trim() || !solution.trim() || !results.trim() || !industry.trim()) return;
    const techs = technologiesInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (techs.length === 0) return;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        clientId: (clientId as Id<"clients">) || undefined,
        summary: summary.trim(),
        challenge: challenge.trim(),
        solution: solution.trim(),
        results: results.trim(),
        technologies: techs,
        industry: industry.trim(),
        imageUrl: imageUrl.trim() || undefined,
        published,
      };
      if (caseStudy) {
        await updateCaseStudy({ caseStudyId: caseStudy._id, ...payload });
      } else {
        await createCaseStudy(payload);
      }
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      id: "details",
      label: "Details",
      fields: (
        <FormSection title="Case Study Details">
          <Field label="Title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cloud Migration for Enterprise Client"
              className="bg-white/5 border-white/10"
            />
          </Field>
          <FormGrid>
            <Field label="Client">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name} — {client.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Industry" required>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Technology, Healthcare, Finance..."
                className="bg-white/5 border-white/10"
              />
            </Field>
          </FormGrid>
          <Field label="Technologies" required>
            <Input
              value={technologiesInput}
              onChange={(e) => setTechnologiesInput(e.target.value)}
              placeholder="React, Node.js, AWS, PostgreSQL"
              className="bg-white/5 border-white/10"
            />
            <p className="text-[11px] text-slate-500">Comma-separated</p>
          </Field>
        </FormSection>
      ),
    },
    {
      id: "content",
      label: "Content",
      fields: (
        <FormSection title="Case Study Content">
          <Field label="Summary" required>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief overview of this case study..."
              rows={3}
              className="bg-white/5 border-white/10 resize-none"
            />
          </Field>
          <Field label="Challenge" required>
            <Textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="What problem were you solving?"
              rows={3}
              className="bg-white/5 border-white/10 resize-none"
            />
          </Field>
        </FormSection>
      ),
    },
    {
      id: "solution",
      label: "Solution",
      fields: (
        <FormSection title="Solution & Results">
          <Field label="Solution" required>
            <Textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="How did you approach the problem?"
              rows={3}
              className="bg-white/5 border-white/10 resize-none"
            />
          </Field>
          <Field label="Results" required>
            <Textarea
              value={results}
              onChange={(e) => setResults(e.target.value)}
              placeholder="What outcomes were achieved?"
              rows={3}
              className="bg-white/5 border-white/10 resize-none"
            />
          </Field>
        </FormSection>
      ),
    },
    {
      id: "publish",
      label: "Publish",
      fields: (
        <FormSection title="Publishing">
          <Field label="Image URL">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="bg-white/5 border-white/10"
            />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="cs-published"
              checked={published}
              onCheckedChange={(checked) => setPublished(checked === true)}
            />
            <label htmlFor="cs-published" className="text-xs text-slate-400 cursor-pointer select-none">
              Publish this case study
            </label>
          </div>
        </FormSection>
      ),
    },
  ];

  return (
    <DialogContent className="max-w-lg border-white/[0.06] bg-[#0c1222]">
      <DialogHeader>
        <DialogTitle className="text-white">
          {caseStudy ? "Edit Case Study" : "New Case Study"}
        </DialogTitle>
      </DialogHeader>
      <MultiStepForm
        steps={steps}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        submitting={saving}
        submitLabel={caseStudy ? "Update" : "Create Case Study"}
      />
    </DialogContent>
  );
}
