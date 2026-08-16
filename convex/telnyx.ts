/**
 * Telnyx account connection + Call Control number assignment for IVR flows.
 * Secrets live in the vault; Call Control apps point at /telnyx/webhook.
 */
import {
  action,
  internalQuery,
  mutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/admin";

export const TELNYX_API_KEY_NAME = "TELNYX_API_KEY";
export const TELNYX_PUBLIC_KEY_NAME = "TELNYX_PUBLIC_KEY";
const TELNYX_API_BASE = "https://api.telnyx.com/v2";

function maskSecret(val: string): string {
  if (val.length <= 8) return "••••••••";
  return `${val.substring(0, 8)}...${val.substring(val.length - 4)}`;
}

async function resolveApiKey(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: (queryRef: any, args: any) => Promise<any>;
}): Promise<string> {
  const key: string | null = await ctx.runQuery(
    internal.secrets.getSecretValue,
    { name: TELNYX_API_KEY_NAME },
  );
  if (!key) {
    throw new Error(
      "Telnyx isn't connected yet — paste an API key in Settings → Integrations first.",
    );
  }
  return key;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function telnyxFetch(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<any> {
  const res = await fetch(`${TELNYX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title ?? res.statusText;
    throw new Error(`Telnyx API error (${res.status}): ${message}`);
  }
  return body;
}

async function upsertSecret(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { db: any },
  name: string,
  value: string,
  description: string,
  updatedBy: string,
) {
  const masked = maskSecret(value);
  const now = Date.now();
  const existing = await ctx.db
    .query("secrets")
    .withIndex("by_name", (q: { eq: (f: string, v: string) => unknown }) =>
      q.eq("name", name),
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      maskedValue: masked,
      ciphertext: value,
      description,
      category: "api",
      updatedBy,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("secrets", {
      name,
      maskedValue: masked,
      ciphertext: value,
      description,
      category: "api",
      updatedBy,
      createdAt: now,
      updatedAt: now,
    });
  }
  return masked;
}

/**
 * Store Telnyx API key + Ed25519 webhook public key in the vault.
 * Set via dashboard; also document as Convex env fallbacks in .env.example.
 */
export const completeTelnyxSetup = mutation({
  args: {
    currentUserId: v.string(),
    apiKey: v.string(),
    publicKey: v.string(),
  },
  returns: v.object({ success: v.boolean(), maskedValue: v.string() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    const trimmed = args.apiKey.trim();
    if (trimmed.length < 20) {
      throw new Error("That doesn't look like a full Telnyx API key");
    }
    const trimmedPublicKey = args.publicKey.trim();
    if (trimmedPublicKey.length < 20) {
      throw new Error(
        "That doesn't look like a Telnyx webhook public key (Portal → Public Key)",
      );
    }

    const now = Date.now();
    const masked = await upsertSecret(
      ctx,
      TELNYX_API_KEY_NAME,
      trimmed,
      "Telnyx API key for Call Control IVR",
      args.currentUserId,
    );
    await upsertSecret(
      ctx,
      TELNYX_PUBLIC_KEY_NAME,
      trimmedPublicKey,
      "Telnyx webhook signing public key (Ed25519)",
      args.currentUserId,
    );

    const existingConfig = await ctx.db
      .query("integrationConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", "telnyx"))
      .first();
    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        enabled: true,
        status: "configured",
        secretName: TELNYX_API_KEY_NAME,
        configuredBy: args.currentUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("integrationConfigs", {
        provider: "telnyx",
        enabled: true,
        status: "configured",
        secretName: TELNYX_API_KEY_NAME,
        configuredBy: args.currentUserId,
        configuredAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      action: "Telnyx API Key Saved",
      actor: args.currentUserId,
      details: "Stored Telnyx API key in Convex vault",
      category: "secret",
      timestamp: now,
      metadata: JSON.stringify({ secretName: TELNYX_API_KEY_NAME, masked }),
    });

    return { success: true, maskedValue: masked };
  },
});

export const disconnectTelnyx = mutation({
  args: { currentUserId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);

    for (const name of [TELNYX_API_KEY_NAME, TELNYX_PUBLIC_KEY_NAME]) {
      const secret = await ctx.db
        .query("secrets")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      if (secret) await ctx.db.delete(secret._id);
    }

    const existingConfig = await ctx.db
      .query("integrationConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", "telnyx"))
      .first();
    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        enabled: false,
        status: "not_configured",
        updatedAt: Date.now(),
      });
    }

    const flows = await ctx.db.query("ivrFlows").take(200);
    for (const f of flows) {
      if (f.numberActive) {
        await ctx.db.patch(f._id, { numberActive: false, updatedAt: Date.now() });
      }
    }

    await ctx.db.insert("auditLogs", {
      action: "Telnyx Integration Disconnected",
      actor: args.currentUserId,
      details:
        "Removed Telnyx vault keys and deactivated IVR number assignments",
      category: "secret",
      timestamp: Date.now(),
      metadata: JSON.stringify({ secretName: TELNYX_API_KEY_NAME }),
    });

    return { success: true };
  },
});

export const listPhoneNumbers = action({
  args: { currentUserId: v.string() },
  returns: v.array(
    v.object({
      id: v.string(),
      phoneNumber: v.string(),
      connectionId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const apiKey = await resolveApiKey(ctx);
    const body = await telnyxFetch(apiKey, "/phone_numbers?page[size]=100");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = body?.data ?? [];
    return data.map((n) => ({
      id: String(n.id),
      phoneNumber: String(n.phone_number),
      connectionId:
        n.connection_id !== undefined && n.connection_id !== null
          ? String(n.connection_id)
          : undefined,
    }));
  },
});

/**
 * Create/reuse a Call Control Application for this flow, assign the chosen
 * Telnyx number, and mark the flow's number assignment active.
 */
export const assignNumber = action({
  args: {
    currentUserId: v.string(),
    flowId: v.id("ivrFlows"),
    phoneNumberId: v.string(),
    phoneNumber: v.string(),
  },
  returns: v.object({ success: v.boolean(), connectionId: v.string() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const apiKey = await resolveApiKey(ctx);

    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new Error(
        "CONVEX_SITE_URL is not set — cannot register a Telnyx webhook URL.",
      );
    }
    const webhookUrl = `${siteUrl}/telnyx/webhook`;
    const appName = `Seridian IVR — ${args.flowId}`;

    const existingApps = await telnyxFetch(
      apiKey,
      `/call_control_applications?filter[application_name]=${encodeURIComponent(appName)}`,
    );
    const existingApp = existingApps?.data?.[0];

    const appBody = {
      application_name: appName,
      webhook_event_url: webhookUrl,
      active: true,
      webhook_api_version: "2",
    };

    const app = existingApp
      ? await telnyxFetch(
          apiKey,
          `/call_control_applications/${existingApp.id}`,
          { method: "PATCH", body: JSON.stringify(appBody) },
        )
      : await telnyxFetch(apiKey, "/call_control_applications", {
          method: "POST",
          body: JSON.stringify(appBody),
        });

    const callControlAppId: string = String(app.data.id);
    const connectionId: string = String(
      app.data.connection_id ?? app.data.id,
    );

    await telnyxFetch(apiKey, `/phone_numbers/${args.phoneNumberId}`, {
      method: "PATCH",
      body: JSON.stringify({ connection_id: connectionId }),
    });

    await ctx.runMutation(internal.ivr.applyNumberAssignment, {
      flowId: args.flowId,
      currentUserId: args.currentUserId,
      phoneNumber: args.phoneNumber,
      phoneNumberId: args.phoneNumberId,
      callControlAppId,
      connectionId,
    });

    return { success: true, connectionId };
  },
});

export const getApiKeyForWebhook = internalQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", TELNYX_API_KEY_NAME))
      .first();
    return secret?.ciphertext ?? null;
  },
});

export const getPublicKeyForWebhook = internalQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const secret = await ctx.db
      .query("secrets")
      .withIndex("by_name", (q) => q.eq("name", TELNYX_PUBLIC_KEY_NAME))
      .first();
    return secret?.ciphertext ?? null;
  },
});
