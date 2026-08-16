"use client";

/**
 * Multi-step form builder: Basics → Fields → Settings → Publish.
 * Backed by TanStack Query + Next server actions → Convex.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Textarea } from "@bytecats/ui-kit";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import {
  BackLink,
  EmptyState,
  FlowSteps,
  LoadingBlock,
  PageSection,
  PageShell,
  StatusBadge,
} from "@/components/dashboard/kit";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { ROUTES } from "@/lib/routes";
import {
  useArchiveForm,
  useFormDetail,
  useFormSubmissions,
  useMarkSubmissionRead,
  usePublishForm,
  useSaveFormDraft,
  useUnpublishForm,
} from "@/lib/forms/queries";
import {
  toastMutationError,
  toastMutationSuccess,
} from "@/lib/mutationToast";
import {
  createBlankField,
  FIELD_TYPE_LABELS,
  type FormField,
  type FormFieldType,
} from "./formTypes";

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "fields", label: "Fields" },
  { id: "settings", label: "Settings" },
  { id: "publish", label: "Publish" },
];

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FormFieldType[];

export function FormBuilder({ formId }: { formId: string }) {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const { data: form, isLoading } = useFormDetail(currentUserId, formId);
  const saveDraft = useSaveFormDraft(currentUserId, formId);
  const publish = usePublishForm(currentUserId, formId);
  const unpublish = useUnpublishForm(currentUserId, formId);
  const archive = useArchiveForm(currentUserId);
  const { data: submissions } = useFormSubmissions(currentUserId, formId);
  const markRead = useMarkSubmissionRead(currentUserId, formId);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [submitButtonLabel, setSubmitButtonLabel] = useState("Submit");
  const [successMessage, setSuccessMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [notifyWebhookUrl, setNotifyWebhookUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!form || hydrated) return;
    setName(form.name);
    setDescription(form.description ?? "");
    setSlug(form.slug);
    setFields(form.draftFields as FormField[]);
    setSubmitButtonLabel(form.submitButtonLabel);
    setSuccessMessage(form.successMessage);
    setRedirectUrl(form.redirectUrl ?? "");
    setNotifyWebhookUrl(form.notifyWebhookUrl ?? "");
    setHydrated(true);
  }, [form, hydrated]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return `/f/${slug}`;
    return `${window.location.origin}/f/${slug}`;
  }, [slug]);

  const apiUrl = useMemo(() => {
    const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.replace(/\/$/, "");
    if (site) return `${site}/forms/${slug}`;
    return `(CONVEX_SITE_URL)/forms/${slug}`;
  }, [slug]);

  const handleSave = async () => {
    try {
      await saveDraft.mutateAsync({
        name,
        description: description || undefined,
        slug,
        draftFields: fields,
        submitButtonLabel,
        successMessage,
        redirectUrl: redirectUrl || undefined,
        notifyWebhookUrl: notifyWebhookUrl || undefined,
      });
      toastMutationSuccess("Draft saved");
    } catch (err) {
      toastMutationError(err, "Save failed");
    }
  };

  const handlePublish = async () => {
    try {
      await saveDraft.mutateAsync({
        name,
        description: description || undefined,
        slug,
        draftFields: fields,
        submitButtonLabel,
        successMessage,
        redirectUrl: redirectUrl || undefined,
        notifyWebhookUrl: notifyWebhookUrl || undefined,
      });
      const result = await publish.mutateAsync();
      toastMutationSuccess(`Published v${result.version}`);
    } catch (err) {
      toastMutationError(err, "Publish failed");
    }
  };

  if (!currentUserId || isLoading || !hydrated) {
    return (
      <PageShell title="Form" description="Loading builder…">
        <LoadingBlock rows={3} label="Loading form" />
      </PageShell>
    );
  }

  if (!form) {
    return (
      <PageShell title="Form" description="Not found">
        <EmptyState
          icon="🔍"
          title="Form not found"
          description="It may have been archived."
          action={
            <Button asChild size="sm">
              <Link href={ROUTES.dashboard.forms}>Back to Forms</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const busy =
    saveDraft.isPending || publish.isPending || unpublish.isPending;

  return (
    <PageShell
      title={name || "Form"}
      description="Multi-step builder — Basics → Fields → Settings → Publish. Responses sync here and can start Workflows."
      icon={<StatusBadge tone={form.status === "live" ? "success" : "neutral"}>{form.status}</StatusBadge>}
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/10 text-xs"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {saveDraft.isPending ? "Saving…" : "Save draft"}
          </Button>
          {form.status === "live" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10 text-xs"
              disabled={busy}
              onClick={() =>
                void unpublish.mutateAsync().then(
                  () => toastMutationSuccess("Unpublished"),
                  (e) => toastMutationError(e, "Unpublish failed"),
                )
              }
            >
              Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
              disabled={busy}
              onClick={() => void handlePublish()}
            >
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      }
    >
      <BackLink href={ROUTES.dashboard.forms} label="Back to Forms" />

      <FlowSteps
        steps={STEPS}
        current={step}
        onStepChange={setStep}
        allowJump
      />

      {step === 0 && (
        <PageSection title="Basics" description="Name and public slug.">
          <div className="grid max-w-xl gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="form-name">Name</Label>
              <Input
                id="form-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-white/10 bg-[#0c1222]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-slug">Public slug</Label>
              <Input
                id="form-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="border-white/10 bg-[#0c1222] font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Live page: <code className="text-slate-400">{publicUrl}</code>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-desc">Description</Label>
              <Textarea
                id="form-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="border-white/10 bg-[#0c1222]"
              />
            </div>
            <Button type="button" size="sm" onClick={() => setStep(1)}>
              Next: Fields
            </Button>
          </div>
        </PageSection>
      )}

      {step === 1 && (
        <PageSection
          title="Fields"
          description="Add Jotform-style inputs. Select needs options. Optional show-if for simple branching."
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {FIELD_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant="outline"
                className="border-white/10 text-xs"
                onClick={() => setFields((f) => [...f, createBlankField(type)])}
              >
                <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                {FIELD_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
          <ul className="space-y-3">
            {fields.map((field, index) => (
              <li
                key={field.id}
                className="rounded-xl border border-white/[0.08] bg-[#070b14] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-cyan-400">
                    {FIELD_TYPE_LABELS[field.type]}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() =>
                        setFields((all) => {
                          const next = [...all];
                          [next[index - 1], next[index]] = [
                            next[index]!,
                            next[index - 1]!,
                          ];
                          return next;
                        })
                      }
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Move down"
                      disabled={index === fields.length - 1}
                      onClick={() =>
                        setFields((all) => {
                          const next = [...all];
                          [next[index], next[index + 1]] = [
                            next[index + 1]!,
                            next[index]!,
                          ];
                          return next;
                        })
                      }
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Delete field"
                      className="text-red-300"
                      onClick={() =>
                        setFields((all) => all.filter((f) => f.id !== field.id))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        setFields((all) =>
                          all.map((f) =>
                            f.id === field.id
                              ? { ...f, label: e.target.value }
                              : f,
                          ),
                        )
                      }
                      className="border-white/10 bg-[#0c1222] text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Name (payload key)</Label>
                    <Input
                      value={field.name}
                      onChange={(e) =>
                        setFields((all) =>
                          all.map((f) =>
                            f.id === field.id
                              ? { ...f, name: e.target.value }
                              : f,
                          ),
                        )
                      }
                      className="border-white/10 bg-[#0c1222] font-mono text-xs"
                    />
                  </div>
                  {field.type !== "checkbox" && field.type !== "select" && (
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Placeholder</Label>
                      <Input
                        value={field.placeholder ?? ""}
                        onChange={(e) =>
                          setFields((all) =>
                            all.map((f) =>
                              f.id === field.id
                                ? { ...f, placeholder: e.target.value }
                                : f,
                            ),
                          )
                        }
                        className="border-white/10 bg-[#0c1222] text-sm"
                      />
                    </div>
                  )}
                  {field.type === "select" && (
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={(field.options ?? []).join("\n")}
                        onChange={(e) =>
                          setFields((all) =>
                            all.map((f) =>
                              f.id === field.id
                                ? {
                                    ...f,
                                    options: e.target.value
                                      .split("\n")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }
                                : f,
                            ),
                          )
                        }
                        rows={3}
                        className="border-white/10 bg-[#0c1222] text-sm"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        setFields((all) =>
                          all.map((f) =>
                            f.id === field.id
                              ? { ...f, required: e.target.checked }
                              : f,
                          ),
                        )
                      }
                    />
                    Required
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button type="button" size="sm" onClick={() => setStep(2)}>
              Next: Settings
            </Button>
          </div>
        </PageSection>
      )}

      {step === 2 && (
        <PageSection
          title="Settings"
          description="Thank-you copy, optional redirect, and Formspree-style notify webhook."
        >
          <div className="grid max-w-xl gap-3">
            <div className="space-y-1.5">
              <Label>Submit button label</Label>
              <Input
                value={submitButtonLabel}
                onChange={(e) => setSubmitButtonLabel(e.target.value)}
                className="border-white/10 bg-[#0c1222]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Success message</Label>
              <Textarea
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                rows={2}
                className="border-white/10 bg-[#0c1222]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Redirect URL (optional)</Label>
              <Input
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://…"
                className="border-white/10 bg-[#0c1222]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notify webhook URL (optional)</Label>
              <Input
                value={notifyWebhookUrl}
                onChange={(e) => setNotifyWebhookUrl(e.target.value)}
                placeholder="https://hooks.example/…"
                className="border-white/10 bg-[#0c1222] font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500">
                POSTed JSON on each API submission (Formspree-style). Prefer
                Workflows → form_submission for richer automation.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" size="sm" onClick={() => setStep(3)}>
                Next: Publish
              </Button>
            </div>
          </div>
        </PageSection>
      )}

      {step === 3 && (
        <PageSection
          title="Publish & share"
          description="Go live, copy links, wire Workflows, review inbox."
        >
          <div className="grid max-w-2xl gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#070b14] p-4 text-sm text-slate-300">
              <p className="font-medium text-white">Hosted page</p>
              <p className="mt-1 break-all font-mono text-xs text-cyan-400">
                {publicUrl}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 border-white/10 text-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(publicUrl);
                  toastMutationSuccess("Copied page URL");
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#070b14] p-4 text-sm text-slate-300">
              <p className="font-medium text-white">Formspree-style API</p>
              <p className="mt-1 break-all font-mono text-xs text-cyan-400">
                POST {apiUrl}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-2 text-[10px] text-slate-400">{`curl -X POST ${apiUrl} \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Ada","email":"ada@ex.com","message":"Hi"}'`}</pre>
            </div>
            <p className="text-xs text-slate-500">
              Automate replies in{" "}
              <Link href={ROUTES.dashboard.workflows} className="text-cyan-400 hover:underline">
                Workflows
              </Link>{" "}
              with trigger <code className="text-slate-400">form_submission</code>{" "}
              (optional form slug filter: <code className="text-slate-400">{slug}</code>).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
                disabled={busy}
                onClick={() => void handlePublish()}
              >
                {publish.isPending ? "Publishing…" : "Save & publish"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-500/30 text-xs text-red-300"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Archive this form?")) return;
                  void archive.mutateAsync(formId).then(
                    () => {
                      toastMutationSuccess("Archived");
                      window.location.href = ROUTES.dashboard.forms;
                    },
                    (e) => toastMutationError(e, "Archive failed"),
                  );
                }}
              >
                Archive
              </Button>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="mb-2 text-sm font-semibold text-white">
              Submissions ({submissions?.length ?? 0})
            </h3>
            {!submissions?.length ? (
              <p className="text-xs text-slate-500">No responses yet.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
                {submissions.map((row) => (
                  <li
                    key={row._id}
                    className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className={row.read ? "text-slate-500" : "text-slate-200"}>
                        {row.preview}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {new Date(row.createdAt).toLocaleString()} · {row.source}
                      </p>
                    </div>
                    {!row.read && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-[10px]"
                        onClick={() =>
                          void markRead.mutateAsync({
                            submissionId: row._id,
                            read: true,
                          })
                        }
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PageSection>
      )}
    </PageShell>
  );
}
