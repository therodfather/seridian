/** Client-side workflow graph types mirroring convex/lib/workflowGraph.ts */

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

export const TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  manual: "Manual (Run now)",
  webhook: "Webhook URL",
  schedule: "Schedule (interval)",
};

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
      return { id, type, label, clientId: "", noteText: "" };
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

export function isPublishableGraph(graph: WorkflowGraph): boolean {
  if (!graph.steps.length) return false;
  if (graph.trigger.type === "schedule") {
    const mins = graph.trigger.intervalMinutes;
    if (mins === undefined || mins < 5 || mins > 10080) return false;
  }
  for (const step of graph.steps) {
    if (!step.label.trim()) return false;
    switch (step.type) {
      case "http_request": {
        const url = step.url?.trim() ?? "";
        if (!url || url === "https://") return false;
        try {
          new URL(url);
        } catch {
          return false;
        }
        break;
      }
      case "create_issue":
      case "create_linear_issue":
        if (!step.issueTitle?.trim()) return false;
        break;
      case "append_client_note":
        if (!step.clientId?.trim() || !step.noteText?.trim()) return false;
        break;
      case "delay": {
        const secs = step.delaySeconds ?? 0;
        if (secs < 1 || secs > 3600) return false;
        break;
      }
      case "filter":
        if (!step.filterField?.trim()) return false;
        break;
      default:
        break;
    }
  }
  return true;
}
