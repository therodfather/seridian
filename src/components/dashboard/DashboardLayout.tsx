"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { cn } from "@/lib/utils";
import { useStableQuery } from "@/hooks/useConvexQuery";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "@/components/ui/MobileNav";
import { SearchCommand } from "@/components/ui/SearchCommand";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { StatusIndicator } from "./StatusIndicator";
import { NotificationBell } from "./NotificationBell";
import { DASHBOARD_ROUTE_NAMES } from "@/lib/dashboardNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/** Number keys 1-9 map to these section slugs in order. */
const sectionByNumber: Record<string, string> = {
  "1": "overview",
  "2": "issues",
  "3": "clients",
  "4": "bookings",
  "5": "sales",
  "6": "proposals",
  "7": "templates",
  "8": "files",
  "9": "chat",
};

/** Context-aware "new item" routes per section. */
const newRoutes: Record<string, string> = {
  overview: "/dashboard/issues",
  issues: "/dashboard/issues",
  clients: "/dashboard/clients",
  bookings: "/dashboard/bookings",
  sales: "/dashboard/sales",
  proposals: "/dashboard/proposals",
  templates: "/dashboard/templates",
  files: "/dashboard/files",
  chat: "/dashboard/chat",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const clients = useStableQuery<any[]>(api.clients.list, {});
  const issues = useStableQuery<any[]>(api.issues.list, {});
  const deals = useStableQuery<any[]>(api.deals.list, {});

  const segments = pathname.split("/").filter(Boolean);
  const currentSection = segments[1] || "overview";
  const pageName = DASHBOARD_ROUTE_NAMES[currentSection] || currentSection;

  const activeClients = clients?.filter((c) => c.status === "active").length ?? 0;
  const openIssues = issues?.filter((i) => i.status !== "done").length ?? 0;
  const pipelineValue = deals?.reduce((sum, d) => sum + (d.value || 0), 0) ?? 0;

  // Navigation via number keys — only fires when no input is focused
  const handleNumberNav = useCallback(
    (key: string) => {
      const section = sectionByNumber[key];
      if (section) router.push(`/dashboard${section === "overview" ? "" : `/${section}`}`);
    },
    [router],
  );

  // Context-aware new-item action
  const handleNewItem = useCallback(() => {
    const target = newRoutes[currentSection] || "/dashboard";
    router.push(target);
    // Dispatch event so section components can open their form
    window.dispatchEvent(new CustomEvent("seridian:new-item", { detail: { section: currentSection } }));
  }, [currentSection, router]);

  // Close any open modal on Escape
  const handleEscape = useCallback(() => {
    if (shortcutsOpen) setShortcutsOpen(false);
    else if (searchOpen) setSearchOpen(false);
    else if (mobileNavOpen) setMobileNavOpen(false);
  }, [shortcutsOpen, searchOpen, mobileNavOpen]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        // Cmd+K — open search
        { key: "k", ctrl: true, action: () => setSearchOpen(true), description: "Open search", category: "Navigation" },
        // Cmd+/ — toggle shortcuts dialog
        { key: "/", ctrl: true, action: () => setShortcutsOpen((o) => !o), description: "Keyboard shortcuts", category: "Navigation" },
        // Cmd+N — context-aware new item
        { key: "n", ctrl: true, action: handleNewItem, description: "New item", category: "Actions" },
        // Escape — close topmost open panel
        { key: "Escape", action: handleEscape, description: "Close dialog", category: "General" },
        // ? — show shortcuts (no modifier, only when no input is focused)
        { key: "?", action: () => setShortcutsOpen(true), description: "Show shortcuts", category: "General" },
        // 1-9 — quick navigate to sections
        ...Object.entries(sectionByNumber).map(([key, section]) => ({
          key,
          action: () => handleNumberNav(key),
          description: `Go to ${DASHBOARD_ROUTE_NAMES[section]}`,
          category: "Navigation",
        })),
      ],
      [handleEscape, handleNewItem, handleNumberNav],
    ),
  );

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-seridian-500 focus:text-white"
      >
        Skip to content
      </a>
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />
        </div>

        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <main
          id="main-content"
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-[240px]",
          )}
        >
          <div
            role="banner"
            className="flex items-center border-b border-white/5 px-4 py-3 lg:hidden sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seridian-500"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-3 text-sm font-medium text-white">{pageName}</span>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
            {children}
          </div>
        </main>
      </div>

      <footer
        role="contentinfo"
        className={cn(
          "flex items-center justify-between border-t border-white/[0.06] bg-[#0c1222] px-4 py-2 text-xs text-slate-500 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-[240px]",
        )}>
        <div className="flex items-center gap-4">
          <span>{pageName}</span>
          <span className="text-white/10">|</span>
          <span>{activeClients} active clients</span>
          <span className="text-white/10">|</span>
          <span>{openIssues} open issues</span>
          <span className="text-white/10">|</span>
          <span>${pipelineValue.toLocaleString()} pipeline</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator />
          <NotificationBell />
          <span className="text-white/10">|</span>
          <span>Seridian v0.1.0</span>
        </div>
      </footer>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
