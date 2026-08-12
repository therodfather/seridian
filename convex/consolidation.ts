import { query } from "./_generated/server";
import { v } from "convex/values";

export const getConsolidationCandidates = query({
  args: {
    bankId: v.id("memoryBanks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(500);

    const candidates = memories.filter((m) => {
      if (m.consolidatedAt) return false;
      return m.proofCount >= 3 || m.relations.length >= 2;
    });

    return candidates
      .sort((a, b) => b.proofCount - a.proofCount)
      .slice(0, limit)
      .map((m) => ({
        _id: m._id,
        content: m.content,
        type: m.type,
        proofCount: m.proofCount,
        relationCount: m.relations.length,
      }));
  },
});
