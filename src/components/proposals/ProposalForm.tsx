"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";

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

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        clientId: (clientId || undefined) as Id<"clients"> | undefined,
        content: content.trim(),
        value: parseFloat(value) || undefined,
        notes: notes.trim() || undefined,
        status: proposal?.status ?? "draft" as const,
        createdBy: "current-user",
      };
      if (proposal) {
        await updateProposal({ proposalId: proposal._id, title: payload.title, content: payload.content, value: payload.value, notes: payload.notes });
      } else {
        await createProposal(payload);
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
        <FormSection title="Proposal Information">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cloud Migration Proposal" className="bg-white/5 border-white/10" />
          </Field>
          <FormGrid>
            <Field label="Client">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Value ($)">
              <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" placeholder="75000" className="bg-white/5 border-white/10" />
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
          <Field label="Proposal Details" required>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe the proposal..." rows={6} className="bg-white/5 border-white/10" />
          </Field>
          <Field label="Internal Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for your team..." rows={3} className="bg-white/5 border-white/10" />
          </Field>
        </FormSection>
      ),
    },
  ];

  return (
    <DialogContent className="max-w-lg border-white/[0.06] bg-[#0c1222]">
      <DialogHeader>
        <DialogTitle className="text-white">{proposal ? "Edit Proposal" : "New Proposal"}</DialogTitle>
      </DialogHeader>
      <MultiStepForm steps={steps} onSubmit={handleSubmit} onCancel={onCancel} submitting={saving} submitLabel={proposal ? "Update" : "Create Proposal"} />
    </DialogContent>
  );
}
