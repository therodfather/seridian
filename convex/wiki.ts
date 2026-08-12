import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const createPage = mutation({
  args: {
    bankId: v.id("memoryBanks"),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    lastEditedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const bank = await ctx.db.get(args.bankId);
    if (!bank) throw new Error("Memory bank not found");

    const now = Date.now();
    let slug = slugify(args.title);

    const existing = await ctx.db
      .query("wikiPages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const pageId = await ctx.db.insert("wikiPages", {
      bankId: args.bankId,
      title: args.title,
      slug,
      content: args.content,
      tags: args.tags ?? [],
      lastEditedBy: args.lastEditedBy,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("agentActivity", {
      bankId: args.bankId,
      agentId: args.lastEditedBy,
      action: "wiki_edit",
      details: JSON.stringify({ pageId, title: args.title, action: "create" }),
      timestamp: now,
    });

    await ctx.db.patch(args.bankId, { updatedAt: now });

    return pageId;
  },
});

export const updatePage = mutation({
  args: {
    pageId: v.id("wikiPages"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    lastEditedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Wiki page not found");

    const now = Date.now();
    const patch: Record<string, unknown> = {
      lastEditedBy: args.lastEditedBy,
      updatedAt: now,
    };

    if (args.title !== undefined) {
      patch.title = args.title;
      let slug = slugify(args.title);
      const existing = await ctx.db
        .query("wikiPages")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (existing && existing._id !== args.pageId) {
        slug = `${slug}-${Date.now()}`;
      }
      patch.slug = slug;
    }

    if (args.content !== undefined) patch.content = args.content;
    if (args.tags !== undefined) patch.tags = args.tags;

    await ctx.db.patch(args.pageId, patch);

    await ctx.db.insert("agentActivity", {
      bankId: page.bankId,
      agentId: args.lastEditedBy,
      action: "wiki_edit",
      details: JSON.stringify({
        pageId: args.pageId,
        title: page.title,
        action: "update",
      }),
      timestamp: now,
    });

    await ctx.db.patch(page.bankId, { updatedAt: now });

    return args.pageId;
  },
});

export const deletePage = mutation({
  args: {
    pageId: v.id("wikiPages"),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Wiki page not found");

    const now = Date.now();

    await ctx.db.insert("agentActivity", {
      bankId: page.bankId,
      agentId: args.deletedBy,
      action: "wiki_edit",
      details: JSON.stringify({
        pageId: args.pageId,
        title: page.title,
        action: "delete",
      }),
      timestamp: now,
    });

    await ctx.db.delete(args.pageId);
    await ctx.db.patch(page.bankId, { updatedAt: now });

    return args.pageId;
  },
});

export const getPage = query({
  args: { pageId: v.id("wikiPages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pageId);
  },
});

export const getPageBySlug = query({
  args: {
    bankId: v.id("memoryBanks"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wikiPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const listPages = query({
  args: {
    bankId: v.id("memoryBanks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("wikiPages")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .order("desc")
      .take(limit);
  },
});

export const searchPages = query({
  args: {
    bankId: v.id("memoryBanks"),
    searchText: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchLower = args.searchText.toLowerCase();

    const pages = await ctx.db
      .query("wikiPages")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .order("desc")
      .take(500);

    return pages
      .filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.content.toLowerCase().includes(searchLower),
      )
      .slice(0, limit);
  },
});

export const getRecentPages = query({
  args: {
    bankId: v.id("memoryBanks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const pages = await ctx.db
      .query("wikiPages")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .order("desc")
      .take(limit);

    return pages.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
