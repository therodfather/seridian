"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { LoadingBlock, StatusBadge } from "@/components/dashboard/kit";

interface WorkflowRunStepsProps {
  runId: Id<"workflowRuns">;
}

export function WorkflowRunSteps({ runId }: WorkflowRunStepsProps) {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const steps = useQuery(
    api.workflows.listRunSteps,
    currentUserId ? { currentUserId, runId } : "skip",
  );

  if (!steps) {
    return <LoadingBlock rows={1} label="Loading step logs" />;
  }

  if (steps.length === 0) {
    return <p className="text-[11px] text-slate-500">No step records.</p>;
  }

  return (
    <ol className="space-y-2" aria-label="Step results">
      {steps.map((step) => (
        <li key={step._id} className="text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-200">
              {step.order + 1}. {step.stepLabel}
            </span>
            <StatusBadge
              tone={
                step.status === "succeeded"
                  ? "success"
                  : step.status === "failed"
                    ? "danger"
                    : step.status === "skipped"
                      ? "neutral"
                      : "warning"
              }
            >
              {step.status}
            </StatusBadge>
            <span className="text-slate-600">{step.stepType}</span>
          </div>
          {step.outputSummary && (
            <p className="mt-0.5 break-all text-slate-500">{step.outputSummary}</p>
          )}
          {step.errorMessage && (
            <p className="mt-0.5 text-rose-400">{step.errorMessage}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
