import type { LucideIcon } from "lucide-react";
import {
  Home,
  CheckCircle,
  Users,
  Calendar,
  DollarSign,
  FileText,
  PenLine,
  ClipboardCheck,
  Mail,
  Folder,
  MessageSquare,
  Settings,
  BookOpen,
  Bot,
  Brain,
  PhoneCall,
} from "lucide-react";
import { ROUTES, type DashboardRoute } from "./routes";

export type NavGroup = "core" | "business" | "knowledge" | "tools";

export interface DashboardNavItem {
  href: DashboardRoute;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
}

const d = ROUTES.dashboard;

/** Sync lives under Settings → Integrations & Sync (not a sidebar tab). */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: d.root, label: "Overview", icon: Home, group: "core" },
  { href: d.issues, label: "Issues", icon: CheckCircle, group: "core" },
  { href: d.clients, label: "Clients", icon: Users, group: "core" },
  { href: d.bookings, label: "Bookings", icon: Calendar, group: "business" },
  { href: d.sales, label: "Sales", icon: DollarSign, group: "business" },
  { href: d.proposals, label: "Proposals", icon: FileText, group: "business" },
  { href: d.contracts, label: "Contracts", icon: PenLine, group: "business" },
  { href: d.wiki, label: "Wiki", icon: BookOpen, group: "knowledge" },
  { href: d.arena, label: "LLM Arena", icon: Bot, group: "knowledge" },
  { href: d.brain, label: "Second Brain", icon: Brain, group: "knowledge" },
  { href: d.templates, label: "Templates", icon: Mail, group: "tools" },
  { href: d.files, label: "Files", icon: Folder, group: "tools" },
  { href: d.chat, label: "Chat", icon: MessageSquare, group: "tools" },
  { href: d.settings, label: "Settings", icon: Settings, group: "tools" },
  // Appended so NUMBER_KEY_NAV (first 9) keeps Wiki / Arena on 8–9.
  { href: d.healthCheck, label: "Health Check", icon: ClipboardCheck, group: "business" },
  { href: d.ivr, label: "IVR / Voice", icon: PhoneCall, group: "business" },
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
  contracts: "Contracts",
  ivr: "IVR / Voice",
  "health-check": "Health Check",
  wiki: "Wiki",
  arena: "LLM Arena",
  brain: "Second Brain",
  templates: "Templates",
  files: "Files",
  chat: "Chat",
  settings: "Settings",
};

/** Redirect-only dashboard paths that must not appear in the sidebar. */
export const DASHBOARD_REDIRECT_ONLY_HREFS = [d.sync] as const;

export const KNOWLEDGE_NAV_HREFS = [
  d.wiki,
  d.arena,
  d.brain,
] as const satisfies readonly DashboardRoute[];

export function navSlug(href: string): string {
  return href.replace(ROUTES.dashboard.root, "").replace(/^\//, "") || "overview";
}

export function entityHref(
  group: "clients" | "issues" | "proposals" | "contracts",
  id: string,
): string {
  return `${ROUTES.dashboard.root}/${group}/${id}`;
}

export const NUMBER_KEY_NAV = DASHBOARD_NAV.slice(0, 9).map((item, index) => ({
  key: String(index + 1),
  href: item.href,
  label: item.label,
  slug: navSlug(item.href),
}));

export function newItemHref(section: string): string {
  const match = DASHBOARD_NAV.find((item) => navSlug(item.href) === section);
  return match?.href ?? ROUTES.dashboard.root;
}
