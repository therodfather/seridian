/**
 * Minimal tenant registry. Optional scope for IVR flows; the rest of the app
 * (clients, deals, wiki, etc.) is still single-tenant.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/admin";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const list = query({
  args: { currentUserId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("businesses"),
      name: v.string(),
      slug: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const rows = await ctx.db.query("businesses").order("desc").take(100);
    return rows.map((b) => ({
      _id: b._id,
      name: b.name,
      slug: b.slug,
      createdAt: b.createdAt,
    }));
  },
});

export const create = mutation({
  args: { currentUserId: v.string(), name: v.string() },
  returns: v.id("businesses"),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const name = args.name.trim();
    if (!name) throw new Error("Business name is required");

    let slug = slugify(name);
    const existing = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) slug = `${slug}-${Date.now()}`;

    const now = Date.now();
    return await ctx.db.insert("businesses", {
      name,
      slug,
      createdBy: args.currentUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});
