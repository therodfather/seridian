"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";

export default function ChatPage() {
  const { user, loading } = useDashboardAuth();

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-seridian-500 border-t-transparent" />
          <p className="text-xs text-slate-500">Loading chat session…</p>
        </div>
      </div>
    );
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
