"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import {
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bytecats/ui-kit";
import {
  Shield,
  Search,
  Key,
  Users,
  RefreshCw,
  Sliders,
  Clock,
  UserCheck,
  FileText,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Info,
  Filter,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AuditLog = Doc<"auditLogs">;

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: Filter, color: "text-slate-400 bg-slate-500/10" },
  { id: "secret", label: "Secrets & Vault", icon: Key, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: "user", label: "Team & Access", icon: Users, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  { id: "sync", label: "Integrations & Sync", icon: RefreshCw, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { id: "system", label: "System Policy", icon: Sliders, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
] as const;

export function AuditLogViewer() {
  const auditLogs = useQuery(api.auditLogs.list, {});
  const seedLogs = useMutation(api.auditLogs.seed);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Automatically seed initial logs if table is completely empty on load
  useEffect(() => {
    if (auditLogs && auditLogs.length === 0) {
      seedLogs().catch(console.error);
    }
  }, [auditLogs, seedLogs]);

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedLogs();
    } finally {
      setSeeding(false);
    }
  }

  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs.filter((log) => {
      if (selectedCategory !== "all" && log.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.metadata && log.metadata.toLowerCase().includes(q))
      );
    });
  }, [auditLogs, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    if (!auditLogs) return { total: 0, secret: 0, user: 0, sync: 0, system: 0 };
    return {
      total: auditLogs.length,
      secret: auditLogs.filter((l) => l.category === "secret").length,
      user: auditLogs.filter((l) => l.category === "user").length,
      sync: auditLogs.filter((l) => l.category === "sync").length,
      system: auditLogs.filter((l) => l.category === "system").length,
    };
  }, [auditLogs]);

  function getCategoryConfig(category: string) {
    return (
      CATEGORIES.find((c) => c.id === category) ?? {
        id: "system",
        label: "System",
        icon: Info,
        color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* OS Summary Cards Header */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#080d1a]/90 p-4 transition-all hover:border-cyan-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Logged Events</span>
            <Shield className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats.total}</span>
            <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              Immutable
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Append-only audit trail</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#080d1a]/90 p-4 transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Secrets & Vault Events</span>
            <Key className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats.secret}</span>
            <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Vault
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Secret updates & deletions</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#080d1a]/90 p-4 transition-all hover:border-cyan-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Team Access & Revocations</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats.user}</span>
            <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              Access
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">User additions & revocations</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#080d1a]/90 p-4 transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Sync & Integration Triggers</span>
            <RefreshCw className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats.sync}</span>
            <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
              Linear / GitHub
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Manual & automated dispatches</p>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, or payload..."
            className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#070b14] p-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5",
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleSeed}
            disabled={seeding}
            className="text-slate-400 hover:text-white border border-white/10 bg-[#070b14] text-xs h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", seeding && "animate-spin")} />
            {seeding ? "Seeding..." : "Refresh Logs"}
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1222]/80">
        <div className="border-b border-white/[0.08] px-4 py-3 bg-[#080d1a]/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Terminal className="h-4 w-4 text-cyan-400" />
            Audit Action Trail
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Showing {filteredLogs.length} of {auditLogs?.length ?? 0} entries
          </span>
        </div>

        {auditLogs === undefined ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full rounded-lg animate-pulse bg-white/[0.02]" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center p-6 text-center">
            <Shield className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">No audit log entries found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {searchQuery ? "Try clearing search filters." : "Click Refresh Logs to populate initial trail."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredLogs.map((log) => {
              const catConfig = getCategoryConfig(log.category);
              const Icon = catConfig.icon;
              const formattedDate = new Date(log.timestamp).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-cyan-500/[0.03] cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold",
                        catConfig.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {log.action}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-semibold rounded-md border capitalize font-mono",
                            catConfig.color
                          )}
                        >
                          {log.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{log.details}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:self-center text-xs text-slate-400 border-t sm:border-t-0 border-white/[0.04] pt-2 sm:pt-0 justify-between sm:justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-400">Actor:</span>
                      <span className="font-mono text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                        @{log.actor}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="max-w-lg border-white/[0.08] bg-[#080d1a] shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white font-bold text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                Audit Event Entry Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-[#070b14] p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Action:</span>
                  <span className="font-bold text-white">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Category:</span>
                  <span className="font-mono text-cyan-400 capitalize">{selectedLog.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Actor:</span>
                  <span className="font-mono text-slate-200">@{selectedLog.actor}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Exact Timestamp:</span>
                  <span className="font-mono text-slate-400">
                    {new Date(selectedLog.timestamp).toISOString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-300 font-semibold">Event Summary</span>
                <div className="rounded-xl border border-white/[0.06] bg-[#070b14] p-3 text-slate-300 leading-relaxed">
                  {selectedLog.details}
                </div>
              </div>

              {selectedLog.metadata && (
                <div className="space-y-1">
                  <span className="text-slate-300 font-semibold">Associated Payload Metadata</span>
                  <pre className="rounded-xl border border-white/[0.06] bg-[#070b14] p-3 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.metadata), null, 2);
                      } catch {
                        return selectedLog.metadata;
                      }
                    })()}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-white/[0.06]">
                <Button
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs"
                >
                  Close Detail
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
