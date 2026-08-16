"use client";

/**
 * Public form renderer — used on /f/[slug] and embeds.
 * TanStack Query loads definition; submit goes through server action.
 */
import { useMemo, useState } from "react";
import { Button, Input, Label, Textarea } from "@bytecats/ui-kit";
import {
  usePublicForm,
  useSubmitPublicForm,
} from "@/lib/forms/queries";
import type { FormField } from "./formTypes";

function visibleFields(
  fields: FormField[],
  values: Record<string, unknown>,
): FormField[] {
  return fields.filter((field) => {
    if (!field.showIfFieldId) return true;
    const other = fields.find((f) => f.id === field.showIfFieldId);
    if (!other) return true;
    return String(values[other.name] ?? "") === (field.showIfEquals ?? "");
  });
}

export function PublicFormView({
  slug,
  source = "public_page",
}: {
  slug: string;
  source?: "public_page" | "embed";
}) {
  const { data: form, isLoading, isError } = usePublicForm(slug);
  const submit = useSubmitPublicForm(slug);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [honeypot, setHoneypot] = useState("");
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(
    () => (form ? visibleFields(form.fields as FormField[], values) : []),
    [form, values],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm text-slate-400">
        Loading form…
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm text-slate-400">
        This form is unavailable or not published.
      </div>
    );
  }

  if (doneMessage) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-white">{form.name}</h1>
        <p className="mt-3 text-sm text-slate-300">{doneMessage}</p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await submit.mutateAsync({
        values,
        website: honeypot,
        source,
      });
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setDoneMessage(result.successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {form.name}
      </h1>
      {form.description && (
        <p className="mt-2 text-sm text-slate-400">{form.description}</p>
      )}
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        {/* Honeypot */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>

        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={field.id}
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? "")}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.name]: e.target.value }))
                }
                rows={4}
                className="border-white/10 bg-[#0c1222]"
              />
            ) : field.type === "select" ? (
              <select
                id={field.id}
                required={field.required}
                value={String(values[field.name] ?? "")}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.name]: e.target.value }))
                }
                className="w-full rounded-md border border-white/10 bg-[#0c1222] px-3 py-2 text-sm text-white"
              >
                <option value="">Select…</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  id={field.id}
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [field.name]: e.target.checked,
                    }))
                  }
                />
                {field.helpText || field.label}
              </label>
            ) : (
              <Input
                id={field.id}
                type={
                  field.type === "email"
                    ? "email"
                    : field.type === "number"
                      ? "number"
                      : field.type === "url"
                        ? "url"
                        : field.type === "date"
                          ? "date"
                          : field.type === "phone"
                            ? "tel"
                            : "text"
                }
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? "")}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.name]: e.target.value }))
                }
                className="border-white/10 bg-[#0c1222]"
              />
            )}
            {field.helpText && field.type !== "checkbox" && (
              <p className="text-[11px] text-slate-500">{field.helpText}</p>
            )}
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={submit.isPending}
          className="w-full bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
        >
          {submit.isPending ? "Sending…" : form.submitButtonLabel}
        </Button>
      </form>
    </div>
  );
}
