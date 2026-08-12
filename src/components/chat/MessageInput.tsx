"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  Paperclip,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  channelId: Id<"channels">;
  replyTo?: Id<"messages">;
  currentUserId?: string;
  currentUserName?: string;
  placeholder?: string;
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
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTypingAgent, setIsTypingAgent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useMutation(api.messages.send);

  const handleInsertTag = (tag: string) => {
    setContent((prev) => {
      const space = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
      return prev + space + tag + " ";
    });
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  const handleFormatText = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + (selected || "text") + suffix;
    setContent(content.substring(0, start) + replacement + content.substring(end));
    textareaRef.current.focus();
  };

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      // 1. Send User Message
      const sentMessageId = await sendMessage({
        channelId,
        senderId: currentUserId ?? "user-demo",
        senderName: currentUserName ?? "Alex Mercer",
        content: trimmed,
        type: "text",
        replyTo: replyTo,
      });

      setContent("");
      setShowMentionMenu(false);
      setShowEmojiPicker(false);

      // 2. Check for AI Agent tags to trigger automated responses
      if (trimmed.includes("@SeridianAI") || trimmed.startsWith("/summarize")) {
        setIsTypingAgent(true);
        setTimeout(async () => {
          setIsTypingAgent(false);
          await sendMessage({
            channelId,
            senderId: "bot-seridian",
            senderName: "SeridianAI",
            content: `### 🤖 Seridian AI Agent Response\n\nI have processed your request: **"${trimmed.replace(/@SeridianAI|\/summarize/g, "").trim() || "Workspace Analysis"}"**.\n\n\`\`\`ts\n// Agent Orchestration Status\nconst systemCheck = {\n  status: "OPTIMIZED",\n  activeThreads: 14,\n  latency: "18ms"\n};\n\`\`\`\n\n- **Executive Summary:** Architectural parameters aligned with Enterprise guidelines.\n- **Action Items:** Queued real-time telemetry and verified client state.`,
            type: "text",
            replyTo: replyTo || sentMessageId,
          });
        }, 900);
      } else if (trimmed.includes("@LinearSyncBot") || trimmed.startsWith("/create-issue")) {
        setIsTypingAgent(true);
        setTimeout(async () => {
          setIsTypingAgent(false);
          const issueNum = Math.floor(100 + Math.random() * 900);
          await sendMessage({
            channelId,
            senderId: "bot-linearsync",
            senderName: "LinearSyncBot",
            content: `⚡ **Linear Issue Created & Synced**\n\n- **Issue ID:** \`LIN-${issueNum}\`\n- **Title:** ${trimmed.replace(/@LinearSyncBot|\/create-issue/g, "").trim() || "Automated Task Sync"}\n- **Priority:** High 🔥\n- **State:** In Progress\n\n> Webhook synced to team board. Assigned to @SeridianAI.`,
            type: "text",
            replyTo: replyTo || sentMessageId,
          });
        }, 900);
      } else if (trimmed.includes("@DataPulse")) {
        setIsTypingAgent(true);
        setTimeout(async () => {
          setIsTypingAgent(false);
          await sendMessage({
            channelId,
            senderId: "bot-datapulse",
            senderName: "DataPulse",
            content: `📊 **Data Analytics Overview**\n\n- **Active Revenue Pipeline:** \$1.42M\n- **Client Satisfaction Index:** 99.2%\n- **Active Nodes:** 42 active channels\n\n\`\`\`json\n{\n  "metrics": "optimal",\n  "errorRate": "0.001%"\n}\n\`\`\``,
            type: "text",
            replyTo: replyTo || sentMessageId,
          });
        }, 900);
      }
    } catch {
      // Silently fail
    }
  }, [content, channelId, replyTo, sendMessage, currentUserId, currentUserName]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "@") {
      setShowMentionMenu(true);
    }
  }

  return (
    <div className="relative border-t border-white/[0.08] bg-[#090d16] p-3 space-y-2">
      {/* AI Agent Trigger Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Terminal className="h-3 w-3 text-cyan-400" /> Agent Studio:
        </span>
        {AI_AGENTS.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => handleInsertTag(agent.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all shrink-0",
              agent.color
            )}
          >
            <agent.icon className="h-3 w-3" />
            {agent.id}
          </button>
        ))}
      </div>

      {/* Typing Indicator for AI Agents */}
      {isTypingAgent && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2.5 py-1 animate-pulse">
          <Sparkles className="h-3.5 w-3.5 animate-spin" />
          <span>AI Agent is formulating response...</span>
        </div>
      )}

      {/* Mention Autocomplete Popover */}
      {showMentionMenu && (
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

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
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

      {/* Main Text Container */}
      <div className="rounded-xl border border-white/10 bg-[#070b14] p-2.5 focus-within:border-cyan-500/40 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-inner">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Message channel or mention @SeridianAI..."}
          rows={2}
          className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed min-h-[38px] max-h-[140px]"
        />

        {/* Action Formatting Bar */}
        <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleFormatText("**")}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Bold (**text**)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormatText("*")}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Italic (*text*)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormatText("```\n", "\n```")}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Code Block"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <div className="h-3.5 w-px bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={() => setShowMentionMenu(!showMentionMenu)}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Mention Agent"
            >
              <AtSign className="h-3.5 w-3.5 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Add Emoji"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-500 sm:inline">
              Press Enter to send, Shift+Enter for new line
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={!content.trim()}
              className="flex h-7 px-3 shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500 font-medium text-xs text-slate-950 shadow-md transition-all hover:bg-cyan-400 hover:shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
