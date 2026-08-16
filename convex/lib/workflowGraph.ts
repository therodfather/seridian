/**
 * Workflow graph validators + publish gates.
 * Graphs stay small (nested on draft / version docs) — sequential steps only for MVP.
 */
import { v } from "convex/values";

export const MAX_WORKFLOW_STEPS = 25;
export const MAX_DELAY_SECONDS = 3600;
export const MIN_SCHEDULE_INTERVAL_MINUTES = 5;
export const MAX_SCHEDULE_INTERVAL_MINUTES = 10080; // 7 days

export const workflowTriggerTypeValidator = v.union(
  v.literal("manual"),
  v.literal("webhook"),
  v.literal("schedule"),
);

export const workflowStepTypeValidator = v.union(
  v.literal("http_request"),
  v.literal("create_issue"),
  v.literal("create_linear_issue"),
  v.literal("append_client_note"),
  v.literal("delay"),
  v.literal("filter"),
);

export const httpMethodValidator = v.union(
  v.literal("GET"),
  v.literal("POST"),
  v.literal("PUT"),
  v.literal("PATCH"),
  v.literal("DELETE"),
);

export const issuePriorityValidator = v.union(
  v.literal("urgent"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("none"),
);

export const workflowStepValidator = v.object({
  id: v.string(),
  type: workflowStepTypeValidator,
  label: v.string(),
  /** HTTP */
  url: v.optional(v.string()),
  method: v.optional(httpMethodValidator),
  headersJson: v.optional(v.string()),
  bodyTemplate: v.optional(v.string()),
  /** Dashboard / Linear issue */
  issueTitle: v.optional(v.string()),
  issueDescription: v.optional(v.string()),
  issuePriority: v.optional(issuePriorityValidator),
  /** Client note — store as string id; validated at execute time */
  clientId: v.optional(v.string()),
  noteText: v.optional(v.string()),
  /** Delay */
  delaySeconds: v.optional(v.number()),
  /** Filter: continue only when trigger/context path equals value */
  filterField: v.optional(v.string()),
  filterEquals: v.optional(v.string()),
});

export const workflowGraphValidator = v.object({
  trigger: v.object({
    type: workflowTriggerTypeValidator,
    /** Minutes between schedule fires (required when type=schedule) */
    intervalMinutes: v.optional(v.number()),
  }),
  steps: v.array(workflowStepValidator),
});

export type WorkflowTriggerType = "manual" | "webhook" | "schedule";
export type WorkflowStepType =
  | "http_request"
  | "create_issue"
  | "create_linear_issue"
  | "append_client_note"
  | "delay"
  | "filter";

export type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  label: string;
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headersJson?: string;
  bodyTemplate?: string;
  issueTitle?: string;
  issueDescription?: string;
  issuePriority?: "urgent" | "high" | "medium" | "low" | "none";
  clientId?: string;
  noteText?: string;
  delaySeconds?: number;
  filterField?: string;
  filterEquals?: string;
};

export type WorkflowGraph = {
  trigger: {
    type: WorkflowTriggerType;
    intervalMinutes?: number;
  };
  steps: WorkflowStep[];
};

export const STEP_TYPE_LABELS: Record<WorkflowStepType, string> = {
  http_request: "HTTP request",
  create_issue: "Create dashboard issue",
  create_linear_issue: "Create Linear issue",
  append_client_note: "Append client note",
  delay: "Delay",
  filter: "Filter",
};

export function defaultWorkflowGraph(): WorkflowGraph {
  return {
    trigger: { type: "manual" },
    steps: [],
  };
}

export function newStepId(type: WorkflowStepType): string {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlankStep(type: WorkflowStepType): WorkflowStep {
  const id = newStepId(type);
  const label = STEP_TYPE_LABELS[type];
  switch (type) {
    case "http_request":
      return {
        id,
        type,
        label,
        url: "https://",
        method: "POST",
        headersJson: "{}",
        bodyTemplate: "",
      };
    case "create_issue":
      return {
        id,
        type,
        label,
        issueTitle: "Workflow issue",
        issueDescription: "",
        issuePriority: "medium",
      };
    case "create_linear_issue":
      return {
        id,
        type,
        label,
        issueTitle: "Workflow Linear issue",
        issueDescription: "",
      };
    case "append_client_note":
      return {
        id,
        type,
        label,
        clientId: "",
        noteText: "",
      };
    case "delay":
      return { id, type, label, delaySeconds: 30 };
    case "filter":
      return {
        id,
        type,
        label,
        filterField: "event",
        filterEquals: "ok",
      };
    default:
      return { id, type, label };
  }
}

/** Publish / run gate — empty action list is not a valid live workflow. */
export function assertPublishableGraph(graph: WorkflowGraph): void {
  if (!graph.steps.length) {
    throw new Error("Add at least one action step before publishing");
  }
  if (graph.steps.length > MAX_WORKFLOW_STEPS) {
    throw new Error(`At most ${MAX_WORKFLOW_STEPS} steps allowed`);
  }

  if (graph.trigger.type === "schedule") {
    const mins = graph.trigger.intervalMinutes;
    if (
      mins === undefined ||
      !Number.isFinite(mins) ||
      mins < MIN_SCHEDULE_INTERVAL_MINUTES ||
      mins > MAX_SCHEDULE_INTERVAL_MINUTES
    ) {
      throw new Error(
        `Schedule interval must be ${MIN_SCHEDULE_INTERVAL_MINUTES}–${MAX_SCHEDULE_INTERVAL_MINUTES} minutes`,
      );
    }
  }

  for (const step of graph.steps) {
    if (!step.label.trim()) {
      throw new Error("Every step needs a label");
    }
    switch (step.type) {
      case "http_request": {
        const url = step.url?.trim() ?? "";
        if (!url || url === "https://") {
          throw new Error(`HTTP step "${step.label}" needs a URL`);
        }
        try {
          // eslint-disable-next-line no-new
          new URL(url);
        } catch {
          throw new Error(`HTTP step "${step.label}" has an invalid URL`);
        }
        break;
      }
      case "create_issue":
      case "create_linear_issue":
        if (!step.issueTitle?.trim()) {
          throw new Error(`Issue step "${step.label}" needs a title`);
        }
        break;
      case "append_client_note":
        if (!step.clientId?.trim()) {
          throw new Error(`Client note step "${step.label}" needs a client`);
        }
        if (!step.noteText?.trim()) {
          throw new Error(`Client note step "${step.label}" needs note text`);
        }
        break;
      case "delay": {
        const secs = step.delaySeconds ?? 0;
        if (!Number.isFinite(secs) || secs < 1 || secs > MAX_DELAY_SECONDS) {
          throw new Error(
            `Delay step "${step.label}" must be 1–${MAX_DELAY_SECONDS} seconds`,
          );
        }
        break;
      }
      case "filter":
        if (!step.filterField?.trim()) {
          throw new Error(`Filter step "${step.label}" needs a field path`);
        }
        break;
      default:
        break;
    }
  }
}

export function isPublishableGraph(graph: WorkflowGraph): boolean {
  try {
    assertPublishableGraph(graph);
    return true;
  } catch {
    return false;
  }
}

/** Read a dotted path from a JSON-ish object (trigger payload / context). */
export function readPath(root: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function truncateText(value: string, max = 2000): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}
