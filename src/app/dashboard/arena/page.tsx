"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Bot, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@bytecats/ui-kit";
import { LLMArena } from "@/components/arena/LLMArena";
import { WikiEngine } from "@/components/arena/WikiEngine";
import { cn } from "@/lib/utils";

type Tab = "arena" | "wiki";

const tabs: { id: Tab; label: string }[] = [
  { id: "arena", label: "LLM Arena" },
  { id: "wiki", label: "Wiki Engine" },
];

export default function ArenaDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("arena");
  const banks = useQuery(api.memory.listBanks);
  const createBank = useMutation(api.memory.createBank);
  const [bankId, setBankId] = useState<Id<"memoryBanks"> | null>(null);
  const [creatingBank, setCreatingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const ensureBank = async () => {
    if (creatingBank) return;
    setCreatingBank(true);
    setBankError(null);
    try {
      const id = await createBank({
        name: "Arena Wiki",
        mission: "Self-building knowledge base for LLM Arena experiments and outputs.",
        directives: [
          "Capture interesting LLM outputs automatically",
          "Organize entries by topic and model",
          "Maintain a living, evolving wiki",
        ],
        disposition: {
          skepticism: 0.3,
          literalism: 0.7,
          empathy: 0.5,
        },
        createdBy: "system",
      });
      setBankId(id);
    } catch (error) {
      setBankError(
        error instanceof Error ? error.message : "Failed to set up wiki bank",
      );
    } finally {
      setCreatingBank(false);
    }
  };

  useEffect(() => {
    if (banks === undefined) return;
    if (banks.length === 0 && !creatingBank && !bankId && !bankError) {
      void ensureBank();
    } else if (banks.length > 0 && !bankId) {
      setBankId(banks[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot bank bootstrap
  }, [banks, creatingBank, bankId, bankError]);

  return (
    <div
      data-testid="arena-page"
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#070b14]/95 px-3 py-2 lg:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-white">
              LLM Arena
            </h1>
            <p className="truncate text-[11px] text-slate-500">
              Local models · Self-building wiki
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-0.5 rounded-md border border-white/[0.08] bg-[#0c1222] p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#070b14]">
        {activeTab === "arena" ? (
          <LLMArena />
        ) : bankId ? (
          <WikiEngine bankId={bankId} />
        ) : bankError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="h-7 w-7 text-red-400" />
            <p className="max-w-sm text-sm text-slate-400">{bankError}</p>
            <Button
              onClick={() => void ensureBank()}
              disabled={creatingBank}
              className="bg-cyan-500 text-sm text-white hover:bg-cyan-600"
            >
              {creatingBank ? "Retrying…" : "Retry setup"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-400">Setting up wiki engine…</p>
          </div>
        )}
      </div>
    </div>
  );
}
