"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Input, Textarea, Skeleton } from "@bytecats/ui-kit";
import {
  Lightbulb,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  X,
  Check,
  Search,
} from "lucide-react";

interface MentalModelsProps {
  bankId: Id<"memoryBanks">;
}

export function MentalModels({ bankId }: MentalModelsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isRetaining, setIsRetaining] = useState(false);

  const [editingId, setEditingId] = useState<Id<"memories"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const mentalModels = useQuery(
    api.memory.getMemories,
    bankId ? { bankId, memoryType: "mental_model", limit: 200 } : "skip",
  );
  const retainMemory = useMutation(api.memory.retain);
  const updateMemory = useMutation(api.memory.updateMemory);
  const deleteMemory = useMutation(api.memory.deleteMemory);

  const filteredModels = Array.isArray(mentalModels)
    ? mentalModels.filter((m) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (m.content ?? "").toLowerCase().includes(q);
      })
    : undefined;

  const handleCreate = useCallback(async () => {
    if (!newContent.trim()) return;
    setIsRetaining(true);
    try {
      const titlePrefix = newTitle.trim()
        ? `${newTitle.trim()}: `
        : "";
      await retainMemory({
        bankId,
        type: "mental_model",
        content: `${titlePrefix}${newContent.trim()}`,
        tags: newTitle.trim() ? [newTitle.trim()] : [],
        agentId: "dashboard-user",
      });
      setNewTitle("");
      setNewContent("");
      setIsCreating(false);
    } finally {
      setIsRetaining(false);
    }
  }, [bankId, newTitle, newContent, retainMemory]);

  const handleUpdate = useCallback(
    async (memoryId: Id<"memories">) => {
      if (!editContent.trim()) return;
      setIsSaving(true);
      try {
        await updateMemory({ memoryId, content: editContent.trim() });
        setEditingId(null);
        setEditContent("");
      } finally {
        setIsSaving(false);
      }
    },
    [editContent, updateMemory],
  );

  const handleDelete = useCallback(
    async (memoryId: Id<"memories">) => {
      await deleteMemory({ memoryId });
    },
    [deleteMemory],
  );

  const startEditing = (memoryId: Id<"memories">, content: string) => {
    setEditingId(memoryId);
    setEditContent(content);
  };

  return (
    <div>
      <div className="border-b border-white/[0.08] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Lightbulb className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <h3 className="font-semibold text-white">Mental Models</h3>
            {mentalModels && (
              <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-500">
                {mentalModels.length}
              </span>
            )}
          </div>
          <Button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="flex shrink-0 items-center gap-1 bg-cyan-500 px-3 py-1.5 text-xs text-black hover:bg-cyan-400"
          >
            {isCreating ? (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isCreating ? "Cancel" : "Add Model"}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mental models..."
            aria-label="Search mental models"
            className="border-white/[0.08] bg-[#0c1222] py-1.5 pl-8 text-xs text-white focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="p-4 border-b border-white/[0.08] bg-[#0c1222]/50">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Model title (e.g. First Principles)"
            className="bg-[#070b14] border-white/[0.08] text-white text-sm mb-2 focus:border-cyan-400"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Describe the mental model..."
            className="bg-[#070b14] border-white/[0.08] text-white text-sm min-h-[100px] focus:border-cyan-400 mb-3"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isRetaining || !newContent.trim()}
              className="flex items-center gap-1 bg-cyan-500 px-3 py-1.5 text-xs text-black hover:bg-cyan-400"
            >
              {isRetaining ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Save Model
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewTitle("");
                setNewContent("");
              }}
              className="bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="max-h-[500px] overflow-y-auto">
        {!mentalModels ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg bg-white/5" />
            ))}
          </div>
        ) : filteredModels && filteredModels.length === 0 ? (
          <div className="p-8 text-center">
            <Lightbulb className="mx-auto mb-2 h-8 w-8 text-slate-600" aria-hidden="true" />
            <p className="text-xs text-slate-500">
              {searchQuery
                ? "No mental models match your search"
                : "No mental models yet. Add your first framework."}
            </p>
            {!searchQuery && (
              <Button
                type="button"
                onClick={() => setIsCreating(true)}
                className="mt-3 bg-cyan-500 px-3 py-1.5 text-xs text-black hover:bg-cyan-400"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Add Model
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredModels?.map((model) => (
              <div
                key={model._id}
                className="px-3 py-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
              >
                {editingId === model._id ? (
                  /* Edit Mode */
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-[#0c1222] border-amber-400/30 text-white text-sm min-h-[80px] focus:border-amber-400"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleUpdate(model._id)}
                        disabled={isSaving || !editContent.trim()}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1 flex items-center gap-1"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                        className="bg-white/5 hover:bg-white/10 text-slate-400 text-xs px-3 py-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 w-7 h-7 rounded bg-amber-400/10 flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {model.content}
                      </p>
                      {model.tags && model.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {model.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400/70 text-[10px] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span>
                          {new Date(model.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEditing(model._id, model.content)}
                        className="rounded p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                        aria-label="Edit mental model"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(model._id)}
                        className="rounded p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                        aria-label="Delete mental model"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
