"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import {
  Skeleton,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bytecats/ui-kit";
import {
  Users,
  DollarSign,
  Calendar,
  FileText,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  Activity,
  Layers,
} from "lucide-react";
import { ClientForm } from "@/components/clients/ClientForm";
import { DealForm } from "@/components/sales/DealForm";
import { SetupChecklist } from "@/components/business/SetupChecklist";
import { PageShell, StatusBadge } from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  href?: string;
  accentColor?: string;
  badge?: string;
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  loading,
  href,
  accentColor = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  badge,
}: StatCardProps) {
  const content = (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 transition-all hover:border-cyan-500/30 hover:bg-[#0e162a] hover:shadow-lg hover:shadow-cyan-950/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-105",
              accentColor
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-16 rounded" />
            ) : (
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="font-display text-xl font-bold text-white tracking-tight">
                  {value}
                </p>
                {badge && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    {badge}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {subtext && !loading && (
        <p className="mt-2 text-[11px] text-slate-400 truncate">{subtext}</p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

type ActivityTab = "all" | "issues" | "deals" | "proposals" | "bookings";

interface ActivityItem {
  id: string;
  type: "issue" | "deal" | "proposal" | "booking";
  title: string;
  subtitle: string;
  time: string;
  timestamp: number;
  statusBadge: { label: string; color: string };
  href: string;
}

export function BusinessOverview() {
  const clients = useQuery(api.clients.list, { status: "active" });
  const deals = useQuery(api.deals.list, {});
  const bookings = useQuery(api.bookings.list, {});
  const issues = useQuery(api.issues.list, {});
  const proposals = useQuery(api.proposals.list, {});

  /* Modal state */
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  /* Activity Filter & Search State */
  const [activeTab, setActiveTab] = useState<ActivityTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  /* Derived Metrics */
  const activeDeals = useMemo(
    () => deals?.filter((d) => d.stage !== "closed_lost") ?? [],
    [deals]
  );
  const activeDealsValue = useMemo(
    () => activeDeals.reduce((sum, d) => sum + d.value, 0),
    [activeDeals]
  );
  const weightedPipeline = useMemo(
    () => activeDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0),
    [activeDeals]
  );

  const openIssues = useMemo(
    () => issues?.filter((i) => i.status !== "done") ?? [],
    [issues]
  );
  const highPriorityIssues = useMemo(
    () => openIssues.filter((i) => i.priority === "high" || i.priority === "urgent"),
    [openIssues]
  );

  const wonDeals = useMemo(
    () => deals?.filter((d) => d.stage === "closed_won") ?? [],
    [deals]
  );
  const totalRevenueWon = useMemo(
    () => wonDeals.reduce((sum, d) => sum + d.value, 0),
    [wonDeals]
  );

  const sentProposals = useMemo(
    () => proposals?.filter((p) => p.status === "sent" || p.status === "accepted") ?? [],
    [proposals]
  );
  const acceptedProposals = useMemo(
    () => proposals?.filter((p) => p.status === "accepted") ?? [],
    [proposals]
  );
  const acceptedProposalsValue = useMemo(
    () => acceptedProposals.reduce((sum, p) => sum + (p.value ?? 0), 0),
    [acceptedProposals]
  );

  /* Upcoming Bookings */
  const upcomingBookings = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return (
      bookings
        ?.filter((b) => {
          const d = new Date(b.startTime);
          return d >= now && d <= nextWeek;
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 6) ?? []
    );
  }, [bookings]);

  /* Combined Feed Items */
  const activityItems = useMemo(() => {
    const list: ActivityItem[] = [];

    (issues ?? []).forEach((issue) => {
      const ts = issue._creationTime;
      list.push({
        id: `issue-${issue._id}`,
        type: "issue",
        title: issue.title,
        subtitle: `Priority: ${issue.priority} • Status: ${issue.status.replace(/_/g, " ")}`,
        time: new Date(ts).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        timestamp: ts,
        statusBadge:
          issue.status === "done"
            ? { label: "Done", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
            : issue.status === "in_progress"
            ? { label: "In Progress", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
            : { label: "Todo", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
        href: `/dashboard/issues/${issue._id}`,
      });
    });

    (deals ?? []).forEach((deal) => {
      const ts = deal._creationTime;
      list.push({
        id: `deal-${deal._id}`,
        type: "deal",
        title: deal.name,
        subtitle: `Value: ${formatCurrency(deal.value)} • Stage: ${deal.stage.replace(/_/g, " ")}`,
        time: new Date(ts).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        timestamp: ts,
        statusBadge:
          deal.stage === "closed_won"
            ? { label: "Won", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
            : deal.stage === "closed_lost"
            ? { label: "Lost", color: "bg-red-500/10 text-red-400 border-red-500/20" }
            : { label: deal.stage, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
        href: ROUTES.dashboard.sales,
      });
    });

    (proposals ?? []).forEach((prop) => {
      list.push({
        id: `proposal-${prop._id}`,
        type: "proposal",
        title: prop.title,
        subtitle: `Value: ${formatCurrency(prop.value ?? 0)} • Created by ${prop.createdBy}`,
        time: new Date(prop.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        timestamp: prop.createdAt,
        statusBadge:
          prop.status === "accepted"
            ? { label: "Accepted", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
            : prop.status === "sent"
            ? { label: "Sent", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" }
            : { label: prop.status, color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
        href: `/dashboard/proposals/${prop._id}`,
      });
    });

    (bookings ?? []).forEach((booking) => {
      const ts = new Date(booking.startTime).getTime() || Date.now();
      list.push({
        id: `booking-${booking._id}`,
        type: "booking",
        title: booking.title,
        subtitle: `Type: ${booking.type} • ${new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        time: new Date(booking.startTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        timestamp: ts,
        statusBadge: {
          label: "Scheduled",
          color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        },
        href: ROUTES.dashboard.bookings,
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [issues, deals, proposals, bookings]);

  const filteredActivity = useMemo(() => {
    return activityItems.filter((item) => {
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "issues"
          ? item.type === "issue"
          : activeTab === "deals"
          ? item.type === "deal"
          : activeTab === "proposals"
          ? item.type === "proposal"
          : item.type === "booking";

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activityItems, activeTab, searchQuery]);

  const dateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  /* Calculate win ratios */
  const totalDealsCount = deals?.length ?? 0;
  const winRate = totalDealsCount > 0 ? Math.round((wonDeals.length / totalDealsCount) * 100) : 0;
  const totalProposalsCount = proposals?.length ?? 0;
  const proposalAcceptanceRate =
    totalProposalsCount > 0
      ? Math.round((acceptedProposals.length / totalProposalsCount) * 100)
      : 0;

  return (
    <PageShell
      title={`${getGreeting()}, Executive`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <span>{dateFormatted}</span>
          <span aria-hidden="true">•</span>
          <span>Real-time operations & pipeline health</span>
        </span>
      }
      badge={<StatusBadge tone="info">Live Workspace</StatusBadge>}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setDealModalOpen(true)}
            className="gap-1.5 bg-cyan-500 text-xs font-semibold text-black hover:bg-cyan-400"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New Deal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setClientModalOpen(true)}
            className="gap-1.5 border-white/10 bg-[#0c1222] text-xs text-slate-200 hover:border-cyan-500/30 hover:text-white"
          >
            <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            Add Client
          </Button>
          <Link href={ROUTES.dashboard.issues}>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <CheckCircle className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              New Issue
            </Button>
          </Link>
          <Link href={ROUTES.dashboard.proposals}>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Proposals
            </Button>
          </Link>
        </div>
      }
    >
      <SetupChecklist />

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Active Clients"
          value={clients?.length ?? 0}
          subtext="Verified business relationships"
          icon={Users}
          loading={clients === undefined}
          href={ROUTES.dashboard.clients}
          accentColor="text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
        />
        <StatCard
          label="Active Pipeline"
          value={formatCurrency(activeDealsValue)}
          subtext={`Weighted: ${formatCurrency(weightedPipeline)} (${activeDeals.length} deals)`}
          icon={DollarSign}
          loading={deals === undefined}
          href={ROUTES.dashboard.sales}
          accentColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          badge={`${activeDeals.length} Active`}
        />
        <StatCard
          label="Open Issues"
          value={openIssues.length}
          subtext={
            highPriorityIssues.length > 0
              ? `${highPriorityIssues.length} high priority requiring attention`
              : "All operational tasks normal"
          }
          icon={CheckCircle}
          loading={issues === undefined}
          href={ROUTES.dashboard.issues}
          accentColor="text-amber-400 bg-amber-500/10 border-amber-500/20"
        />
        <StatCard
          label="Proposals Tracked"
          value={proposals?.length ?? 0}
          subtext={`Accepted value: ${formatCurrency(acceptedProposalsValue)}`}
          icon={FileText}
          loading={proposals === undefined}
          href={ROUTES.dashboard.proposals}
          accentColor="text-purple-400 bg-purple-500/10 border-purple-500/20"
          badge={`${sentProposals.length} Sent`}
        />
        <StatCard
          label="Bookings (7 Days)"
          value={upcomingBookings.length}
          subtext="Upcoming meetings & demos"
          icon={Calendar}
          loading={bookings === undefined}
          href={ROUTES.dashboard.bookings}
          accentColor="text-blue-400 bg-blue-500/10 border-blue-500/20"
        />
      </div>

      {/* Main Split Grid: Activity Feed & Sidebar Widget */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column: Interactive Activity & Operations Stream */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4">
            {/* Feed Controls Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-3.5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Activity & Operations Stream
                </h2>
              </div>

              {/* Search Filter Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter stream items..."
                  aria-label="Filter activity stream"
                  className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 pt-3 pb-2 overflow-x-auto">
              {[
                { id: "all", label: "All Activity", count: activityItems.length },
                {
                  id: "issues",
                  label: "Issues",
                  count: activityItems.filter((i) => i.type === "issue").length,
                },
                {
                  id: "deals",
                  label: "Deals",
                  count: activityItems.filter((i) => i.type === "deal").length,
                },
                {
                  id: "proposals",
                  label: "Proposals",
                  count: activityItems.filter((i) => i.type === "proposal").length,
                },
                {
                  id: "bookings",
                  label: "Bookings",
                  count: activityItems.filter((i) => i.type === "booking").length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActivityTab)}
                  aria-pressed={activeTab === tab.id}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                    activeTab === tab.id
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Stream List */}
            <div className="mt-2 divide-y divide-white/[0.04] max-h-[440px] overflow-y-auto pr-1">
              {issues === undefined || deals === undefined ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-300 font-medium">No activity items match</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {searchQuery ? `No results for "${searchQuery}"` : "No recorded events for this category."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              ) : (
                filteredActivity.map((item) => {
                  const Icon =
                    item.type === "issue"
                      ? CheckCircle
                      : item.type === "deal"
                      ? DollarSign
                      : item.type === "proposal"
                      ? FileText
                      : Calendar;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs",
                            item.type === "issue"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : item.type === "deal"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : item.type === "proposal"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded border capitalize",
                            item.statusBadge.color
                          )}
                        >
                          {item.statusBadge.label}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
                          {item.time}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Schedule & Executive KPI Ratios */}
        <div className="space-y-4">
          {/* Upcoming Schedule Card */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Upcoming Schedule (7 Days)
                </h3>
              </div>
              <Link
                href={ROUTES.dashboard.bookings}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {bookings === undefined ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 space-y-2">
                  <p>No upcoming meetings in the next 7 days.</p>
                  <Link href={ROUTES.dashboard.bookings} className="text-cyan-400 hover:text-cyan-300 font-medium">
                    Open calendar
                  </Link>
                </div>
              ) : (
                upcomingBookings.map((b) => (
                  <div
                    key={b._id}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-200 truncate">{b.title}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {new Date(b.startTime).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {b.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Key Ratios & Conversion Performance Widget */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Conversion & Performance Ratios
              </h3>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Pipeline Win Rate</span>
                  <span className="font-bold text-white tabular-nums">{winRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(winRate, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Proposal Acceptance</span>
                  <span className="font-bold text-white tabular-nums">
                    {proposalAcceptanceRate}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(proposalAcceptanceRate, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Revenue Won</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatCurrency(totalRevenueWon)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Deal Modal Dialog */}
      <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Create New Opportunity</DialogTitle>
          </DialogHeader>
          <DealForm
            onSuccess={() => setDealModalOpen(false)}
            onCancel={() => setDealModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Quick Client Modal Dialog */}
      <Dialog open={clientModalOpen} onOpenChange={setClientModalOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Add Client Dossier</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSuccess={() => setClientModalOpen(false)}
            onCancel={() => setClientModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

