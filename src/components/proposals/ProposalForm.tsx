"use client";

/**
 * Proposal create/edit — steps: Client → Scope → Pricing → Review.
 * Change step labels or field copy in the `steps` array below.
 */
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

  const selectedClient = clients?.find((c) => c._id === clientId);

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
      id: "client",
      label: "Client",
      fields: (
        <FormSection title="Who is this for?">
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
          <Field label="Client">{clientSelect}</Field>
        </FormSection>
      ),
    },
    {
      id: "scope",
      label: "Scope",
      fields: (
        <FormSection title="Proposal scope">
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
    {
      id: "pricing",
      label: "Pricing",
      fields: (
        <FormSection title="Pricing">
          <FormGrid>
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
      id: "review",
      label: "Review",
      fields: (
        <FormSection title="Review before saving">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-slate-500">Title</dt>
              <dd className="text-right text-white">{title || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-slate-500">Client</dt>
              <dd className="text-right text-white">{selectedClient?.name ?? "None"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-slate-500">Value</dt>
              <dd className="text-right text-white">
                {value.trim() ? `$${Number(value).toLocaleString()}` : "—"}
              </dd>
            </div>
            <div className="py-2">
              <dt className="mb-1 text-slate-500">Scope preview</dt>
              <dd className="line-clamp-4 whitespace-pre-wrap text-xs text-slate-300">
                {content || "—"}
              </dd>
            </div>
          </dl>
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
