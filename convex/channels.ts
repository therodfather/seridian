import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("channels").take(500);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("public"), v.literal("private"), v.literal("direct")),
    createdBy: v.string(),
    participants: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new Error("Channel name cannot be empty");
    }
    const createdBy = args.createdBy.trim();
    if (!createdBy) {
      throw new Error("Authenticated creator is required");
    }

    const allParticipants = args.participants.includes(createdBy)
      ? args.participants
      : [...args.participants, createdBy];
    const uniqueParticipants = [
      ...new Set(allParticipants.map((p) => p.trim()).filter(Boolean)),
    ];

    const channelId = await ctx.db.insert("channels", {
      name,
      description: args.description?.trim() || undefined,
      type: args.type,
      createdBy,
      participants: uniqueParticipants,
      createdAt: Date.now(),
    });
    return channelId;
  },
});

export const get = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId);
  },
});

export const remove = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channelId_and_createdAt", (q) => q.eq("channelId", args.channelId))
      .take(500);

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.channelId);
    return args.channelId;
  },
});
