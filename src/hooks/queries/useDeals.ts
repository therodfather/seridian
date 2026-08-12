"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

type DealStage =
  | "lead"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export function useDeals(filters?: { stage?: DealStage; clientId?: Id<"clients"> }) {
  return useQuery(
    api.deals.list,
    filters !== undefined
      ? { stage: filters.stage, clientId: filters.clientId }
      : {},
  );
}

export function useDeal(dealId: Id<"deals"> | undefined) {
  return useQuery(
    api.deals.get,
    dealId !== undefined ? { dealId } : "skip",
  );
}

export function useDealTotalValue(filters?: {
  stage?: DealStage;
  clientId?: Id<"clients">;
}) {
  const deals = useDeals(filters);
  if (deals === undefined) return undefined;
  return deals.reduce((sum, deal) => sum + deal.value, 0);
}
