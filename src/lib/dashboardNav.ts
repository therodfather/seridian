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
  Briefcase,
  Library,
} from "lucide-react";
import { ROUTES, type DashboardRoute } from "./routes";

export type NavGroup = "primary";

export interface DashboardNavItem {
  href: DashboardRoute;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  /** Child paths that should light this hub link in the sidebar. */
  activeFor?: readonly string[];
}

const d = ROUTES.dashboard;

/**
 * Calm primary sidebar — hubs + daily work only.
 * Nested pages live under Business / Knowledge hubs (or Overview / Settings).
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: d.root, label: "Overview", icon: Home, group: "primary" },
  { href: d.issues, label: "Work", icon: CheckCircle, group: "primary" },
  {
    href: d.business,
    label: "Business",
    icon: Briefcase,
    group: "primary",
    activeFor: [
      d.clients,
      d.bookings,
      d.sales,
      d.proposals,
      d.contracts,
      d.healthCheck,
    ],
  },
  {
    href: d.knowledge,
    label: "Knowledge",
    icon: Library,
    group: "primary",
    activeFor: [d.wiki, d.brain, d.files, d.templates, d.arena, d.chat],
  },
  { href: d.ivr, label: "Voice", icon: PhoneCall, group: "primary" },
  { href: d.settings, label: "Settings", icon: Settings, group: "primary" },
];

/** Nested destinations reachable from hubs / Overview — not top-level sidebar. */
export const DASHBOARD_NESTED_NAV: DashboardNavItem[] = [
  { href: d.clients, label: "Clients", icon: Users, group: "primary" },
  { href: d.bookings, label: "Bookings", icon: Calendar, group: "primary" },
  { href: d.sales, label: "Sales", icon: DollarSign, group: "primary" },
  { href: d.proposals, label: "Proposals", icon: FileText, group: "primary" },
  { href: d.contracts, label: "Contracts", icon: PenLine, group: "primary" },
  {
    href: d.healthCheck,
    label: "Health Check",
    icon: ClipboardCheck,
    group: "primary",
  },
  { href: d.wiki, label: "Wiki", icon: BookOpen, group: "primary" },
  { href: d.brain, label: "Second Brain", icon: Brain, group: "primary" },
  { href: d.files, label: "Files", icon: Folder, group: "primary" },
  { href: d.templates, label: "Templates", icon: Mail, group: "primary" },
  { href: d.arena, label: "LLM Arena", icon: Bot, group: "primary" },
  { href: d.chat, label: "Chat", icon: MessageSquare, group: "primary" },
];

/** Command palette + search: primary hubs + nested pages. */
export const DASHBOARD_SEARCH_NAV: DashboardNavItem[] = [
  ...DASHBOARD_NAV,
  ...DASHBOARD_NESTED_NAV,
];

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  primary: "Navigate",
};

export const DASHBOARD_ROUTE_NAMES: Record<string, string> = {
  overview: "Overview",
  business: "Business",
  knowledge: "Knowledge",
  issues: "Work",
  clients: "Clients",
  bookings: "Bookings",
  sales: "Sales",
  proposals: "Proposals",
  contracts: "Contracts",
  ivr: "Voice",
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

export const BUSINESS_HUB_LINKS = [
  {
    href: d.clients,
    label: "Clients",
    description: "Companies and contacts you work with",
  },
  {
    href: d.sales,
    label: "Sales",
    description: "Pipeline deals and stages",
  },
  {
    href: d.proposals,
    label: "Proposals",
    description: "Scopes and pricing for clients",
  },
  {
    href: d.contracts,
    label: "Contracts",
    description: "Agreements and signatures",
  },
  {
    href: d.bookings,
    label: "Bookings",
    description: "Meetings and demos",
  },
  {
    href: d.healthCheck,
    label: "Health Check",
    description: "One-page infrastructure report",
  },
] as const;

export const KNOWLEDGE_HUB_LINKS = [
  {
    href: d.wiki,
    label: "Wiki",
    description: "Company docs and SOPs",
  },
  {
    href: d.brain,
    label: "Second Brain",
    description: "Memory banks and retained facts",
  },
  {
    href: d.files,
    label: "Files",
    description: "Uploaded documents",
  },
  {
    href: d.templates,
    label: "Templates",
    description: "Reusable email and content templates",
  },
  {
    href: d.arena,
    label: "LLM Arena",
    description: "Compare models side by side",
  },
  {
    href: d.chat,
    label: "Chat",
    description: "Team channels",
  },
] as const;

export const KNOWLEDGE_NAV_HREFS = [
  d.knowledge,
  d.wiki,
  d.arena,
  d.brain,
] as const satisfies readonly DashboardRoute[];

export function navSlug(href: string): string {
  return href.replace(ROUTES.dashboard.root, "").replace(/^\//, "") || "overview";
}

export function isNavItemActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.href === ROUTES.dashboard.root) {
    return pathname === ROUTES.dashboard.root;
  }
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  return (item.activeFor ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function entityHref(
  group: "clients" | "issues" | "proposals" | "contracts",
  id: string,
): string {
  return `${ROUTES.dashboard.root}/${group}/${id}`;
}

/**
 * The 9 highest-priority destinations for number-key shortcuts (1-9) —
 * independent of the hub sidebar's 6 top-level entries, since hubs alone
 * don't leave room for quick access to daily-work pages. Labels here are
 * shortcut-legend labels, not necessarily the hub's sidebar label (e.g.
 * "Issues" here vs. the "Work" hub).
 */
const NUMBER_KEY_PRIORITY: ReadonlyArray<{ href: DashboardRoute; label: string }> = [
  { href: d.root, label: "Overview" },
  { href: d.issues, label: "Issues" },
  { href: d.clients, label: "Clients" },
  { href: d.bookings, label: "Bookings" },
  { href: d.sales, label: "Sales" },
  { href: d.proposals, label: "Proposals" },
  { href: d.contracts, label: "Contracts" },
  { href: d.wiki, label: "Wiki" },
  { href: d.arena, label: "LLM Arena" },
];

export const NUMBER_KEY_NAV = NUMBER_KEY_PRIORITY.map((item, index) => ({
  key: String(index + 1),
  href: item.href,
  label: item.label,
  slug: navSlug(item.href),
}));

export function newItemHref(section: string): string {
  const fromPrimary = DASHBOARD_NAV.find((item) => navSlug(item.href) === section);
  if (fromPrimary) return fromPrimary.href;
  const fromNested = DASHBOARD_NESTED_NAV.find(
    (item) => navSlug(item.href) === section,
  );
  return fromNested?.href ?? ROUTES.dashboard.root;
}
