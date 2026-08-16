import { internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/admin";
import { TELNYX_API_KEY_NAME } from "./telnyx";
import { RESEND_API_KEY_NAME } from "./resendHelpers";

const providerValidator = v.union(
  v.literal("linear"),
  v.literal("github"),
  v.literal("netlify"),
  v.literal("stripe"),
  v.literal("mercury"),
  v.literal("telnyx"),
  v.literal("resend"),
);

const statusValidator = v.union(
  v.literal("not_configured"),
  v.literal("configured"),
  v.literal("connected"),
);

type Provider =
  | "linear"
  | "github"
  | "netlify"
  | "stripe"
  | "mercury"
  | "telnyx"
  | "resend";
type IntegrationStatus = "not_configured" | "configured" | "connected";

const LINEAR_SECRET_NAME = "LINEAR_API_KEY";
const STRIPE_WEBHOOK_SECRET_NAME = "STRIPE_WEBHOOK_SECRET";
const MERCURY_API_TOKEN_NAME = "MERCURY_API_TOKEN";

/** Single-secret providers whose only setup step is pasting one credential. */
const SINGLE_SECRET_PROVIDERS = {
  stripe: STRIPE_WEBHOOK_SECRET_NAME,
  mercury: MERCURY_API_TOKEN_NAME,
} as const;

function maskSecret(val: string): string {
  if (val.length <= 8) return "••••••••";
  return `${val.substring(0, 8)}...${val.substring(val.length - 4)}`;
}

const statusRowValidator = v.object({
  provider: providerValidator,
  enabled: v.boolean(),
  status: statusValidator,
  teamId: v.optional(v.string()),
  projectId: v.optional(v.string()),
  secretName: v.optional(v.string()),
  hasSecret: v.boolean(),
  configuredBy: v.optional(v.string()),
  configuredAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

async function upsertConfig(
  ctx: MutationCtx,
  args: {
    provider: Provider;
    enabled: boolean;
    status: IntegrationStatus;
    teamId?: string;
    projectId?: string;
    secretName?: string;
    configuredBy: string;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("integrationConfigs")
    .withIndex("by_provider", (q) => q.eq("provider", args.provider))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      enabled: args.enabled,
      status: args.status,
      teamId: args.teamId,
      projectId: args.projectId,
      secretName: args.secretName,
      configuredBy: args.configuredBy,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("integrationConfigs", {
      provider: args.provider,
      enabled: args.enabled,
      status: args.status,
      teamId: args.teamId,
      projectId: args.projectId,
      secretName: args.secretName,
      configuredBy: args.configuredBy,
      configuredAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Public status for Settings UI. Never returns secret values.
 */
export const listStatuses = query({
  args: {},
  returns: v.array(statusRowValidator),
  handler: async (ctx) => {
    const providers: Provider[] = [
      "github",
      "netlify",
      "linear",
      "stripe",
      "mercury",
      "telnyx",
      "resend",
    ];
    const rows = [];

    for (const provider of providers) {
      const config = await ctx.db
        .query("integrationConfigs")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .first();

      const requiresSecret =
        provider === "linear" ||
        provider === "telnyx" ||
        provider === "resend" ||
        provider in SINGLE_SECRET_PROVIDERS;

      let hasSecret = false;
      if (provider === "linear") {
        const secret = await ctx.db
          .query("secrets")
          .withIndex("by_name", (q) => q.eq("name", LINEAR_SECRET_NAME))
          .first();
        hasSecret = Boolean(secret?.ciphertext);
      } else if (provider === "stripe" || provider === "mercury") {
        const secret = await ctx.db
          .query("secrets")
          .withIndex("by_name", (q) =>
            q.eq("name", SINGLE_SECRET_PROVIDERS[provider]),
          )
          .first();
        hasSecret = Boolean(secret?.ciphertext);
      } else if (provider === "telnyx") {
        const secret = await ctx.db
          .query("secrets")
          .withIndex("by_name", (q) => q.eq("name", TELNYX_API_KEY_NAME))
          .first();
        hasSecret = Boolean(secret?.ciphertext);
      } else if (provider === "resend") {
        const secret = await ctx.db
          .query("secrets")
          .withIndex("by_name", (q) => q.eq("name", RESEND_API_KEY_NAME))
          .first();
        hasSecret = Boolean(secret?.ciphertext);
      }

      if (!config) {
        rows.push({
          provider,
          enabled: !requiresSecret,
          status: requiresSecret
            ? ("not_configured" as const)
            : ("configured" as const),
          hasSecret,
        });
        continue;
      }

      const status: IntegrationStatus =
        requiresSecret && !hasSecret && config.status !== "not_configured"
          ? "not_configured"
          : config.status;

      rows.push({
        provider: config.provider,
        enabled: config.enabled,
        status,
        teamId: config.teamId,
        projectId: config.projectId,
        secretName: config.secretName,
        hasSecret,
        configuredBy: config.configuredBy,
        configuredAt: config.configuredAt,
        updatedAt: config.updatedAt,
      });
    }

    return rows;
  },
});

/** Server-only Linear config for sync actions. */
export const getLinearConfig = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      enabled: v.boolean(),
      status: statusValidator,
      teamId: v.optional(v.string()),
      projectId: v.optional(v.string()),
      secretName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("integrationConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", "linear"))
      .first();
    if (!config) return null;
    return {
      enabled: config.enabled,
      status: config.status,
      teamId: config.teamId,
      projectId: config.projectId,
      secretName: config.secretName,
    };
  },
});

/**
 * Step 1: enable / disable which integrations the admin wants to set up.
 * GitHub/Netlify stay link-only; Linear flips to setup-required when enabled.
 */
export const setEnabledProviders = mutation({
  args: {
    currentUserId: v.string(),
    providers: v.array(providerValidator),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const selected = new Set(args.providers);
    const all: Provider[] = ["github", "netlify", "linear"];

    for (const provider of all) {
      const enabled = selected.has(provider);
      const existing = await ctx.db
        .query("integrationConfigs")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .first();

      if (provider === "linear") {
        const secret = await ctx.db
          .query("secrets")
          .withIndex("by_name", (q) => q.eq("name", LINEAR_SECRET_NAME))
          .first();
        const hasSecret = Boolean(secret?.ciphertext);
        await upsertConfig(ctx, {
          provider,
          enabled,
          status: enabled && hasSecret ? "connected" : "not_configured",
          teamId: existing?.teamId,
          projectId: existing?.projectId,
          secretName: hasSecret ? LINEAR_SECRET_NAME : undefined,
          configuredBy: args.currentUserId,
        });
      } else {
        await upsertConfig(ctx, {
          provider,
          enabled,
          status: enabled ? "configured" : "not_configured",
          configuredBy: args.currentUserId,
        });
      }
    }

    await ctx.db.insert("auditLogs", {
      action: "Integration Selection Updated",
      actor: args.currentUserId,
      details: `Enabled integrations: ${args.providers.join(", ") || "(none)"}`,
      category: "secret",
      timestamp: Date.now(),
      metadata: JSON.stringify({ providers: args.providers }),
    });

    return { success: true };
  },
});

/**
 * Complete Linear connect: store API key in secrets vault + mark connected.
 * Never logs the key value.
 */
export const completeLinearSetup = mutation({
  args: {
    currentUserId: v.string(),
    apiKey: v.string(),
    teamId: v.optional(v.string()),
    projectId: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), maskedValue: v.string() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const trimmed = args.apiKey.trim();
    if (!trimmed.startsWith("lin_api_") && !trimmed.startsWith("lin_")) {
      throw new Error("Linear API key should start with lin_api_");
    }

    const masked = maskSecret(trimmed);
    const now = Date.now();
    const existingSecret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", LINEAR_SECRET_NAME))
      .first();

    if (existingSecret) {
      await ctx.db.patch(existingSecret._id, {
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Linear API key for issue sync",
        category: "api",
        updatedBy: args.currentUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("secrets", {
        name: LINEAR_SECRET_NAME,
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Linear API key for issue sync",
        category: "api",
        updatedBy: args.currentUserId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await upsertConfig(ctx, {
      provider: "linear",
      enabled: true,
      status: "connected",
      teamId: args.teamId?.trim() || undefined,
      projectId: args.projectId?.trim() || undefined,
      secretName: LINEAR_SECRET_NAME,
      configuredBy: args.currentUserId,
    });

    await ctx.db.insert("auditLogs", {
      action: "Linear Integration Connected",
      actor: args.currentUserId,
      details: "Completed admin Linear setup (API key stored in Convex vault)",
      category: "secret",
      timestamp: now,
      metadata: JSON.stringify({
        secretName: LINEAR_SECRET_NAME,
        masked: masked,
        hasTeamId: Boolean(args.teamId?.trim()),
        hasProjectId: Boolean(args.projectId?.trim()),
      }),
    });

    return { success: true, maskedValue: masked };
  },
});

export const disconnectLinear = mutation({
  args: { currentUserId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", LINEAR_SECRET_NAME))
      .first();
    if (secret) {
      await ctx.db.delete(secret._id);
    }

    await upsertConfig(ctx, {
      provider: "linear",
      enabled: false,
      status: "not_configured",
      configuredBy: args.currentUserId,
    });

    await ctx.db.insert("auditLogs", {
      action: "Linear Integration Disconnected",
      actor: args.currentUserId,
      details: "Removed Linear vault key and marked integration not configured",
      category: "secret",
      timestamp: Date.now(),
      metadata: JSON.stringify({ secretName: LINEAR_SECRET_NAME }),
    });

    return { success: true };
  },
});

/**
 * Complete Stripe connect: store the webhook signing secret in the vault so
 * convex/http.ts can verify incoming webhooks without a `convex env set`.
 */
export const completeStripeSetup = mutation({
  args: { currentUserId: v.string(), webhookSecret: v.string() },
  returns: v.object({ success: v.boolean(), maskedValue: v.string() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const trimmed = args.webhookSecret.trim();
    if (!trimmed.startsWith("whsec_")) {
      throw new Error("Stripe webhook secret should start with whsec_");
    }

    const masked = maskSecret(trimmed);
    const now = Date.now();
    const existingSecret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", STRIPE_WEBHOOK_SECRET_NAME))
      .first();

    if (existingSecret) {
      await ctx.db.patch(existingSecret._id, {
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Stripe webhook signing secret",
        category: "api",
        updatedBy: args.currentUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("secrets", {
        name: STRIPE_WEBHOOK_SECRET_NAME,
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Stripe webhook signing secret",
        category: "api",
        updatedBy: args.currentUserId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await upsertConfig(ctx, {
      provider: "stripe",
      enabled: true,
      status: "connected",
      secretName: STRIPE_WEBHOOK_SECRET_NAME,
      configuredBy: args.currentUserId,
    });

    await ctx.db.insert("auditLogs", {
      action: "Stripe Integration Connected",
      actor: args.currentUserId,
      details: "Completed admin Stripe setup (webhook secret stored in Convex vault)",
      category: "secret",
      timestamp: now,
      metadata: JSON.stringify({
        secretName: STRIPE_WEBHOOK_SECRET_NAME,
        masked,
      }),
    });

    return { success: true, maskedValue: masked };
  },
});

export const disconnectStripe = mutation({
  args: { currentUserId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", STRIPE_WEBHOOK_SECRET_NAME))
      .first();
    if (secret) {
      await ctx.db.delete(secret._id);
    }

    await upsertConfig(ctx, {
      provider: "stripe",
      enabled: false,
      status: "not_configured",
      configuredBy: args.currentUserId,
    });

    await ctx.db.insert("auditLogs", {
      action: "Stripe Integration Disconnected",
      actor: args.currentUserId,
      details: "Removed Stripe vault key and marked integration not configured",
      category: "secret",
      timestamp: Date.now(),
      metadata: JSON.stringify({ secretName: STRIPE_WEBHOOK_SECRET_NAME }),
    });

    return { success: true };
  },
});

/** Server-only Stripe webhook secret for convex/http.ts. Never exposed to clients. */
export const getStripeWebhookSecret = internalQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", STRIPE_WEBHOOK_SECRET_NAME))
      .first();
    return secret?.ciphertext ?? null;
  },
});

/**
 * Complete Mercury connect: store a read-only Mercury API token in the vault.
 */
export const completeMercurySetup = mutation({
  args: { currentUserId: v.string(), apiToken: v.string() },
  returns: v.object({ success: v.boolean(), maskedValue: v.string() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const trimmed = args.apiToken.trim();
    if (trimmed.length < 16) {
      throw new Error("That doesn't look like a full Mercury API token");
    }

    const masked = maskSecret(trimmed);
    const now = Date.now();
    const existingSecret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", MERCURY_API_TOKEN_NAME))
      .first();

    if (existingSecret) {
      await ctx.db.patch(existingSecret._id, {
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Mercury read-only API token",
        category: "api",
        updatedBy: args.currentUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("secrets", {
        name: MERCURY_API_TOKEN_NAME,
        maskedValue: masked,
        ciphertext: trimmed,
        description: "Mercury read-only API token",
        category: "api",
        updatedBy: args.currentUserId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await upsertConfig(ctx, {
      provider: "mercury",
      enabled: true,
      status: "connected",
      secretName: MERCURY_API_TOKEN_NAME,
      configuredBy: args.currentUserId,
    });

    await ctx.db.insert("auditLogs", {
      action: "Mercury Integration Connected",
      actor: args.currentUserId,
      details: "Completed admin Mercury setup (API token stored in Convex vault)",
      category: "secret",
      timestamp: now,
      metadata: JSON.stringify({
        secretName: MERCURY_API_TOKEN_NAME,
        masked,
      }),
    });

    return { success: true, maskedValue: masked };
  },
});

export const disconnectMercury = mutation({
  args: { currentUserId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", MERCURY_API_TOKEN_NAME))
      .first();
    if (secret) {
      await ctx.db.delete(secret._id);
    }

    await upsertConfig(ctx, {
      provider: "mercury",
      enabled: false,
      status: "not_configured",
      configuredBy: args.currentUserId,
    });

    await ctx.db.insert("auditLogs", {
      action: "Mercury Integration Disconnected",
      actor: args.currentUserId,
      details: "Removed Mercury vault key and marked integration not configured",
      category: "secret",
      timestamp: Date.now(),
      metadata: JSON.stringify({ secretName: MERCURY_API_TOKEN_NAME }),
    });

    return { success: true };
  },
});
