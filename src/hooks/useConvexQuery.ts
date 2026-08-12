"use client";

import { useQuery as useConvexQuery } from "convex/react";
import { FunctionReference } from "convex/server";

/**
 * Thin wrapper around Convex's `useQuery` that provides a stable API
 * for dashboard components. Convex handles real-time subscriptions,
 * caching, and re-renders automatically — this hook centralises the
 * import and re-exports it with a name that avoids collision with
 * TanStack Query's `useQuery`.
 *
 * @example
 * ```tsx
 * const clients = useStableQuery(api.clients.list, undefined);
 * const activeClients = useStableQuery(api.clients.list, { status: "active" });
 * ```
 */
export function useStableQuery<T>(
  query: FunctionReference<"query">,
  args?: Record<string, unknown> | "skip" | undefined,
  options?: { enabled?: boolean },
) {
  // Convex's useQuery returns T | undefined (loading state) and
  // handles subscriptions internally. The `options.enabled` flag
  // maps to "skip" when false.
  const resolvedArgs = options?.enabled === false ? "skip" : args;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks, @typescript-eslint/no-explicit-any
    return useConvexQuery(query, resolvedArgs as any) as T | undefined;
  } catch {
    return undefined;
  }
}
