"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

export interface DashboardStats {
  activeClients: number;
  activeDealsValue: number;
  upcomingBookings: number;
  totalIssues: number;
  issuesByStatus: Record<string, number>;
  publishedProposals: number;
  isLoading: boolean;
}

export function useDashboardStats(): DashboardStats {
  const clients = useQuery(api.clients.list, { status: "active" });
  const deals = useQuery(api.deals.list, {});
  const bookings = useQuery(api.bookings.list, {});
  const issues = useQuery(api.issues.list, {});
  const proposals = useQuery(api.proposals.list, {});

  const isLoading =
    clients === undefined ||
    deals === undefined ||
    bookings === undefined ||
    issues === undefined ||
    proposals === undefined;

  const activeDealsValue = useMemo(() => {
    if (deals === undefined) return 0;
    return deals
      .filter((d) => d.stage !== "closed_lost")
      .reduce((sum, deal) => sum + deal.value, 0);
  }, [deals]);

  const upcomingBookings = useMemo(() => {
    if (bookings === undefined) return 0;
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return bookings.filter((b) => {
      const d = new Date(b.startTime);
      return d >= now && d <= nextWeek;
    }).length;
  }, [bookings]);

  const issuesByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    if (issues) {
      for (const issue of issues) {
        map[issue.status] = (map[issue.status] ?? 0) + 1;
      }
    }
    return map;
  }, [issues]);

  const publishedProposals = useMemo(() => {
    if (proposals === undefined) return 0;
    return proposals.filter(
      (p) => p.status === "sent" || p.status === "accepted",
    ).length;
  }, [proposals]);

  return {
    activeClients: clients?.length ?? 0,
    activeDealsValue,
    upcomingBookings,
    totalIssues: issues?.length ?? 0,
    issuesByStatus,
    publishedProposals,
    isLoading,
  };
}
