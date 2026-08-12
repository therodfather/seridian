"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import { useDashboardAuth } from "./DashboardGuard";
import {
  DASHBOARD_ROUTE_NAMES,
  NUMBER_KEY_NAV,
  newItemHref,
} from "@/lib/dashboardNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, handleLogout } = useDashboardAuth();

  const clients = useStableQuery<any[]>(api.clients.list, {});
  const issues = useStableQuery<any[]>(api.issues.list, {});
  const deals = useStableQuery<any[]>(api.deals.list, {});

  const segments = pathname.split("/").filter(Boolean);
  const currentSection = segments[1] || "overview";
  const pageName = DASHBOARD_ROUTE_NAMES[currentSection] || currentSection;
  // Chat and Arena need a full-bleed flex column above the status bar — the
  // shared max-w-6xl + padding wrapper breaks flex-1 / min-h-0 height.
  const isFullBleedRoute =
    pathname === "/dashboard/chat" ||
    pathname.startsWith("/dashboard/chat/") ||
    pathname === "/dashboard/arena" ||
    pathname.startsWith("/dashboard/arena/");
  // Wiki, Second Brain, Templates, and the Issues kanban board keep normal
  // padding/scroll but still outgrow the max-w-6xl reading width.
  const isWideRoute = ["wiki", "brain", "templates", "issues"].includes(
    currentSection,
  );

  const activeClients = clients?.filter((c) => c.status === "active").length ?? 0;
  const openIssues = issues?.filter((i) => i.status !== "done").length ?? 0;
  const pipelineValue = deals?.reduce((sum, d) => sum + (d.value || 0), 0) ?? 0;

  const handleNumberNav = useCallback(
    (key: string) => {
      const target = NUMBER_KEY_NAV.find((item) => item.key === key);
      if (target) router.push(target.href);
    },
    [router],
  );

  const handleNewItem = useCallback(() => {
    router.push(newItemHref(currentSection));
    window.dispatchEvent(
      new CustomEvent("seridian:new-item", { detail: { section: currentSection } }),
    );
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
        ...NUMBER_KEY_NAV.map((item) => ({
          key: item.key,
          action: () => handleNumberNav(item.key),
          description: `Go to ${item.label}`,
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
      <div className="flex min-h-0 flex-1 overflow-hidden">
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
            "flex min-h-0 flex-1 flex-col transition-all duration-300 ease-in-out",
            isFullBleedRoute ? "overflow-hidden" : "overflow-y-auto",
            sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-[240px]",
          )}
        >
          <div
            role="banner"
            className="flex shrink-0 items-center border-b border-white/5 px-4 py-3 lg:hidden sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm"
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

          {isFullBleedRoute ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          ) : (
            <div
              className={cn(
                "w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6",
                !isWideRoute && "mx-auto max-w-6xl",
              )}
            >
              {children}
            </div>
          )}
        </main>
      </div>

      <footer
        role="contentinfo"
        className={cn(
          "relative z-40 flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1222] px-4 py-2 text-xs text-slate-500 transition-all duration-300 ease-in-out sm:flex-row sm:items-center sm:justify-between",
          sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-[240px]",
        )}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{pageName}</span>
          <span className="hidden text-white/10 sm:inline">|</span>
          <span className="hidden sm:inline">{activeClients} active clients</span>
          <span className="hidden text-white/10 sm:inline">|</span>
          <span className="hidden sm:inline">{openIssues} open issues</span>
          <span className="hidden text-white/10 sm:inline">|</span>
          <span className="hidden sm:inline">${pipelineValue.toLocaleString()} pipeline</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusIndicator />
          <NotificationBell />
          {user && (
            <>
              <span className="hidden text-white/10 sm:inline">|</span>
              <span className="truncate max-w-[8rem] sm:max-w-none">{user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
          <span className="hidden text-white/10 sm:inline">|</span>
          <span className="hidden sm:inline">Seridian v0.1.0</span>
        </div>
      </footer>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
