import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ADMIN_HANDLES = ["dee", "d", "rod", "admin", "fource", "therodfather"];

function checkAdminPermission(currentUser?: string) {
  if (!currentUser) return false;
  const normalized = currentUser.toLowerCase().trim();
  return ADMIN_HANDLES.some((h) => normalized.includes(h));
}

function maskSecret(val: string): string {
  if (val.length <= 8) return "••••••••";
  return `${val.substring(0, 8)}...${val.substring(val.length - 4)}`;
}

export const listSecrets = query({
  args: { currentUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const secrets = await ctx.db.query("secrets").take(500);
    return secrets.map((s) => ({
      _id: s._id,
      name: s.name,
      maskedValue: s.maskedValue,
      description: s.description,
      category: s.category,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  },
});

export const setSecret = mutation({
  args: {
    name: v.string(),
    secretValue: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!checkAdminPermission(args.currentUserId)) {
      throw new Error("Unauthorized");
    }

    const masked = maskSecret(args.secretValue.trim());
    const existing = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        maskedValue: masked,
        description: args.description,
        category: args.category,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("secrets", {
        name: args.name,
        maskedValue: masked,
        description: args.description,
        category: args.category,
        updatedBy: args.currentUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("auditLogs", {
      action: existing ? "Secret Value Updated" : "Secret Value Created",
      actor: args.currentUserId || "Admin",
      details: `${existing ? "Updated" : "Created"} secret vault entry ${args.name}`,
      category: "secret",
      timestamp: Date.now(),
      metadata: JSON.stringify({ secretName: args.name, category: args.category }),
    });

    return { success: true };
  },
});

export const deleteSecret = mutation({
  args: {
    name: v.string(),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!checkAdminPermission(args.currentUserId)) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.insert("auditLogs", {
        action: "Secret Value Deleted",
        actor: args.currentUserId || "Admin",
        details: `Deleted secret vault entry ${args.name}`,
        category: "secret",
        timestamp: Date.now(),
        metadata: JSON.stringify({ secretName: args.name }),
      });
    }

    return { success: true };
  },
});
