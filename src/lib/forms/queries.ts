/**
 * TanStack Query keys + hooks for Forms (server-action backed).
 * Change query keys here if you rename resources — keep invalidate calls in sync.
 */
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { FormField } from "../../../convex/lib/formDefinition";
import {
  archiveFormAction,
  createFormAction,
  getFormAction,
  getPublicFormAction,
  listFormSubmissionsAction,
  listFormsAction,
  markSubmissionReadAction,
  publishFormAction,
  saveFormDraftAction,
  submitPublicFormAction,
  unpublishFormAction,
  type FormDetail,
  type FormSubmissionRow,
  type FormSummary,
  type PublicForm,
} from "@/app/actions/forms";

export const formKeys = {
  all: ["forms"] as const,
  list: (userId: string) => [...formKeys.all, "list", userId] as const,
  detail: (userId: string, formId: string) =>
    [...formKeys.all, "detail", userId, formId] as const,
  submissions: (userId: string, formId: string) =>
    [...formKeys.all, "submissions", userId, formId] as const,
  public: (slug: string) => [...formKeys.all, "public", slug] as const,
};

export function useFormsList(currentUserId: string) {
  return useQuery<FormSummary[]>({
    queryKey: formKeys.list(currentUserId),
    queryFn: () => listFormsAction(currentUserId),
    enabled: Boolean(currentUserId),
  });
}

export function useFormDetail(currentUserId: string, formId: string) {
  return useQuery<FormDetail | null>({
    queryKey: formKeys.detail(currentUserId, formId),
    queryFn: () => getFormAction(currentUserId, formId),
    enabled: Boolean(currentUserId && formId),
  });
}

export function useFormSubmissions(currentUserId: string, formId: string) {
  return useQuery<FormSubmissionRow[]>({
    queryKey: formKeys.submissions(currentUserId, formId),
    queryFn: () =>
      listFormSubmissionsAction({ currentUserId, formId, limit: 50 }),
    enabled: Boolean(currentUserId && formId),
    refetchInterval: 8_000,
  });
}

export function usePublicForm(slug: string) {
  return useQuery<PublicForm | null>({
    queryKey: formKeys.public(slug),
    queryFn: () => getPublicFormAction(slug),
    enabled: Boolean(slug),
  });
}

export function useCreateForm(currentUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      createFormAction({ currentUserId, ...input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: formKeys.list(currentUserId) });
    },
  });
}

export function useSaveFormDraft(currentUserId: string, formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      slug?: string;
      draftFields: FormField[];
      submitButtonLabel: string;
      successMessage: string;
      redirectUrl?: string;
      notifyWebhookUrl?: string;
    }) => saveFormDraftAction({ currentUserId, formId, ...input }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: formKeys.detail(currentUserId, formId),
      });
      void qc.invalidateQueries({ queryKey: formKeys.list(currentUserId) });
    },
  });
}

export function usePublishForm(currentUserId: string, formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => publishFormAction({ currentUserId, formId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: formKeys.all });
    },
  });
}

export function useUnpublishForm(currentUserId: string, formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unpublishFormAction({ currentUserId, formId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: formKeys.all });
    },
  });
}

export function useArchiveForm(currentUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) =>
      archiveFormAction({ currentUserId, formId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: formKeys.list(currentUserId) });
    },
  });
}

export function useMarkSubmissionRead(currentUserId: string, formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { submissionId: string; read: boolean }) =>
      markSubmissionReadAction({ currentUserId, ...input }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: formKeys.submissions(currentUserId, formId),
      });
    },
  });
}

export function useSubmitPublicForm(slug: string) {
  return useMutation({
    mutationFn: (input: {
      values: Record<string, unknown>;
      website?: string;
      source?: "public_page" | "embed" | "api";
    }) => submitPublicFormAction({ slug, ...input }),
  });
}
