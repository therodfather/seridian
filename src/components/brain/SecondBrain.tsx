"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Input, Textarea, Skeleton } from "@bytecats/ui-kit";
import {
  Brain,
  Plus,
  Search,
  Save,
  Loader2,
  Check,
  Lightbulb,
  Network,
} from "lucide-react";
import { MentalModels } from "./MentalModels";
import { EntityGraph } from "./EntityGraph";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

interface SecondBrainProps {
  userId: string;
  userName: string;
}

const MEMORY_TYPES = [
  { value: "world_fact", label: "World Fact", color: "cyan" },
  { value: "observation", label: "Observation", color: "emerald" },
  { value: "experience_fact", label: "Experience", color: "purple" },
  { value: "mental_model", label: "Mental Model", color: "amber" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  world_fact:
    "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  observation:
    "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  experience_fact:
    "bg-purple-400/10 text-purple-400 border-purple-400/20",
  mental_model:
    "bg-amber-400/10 text-amber-400 border-amber-400/20",
};

function formatDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function SecondBrain({ userId, userName }: SecondBrainProps) {
  const [bankId, setBankId] = useState<Id<"memoryBanks"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [selectedType, setSelectedType] = useState<string>("world_fact");
  const [isCreatingBank, setIsCreatingBank] = useState(false);
  const [isRetaining, setIsRetaining] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "mental_models" | "graph">(
    "all",
  );
  const [createError, setCreateError] = useState<string | null>(null);

  const banks = useQuery(api.memory.listBanks);
  const memories = useQuery(
    api.memory.getMemories,
    bankId ? { bankId, limit: 100 } : "skip",
  );
  const searchResults = useQuery(
    api.memory.recall,
    bankId && searchQuery.trim()
      ? { bankId, searchText: searchQuery, limit: 30 }
      : "skip",
  );
  const consolidationCandidates = useQuery(
    api.consolidation.getConsolidationCandidates,
    bankId ? { bankId, limit: 50 } : "skip",
  );

  const createBank = useMutation(api.memory.createBank);
  const retainMemory = useMutation(api.memory.retain);

  const bankName = `${userId}-brain`;

  useEffect(() => {
    if (!banks) return;
    const existing = banks.find((b) => b.name === bankName);
    if (existing) {
      setBankId(existing._id);
    }
  }, [banks, bankName]);

  const handleCreateBank = async () => {
    setIsCreatingBank(true);
    setCreateError(null);
    try {
      const id = await createBank({
        name: bankName,
        mission: `Private memory bank for ${userName}`,
        directives: ["retain", "recall", "reflect"],
        disposition: { skepticism: 0.5, literalism: 0.7, empathy: 0.6 },
        createdBy: userId,
      });
      setBankId(id);
      toastMutationSuccess("Second Brain created");
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create brain",
      );
      toastMutationError(error, "Failed to create memory bank");
    } finally {
      setIsCreatingBank(false);
    }
  };

  const handleRetain = async () => {
    if (!bankId || !newMemoryContent.trim()) return;
    setIsRetaining(true);
    try {
      await retainMemory({
        bankId,
        type: selectedType as "world_fact" | "observation" | "experience_fact" | "mental_model",
        content: newMemoryContent.trim(),
        agentId: userId,
      });
      setNewMemoryContent("");
      setShowAddForm(false);
      toastMutationSuccess("Memory retained");
    } catch (error) {
      toastMutationError(error, "Failed to save memory");
    } finally {
      setIsRetaining(false);
    }
  };

  const displayMemories = useMemo(() => {
    if (searchQuery.trim() && Array.isArray(searchResults)) return searchResults;
    if (!Array.isArray(memories)) return [];
    if (filterType) return memories.filter((m) => m?.type === filterType);
    return memories;
  }, [searchResults, memories, searchQuery, filterType]);

  const memoryStats = useMemo(() => {
    if (!Array.isArray(memories)) return { total: 0, byType: {} as Record<string, number> };
    const byType: Record<string, number> = {};
    for (const m of memories) {
      if (!m?.type) continue;
      byType[m.type] = (byType[m.type] || 0) + 1;
    }
    return { total: memories.length, byType };
  }, [memories]);

  const consolidatedCount = useMemo(() => {
    if (!Array.isArray(memories)) return 0;
    return memories.filter((m) => m?.consolidatedAt).length;
  }, [memories]);

  if (!banks) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-9 w-full rounded-lg bg-white/10" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded bg-white/10" />
          <Skeleton className="h-7 w-28 rounded bg-white/10" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/5" />
        ))}
      </div>
    );
  }

  if (!bankId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10">
          <Brain className="h-7 w-7 text-cyan-400" aria-hidden="true" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">
            {userName}&apos;s Second Brain
          </h2>
          <p className="mt-1 max-w-xs text-sm text-slate-400">
            Create your private memory bank to retain facts, observations, and
            mental models.
          </p>
        </div>
        {createError && (
          <p className="text-red-400 text-xs text-center max-w-xs">{createError}</p>
        )}
        <Button
          type="button"
          onClick={handleCreateBank}
          disabled={isCreatingBank}
          className="bg-cyan-500 px-4 py-2 text-sm text-black hover:bg-cyan-400"
        >
          {isCreatingBank ? (
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Brain className="mr-2 inline h-4 w-4" aria-hidden="true" />
          )}
          {createError ? "Retry" : "Create Brain"}
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="border-b border-white/[0.08] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Brain className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
            <h2 className="truncate font-semibold text-white">{userName}&apos;s Brain</h2>
          </div>
          <Button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex shrink-0 items-center gap-1 bg-cyan-500 px-3 py-1.5 text-xs text-black hover:bg-cyan-400"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Retain
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            aria-label="Search memories"
            className="border-white/[0.08] bg-[#0c1222] py-1.5 pl-8 text-xs text-white focus:border-cyan-400"
          />
        </div>

        <div className="mt-3 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
              activeTab === "all"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Brain className="h-3.5 w-3.5" aria-hidden="true" />
            All Memories
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mental_models")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
              activeTab === "mental_models"
                ? "bg-amber-400/10 text-amber-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            Mental Models
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "graph"
                ? "bg-cyan-400/10 text-cyan-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Graph
          </button>
        </div>
      </div>

      {activeTab === "mental_models" ? (
        <MentalModels bankId={bankId} />
      ) : activeTab === "graph" ? (
        <EntityGraph bankId={bankId} />
      ) : (
        <>
          {showAddForm && (
            <div className="p-4 border-b border-white/[0.08] bg-[#0c1222]/50">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {MEMORY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelectedType(t.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      selectedType === t.value
                        ? TYPE_COLORS[t.value]
                        : "border-white/[0.08] text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                placeholder="What do you want to remember?"
                className="bg-[#070b14] border-white/[0.08] text-white text-sm min-h-[80px] focus:border-cyan-400 mb-3"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleRetain}
                  disabled={isRetaining || !newMemoryContent.trim()}
                  className="flex items-center gap-1 bg-cyan-500 px-3 py-1.5 text-xs text-black hover:bg-cyan-400"
                >
                  {isRetaining ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Save Memory
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMemoryContent("");
                  }}
                  className="bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="p-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">
                <span className="text-white font-medium">{memoryStats.total}</span>{" "}
                memories
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                <span className="text-emerald-400 font-medium">
                  {consolidatedCount}
                </span>{" "}
                consolidated
              </span>
              {consolidationCandidates && consolidationCandidates.length > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400">
                    {consolidationCandidates.length} candidates
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setFilterType(null)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  filterType === null
                    ? "bg-white/10 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                All ({memoryStats.total})
              </button>
              {MEMORY_TYPES.map((t) => {
                const count = memoryStats.byType[t.value] || 0;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setFilterType(filterType === t.value ? null : t.value)
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      filterType === t.value
                        ? TYPE_COLORS[t.value]
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {t.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {displayMemories.length === 0 ? (
              <div className="p-8 text-center">
                <Brain className="mx-auto mb-2 h-8 w-8 text-slate-600" aria-hidden="true" />
                <p className="text-xs text-slate-500">
                  {searchQuery
                    ? "No memories match your search"
                    : "No memories yet. Retain your first thought."}
                </p>
                {!searchQuery && (
                  <Button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="mt-3 bg-cyan-500 px-3 py-1.5 text-xs text-black hover:bg-cyan-400"
                  >
                    <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    Retain a memory
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-2">
                {displayMemories.map((memory) => {
                  if (!memory?._id) return null;
                  const typeLabel =
                    MEMORY_TYPES.find((t) => t.value === memory.type)?.label ??
                    memory.type ??
                    "Memory";
                  const typeClass =
                    TYPE_COLORS[memory.type] ??
                    "bg-white/5 text-slate-400 border-white/[0.08]";
                  return (
                  <div
                    key={memory._id}
                    className="px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${typeClass}`}
                      >
                        {typeLabel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-sm leading-relaxed">
                          {memory.content ?? ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                          <span>{formatDate(memory.createdAt ?? Date.now())}</span>
                          {Array.isArray(memory.tags) && memory.tags.length > 0 && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span>{memory.tags.join(", ")}</span>
                            </>
                          )}
                          {memory.consolidatedAt && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-emerald-400/70 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />
                                consolidated
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
