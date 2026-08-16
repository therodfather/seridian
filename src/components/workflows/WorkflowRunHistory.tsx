"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { LoadingBlock, PageSection, StatusBadge } from "@/components/dashboard/kit";
import { WorkflowRunSteps } from "./WorkflowRunSteps";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface WorkflowRunHistoryProps {
  workflowId: Id<"workflows">;
}

export function WorkflowRunHistory({ workflowId }: WorkflowRunHistoryProps) {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const runs = useQuery(
    api.workflows.listRuns,
    currentUserId ? { currentUserId, workflowId, limit: 15 } : "skip",
  );
  const [selectedRunId, setSelectedRunId] = useState<Id<"workflowRuns"> | null>(
    null,
  );

  return (
    <PageSection
      title="Run history"
      description="Recent executions for this workflow. Expand a run to see step logs."
    >
      {!runs ? (
        <LoadingBlock rows={2} label="Loading runs" />
      ) : runs.length === 0 ? (
        <p className="text-xs text-slate-500">No runs yet.</p>
      ) : (
        <ul className="space-y-2" aria-label="Workflow runs">
          {runs.map((run) => {
            const open = selectedRunId === run._id;
            return (
              <li
                key={run._id}
                className="rounded-lg border border-white/[0.06] bg-[#0a101c]/80"
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-xs",
                    "hover:bg-white/[0.02]",
                  )}
                  onClick={() =>
                    setSelectedRunId(open ? null : run._id)
                  }
                  aria-expanded={open}
                >
                  <span className="text-slate-300">
                    {new Date(run.startedAt).toLocaleString()} · {run.trigger}
                  </span>
                  <StatusBadge
                    tone={
                      run.status === "succeeded"
                        ? "success"
                        : run.status === "failed"
                          ? "danger"
                          : run.status === "running" || run.status === "pending"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {run.status}
                  </StatusBadge>
                </button>
                {open && (
                  <div className="border-t border-white/[0.05] px-3 py-2">
                    {run.errorMessage && (
                      <p className="mb-2 text-[11px] text-rose-400">
                        {run.errorMessage}
                      </p>
                    )}
                    <WorkflowRunSteps runId={run._id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}
