"use client";

import { useState, useEffect } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";

function getStoredUser() {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("seridian_user");
  if (stored) {
    try { return JSON.parse(stored); } catch { return null; }
  }
  return null;
}

export default function ChatPage() {
  const [user, setUser] = useState<{ pubkey: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  if (loading) return null;
  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Please sign in to access chat.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatLayout currentUserId={user.pubkey} currentUserName={user.name} />
    </div>
  );
}
