import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("clients")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(500);
    }
    return await ctx.db.query("clients").order("desc").take(500);
  },
});

export const get = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clientId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    company: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companyLinkedin: v.optional(v.string()),
    companyTwitter: v.optional(v.string()),
    companyGithub: v.optional(v.string()),
    techStack: v.optional(v.array(v.string())),
    identifiedNeeds: v.optional(v.array(v.string())),
    competitors: v.optional(v.array(v.string())),
    annualRevenue: v.optional(v.string()),
    companySize: v.optional(v.string()),
    downstreamClients: v.optional(
      v.array(
        v.object({
          name: v.string(),
          industry: v.optional(v.string()),
          relationshipType: v.string(),
          notes: v.optional(v.string()),
        })
      )
    ),
    keyPersonnel: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          role: v.string(),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          twitter: v.optional(v.string()),
          github: v.optional(v.string()),
          personalWebsite: v.optional(v.string()),
          influenceLevel: v.optional(v.union(v.literal("champion"), v.literal("decision_maker"), v.literal("blocker"), v.literal("neutral"))),
          personalInterests: v.optional(v.array(v.string())),
          backgroundCheckNotes: v.optional(v.string()),
          backgroundCheckStatus: v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("flagged"), v.literal("none"))),
          notes: v.optional(v.string()),
        })
      )
    ),
    relationshipGraph: v.optional(
      v.array(
        v.object({
          sourceId: v.string(),
          targetId: v.string(),
          relation: v.string(),
        })
      )
    ),
    intelligenceNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clients", args);
  },
});

export const update = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companyLinkedin: v.optional(v.string()),
    companyTwitter: v.optional(v.string()),
    companyGithub: v.optional(v.string()),
    techStack: v.optional(v.array(v.string())),
    identifiedNeeds: v.optional(v.array(v.string())),
    competitors: v.optional(v.array(v.string())),
    annualRevenue: v.optional(v.string()),
    companySize: v.optional(v.string()),
    downstreamClients: v.optional(
      v.array(
        v.object({
          name: v.string(),
          industry: v.optional(v.string()),
          relationshipType: v.string(),
          notes: v.optional(v.string()),
        })
      )
    ),
    keyPersonnel: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          role: v.string(),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          twitter: v.optional(v.string()),
          github: v.optional(v.string()),
          personalWebsite: v.optional(v.string()),
          influenceLevel: v.optional(v.union(v.literal("champion"), v.literal("decision_maker"), v.literal("blocker"), v.literal("neutral"))),
          personalInterests: v.optional(v.array(v.string())),
          backgroundCheckNotes: v.optional(v.string()),
          backgroundCheckStatus: v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("flagged"), v.literal("none"))),
          notes: v.optional(v.string()),
        })
      )
    ),
    relationshipGraph: v.optional(
      v.array(
        v.object({
          sourceId: v.string(),
          targetId: v.string(),
          relation: v.string(),
        })
      )
    ),
    intelligenceNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clientId, ...fields } = args;
    const nonUndefined = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(clientId, nonUndefined);
    return clientId;
  },
});

export const remove = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.clientId);
  },
});
