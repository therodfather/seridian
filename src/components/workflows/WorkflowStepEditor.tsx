"use client";

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
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Doc } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  createBlankStep,
  STEP_TYPE_LABELS,
  type WorkflowGraph,
  type WorkflowStep,
  type WorkflowStepType,
} from "./workflowTypes";

const STEP_TYPES = Object.keys(STEP_TYPE_LABELS) as WorkflowStepType[];

interface WorkflowStepEditorProps {
  graph: WorkflowGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (graph: WorkflowGraph) => void;
}

export function WorkflowStepEditor({
  graph,
  selectedId,
  onSelect,
  onChange,
}: WorkflowStepEditorProps) {
  const clients = useQuery(api.clients.list, { status: "active" });
  const selected = graph.steps.find((s) => s.id === selectedId) ?? null;

  const handleAdd = (type: WorkflowStepType) => {
    const step = createBlankStep(type);
    onChange({ ...graph, steps: [...graph.steps, step] });
    onSelect(step.id);
  };

  const handleUpdate = (step: WorkflowStep) => {
    onChange({
      ...graph,
      steps: graph.steps.map((s) => (s.id === step.id ? step : s)),
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    if (
      !window.confirm(
        `Delete step "${selected.label}"? This cannot be undone in the draft until you save.`,
      )
    ) {
      return;
    }
    const steps = graph.steps.filter((s) => s.id !== selected.id);
    onChange({ ...graph, steps });
    onSelect(steps[0]?.id ?? null);
  };

  const handleMove = (dir: -1 | 1) => {
    if (!selected) return;
    const idx = graph.steps.findIndex((s) => s.id === selected.id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= graph.steps.length) return;
    const steps = [...graph.steps];
    const [item] = steps.splice(idx, 1);
    steps.splice(next, 0, item!);
    onChange({ ...graph, steps });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Add step</span>
          {STEP_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-white/10 bg-transparent text-[11px] text-slate-300"
              onClick={() => handleAdd(type)}
            >
              <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
              {STEP_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>

        {graph.steps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
            No actions yet. Add at least one step before publishing.
          </p>
        ) : (
          <ol className="space-y-2" aria-label="Workflow steps">
            {graph.steps.map((step, i) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    selectedId === step.id
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/[0.06] bg-[#0a101c]/80 hover:border-white/15",
                  )}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-[10px] text-slate-400">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {step.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {STEP_TYPE_LABELS[step.type]}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-4">
        {!selected ? (
          <p className="text-xs text-slate-500">Select a step to edit its settings.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{selected.label}</p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-white/10 text-[11px]"
                  onClick={() => handleMove(-1)}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-white/10 text-[11px]"
                  onClick={() => handleMove(1)}
                >
                  Down
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-rose-500/30 text-[11px] text-rose-300"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="step-label">Label</Label>
              <Input
                id="step-label"
                value={selected.label}
                onChange={(e) =>
                  handleUpdate({ ...selected, label: e.target.value })
                }
              />
            </div>

            {selected.type === "http_request" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="step-method">Method</Label>
                  <Select
                    value={selected.method ?? "POST"}
                    onValueChange={(value) =>
                      handleUpdate({
                        ...selected,
                        method: value as WorkflowStep["method"],
                      })
                    }
                  >
                    <SelectTrigger id="step-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map(
                        (m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="step-url">URL</Label>
                  <Input
                    id="step-url"
                    value={selected.url ?? ""}
                    onChange={(e) =>
                      handleUpdate({ ...selected, url: e.target.value })
                    }
                    placeholder="https://example.com/hook"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="step-headers">Headers (JSON)</Label>
                  <Textarea
                    id="step-headers"
                    value={selected.headersJson ?? "{}"}
                    onChange={(e) =>
                      handleUpdate({ ...selected, headersJson: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="step-body">
                    Body template (use {"{{trigger.field}}"})
                  </Label>
                  <Textarea
                    id="step-body"
                    value={selected.bodyTemplate ?? ""}
                    onChange={(e) =>
                      handleUpdate({
                        ...selected,
                        bodyTemplate: e.target.value,
                      })
                    }
                    rows={4}
                  />
                </div>
              </>
            )}

            {(selected.type === "create_issue" ||
              selected.type === "create_linear_issue") && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="issue-title">Title</Label>
                  <Input
                    id="issue-title"
                    value={selected.issueTitle ?? ""}
                    onChange={(e) =>
                      handleUpdate({ ...selected, issueTitle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="issue-desc">Description</Label>
                  <Textarea
                    id="issue-desc"
                    value={selected.issueDescription ?? ""}
                    onChange={(e) =>
                      handleUpdate({
                        ...selected,
                        issueDescription: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
                {selected.type === "create_issue" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-priority">Priority</Label>
                    <Select
                      value={selected.issuePriority ?? "medium"}
                      onValueChange={(value) =>
                        handleUpdate({
                          ...selected,
                          issuePriority:
                            value as WorkflowStep["issuePriority"],
                        })
                      }
                    >
                      <SelectTrigger id="issue-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "urgent",
                            "high",
                            "medium",
                            "low",
                            "none",
                          ] as const
                        ).map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {selected.type === "append_client_note" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="client-id">Client</Label>
                  <Select
                    value={selected.clientId || undefined}
                    onValueChange={(value) =>
                      handleUpdate({ ...selected, clientId: value })
                    }
                  >
                    <SelectTrigger id="client-id">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {((clients as Array<Doc<"clients">> | undefined) ?? []).map((c: Doc<"clients">) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.company || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note-text">Note text</Label>
                  <Textarea
                    id="note-text"
                    value={selected.noteText ?? ""}
                    onChange={(e) =>
                      handleUpdate({ ...selected, noteText: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </>
            )}

            {selected.type === "send_email" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email-to">To (comma-separated)</Label>
                  <Input
                    id="email-to"
                    value={selected.emailTo ?? ""}
                    onChange={(e) =>
                      handleUpdate({ ...selected, emailTo: e.target.value })
                    }
                    placeholder="ops@… — templates: {{trigger.email}}"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    value={selected.emailSubject ?? ""}
                    onChange={(e) =>
                      handleUpdate({
                        ...selected,
                        emailSubject: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-body">Body</Label>
                  <Textarea
                    id="email-body"
                    value={selected.emailBody ?? ""}
                    onChange={(e) =>
                      handleUpdate({ ...selected, emailBody: e.target.value })
                    }
                    rows={5}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-500">
                    Uses Resend (Settings → Integrations). Templates like{" "}
                    <code className="text-slate-400">{"{{trigger}}"}</code>.
                  </p>
                </div>
              </>
            )}

            {selected.type === "delay" && (
              <div className="space-y-1.5">
                <Label htmlFor="delay-secs">Delay (seconds)</Label>
                <Input
                  id="delay-secs"
                  type="number"
                  min={1}
                  max={3600}
                  value={selected.delaySeconds ?? 30}
                  onChange={(e) =>
                    handleUpdate({
                      ...selected,
                      delaySeconds: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
            )}

            {selected.type === "filter" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-field">
                    Field path (on trigger payload)
                  </Label>
                  <Input
                    id="filter-field"
                    value={selected.filterField ?? ""}
                    onChange={(e) =>
                      handleUpdate({
                        ...selected,
                        filterField: e.target.value,
                      })
                    }
                    placeholder="event"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-equals">Must equal</Label>
                  <Input
                    id="filter-equals"
                    value={selected.filterEquals ?? ""}
                    onChange={(e) =>
                      handleUpdate({
                        ...selected,
                        filterEquals: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
