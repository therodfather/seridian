"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";
import Link from "next/link";
import {
  Building2,
  Users,
  Search,
  Plus,
  Grid,
  List as ListIcon,
  Share2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Client = Doc<"clients">;

interface ClientListProps {
  onEdit?: (clientId: Id<"clients">) => void;
  onAdd?: () => void;
}

function ClientRow({
  client,
  issueCount,
  onEdit,
}: {
  client: Client;
  issueCount: number;
  onEdit?: (clientId: Id<"clients">) => void;
}) {
  const personnelCount = client.keyPersonnel?.length ?? 0;
  const downstreamCount = client.downstreamClients?.length ?? 0;

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-4",
        "transition-all duration-200",
        "hover:border-cyan-500/30 hover:bg-[#0e162a] hover:shadow-lg hover:shadow-cyan-950/20",
      )}
    >
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-base font-bold text-cyan-400 uppercase border border-cyan-500/20 group-hover:scale-105 transition-transform">
          {client.name.charAt(0) || "?"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/clients/${client._id}`}
              className="truncate text-base font-semibold text-white hover:text-cyan-400 transition-colors"
            >
              {client.name}
            </Link>
            <Badge
              variant={client.status === "active" ? "default" : "secondary"}
              className={cn(
                "shrink-0 text-[10px] px-2 py-0.5 border font-semibold",
                client.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20",
              )}
            >
              {client.status === "active" ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                </span>
              )}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {client.company || "Independent"}
            </span>
            {client.industry && (
              <span className="text-slate-400">· {client.industry}</span>
            )}
            {client.annualRevenue && (
              <span className="text-emerald-400 font-medium">
                · {client.annualRevenue}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 border-t border-white/[0.06] pt-3 sm:border-t-0 sm:pt-0 shrink-0">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="text-center px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs font-bold text-white">{issueCount}</p>
            <p className="text-[10px] text-slate-500">Issues</p>
          </div>
          <div className="text-center px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs font-bold text-cyan-400">{personnelCount}</p>
            <p className="text-[10px] text-slate-500">Personnel</p>
          </div>
          <div className="text-center px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs font-bold text-emerald-400">{downstreamCount}</p>
            <p className="text-[10px] text-slate-500">Accounts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/clients/${client._id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/30 hover:bg-white/10 hover:text-white"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" /> View
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-white/5 text-xs h-8 px-2.5"
            onClick={() => onEdit?.(client._id)}
          >
            <Edit className="w-3.5 h-3.5 mr-1 text-slate-400" /> Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClientGridCard({
  client,
  issueCount,
  onEdit,
}: {
  client: Client;
  issueCount: number;
  onEdit?: (clientId: Id<"clients">) => void;
}) {
  const personnelCount = client.keyPersonnel?.length ?? 0;
  const downstreamCount = client.downstreamClients?.length ?? 0;

  return (
    <div
      className={cn(
        "group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-5 space-y-4",
        "transition-all duration-200",
        "hover:border-cyan-500/30 hover:bg-[#0e162a] hover:shadow-lg hover:shadow-cyan-950/20",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-base font-bold text-cyan-400 uppercase border border-cyan-500/20 group-hover:scale-105 transition-transform">
              {client.name.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/clients/${client._id}`}
                className="truncate block text-base font-semibold text-white hover:text-cyan-400 transition-colors"
              >
                {client.name}
              </Link>
              <p className="text-xs text-slate-400 truncate">{client.company || "Independent"}</p>
            </div>
          </div>
          <Badge
            variant={client.status === "active" ? "default" : "secondary"}
            className={cn(
              "shrink-0 text-[10px] px-2 py-0.5 border font-semibold",
              client.status === "active"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/20",
            )}
          >
            {client.status}
          </Badge>
        </div>

        {client.industry && (
          <p className="text-xs text-slate-400 font-medium">
            Industry: <span className="text-slate-300">{client.industry}</span>
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-white/[0.06]">
          <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
            <span className="block text-slate-500 text-[10px]">Issues</span>
            <span className="font-bold text-white text-sm">{issueCount}</span>
          </div>
          <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
            <span className="block text-slate-500 text-[10px]">Personnel</span>
            <span className="font-bold text-cyan-400 text-sm">{personnelCount}</span>
          </div>
          <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
            <span className="block text-slate-500 text-[10px]">Accounts</span>
            <span className="font-bold text-emerald-400 text-sm">{downstreamCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
        <Link
          href={`/dashboard/clients/${client._id}`}
          className="flex-1 text-center py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
        >
          View Profile
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-slate-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onEdit?.(client._id)}
        >
          Edit
        </Button>
      </div>
    </div>
  );
}

export function ClientList({ onEdit, onAdd }: ClientListProps) {
  const clients = useQuery(api.clients.list, {});
  const issues = useQuery(api.issues.list, {});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const issueCountByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of issues ?? []) {
      if (issue.clientId) {
        map.set(issue.clientId, (map.get(issue.clientId) ?? 0) + 1);
      }
    }
    return map;
  }, [issues]);

  const metrics = useMemo(() => {
    if (!clients) return { total: 0, active: 0, inactive: 0, personnel: 0, downstream: 0 };
    let active = 0;
    let inactive = 0;
    let personnel = 0;
    let downstream = 0;
    for (const c of clients) {
      if (c.status === "active") active++;
      else inactive++;
      personnel += c.keyPersonnel?.length ?? 0;
      downstream += c.downstreamClients?.length ?? 0;
    }
    return { total: clients.length, active, inactive, personnel, downstream };
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!clients) return null;
    return clients
      .filter((c) => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = c.name.toLowerCase().includes(q);
          const matchCompany = c.company?.toLowerCase().includes(q);
          const matchIndustry = c.industry?.toLowerCase().includes(q);
          const matchEmail = c.email?.toLowerCase().includes(q);
          if (!matchName && !matchCompany && !matchIndustry && !matchEmail) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "issues") {
          const countA = issueCountByClient.get(a._id) ?? 0;
          const countB = issueCountByClient.get(b._id) ?? 0;
          return countB - countA;
        }
        if (sortBy === "personnel") {
          return (b.keyPersonnel?.length ?? 0) - (a.keyPersonnel?.length ?? 0);
        }
        return 0;
      });
  }, [clients, search, statusFilter, sortBy, issueCountByClient]);

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Clients</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage corporate client accounts, key personnel dossiers, downstream networks, and active deals.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-lg shadow-cyan-500/10 gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add Client
        </Button>
      </div>

      {/* KPI Metric Summary Bar */}
      {clients === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Total Accounts <Building2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-white tabular-nums">{metrics.total}</p>
            <p className="text-[11px] text-slate-500">{metrics.active} active accounts</p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Active Accounts <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-emerald-400 tabular-nums">{metrics.active}</p>
            <p className="text-[11px] text-slate-500">{metrics.inactive} inactive</p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Personnel Tracked <Users className="w-4 h-4 text-purple-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-purple-400 tabular-nums">{metrics.personnel}</p>
            <p className="text-[11px] text-slate-500">Key contacts & dossiers</p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Downstream Network <Share2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-cyan-400 tabular-nums">{metrics.downstream}</p>
            <p className="text-[11px] text-slate-500">Client customer accounts</p>
          </div>
        </div>
      )}

      {/* Search, Filter & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.08] bg-[#0c1222]/80">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name, company, industry, or email..."
              aria-label="Search clients"
              className="pl-9 h-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              aria-label="Filter by status"
              className="h-9 w-[130px] border-white/10 bg-white/5 text-xs text-slate-300"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/10">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger
              aria-label="Sort clients"
              className="h-9 w-[140px] border-white/10 bg-white/5 text-xs text-slate-300"
            >
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/10">
              <SelectItem value="name">Sort: Name (A-Z)</SelectItem>
              <SelectItem value="issues">Sort: Most Issues</SelectItem>
              <SelectItem value="personnel">Sort: Most Personnel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 border-t border-white/[0.06] pt-2 md:pt-0 md:border-t-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            className={cn("h-8 px-2.5 text-xs", viewMode === "list" ? "bg-white/10 text-cyan-400" : "text-slate-400")}
          >
            <ListIcon className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            className={cn("h-8 px-2.5 text-xs", viewMode === "grid" ? "bg-white/10 text-cyan-400" : "text-slate-400")}
          >
            <Grid className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Client List / Grid View */}
      {filteredClients === null ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title={search || statusFilter !== "all" ? "No clients match criteria" : "No clients recorded yet"}
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your search terms or filters to find clients."
              : "Add your first corporate client account to track dossiers, deals, and issues."
          }
          action={
            <Button
              type="button"
              size="sm"
              onClick={onAdd}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              + Add Client
            </Button>
          }
        />
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <ClientRow
              key={client._id}
              client={client}
              issueCount={issueCountByClient.get(client._id) ?? 0}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <ClientGridCard
              key={client._id}
              client={client}
              issueCount={issueCountByClient.get(client._id) ?? 0}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

