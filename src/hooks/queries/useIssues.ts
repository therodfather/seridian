"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

export function useIssues(filters?: { status?: IssueStatus; clientId?: Id<"clients"> }) {
  return useQuery(
    api.issues.list,
    filters !== undefined
      ? { status: filters.status, clientId: filters.clientId }
      : {},
  );
}

export function useIssue(issueId: Id<"issues"> | undefined) {
  return useQuery(
    api.issues.get,
    issueId !== undefined ? { issueId } : "skip",
  );
}

export function useLinearSyncStats() {
  return useQuery(api.issues.getLinearSyncStats, {});
}
