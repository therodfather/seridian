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
  const [errors, setErrors] = useState<{
    name?: string;
    clientId?: string;
    value?: string;
    probability?: string;
  }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Deal name is required";
    if (!clientId) next.clientId = "Select a client";
    const parsedValue = Number(value);
    if (value.trim() === "" || Number.isNaN(parsedValue) || parsedValue < 0) {
      next.value = "Enter a valid non-negative value";
    }
    const parsedProb = Number(probability);
    if (
      probability.trim() === "" ||
      Number.isNaN(parsedProb) ||
      parsedProb < 0 ||
      parsedProb > 100
    ) {
      next.probability = "Probability must be 0–100";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        clientId: clientId as Id<"clients">,
        value: Number(value),
        stage: stage as (typeof STAGES)[number],
        probability: Number(probability),
        contactEmail: contactEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (deal) {
        await updateDeal({ dealId: deal._id, ...payload });
        toastMutationSuccess("Deal updated");
      } else {
        await createDeal(payload);
        toastMutationSuccess("Deal created");
      }
      onSuccess();
    } catch (error) {
      toastMutationError(error, deal ? "Failed to update deal" : "Failed to create deal");
    } finally {
      setSaving(false);
    }
  }

  const clientSelect =
    clients === undefined ? (
      <Skeleton className="h-9 w-full rounded-md" />
    ) : clients.length === 0 ? (
      <p className="rounded-md border border-dashed border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
        No active clients yet. Create a client before adding a deal.
      </p>
    ) : (
      <Select
        value={clientId}
        onValueChange={(v) => {
          setClientId(v);
          if (errors.clientId) setErrors((prev) => ({ ...prev, clientId: undefined }));
        }}
      >
        <SelectTrigger className="bg-white/5 border-white/10">
          <SelectValue placeholder="Select client" />
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
        <FormSection title="Deal Information">
          <FormGrid>
            <Field label="Deal Name" required className="sm:col-span-2" error={errors.name}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Enterprise Plan"
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Client" required error={errors.clientId}>
              {clientSelect}
            </Field>
            <Field label="Contact Email">
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                type="email"
                placeholder="contact@company.com"
                className="bg-white/5 border-white/10"
              />
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "value",
      label: "Value & stage",
      fields: (
        <FormSection title="Deal Value">
          <FormGrid>
            <Field label="Value ($)" required error={errors.value}>
              <Input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (errors.value) setErrors((prev) => ({ ...prev, value: undefined }));
                }}
                type="number"
                min="0"
                placeholder="50000"
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Probability (%)" error={errors.probability}>
              <Input
                value={probability}
                onChange={(e) => {
                  setProbability(e.target.value);
                  if (errors.probability) setErrors((prev) => ({ ...prev, probability: undefined }));
                }}
                type="number"
                min="0"
                max="100"
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Stage">
              <Select value={stage} onValueChange={(v) => setStage(v as (typeof STAGES)[number])}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deal notes..."
              rows={3}
              className="bg-white/5 border-white/10"
            />
          </Field>
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
              <dt className="text-slate-500">Deal</dt>
              <dd className="text-right text-white">{name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-slate-500">Value</dt>
              <dd className="text-right text-white">
                {value.trim() ? `$${Number(value).toLocaleString()}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-slate-500">Probability</dt>
              <dd className="text-right text-white">{probability || "—"}%</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Stage</dt>
              <dd className="text-right capitalize text-white">
                {stage.replace(/_/g, " ")}
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
      submitLabel={deal ? "Update" : "Create Deal"}
    />
  );
}
