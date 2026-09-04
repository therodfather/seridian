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
