import type { LucideIcon } from "lucide-react";
import {
  Home,
  CheckCircle,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Mail,
  Folder,
  RefreshCw,
  MessageSquare,
  Settings,
  BookOpen,
  Bot,
  Brain,
} from "lucide-react";

export type NavGroup = "core" | "business" | "knowledge" | "tools";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home, group: "core" },
  { href: "/dashboard/issues", label: "Issues", icon: CheckCircle, group: "core" },
  { href: "/dashboard/clients", label: "Clients", icon: Users, group: "core" },
  { href: "/dashboard/bookings", label: "Bookings", icon: Calendar, group: "business" },
  { href: "/dashboard/sales", label: "Sales", icon: DollarSign, group: "business" },
  { href: "/dashboard/proposals", label: "Proposals", icon: FileText, group: "business" },
  { href: "/dashboard/wiki", label: "Wiki", icon: BookOpen, group: "knowledge" },
  { href: "/dashboard/arena", label: "LLM Arena", icon: Bot, group: "knowledge" },
  { href: "/dashboard/brain", label: "Second Brain", icon: Brain, group: "knowledge" },
  { href: "/dashboard/templates", label: "Templates", icon: Mail, group: "tools" },
  { href: "/dashboard/files", label: "Files", icon: Folder, group: "tools" },
  { href: "/dashboard/sync", label: "Sync", icon: RefreshCw, group: "tools" },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare, group: "tools" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, group: "tools" },
];

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  core: "Core",
  business: "Business",
  knowledge: "Knowledge",
  tools: "Tools",
};

export const DASHBOARD_ROUTE_NAMES: Record<string, string> = {
  overview: "Overview",
  issues: "Issues",
  clients: "Clients",
  bookings: "Bookings",
  sales: "Sales",
  proposals: "Proposals",
  wiki: "Wiki",
  arena: "LLM Arena",
  brain: "Second Brain",
  templates: "Templates",
  files: "Files",
  chat: "Chat",
  sync: "Sync",
  settings: "Settings",
};

export const KNOWLEDGE_NAV_HREFS = [
  "/dashboard/wiki",
  "/dashboard/arena",
  "/dashboard/brain",
] as const;

export function navSlug(href: string): string {
  return href.replace("/dashboard", "").replace(/^\//, "") || "overview";
}

export function entityHref(
  group: "clients" | "issues" | "proposals",
  id: string,
): string {
  return `/dashboard/${group}/${id}`;
}

export const NUMBER_KEY_NAV = DASHBOARD_NAV.slice(0, 9).map((item, index) => ({
  key: String(index + 1),
  href: item.href,
  label: item.label,
  slug: navSlug(item.href),
}));

export function newItemHref(section: string): string {
  const match = DASHBOARD_NAV.find((item) => navSlug(item.href) === section);
  return match?.href ?? "/dashboard";
}
