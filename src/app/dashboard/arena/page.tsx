"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Bot } from "lucide-react";
import { LLMArena } from "@/components/arena/LLMArena";
import { WikiEngine } from "@/components/arena/WikiEngine";

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

  useEffect(() => {
    if (banks === undefined) return;
    if (banks.length === 0 && !creatingBank) {
      setCreatingBank(true);
      createBank({
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
      })
        .then((id) => {
          setBankId(id);
          setCreatingBank(false);
        })
        .catch(() => {
          setCreatingBank(false);
        });
    } else if (banks.length > 0 && !bankId) {
      setBankId(banks[0]._id);
    }
  }, [banks, creatingBank, bankId, createBank]);

  return (
    <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                LLM Arena
              </h1>
              <p className="text-xs text-slate-400">
                Local AI models + Self-building wiki
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-[#0c1222] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex h-[calc(100vh-14rem)] rounded-xl border border-white/[0.08] overflow-hidden bg-[#070b14]">
          {activeTab === "arena" ? <LLMArena /> : bankId ? <WikiEngine bankId={bankId} /> : null}
        </div>
    </div>
  );
}
