"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@bytecats/ui-kit";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DASHBOARD_NAV,
  isNavItemActive,
  type DashboardNavItem,
} from "@/lib/dashboardNav";

const ConstellationS = dynamic(
  () => import("@/components/three/ConstellationS").then((m) => m.ConstellationS),
  { ssr: false, loading: () => <span className="font-display text-sm font-bold text-seridian-400">S</span> },
);

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: DashboardNavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-seridian-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b14]",
        isActive
          ? "bg-seridian-500/10 text-seridian-400 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.12)]"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
        collapsed && "justify-center px-2",
      )}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/[0.06] bg-[#070b14] transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-white/[0.06]", collapsed ? "justify-center px-2" : "px-4")}>
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-seridian-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b14] rounded-lg"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-seridian-500/10 overflow-hidden">
            <ConstellationS size={28} />
          </span>
          {!collapsed && (
            <span className="font-display text-base font-semibold tracking-tight text-white">
              Seridian
            </span>
          )}
        </Link>
      </div>

      <nav role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {DASHBOARD_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isNavItemActive(pathname, item)}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex h-9 w-full items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-white transition-colors duration-200"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
