"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Input, Textarea } from "@bytecats/ui-kit";
import {
  Brain,
  Plus,
  Search,
  Save,
  Loader2,
  Check,
  Trash2,
  Eye,
  Edit3,
  Lightbulb,
} from "lucide-react";
import { MentalModels } from "./MentalModels";

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
  const [activeTab, setActiveTab] = useState<"all" | "mental_models">("all");

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
    try {
      const id = await createBank({
        name: bankName,
        mission: `Private memory bank for ${userName}`,
        directives: ["retain", "recall", "reflect"],
        disposition: { skepticism: 0.5, literalism: 0.7, empathy: 0.6 },
        createdBy: userId,
      });
      setBankId(id);
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
    } finally {
      setIsRetaining(false);
    }
  };

  const displayMemories = useMemo(() => {
    if (searchQuery.trim() && searchResults) return searchResults;
    if (!memories) return [];
    if (filterType) return memories.filter((m) => m.type === filterType);
    return memories;
  }, [searchResults, memories, searchQuery, filterType]);

  const memoryStats = useMemo(() => {
    if (!memories) return { total: 0, byType: {} };
    const byType: Record<string, number> = {};
    for (const m of memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
    }
    return { total: memories.length, byType };
  }, [memories]);

  const consolidatedCount = useMemo(() => {
    if (!memories) return 0;
    return memories.filter((m) => m.consolidatedAt).length;
  }, [memories]);

  if (!banks) {
    return (
      <div className="bg-[#070b14] rounded-xl border border-white/[0.08] p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!bankId) {
    return (
      <div className="bg-[#070b14] rounded-xl border border-white/[0.08] p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-14 h-14 rounded-full bg-cyan-400/10 flex items-center justify-center">
          <Brain className="w-7 h-7 text-cyan-400" />
        </div>
        <div className="text-center">
          <h3 className="text-white font-semibold text-lg">
            {userName}&apos;s Second Brain
          </h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs">
            Create your private memory bank to retain facts, observations, and
            mental models.
          </p>
        </div>
        <Button
          onClick={handleCreateBank}
          disabled={isCreatingBank}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 text-sm"
        >
          {isCreatingBank ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
          ) : (
            <Brain className="w-4 h-4 mr-2 inline" />
          )}
          Create Brain
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#070b14] rounded-xl border border-white/[0.08] overflow-hidden">
      <div className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-semibold">{userName}&apos;s Brain</h3>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Retain
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="bg-[#0c1222] border-white/[0.08] text-white text-xs pl-8 py-1.5 focus:border-cyan-400"
          />
        </div>

        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            All Memories
          </button>
          <button
            onClick={() => setActiveTab("mental_models")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "mental_models"
                ? "bg-amber-400/10 text-amber-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Mental Models
          </button>
        </div>
      </div>

      {activeTab === "mental_models" ? (
        <MentalModels bankId={bankId} />
      ) : (
        <>
          {showAddForm && (
            <div className="p-4 border-b border-white/[0.08] bg-[#0c1222]/50">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {MEMORY_TYPES.map((t) => (
                  <button
                    key={t.value}
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
                  onClick={handleRetain}
                  disabled={isRetaining || !newMemoryContent.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 flex items-center gap-1"
                >
                  {isRetaining ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Memory
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMemoryContent("");
                  }}
                  className="bg-white/5 hover:bg-white/10 text-slate-400 text-xs px-3 py-1.5"
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
                <Brain className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">
                  {searchQuery
                    ? "No memories match your search"
                    : "No memories yet. Retain your first thought."}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {displayMemories.map((memory) => (
                  <div
                    key={memory._id}
                    className="px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${
                          TYPE_COLORS[memory.type]
                        }`}
                      >
                        {MEMORY_TYPES.find((t) => t.value === memory.type)?.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-sm leading-relaxed">
                          {memory.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                          <span>{formatDate(memory.createdAt)}</span>
                          {memory.tags && memory.tags.length > 0 && (
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
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
