"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

export function useClients(status?: "active" | "inactive") {
  return useQuery(
    api.clients.list,
    status !== undefined ? { status } : {},
  );
}

export function useClient(clientId: Id<"clients"> | undefined) {
  return useQuery(
    api.clients.get,
    clientId !== undefined ? { clientId } : "skip",
  );
}
