"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Network, Loader2 } from "lucide-react";

interface EntityGraphProps {
  bankId: Id<"memoryBanks">;
}

const ENTITY_COLORS: Record<string, string> = {
  person: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  organization: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  place: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  concept: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  product: "bg-rose-400/10 text-rose-400 border-rose-400/20",
};

export function EntityGraph({ bankId }: EntityGraphProps) {
  const entities = useQuery(api.memory.getEntities, bankId ? { bankId } : "skip");
  const stats = useQuery(api.memory.getMemoryStats, bankId ? { bankId } : "skip");

  if (entities === undefined || stats === undefined) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[240px]">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const safeEntities = Array.isArray(entities) ? entities : [];
  const connectionCount = stats?.totalConnections ?? 0;

  if (safeEntities.length === 0) {
    return (
      <div className="p-8 text-center min-h-[240px] flex flex-col items-center justify-center">
        <Network className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-slate-500 text-xs max-w-xs">
          No entities yet. Retain memories that mention people, orgs, places, or
          concepts — they will appear here as a knowledge graph grows.
        </p>
        <p className="text-slate-600 text-[10px] mt-2">
          {connectionCount} connections
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-3 text-xs text-slate-400 px-1">
        <span>
          <span className="text-white font-medium">{safeEntities.length}</span>{" "}
          entities
        </span>
        <span className="text-slate-600">|</span>
        <span>
          <span className="text-cyan-400 font-medium">{connectionCount}</span>{" "}
          connections
        </span>
      </div>
      <div className="max-h-[500px] overflow-y-auto space-y-1">
        {safeEntities.map((entity) => (
          <div
            key={entity._id}
            className="px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${
                  ENTITY_COLORS[entity.type] ??
                  "bg-white/5 text-slate-400 border-white/[0.08]"
                }`}
              >
                {entity.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm truncate">
                  {entity.name ?? "Unnamed"}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                  <span>{entity.mentionCount ?? 0} mentions</span>
                  {Array.isArray(entity.aliases) && entity.aliases.length > 1 && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="truncate">
                        aka {entity.aliases.filter((a) => a !== entity.name).join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
