"use client";

import { Brain } from "lucide-react";
import { SecondBrain } from "@/components/brain/SecondBrain";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { NeuralBackground } from "@/components/three/backgrounds";

export default function BrainDashboardPage() {
  const { user } = useDashboardAuth();
  const userId = user?.pubkey ?? "anonymous";
  const userName = user?.name ?? "User";

  return (
    <>
      <NeuralBackground />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Second Brain
              </h1>
              <p className="text-xs text-slate-400">
                Private memory bank for facts, observations, and mental models
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-white/[0.08] overflow-hidden bg-[#070b14]">
          <div className="flex-1 overflow-y-auto">
            <SecondBrain userId={userId} userName={userName} />
          </div>
        </div>
      </div>
    </>
  );
}
