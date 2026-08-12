"use client";

import { useState, useRef, useCallback } from "react";
import {
  Bot,
  Send,
  Cpu,
  AlertCircle,
  Trash2,
  Loader2,
  CheckCircle2,
  Zap,
  HardDrive,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import {
  ARENA_MODELS,
  extractGeneratedText,
  type ArenaModel,
} from "@/lib/arenaModels";
import { ModelManager, type ModelState } from "@/components/arena/ModelManager";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface LoadProgress {
  status: "idle" | "downloading" | "loading" | "ready" | "error";
  percent: number;
  loaded: number;
  total: number;
  startTime: number;
  error: string | null;
}

interface ModelStatus {
  [modelId: string]: LoadProgress;
}

function calculateSpeed(loaded: number, startTime: number): number {
  const elapsed = (Date.now() - startTime) / 1000;
  if (elapsed <= 0) return 0;
  return loaded / elapsed / (1024 * 1024);
}

function calculateETA(loaded: number, total: number, speed: number): string {
  if (speed <= 0 || total <= 0 || loaded >= total) return "—";
  const remaining = total - loaded;
  const seconds = remaining / (speed * 1024 * 1024);
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function buildPrompt(messages: { role: string; content: string }[]): string {
  let prompt = "";
  for (const msg of messages) {
    prompt += "<im_start>" + msg.role + "\n" + msg.content + "\n<im_end>";
  }
  prompt += "<im_end>" + "\nassistant\n";
  return prompt;
}

export function LLMArena() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<ArenaModel | null>(
    ARENA_MODELS[0] ?? null,
  );
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [modelStatuses, setModelStatuses] = useState<ModelStatus>({});
  const [deviceType, setDeviceType] = useState<string>("WebGPU");
  const [memoryUsage, setMemoryUsage] = useState<string | null>(null);
  const [modelsOpen, setModelsOpen] = useState(true);
  const pipelineRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentProgress = (selectedModel && modelStatuses[selectedModel.modelId]) || {
    status: "idle" as const,
    percent: 0,
    loaded: 0,
    total: 0,
    startTime: 0,
    error: null,
  };

  const updateModelStatus = useCallback(
    (modelId: string, updates: Partial<LoadProgress>) => {
      setModelStatuses((prev) => ({
        ...prev,
        [modelId]: {
          ...{
            status: "idle",
            percent: 0,
            loaded: 0,
            total: 0,
            startTime: 0,
            error: null,
          },
          ...prev[modelId],
          ...updates,
        },
      }));
    },
    []
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadModel = useCallback(
    async (model: ArenaModel) => {
      if (modelStatuses[model.modelId]?.status === "ready") return;

      updateModelStatus(model.modelId, {
        status: "downloading",
        percent: 0,
        loaded: 0,
        total: 0,
        startTime: Date.now(),
        error: null,
      });

      try {
        const { pipeline } = await import("@huggingface/transformers");

        let hasWebGPU = false;
        if (typeof navigator !== "undefined" && "gpu" in navigator) {
          try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            hasWebGPU = !!adapter;
          } catch {
            hasWebGPU = false;
          }
        }
        setDeviceType(hasWebGPU ? "WebGPU" : "WASM");

        updateModelStatus(model.modelId, { status: "loading" });

        const pipe = await pipeline("text-generation", model.modelId, {
          dtype: (model as any).dtype || "q4",
          device: hasWebGPU ? "webgpu" : "wasm",
          progress_callback: (progress: any) => {
            if (progress.status === "progress") {
              updateModelStatus(model.modelId, {
                status: "downloading",
                percent: progress.progress || 0,
                loaded: progress.loaded || 0,
                total: progress.total || 0,
              });
            } else if (progress.status === "done") {
              updateModelStatus(model.modelId, {
                status: "loading",
                percent: 100,
                loaded: progress.total || 0,
                total: progress.total || 0,
              });
            } else if (progress.status === "initiate") {
              updateModelStatus(model.modelId, {
                status: "downloading",
                percent: 0,
                loaded: 0,
                total: 0,
              });
            }
          },
        });

        pipelineRef.current = pipe;
        updateModelStatus(model.modelId, { status: "ready", percent: 100 });

        const nav = navigator as any;
        if (nav.deviceMemory) {
          setMemoryUsage(`${Math.round(nav.deviceMemory)}GB device`);
        }
      } catch (err: any) {
        updateModelStatus(model.modelId, {
          status: "error",
          error: err.message || "Failed to load model",
        });
      }
    },
    [modelStatuses, updateModelStatus]
  );

  // Do not auto-download/load models on mount — wait for explicit Load in ModelManager.

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !pipelineRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const output = await pipelineRef.current(buildPrompt([
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: input.trim() },
      ]));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: extractGeneratedText(output) || "(empty response)",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error generating response",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setLoading(false);
  }, [input, loading, messages, scrollToBottom]);

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  const speed = currentProgress.startTime
    ? calculateSpeed(currentProgress.loaded, currentProgress.startTime)
    : 0;
  const eta =
    currentProgress.status === "downloading"
      ? calculateETA(currentProgress.loaded, currentProgress.total, speed)
      : "—";

  const managerStatuses: Record<string, ModelState> = Object.fromEntries(
    Object.entries(modelStatuses).map(([id, progress]) => [id, progress.status]),
  );

  const handleSelectModel = useCallback(
    (model: ArenaModel) => {
      setSelectedModel(model);
      void loadModel(model);
    },
    [loadModel],
  );

  const statusLabel =
    currentProgress.status === "ready"
      ? "Ready"
      : currentProgress.status === "error"
        ? "Error"
        : currentProgress.status === "downloading"
          ? "Downloading"
          : currentProgress.status === "loading"
            ? "Initializing"
            : "Idle";

  return (
    <div
      data-testid="arena-root"
      className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:flex-row"
    >
      {/* Model Manager — top strip on mobile, left rail on desktop */}
      <aside
        className={cn(
          "flex min-h-0 shrink-0 flex-col border-white/[0.08] bg-[#0c1222]",
          "border-b md:h-full md:border-b-0 md:border-r",
          modelsOpen
            ? "max-h-[42%] md:max-h-none md:w-72 lg:w-80"
            : "max-h-none md:w-10",
        )}
      >
        {modelsOpen ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <ModelManager
              embedded
              onSelectModel={handleSelectModel}
              selectedModelId={selectedModel?.modelId}
              modelStatuses={managerStatuses}
              headerAction={
                <button
                  type="button"
                  onClick={() => setModelsOpen(false)}
                  className="rounded border border-white/[0.08] p-1 text-slate-500 hover:text-white"
                  title="Collapse models"
                  aria-label="Collapse models"
                >
                  <PanelLeftClose className="hidden h-3.5 w-3.5 md:block" />
                  <span className="px-0.5 text-[10px] md:hidden">Hide</span>
                </button>
              }
              onModelStatusChange={(modelId, state) => {
                updateModelStatus(modelId, {
                  status:
                    state === "cached"
                      ? "idle"
                      : state === "ready"
                        ? "ready"
                        : state === "error"
                          ? "error"
                          : state === "downloading"
                            ? "downloading"
                            : state === "loading"
                              ? "loading"
                              : "idle",
                });
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 md:flex-col md:items-center md:gap-3 md:py-3">
            <span className="text-[11px] font-medium text-slate-400 md:sr-only">
              Models
            </span>
            <button
              type="button"
              onClick={() => setModelsOpen(true)}
              className="rounded border border-white/[0.08] p-1 text-slate-500 hover:text-white"
              title="Expand models"
              aria-label="Expand models"
            >
              <PanelLeft className="hidden h-3.5 w-3.5 md:block" />
              <span className="px-1 text-[11px] md:hidden">Show models</span>
            </button>
            <span
              className="hidden origin-center rotate-180 text-[10px] tracking-widest text-slate-500 md:inline"
              style={{ writingMode: "vertical-rl" }}
            >
              Models
            </span>
          </div>
        )}
      </aside>

      {/* Main chat area */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {ARENA_MODELS.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="p-4 text-center">
              <AlertCircle className="mx-auto mb-2 h-7 w-7 text-slate-500" />
              <h3 className="mb-0.5 font-semibold text-white">No models available</h3>
              <p className="text-sm text-slate-400">
                The local model catalog is empty. Add models to start chatting.
              </p>
            </div>
          </div>
        )}

        {/* Compact chat toolbar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0c1222]/60 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Cpu className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <span className="truncate text-xs font-medium text-white">
              {selectedModel?.name ?? "No model"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-px text-[10px]",
                currentProgress.status === "ready"
                  ? "border-green-500/30 text-green-400"
                  : currentProgress.status === "error"
                    ? "border-red-500/30 text-red-400"
                    : "border-cyan-500/30 text-cyan-400",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  currentProgress.status === "ready"
                    ? "bg-green-400"
                    : currentProgress.status === "error"
                      ? "bg-red-400"
                      : "animate-pulse bg-cyan-400",
                )}
              />
              {statusLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[10px] text-slate-500">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <Zap className="h-3 w-3 text-cyan-400" />
              {deviceType}
            </span>
            {memoryUsage && (
              <span className="hidden items-center gap-1 lg:inline-flex">
                <HardDrive className="h-3 w-3" />
                {memoryUsage}
              </span>
            )}
          </div>
        </div>

        {/* Progress overlay */}
        {selectedModel &&
          (currentProgress.status === "downloading" ||
            currentProgress.status === "loading") && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="mx-4 w-full max-w-sm rounded-xl border border-cyan-500/30 bg-[#0c1222] p-5 shadow-2xl shadow-cyan-500/10">
              {currentProgress.status === "loading" &&
              currentProgress.percent >= 100 ? (
                <CheckCircle2 className="mx-auto mb-3 h-7 w-7 text-green-400" />
              ) : (
                <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-cyan-400" />
              )}
              <h3 className="mb-0.5 text-center font-semibold text-white">
                {selectedModel?.name ?? "Model"}
              </h3>
              <p className="mb-3 text-center text-sm text-slate-400">
                {currentProgress.status === "downloading"
                  ? "Downloading model..."
                  : "Initializing model..."}
              </p>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    currentProgress.status === "loading" &&
                      currentProgress.percent >= 100
                      ? "bg-green-500"
                      : "bg-cyan-500"
                  )}
                  style={{ width: `${currentProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  {formatBytes(currentProgress.loaded)} /{" "}
                  {formatBytes(currentProgress.total)}
                </span>
                <span>
                  {currentProgress.status === "downloading"
                    ? `${speed.toFixed(1)} MB/s · ${eta} remaining`
                    : currentProgress.percent >= 100
                      ? "Almost ready..."
                      : "Preparing..."}
                </span>
              </div>
              <div className="mt-2 text-center">
                <span className="text-xl font-bold text-cyan-400">
                  {Math.round(currentProgress.percent)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {selectedModel && currentProgress.status === "error" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="mx-4 w-full max-w-sm rounded-xl border border-red-500/30 bg-[#0c1222] p-5 shadow-2xl shadow-red-500/10">
              <AlertCircle className="mx-auto mb-3 h-7 w-7 text-red-400" />
              <h3 className="mb-0.5 text-center font-semibold text-white">
                Failed to Load
              </h3>
              <p className="mb-3 text-center text-sm text-slate-400">
                {currentProgress.error || "An error occurred while loading the model."}
              </p>
              <button
                onClick={() => selectedModel && loadModel(selectedModel)}
                className="w-full rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {messages.length === 0 && currentProgress.status === "idle" && (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <Bot className="mb-2 h-9 w-9 text-slate-600" />
              <h2 className="mb-1 text-base font-semibold text-white">
                LLM Arena
              </h2>
              <p className="max-w-md text-sm text-slate-400">
                Download a model in the Model Manager, then click Load to start
                chatting. Models stay local in your browser.
              </p>
            </div>
          )}
          {messages.length === 0 &&
            currentProgress.status !== "ready" &&
            currentProgress.status !== "idle" &&
            currentProgress.status !== "error" && (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <Bot className="mb-2 h-9 w-9 text-slate-600" />
              <h2 className="mb-1 text-base font-semibold text-white">
                LLM Arena
              </h2>
              <p className="max-w-md text-sm text-slate-400">
                Preparing the selected model…
              </p>
            </div>
          )}
          {messages.length === 0 && currentProgress.status === "ready" && (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <Bot className="mb-2 h-9 w-9 text-cyan-400" />
              <h2 className="mb-1 text-base font-semibold text-white">
                {selectedModel?.name ?? "Model"} Ready
              </h2>
              <p className="max-w-md text-sm text-slate-400">
                Start a conversation below.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm md:max-w-[70%]",
                  msg.role === "user"
                    ? "bg-cyan-500/20 text-cyan-100"
                    : "bg-white/[0.05] text-slate-200"
                )}
              >
                {msg.content ||
                  (loading && msg.role === "assistant" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </span>
                  ) : (
                    ""
                  ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div
          data-testid="arena-composer"
          className="shrink-0 border-t border-white/[0.08] bg-[#0c1222]/40 p-2.5"
        >
          <div className="flex gap-1.5">
            <button
              onClick={handleClear}
              className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 text-slate-400 transition-colors hover:text-white"
              title="Clear chat"
              aria-label="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={
                currentProgress.status === "ready"
                  ? "Type a message..."
                  : currentProgress.status === "error"
                    ? "Model failed to load"
                    : currentProgress.status === "idle"
                      ? "Load a model to chat…"
                      : "Loading model..."
              }
              disabled={currentProgress.status !== "ready" || loading}
              className="flex-1 rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-cyan-400 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={
                currentProgress.status !== "ready" || loading || !input.trim()
              }
              className="rounded-lg bg-cyan-500 px-3 py-2 text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
