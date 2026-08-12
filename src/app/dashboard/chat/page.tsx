"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";

export default function ChatPage() {
  const { user } = useDashboardAuth();

  if (!user) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatLayout currentUserId={user.pubkey} currentUserName={user.name} />
    </div>
  );
}
