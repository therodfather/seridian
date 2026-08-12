import {
  CheckCircle,
  CheckSquare,
  DollarSign,
  ArrowRight,
  Calendar,
  Send,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type ActivityType =
  | "issue_created"
  | "issue_updated"
  | "deal_created"
  | "deal_stage_changed"
  | "booking_created"
  | "proposal_created"
  | "proposal_sent"
  | "client_added";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: number;
  user?: string;
  entityId?: string;
  entityType?: string;
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(date: Date): string {
  const now = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = now.getTime() - target.getTime();

  if (diff < DAY_MS) return "Today";
  if (diff < 2 * DAY_MS) return "Yesterday";
  if (diff < 7 * DAY_MS) return "Earlier this week";

  const date2 = new Date(date);
  return date2.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return formatDateLabel(new Date(timestamp));
}

export function groupByDate(activities: Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>();
  for (const activity of activities.sort((a, b) => b.timestamp - a.timestamp)) {
    const label = formatDateLabel(new Date(activity.timestamp));
    const group = groups.get(label) ?? [];
    group.push(activity);
    groups.set(label, group);
  }
  return groups;
}

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  issue_created: CheckCircle,
  issue_updated: CheckSquare,
  deal_created: DollarSign,
  deal_stage_changed: ArrowRight,
  booking_created: Calendar,
  proposal_created: Send,
  proposal_sent: Send,
  client_added: UserPlus,
};

export function getActivityIcon(type: ActivityType): LucideIcon {
  return ACTIVITY_ICONS[type] ?? CheckCircle;
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  issue_created: "text-blue-400 bg-blue-500/10",
  issue_updated: "text-amber-400 bg-amber-500/10",
  deal_created: "text-emerald-400 bg-emerald-500/10",
  deal_stage_changed: "text-violet-400 bg-violet-500/10",
  booking_created: "text-cyan-400 bg-cyan-500/10",
  proposal_created: "text-orange-400 bg-orange-500/10",
  proposal_sent: "text-orange-400 bg-orange-500/10",
  client_added: "text-pink-400 bg-pink-500/10",
};

export function getActivityColor(type: ActivityType): string {
  return ACTIVITY_COLORS[type] ?? "text-slate-400 bg-slate-500/10";
}
