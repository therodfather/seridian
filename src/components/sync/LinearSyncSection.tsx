"use client";

import { useState, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { SyncCard } from "./SyncCard";
import { CheckSquare, Users, FolderKanban, Tag, UserCheck, RefreshCw } from "lucide-react";

interface LinearSyncSectionProps {
  onSyncComplete?: () => void;
}

export function LinearSyncSection({ onSyncComplete }: LinearSyncSectionProps) {
  const stats = useQuery(api.linearIngest.getLinearStats);
  const syncAll = useAction(api.linearSync.syncAllLinear);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncAll({});
      onSyncComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [syncAll, onSyncComplete]);

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      </div>
    );
  }

  const { counts, lastSync } = stats;
  const hasAnyData =
    counts.issues + counts.teams + counts.projects + counts.labels + counts.users > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-slate-500" /> Linear sync
            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              Trial
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Legacy issue ingest while GitHub becomes source of truth. Prefer GitHub for new work.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Linear"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {!hasAnyData && !error && (
        <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
          <p className="text-xs text-slate-400">No Linear data synced yet.</p>
          <p className="text-[11px] text-slate-600 mt-1">
            Run Sync Linear if a LINEAR_API_KEY is configured in Convex, or use GitHub issues instead.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SyncCard
          title="Issues"
          icon={CheckSquare}
          lastSynced={lastSync.issues}
          count={counts.issues}
          countLabel="synced tickets"
          syncing={syncing}
          onSync={handleSync}
          connected={!!lastSync.issues || counts.issues > 0}
        />
        <SyncCard
          title="Teams"
          icon={Users}
          lastSynced={lastSync.teams}
          count={counts.teams}
          countLabel="synced teams"
          syncing={syncing}
          onSync={handleSync}
          connected={!!lastSync.teams || counts.teams > 0}
        />
        <SyncCard
          title="Projects"
          icon={FolderKanban}
          lastSynced={lastSync.projects}
          count={counts.projects}
          countLabel="synced roadmaps"
          syncing={syncing}
          onSync={handleSync}
          connected={!!lastSync.projects || counts.projects > 0}
        />
        <SyncCard
          title="Labels"
          icon={Tag}
          lastSynced={lastSync.labels}
          count={counts.labels}
          countLabel="synced labels"
          syncing={syncing}
          onSync={handleSync}
          connected={!!lastSync.labels || counts.labels > 0}
        />
        <SyncCard
          title="Users"
          icon={UserCheck}
          lastSynced={lastSync.users}
          count={counts.users}
          countLabel="synced members"
          syncing={syncing}
          onSync={handleSync}
          connected={!!lastSync.users || counts.users > 0}
        />
      </div>
    </div>
  );
}
