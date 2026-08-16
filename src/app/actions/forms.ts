/**
 * Next.js 16 server actions for Forms — call Convex over HTTP.
 * Client code should use TanStack Query hooks in `@/lib/forms/queries`.
 */
"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { FormField } from "../../../convex/lib/formDefinition";

function client(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return new ConvexHttpClient(url);
}

export type FormSummary = {
  _id: Id<"forms">;
  name: string;
  slug: string;
  description?: string;
  status: "draft" | "live" | "archived";
  fieldCount: number;
  submissionCount: number;
  publishedVersion?: number;
  updatedAt: number;
};

export type FormDetail = {
  _id: Id<"forms">;
  name: string;
  slug: string;
  description?: string;
  status: "draft" | "live" | "archived";
  draftFields: FormField[];
  publishedFields?: FormField[];
  publishedVersion?: number;
  submitButtonLabel: string;
  successMessage: string;
  redirectUrl?: string;
  notifyWebhookUrl?: string;
  submissionCount: number;
  updatedAt: number;
  publishedAt?: number;
};

export type FormSubmissionRow = {
  _id: Id<"formSubmissions">;
  preview: string;
  source: "public_page" | "embed" | "api";
  read: boolean;
  createdAt: number;
  payloadJson: string;
};

export type PublicForm = {
  name: string;
  slug: string;
  description?: string;
  fields: FormField[];
  submitButtonLabel: string;
  successMessage: string;
  redirectUrl?: string;
};

export async function listFormsAction(
  currentUserId: string,
): Promise<FormSummary[]> {
  return await client().query(api.forms.list, { currentUserId });
}

export async function getFormAction(
  currentUserId: string,
  formId: string,
): Promise<FormDetail | null> {
  return await client().query(api.forms.get, {
    currentUserId,
    formId: formId as Id<"forms">,
  });
}

export async function createFormAction(input: {
  currentUserId: string;
  name: string;
  description?: string;
}): Promise<Id<"forms">> {
  return await client().mutation(api.forms.create, input);
}

export async function saveFormDraftAction(input: {
  currentUserId: string;
  formId: string;
  name: string;
  description?: string;
  slug?: string;
  draftFields: FormField[];
  submitButtonLabel: string;
  successMessage: string;
  redirectUrl?: string;
  notifyWebhookUrl?: string;
}): Promise<null> {
  return await client().mutation(api.forms.saveDraft, {
    ...input,
    formId: input.formId as Id<"forms">,
  });
}

export async function publishFormAction(input: {
  currentUserId: string;
  formId: string;
}): Promise<{ version: number; slug: string }> {
  return await client().mutation(api.forms.publish, {
    currentUserId: input.currentUserId,
    formId: input.formId as Id<"forms">,
  });
}

export async function unpublishFormAction(input: {
  currentUserId: string;
  formId: string;
}): Promise<null> {
  return await client().mutation(api.forms.unpublish, {
    currentUserId: input.currentUserId,
    formId: input.formId as Id<"forms">,
  });
}

export async function archiveFormAction(input: {
  currentUserId: string;
  formId: string;
}): Promise<null> {
  return await client().mutation(api.forms.archive, {
    currentUserId: input.currentUserId,
    formId: input.formId as Id<"forms">,
  });
}

export async function listFormSubmissionsAction(input: {
  currentUserId: string;
  formId: string;
  limit?: number;
}): Promise<FormSubmissionRow[]> {
  return await client().query(api.forms.listSubmissions, {
    currentUserId: input.currentUserId,
    formId: input.formId as Id<"forms">,
    limit: input.limit,
  });
}

export async function markSubmissionReadAction(input: {
  currentUserId: string;
  submissionId: string;
  read: boolean;
}): Promise<null> {
  return await client().mutation(api.forms.markSubmissionRead, {
    currentUserId: input.currentUserId,
    submissionId: input.submissionId as Id<"formSubmissions">,
    read: input.read,
  });
}

export async function getPublicFormAction(
  slug: string,
): Promise<PublicForm | null> {
  return await client().query(api.forms.getPublicBySlug, { slug });
}

export async function submitPublicFormAction(input: {
  slug: string;
  values: Record<string, unknown>;
  website?: string;
  source?: "public_page" | "embed" | "api";
}): Promise<{
  ok: true;
  successMessage: string;
  redirectUrl?: string;
}> {
  return await client().mutation(api.forms.submitPublic, input);
}
