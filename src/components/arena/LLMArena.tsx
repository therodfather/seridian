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
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error generating response",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setLoading(false);
  }, [input, loading, messages]);

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

  return (
    <div className="flex h-full relative">
      <div className="w-[22rem] shrink-0 border-r border-white/[0.08] bg-[#0c1222] overflow-y-auto">
        <ModelManager
          onSelectModel={handleSelectModel}
          selectedModelId={selectedModel?.modelId}
          modelStatuses={managerStatuses}
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative">
        {ARENA_MODELS.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center p-6">
              <AlertCircle className="h-8 w-8 text-slate-500 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">No models available</h3>
              <p className="text-sm text-slate-400">
                The local model catalog is empty. Add models to start chatting.
              </p>
            </div>
          </div>
        )}

        {/* Progress overlay */}
        {selectedModel &&
          (currentProgress.status === "downloading" ||
            currentProgress.status === "loading") && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-[#0c1222] rounded-xl p-6 border border-cyan-500/30 max-w-sm w-full mx-4 shadow-2xl shadow-cyan-500/10">
              {currentProgress.status === "loading" &&
              currentProgress.percent >= 100 ? (
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-4" />
              ) : (
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-4" />
              )}
              <h3 className="text-white font-semibold text-center mb-1">
                {selectedModel?.name ?? "Model"}
              </h3>
              <p className="text-slate-400 text-sm text-center mb-4">
                {currentProgress.status === "downloading"
                  ? "Downloading model..."
                  : "Initializing model..."}
              </p>
              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
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
              {/* Stats row */}
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
              {/* Percentage */}
              <div className="text-center mt-3">
                <span className="text-2xl font-bold text-cyan-400">
                  {Math.round(currentProgress.percent)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {selectedModel && currentProgress.status === "error" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-[#0c1222] rounded-xl p-6 border border-red-500/30 max-w-sm w-full mx-4 shadow-2xl shadow-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold text-center mb-1">
                Failed to Load
              </h3>
              <p className="text-slate-400 text-sm text-center mb-4">
                {currentProgress.error || "An error occurred while loading the model."}
              </p>
              <button
                onClick={() => selectedModel && loadModel(selectedModel)}
                className="w-full rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && currentProgress.status === "idle" && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-12 h-12 text-slate-600 mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">
                LLM Arena
              </h2>
              <p className="text-sm text-slate-400 max-w-md">
                Download a model in the Model Manager, then click Load to start
                chatting. Models stay local in your browser.
              </p>
            </div>
          )}
          {messages.length === 0 &&
            currentProgress.status !== "ready" &&
            currentProgress.status !== "idle" &&
            currentProgress.status !== "error" && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-12 h-12 text-slate-600 mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">
                LLM Arena
              </h2>
              <p className="text-sm text-slate-400 max-w-md">
                Preparing the selected model…
              </p>
            </div>
          )}
          {messages.length === 0 && currentProgress.status === "ready" && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-12 h-12 text-cyan-400 mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">
                {selectedModel?.name ?? "Model"} Ready
              </h2>
              <p className="text-sm text-slate-400 max-w-md">
                Start a conversation below.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
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

        {/* Input area */}
        <div className="border-t border-white/[0.08] p-4">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 text-slate-400 hover:text-white transition-colors"
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
                    : "Loading model..."
              }
              disabled={currentProgress.status !== "ready" || loading}
              className="flex-1 rounded-lg border border-white/[0.08] bg-[#070b14] px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={
                currentProgress.status !== "ready" || loading || !input.trim()
              }
              className="rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="border-t border-white/[0.08] bg-[#0c1222]/50 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-cyan-400" />
              <span>{deviceType}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-cyan-400" />
              <span>{selectedModel?.name ?? "No model"}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {memoryUsage && (
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3 w-3 text-slate-500" />
                <span>{memoryUsage}</span>
              </div>
            )}
            <div
              className={cn(
                "flex items-center gap-1.5",
                currentProgress.status === "ready"
                  ? "text-green-400"
                  : currentProgress.status === "error"
                    ? "text-red-400"
                    : "text-cyan-400"
              )}
            >
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  currentProgress.status === "ready"
                    ? "bg-green-400"
                    : currentProgress.status === "error"
                      ? "bg-red-400"
                      : "bg-cyan-400 animate-pulse"
                )}
              />
              <span>
                {currentProgress.status === "ready"
                  ? "Ready"
                  : currentProgress.status === "error"
                    ? "Error"
                    : currentProgress.status === "downloading"
                      ? "Downloading"
                      : currentProgress.status === "loading"
                        ? "Initializing"
                        : "Idle"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
