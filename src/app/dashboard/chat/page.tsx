"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { Skeleton } from "@bytecats/ui-kit";

function ChatSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <div className="hidden w-[240px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0c1222] p-3 md:flex">
        <Skeleton className="mb-4 h-5 w-24 bg-white/10" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md bg-white/5" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-lg bg-cyan-500/20" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-3 w-48 bg-white/10" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28 bg-white/10" />
                <Skeleton className="h-4 w-full max-w-md bg-white/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.08] p-3">
          <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, loading } = useDashboardAuth();

  if (loading) {
    return <ChatSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm text-slate-400">
          Sign in required to use dashboard chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ChatLayout currentUserId={user.pubkey} currentUserName={user.name} />
    </div>
  );
}
