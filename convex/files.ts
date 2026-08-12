import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

export const list = query({
  args: {
    parentId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    if (args.clientId) {
      return await ctx.db
        .query("files")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .take(500);
    }
    if (args.parentId) {
      return await ctx.db
        .query("files")
        .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId!))
        .order("desc")
        .take(500);
    }
    return await ctx.db
      .query("files")
      .withIndex("by_parentId", (q) => q.eq("parentId", undefined))
      .order("desc")
      .take(500);
  },
});

export const get = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(500);
  },
});

export const getStorageUrl = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }
    return await ctx.storage.getUrl(file.storageId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    parentId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("files", {
      name: args.name,
      type: args.type,
      size: args.size,
      storageId: args.storageId,
      parentId: args.parentId,
      clientId: args.clientId,
      uploadedBy: args.uploadedBy,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (file) {
      await ctx.storage.delete(file.storageId);
    }
    await ctx.db.delete(args.fileId);
  },
});

export const move = mutation({
  args: {
    fileId: v.id("files"),
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, { parentId: args.parentId });
    return args.fileId;
  },
});

export const rename = mutation({
  args: {
    fileId: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, { name: args.name });
    return args.fileId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createDocument = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    initialContent: v.optional(v.string()),
    parentId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("files", {
      name: args.name,
      type: args.type,
      size: args.size,
      storageId: args.storageId,
      parentId: args.parentId,
      clientId: args.clientId,
      uploadedBy: args.uploadedBy,
      createdAt: Date.now(),
    });

    if (args.initialContent) {
      await ctx.db.insert("docEdits", {
        fileId,
        content: args.initialContent,
        lastUpdatedBy: args.uploadedBy,
        updatedAt: Date.now(),
      });
    }

    return fileId;
  },
});

export const upload = action({
  args: {
    name: v.string(),
    type: v.string(),
    blob: v.bytes(),
    size: v.number(),
    parentId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const storageId = await ctx.storage.store(
      new Blob([args.blob], { type: args.type }),
    );
    const fileId: string = await ctx.runMutation(api.files.create, {
      name: args.name,
      type: args.type,
      size: args.size,
      storageId,
      parentId: args.parentId,
      clientId: args.clientId,
      uploadedBy: args.uploadedBy,
    });
    return fileId;
  },
});
