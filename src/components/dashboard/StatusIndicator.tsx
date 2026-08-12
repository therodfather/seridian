"use client";

import { useState, useEffect } from "react";
import { useConvexConnectionState } from "convex/react";

type StatusState = "connected" | "reconnecting" | "disconnected";

const statusConfig: Record<StatusState, { color: string; label: string; pulse: boolean }> = {
  connected: { color: "bg-emerald-500", label: "Convex connected", pulse: false },
  reconnecting: { color: "bg-amber-400", label: "Reconnecting", pulse: true },
  disconnected: { color: "bg-red-500", label: "Disconnected", pulse: true },
};

export function StatusIndicator() {
  let state: ReturnType<typeof useConvexConnectionState> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    state = useConvexConnectionState();
  } catch {
    // If Convex is blocked (e.g. Firefox NS_ERROR_CONTENT_BLOCKED from tracking protection/adblockers)
    // or provider is unmounted, fallback to disconnected state safely.
  }

  const [flash, setFlash] = useState(false);

  const statusState: StatusState =
    state?.isWebSocketConnected
      ? "connected"
      : state?.hasEverConnected
        ? "reconnecting"
        : "disconnected";

  const config = statusConfig[statusState];

  useEffect(() => {
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [statusState]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500" role="status" aria-label={config.label}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.color}`} />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-500 ${config.color} ${
            flash ? "scale-150" : "scale-100"
          }`}
          style={{ transition: "transform 0.3s ease-out, background-color 0.5s ease" }}
        />
      </span>
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}
