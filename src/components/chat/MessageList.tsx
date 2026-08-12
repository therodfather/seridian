"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Sparkles,
  Bot,
  Zap,
  BarChart3,
  Smile,
  Copy,
  Check,
  CornerDownRight,
  Heart,
} from "lucide-react";
import { RichMessage } from "./RichMessage";
import { ContextMenu } from "@/components/ui/ContextMenu";

type Message = Doc<"messages">;

interface MessageListProps {
  channelId: Id<"channels">;
  currentUserId?: string;
  onOpenThread?: (message: Message) => void;
  searchQuery?: string;
  agentFilter?: string;
}

const EMOJI_OPTIONS = ["👍", "❤️", "🚀", "👀", "🎉", "💡"];

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getAgentMeta(senderName: string, senderId: string) {
  if (senderName.includes("SeridianAI") || senderId === "bot-seridian") {
    return {
      isAgent: true,
      badge: "Seridian AI",
      role: "Architect Agent",
      icon: Sparkles,
      color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
      avatarBg: "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40",
      borderGlow: "border-cyan-500/30 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.08)]",
    };
  }
  if (senderName.includes("LinearSync") || senderId === "bot-linearsync") {
    return {
      isAgent: true,
      badge: "LinearSyncBot",
      role: "Sprint Orchestrator",
      icon: Zap,
      color: "text-purple-400 border-purple-500/40 bg-purple-500/10",
      avatarBg: "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40",
      borderGlow: "border-purple-500/30 bg-purple-950/10 shadow-[0_0_15px_rgba(168,85,247,0.08)]",
    };
  }
  if (senderName.includes("DataPulse") || senderId === "bot-datapulse") {
    return {
      isAgent: true,
      badge: "DataPulse",
      role: "Analytics Bot",
      icon: BarChart3,
      color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
      avatarBg: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40",
      borderGlow: "border-amber-500/30 bg-amber-950/10 shadow-[0_0_15px_rgba(245,158,11,0.08)]",
    };
  }
  return { isAgent: false };
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-px flex-1 bg-white/[0.08]" />
      <span className="rounded-full border border-white/[0.08] bg-[#0c1222] px-3 py-0.5 text-[11px] font-medium text-slate-400 shadow-sm">
        {date}
      </span>
      <div className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

function MessageItem({
  message,
  showSender,
  replyToMessage,
  replyCount,
  onOpenThread,
}: {
  message: Message;
  showSender: boolean;
  replyToMessage?: Message;
  replyCount: number;
  onOpenThread?: (message: Message) => void;
}) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Record<string, boolean>>({});
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const agentMeta = getAgentMeta(message.senderName, message.senderId);

  const handleToggleReaction = (emoji: string) => {
    setUserReactions((prev) => {
      const hasReacted = !!prev[emoji];
      const newReacted = !hasReacted;

      setReactions((curr) => {
        const count = curr[emoji] || 0;
        const newCount = newReacted ? count + 1 : Math.max(0, count - 1);
        if (newCount === 0) {
          const copy = { ...curr };
          delete copy[emoji];
          return copy;
        }
        return { ...curr, [emoji]: newCount };
      });

      return { ...prev, [emoji]: newReacted };
    });
    setShowEmojiMenu(false);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems = [
    {
      label: "Reply in Thread",
      icon: MessageSquare,
      shortcut: "⌘R",
      action: () => onOpenThread?.(message),
    },
    {
      label: "Copy Message Text",
      icon: Copy,
      shortcut: "⌘C",
      action: handleCopyText,
    },
    {
      label: "Add Thumbs Up Reaction",
      icon: Smile,
      action: () => handleToggleReaction("👍"),
    },
    {
      label: "Add Heart Reaction",
      icon: Heart,
      action: () => handleToggleReaction("❤️"),
    },
  ];

  return (
    <ContextMenu items={menuItems}>
      <div
        className={cn(
          "group relative px-4 py-1.5 transition-colors hover:bg-white/[0.03]",
          agentMeta.isAgent && "my-1.5 rounded-xl border p-3.5 mx-3 " + agentMeta.borderGlow,
          showSender && !agentMeta.isAgent && "pt-3"
        )}
      >
      {/* Floating Hover Toolbar */}
      <div className="absolute right-4 top-2 z-10 hidden items-center gap-1 rounded-lg border border-white/10 bg-[#0d1424] p-1 shadow-lg group-hover:flex">
        {EMOJI_OPTIONS.slice(0, 3).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleToggleReaction(emoji)}
            className="flex h-6 w-6 items-center justify-center rounded text-xs hover:bg-white/10 hover:scale-110 transition-all"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowEmojiMenu(!showEmojiMenu)}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="More reactions"
        >
          <Smile className="h-3.5 w-3.5" />
        </button>

        {onOpenThread && (
          <button
            type="button"
            onClick={() => onOpenThread(message)}
            className="flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-cyan-400 transition-colors"
            title="Reply in thread"
          >
            <MessageSquare className="h-3 w-3" />
            <span>Thread</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyText}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Copy message"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      {/* Emoji Extended Picker Popover */}
      {showEmojiMenu && (
        <div className="absolute right-4 top-10 z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-[#0d1424] p-1.5 shadow-2xl">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleToggleReaction(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded text-sm hover:bg-white/10 hover:scale-110 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Header Info */}
      {(showSender || agentMeta.isAgent) && (
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              agentMeta.isAgent
                ? agentMeta.avatarBg
                : "bg-seridian-500/10 text-seridian-400"
            }`}
          >
            {agentMeta.isAgent && agentMeta.icon ? (
              <agentMeta.icon className="h-3.5 w-3.5" />
            ) : (
              message.senderName.charAt(0).toUpperCase()
            )}
          </div>

          <span className="text-sm font-semibold text-slate-100">
            {message.senderName}
          </span>

          {agentMeta.isAgent && (
            <span
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${agentMeta.color}`}
            >
              <Bot className="h-3 w-3" />
              {agentMeta.badge}
            </span>
          )}

          <span className="text-[11px] text-slate-500">
            {formatTime(message.createdAt)}
          </span>
        </div>
      )}

      {/* Reply Context Preview */}
      {replyToMessage && (
        <div className="ml-9 mb-1.5 flex items-center gap-2 rounded border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-slate-400">
          <CornerDownRight className="h-3 w-3 text-cyan-400 shrink-0" />
          <span className="font-medium text-slate-300">{replyToMessage.senderName}:</span>
          <span className="truncate text-slate-400">{replyToMessage.content}</span>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(!agentMeta.isAgent && "ml-9")}>
        <RichMessage content={message.content} isAgent={agentMeta.isAgent} />

        {/* Reaction Badges */}
        {Object.keys(reactions).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleReaction(emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors",
                  userReactions[emoji]
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-semibold"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200"
                )}
              >
                <span>{emoji}</span>
                <span className="text-[11px]">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread Replies Trigger Pill */}
        {replyCount > 0 && onOpenThread && (
          <button
            type="button"
            onClick={() => onOpenThread(message)}
            className="mt-2.5 flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors shadow-sm"
          >
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-medium">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
            <span className="text-[11px] text-slate-400">View thread</span>
          </button>
        )}
      </div>
    </div>
  </ContextMenu>
);
}

export function MessageList({
  channelId,
  currentUserId,
  onOpenThread,
  searchQuery = "",
  agentFilter = "all",
}: MessageListProps) {
  const messages = useQuery(api.messages.listByChannel, { channelId });
  const allMessages = useQuery(api.messages.listAll, {});
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages?.length]);

  // Build lookup maps for reply resolution & thread reply counts
  const messageMap = new Map<string, Message>();
  const replyCounts = new Map<string, number>();

  if (allMessages) {
    for (const msg of allMessages) {
      messageMap.set(msg._id, msg);
      if (msg.replyTo) {
        replyCounts.set(msg.replyTo, (replyCounts.get(msg.replyTo) || 0) + 1);
      }
    }
  }

  // Filter messages based on search query and agent filter
  const filteredMessages = (messages || []).filter((msg) => {
    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchContent = msg.content.toLowerCase().includes(q);
      const matchSender = msg.senderName.toLowerCase().includes(q);
      if (!matchContent && !matchSender) return false;
    }

    // 2. Agent Filter
    if (agentFilter === "agents") {
      const isAgentSender =
        msg.senderName.includes("Seridian") ||
        msg.senderName.includes("LinearSync") ||
        msg.senderName.includes("DataPulse") ||
        msg.senderId.startsWith("bot-");
      const hasAgentMention =
        msg.content.includes("@SeridianAI") ||
        msg.content.includes("@LinearSyncBot") ||
        msg.content.includes("@DataPulse");
      if (!isAgentSender && !hasAgentMention) return false;
    }

    return true;
  });

  // Group messages by date
  const messagesByDate = new Map<string, Message[]>();
  for (const msg of filteredMessages) {
    const dateKey = new Date(msg.createdAt).toDateString();
    const group = messagesByDate.get(dateKey) ?? [];
    group.push(msg);
    messagesByDate.set(dateKey, group);
  }

  const sortedDates = Array.from(messagesByDate.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-thin flex flex-col">
      {messages === undefined ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="space-y-4 w-full max-w-md">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/[0.05]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 mb-3">
              <Sparkles className="h-6 w-6 text-cyan-400" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">
              {searchQuery || agentFilter !== "all"
                ? "No matching messages found"
                : "Welcome to the Channel"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery || agentFilter !== "all"
                ? "Try adjusting your search criteria or agent filter."
                : "Start the conversation or trigger @SeridianAI to orchestrate tasks."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {messages !== undefined && filteredMessages.length > 0 && (
        <div className="pb-4 px-1">
          {sortedDates.map((dateKey) => {
            const group = messagesByDate.get(dateKey) ?? [];
            return (
              <div key={dateKey}>
                <DateDivider date={formatDate(group[0].createdAt)} />
                {group.map((msg, idx) => {
                  const prev = group[idx - 1];
                  const showSender =
                    !prev ||
                    prev.senderId !== msg.senderId ||
                    msg.createdAt - prev.createdAt > 300_000;
                  const replyToMsg = msg.replyTo
                    ? messageMap.get(msg.replyTo)
                    : undefined;
                  const rCount = replyCounts.get(msg._id) || 0;

                  return (
                    <MessageItem
                      key={msg._id}
                      message={msg}
                      showSender={showSender}
                      replyToMessage={replyToMsg}
                      replyCount={rCount}
                      onOpenThread={onOpenThread}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
