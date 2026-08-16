/**
 * Workflow CRUD: draft graphs, publish versions, list / get for dashboard.
 * Execution lives in workflowExecutor.ts.
 */
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/admin";
import {
  assertPublishableGraph,
  defaultWorkflowGraph,
  truncateText,
  workflowGraphValidator,
  workflowStepValidator,
  type WorkflowGraph,
} from "./lib/workflowGraph";
const runStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("cancelled"),
);

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function webhookUrlForToken(token: string): string {
  const site = process.env.CONVEX_SITE_URL?.replace(/\/$/, "");
  const path = `/workflows/webhook/${token}`;
  return site ? `${site}${path}` : path;
}

const summaryValidator = v.object({
  _id: v.id("workflows"),
  name: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("draft"),
    v.literal("live"),
    v.literal("archived"),
  ),
  publishedVersion: v.optional(v.number()),
  lastRunAt: v.optional(v.number()),
  lastRunStatus: v.optional(runStatusValidator),
  triggerType: v.union(
    v.literal("manual"),
    v.literal("webhook"),
    v.literal("schedule"),
  ),
  updatedAt: v.number(),
});

export const list = query({
  args: { currentUserId: v.string() },
  returns: v.array(summaryValidator),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const rows = await ctx.db.query("workflows").order("desc").take(100);
    return rows
      .filter((w) => w.status !== "archived")
      .map((w) => ({
        _id: w._id,
        name: w.name,
        description: w.description,
        status: w.status,
        publishedVersion: w.publishedVersion,
        lastRunAt: w.lastRunAt,
        lastRunStatus: w.lastRunStatus,
        triggerType: w.draftGraph.trigger.type,
        updatedAt: w.updatedAt,
      }));
  },
});

export const get = query({
  args: { currentUserId: v.string(), workflowId: v.id("workflows") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("workflows"),
      name: v.string(),
      description: v.optional(v.string()),
      draftGraph: workflowGraphValidator,
      publishedVersionId: v.optional(v.id("workflowVersions")),
      publishedVersion: v.optional(v.number()),
      webhookUrl: v.string(),
      status: v.union(
        v.literal("draft"),
        v.literal("live"),
        v.literal("archived"),
      ),
      lastRunAt: v.optional(v.number()),
      lastRunStatus: v.optional(runStatusValidator),
      nextRunAt: v.optional(v.number()),
      updatedAt: v.number(),
      createdAt: v.number(),
      hasActiveRun: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const wf = await ctx.db.get(args.workflowId);
    if (!wf || wf.status === "archived") return null;

    const active = await ctx.db
      .query("workflowRuns")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .take(10);
    const hasActiveRun = active.some(
      (r) => r.status === "pending" || r.status === "running",
    );

    return {
      _id: wf._id,
      name: wf.name,
      description: wf.description,
      draftGraph: wf.draftGraph,
      publishedVersionId: wf.publishedVersionId,
      publishedVersion: wf.publishedVersion,
      webhookUrl: webhookUrlForToken(wf.webhookToken),
      status: wf.status,
      lastRunAt: wf.lastRunAt,
      lastRunStatus: wf.lastRunStatus,
      nextRunAt: wf.nextRunAt,
      updatedAt: wf.updatedAt,
      createdAt: wf.createdAt,
      hasActiveRun,
    };
  },
});

export const listRuns = query({
  args: {
    currentUserId: v.string(),
    workflowId: v.id("workflows"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("workflowRuns"),
      trigger: v.union(
        v.literal("manual"),
        v.literal("webhook"),
        v.literal("schedule"),
      ),
      status: runStatusValidator,
      errorMessage: v.optional(v.string()),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      startedBy: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const runs = await ctx.db
      .query("workflowRuns")
      .withIndex("by_workflow_and_startedAt", (q) =>
        q.eq("workflowId", args.workflowId),
      )
      .order("desc")
      .take(limit);
    return runs.map((r) => ({
      _id: r._id,
      trigger: r.trigger,
      status: r.status,
      errorMessage: r.errorMessage,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      startedBy: r.startedBy,
    }));
  },
});

export const listRunSteps = query({
  args: {
    currentUserId: v.string(),
    runId: v.id("workflowRuns"),
  },
  returns: v.array(
    v.object({
      _id: v.id("workflowRunSteps"),
      stepId: v.string(),
      stepType: v.string(),
      stepLabel: v.string(),
      order: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("succeeded"),
        v.literal("failed"),
        v.literal("skipped"),
      ),
      inputSummary: v.optional(v.string()),
      outputSummary: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const run = await ctx.db.get(args.runId);
    if (!run) return [];
    const steps = await ctx.db
      .query("workflowRunSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(50);
    return steps
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        _id: s._id,
        stepId: s.stepId,
        stepType: s.stepType,
        stepLabel: s.stepLabel,
        order: s.order,
        status: s.status,
        inputSummary: s.inputSummary,
        outputSummary: s.outputSummary,
        errorMessage: s.errorMessage,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
      }));
  },
});

export const create = mutation({
  args: {
    currentUserId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("workflows"),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    const now = Date.now();
    return await ctx.db.insert("workflows", {
      name,
      description: args.description?.trim() || undefined,
      draftGraph: defaultWorkflowGraph(),
      webhookToken: randomToken(),
      status: "draft",
      createdBy: args.currentUserId,
      updatedBy: args.currentUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveDraft = mutation({
  args: {
    currentUserId: v.string(),
    workflowId: v.id("workflows"),
    name: v.string(),
    description: v.optional(v.string()),
    draftGraph: workflowGraphValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const wf = await ctx.db.get(args.workflowId);
    if (!wf || wf.status === "archived") {
      throw new Error("Workflow not found");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    await ctx.db.patch(args.workflowId, {
      name,
      description: args.description?.trim() || undefined,
      draftGraph: args.draftGraph,
      updatedBy: args.currentUserId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const publish = mutation({
  args: {
    currentUserId: v.string(),
    workflowId: v.id("workflows"),
  },
  returns: v.object({
    versionId: v.id("workflowVersions"),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const wf = await ctx.db.get(args.workflowId);
    if (!wf || wf.status === "archived") {
      throw new Error("Workflow not found");
    }
    if (!wf.name.trim()) throw new Error("Name is required before publishing");
    assertPublishableGraph(wf.draftGraph as WorkflowGraph);

    const latest = await ctx.db
      .query("workflowVersions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .first();
    const version = (latest?.version ?? 0) + 1;
    const now = Date.now();
    const versionId = await ctx.db.insert("workflowVersions", {
      workflowId: args.workflowId,
      version,
      graph: wf.draftGraph,
      publishedBy: args.currentUserId,
      publishedAt: now,
    });

    const graph = wf.draftGraph as WorkflowGraph;
    const nextRunAt =
      graph.trigger.type === "schedule" && graph.trigger.intervalMinutes
        ? now + graph.trigger.intervalMinutes * 60_000
        : undefined;

    await ctx.db.patch(args.workflowId, {
      publishedVersionId: versionId,
      publishedVersion: version,
      status: "live",
      nextRunAt,
      updatedBy: args.currentUserId,
      updatedAt: now,
    });

    return { versionId, version };
  },
});

export const unpublish = mutation({
  args: {
    currentUserId: v.string(),
    workflowId: v.id("workflows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const wf = await ctx.db.get(args.workflowId);
    if (!wf || wf.status === "archived") {
      throw new Error("Workflow not found");
    }
    await ctx.db.patch(args.workflowId, {
      status: "draft",
      nextRunAt: undefined,
      updatedBy: args.currentUserId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const rotateWebhookToken = mutation({
  args: {
    currentUserId: v.string(),
    workflowId: v.id("workflows"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const wf = await ctx.db.get(args.workflowId);
    if (!wf || wf.status === "archived") {
      throw new Error("Workflow not found");
    }
    const token = randomToken();
    await ctx.db.patch(args.workflowId, {
      webhookToken: token,
      updatedBy: args.currentUserId,
      updatedAt: Date.now(),
    });
    return webhookUrlForToken(token);
  },
});

export const remove = mutation({
  args: {
    currentUserId: v.string(),
    workflowId: v.id("workflows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const wf = await ctx.db.get(args.workflowId);
    if (!wf) throw new Error("Workflow not found");
    await ctx.db.patch(args.workflowId, {
      status: "archived",
      nextRunAt: undefined,
      updatedBy: args.currentUserId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const runNow = mutation({
  args: {
    currentUserId: v.string(),
    workflowId: v.id("workflows"),
  },
  returns: v.id("workflowRuns"),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    return await ctx.runMutation(internal.workflows.beginRun, {
      workflowId: args.workflowId,
      trigger: "manual",
      startedBy: args.currentUserId,
      triggerPayload: undefined,
    });
  },
});

export const beginRun = internalMutation({
  args: {
    workflowId: v.id("workflows"),
    trigger: v.union(
      v.literal("manual"),
      v.literal("webhook"),
      v.literal("schedule"),
    ),
    startedBy: v.optional(v.string()),
    triggerPayload: v.optional(v.string()),
  },
  returns: v.id("workflowRuns"),
  handler: async (ctx, args) => {
    const wf = await ctx.db.get(args.workflowId);
    if (!wf || wf.status === "archived") {
      throw new Error("Workflow not found");
    }
    if (wf.status !== "live" || !wf.publishedVersionId) {
      throw new Error("Publish the workflow before running it");
    }

    const recent = await ctx.db
      .query("workflowRuns")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .take(15);
    if (recent.some((r) => r.status === "pending" || r.status === "running")) {
      throw new Error("A run is already in progress for this workflow");
    }

    const version = await ctx.db.get(wf.publishedVersionId);
    if (!version) throw new Error("Published version missing");

    const now = Date.now();
    const runId = await ctx.db.insert("workflowRuns", {
      workflowId: args.workflowId,
      versionId: version._id,
      trigger: args.trigger,
      status: "pending",
      triggerPayload: args.triggerPayload
        ? truncateText(args.triggerPayload, 4000)
        : undefined,
      startedAt: now,
      startedBy: args.startedBy,
    });

    for (let i = 0; i < version.graph.steps.length; i++) {
      const step = version.graph.steps[i]!;
      await ctx.db.insert("workflowRunSteps", {
        runId,
        stepId: step.id,
        stepType: step.type,
        stepLabel: step.label,
        order: i,
        status: "pending",
      });
    }

    await ctx.db.patch(args.workflowId, {
      lastRunAt: now,
      lastRunStatus: "pending",
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.workflowExecutor.executeFromStep, {
      runId,
      stepIndex: 0,
    });

    return runId;
  },
});

export const getByWebhookToken = internalQuery({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      workflowId: v.id("workflows"),
      status: v.union(
        v.literal("draft"),
        v.literal("live"),
        v.literal("archived"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const wf = await ctx.db
      .query("workflows")
      .withIndex("by_webhookToken", (q) => q.eq("webhookToken", args.token))
      .unique();
    if (!wf) return null;
    return { workflowId: wf._id, status: wf.status };
  },
});

export const getRunContext = internalQuery({
  args: { runId: v.id("workflowRuns") },
  returns: v.union(
    v.null(),
    v.object({
      runId: v.id("workflowRuns"),
      workflowId: v.id("workflows"),
      status: runStatusValidator,
      triggerPayload: v.optional(v.string()),
      steps: v.array(workflowStepValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const version = await ctx.db.get(run.versionId);
    if (!version) return null;
    return {
      runId: run._id,
      workflowId: run.workflowId,
      status: run.status,
      triggerPayload: run.triggerPayload,
      steps: version.graph.steps,
    };
  },
});

export const markRunRunning = internalMutation({
  args: { runId: v.id("workflowRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    if (run.status !== "pending" && run.status !== "running") return null;
    await ctx.db.patch(args.runId, { status: "running" });
    await ctx.db.patch(run.workflowId, {
      lastRunStatus: "running",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markStepStart = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    order: v.number(),
    inputSummary: v.optional(v.string()),
  },
  returns: v.union(v.null(), v.id("workflowRunSteps")),
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("workflowRunSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(50);
    const step = steps.find((s) => s.order === args.order);
    if (!step) return null;
    await ctx.db.patch(step._id, {
      status: "running",
      startedAt: Date.now(),
      inputSummary: args.inputSummary
        ? truncateText(args.inputSummary)
        : undefined,
    });
    return step._id;
  },
});

export const markStepFinish = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    order: v.number(),
    status: v.union(
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    outputSummary: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("workflowRunSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(50);
    const step = steps.find((s) => s.order === args.order);
    if (!step) return null;
    await ctx.db.patch(step._id, {
      status: args.status,
      finishedAt: Date.now(),
      outputSummary: args.outputSummary
        ? truncateText(args.outputSummary)
        : undefined,
      errorMessage: args.errorMessage
        ? truncateText(args.errorMessage, 1000)
        : undefined,
    });
    return null;
  },
});

export const skipRemainingSteps = internalMutation({
  args: { runId: v.id("workflowRuns"), fromOrder: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("workflowRunSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(50);
    const now = Date.now();
    for (const step of steps) {
      if (step.order >= args.fromOrder && step.status === "pending") {
        await ctx.db.patch(step._id, {
          status: "skipped",
          finishedAt: now,
          outputSummary: "Skipped by filter",
        });
      }
    }
    return null;
  },
});

export const finishRun = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    status: v.union(
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const now = Date.now();
    await ctx.db.patch(args.runId, {
      status: args.status,
      finishedAt: now,
      errorMessage: args.errorMessage
        ? truncateText(args.errorMessage, 1000)
        : undefined,
    });
    await ctx.db.patch(run.workflowId, {
      lastRunStatus: args.status,
      lastRunAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const createDashboardIssue = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("none"),
    ),
  },
  returns: v.id("issues"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_status", (q) => q.eq("status", "todo"))
      .order("desc")
      .first();
    const order = existing ? existing.order + 1 : 0;
    const issueId = await ctx.db.insert("issues", {
      title: args.title,
      description: args.description,
      status: "todo",
      priority: args.priority,
      labels: ["workflow"],
      order,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.githubProjectsSync.pushIssueChange,
      { issueId },
    );
    return issueId;
  },
});

export const appendClientNote = internalMutation({
  args: {
    clientId: v.id("clients"),
    noteText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");
    const stamp = new Date().toISOString();
    const addition = `\n\n[${stamp}] ${args.noteText.trim()}`;
    const notes = (client.notes ?? "") + addition;
    await ctx.db.patch(args.clientId, { notes: truncateText(notes, 50_000) });
    return null;
  },
});

export const tickSchedules = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const live = await ctx.db
      .query("workflows")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .take(100);

    let started = 0;
    for (const wf of live) {
      if (wf.nextRunAt === undefined || wf.nextRunAt > now) continue;
      const version = wf.publishedVersionId
        ? await ctx.db.get(wf.publishedVersionId)
        : null;
      const published = version?.graph as WorkflowGraph | undefined;
      if (!published || published.trigger.type !== "schedule") {
        await ctx.db.patch(wf._id, { nextRunAt: undefined });
        continue;
      }
      const mins = published.trigger.intervalMinutes ?? 60;
      try {
        await ctx.runMutation(internal.workflows.beginRun, {
          workflowId: wf._id,
          trigger: "schedule",
          triggerPayload: JSON.stringify({ scheduledAt: now }),
        });
        started += 1;
      } catch {
        // In-flight or publish race — still bump nextRunAt to avoid hot loop
      }
      await ctx.db.patch(wf._id, {
        nextRunAt: now + mins * 60_000,
        updatedAt: now,
      });
    }
    return started;
  },
});
