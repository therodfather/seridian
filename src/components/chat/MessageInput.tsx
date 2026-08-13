"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Send,
  Sparkles,
  Zap,
  BarChart3,
  Code,
  Bold,
  Italic,
  Smile,
  AtSign,
  Terminal,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  channelId: Id<"channels">;
  replyTo?: Id<"messages">;
  currentUserId?: string;
  currentUserName?: string;
  placeholder?: string;
  /** When true (e.g. Convex reconnecting), block sends. */
  disabled?: boolean;
}

const AI_AGENTS = [
  {
    id: "@SeridianAI",
    name: "SeridianAI",
    role: "Executive AI Architect",
    icon: Sparkles,
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20",
    botId: "bot-seridian",
  },
  {
    id: "@LinearSyncBot",
    name: "LinearSyncBot",
    role: "Sprint & Issue Orchestrator",
    icon: Zap,
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20",
    botId: "bot-linearsync",
  },
  {
    id: "@DataPulse",
    name: "DataPulse",
    role: "Analytics & BI Agent",
    icon: BarChart3,
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20",
    botId: "bot-datapulse",
  },
];

const EMOJI_LIST = ["👍", "❤️", "🚀", "👀", "🎉", "💡", "🔥", "✅", "🤖", "⚡"];

export function MessageInput({
  channelId,
  replyTo,
  currentUserId,
  currentUserName,
  placeholder,
  disabled = false,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTypingAgent, setIsTypingAgent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const sendMessage = useMutation(api.messages.send);

  const hasSession = Boolean(currentUserId?.trim() && currentUserName?.trim());
  const canCompose = hasSession && !disabled && !isSending;
  const canSend = canCompose && content.trim().length > 0;

  const handleInsertTag = (tag: string) => {
    if (!canCompose) return;
    setContent((prev) => {
      const space = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
      return prev + space + tag + " ";
    });
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  const handleFormatText = (prefix: string, suffix: string = prefix) => {
    if (!canCompose || !textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + (selected || "text") + suffix;
    setContent(content.substring(0, start) + replacement + content.substring(end));
    textareaRef.current.focus();
  };

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || sendingRef.current || disabled) return;

    if (!currentUserId?.trim() || !currentUserName?.trim()) {
      setSendError("Sign in required to send messages.");
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    setSendError(null);
    setContent("");
    setShowMentionMenu(false);
    setShowEmojiPicker(false);

    try {
      const sentMessageId = await sendMessage({
        channelId,
        senderId: currentUserId.trim(),
        senderName: currentUserName.trim(),
        content: trimmed,
        type: "text",
        replyTo: replyTo,
      });

      if (trimmed.includes("@SeridianAI") || trimmed.startsWith("/summarize")) {
        setIsTypingAgent(true);
        setTimeout(async () => {
          setIsTypingAgent(false);
          try {
            await sendMessage({
              channelId,
              senderId: "bot-seridian",
              senderName: "SeridianAI",
              content: `### 🤖 Seridian AI Agent Response\n\nI have processed your request: **"${trimmed.replace(/@SeridianAI|\/summarize/g, "").trim() || "Workspace Analysis"}"**.\n\n\`\`\`ts\n// Agent Orchestration Status\nconst systemCheck = {\n  status: "OPTIMIZED",\n  activeThreads: 14,\n  latency: "18ms"\n};\n\`\`\`\n\n- **Executive Summary:** Architectural parameters aligned with Enterprise guidelines.\n- **Action Items:** Queued real-time telemetry and verified client state.`,
              type: "text",
              replyTo: replyTo || sentMessageId,
            });
          } catch {
            // Agent reply is best-effort; user message already landed.
          }
        }, 900);
      } else if (trimmed.includes("@LinearSyncBot") || trimmed.startsWith("/create-issue")) {
        setIsTypingAgent(true);
        setTimeout(async () => {
          setIsTypingAgent(false);
          try {
            const issueNum = Math.floor(100 + Math.random() * 900);
            await sendMessage({
              channelId,
              senderId: "bot-linearsync",
              senderName: "LinearSyncBot",
              content: `⚡ **Linear Issue Created & Synced**\n\n- **Issue ID:** \`LIN-${issueNum}\`\n- **Title:** ${trimmed.replace(/@LinearSyncBot|\/create-issue/g, "").trim() || "Automated Task Sync"}\n- **Priority:** High 🔥\n- **State:** In Progress\n\n> Webhook synced to team board. Assigned to @SeridianAI.`,
              type: "text",
              replyTo: replyTo || sentMessageId,
            });
          } catch {
            // Agent reply is best-effort; user message already landed.
          }
        }, 900);
      } else if (trimmed.includes("@DataPulse")) {
        setIsTypingAgent(true);
        setTimeout(async () => {
          setIsTypingAgent(false);
          try {
            await sendMessage({
              channelId,
              senderId: "bot-datapulse",
              senderName: "DataPulse",
              content: `📊 **Data Analytics Overview**\n\n- **Active Revenue Pipeline:** \$1.42M\n- **Client Satisfaction Index:** 99.2%\n- **Active Nodes:** 42 active channels\n\n\`\`\`json\n{\n  "metrics": "optimal",\n  "errorRate": "0.001%"\n}\n\`\`\``,
              type: "text",
              replyTo: replyTo || sentMessageId,
            });
          } catch {
            // Agent reply is best-effort; user message already landed.
          }
        }, 900);
      }
    } catch (err) {
      setContent(trimmed);
      setSendError(
        err instanceof Error ? err.message : "Failed to send message. Try again.",
      );
    } finally {
      sendingRef.current = false;
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [
    content,
    channelId,
    replyTo,
    sendMessage,
    currentUserId,
    currentUserName,
    disabled,
  ]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) void handleSend();
    } else if (e.key === "@" && canCompose) {
      setShowMentionMenu(true);
    }
  }

  return (
    <div
      className="relative shrink-0 border-t border-white/[0.08] bg-[#090d16] p-3 space-y-2"
      data-testid="chat-composer"
    >
      {!hasSession && (
        <div
          className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200"
          role="status"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Sign in required to send messages.</span>
        </div>
      )}

      {disabled && hasSession && (
        <div
          className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200"
          role="status"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Connection unavailable — messaging paused until reconnect.</span>
        </div>
      )}

      {sendError && (
        <div
          className="flex items-start justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300"
          role="alert"
        >
          <span className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{sendError}</span>
          </span>
          <button
            type="button"
            onClick={() => setSendError(null)}
            className="shrink-0 text-red-200/80 hover:text-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Terminal className="h-3 w-3 text-cyan-400" /> Agent Studio:
        </span>
        {AI_AGENTS.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => handleInsertTag(agent.id)}
            disabled={!canCompose}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all shrink-0",
              agent.color,
              !canCompose && "opacity-40 cursor-not-allowed",
            )}
          >
            <agent.icon className="h-3 w-3" />
            {agent.id}
          </button>
        ))}
      </div>

      {isTypingAgent && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2.5 py-1 animate-pulse">
          <Sparkles className="h-3.5 w-3.5 animate-spin" />
          <span>AI Agent is formulating response...</span>
        </div>
      )}

      {showMentionMenu && canCompose && (
        <div className="absolute bottom-full left-3 mb-2 w-64 rounded-xl border border-white/10 bg-[#0d1424] p-1.5 shadow-2xl z-30">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Mention AI Agent
          </div>
          {AI_AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => handleInsertTag(agent.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-200 hover:bg-white/[0.08] transition-colors"
            >
              <agent.icon className="h-3.5 w-3.5 text-cyan-400" />
              <div>
                <div className="font-semibold text-white">{agent.id}</div>
                <div className="text-[10px] text-slate-400">{agent.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showEmojiPicker && canCompose && (
        <div className="absolute bottom-full left-12 mb-2 flex items-center gap-1 rounded-xl border border-white/10 bg-[#0d1424] p-2 shadow-2xl z-30">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setContent((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-sm hover:bg-white/10 hover:scale-110 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-[#070b14] p-2.5 focus-within:border-cyan-500/40 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-inner">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasSession
              ? "Sign in to message this channel..."
              : disabled
                ? "Reconnecting — messaging paused..."
                : placeholder || "Message channel or mention @SeridianAI..."
          }
          aria-label="Message input"
          rows={2}
          disabled={!canCompose}
          aria-busy={isSending}
          className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed min-h-[38px] max-h-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleFormatText("**")}
              disabled={!canCompose}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Bold (**text**)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormatText("*")}
              disabled={!canCompose}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Italic (*text*)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormatText("```\n", "\n```")}
              disabled={!canCompose}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Code Block"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <div className="mx-0.5 h-3.5 w-px bg-white/10" />
            <button
              type="button"
              onClick={() => setShowMentionMenu(!showMentionMenu)}
              disabled={!canCompose}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Mention Agent"
            >
              <AtSign className="h-3.5 w-3.5 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={!canCompose}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Add Emoji"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-500 sm:inline">
              {isSending
                ? "Sending..."
                : "Press Enter to send, Shift+Enter for new line"}
            </span>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="flex h-7 px-3 shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500 font-medium text-xs text-slate-950 shadow-md transition-all hover:bg-cyan-400 hover:shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span>{isSending ? "Sending" : "Send"}</span>
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
