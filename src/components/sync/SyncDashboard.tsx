"use client";

import { useState, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, Badge } from "@bytecats/ui-kit";
import { RefreshCw, GitBranch, Layers, CheckCircle, AlertCircle } from "lucide-react";
import { LinearSyncSection } from "@/components/sync/LinearSyncSection";
import { GitHubSyncSection } from "@/components/sync/GitHubSyncSection";

export function SyncDashboard() {
  const [activeTab, setActiveTab] = useState("github");
  const linearStats = useQuery(api.linearIngest.getLinearStats);
  const githubStats = useQuery(api.githubIngest.getGitHubStats);
  const syncLinear = useAction(api.linearSync.syncAllLinear);
  const syncGitHub = useAction(api.githubSync.syncAllGitHub);
  const [syncingAll, setSyncingAll] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const linearIssues = linearStats?.counts?.issues ?? 0;
  const linearTeams = linearStats?.counts?.teams ?? 0;
  const linearProjects = linearStats?.counts?.projects ?? 0;
  const githubIssues = githubStats?.totalIssues ?? 0;
  const githubProjects = githubStats?.totalProjects ?? 0;

  const handleSyncAll = useCallback(async () => {
    setSyncingAll(true);
    setLastResult(null);
    try {
      await Promise.all([syncLinear({}), syncGitHub({})]);
      setLastResult({ type: "success", message: "All services synced" });
    } catch (err) {
      setLastResult({ type: "error", message: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setSyncingAll(false);
    }
  }, [syncLinear, syncGitHub]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-400">
            {linearIssues + githubIssues} issues synced
          </span>
          <span className="text-white/10">|</span>
          <span className="text-sm text-slate-400">
            {linearTeams + linearProjects + githubProjects} projects
          </span>
        </div>
        <Button
          onClick={handleSyncAll}
          disabled={syncingAll}
          size="sm"
          className="bg-seridian-500 text-white hover:bg-seridian-400"
        >
          {syncingAll ? (
            <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Sync All
        </Button>
      </div>

      {lastResult && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            lastResult.type === "success"
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          {lastResult.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {lastResult.message}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="gap-1">
          <TabsTrigger value="linear" className="gap-2 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Linear
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {linearIssues}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="github" className="gap-2 text-xs">
            <GitBranch className="h-3.5 w-3.5" />
            GitHub
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {githubIssues}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linear" className="mt-4">
          <LinearSyncSection />
        </TabsContent>

        <TabsContent value="github" className="mt-4">
          <GitHubSyncSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
