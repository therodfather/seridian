/**
 * IVR flow CRUD: draft graphs, publish versions, list for dashboard.
 * Telnyx number activation lives in convex/telnyx.ts.
 */
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/admin";
import {
  assertValidGraph,
  assertHasExitPath,
  defaultIvrGraph,
  ivrGraphValidator,
  type IvrGraph,
} from "./lib/ivrGraph";

const callStatusValidator = v.union(
  v.literal("ringing"),
  v.literal("answered"),
  v.literal("in_progress"),
  v.literal("transferred"),
  v.literal("recorded"),
  v.literal("no_input"),
  v.literal("hangup"),
  v.literal("error"),
);

const flowSummaryValidator = v.object({
  _id: v.id("ivrFlows"),
  name: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("draft"),
    v.literal("published"),
    v.literal("archived"),
  ),
  publishedVersion: v.optional(v.number()),
  phoneNumber: v.optional(v.string()),
  numberActive: v.boolean(),
  updatedAt: v.number(),
});

export const list = query({
  args: { currentUserId: v.string() },
  returns: v.array(flowSummaryValidator),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const flows = await ctx.db.query("ivrFlows").order("desc").take(100);
    return flows
      .filter((f) => f.status !== "archived")
      .map((f) => ({
        _id: f._id,
        name: f.name,
        description: f.description,
        status: f.status,
        publishedVersion: f.publishedVersion,
        phoneNumber: f.phoneNumber,
        numberActive: f.numberActive,
        updatedAt: f.updatedAt,
      }));
  },
});

export const get = query({
  args: { currentUserId: v.string(), flowId: v.id("ivrFlows") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("ivrFlows"),
      name: v.string(),
      description: v.optional(v.string()),
      draftGraph: ivrGraphValidator,
      publishedVersionId: v.optional(v.id("ivrFlowVersions")),
      publishedVersion: v.optional(v.number()),
      phoneNumber: v.optional(v.string()),
      phoneNumberId: v.optional(v.string()),
      callControlAppId: v.optional(v.string()),
      connectionId: v.optional(v.string()),
      numberActive: v.boolean(),
      status: v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived"),
      ),
      updatedAt: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const flow = await ctx.db.get(args.flowId);
    if (!flow || flow.status === "archived") return null;
    return {
      _id: flow._id,
      name: flow.name,
      description: flow.description,
      draftGraph: flow.draftGraph,
      publishedVersionId: flow.publishedVersionId,
      publishedVersion: flow.publishedVersion,
      phoneNumber: flow.phoneNumber,
      phoneNumberId: flow.phoneNumberId,
      callControlAppId: flow.callControlAppId,
      connectionId: flow.connectionId,
      numberActive: flow.numberActive,
      status: flow.status,
      updatedAt: flow.updatedAt,
      createdAt: flow.createdAt,
    };
  },
});

export const create = mutation({
  args: {
    currentUserId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("ivrFlows"),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const name = args.name.trim();
    if (!name) throw new Error("Flow name is required");
    const now = Date.now();
    return await ctx.db.insert("ivrFlows", {
      name,
      description: args.description?.trim() || undefined,
      draftGraph: defaultIvrGraph(),
      numberActive: false,
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
    flowId: v.id("ivrFlows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    draftGraph: ivrGraphValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const flow = await ctx.db.get(args.flowId);
    if (!flow || flow.status === "archived") {
      throw new Error("Flow not found");
    }
    assertValidGraph(args.draftGraph as IvrGraph);
    const patch: {
      draftGraph: IvrGraph;
      updatedBy: string;
      updatedAt: number;
      name?: string;
      description?: string;
    } = {
      draftGraph: args.draftGraph as IvrGraph,
      updatedBy: args.currentUserId,
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Flow name is required");
      patch.name = name;
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined;
    }
    await ctx.db.patch(args.flowId, patch);
    return null;
  },
});

export const publish = mutation({
  args: { currentUserId: v.string(), flowId: v.id("ivrFlows") },
  returns: v.object({
    versionId: v.id("ivrFlowVersions"),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const flow = await ctx.db.get(args.flowId);
    if (!flow || flow.status === "archived") {
      throw new Error("Flow not found");
    }
    assertValidGraph(flow.draftGraph as IvrGraph);
    assertHasExitPath(flow.draftGraph as IvrGraph);

    const transferNodes = flow.draftGraph.nodes.filter(
      (n) => n.type === "transfer",
    );
    for (const n of transferNodes) {
      if (!n.transferTo?.trim()) {
        throw new Error(
          `Transfer node "${n.label}" needs a destination number before publish`,
        );
      }
    }

    const nextVersion = (flow.publishedVersion ?? 0) + 1;
    const now = Date.now();
    const versionId = await ctx.db.insert("ivrFlowVersions", {
      flowId: args.flowId,
      version: nextVersion,
      graph: flow.draftGraph,
      publishedBy: args.currentUserId,
      publishedAt: now,
    });

    await ctx.db.patch(args.flowId, {
      publishedVersionId: versionId,
      publishedVersion: nextVersion,
      status: "published",
      updatedBy: args.currentUserId,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      action: "IVR Flow Published",
      actor: args.currentUserId,
      details: `Published ${flow.name} v${nextVersion}`,
      category: "secret",
      timestamp: now,
      metadata: JSON.stringify({ flowId: args.flowId, version: nextVersion }),
    });

    return { versionId, version: nextVersion };
  },
});

export const archive = mutation({
  args: { currentUserId: v.string(), flowId: v.id("ivrFlows") },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const flow = await ctx.db.get(args.flowId);
    if (!flow) throw new Error("Flow not found");
    await ctx.db.patch(args.flowId, {
      status: "archived",
      numberActive: false,
      updatedBy: args.currentUserId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const listCallLogs = query({
  args: {
    currentUserId: v.string(),
    flowId: v.id("ivrFlows"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("ivrCallLogs"),
      fromNumber: v.string(),
      toNumber: v.string(),
      status: callStatusValidator,
      digitPressed: v.optional(v.string()),
      currentNodeId: v.optional(v.string()),
      routedTo: v.optional(v.string()),
      lastEventType: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const flow = await ctx.db.get(args.flowId);
    if (!flow) return [];
    const logs = await ctx.db
      .query("ivrCallLogs")
      .withIndex("by_flow", (q) => q.eq("flowId", args.flowId))
      .order("desc")
      .take(args.limit ?? 40);
    return logs.map((l) => ({
      _id: l._id,
      fromNumber: l.fromNumber,
      toNumber: l.toNumber,
      status: l.status,
      digitPressed: l.digitPressed,
      currentNodeId: l.currentNodeId,
      routedTo: l.routedTo,
      lastEventType: l.lastEventType,
      errorMessage: l.errorMessage,
      startedAt: l.startedAt,
      endedAt: l.endedAt,
    }));
  },
});

/** Webhook: resolve published flow by inbound DID. */
export const getPublishedByPhone = internalQuery({
  args: { phoneNumber: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      flowId: v.id("ivrFlows"),
      versionId: v.id("ivrFlowVersions"),
      version: v.number(),
      graph: ivrGraphValidator,
      phoneNumber: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const flow = await ctx.db
      .query("ivrFlows")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    if (!flow || !flow.numberActive || !flow.publishedVersionId) return null;
    if (flow.status !== "published") return null;
    const version = await ctx.db.get(flow.publishedVersionId);
    if (!version) return null;
    return {
      flowId: flow._id,
      versionId: version._id,
      version: version.version,
      graph: version.graph,
      phoneNumber: flow.phoneNumber ?? args.phoneNumber,
    };
  },
});

export const getPublishedVersion = internalQuery({
  args: { versionId: v.id("ivrFlowVersions") },
  returns: v.union(
    v.null(),
    v.object({
      flowId: v.id("ivrFlows"),
      versionId: v.id("ivrFlowVersions"),
      version: v.number(),
      graph: ivrGraphValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) return null;
    return {
      flowId: version.flowId,
      versionId: version._id,
      version: version.version,
      graph: version.graph,
    };
  },
});

export const applyNumberAssignment = internalMutation({
  args: {
    flowId: v.id("ivrFlows"),
    currentUserId: v.string(),
    phoneNumber: v.string(),
    phoneNumberId: v.string(),
    callControlAppId: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const flow = await ctx.db.get(args.flowId);
    if (!flow) throw new Error("Flow not found");
    if (!flow.publishedVersionId) {
      throw new Error("Publish the flow before assigning a number");
    }

    // One active assignment per number across flows.
    const others = await ctx.db
      .query("ivrFlows")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .take(20);
    for (const other of others) {
      if (other._id !== args.flowId && other.numberActive) {
        await ctx.db.patch(other._id, {
          numberActive: false,
          updatedAt: Date.now(),
        });
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.flowId, {
      phoneNumber: args.phoneNumber,
      phoneNumberId: args.phoneNumberId,
      callControlAppId: args.callControlAppId,
      connectionId: args.connectionId,
      numberActive: true,
      updatedBy: args.currentUserId,
      updatedAt: now,
    });

    const config = await ctx.db
      .query("integrationConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", "telnyx"))
      .first();
    if (config) {
      await ctx.db.patch(config._id, { status: "connected", updatedAt: now });
    }

    await ctx.db.insert("auditLogs", {
      action: "IVR Number Assigned",
      actor: args.currentUserId,
      details: `Assigned ${args.phoneNumber} to ${flow.name}`,
      category: "secret",
      timestamp: now,
      metadata: JSON.stringify({
        flowId: args.flowId,
        phoneNumber: args.phoneNumber,
        callControlAppId: args.callControlAppId,
      }),
    });
    return null;
  },
});

export const upsertCallLog = internalMutation({
  args: {
    flowId: v.id("ivrFlows"),
    versionId: v.optional(v.id("ivrFlowVersions")),
    callControlId: v.string(),
    fromNumber: v.optional(v.string()),
    toNumber: v.optional(v.string()),
    digitPressed: v.optional(v.string()),
    currentNodeId: v.optional(v.string()),
    routedTo: v.optional(v.string()),
    status: callStatusValidator,
    lastEventType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("ivrCallLogs")
      .withIndex("by_callControlId", (q) =>
        q.eq("callControlId", args.callControlId),
      )
      .first();

    const terminal =
      args.status === "hangup" ||
      args.status === "error" ||
      args.status === "transferred";

    if (existing) {
      await ctx.db.patch(existing._id, {
        fromNumber: args.fromNumber ?? existing.fromNumber,
        toNumber: args.toNumber ?? existing.toNumber,
        digitPressed: args.digitPressed ?? existing.digitPressed,
        currentNodeId: args.currentNodeId ?? existing.currentNodeId,
        routedTo: args.routedTo ?? existing.routedTo,
        status: args.status,
        lastEventType: args.lastEventType ?? existing.lastEventType,
        errorMessage: args.errorMessage,
        endedAt: terminal ? now : existing.endedAt,
        versionId: args.versionId ?? existing.versionId,
      });
      return null;
    }

    await ctx.db.insert("ivrCallLogs", {
      flowId: args.flowId,
      versionId: args.versionId,
      callControlId: args.callControlId,
      fromNumber: args.fromNumber ?? "unknown",
      toNumber: args.toNumber ?? "unknown",
      digitPressed: args.digitPressed,
      currentNodeId: args.currentNodeId,
      routedTo: args.routedTo,
      status: args.status,
      lastEventType: args.lastEventType,
      errorMessage: args.errorMessage,
      startedAt: now,
      endedAt: terminal ? now : undefined,
    });
    return null;
  },
});
