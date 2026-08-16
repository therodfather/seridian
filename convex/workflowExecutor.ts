/**
 * Sequential workflow executor. Durability for MVP: each step (and delays)
 * is scheduled via ctx.scheduler so the run survives process boundaries.
 */
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  readPath,
  truncateText,
  type WorkflowStep,
} from "./lib/workflowGraph";
import type { Id } from "./_generated/dataModel";

type TriggerContext = {
  trigger: unknown;
  steps: Record<string, unknown>;
};

function parseJsonSafe(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { raw };
  }
}

function applyTemplate(template: string, ctx: TriggerContext): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value =
      path === "trigger"
        ? ctx.trigger
        : path.startsWith("trigger.")
          ? readPath(ctx.trigger, path.slice("trigger.".length))
          : readPath(ctx, path);
    if (value === undefined || value === null) return "";
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}

async function runHttp(
  step: WorkflowStep,
  ctx: TriggerContext,
): Promise<string> {
  const url = applyTemplate(step.url?.trim() ?? "", ctx);
  const method = step.method ?? "POST";
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (step.headersJson?.trim()) {
    try {
      const parsed = JSON.parse(step.headersJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        headers = {
          ...headers,
          ...(parsed as Record<string, string>),
        };
      }
    } catch {
      throw new Error("headersJson must be a JSON object");
    }
  }
  const body =
    method === "GET" || method === "DELETE"
      ? undefined
      : applyTemplate(step.bodyTemplate ?? "", ctx);

  const res = await fetch(url, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${truncateText(text, 500)}`);
  }
  return truncateText(`HTTP ${res.status}: ${text}`, 2000);
}

async function createLinearIssue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: (ref: any, args: any) => Promise<any>,
  step: WorkflowStep,
  ctx: TriggerContext,
): Promise<string> {
  const apiKey: string | null = await runQuery(internal.secrets.getSecretValue, {
    name: "LINEAR_API_KEY",
  });
  const key = apiKey ?? process.env.LINEAR_API_KEY;
  if (!key) {
    throw new Error(
      "LINEAR_API_KEY is not configured (Settings → Integrations or convex env)",
    );
  }
  const config = await runQuery(internal.integrations.getLinearConfig, {});
  const teamId = config?.teamId as string | undefined;
  if (!teamId) {
    throw new Error(
      "Linear teamId is not configured in Settings → Integrations",
    );
  }

  const title = applyTemplate(step.issueTitle ?? "", ctx);
  const description = applyTemplate(step.issueDescription ?? "", ctx);
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key,
    },
    body: JSON.stringify({
      query: `mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }`,
      variables: {
        input: {
          teamId,
          title,
          description: description || undefined,
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Linear HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: {
      issueCreate?: {
        success?: boolean;
        issue?: { id: string; identifier: string; url: string };
      };
    };
    errors?: { message?: string }[];
  };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  const issue = json.data?.issueCreate?.issue;
  if (!json.data?.issueCreate?.success || !issue) {
    throw new Error("Linear issueCreate failed");
  }
  return `${issue.identifier} ${issue.url}`;
}

export const executeFromStep = internalAction({
  args: {
    runId: v.id("workflowRuns"),
    stepIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const runCtx = await ctx.runQuery(internal.workflows.getRunContext, {
      runId: args.runId,
    });
    if (!runCtx) return null;
    if (runCtx.status === "failed" || runCtx.status === "cancelled") {
      return null;
    }

    await ctx.runMutation(internal.workflows.markRunRunning, {
      runId: args.runId,
    });

    const trigger = parseJsonSafe(runCtx.triggerPayload);
    const context: TriggerContext = { trigger, steps: {} };

    if (args.stepIndex >= runCtx.steps.length) {
      await ctx.runMutation(internal.workflows.finishRun, {
        runId: args.runId,
        status: "succeeded",
      });
      return null;
    }

    const step = runCtx.steps[args.stepIndex] as WorkflowStep;

    try {
      if (step.type === "delay") {
        const secs = Math.max(1, Math.floor(step.delaySeconds ?? 1));
        await ctx.runMutation(internal.workflows.markStepStart, {
          runId: args.runId,
          order: args.stepIndex,
          inputSummary: `Delay ${secs}s`,
        });
        await ctx.runMutation(internal.workflows.markStepFinish, {
          runId: args.runId,
          order: args.stepIndex,
          status: "succeeded",
          outputSummary: `Scheduled continuation after ${secs}s`,
        });
        await ctx.scheduler.runAfter(
          secs * 1000,
          internal.workflowExecutor.executeFromStep,
          { runId: args.runId, stepIndex: args.stepIndex + 1 },
        );
        return null;
      }

      await ctx.runMutation(internal.workflows.markStepStart, {
        runId: args.runId,
        order: args.stepIndex,
        inputSummary: step.label,
      });

      let output = "";

      switch (step.type) {
        case "filter": {
          const field = step.filterField?.trim() ?? "";
          const expected = step.filterEquals ?? "";
          const actual = readPath(trigger, field);
          const actualStr =
            actual === undefined || actual === null
              ? ""
              : typeof actual === "string"
                ? actual
                : JSON.stringify(actual);
          const pass = actualStr === expected;
          output = pass
            ? `Filter passed (${field}=${actualStr})`
            : `Filter blocked (${field}=${actualStr}, expected ${expected})`;
          await ctx.runMutation(internal.workflows.markStepFinish, {
            runId: args.runId,
            order: args.stepIndex,
            status: "succeeded",
            outputSummary: output,
          });
          if (!pass) {
            await ctx.runMutation(internal.workflows.skipRemainingSteps, {
              runId: args.runId,
              fromOrder: args.stepIndex + 1,
            });
            await ctx.runMutation(internal.workflows.finishRun, {
              runId: args.runId,
              status: "succeeded",
            });
            return null;
          }
          break;
        }
        case "http_request":
          output = await runHttp(step, context);
          break;
        case "create_issue": {
          const title = applyTemplate(step.issueTitle ?? "", context);
          const description = applyTemplate(
            step.issueDescription ?? "",
            context,
          );
          const issueId: Id<"issues"> = await ctx.runMutation(
            internal.workflows.createDashboardIssue,
            {
              title,
              description,
              priority: step.issuePriority ?? "medium",
            },
          );
          output = `Created issue ${issueId}`;
          break;
        }
        case "create_linear_issue":
          output = await createLinearIssue(ctx.runQuery, step, context);
          break;
        case "append_client_note": {
          const clientId = step.clientId?.trim();
          if (!clientId) throw new Error("clientId required");
          const noteText = applyTemplate(step.noteText ?? "", context);
          await ctx.runMutation(internal.workflows.appendClientNote, {
            clientId: clientId as Id<"clients">,
            noteText,
          });
          output = "Appended client note";
          break;
        }
        case "send_email": {
          const toRaw = applyTemplate(step.emailTo ?? "", context);
          const to = toRaw
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          const subject = applyTemplate(step.emailSubject ?? "", context);
          const text = applyTemplate(step.emailBody ?? "", context);
          const result = await ctx.runAction(internal.resend.sendEmail, {
            to,
            subject,
            text,
          });
          if (!result.ok) {
            throw new Error(result.error ?? "Resend send failed");
          }
          output = `Email sent${result.id ? ` (${result.id})` : ""}`;
          break;
        }
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      context.steps[step.id] = output;
      await ctx.runMutation(internal.workflows.markStepFinish, {
        runId: args.runId,
        order: args.stepIndex,
        status: "succeeded",
        outputSummary: output,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.workflowExecutor.executeFromStep,
        { runId: args.runId, stepIndex: args.stepIndex + 1 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Step failed";
      await ctx.runMutation(internal.workflows.markStepFinish, {
        runId: args.runId,
        order: args.stepIndex,
        status: "failed",
        errorMessage: message,
      });
      await ctx.runMutation(internal.workflows.finishRun, {
        runId: args.runId,
        status: "failed",
        errorMessage: message,
      });
    }

    return null;
  },
});
