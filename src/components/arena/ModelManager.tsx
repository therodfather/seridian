"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import {
  Download,
  Play,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { ARENA_MODELS, type ArenaModel } from "@/lib/arenaModels";
import {
  isModelMarkedCached,
  markModelCached,
  unmarkModelCached,
} from "@/lib/modelCache";

export type ModelState =
  | "idle"
  | "downloading"
  | "cached"
  | "loading"
  | "ready"
  | "error";

interface ModelManagerProps {
  onSelectModel: (model: ArenaModel) => void;
  selectedModelId?: string;
  modelStatuses: Record<string, ModelState>;
  onModelStatusChange?: (modelId: string, state: ModelState) => void;
  /** Drop outer card chrome when nested in Arena sidebar/panel. */
  embedded?: boolean;
  /** Optional control rendered in the sticky header (e.g. collapse). */
  headerAction?: ReactNode;
}

async function isModelCached(modelId: string): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && isModelMarkedCached(modelId, localStorage)) {
      return true;
    }
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes(modelId) || name.includes("transformers-cache")) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function deleteCachedModel(modelId: string): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      unmarkModelCached(modelId, localStorage);
    }
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes(modelId) || name.includes("transformers-cache")) {
          await caches.delete(name);
        }
      }
    }
  } catch {
    // Browser cache APIs are best-effort.
  }
}

export function ModelManager({
  onSelectModel,
  selectedModelId,
  modelStatuses,
  onModelStatusChange,
  embedded = false,
  headerAction,
}: ModelManagerProps) {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, { percent: number; loaded: number; total: number; speed: number }>
  >({});
  const [cachedStatuses, setCachedStatuses] = useState<Record<string, boolean>>({});
  const [isCheckingCache, setIsCheckingCache] = useState(true);

  useEffect(() => {
    const checkCaches = async () => {
      setIsCheckingCache(true);
      const statuses: Record<string, boolean> = {};
      for (const model of ARENA_MODELS) {
        statuses[model.modelId] = await isModelCached(model.modelId);
      }
      setCachedStatuses(statuses);
      setIsCheckingCache(false);
    };
    checkCaches();
  }, []);

  const getDisplayState = useCallback(
    (modelId: string): ModelState => {
      const explicit = modelStatuses[modelId];
      if (explicit && explicit !== "idle") return explicit;
      if (cachedStatuses[modelId]) return "cached";
      return "idle";
    },
    [modelStatuses, cachedStatuses]
  );

  const handleDownload = useCallback(
    async (model: ArenaModel) => {
      if (onModelStatusChange) {
        onModelStatusChange(model.modelId, "downloading");
      }

      setDownloadProgress((prev) => ({
        ...prev,
        [model.modelId]: { percent: 0, loaded: 0, total: 0, speed: 0 },
      }));

      try {
        const { env } = await import("@huggingface/transformers");
        env.useBrowserCache = true;

        const startTime = Date.now();

        await import("@huggingface/transformers").then(async (mod) => {
          await mod.pipeline("text-generation", model.modelId, {
            dtype: "q4",
            progress_callback: (progress: {
              status?: string;
              progress?: number;
              loaded?: number;
              total?: number;
            }) => {
              if (progress.status === "progress") {
                const loaded = progress.loaded || 0;
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? loaded / elapsed / (1024 * 1024) : 0;

                setDownloadProgress((prev) => ({
                  ...prev,
                  [model.modelId]: {
                    percent: progress.progress || 0,
                    loaded: progress.loaded || 0,
                    total: progress.total || 0,
                    speed,
                  },
                }));
              } else if (progress.status === "done") {
                setDownloadProgress((prev) => ({
                  ...prev,
                  [model.modelId]: {
                    percent: 100,
                    loaded: progress.total || 0,
                    total: progress.total || 0,
                    speed: 0,
                  },
                }));
              }
            },
          });
        });

        setCachedStatuses((prev) => ({ ...prev, [model.modelId]: true }));
        markModelCached(model.modelId, localStorage);
        if (onModelStatusChange) {
          onModelStatusChange(model.modelId, "cached");
        }
      } catch (err) {
        console.error("Download failed:", err);
        if (onModelStatusChange) {
          onModelStatusChange(model.modelId, "error");
        }
      }
    },
    [onModelStatusChange]
  );

  const handleLoad = useCallback(
    (model: ArenaModel) => {
      onSelectModel(model);
    },
    [onSelectModel]
  );

  const handleDelete = useCallback(
    async (model: ArenaModel) => {
      if (onModelStatusChange) {
        onModelStatusChange(model.modelId, "idle");
      }
      await deleteCachedModel(model.modelId);
      setCachedStatuses((prev) => ({ ...prev, [model.modelId]: false }));
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[model.modelId];
        return next;
      });
    },
    [onModelStatusChange]
  );

  const getActionForState = (model: ArenaModel, state: ModelState) => {
    switch (state) {
      case "idle":
        return (
          <button
            onClick={() => handleDownload(model)}
            className="flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/20 px-2 py-1 text-[11px] font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        );
      case "downloading":
        const progress = downloadProgress[model.modelId];
        return (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            <span className="text-[11px] text-cyan-400">
              {progress ? `${Math.round(progress.percent)}%` : "…"}
            </span>
          </div>
        );
      case "cached":
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleLoad(model)}
              className="flex items-center gap-1 rounded-md border border-green-500/30 bg-green-500/20 px-2 py-1 text-[11px] font-medium text-green-400 transition-colors hover:bg-green-500/30"
            >
              <Play className="h-3 w-3" />
              Load
            </button>
            <button
              onClick={() => handleDelete(model)}
              className="rounded-md border border-white/[0.08] bg-white/[0.05] px-1.5 py-1 text-slate-500 transition-colors hover:border-red-500/30 hover:text-red-400"
              title="Delete cached model"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      case "loading":
        return (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            <span className="text-[11px] text-cyan-400">Loading…</span>
          </div>
        );
      case "ready":
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectModel(model)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                selectedModelId === model.modelId
                  ? "border-cyan-500/50 bg-cyan-500/30 text-cyan-300"
                  : "border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30"
              )}
            >
              {selectedModelId === model.modelId ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Select
                </>
              )}
            </button>
            <button
              onClick={() => handleDelete(model)}
              className="rounded-md border border-white/[0.08] bg-white/[0.05] px-1.5 py-1 text-slate-500 transition-colors hover:border-red-500/30 hover:text-red-400"
              title="Delete cached model"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      case "error":
        return (
          <button
            onClick={() => handleDownload(model)}
            className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/20 px-2 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (state: ModelState) => {
    const badges: Record<ModelState, { label: string; className: string }> = {
      idle: {
        label: "Not Downloaded",
        className: "bg-white/[0.05] text-slate-500 border-white/[0.08]",
      },
      downloading: {
        label: "Downloading",
        className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      },
      cached: {
        label: "Cached",
        className: "bg-green-500/10 text-green-400 border-green-500/20",
      },
      loading: {
        label: "Loading",
        className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      },
      ready: {
        label: "Ready",
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      },
      error: {
        label: "Error",
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
    };

    const badge = badges[state] ?? badges.idle;
    return (
      <span
        className={cn(
          "inline-flex items-center rounded border px-1.5 py-px text-[9px] font-medium",
          badge.className
        )}
      >
        {state === "downloading" || state === "loading" ? (
          <Loader2 className="mr-0.5 h-2 w-2 animate-spin" />
        ) : state === "ready" || state === "cached" ? (
          <CheckCircle2 className="mr-0.5 h-2 w-2" />
        ) : state === "error" ? (
          <AlertCircle className="mr-0.5 h-2 w-2" />
        ) : null}
        {badge.label}
      </span>
    );
  };

  return (
    <div
      className={cn(
        "overflow-hidden",
        embedded
          ? "flex h-full min-h-0 flex-col bg-transparent"
          : "rounded-xl border border-white/[0.08] bg-[#070b14]",
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-10 border-b border-white/[0.08] px-3 py-2",
          embedded ? "bg-[#0c1222]" : "bg-[#0c1222]/50",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Database className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white">Model Manager</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] tabular-nums text-slate-500">
              {Object.values(cachedStatuses).filter(Boolean).length}/
              {ARENA_MODELS.length} cached
            </span>
            {headerAction}
          </div>
        </div>
      </div>

      <div className={cn("divide-y divide-white/[0.06]", embedded && "min-h-0 flex-1 overflow-y-auto")}>
        {ARENA_MODELS.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <AlertCircle className="mx-auto mb-1.5 h-5 w-5 text-slate-600" />
            <p className="text-xs text-slate-500">
              No models in the catalog. Nothing to download yet.
            </p>
          </div>
        ) : (
          ARENA_MODELS.map((model) => {
          const state = getDisplayState(model.modelId);
          const isExpanded = expandedModel === model.modelId;
          const progress = downloadProgress[model.modelId];

          return (
            <div key={model.id} className="bg-transparent">
              <div
                className={cn(
                  "flex items-start justify-between gap-2 px-3 py-2 transition-colors",
                  selectedModelId === model.modelId && "bg-cyan-500/5",
                  state === "error" && "bg-red-500/5"
                )}
              >
                <div className="flex min-w-0 items-start gap-1.5">
                  <button
                    onClick={() =>
                      setExpandedModel(isExpanded ? null : model.modelId)
                    }
                    className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-slate-300"
                    aria-label={isExpanded ? "Collapse model details" : "Expand model details"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-white">
                        {model.name}
                      </span>
                      {selectedModelId === model.modelId && (
                        <span className="inline-flex items-center rounded bg-cyan-500/20 px-1 py-px text-[8px] font-medium uppercase tracking-wide text-cyan-400 border border-cyan-500/30">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">{model.size}</span>
                      {getStatusBadge(state)}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">{getActionForState(model, state)}</div>
              </div>

              {state === "downloading" && progress && !isExpanded && (
                <div className="px-3 pb-2">
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="border-t border-white/[0.04] px-3 pb-2">
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="shrink-0 text-slate-500">Model ID</span>
                      <span className="truncate font-mono text-[10px] text-slate-400">
                        {model.modelId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Estimated Size</span>
                      <span className="text-slate-400">{model.size}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Cache Status</span>
                      <span className="text-slate-400">
                        {isCheckingCache ? (
                          "Checking..."
                        ) : cachedStatuses[model.modelId] ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <HardDrive className="h-3 w-3" />
                            Cached Locally
                          </span>
                        ) : (
                          "Not Cached"
                        )}
                      </span>
                    </div>

                    {state === "downloading" && progress && (
                      <div className="mt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                          <span>
                            {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
                          </span>
                          <span>
                            {progress.percent > 0
                              ? `${progress.speed.toFixed(1)} MB/s`
                              : "Connecting..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
