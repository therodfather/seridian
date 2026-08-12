"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Channel = Doc<"channels">;

interface ChannelListProps {
  activeChannelId?: Id<"channels">;
  onChannelSelect: (channelId: Id<"channels">) => void;
  onCreateChannel: () => void;
  currentUserId?: string;
}

function ChannelItem({
  channel,
  isActive,
  onClick,
  onDelete,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const icon =
    channel.type === "public"
      ? "#"
      : channel.type === "private"
        ? "🔒"
        : "→";

  return (
    <div className="group flex items-center">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
          isActive
            ? "bg-white/[0.08] text-white"
            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
        )}
      >
        <span className="w-5 text-center text-xs text-slate-500 shrink-0">
          {icon}
        </span>
        <span className="truncate font-medium">{channel.name}</span>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
        aria-label={`Delete ${channel.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ChannelList({
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  currentUserId,
}: ChannelListProps) {
  const channels = useQuery(api.channels.list, {});
  const removeChannel = useMutation(api.channels.remove);

  const publicChannels = channels?.filter((c) => c.type === "public") ?? [];
  const privateChannels = channels?.filter((c) => c.type === "private") ?? [];
  const directChannels =
    channels?.filter(
      (c) => c.type === "direct" && c.participants.includes(currentUserId ?? "")
    ) ?? [];

  function handleDelete(channelId: Id<"channels">) {
    if (confirm("Delete this channel and all its messages?")) {
      removeChannel({ channelId });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Channels</h2>
        <button
          type="button"
          onClick={onCreateChannel}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.05] hover:text-slate-300 transition-colors text-xs"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {channels === undefined ? (
          <div className="space-y-1 px-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-md bg-white/[0.02]"
              />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-600">
            No channels yet
          </div>
        ) : (
          <>
            {publicChannels.length > 0 && (
              <div>
                <h3 className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                  Public
                </h3>
                <div className="space-y-0.5">
                  {publicChannels.map((channel) => (
                    <ChannelItem
                      key={channel._id}
                      channel={channel}
                      isActive={activeChannelId === channel._id}
                      onClick={() => onChannelSelect(channel._id)}
                      onDelete={() => handleDelete(channel._id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {privateChannels.length > 0 && (
              <div>
                <h3 className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                  Private
                </h3>
                <div className="space-y-0.5">
                  {privateChannels.map((channel) => (
                    <ChannelItem
                      key={channel._id}
                      channel={channel}
                      isActive={activeChannelId === channel._id}
                      onClick={() => onChannelSelect(channel._id)}
                      onDelete={() => handleDelete(channel._id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {directChannels.length > 0 && (
              <div>
                <h3 className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                  Direct Messages
                </h3>
                <div className="space-y-0.5">
                  {directChannels.map((channel) => (
                    <ChannelItem
                      key={channel._id}
                      channel={channel}
                      isActive={activeChannelId === channel._id}
                      onClick={() => onChannelSelect(channel._id)}
                      onDelete={() => handleDelete(channel._id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
