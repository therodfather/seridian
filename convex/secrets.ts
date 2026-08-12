import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Admin usernames/pubkeys allowed to set write-only secrets */
const ADMIN_HANDLES = ["d", "rod", "admin", "fource", "therodfather"];

function checkAdminPermission(currentUser?: string) {
  if (!currentUser) return false;
  const normalized = currentUser.toLowerCase().trim();
  return ADMIN_HANDLES.some((h) => normalized.includes(h));
}

/** Utility to mask secret values (e.g. "lin_api_12345678" -> "lin_api_...5678") */
function maskSecret(val: string): string {
  if (val.length <= 8) return "••••••••";
  const prefix = val.substring(0, 8);
  const suffix = val.substring(val.length - 4);
  return `${prefix}...${suffix}`;
}

/** List metadata & masked values of secrets (Write-Only Vault) */
export const listSecrets = query({
  args: {
    currentUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isAdmin = checkAdminPermission(args.currentUserId);
    const secrets = await ctx.db.query("secrets").collect();
    return secrets.map((s) => ({
      _id: s._id,
      name: s.name,
      maskedValue: s.maskedValue,
      description: s.description,
      category: s.category,
      updatedBy: s.updatedBy,
      updatedAt: s.updatedAt,
      isAdmin,
    }));
  },
});

/** Upsert a secret (Admin write-only, value is stored masked and synced to meta) */
export const setSecret = mutation({
  args: {
    name: v.string(),
    secretValue: v.string(),
    description: v.optional(v.string()),
    category: v.union(v.literal("linear"), v.literal("github"), v.literal("convex"), v.literal("other")),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const isAdmin = checkAdminPermission(args.currentUserId);
    if (!isAdmin) {
      throw new Error(`Unauthorized: Only admin users (D, Rod) can manage secrets.`);
    }

    const masked = maskSecret(args.secretValue.trim());

    // Check if secret already exists
    const existing = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        maskedValue: masked,
        description: args.description,
        category: args.category,
        updatedBy: args.currentUserId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("secrets", {
        name: args.name,
        maskedValue: masked,
        description: args.description,
        category: args.category,
        updatedBy: args.currentUserId,
        updatedAt: Date.now(),
      });
    }

    return { success: true, maskedValue: masked };
  },
});
