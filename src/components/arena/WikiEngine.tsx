"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Input, Textarea } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import {
  addToQueue,
  getQueuedItems,
  getQueueStats,
  markSynced,
  shouldAutoSync,
} from "@/lib/localWikiQueue";
import type { WikiQueueItem, QueueStats } from "@/lib/localWikiQueue";
import {
  BookOpen,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  GitMerge,
  Upload,
} from "lucide-react";

interface WikiEngineProps {
  bankId: Id<"memoryBanks">;
}

type PipelineStep =
  | "idle"
  | "scan"
  | "plan"
  | "generate"
  | "validate"
  | "save"
  | "complete"
  | "error";

interface Improvement {
  id: string;
  type: "create" | "update";
  title: string;
  before?: string;
  after: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
  timestamp: number;
}

interface PlanItem {
  action: "create" | "update";
  title: string;
  reason: string;
  pageId?: Id<"wikiPages">;
}

const STEP_LABELS: Record<PipelineStep, string> = {
  idle: "Idle",
  scan: "Scanning Data",
  plan: "Planning Changes",
  generate: "Generating Content",
  validate: "Validating Quality",
  save: "Saving to Wiki",
  complete: "Complete",
  error: "Error",
};

const STEP_ICONS: Record<PipelineStep, React.ReactNode> = {
  idle: <Play className="w-4 h-4" />,
  scan: <Eye className="w-4 h-4" />,
  plan: <Sparkles className="w-4 h-4" />,
  generate: <FileText className="w-4 h-4" />,
  validate: <CheckCircle2 className="w-4 h-4" />,
  save: <GitMerge className="w-4 h-4" />,
  complete: <CheckCircle2 className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
};

async function loadLLM() {
  const { pipeline } = await import("@huggingface/transformers");
  return await pipeline("text2text-generation", "Xenova/T5-small");
}

function buildContextSummary(
  wikiPages: Array<{ title: string; content: string }> | undefined,
  memories: Array<{ content: string; tags?: string[] }> | undefined,
  clients: Array<{ name: string; company: string; industry?: string }> | undefined,
) {
  const pageTitles = wikiPages?.map((p) => p.title) ?? [];
  const memorySnippets =
    memories?.slice(0, 20).map((m) => m.content.slice(0, 120)) ?? [];
  const clientNames = clients?.map((c) => `${c.name} (${c.company})`) ?? [];

  return {
    pageTitles,
    memorySnippets,
    clientNames,
    pageContents: wikiPages?.map((p) => ({
      title: p.title,
      excerpt: p.content.slice(0, 300),
    })) ?? [],
  };
}

function generatePlan(
  context: ReturnType<typeof buildContextSummary>,
): PlanItem[] {
  const plans: PlanItem[] = [];
  const existingTitles = new Set(
    context.pageTitles.map((t) => t.toLowerCase()),
  );

  const suggestedTopics = [
    { title: "Company Overview", keyword: "company overview" },
    { title: "Client Services", keyword: "client services" },
    { title: "Technology Stack", keyword: "technology" },
    { title: "Team & Roles", keyword: "team" },
    { title: "Pricing & Plans", keyword: "pricing" },
    { title: "Project Workflow", keyword: "workflow" },
    { title: "Security & Compliance", keyword: "security" },
    { title: "API Documentation", keyword: "api" },
    { title: "Onboarding Guide", keyword: "onboarding" },
    { title: "Troubleshooting", keyword: "troubleshoot" },
  ];

  for (const topic of suggestedTopics) {
    const covered = context.pageTitles.some((t) =>
      t.toLowerCase().includes(topic.keyword),
    );
    if (!covered) {
      plans.push({
        action: "create",
        title: topic.title,
        reason: `No wiki page covers "${topic.title}"`,
      });
    }
  }

  if (context.memorySnippets.length > 0 && context.pageContents.length < 5) {
    plans.push({
      action: "create",
      title: "Memory Index",
      reason: "Consolidate memory bank facts into a single reference page",
    });
  }

  for (const page of context.pageContents) {
    if (page.excerpt.length < 150) {
      plans.push({
        action: "update",
        title: page.title,
        reason: `"${page.title}" has thin content (${page.excerpt.length} chars)`,
      });
    }
  }

  return plans.slice(0, 10);
}

function buildGeneratePrompt(
  planItem: PlanItem,
  context: ReturnType<typeof buildContextSummary>,
): string {
  const existingPage = planItem.pageId
    ? context.pageContents.find((p) => p.title === planItem.title)
    : null;

  let prompt = `You are a technical documentation writer for Seridian, a technology company.\n\n`;

  if (existingPage) {
    prompt += `EXISTING PAGE "${planItem.title}":\n${existingPage.excerpt}\n\n`;
    prompt += `IMPROVEMENT REASON: ${planItem.reason}\n\n`;
    prompt += `Rewrite this page with significantly more detail. Keep the same title.`;
  } else {
    prompt += `CREATE A NEW WIKI PAGE titled "${planItem.title}".\n`;
    prompt += `REASON: ${planItem.reason}\n\n`;
  }

  if (context.clientNames.length > 0) {
    prompt += `KNOWN CLIENTS: ${context.clientNames.slice(0, 10).join(", ")}\n`;
  }
  if (context.memorySnippets.length > 0) {
    prompt += `COMPANY FACTS:\n${context.memorySnippets.slice(0, 5).join("\n")}\n`;
  }

  prompt += `\nWrite comprehensive markdown documentation. Include sections, bullet points, and clear explanations. Be specific and actionable.`;
  return prompt;
}

export function WikiEngine({ bankId }: WikiEngineProps) {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [progress, setProgress] = useState(0);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  const [expandedLog, setExpandedLog] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState<
    string | null
  >(null);
  const abortRef = useRef(false);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    synced: 0,
  });
  const [syncing, setSyncing] = useState(false);

  const wikiPages = useQuery(api.wiki.listPages, { bankId });
  const memories = useQuery(api.memory.getMemories, { bankId, limit: 50 });
  const clients = useQuery(api.clients.list, {});

  const createPage = useMutation(api.wiki.createPage);
  const updatePage = useMutation(api.wiki.updatePage);

  const refreshQueueStats = useCallback(async () => {
    try {
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshQueueStats();
    const interval = setInterval(refreshQueueStats, 5000);
    return () => clearInterval(interval);
  }, [refreshQueueStats]);

  const addLog = useCallback((msg: string) => {
    setLogEntries((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev,
    ]);
  }, []);

  const batchSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const items = await getQueuedItems();
      if (items.length === 0) {
        addLog("Queue empty — nothing to sync");
        return;
      }
      addLog(`Syncing ${items.length} queued items to Convex...`);
      let syncedCount = 0;

      for (const item of items) {
        try {
          if (item.type === "create") {
            await createPage({
              bankId: item.bankId as Id<"memoryBanks">,
              title: item.title,
              content: item.content,
              tags: item.tags,
              lastEditedBy: "wiki-engine",
            });
          } else {
            if (item.pageId) {
              await updatePage({
                pageId: item.pageId as Id<"wikiPages">,
                content: item.content,
                lastEditedBy: "wiki-engine",
              });
            }
          }
          await markSynced(item.id);
          syncedCount++;
          addLog(`Synced: ${item.title}`);
        } catch (e: any) {
          addLog(`Error syncing ${item.title}: ${e.message}`);
        }
      }

      addLog(`Sync complete: ${syncedCount}/${items.length} items`);
      await refreshQueueStats();
    } finally {
      setSyncing(false);
    }
  }, [syncing, bankId, addLog, createPage, updatePage, refreshQueueStats]);

  const runPipeline = useCallback(async () => {
    if (step !== "idle" && step !== "complete" && step !== "error") return;
    abortRef.current = false;

    try {
      addLog("Pipeline started");
      setStep("scan");
      setProgress(0);
      setImprovements([]);

      await new Promise((r) => setTimeout(r, 300));
      const context = buildContextSummary(wikiPages, memories, clients);
      addLog(
        `Scanned: ${context.pageTitles.length} pages, ${context.memorySnippets.length} memories, ${context.clientNames.length} clients`,
      );
      if (abortRef.current) return;

      setStep("plan");
      setProgress(20);
      const plans = generatePlan(context);
      setPlanItems(plans);
      addLog(`Plan: ${plans.length} improvements identified`);
      if (abortRef.current) return;

      if (plans.length === 0) {
        addLog("Nothing to improve. Pipeline complete.");
        setStep("complete");
        setProgress(100);
        return;
      }

      setStep("generate");
      setProgress(30);

      let llm: any = null;
      try {
        addLog("Loading browser LLM...");
        llm = await loadLLM();
        addLog("LLM loaded successfully");
      } catch (e) {
        addLog("LLM unavailable — using template-based generation");
      }

      const newImprovements: Improvement[] = [];

      for (let i = 0; i < plans.length; i++) {
        if (abortRef.current) break;

        const plan = plans[i];
        setProgress(30 + Math.round((i / plans.length) * 50));

        const improvement: Improvement = {
          id: `${Date.now()}-${i}`,
          type: plan.action,
          title: plan.title,
          before: plan.pageId
            ? context.pageContents.find((p) => p.title === plan.title)
                ?.excerpt
            : undefined,
          after: "",
          status: "running",
          timestamp: Date.now(),
        };
        newImprovements.push(improvement);
        setImprovements([...newImprovements]);

        try {
          let content: string;
          if (llm) {
            const prompt = buildGeneratePrompt(plan, context);
            const result = await llm(prompt, {
              max_new_tokens: 512,
              temperature: 0.7,
            });
            content = result?.[0]?.generated_text ?? "";
          } else {
            content = generateFallbackContent(plan, context);
          }

          improvement.after = content;
          improvement.status = "done";
          addLog(`Generated: ${plan.title}`);
        } catch (e: any) {
          improvement.status = "error";
          improvement.error = e.message;
          addLog(`Error generating ${plan.title}: ${e.message}`);
        }

        setImprovements([...newImprovements]);
      }

      if (abortRef.current) return;

      setStep("validate");
      setProgress(85);
      const valid = newImprovements.filter(
        (imp) => imp.status === "done" && imp.after.length > 50,
      );
      addLog(`Validated ${valid.length}/${newImprovements.length} improvements`);
      await new Promise((r) => setTimeout(r, 200));
      if (abortRef.current) return;

      setStep("save");
      setProgress(90);

      for (const imp of valid) {
        if (abortRef.current) break;
        try {
          if (imp.before) {
            const existingPage = wikiPages?.find((p) => p.title === imp.title);
            await addToQueue({
              type: "update",
              bankId: bankId.toString(),
              pageId: existingPage?._id?.toString(),
              title: imp.title,
              content: imp.after,
              tags: ["auto-generated", "wiki-engine"],
              createdAt: Date.now(),
            });
            addLog(`Queued update: ${imp.title}`);
          } else {
            await addToQueue({
              type: "create",
              bankId: bankId.toString(),
              title: imp.title,
              content: imp.after,
              tags: ["auto-generated", "wiki-engine"],
              createdAt: Date.now(),
            });
            addLog(`Queued create: ${imp.title}`);
          }
        } catch (e: any) {
          addLog(`Error queuing ${imp.title}: ${e.message}`);
        }
      }

      await refreshQueueStats();

      const shouldSync = await shouldAutoSync();
      if (shouldSync) {
        addLog("Queue threshold reached — auto-syncing...");
        await batchSync();
      }

      setProgress(100);
      setStep("complete");
      addLog("Pipeline complete");
    } catch (e: any) {
      setStep("error");
      addLog(`Pipeline error: ${e.message}`);
    }
  }, [step, wikiPages, memories, clients, bankId, addLog, createPage, updatePage, refreshQueueStats, batchSync]);

  const stopPipeline = useCallback(() => {
    abortRef.current = true;
    addLog("Pipeline stopped by user");
  }, [addLog]);

  const resetPipeline = useCallback(() => {
    setStep("idle");
    setProgress(0);
    setPlanItems([]);
    addLog("Pipeline reset");
  }, [addLog]);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[#070b14]">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-semibold">Wiki Engine</h3>
            {wikiPages && (
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                {wikiPages.length} pages
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="rounded border-white/20 bg-[#0c1222] accent-cyan-400"
              />
              Auto-run
            </label>
            {queueStats.pending > 0 && (
              <Button
                onClick={batchSync}
                disabled={syncing}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Sync ({queueStats.pending})
              </Button>
            )}
            {step === "idle" || step === "complete" || step === "error" ? (
              <Button
                onClick={runPipeline}
                className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" />
                Run
              </Button>
            ) : (
              <Button
                onClick={stopPipeline}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-3 py-1.5 flex items-center gap-1"
              >
                <Pause className="w-3.5 h-3.5" />
                Stop
              </Button>
            )}
            {(step === "complete" || step === "error") && (
              <Button
                onClick={resetPipeline}
                className="bg-white/5 hover:bg-white/10 text-slate-400 text-xs px-2 py-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Status */}
      <div className="p-4 border-b border-white/[0.08] bg-[#0c1222]/50">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              step === "error"
                ? "text-red-400"
                : step === "complete"
                  ? "text-emerald-400"
                  : step === "idle"
                    ? "text-slate-400"
                    : "text-cyan-400",
            )}
          >
            {STEP_ICONS[step]}
            {STEP_LABELS[step]}
          </div>
          {step !== "idle" && step !== "complete" && step !== "error" && (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          )}
        </div>
        {(step !== "idle" || progress > 0) && (
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Queue Status */}
      <div className="px-4 py-2 border-b border-white/[0.08] bg-[#0c1222]/30">
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-500">Queue:</span>
          <span className={cn(
            "text-amber-400",
            queueStats.pending === 0 && "text-slate-600",
          )}>
            {queueStats.pending} pending
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-emerald-400/60">{queueStats.synced} synced</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-600">Auto-sync at 5</span>
        </div>
      </div>

      {/* Plan Summary */}
      {planItems.length > 0 && (
        <div className="p-4 border-b border-white/[0.08]">
          <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
            Improvement Plan ({planItems.length})
          </h4>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {planItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs"
              >
                <span
                  className={cn(
                    "shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold",
                    item.action === "create"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-amber-400/10 text-amber-400",
                  )}
                >
                  {item.action === "create" ? "+" : "~"}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-white/80">{item.title}</span>
                  <span className="text-slate-500 ml-1.5">— {item.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement History */}
      {improvements.length > 0 && (
        <div className="p-4 border-b border-white/[0.08]">
          <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
            Improvements ({improvements.filter((i) => i.status === "done").length}/
            {improvements.length})
          </h4>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {improvements.map((imp) => (
              <div key={imp.id}>
                <button
                  onClick={() =>
                    setSelectedImprovement(
                      selectedImprovement === imp.id ? null : imp.id,
                    )
                  }
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                    selectedImprovement === imp.id
                      ? "bg-white/[0.06]"
                      : "hover:bg-white/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      imp.status === "done"
                        ? "bg-emerald-400"
                        : imp.status === "error"
                          ? "bg-red-400"
                          : imp.status === "running"
                            ? "bg-cyan-400 animate-pulse"
                            : "bg-slate-500",
                    )}
                  />
                  <span className="text-white/80 flex-1 truncate">
                    {imp.title}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      imp.type === "create"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-amber-400/10 text-amber-400",
                    )}
                  >
                    {imp.type}
                  </span>
                  {selectedImprovement === imp.id ? (
                    <ChevronUp className="w-3 h-3 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  )}
                </button>

                {selectedImprovement === imp.id && (
                  <div className="mt-1 ml-4 p-3 rounded-lg bg-[#0c1222] border border-white/[0.06] text-xs">
                    {imp.before && (
                      <div className="mb-3">
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                          Before
                        </span>
                        <p className="text-slate-400 mt-1 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto">
                          {imp.before}
                        </p>
                      </div>
                    )}
                    {imp.before && (
                      <div className="border-t border-white/[0.06] pt-2 mb-2">
                        <span className="text-cyan-400 text-[10px] uppercase tracking-wider">
                          After
                        </span>
                      </div>
                    )}
                    <p className="text-white/80 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                      {imp.after || imp.error || "Pending..."}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      <div className="border-b border-white/[0.08]">
        <button
          onClick={() => setExpandedLog(!expandedLog)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          <span className="font-medium">
            Activity Log ({logEntries.length})
          </span>
          {expandedLog ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        {expandedLog && (
          <div className="px-4 pb-3 max-h-[150px] overflow-y-auto font-mono text-[11px] leading-relaxed">
            {logEntries.length === 0 ? (
              <p className="text-slate-600">No activity yet</p>
            ) : (
              logEntries.map((entry, i) => (
                <div key={i} className="text-slate-500 py-0.5">
                  {entry}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Data Source Summary */}
      <div className="p-4">
        <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          Data Sources
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <DataStat
            label="Wiki Pages"
            count={wikiPages?.length}
            icon={<FileText className="w-3.5 h-3.5" />}
          />
          <DataStat
            label="Memories"
            count={memories?.length}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          />
          <DataStat
            label="Clients"
            count={clients?.length}
            icon={<BookOpen className="w-3.5 h-3.5" />}
          />
        </div>
      </div>
    </div>
  );
}

function DataStat({
  label,
  count,
  icon,
}: {
  label: string;
  count: number | undefined;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0c1222] rounded-lg p-3 border border-white/[0.06]">
      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-white font-semibold text-lg">
        {count !== undefined ? count : (
          <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
        )}
      </span>
    </div>
  );
}

function generateFallbackContent(
  plan: PlanItem,
  context: ReturnType<typeof buildContextSummary>,
): string {
  const clientList = context.clientNames.slice(0, 5).join(", ");
  const memoryContext = context.memorySnippets.slice(0, 3).join("\n");

  if (plan.title === "Company Overview") {
    return `# Company Overview

Seridian is a technology company providing innovative solutions.

## Mission
Delivering exceptional value through technology and partnership.

## Services
- Custom software development
- Cloud infrastructure management
- Digital transformation consulting

## Key Clients
${clientList || "Various enterprise clients"}

## Company Facts
${memoryContext || "Building cutting-edge technology solutions."}

---
*Auto-generated by Wiki Engine — review and refine this content.*`;
  }

  if (plan.title === "Client Services") {
    return `# Client Services

Our service offerings are designed to meet diverse technology needs.

## Core Services
1. **Software Development** — Full-stack applications
2. **Infrastructure** — Cloud, DevOps, and monitoring
3. **Consulting** — Strategy and architecture

## Client Portfolio
${clientList || "A growing portfolio of satisfied clients"}

## Engagement Model
- Discovery and assessment
- Solution design
- Implementation
- Ongoing support

## Known Client Needs
${memoryContext || "Clients seek reliable, scalable solutions."}

---
*Auto-generated by Wiki Engine — review and refine this content.*`;
  }

  return `# ${plan.title}

> ${plan.reason}

## Overview
This page provides comprehensive documentation for ${plan.title.toLowerCase()}.

## Key Information
${memoryContext ? `- ${memoryContext.split("\n").join("\n- ")}` : "- Information pending review."}

## Related Clients
${clientList || "- Client data pending integration."}

## Additional Notes
- Cross-reference with other wiki pages as needed
- Update regularly as information evolves

---
*Auto-generated by Wiki Engine — review and refine this content.*`;
}
