import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("secret"),
        v.literal("user"),
        v.literal("sync"),
        v.literal("system")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    if (args.category) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

export const log = mutation({
  args: {
    action: v.string(),
    actor: v.string(),
    details: v.string(),
    category: v.union(
      v.literal("secret"),
      v.literal("user"),
      v.literal("sync"),
      v.literal("system")
    ),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    return await ctx.db.insert("auditLogs", {
      ...args,
      timestamp,
    });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("auditLogs").take(1);
    if (existing.length > 0) return { seeded: false, count: 0 };

    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;

    const initialLogs = [
      {
        action: "Linear Manual Sync Triggered",
        actor: "Dee",
        details: "Triggered full manual sync of Linear workspace issues and projects",
        category: "sync" as const,
        timestamp: now - 15 * minute,
        metadata: JSON.stringify({ source: "Settings > Integration Engine", status: "completed" }),
      },
      {
        action: "Secret Value Updated",
        actor: "Rod",
        details: "Updated system vault secret LINEAR_API_KEY",
        category: "secret" as const,
        timestamp: now - 1 * hour - 10 * minute,
        metadata: JSON.stringify({ secretName: "LINEAR_API_KEY", masked: "lin_api_...89f2" }),
      },
      {
        action: "User Revocation Executed",
        actor: "Admin",
        details: "Revoked access and deleted member account handle @former_contractor",
        category: "user" as const,
        timestamp: now - 3 * hour - 45 * minute,
        metadata: JSON.stringify({ pubkey: "former_contractor", targetUser: "Contractor User" }),
      },
      {
        action: "Secret Value Created",
        actor: "Dee",
        details: "Added new production API key GITHUB_TOKEN to vault",
        category: "secret" as const,
        timestamp: now - 6 * hour,
        metadata: JSON.stringify({ secretName: "GITHUB_TOKEN", category: "api" }),
      },
      {
        action: "GitHub Sync Triggered",
        actor: "Rod",
        details: "Manual repository sync initiated for therodfather/seridian",
        category: "sync" as const,
        timestamp: now - 12 * hour,
        metadata: JSON.stringify({ repo: "therodfather/seridian", status: "success" }),
      },
      {
        action: "System Governance Policy Updated",
        actor: "System",
        details: "Enabled immutable action audit logging and real-time alerts",
        category: "system" as const,
        timestamp: now - 24 * hour,
        metadata: JSON.stringify({ policy: "AuditLogsEnabled", enabled: true }),
      },
    ];

    for (const item of initialLogs) {
      await ctx.db.insert("auditLogs", item);
    }

    return { seeded: true, count: initialLogs.length };
  },
});
