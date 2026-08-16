"use client";

/**
 * Workflow builder — Name → Trigger → Steps → Review → Publish.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@bytecats/ui-kit";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Save,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import {
  BackLink,
  FlowSteps,
  LoadingBlock,
  PageShell,
  PageSection,
  StatusBadge,
} from "@/components/dashboard/kit";
import { ROUTES } from "@/lib/routes";
import {
  isPublishableGraph,
  STEP_TYPE_LABELS,
  TRIGGER_LABELS,
  type WorkflowGraph,
  type WorkflowTriggerType,
} from "./workflowTypes";
import { WorkflowStepEditor } from "./WorkflowStepEditor";
import { WorkflowRunHistory } from "./WorkflowRunHistory";

const FLOW_STEPS = [
  {
    id: "name",
    label: "Name",
    description: "Name the workflow and add a short description.",
  },
  {
    id: "trigger",
    label: "Trigger",
    description: "Choose how this workflow starts.",
  },
  {
    id: "steps",
    label: "Steps",
    description: "Add sequential actions (HTTP, issues, notes, delay, filter).",
  },
  {
    id: "review",
    label: "Review",
    description: "Confirm the graph looks right before publishing.",
  },
  {
    id: "publish",
    label: "Publish",
    description: "Go live, then Run now or call the webhook.",
  },
];

interface WorkflowBuilderProps {
  workflowId: Id<"workflows">;
}

export function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const workflow = useQuery(
    api.workflows.get,
    currentUserId ? { currentUserId, workflowId } : "skip",
  );
  const saveDraft = useMutation(api.workflows.saveDraft);
  const publish = useMutation(api.workflows.publish);
  const unpublish = useMutation(api.workflows.unpublish);
  const runNow = useMutation(api.workflows.runNow);
  const remove = useMutation(api.workflows.remove);
  const rotateToken = useMutation(api.workflows.rotateWebhookToken);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [graph, setGraph] = useState<WorkflowGraph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (!workflow) return;
    setName(workflow.name);
    setDescription(workflow.description ?? "");
    setGraph(workflow.draftGraph as WorkflowGraph);
    setSelectedId(workflow.draftGraph.steps[0]?.id ?? null);
    setWebhookUrl(workflow.webhookUrl);
    setDirty(false);
  }, [workflow]);

  const updateGraph = (next: WorkflowGraph) => {
    setGraph(next);
    setDirty(true);
  };

  const canAdvanceFromName = name.trim().length > 0;
  const canPublish = graph ? isPublishableGraph(graph) && canAdvanceFromName : false;
  const hasActiveRun = workflow?.hasActiveRun ?? false;

  const handleSave = async () => {
    if (!currentUserId || !graph) return;
    if (!name.trim()) {
      setMessage("Name is required before saving");
      return;
    }
    setBusy("save");
    setMessage(null);
    try {
      await saveDraft({
        currentUserId,
        workflowId,
        name: name.trim(),
        description: description.trim() || undefined,
        draftGraph: graph,
      });
      setDirty(false);
      setMessage("Draft saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    if (!currentUserId || !graph || !canPublish) return;
    setBusy("publish");
    setMessage(null);
    try {
      if (dirty) {
        await saveDraft({
          currentUserId,
          workflowId,
          name: name.trim(),
          description: description.trim() || undefined,
          draftGraph: graph,
        });
        setDirty(false);
      }
      const result = await publish({ currentUserId, workflowId });
      setMessage(`Published v${result.version}`);
      setStep(4);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  const handleRunNow = async () => {
    if (!currentUserId || hasActiveRun) return;
    setBusy("run");
    setMessage(null);
    try {
      await runNow({ currentUserId, workflowId });
      setMessage("Run started");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(null);
    }
  };

  const handleUnpublish = async () => {
    if (!currentUserId) return;
    setBusy("unpublish");
    try {
      await unpublish({ currentUserId, workflowId });
      setMessage("Workflow set back to draft");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId) return;
    if (
      !window.confirm(
        `Archive workflow "${name}"? It will disappear from the list.`,
      )
    ) {
      return;
    }
    setBusy("delete");
    try {
      await remove({ currentUserId, workflowId });
      window.location.href = ROUTES.dashboard.workflows;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
      setBusy(null);
    }
  };

  const handleRotate = async () => {
    if (!currentUserId) return;
    if (
      !window.confirm(
        "Rotate the webhook token? The old URL will stop working immediately.",
      )
    ) {
      return;
    }
    setBusy("rotate");
    try {
      const url = await rotateToken({ currentUserId, workflowId });
      setWebhookUrl(url);
      setMessage("Webhook URL rotated");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Rotate failed");
    } finally {
      setBusy(null);
    }
  };

  const handleNext = () => {
    if (step === 0 && !canAdvanceFromName) {
      setMessage("Enter a name first");
      return;
    }
    if (step === 3 && !canPublish) {
      setMessage("Fix steps before publishing (need at least one valid action)");
      return;
    }
    setMessage(null);
    setStep((s) => Math.min(s + 1, FLOW_STEPS.length - 1));
  };

  if (!workflow || !graph) {
    return (
      <PageShell
        title="Workflow"
        description="Loading…"
        icon={<Workflow className="h-5 w-5" aria-hidden="true" />}
      >
        <LoadingBlock rows={3} label="Loading workflow" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={name || "Workflow"}
      description="Build a trigger → actions graph, publish a version, then run it."
      icon={<Workflow className="h-5 w-5" aria-hidden="true" />}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={workflow.status === "live" ? "success" : "neutral"}>
            {workflow.status === "live"
              ? `Live v${workflow.publishedVersion ?? "?"}`
              : "Draft"}
          </StatusBadge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={Boolean(busy) || !dirty}
            onClick={() => void handleSave()}
            className="border-white/10"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {busy === "save" ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <BackLink href={ROUTES.dashboard.workflows} label="All workflows" />

      <FlowSteps
        steps={FLOW_STEPS}
        current={step}
        onStepChange={setStep}
        allowJump
        className="mt-2"
      />

      {message && (
        <p className="mt-2 text-xs text-cyan-300/90" role="status">
          {message}
        </p>
      )}

      <div className="mt-4 min-h-[220px]">
        {step === 0 && (
          <div className="max-w-lg space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wf-name">Name</Label>
              <Input
                id="wf-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-desc">Description</Label>
              <Textarea
                id="wf-desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDirty(true);
                }}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-lg space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wf-trigger">Trigger type</Label>
              <Select
                value={graph.trigger.type}
                onValueChange={(value) =>
                  updateGraph({
                    ...graph,
                    trigger: {
                      type: value as WorkflowTriggerType,
                      intervalMinutes:
                        value === "schedule"
                          ? graph.trigger.intervalMinutes ?? 60
                          : undefined,
                    },
                  })
                }
              >
                <SelectTrigger id="wf-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIGGER_LABELS) as WorkflowTriggerType[]).map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {TRIGGER_LABELS[t]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {graph.trigger.type === "schedule" && (
              <div className="space-y-1.5">
                <Label htmlFor="wf-interval">Interval (minutes)</Label>
                <Input
                  id="wf-interval"
                  type="number"
                  min={5}
                  max={10080}
                  value={graph.trigger.intervalMinutes ?? 60}
                  onChange={(e) =>
                    updateGraph({
                      ...graph,
                      trigger: {
                        ...graph.trigger,
                        intervalMinutes: Number(e.target.value) || 60,
                      },
                    })
                  }
                />
                <p className="text-[11px] text-slate-500">
                  Minimum 5 minutes. A one-minute Convex cron starts due runs.
                </p>
              </div>
            )}

            {graph.trigger.type === "webhook" && (
              <div className="space-y-2 rounded-lg border border-white/[0.08] bg-[#0a101c] p-3">
                <p className="text-xs font-medium text-slate-300">Webhook URL</p>
                <code className="block break-all text-[11px] text-cyan-300/90">
                  {webhookUrl}
                </code>
                <p className="text-[11px] text-slate-500">
                  POST JSON to this URL after the workflow is live. Rotate the
                  token if it leaks.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-white/10 text-[11px]"
                  disabled={Boolean(busy)}
                  onClick={() => void handleRotate()}
                >
                  {busy === "rotate" ? "Rotating…" : "Rotate token"}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <WorkflowStepEditor
            graph={graph}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={updateGraph}
          />
        )}

        {step === 3 && (
          <PageSection title="Review" description="Sanity-check before publish.">
            <dl className="space-y-2 text-sm text-slate-300">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                  Name
                </dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                  Trigger
                </dt>
                <dd>
                  {TRIGGER_LABELS[graph.trigger.type]}
                  {graph.trigger.type === "schedule"
                    ? ` · every ${graph.trigger.intervalMinutes ?? "?"} min`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                  Steps ({graph.steps.length})
                </dt>
                <dd>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-slate-400">
                    {graph.steps.map((s) => (
                      <li key={s.id}>
                        {s.label}{" "}
                        <span className="text-slate-600">
                          ({STEP_TYPE_LABELS[s.type]})
                        </span>
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            </dl>
            {!canPublish && (
              <p className="mt-3 text-xs text-amber-300">
                Cannot publish yet — add at least one complete action step
                {graph.trigger.type === "schedule"
                  ? " and a valid schedule interval"
                  : ""}
                .
              </p>
            )}
          </PageSection>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <PageSection
              title="Publish & run"
              description="Live workflows execute the published snapshot only."
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(busy) || !canPublish}
                  onClick={() => void handlePublish()}
                  className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {busy === "publish" ? "Publishing…" : "Publish"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-white/10"
                  disabled={
                    Boolean(busy) ||
                    workflow.status !== "live" ||
                    hasActiveRun
                  }
                  onClick={() => void handleRunNow()}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {hasActiveRun
                    ? "Run in progress…"
                    : busy === "run"
                      ? "Starting…"
                      : "Run now"}
                </Button>
                {workflow.status === "live" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={Boolean(busy)}
                    onClick={() => void handleUnpublish()}
                  >
                    {busy === "unpublish" ? "…" : "Unpublish"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-rose-500/30 text-rose-300"
                  disabled={Boolean(busy)}
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Archive
                </Button>
              </div>
              {graph.trigger.type === "webhook" && (
                <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#0a101c] p-3">
                  <p className="text-xs font-medium text-slate-300">
                    Webhook (POST)
                  </p>
                  <code className="mt-1 block break-all text-[11px] text-cyan-300/90">
                    {webhookUrl}
                  </code>
                </div>
              )}
            </PageSection>
            <WorkflowRunHistory workflowId={workflowId} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-white/10"
          disabled={step === 0 || Boolean(busy)}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Back
        </Button>
        {step < FLOW_STEPS.length - 1 && (
          <Button
            type="button"
            size="sm"
            className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
            disabled={
              Boolean(busy) ||
              (step === 0 && !canAdvanceFromName) ||
              (step === 3 && !canPublish)
            }
            onClick={handleNext}
          >
            Next
            <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </PageShell>
  );
}
