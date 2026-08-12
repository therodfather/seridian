"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandShortcut,
  Kbd,
  KbdGroup,
} from "@bytecats/ui-kit";
import { DASHBOARD_NAV, NAV_GROUP_LABELS, entityHref } from "@/lib/dashboardNav";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: "clients" | "issues" | "proposals" | "navigation";
}

const extraNavItems: SearchResult[] = [
  { id: "nav-home", title: "Home", subtitle: "Marketing site", href: "/", group: "navigation" },
  { id: "nav-packages", title: "Packages", subtitle: "Service packages", href: "/packages", group: "navigation" },
];

const navigationItems: SearchResult[] = [
  ...DASHBOARD_NAV.map((item) => ({
    id: `nav-${item.href}`,
    title: item.label,
    subtitle: NAV_GROUP_LABELS[item.group],
    href: item.href,
    group: "navigation" as const,
  })),
  ...extraNavItems,
];

const statusIcons: Record<string, string> = {
  active: "\u25cf",
  inactive: "\u25cb",
  backlog: "\u25ad",
  todo: "\u25a1",
  in_progress: "\u25b3",
  in_review: "\u25c7",
  done: "\u2713",
  draft: "\u270e",
  sent: "\u2709",
  accepted: "\u2714",
  rejected: "\u2718",
  expired: "\u2716",
};

function mapStatus(status: string): string {
  return statusIcons[status] || "\u2022";
}

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const clients = useQuery(api.clients.list, open ? {} : "skip");
  const issues = useQuery(api.issues.list, open ? {} : "skip");
  const proposals = useQuery(api.proposals.list, open ? {} : "skip");

  const searchResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    const q = query.toLowerCase().trim();

    if (clients) {
      for (const client of clients) {
        if (q && !client.name.toLowerCase().includes(q) && !client.company.toLowerCase().includes(q)) continue;
        results.push({
          id: `client-${client._id}`,
          title: client.name,
          subtitle: client.company,
          href: entityHref("clients", client._id),
          group: "clients",
        });
      }
    }

    if (issues) {
      for (const issue of issues) {
        if (q && !issue.title.toLowerCase().includes(q) && !issue.description.toLowerCase().includes(q)) continue;
        results.push({
          id: `issue-${issue._id}`,
          title: issue.title,
          subtitle: `${mapStatus(issue.status)} ${issue.status.replace("_", " ")}`,
          href: entityHref("issues", issue._id),
          group: "issues",
        });
      }
    }

    if (proposals) {
      for (const proposal of proposals) {
        if (q && !proposal.title.toLowerCase().includes(q)) continue;
        results.push({
          id: `proposal-${proposal._id}`,
          title: proposal.title,
          subtitle: `${mapStatus(proposal.status)} ${proposal.status}${proposal.value ? ` \u2014 $${proposal.value.toLocaleString()}` : ""}`,
          href: entityHref("proposals", proposal._id),
          group: "proposals",
        });
      }
    }

    const filteredNav = q
      ? navigationItems.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.subtitle.toLowerCase().includes(q),
        )
      : navigationItems;

    results.push(...filteredNav);

    return results;
  }, [query, clients, issues, proposals]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const result of searchResults) {
      if (!groups[result.group]) groups[result.group] = [];
      groups[result.group].push(result);
    }
    return groups;
  }, [searchResults]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  function handleSelect(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  const groupLabels: Record<string, string> = {
    navigation: "Pages",
    clients: "Clients",
    issues: "Issues",
    proposals: "Proposals",
  };

  const groupOrder = ["navigation", "clients", "issues", "proposals"];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton={false}>
      <CommandInput
        placeholder="Search or jump to..."
        value={query}
        onValueChange={setQuery}
        className="border-none text-sm"
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
            <span className="text-2xl" aria-hidden="true">
              {"\u2315"}
            </span>
            <span className="text-sm">No results found</span>
          </div>
        </CommandEmpty>

        {groupOrder.map((groupKey) => {
          const items = groupedResults[groupKey];
          if (!items || items.length === 0) return null;

          return (
            <CommandGroup key={groupKey} heading={groupLabels[groupKey]}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-xs text-slate-400" aria-hidden="true">
                    {groupKey === "navigation" && "\u25a5"}
                    {groupKey === "clients" && "\u25ce"}
                    {groupKey === "issues" && "\u2610"}
                    {groupKey === "proposals" && "\u229e"}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-slate-200">
                      {item.title}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {item.subtitle}
                    </span>
                  </div>
                  <CommandShortcut>
                    <KbdGroup>
                      <Kbd className="text-[10px]">Enter</Kbd>
                    </KbdGroup>
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <Kbd className="text-[10px]">&uarr;</Kbd>
            <Kbd className="text-[10px]">&darr;</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd className="text-[10px]">Enter</Kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <Kbd className="text-[10px]">Esc</Kbd>
            close
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
