"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";

type Deal = Doc<"deals">;

interface DealFormProps {
  deal?: Deal;
  onSuccess: () => void;
  onCancel?: () => void;
}

const STAGES = ["lead", "proposal", "negotiation", "closed_won", "closed_lost"] as const;

export function DealForm({ deal, onSuccess, onCancel }: DealFormProps) {
  const createDeal = useMutation(api.deals.create);
  const updateDeal = useMutation(api.deals.update);
  const clients = useQuery(api.clients.list, { status: "active" });

  const [name, setName] = useState(deal?.name ?? "");
  const [clientId, setClientId] = useState(deal?.clientId ?? "");
  const [value, setValue] = useState(deal?.value?.toString() ?? "");
  const [stage, setStage] = useState(deal?.stage ?? "lead");
  const [probability, setProbability] = useState(deal?.probability?.toString() ?? "50");
  const [contactEmail, setContactEmail] = useState(deal?.contactEmail ?? "");
  const [notes, setNotes] = useState(deal?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !clientId) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        clientId: clientId as Id<"clients">,
        value: parseFloat(value) || 0,
        stage: stage as typeof STAGES[number],
        probability: parseInt(probability) || 0,
        contactEmail: contactEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (deal) {
        await updateDeal({ dealId: deal._id, ...payload });
      } else {
        await createDeal(payload);
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
        <FormSection title="Deal Information">
          <FormGrid>
            <Field label="Deal Name" required className="sm:col-span-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enterprise Plan" className="bg-white/5 border-white/10" />
            </Field>
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
            <Field label="Contact Email">
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="contact@company.com" className="bg-white/5 border-white/10" />
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "value",
      label: "Value",
      fields: (
        <FormSection title="Deal Value">
          <FormGrid>
            <Field label="Value ($)" required>
              <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" placeholder="50000" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Probability (%)">
              <Input value={probability} onChange={(e) => setProbability(e.target.value)} type="number" min="0" max="100" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Stage">
              <Select value={stage} onValueChange={(v) => setStage(v as typeof STAGES[number])}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Deal notes..." rows={3} className="bg-white/5 border-white/10" />
          </Field>
        </FormSection>
      ),
    },
  ];

  return (
    <DialogContent className="max-w-lg border-white/[0.06] bg-[#0c1222]">
      <DialogHeader>
        <DialogTitle className="text-white">{deal ? "Edit Deal" : "New Deal"}</DialogTitle>
      </DialogHeader>
      <MultiStepForm steps={steps} onSubmit={handleSubmit} onCancel={onCancel} submitting={saving} submitLabel={deal ? "Update" : "Create Deal"} />
    </DialogContent>
  );
}
