"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { Card, CardContent, Skeleton } from "@bytecats/ui-kit";
import { Users, DollarSign, Calendar, FileText, Plus, ArrowRight, CheckCircle, Clock } from "lucide-react";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function StatPill({ label, value, icon: Icon, loading, href }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; loading?: boolean; href?: string }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3 transition-colors hover:border-white/[0.1]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-seridian-500/10 text-seridian-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-12 rounded" />
        ) : (
          <p className="font-display text-lg font-bold text-white">{value}</p>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function QuickAction({ label, icon: Icon, href }: { label: string; icon: React.ComponentType<{ className?: string }>; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c1222]/60 px-3 py-2 text-xs font-medium text-slate-400 transition-all hover:border-seridian-500/20 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5 text-seridian-400" />
      {label}
    </Link>
  );
}

function UpcomingItem({ title, time, type }: { title: string; time: string; type: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.02] transition-colors">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-seridian-500/10 text-seridian-400">
        <Calendar className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200 truncate">{title}</p>
        <p className="text-[11px] text-slate-500">{time}</p>
      </div>
      <span className="text-[10px] text-slate-600">{type}</span>
    </div>
  );
}

export function BusinessOverview() {
  const clients = useQuery(api.clients.list, { status: "active" });
  const deals = useQuery(api.deals.list, {});
  const bookings = useQuery(api.bookings.list, {});
  const issues = useQuery(api.issues.list, {});

  const activeDealsValue = deals?.filter((d) => d.stage !== "closed_lost").reduce((sum, d) => sum + d.value, 0) ?? 0;
  const openIssues = issues?.filter((i) => i.status !== "done").length ?? 0;

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = bookings?.filter((b) => {
    const d = new Date(b.startTime);
    return d >= now && d <= nextWeek;
  }).slice(0, 5) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Clients" value={clients?.length ?? 0} icon={Users} loading={clients === undefined} href="/dashboard/clients" />
          <StatPill label="Pipeline" value={formatCurrency(activeDealsValue)} icon={DollarSign} loading={deals === undefined} href="/dashboard/sales" />
          <StatPill label="Open Issues" value={openIssues} icon={CheckCircle} loading={issues === undefined} href="/dashboard/issues" />
          <StatPill label="Bookings" value={upcoming.length} icon={Calendar} loading={bookings === undefined} href="/dashboard/bookings" />
        </div>

        <div className="flex flex-wrap gap-2">
          <QuickAction label="New Issue" icon={Plus} href="/dashboard/issues" />
          <QuickAction label="Add Client" icon={Users} href="/dashboard/clients" />
          <QuickAction label="New Deal" icon={DollarSign} href="/dashboard/sales" />
          <QuickAction label="New Proposal" icon={FileText} href="/dashboard/proposals" />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/60">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-400">Recent Activity</span>
            <Link href="/dashboard/issues" className="flex items-center gap-1 text-[11px] text-seridian-400 hover:text-seridian-300">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {issues === undefined ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : issues.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600">No activity yet</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {issues.slice(0, 8).map((issue) => (
                  <div key={issue._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] ${
                      issue.status === "done" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {issue.status === "done" ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200 truncate">{issue.title}</p>
                      <p className="text-[11px] text-slate-500">{issue.status.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/60">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-400">Upcoming</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {bookings === undefined ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600">No upcoming bookings</div>
            ) : (
              upcoming.map((b) => (
                <UpcomingItem
                  key={b._id}
                  title={b.title}
                  time={new Date(b.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  type={b.type}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/60 p-4">
          <span className="text-xs font-semibold text-slate-400">Quick Stats</span>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Deals won</span>
              <span className="font-medium text-white">{deals?.filter((d) => d.stage === "closed_won").length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Proposals sent</span>
              <span className="font-medium text-white">{0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Issues done</span>
              <span className="font-medium text-white">{issues?.filter((i) => i.status === "done").length ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
