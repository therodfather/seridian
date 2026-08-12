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
    const content = args.content.trim();
    if (!content) {
      throw new Error("Message content cannot be empty");
    }
    const senderId = args.senderId.trim();
    const senderName = args.senderName.trim();
    if (!senderId || !senderName) {
      throw new Error("Authenticated sender is required");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      senderId,
      senderName,
      content,
      type: args.type,
      replyTo: args.replyTo,
      createdAt: now,
    });

    await ctx.db.patch(args.channelId, {
      lastMessageAt: now,
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
