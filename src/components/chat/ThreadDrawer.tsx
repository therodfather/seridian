"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { X, MessageSquare, Sparkles, Bot, Zap, BarChart3 } from "lucide-react";
import { MessageInput } from "./MessageInput";
import { RichMessage } from "./RichMessage";

type Message = Doc<"messages">;

interface ThreadDrawerProps {
  parentMessage: Message | null;
  onClose: () => void;
  currentUserId?: string;
  currentUserName?: string;
  messagingPaused?: boolean;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getAgentInfo(senderName: string, senderId: string) {
  if (senderName.includes("SeridianAI") || senderId === "bot-seridian") {
    return {
      isAgent: true,
      name: "Seridian AI",
      badge: "Architect Agent",
      icon: Sparkles,
      color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
      avatarBg: "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40",
    };
  }
  if (senderName.includes("LinearSync") || senderId === "bot-linearsync") {
    return {
      isAgent: true,
      name: "LinearSyncBot",
      badge: "Sprint Sync",
      icon: Zap,
      color: "text-purple-400 border-purple-500/40 bg-purple-500/10",
      avatarBg: "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40",
    };
  }
  if (senderName.includes("DataPulse") || senderId === "bot-datapulse") {
    return {
      isAgent: true,
      name: "DataPulse",
      badge: "Analytics Bot",
      icon: BarChart3,
      color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
      avatarBg: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40",
    };
  }
  return { isAgent: false };
}

export function ThreadDrawer({
  parentMessage,
  onClose,
  currentUserId,
  currentUserName,
  messagingPaused = false,
}: ThreadDrawerProps) {
  const allMessages = useQuery(api.messages.listAll, {});

  if (!parentMessage) return null;

  const agentMeta = getAgentInfo(parentMessage.senderName, parentMessage.senderId);
  const repliesLoading = allMessages === undefined;

  // Filter replies to parent message
  const replies =
    allMessages?.filter((m) => m.replyTo === parentMessage._id).sort((a, b) => a.createdAt - b.createdAt) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col border-white/[0.08] bg-[#0c1222] md:relative md:inset-auto md:z-auto md:h-full md:w-[360px] md:min-w-[320px] md:max-w-[420px] md:border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-[#080d1a]">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-seridian-400" />
          <h3 className="text-sm font-semibold text-white">Thread</h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Parent Message Card */}
        <div className="rounded-xl border border-white/10 bg-[#070b14] p-3.5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  agentMeta.isAgent
                    ? agentMeta.avatarBg
                    : "bg-seridian-500/10 text-seridian-400"
                }`}
              >
                {agentMeta.isAgent && agentMeta.icon ? (
                  <agentMeta.icon className="h-3.5 w-3.5" />
                ) : (
                  parentMessage.senderName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-sm font-medium text-slate-100">
                {parentMessage.senderName}
              </span>
              {agentMeta.isAgent && (
                <span
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${agentMeta.color}`}
                >
                  <Bot className="h-2.5 w-2.5" />
                  {agentMeta.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500">
              {formatTime(parentMessage.createdAt)}
            </span>
          </div>

          <RichMessage content={parentMessage.content} isAgent={agentMeta.isAgent} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Replies
          </span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Replies List */}
        {repliesLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading replies…
          </div>
        ) : replies.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            No replies yet. Send a reply below to start the thread.
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => {
              const replyAgent = getAgentInfo(reply.senderName, reply.senderId);
              return (
                <div
                  key={reply._id}
                  className="rounded-lg border border-white/[0.06] bg-[#080e1d] p-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                          replyAgent.isAgent
                            ? replyAgent.avatarBg
                            : "bg-seridian-500/10 text-seridian-400"
                        }`}
                      >
                        {replyAgent.isAgent && replyAgent.icon ? (
                          <replyAgent.icon className="h-3 w-3" />
                        ) : (
                          reply.senderName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-200">
                        {reply.senderName}
                      </span>
                      {replyAgent.isAgent && (
                        <span
                          className={`inline-flex items-center gap-0.5 rounded border px-1 py-0.2 text-[9px] font-semibold ${replyAgent.color}`}
                        >
                          <Bot className="h-2 w-2" />
                          AI
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>
                  <RichMessage content={reply.content} isAgent={replyAgent.isAgent} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Input */}
      <div className="border-t border-white/[0.08] bg-[#080d1a] p-2">
        <MessageInput
          channelId={parentMessage.channelId}
          replyTo={parentMessage._id}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          placeholder="Reply in thread..."
          disabled={messagingPaused}
        />
      </div>
    </div>
  );
}
