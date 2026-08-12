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
  Skeleton,
} from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

type Proposal = Doc<"proposals">;

interface ProposalFormProps {
  proposal?: Proposal;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ProposalForm({ proposal, onSuccess, onCancel }: ProposalFormProps) {
  const createProposal = useMutation(api.proposals.create);
  const updateProposal = useMutation(api.proposals.update);
  const clients = useQuery(api.clients.list, { status: "active" });

  const [title, setTitle] = useState(proposal?.title ?? "");
  const [clientId, setClientId] = useState(proposal?.clientId ?? "");
  const [content, setContent] = useState(proposal?.content ?? "");
  const [value, setValue] = useState(proposal?.value?.toString() ?? "");
  const [notes, setNotes] = useState(proposal?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string; value?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Title is required";
    if (!content.trim()) next.content = "Content is required";
    if (value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isNaN(parsed) || parsed < 0) next.value = "Enter a valid non-negative value";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const parsedValue = value.trim() === "" ? undefined : Number(value);
      if (proposal) {
        await updateProposal({
          proposalId: proposal._id,
          title: title.trim(),
          content: content.trim(),
          value: parsedValue,
          notes: notes.trim() || undefined,
          clientId: (clientId || undefined) as Id<"clients"> | undefined,
        });
        toastMutationSuccess("Proposal updated");
      } else {
        await createProposal({
          title: title.trim(),
          clientId: (clientId || undefined) as Id<"clients"> | undefined,
          content: content.trim(),
          value: parsedValue,
          notes: notes.trim() || undefined,
          status: "draft",
          createdBy: "current-user",
        });
        toastMutationSuccess("Proposal created");
      }
      onSuccess();
    } catch (error) {
      toastMutationError(
        error,
        proposal ? "Failed to update proposal" : "Failed to create proposal",
      );
    } finally {
      setSaving(false);
    }
  }

  const clientSelect =
    clients === undefined ? (
      <Skeleton className="h-9 w-full rounded-md" />
    ) : clients.length === 0 ? (
      <p className="rounded-md border border-dashed border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
        No active clients. You can still save without a client.
      </p>
    ) : (
      <Select value={clientId} onValueChange={setClientId}>
        <SelectTrigger className="bg-white/5 border-white/10">
          <SelectValue placeholder="Select client (optional)" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((c) => (
            <SelectItem key={c._id} value={c._id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

  const steps = [
    {
      id: "details",
      label: "Details",
      fields: (
        <FormSection title="Proposal Information">
          <Field label="Title" required error={errors.title}>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="Cloud Migration Proposal"
              className="bg-white/5 border-white/10"
            />
          </Field>
          <FormGrid>
            <Field label="Client">{clientSelect}</Field>
            <Field label="Value ($)" error={errors.value}>
              <Input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (errors.value) setErrors((prev) => ({ ...prev, value: undefined }));
                }}
                type="number"
                min="0"
                placeholder="75000"
                className="bg-white/5 border-white/10"
              />
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "content",
      label: "Content",
      fields: (
        <FormSection title="Proposal Content">
          <Field label="Proposal Details" required error={errors.content}>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
              }}
              placeholder="Describe the proposal..."
              rows={6}
              className="bg-white/5 border-white/10"
            />
          </Field>
          <Field label="Internal Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for your team..."
              rows={3}
              className="bg-white/5 border-white/10"
            />
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
      submitLabel={proposal ? "Update" : "Create Proposal"}
    />
  );
}
