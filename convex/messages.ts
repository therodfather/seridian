import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channelId_and_createdAt", (q) => q.eq("channelId", args.channelId))
      .order("asc")
      .take(500);
  },
});

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    senderId: v.string(),
    senderName: v.string(),
    content: v.string(),
    type: v.union(v.literal("text"), v.literal("system"), v.literal("command")),
    replyTo: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      senderId: args.senderId,
      senderName: args.senderName,
      content: args.content,
      type: args.type,
      replyTo: args.replyTo,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.channelId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").take(500);
  },
});
