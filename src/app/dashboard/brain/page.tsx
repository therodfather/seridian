"use client";

import { Brain, Database, Lightbulb } from "lucide-react";
import { SecondBrain } from "@/components/brain/SecondBrain";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { Badge, Skeleton } from "@bytecats/ui-kit";

export default function BrainDashboardPage() {
  const { user, loading } = useDashboardAuth();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl bg-cyan-500/20" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 bg-white/10" />
              <Skeleton className="h-3 w-64 bg-white/10" />
            </div>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Skeleton className="h-8 w-36 rounded-lg bg-white/10" />
            <Skeleton className="h-8 w-40 rounded-lg bg-white/10" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b14] p-4 shadow-2xl">
          <Skeleton className="mb-3 h-9 w-full rounded-lg bg-white/10" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const userId = user?.pubkey ?? "anonymous";
  const userName = user?.name ?? "User";

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/40">
            <Brain className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Second Brain
              </h1>
              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-400">
                Memory Bank
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Private memory bank for facts, observations, and mental models for{" "}
              <span className="font-medium text-slate-200">{userName}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1222] px-3 py-1.5 text-slate-300">
            <Database className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>Convex Vector Store</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1222] px-3 py-1.5 text-slate-300">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            <span>Mental Models Enabled</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b14] shadow-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SecondBrain userId={userId} userName={userName} />
        </div>
      </div>
    </div>
  );
}
