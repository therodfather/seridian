"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
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
  Users,
  Sparkles,
  Zap,
  BarChart3,
  Bot,
  Filter,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeft
} from "lucide-react";

type Message = Doc<"messages">;
type Channel = Doc<"channels">;

interface ChatLayoutProps {
  currentUserId?: string;
  currentUserName?: string;
}

export function ChatLayout({ currentUserId, currentUserName }: ChatLayoutProps) {
  const channels = useQuery(api.channels.list, {});
  const [activeChannelId, setActiveChannelId] = useState<Id<"channels"> | undefined>();
  const [mobilePanel, setMobilePanel] = useState<"channels" | "messages">("channels");
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [threadParentMessage, setThreadParentMessage] = useState<Message | null>(null);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<"all" | "agents">("all");

  // Set default active channel to the first available channel
  useEffect(() => {
    if (!activeChannelId && channels && channels.length > 0) {
      setActiveChannelId(channels[0]._id);
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
    <div className="flex h-full w-full overflow-hidden bg-[#070b14]">
      {/* Left Sidebar — Channels & AI Bots */}
      <div
        className={cn(
          "flex h-full flex-col border-r border-white/[0.08] bg-[#0c1222] transition-all duration-200 shrink-0",
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

      {/* Main Container — Chat Header, Message List, Input */}
      <div
        className={cn(
          "flex h-full flex-1 flex-col min-w-0 bg-[#070b14]",
          mobilePanel !== "messages" && "hidden md:flex"
        )}
      >
        {activeChannelId ? (
          <>
            {/* Enterprise Header Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#080d1a] px-4 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobilePanel("channels")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors md:hidden"
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

              {/* Controls: Search, Agent Filter Toggle, User Panel Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Search Bar */}
                <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0d1424] px-2.5 py-1 text-xs text-slate-300 focus-within:border-cyan-500/40">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chat..."
                    className="w-28 lg:w-40 bg-transparent placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                {/* Agent Filter Button */}
                <button
                  type="button"
                  onClick={() => setAgentFilter(agentFilter === "all" ? "agents" : "all")}
                  className={cn(
                    "flex h-7 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-all",
                    agentFilter === "agents"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                  )}
                  title="Filter AI Agent Messages"
                >
                  <Bot className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="hidden md:inline">
                    {agentFilter === "agents" ? "Agents Only" : "All Messages"}
                  </span>
                </button>

                {/* User Panel Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowUserPanel(!showUserPanel)}
                  className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Toggle Team Panel"
                >
                  {showUserPanel ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Message List */}
            <MessageList
              channelId={activeChannelId}
              currentUserId={currentUserId}
              onOpenThread={(msg) => setThreadParentMessage(msg)}
              searchQuery={searchQuery}
              agentFilter={agentFilter}
            />

            {/* Message Input */}
            <MessageInput
              channelId={activeChannelId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-slate-500 text-sm">
            <Bot className="h-10 w-10 text-slate-600 mb-2" />
            <p>Select or create a channel to start enterprise agent collaboration.</p>
          </div>
        )}
      </div>

      {/* Slide-over Thread Drawer */}
      {threadParentMessage && (
        <ThreadDrawer
          parentMessage={threadParentMessage}
          onClose={() => setThreadParentMessage(null)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {/* Sidebar — Users Panel (desktop) */}
      {showUserPanel && (
        <div className="hidden md:flex h-full w-[240px] min-w-[240px] flex-col border-l border-white/[0.08] bg-[#0c1222]">
          <UserPanel currentUserId={currentUserId} />
        </div>
      )}

      {/* Channel creation modal */}
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
