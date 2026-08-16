/**
 * Resend config queries — kept separate from sendEmail to avoid
 * circular TypeScript inference through `internal.resend`.
 */
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const RESEND_API_KEY_NAME = "RESEND_API_KEY";

export const getApiKey = internalQuery({
  args: {},
  returns: v.union(v.null(), v.string()),
  handler: async (ctx) => {
    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", RESEND_API_KEY_NAME))
      .first();
    if (secret?.ciphertext) return secret.ciphertext;
    return process.env.RESEND_API_KEY ?? null;
  },
});

/** fromEmail is stored in integrationConfigs.teamId for provider resend. */
export const getConfig = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      enabled: v.boolean(),
      status: v.string(),
      fromEmail: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("integrationConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", "resend"))
      .first();
    if (!config) return null;
    return {
      enabled: config.enabled,
      status: config.status,
      fromEmail: config.teamId,
    };
  },
});
