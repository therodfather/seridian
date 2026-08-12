"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

/**
 * Aggregated dashboard data hook. Fetches all core entities
 * via Convex real-time queries and derives summary statistics.
 *
 * Returns `undefined` fields while queries are loading —
 * consumers should handle the loading state.
 *
 * @example
 * ```tsx
 * const { clients, stats } = useDashboardData();
 * if (!clients) return <Skeleton />;
 * ```
 */
export function useDashboardData() {
  const clients = useQuery(api.clients.list, {});
  const issues = useQuery(api.issues.list, {});
  const deals = useQuery(api.deals.list, {});
  const bookings = useQuery(api.bookings.list, {});
  const proposals = useQuery(api.proposals.list, {});

  const stats = {
    totalClients: clients?.length ?? 0,
    activeClients: clients?.filter((c) => c.status === "active").length ?? 0,
    totalIssues: issues?.length ?? 0,
    openIssues: issues?.filter((i) => i.status !== "done").length ?? 0,
    totalDeals: deals?.length ?? 0,
    pipelineValue:
      deals?.reduce((sum, d) => sum + (d.value || 0), 0) ?? 0,
    totalBookings: bookings?.length ?? 0,
    totalProposals: proposals?.length ?? 0,
  };

  return { clients, issues, deals, bookings, proposals, stats };
}
