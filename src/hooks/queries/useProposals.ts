"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

type ProposalStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export function useProposals(filters?: {
  status?: ProposalStatus;
  clientId?: Id<"clients">;
}) {
  return useQuery(
    api.proposals.list,
    filters !== undefined
      ? { status: filters.status, clientId: filters.clientId }
      : {},
  );
}

export function useProposal(proposalId: Id<"proposals"> | undefined) {
  return useQuery(
    api.proposals.get,
    proposalId !== undefined ? { proposalId } : "skip",
  );
}

export function useProposalsByClient(clientId: Id<"clients"> | undefined) {
  return useQuery(
    api.proposals.getByClient,
    clientId !== undefined ? { clientId } : "skip",
  );
}
