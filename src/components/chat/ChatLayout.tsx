"use client";

import { useState, useEffect } from "react";
import { useQuery, useConvexConnectionState } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ChannelList } from "./ChannelList";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { UserPanel } from "./UserPanel";
import { ChannelForm } from "./ChannelForm";
import { ThreadDrawer } from "./ThreadDrawer";
import {
  Hash,
  Lock,
  MessageSquare,
  Search,
  Sparkles,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeft,
  WifiOff,
  RefreshCw,
} from "lucide-react";

type Message = Doc<"messages">;

interface ChatLayoutProps {
  currentUserId?: string;
  currentUserName?: string;
}

function useChatConnectionStatus(): "connected" | "reconnecting" | "disconnected" {
  let state: ReturnType<typeof useConvexConnectionState> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    state = useConvexConnectionState();
  } catch {
    return "disconnected";
  }

  if (state?.isWebSocketConnected) return "connected";
  if (state?.hasEverConnected) return "reconnecting";
  return "disconnected";
}

export function ChatLayout({ currentUserId, currentUserName }: ChatLayoutProps) {
  const channels = useQuery(api.channels.list, {});
  const connectionStatus = useChatConnectionStatus();
  const [activeChannelId, setActiveChannelId] = useState<Id<"channels"> | undefined>();
  const [mobilePanel, setMobilePanel] = useState<"channels" | "messages">("channels");
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [threadParentMessage, setThreadParentMessage] = useState<Message | null>(null);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<"all" | "agents">("all");

  const channelsLoading = channels === undefined;
  const messagingPaused = connectionStatus !== "connected";

  useEffect(() => {
    if (!activeChannelId && channels && channels.length > 0) {
      setActiveChannelId(channels[0]._id);
    }
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (
      activeChannelId &&
      channels &&
      !channels.some((c) => c._id === activeChannelId)
    ) {
      setActiveChannelId(channels[0]?._id);
      setThreadParentMessage(null);
    }
  }, [channels, activeChannelId]);

  const activeChannel = channels?.find((c) => c._id === activeChannelId);

  function handleChannelSelect(channelId: Id<"channels">) {
    setActiveChannelId(channelId);
    setMobilePanel("messages");
    setThreadParentMessage(null);
  }

  const ChannelIcon =
    activeChannel?.type === "public"
      ? Hash
      : activeChannel?.type === "private"
        ? Lock
        : MessageSquare;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#070b14]">
      <div
        className={cn(
          "flex h-full min-h-0 flex-col border-r border-white/[0.08] bg-[#0c1222] transition-all duration-200 shrink-0",
          "w-full md:w-[240px] md:min-w-[240px]",
          mobilePanel !== "channels" && "hidden md:flex"
        )}
      >
        <ChannelList
          activeChannelId={activeChannelId}
          onChannelSelect={handleChannelSelect}
          onCreateChannel={() => setChannelFormOpen(true)}
          currentUserId={currentUserId}
        />
      </div>

      <div
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col min-w-0 bg-[#070b14]",
          mobilePanel !== "messages" && "hidden md:flex"
        )}
      >
        {messagingPaused && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-xs",
              connectionStatus === "reconnecting"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                : "border-red-500/30 bg-red-500/10 text-red-200",
            )}
            role="status"
            aria-live="polite"
          >
            <span className="flex items-center gap-2 min-w-0">
              {connectionStatus === "reconnecting" ? (
                <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">
                {connectionStatus === "reconnecting"
                  ? "Reconnecting to chat…"
                  : "Chat disconnected. Check your connection — messages pause until Convex reconnects."}
              </span>
            </span>
          </div>
        )}

        {channelsLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading channels…</p>
          </div>
        ) : activeChannelId ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#080d1a] px-4 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobilePanel("channels")}
                  aria-label="Back to channels"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-sm">
                  <ChannelIcon className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-100 truncate">
                      {activeChannel?.name || "Channel"}
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.2 text-[10.5px] font-semibold text-cyan-300">
                      <Sparkles className="h-2.5 w-2.5" /> 3 AI Agents Online
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeChannel?.description || "Enterprise workspace & automated agent triggers"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Search Bar */}
                <div className="hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0d1424] px-2.5 py-1 text-xs text-slate-300 focus-within:border-cyan-500/40 sm:flex">
                  <Search className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chat..."
                    aria-label="Search chat"
                    className="w-28 bg-transparent placeholder:text-slate-500 focus:outline-none lg:w-40"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setAgentFilter(agentFilter === "all" ? "agents" : "all")}
                  className={cn(
                    "flex h-7 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
                    agentFilter === "agents"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                  )}
                  aria-label="Filter AI agent messages"
                  aria-pressed={agentFilter === "agents"}
                >
                  <Bot className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="hidden md:inline">
                    {agentFilter === "agents" ? "Agents Only" : "All Messages"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUserPanel(!showUserPanel)}
                  className="hidden h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 md:flex"
                  aria-label={showUserPanel ? "Hide team panel" : "Show team panel"}
                >
                  {showUserPanel ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <MessageList
              channelId={activeChannelId}
              currentUserId={currentUserId}
              onOpenThread={(msg) => setThreadParentMessage(msg)}
              searchQuery={searchQuery}
              agentFilter={agentFilter}
            />

            <MessageInput
              channelId={activeChannelId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              disabled={messagingPaused}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <Bot className="mb-2 h-10 w-10 text-slate-600" aria-hidden="true" />
            <p className="text-sm text-slate-500">Select or create a channel to start enterprise agent collaboration.</p>
            <button
              type="button"
              onClick={() => setChannelFormOpen(true)}
              className="mt-4 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            >
              Create a channel
            </button>
          </div>
        )}
      </div>

      {threadParentMessage && (
        <ThreadDrawer
          parentMessage={threadParentMessage}
          onClose={() => setThreadParentMessage(null)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          messagingPaused={messagingPaused}
        />
      )}

      {showUserPanel && (
        <div className="hidden md:flex h-full min-h-0 w-[240px] min-w-[240px] flex-col border-l border-white/[0.08] bg-[#0c1222]">
          <UserPanel currentUserId={currentUserId} />
        </div>
      )}

      <ChannelForm
        open={channelFormOpen}
        onOpenChange={setChannelFormOpen}
        currentUserId={currentUserId}
        onSuccess={(channelId) => {
          setChannelFormOpen(false);
          handleChannelSelect(channelId);
        }}
      />
    </div>
  );
}
