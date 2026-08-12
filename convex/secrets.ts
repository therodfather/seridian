import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/admin";

function maskSecret(val: string): string {
  if (val.length <= 8) return "••••••••";
  return `${val.substring(0, 8)}...${val.substring(val.length - 4)}`;
}

export const listSecrets = query({
  args: { currentUserId: v.optional(v.string()) },
  returns: v.array(
    v.object({
      _id: v.id("secrets"),
      name: v.string(),
      maskedValue: v.string(),
      description: v.optional(v.string()),
      category: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      hasCiphertext: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const secrets = await ctx.db.query("secrets").take(500);
    return secrets.map((s) => ({
      _id: s._id,
      name: s.name,
      maskedValue: s.maskedValue,
      description: s.description,
      category: s.category,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      hasCiphertext: Boolean(s.ciphertext),
    }));
  },
});

/** Public: whether a named secret has recoverable ciphertext (no value leaked). */
export const hasSecret = query({
  args: { name: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    return Boolean(existing?.ciphertext);
  },
});

/**
 * Server-only: return secret material for actions (e.g. Linear sync).
 * Never call from the client.
 */
export const getSecretValue = internalQuery({
  args: { name: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    return existing?.ciphertext ?? null;
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
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const trimmed = args.secretValue.trim();
    if (!trimmed) {
      throw new Error("Secret value is required");
    }

    const masked = maskSecret(trimmed);
    const existing = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        maskedValue: masked,
        ciphertext: trimmed,
        description: args.description,
        category: args.category,
        updatedBy: args.currentUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("secrets", {
        name: args.name,
        maskedValue: masked,
        ciphertext: trimmed,
        description: args.description,
        category: args.category,
        updatedBy: args.currentUserId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      action: existing ? "Secret Value Updated" : "Secret Value Created",
      actor: args.currentUserId || "Admin",
      details: `${existing ? "Updated" : "Created"} secret vault entry ${args.name}`,
      category: "secret",
      timestamp: now,
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
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

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
