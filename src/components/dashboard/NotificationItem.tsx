"use client";

import { useNotifications, type Notification, type NotificationType } from "./NotificationProvider";

const iconConfig: Record<NotificationType, { color: string; path: string }> = {
  info: {
    color: "text-blue-400",
    path: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  },
  success: {
    color: "text-emerald-400",
    path: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    color: "text-amber-400",
    path: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
  error: {
    color: "text-red-400",
    path: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
  },
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { markRead, removeNotification } = useNotifications();
  const config = iconConfig[notification.type];

  function handleClick() {
    if (!notification.read) markRead(notification.id);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    removeNotification(notification.id);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${
        !notification.read ? "bg-seridian-500/[0.04]" : ""
      }`}
      role="menuitem"
    >
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={config.path} />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-tight ${notification.read ? "text-slate-400" : "text-white"}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-seridian-400" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{notification.message}</p>
        <p className="mt-1 text-[10px] text-slate-600">{timeAgo(notification.createdAt)}</p>
      </div>

      <button
        type="button"
        onClick={handleClear}
        className="shrink-0 rounded p-0.5 text-slate-600 opacity-0 transition-all hover:bg-white/10 hover:text-slate-400 group-hover:opacity-100"
        aria-label={`Dismiss notification: ${notification.title}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </button>
  );
}
