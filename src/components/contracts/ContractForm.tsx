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

type Contract = Doc<"contracts">;

interface ContractFormProps {
  contract?: Contract;
  onSuccess: () => void;
  onCancel?: () => void;
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ContractForm({ contract, onSuccess, onCancel }: ContractFormProps) {
  const createContract = useMutation(api.contracts.create);
  const updateContract = useMutation(api.contracts.update);
  const clients = useQuery(api.clients.list, {});

  const [name, setName] = useState(contract?.name ?? "");
  const [clientId, setClientId] = useState(contract?.clientId ?? "");
  const [value, setValue] = useState(contract?.value?.toString() ?? "");
  const [startDate, setStartDate] = useState(contract?.startDate ?? todayIsoDate());
  const [endDate, setEndDate] = useState(contract?.endDate ?? "");
  const [body, setBody] = useState(contract?.body ?? "");
  const [notes, setNotes] = useState(contract?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    clientId?: string;
    value?: string;
    startDate?: string;
  }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!clientId) next.clientId = "Client is required";
    const parsed = Number(value);
    if (value.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      next.value = "Enter a valid non-negative value";
    }
    if (!startDate) next.startDate = "Start date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const parsedValue = Number(value);
      if (contract) {
        await updateContract({
          contractId: contract._id,
          name: name.trim(),
          value: parsedValue,
          startDate,
          endDate: endDate || undefined,
          notes: notes.trim() || undefined,
          body: body.trim() || undefined,
        });
        toastMutationSuccess("Contract updated");
      } else {
        await createContract({
          name: name.trim(),
          clientId: clientId as Id<"clients">,
          value: parsedValue,
          status: "draft",
          startDate,
          endDate: endDate || undefined,
          notes: notes.trim() || undefined,
          body: body.trim() || undefined,
        });
        toastMutationSuccess("Contract created");
      }
      onSuccess();
    } catch (error) {
      toastMutationError(
        error,
        contract ? "Failed to update contract" : "Failed to create contract",
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
        No clients yet. Add a client before creating a contract.
      </p>
    ) : (
      <Select
        value={clientId}
        onValueChange={(next) => {
          setClientId(next);
          if (errors.clientId) setErrors((prev) => ({ ...prev, clientId: undefined }));
        }}
        disabled={Boolean(contract)}
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
        <FormSection title="Contract Information">
          <Field label="Name" required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Master Services Agreement"
              className="bg-white/5 border-white/10"
            />
          </Field>
          <FormGrid>
            <Field label="Client" required error={errors.clientId}>
              {clientSelect}
            </Field>
            <Field label="Value ($)" required error={errors.value}>
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
          <FormGrid>
            <Field label="Start date" required error={errors.startDate}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: undefined }));
                }}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "sow",
      label: "Scope",
      fields: (
        <FormSection title="Statement of Work">
          <Field label="Body">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Scope of work, deliverables, and terms..."
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
      submitLabel={contract ? "Update" : "Create Contract"}
    />
  );
}
