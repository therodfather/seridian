/**
 * Forms CRUD + public submit (Formspree/Jotform-style).
 * Admin builds drafts; only published fields accept public submissions.
 * On submit, kicks matching workflows (trigger: form_submission).
 */
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/admin";
import {
  assertPublishableFields,
  defaultFormFields,
  formFieldsValidator,
  formStatusValidator,
  previewFromPayload,
  slugifyFormName,
  truncateText,
  validateSubmission,
  type FormField,
} from "./lib/formDefinition";

function randomSuffix(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function uniqueSlug(
  ctx: QueryCtx | MutationCtx,
  name: string,
  excludeId?: Id<"forms">,
): Promise<string> {
  const base = slugifyFormName(name);
  for (let i = 0; i < 8; i++) {
    const slug = i === 0 ? base : `${base}-${randomSuffix()}`;
    const existing = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (
      !existing ||
      existing._id === excludeId ||
      existing.status === "archived"
    ) {
      return slug;
    }
  }
  return `${base}-${Date.now().toString(36)}`;
}

const summaryValidator = v.object({
  _id: v.id("forms"),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  status: formStatusValidator,
  fieldCount: v.number(),
  submissionCount: v.number(),
  publishedVersion: v.optional(v.number()),
  updatedAt: v.number(),
});

export const list = query({
  args: { currentUserId: v.string() },
  returns: v.array(summaryValidator),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const rows = await ctx.db.query("forms").order("desc").take(100);
    return rows
      .filter((f) => f.status !== "archived")
      .map((f) => ({
        _id: f._id,
        name: f.name,
        slug: f.slug,
        description: f.description,
        status: f.status,
        fieldCount: f.draftFields.length,
        submissionCount: f.submissionCount,
        publishedVersion: f.publishedVersion,
        updatedAt: f.updatedAt,
      }));
  },
});

export const get = query({
  args: { currentUserId: v.string(), formId: v.id("forms") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("forms"),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      status: formStatusValidator,
      draftFields: formFieldsValidator,
      publishedFields: v.optional(formFieldsValidator),
      publishedVersion: v.optional(v.number()),
      submitButtonLabel: v.string(),
      successMessage: v.string(),
      redirectUrl: v.optional(v.string()),
      notifyWebhookUrl: v.optional(v.string()),
      notifyEmailTo: v.optional(v.string()),
      submissionCount: v.number(),
      updatedAt: v.number(),
      publishedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const form = await ctx.db.get(args.formId);
    if (!form || form.status === "archived") return null;
    return {
      _id: form._id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      status: form.status,
      draftFields: form.draftFields,
      publishedFields: form.publishedFields,
      publishedVersion: form.publishedVersion,
      submitButtonLabel: form.submitButtonLabel,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
      notifyWebhookUrl: form.notifyWebhookUrl,
      notifyEmailTo: form.notifyEmailTo,
      submissionCount: form.submissionCount,
      updatedAt: form.updatedAt,
      publishedAt: form.publishedAt,
    };
  },
});

/** Public read — live forms only. */
export const getPublicBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      fields: formFieldsValidator,
      submitButtonLabel: v.string(),
      successMessage: v.string(),
      redirectUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!form || form.status !== "live" || !form.publishedFields) return null;
    return {
      name: form.name,
      slug: form.slug,
      description: form.description,
      fields: form.publishedFields,
      submitButtonLabel: form.submitButtonLabel,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
    };
  },
});

export const create = mutation({
  args: {
    currentUserId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("forms"),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const name = args.name.trim() || "New form";
    const slug = await uniqueSlug(ctx, name);
    const now = Date.now();
    return await ctx.db.insert("forms", {
      name,
      slug,
      description: args.description?.trim() || undefined,
      status: "draft",
      draftFields: defaultFormFields(),
      submitButtonLabel: "Submit",
      successMessage: "Thanks — we received your response.",
      submissionCount: 0,
      createdBy: args.currentUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveDraft = mutation({
  args: {
    currentUserId: v.string(),
    formId: v.id("forms"),
    name: v.string(),
    description: v.optional(v.string()),
    slug: v.optional(v.string()),
    draftFields: formFieldsValidator,
    submitButtonLabel: v.string(),
    successMessage: v.string(),
    redirectUrl: v.optional(v.string()),
    notifyWebhookUrl: v.optional(v.string()),
    notifyEmailTo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const form = await ctx.db.get(args.formId);
    if (!form || form.status === "archived") {
      throw new Error("Form not found");
    }
    const name = args.name.trim() || form.name;
    let slug = form.slug;
    if (args.slug && args.slug.trim() && args.slug.trim() !== form.slug) {
      slug = await uniqueSlug(ctx, args.slug.trim(), form._id);
    }
    await ctx.db.patch(args.formId, {
      name,
      slug,
      description: args.description?.trim() || undefined,
      draftFields: args.draftFields as FormField[],
      submitButtonLabel: args.submitButtonLabel.trim() || "Submit",
      successMessage:
        args.successMessage.trim() || "Thanks — we received your response.",
      redirectUrl: args.redirectUrl?.trim() || undefined,
      notifyWebhookUrl: args.notifyWebhookUrl?.trim() || undefined,
      notifyEmailTo: args.notifyEmailTo?.trim() || undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const publish = mutation({
  args: { currentUserId: v.string(), formId: v.id("forms") },
  returns: v.object({ version: v.number(), slug: v.string() }),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const form = await ctx.db.get(args.formId);
    if (!form || form.status === "archived") {
      throw new Error("Form not found");
    }
    const fields = form.draftFields as FormField[];
    assertPublishableFields(fields);
    const version = (form.publishedVersion ?? 0) + 1;
    const now = Date.now();
    await ctx.db.patch(args.formId, {
      status: "live",
      publishedFields: fields,
      publishedVersion: version,
      publishedAt: now,
      updatedAt: now,
    });
    return { version, slug: form.slug };
  },
});

export const unpublish = mutation({
  args: { currentUserId: v.string(), formId: v.id("forms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const form = await ctx.db.get(args.formId);
    if (!form || form.status === "archived") {
      throw new Error("Form not found");
    }
    await ctx.db.patch(args.formId, {
      status: "draft",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const archive = mutation({
  args: { currentUserId: v.string(), formId: v.id("forms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const form = await ctx.db.get(args.formId);
    if (!form) throw new Error("Form not found");
    await ctx.db.patch(args.formId, {
      status: "archived",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const listSubmissions = query({
  args: {
    currentUserId: v.string(),
    formId: v.id("forms"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("formSubmissions"),
      preview: v.string(),
      source: v.union(
        v.literal("public_page"),
        v.literal("embed"),
        v.literal("api"),
      ),
      read: v.boolean(),
      createdAt: v.number(),
      payloadJson: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const form = await ctx.db.get(args.formId);
    if (!form) return [];
    const limit = Math.min(args.limit ?? 50, 100);
    const rows = await ctx.db
      .query("formSubmissions")
      .withIndex("by_form_and_createdAt", (q) => q.eq("formId", args.formId))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      _id: r._id,
      preview: r.preview,
      source: r.source,
      read: r.read,
      createdAt: r.createdAt,
      payloadJson: r.payloadJson,
    }));
  },
});

export const markSubmissionRead = mutation({
  args: {
    currentUserId: v.string(),
    submissionId: v.id("formSubmissions"),
    read: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.currentUserId);
    const row = await ctx.db.get(args.submissionId);
    if (!row) throw new Error("Submission not found");
    await ctx.db.patch(args.submissionId, { read: args.read });
    return null;
  },
});

export const internalGetLiveBySlug = internalQuery({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      formId: v.id("forms"),
      slug: v.string(),
      fields: formFieldsValidator,
      notifyWebhookUrl: v.optional(v.string()),
      successMessage: v.string(),
      redirectUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!form || form.status !== "live" || !form.publishedFields) return null;
    return {
      formId: form._id,
      slug: form.slug,
      fields: form.publishedFields,
      notifyWebhookUrl: form.notifyWebhookUrl,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
    };
  },
});

export const listFormSubmissionWorkflows = internalQuery({
  args: { formId: v.id("forms"), formSlug: v.string() },
  returns: v.array(v.id("workflows")),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("workflows").take(200);
    return rows
      .filter((w) => {
        if (w.status !== "live") return false;
        const t = w.draftGraph.trigger as any;
        if (t.type !== "form_submission") return false;
        return (
          (!t.formId && !t.formSlug) ||
          t.formId === args.formId ||
          t.formSlug === args.formSlug
        );
      })
      .map((w) => w._id);
  },
});

async function persistSubmission(
  ctx: MutationCtx,
  args: {
    formId: Id<"forms">;
    formSlug: string;
    cleaned: Record<string, string | number | boolean>;
    source: "public_page" | "embed" | "api";
    ipHash?: string;
    userAgent?: string;
  },
): Promise<Id<"formSubmissions">> {
  const form = await ctx.db.get(args.formId);
  if (!form || form.status !== "live") {
    throw new Error("Form is not accepting submissions");
  }
  const payloadJson = JSON.stringify(args.cleaned);
  const id = await ctx.db.insert("formSubmissions", {
    formId: args.formId,
    formSlug: args.formSlug,
    payloadJson: truncateText(payloadJson, 40_000),
    preview: truncateText(previewFromPayload(args.cleaned), 240),
    source: args.source,
    ipHash: args.ipHash,
    userAgent: args.userAgent
      ? truncateText(args.userAgent, 300)
      : undefined,
    read: false,
    createdAt: Date.now(),
  });
  await ctx.db.patch(args.formId, {
    submissionCount: form.submissionCount + 1,
    updatedAt: Date.now(),
  });

  // Kick live workflows listening for this form (or any form).
  const workflows = await ctx.db.query("workflows").take(200);
  for (const w of workflows) {
    if (w.status !== "live") continue;
    const t = w.draftGraph.trigger;
    if (t.type !== "form_submission") continue;
    const matches =
      (!t.formId && !t.formSlug) ||
      t.formId === args.formId ||
      t.formSlug === args.formSlug;
    if (!matches) continue;
    await ctx.scheduler.runAfter(0, internal.workflows.beginRun, {
      workflowId: w._id,
      trigger: "form_submission",
      triggerPayload: payloadJson,
    });
  }

  if (form.notifyEmailTo?.trim()) {
    const to = form.notifyEmailTo
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (to.length > 0) {
      await ctx.scheduler.runAfter(0, internal.resend.sendEmail, {
        to,
        subject: `New submission: ${form.name}`,
        text: `Form "${form.name}" (/f/${form.slug}) received a submission.\n\n${previewFromPayload(args.cleaned)}\n\n${payloadJson}`,
      });
    }
  }

  return id;
}

export const recordSubmission = internalMutation({
  args: {
    formId: v.id("forms"),
    formSlug: v.string(),
    payloadJson: v.string(),
    source: v.union(
      v.literal("public_page"),
      v.literal("embed"),
      v.literal("api"),
    ),
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.object({
    submissionId: v.id("formSubmissions"),
    successMessage: v.string(),
    redirectUrl: v.optional(v.string()),
    notifyWebhookUrl: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.status !== "live" || !form.publishedFields) {
      throw new Error("Form is not accepting submissions");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.payloadJson);
    } catch {
      throw new Error("Invalid JSON payload");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Payload must be a JSON object");
    }
    const cleaned = validateSubmission(
      form.publishedFields as FormField[],
      parsed as Record<string, unknown>,
    );
    const submissionId = await persistSubmission(ctx, {
      formId: args.formId,
      formSlug: args.formSlug,
      cleaned,
      source: args.source,
      ipHash: args.ipHash,
      userAgent: args.userAgent,
    });
    return {
      submissionId,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
      notifyWebhookUrl: form.notifyWebhookUrl,
    };
  },
});

/** Client / server-action public submit (hosted /f/[slug] page). */
export const submitPublic = mutation({
  args: {
    slug: v.string(),
    values: v.any(),
    /** Honeypot — must be empty. */
    website: v.optional(v.string()),
    source: v.optional(
      v.union(
        v.literal("public_page"),
        v.literal("embed"),
        v.literal("api"),
      ),
    ),
  },
  returns: v.object({
    ok: v.literal(true),
    successMessage: v.string(),
    redirectUrl: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (args.website && args.website.trim()) {
      return {
        ok: true as const,
        successMessage: "Thanks — we received your response.",
      };
    }
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!form || form.status !== "live" || !form.publishedFields) {
      throw new Error("Form not found");
    }
    if (!args.values || typeof args.values !== "object") {
      throw new Error("Invalid submission");
    }
    const cleaned = validateSubmission(
      form.publishedFields as FormField[],
      args.values as Record<string, unknown>,
    );
    await persistSubmission(ctx, {
      formId: form._id,
      formSlug: form.slug,
      cleaned,
      source: args.source ?? "public_page",
    });
    return {
      ok: true as const,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
    };
  },
});
