"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@bytecats/ui-kit";
import { Plus, Workflow } from "lucide-react";
import { useState } from "react";
import {
  EmptyState,
  LoadingBlock,
  PageShell,
  StatusBadge,
} from "@/components/dashboard/kit";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { workflowHref } from "@/lib/routes";
import { TRIGGER_LABELS, type WorkflowTriggerType } from "./workflowTypes";

function formatWhen(ms?: number): string {
  if (!ms) return "Never";
  return new Date(ms).toLocaleString();
}

export function WorkflowList() {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const workflows = useQuery(
    api.workflows.list,
    currentUserId ? { currentUserId } : "skip",
  );
  const createWorkflow = useMutation(api.workflows.create);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!currentUserId || creating) return;
    setCreating(true);
    try {
      const id = await createWorkflow({
        currentUserId,
        name: "New workflow",
      });
      window.location.href = workflowHref(id);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  return (
    <PageShell
      title="Workflows"
      description="Automate Seridian work — triggers, sequential actions, publish, and run history."
      icon={<Workflow className="h-5 w-5" aria-hidden="true" />}
      action={
        <Button
          type="button"
          size="sm"
          disabled={!currentUserId || creating}
          onClick={() => void handleCreate()}
          className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {creating ? "Creating…" : "New workflow"}
        </Button>
      }
    >
      {!workflows ? (
        <LoadingBlock rows={2} label="Loading workflows" />
      ) : workflows.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="No workflows yet"
          description="Create a workflow, pick a trigger, add actions, publish, then Run now or call the webhook."
          action={
            <Button
              type="button"
              size="sm"
              disabled={!currentUserId || creating}
              onClick={() => void handleCreate()}
            >
              Create first workflow
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="Workflows">
          {workflows.map((wf) => (
            <li key={wf._id}>
              <Link
                href={workflowHref(wf._id)}
                className="group flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-4 transition-colors hover:border-cyan-500/30 hover:bg-[#0e162a] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                    <Workflow className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white group-hover:text-cyan-300">
                      {wf.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {TRIGGER_LABELS[wf.triggerType as WorkflowTriggerType] ??
                        wf.triggerType}
                      {wf.description ? ` · ${wf.description}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Last run: {formatWhen(wf.lastRunAt)}
                      {wf.lastRunStatus ? ` (${wf.lastRunStatus})` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge
                    tone={wf.status === "live" ? "success" : "neutral"}
                  >
                    {wf.status === "live"
                      ? `Live v${wf.publishedVersion ?? "?"}`
                      : "Draft"}
                  </StatusBadge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
