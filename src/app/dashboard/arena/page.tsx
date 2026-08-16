"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Bot, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@bytecats/ui-kit";
import { LLMArena } from "@/components/arena/LLMArena";
import { WikiEngine } from "@/components/arena/WikiEngine";
import { EmptyState, PageShell } from "@/components/dashboard/kit";
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
      <PageShell
        className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden px-3 pt-2 lg:px-4"
        title="LLM Arena"
        description="Local models · Self-building wiki"
        icon={<Bot className="h-5 w-5" aria-hidden="true" />}
        action={
          <div
            className="flex shrink-0 gap-0.5 rounded-md border border-white/[0.08] bg-[#0c1222] p-0.5"
            role="tablist"
            aria-label="Arena views"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
                  activeTab === tab.id
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="-mx-3 flex min-h-0 flex-1 flex-col overflow-hidden bg-[#070b14] lg:-mx-4">
          {activeTab === "arena" ? (
            <LLMArena />
          ) : bankId ? (
            <WikiEngine bankId={bankId} />
          ) : bankError ? (
            <EmptyState
              className="flex-1 border-0"
              icon={<AlertCircle className="h-7 w-7 text-red-400" aria-hidden="true" />}
              title="Wiki setup failed"
              description={bankError}
              action={
                <Button
                  onClick={() => void ensureBank()}
                  disabled={creatingBank}
                  className="bg-cyan-500 text-sm text-white hover:bg-cyan-600"
                >
                  {creatingBank ? "Retrying…" : "Retry setup"}
                </Button>
              }
            />
          ) : (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-2"
              aria-busy="true"
              aria-label="Setting up wiki engine"
            >
              <Loader2
                className="h-5 w-5 animate-spin text-cyan-400"
                aria-hidden="true"
              />
              <p className="text-sm text-slate-400">Setting up wiki engine…</p>
            </div>
          )}
        </div>
      </PageShell>
    </div>
  );
}
