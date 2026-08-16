/**
 * Resend email — shared across Forms, Workflows, and future products.
 * API key in secrets vault; from-address on integrationConfigs.teamId.
 */
import { internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/admin";
import { RESEND_API_KEY_NAME } from "./resendHelpers";

export { RESEND_API_KEY_NAME };

const RESEND_API = "https://api.resend.com/emails";

function maskSecret(val: string): string {
  if (val.length <= 8) return "••••••••";
  return `${val.substring(0, 8)}...${val.substring(val.length - 4)}`;
}

export const completeResendSetup = mutation({
  args: {
    currentUserId: v.string(),
    apiKey: v.string(),
    fromEmail: v.string(),
  },
  returns: v.object({ success: v.boolean(), maskedValue: v.string() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const trimmed = args.apiKey.trim();
    if (!trimmed.startsWith("re_") || trimmed.length < 20) {
      throw new Error("That doesn't look like a Resend API key (re_…)");
    }
    const from = args.fromEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from) && !from.includes("<")) {
      throw new Error("From email must look like hello@yourdomain.com");
    }

    const masked = maskSecret(trimmed);
    const now = Date.now();
    const existingSecret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", RESEND_API_KEY_NAME))
      .first();

    if (existingSecret) {
      await ctx.db.patch(existingSecret._id, {
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Resend API key",
        category: "api",
        updatedBy: args.currentUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("secrets", {
        name: RESEND_API_KEY_NAME,
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Resend API key",
        category: "api",
        updatedBy: args.currentUserId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existing = await ctx.db
      .query("integrationConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", "resend"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        status: "connected",
        teamId: from,
        secretName: RESEND_API_KEY_NAME,
        configuredBy: args.currentUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("integrationConfigs", {
        provider: "resend",
        enabled: true,
        status: "connected",
        teamId: from,
        secretName: RESEND_API_KEY_NAME,
        configuredBy: args.currentUserId,
        configuredAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      action: "Resend Integration Connected",
      actor: args.currentUserId,
      details: "Completed admin Resend setup (API key stored in Convex vault)",
      category: "secret",
      timestamp: now,
      metadata: JSON.stringify({ secretName: RESEND_API_KEY_NAME, from }),
    });

    return { success: true, maskedValue: masked };
  },
});

export const disconnectResend = mutation({
  args: { currentUserId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", RESEND_API_KEY_NAME))
      .first();
    if (secret) await ctx.db.delete(secret._id);

    const config = await ctx.db
      .query("integrationConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", "resend"))
      .first();
    if (config) {
      await ctx.db.patch(config._id, {
        enabled: false,
        status: "not_configured",
        teamId: undefined,
        secretName: undefined,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("auditLogs", {
      action: "Resend Integration Disconnected",
      actor: args.currentUserId,
      details: "Removed Resend vault key",
      category: "secret",
      timestamp: Date.now(),
      metadata: JSON.stringify({ secretName: RESEND_API_KEY_NAME }),
    });

    return { success: true };
  },
});

/**
 * Send one email via Resend. Used by Workflows and Forms.
 */
export const sendEmail = internalAction({
  args: {
    to: v.array(v.string()),
    subject: v.string(),
    text: v.string(),
    html: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    id: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const apiKey: string | null = await ctx.runQuery(
      internal.resendHelpers.getApiKey,
      {},
    );
    if (!apiKey) {
      return {
        ok: false,
        error:
          "Resend is not connected (Settings → Integrations → Resend, or RESEND_API_KEY)",
      };
    }
    const config: {
      enabled: boolean;
      status: string;
      fromEmail?: string;
    } | null = await ctx.runQuery(internal.resendHelpers.getConfig, {});
    const from: string =
      config?.fromEmail?.trim() || process.env.RESEND_FROM_EMAIL || "";
    if (!from) {
      return {
        ok: false,
        error: "Resend from-address is not configured",
      };
    }

    const to = args.to.map((t) => t.trim()).filter(Boolean);
    if (to.length === 0) {
      return { ok: false, error: "No recipients" };
    }

    const res: Response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: args.subject.slice(0, 998),
        text: args.text.slice(0, 100_000),
        html: args.html?.slice(0, 100_000),
        reply_to: args.replyTo,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error: body.message || body.name || `Resend HTTP ${res.status}`,
      };
    }

    return { ok: true, id: body.id };
  },
});
