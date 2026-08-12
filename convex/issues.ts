import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("backlog"),
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("in_review"),
        v.literal("done"),
      ),
    ),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    if (args.status && args.clientId) {
      return await ctx.db
        .query("issues")
        .withIndex("by_status_and_clientId", (q) =>
          q.eq("status", args.status!).eq("clientId", args.clientId!),
        )
        .order("asc")
        .take(500);
    }
    if (args.status) {
      return await ctx.db
        .query("issues")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("asc")
        .take(500);
    }
    if (args.clientId) {
      return await ctx.db
        .query("issues")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .take(500);
    }
    return await ctx.db.query("issues").order("desc").take(500);
  },
});

export const get = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.issueId);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("in_review"),
      v.literal("done"),
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("none"),
    ),
    clientId: v.optional(v.id("clients")),
    labels: v.array(v.string()),
    linearId: v.optional(v.string()),
    assignee: v.optional(v.string()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .first();
    const order = existing ? existing.order + 1 : 0;
    return await ctx.db.insert("issues", { ...args, order });
  },
});

export const update = mutation({
  args: {
    issueId: v.id("issues"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("backlog"),
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("in_review"),
        v.literal("done"),
      ),
    ),
    priority: v.optional(
      v.union(
        v.literal("urgent"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none"),
      ),
    ),
    clientId: v.optional(v.union(v.id("clients"), v.null())),
    labels: v.optional(v.array(v.string())),
    linearId: v.optional(v.string()),
    assignee: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { issueId, ...fields } = args;
    const nonUndefined = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(issueId, nonUndefined);
    return issueId;
  },
});

export const remove = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.issueId);
  },
});

export const getLinearSyncStats = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db
      .query("issues")
      .filter((q) => q.neq(q.field("linearId"), undefined))
      .collect();

    const byStatus: Record<string, number> = {};
    for (const issue of issues) {
      byStatus[issue.status] = (byStatus[issue.status] ?? 0) + 1;
    }

    const syncMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastSyncTime"))
      .unique();

    return {
      totalIssues: issues.length,
      byStatus,
      lastSyncTime: syncMeta ? parseInt(syncMeta.value, 10) : null,
    };
  },
});

export const reorder = mutation({
  args: {
    issueId: v.id("issues"),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("in_review"),
      v.literal("done"),
    ),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");

    if (issue.status === args.status) {
      const siblings = await ctx.db
        .query("issues")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("asc")
        .take(500);

      const reordered = siblings.filter((s) => s._id !== args.issueId);
      reordered.splice(args.order, 0, issue);

      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) {
          await ctx.db.patch(reordered[i]._id, { order: i });
        }
      }
    } else {
      const oldSiblings = await ctx.db
        .query("issues")
        .withIndex("by_status", (q) => q.eq("status", issue.status))
        .order("asc")
        .take(500);

      for (let i = 0; i < oldSiblings.length; i++) {
        if (oldSiblings[i]._id !== args.issueId) {
          const newOrder = oldSiblings[i].order > issue.order
            ? oldSiblings[i].order - 1
            : oldSiblings[i].order;
          if (oldSiblings[i].order !== newOrder) {
            await ctx.db.patch(oldSiblings[i]._id, { order: newOrder });
          }
        }
      }

      const newSiblings = await ctx.db
        .query("issues")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("asc")
        .take(500);

      const targetOrder = Math.min(args.order, newSiblings.length);
      for (let i = 0; i < newSiblings.length; i++) {
        if (i >= targetOrder) {
          await ctx.db.patch(newSiblings[i]._id, { order: i + 1 });
        }
      }

      await ctx.db.patch(args.issueId, {
        status: args.status,
        order: targetOrder,
      });
    }
  },
});

export const completeAuditLogViewerIssue = mutation({
  args: {},
  handler: async (ctx) => {
    const issue = await ctx.db
      .query("issues")
      .filter((q) => q.eq(q.field("title"), "Audit Finding: Implement Audit Log Viewer in Settings"))
      .first();

    if (issue) {
      await ctx.db.patch(issue._id, { status: "done" });
      return { success: true, updated: issue._id };
    } else {
      const id = await ctx.db.insert("issues", {
        title: "Audit Finding: Implement Audit Log Viewer in Settings",
        description: "Create an immutable Audit Log viewer table in Settings > General to log secret updates, user revocations, and Linear manual sync triggers.",
        status: "done",
        priority: "high",
        labels: ["Audit", "Settings", "Governance"],
        assignee: "Rod",
        order: 100,
      });
      return { success: true, created: id };
    }
  },
});

export const seedDashboardAuditIssues = mutation({
  args: {},
  handler: async (ctx) => {
    const auditIssues = [
      {
        title: "Audit Finding: Implement Audit Log Viewer in Settings",
        description: "Create an immutable Audit Log viewer table in Settings > General to log secret updates, user revocations, and Linear manual sync triggers.",
        status: "done" as const,
        priority: "high" as const,
        labels: ["Audit", "Settings", "Governance"],
        assignee: "Rod",
        order: 100,
      },
      {
        title: "Audit Finding: Add Drag & Drop Proposal Stage Pipeline",
        description: "Enhance /dashboard/proposals with Kanban stage columns (Draft, Sent, Accepted, Rejected) and drag-and-drop state updates.",
        status: "todo" as const,
        priority: "high" as const,
        labels: ["Audit", "Proposals", "UX"],
        assignee: "Dee",
        order: 101,
      },
      {
        title: "Audit Finding: Client Relationship Visual Graph Node View",
        description: "Add an interactive Mermaid/Canvas node visualization graph on client dossiers (/dashboard/clients/[clientId]) showing employee hierarchy and downstream client relationships.",
        status: "backlog" as const,
        priority: "medium" as const,
        labels: ["Audit", "Clients", "BI"],
        assignee: "Rod",
        order: 102,
      },
      {
        title: "Audit Finding: Global Notification Center Toast Dispatcher",
        description: "Wire real-time Toast dispatches across the dashboard for Linear sync completion, new bookings, and agent mention responses.",
        status: "in_progress" as const,
        priority: "high" as const,
        labels: ["Audit", "System", "Notifications"],
        assignee: "Dee",
        order: 103,
      },
      {
        title: "Audit Finding: Multi-File Batch Drag & Drop Uploader",
        description: "Upgrade /dashboard/files with multi-file drag-and-drop upload zone, client tagging, and MIME type preview cards.",
        status: "backlog" as const,
        priority: "medium" as const,
        labels: ["Audit", "Files", "Storage"],
        assignee: "Rod",
        order: 104,
      },
    ];

    const createdIds = [];
    for (const issue of auditIssues) {
      const existing = await ctx.db
        .query("issues")
        .filter((q) => q.eq(q.field("title"), issue.title))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("issues", {
          ...issue,
          clientId: undefined,
          linearId: undefined,
          dueDate: undefined,
        });
        createdIds.push(id);
      } else if (issue.title === "Audit Finding: Implement Audit Log Viewer in Settings") {
        await ctx.db.patch(existing._id, { status: "done" });
      }
    }

    return { success: true, seededCount: createdIds.length };
  },
});
