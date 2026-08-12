"use client";

import { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, Clock } from "lucide-react";

function formatTimeSince(ts: number | null): string {
  if (!ts) return "Never";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface SyncCardProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  lastSynced: number | null;
  count: number;
  countLabel: string;
  syncing: boolean;
  onSync: () => void;
  connected: boolean;
  className?: string;
  details?: { label: string; value: number | string }[];
  syncLabel?: string;
}

export function SyncCard({
  title,
  icon: Icon,
  lastSynced,
  count,
  countLabel,
  syncing,
  onSync,
  connected,
  className,
  details,
  syncLabel,
}: SyncCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#080d1a]/90 p-4 transition-all hover:border-cyan-500/30 hover:bg-[#0c1222] hover:shadow-lg hover:shadow-cyan-950/20",
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">{title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-slate-500"
                  )}
                />
                <span className="text-[10px] font-semibold text-slate-400">
                  {connected ? "Synced" : "Not synced"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all shrink-0",
              syncing
                ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50"
            )}
          >
            <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin text-cyan-400")} />
            <span>{syncing ? "Syncing..." : syncLabel || "Sync"}</span>
          </button>
        </div>

        <div className="my-2 border-t border-white/[0.06] pt-2">
          <div className="text-xl font-bold text-white font-display tracking-tight">{count.toLocaleString()}</div>
          <div className="text-[11px] font-medium text-slate-400 capitalize">{countLabel}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[10.5px] font-mono text-slate-500">
        <span className="flex items-center gap-1 text-slate-400">
          <Clock className="h-3 w-3 text-slate-500" /> {formatTimeSince(lastSynced)}
        </span>
        {details && details.length > 0 && (
          <span className="text-cyan-400 font-semibold">{details[0].value} {details[0].label}</span>
        )}
      </div>
    </div>
  );
}
