"use client";

/**
 * Forms list — Business hub entry. Uses TanStack Query + server actions.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@bytecats/ui-kit";
import { ClipboardList, Plus } from "lucide-react";
import {
  EmptyState,
  LoadingBlock,
  PageShell,
  StatusBadge,
} from "@/components/dashboard/kit";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { formHref } from "@/lib/routes";
import { useCreateForm, useFormsList } from "@/lib/forms/queries";
import { toastMutationError } from "@/lib/mutationToast";

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function FormList() {
  const router = useRouter();
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const { data: forms, isLoading, isError, error } = useFormsList(currentUserId);
  const createForm = useCreateForm(currentUserId);

  const handleCreate = async () => {
    if (!currentUserId || createForm.isPending) return;
    try {
      const id = await createForm.mutateAsync({ name: "New form" });
      router.push(formHref(id));
    } catch (err) {
      toastMutationError(err, "Could not create form");
    }
  };

  return (
    <PageShell
      title="Forms"
      description="Build, publish, and collect responses — Formspree + Jotform style, in-house. Submissions can kick Workflows."
      icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
      action={
        <Button
          type="button"
          size="sm"
          disabled={!currentUserId || createForm.isPending}
          onClick={() => void handleCreate()}
          className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {createForm.isPending ? "Creating…" : "New form"}
        </Button>
      }
    >
      {isLoading ? (
        <LoadingBlock rows={2} label="Loading forms" />
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Could not load forms"
          description={error instanceof Error ? error.message : "Try again"}
        />
      ) : !forms || forms.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No forms yet"
          description="Create a form, add fields, publish, share /f/your-slug or the Formspree-style API endpoint."
          action={
            <Button
              type="button"
              size="sm"
              disabled={!currentUserId || createForm.isPending}
              onClick={() => void handleCreate()}
            >
              New form
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#070b14]">
          {forms.map((form) => (
            <li key={form._id}>
              <Link
                href={formHref(form._id)}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {form.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    /f/{form.slug} · {form.fieldCount} fields ·{" "}
                    {form.submissionCount} responses · updated{" "}
                    {formatWhen(form.updatedAt)}
                  </p>
                </div>
                <StatusBadge
                  tone={form.status === "live" ? "success" : "neutral"}
                >
                  {form.status}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
