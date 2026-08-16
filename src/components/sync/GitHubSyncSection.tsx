"use client";

import { useState, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { SyncCard } from "./SyncCard";
import { CheckSquare, FolderKanban, Kanban } from "lucide-react";

interface GitHubSyncSectionProps {
  onSyncComplete?: () => void;
}

export function GitHubSyncSection({ onSyncComplete }: GitHubSyncSectionProps) {
  const stats = useQuery(api.githubIngest.getGitHubStats);
  const boardStats = useQuery(api.githubProjectsSync.getBoardStats);
  const syncAll = useAction(api.githubSync.syncAllGitHub);
  const pullBoard = useAction(api.githubProjectsSync.pullFromGitHubProjects);
  const [syncing, setSyncing] = useState(false);
  const [syncingBoard, setSyncingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

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

  const handleSyncBoard = useCallback(async () => {
    setSyncingBoard(true);
    setBoardError(null);
    try {
      await pullBoard({});
      onSyncComplete?.();
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingBoard(false);
    }
  }, [pullBoard, onSyncComplete]);

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      </div>
    );
  }

  const issueDetails = Object.entries(stats.issuesByState).map(
    ([state, count]) => ({
      label: state,
      value: count,
    }),
  );

  const projectDetails = Object.entries(stats.projectsByState).map(
    ([state, count]) => ({
      label: state,
      value: count,
    }),
  );

  const hasAnyData = stats.totalIssues + stats.totalProjects > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-white">GitHub sync</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Primary source of truth for issues and projects.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 self-start sm:self-auto"
        >
          {syncing ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Syncing…
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync GitHub
            </>
          )}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {boardError && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {boardError}
        </div>
      )}

      {!hasAnyData && !error && (
        <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
          <p className="text-xs text-slate-400">No GitHub issues or projects synced yet.</p>
          <p className="text-[11px] text-slate-600 mt-1">
            Run Sync GitHub when a GITHUB_TOKEN is configured in Convex.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SyncCard
          title="Issues"
          icon={CheckSquare}
          lastSynced={stats.lastIssueSync}
          count={stats.totalIssues}
          countLabel="synced issues"
          syncing={syncing}
          onSync={handleSync}
          connected={!!stats.lastIssueSync || stats.totalIssues > 0}
          details={issueDetails.length > 0 ? issueDetails : undefined}
        />
        <SyncCard
          title="Projects"
          icon={FolderKanban}
          lastSynced={stats.lastProjectSync}
          count={stats.totalProjects}
          countLabel="synced projects"
          syncing={syncing}
          onSync={handleSync}
          connected={!!stats.lastProjectSync || stats.totalProjects > 0}
          details={projectDetails.length > 0 ? projectDetails : undefined}
        />
        <SyncCard
          title="Kanban board"
          icon={Kanban}
          lastSynced={boardStats?.lastSyncedAt ?? null}
          count={boardStats?.linkedIssues ?? 0}
          countLabel="linked issues"
          syncing={syncingBoard}
          onSync={handleSyncBoard}
          connected={!!boardStats?.linkedIssues}
        />
      </div>
    </div>
  );
}
