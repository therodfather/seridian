"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Input } from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";

interface ChannelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onSuccess: (channelId: Id<"channels">) => void;
}

export function ChannelForm({ open, onOpenChange, currentUserId, onSuccess }: ChannelFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);
  const createChannel = useMutation(api.channels.create);

  async function handleSubmit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const channelId = await createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        createdBy: currentUserId ?? "anonymous",
        participants: [],
      });
      setName("");
      setDescription("");
      setType("public");
      onSuccess(channelId);
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  if (!open) return null;

  const steps = [
    {
      id: "details",
      label: "Details",
      fields: (
        <FormSection title="Channel Information">
          <FormGrid>
            <Field label="Name" required className="sm:col-span-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. general"
                autoFocus
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-white/5 border-white/10"
              />
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      fields: (
        <FormSection title="Channel Type">
          <div className="flex gap-3">
            {(["public", "private"] as const).map((channelType) => (
              <button
                key={channelType}
                type="button"
                onClick={() => setType(channelType)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  type === channelType
                    ? "border-seridian-500/30 bg-seridian-500/10 text-seridian-400"
                    : "border-white/[0.08] bg-white/5 text-slate-500 hover:border-white/[0.12] hover:text-slate-300"
                }`}
              >
                {channelType}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {type === "public"
              ? "Anyone in the workspace can view and join this channel."
              : "Only invited members can access this channel."}
          </p>
        </FormSection>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleCancel}
      />
      <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0c1222] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Channel</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.05] hover:text-slate-300 transition-colors"
          >
            &times;
          </button>
        </div>

        <MultiStepForm
          steps={steps}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitting={saving}
          submitLabel="Create Channel"
        />
      </div>
    </div>
  );
}
