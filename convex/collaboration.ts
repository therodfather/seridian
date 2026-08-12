import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Real-time document collaboration queries & mutations */

export const getPresence = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - 15000; // Active in last 15 seconds
    const active = await ctx.db
      .query("docPresence")
      .withIndex("by_fileId", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.gte(q.field("lastSeen"), cutoff))
      .collect();
    return active;
  },
});

export const updatePresence = mutation({
  args: {
    fileId: v.id("files"),
    userPubkey: v.string(),
    userName: v.string(),
    cursorPosition: v.number(),
    activeSelection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("docPresence")
      .withIndex("by_fileId_and_pubkey", (q) =>
        q.eq("fileId", args.fileId).eq("userPubkey", args.userPubkey)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        cursorPosition: args.cursorPosition,
        activeSelection: args.activeSelection,
        lastSeen: now,
      });
    } else {
      await ctx.db.insert("docPresence", {
        fileId: args.fileId,
        userPubkey: args.userPubkey,
        userName: args.userName,
        cursorPosition: args.cursorPosition,
        activeSelection: args.activeSelection,
        lastSeen: now,
      });
    }
  },
});

export const getDocumentContent = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("docEdits")
      .withIndex("by_fileId", (q) => q.eq("fileId", args.fileId))
      .first();
  },
});

export const updateDocumentContent = mutation({
  args: {
    fileId: v.id("files"),
    content: v.string(),
    userPubkey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("docEdits")
      .withIndex("by_fileId", (q) => q.eq("fileId", args.fileId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        lastUpdatedBy: args.userPubkey,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("docEdits", {
        fileId: args.fileId,
        content: args.content,
        lastUpdatedBy: args.userPubkey,
        updatedAt: now,
      });
    }
  },
});
