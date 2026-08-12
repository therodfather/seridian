"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Input } from "@bytecats/ui-kit";
import { Plus, FileText, Search, Clock, BookOpen } from "lucide-react";

interface WikiSidebarProps {
  bankId: Id<"memoryBanks">;
  selectedPageId?: Id<"wikiPages">;
  onSelectPage: (pageId: Id<"wikiPages">) => void;
  onCreatePage: () => void;
}

export function WikiSidebar({
  bankId,
  selectedPageId,
  onSelectPage,
  onCreatePage,
}: WikiSidebarProps) {
  const [search, setSearch] = useState("");
  const pages = useQuery(api.wiki.listPages, { bankId });

  const filteredPages = useMemo(() => {
    if (!Array.isArray(pages)) return [];
    if (!search.trim()) return pages;
    const q = search.toLowerCase();
    return pages.filter((p) => {
      const title = (p.title ?? "").toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return (
        title.includes(q) ||
        tags.some((t) => (t ?? "").toLowerCase().includes(q))
      );
    });
  }, [pages, search]);

  const recentPages = useMemo(() => {
    return [...filteredPages]
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, 5);
  }, [filteredPages]);

  const formatDate = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-64 h-full bg-[#070b14] border-r border-white/[0.08] flex flex-col">
      <div className="p-3 border-b border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold">Wiki</span>
          </div>
          <Button
            onClick={onCreatePage}
            className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-2 py-1 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="bg-[#0c1222] border-white/[0.08] text-white text-xs pl-8 py-1.5 focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pages === undefined ? (
          <div className="p-4 text-slate-500 text-xs flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Loading pages...
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-4 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-xs">
              {search ? "No matching pages" : "No pages yet"}
            </p>
            {!search && (
              <Button
                onClick={onCreatePage}
                className="mt-2 bg-white/5 hover:bg-white/10 text-slate-400 text-xs"
              >
                Create first page
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {recentPages.length > 0 && !search && (
              <div className="mb-3">
                <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Recent
                </div>
                {recentPages.map((page) => (
                  <button
                    key={`recent-${page._id}`}
                    onClick={() => onSelectPage(page._id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                      selectedPageId === page._id
                        ? "bg-cyan-400/10 text-cyan-400"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{page.title ?? "Untitled"}</span>
                    <span className="text-[10px] text-slate-600 shrink-0">
                      {formatDate(page.updatedAt ?? page.createdAt ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div>
              {!search && (
                <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  All Pages
                </div>
              )}
              {filteredPages.map((page) => (
                <button
                  key={page._id}
                  onClick={() => onSelectPage(page._id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                    selectedPageId === page._id
                      ? "bg-cyan-400/10 text-cyan-400"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{page.title ?? "Untitled"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
