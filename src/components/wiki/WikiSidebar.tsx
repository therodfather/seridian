"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Input, Skeleton } from "@bytecats/ui-kit";
import { Plus, FileText, Search, BookOpen } from "lucide-react";

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
    <div className="flex h-full w-full flex-col border-white/[0.08] bg-[#070b14] md:border-r">
      <div className="border-b border-white/[0.08] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <BookOpen className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <span className="text-sm font-semibold">Wiki</span>
          </div>
          <Button
            type="button"
            onClick={onCreatePage}
            className="flex items-center gap-1 bg-cyan-500 px-2 py-1 text-xs text-black hover:bg-cyan-400"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            aria-label="Search wiki pages"
            className="border-white/[0.08] bg-[#0c1222] py-1.5 pl-8 text-xs text-white focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pages === undefined ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md bg-white/5" />
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-4 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-600" aria-hidden="true" />
            <p className="text-xs text-slate-500">
              {search ? "No matching pages" : "No pages yet"}
            </p>
            {!search && (
              <Button
                type="button"
                onClick={onCreatePage}
                className="mt-2 bg-white/5 text-xs text-slate-400 hover:bg-white/10"
              >
                Create first page
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {recentPages.length > 0 && !search && (
              <div className="mb-3">
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Recent
                </div>
                {recentPages.map((page) => (
                  <button
                    key={`recent-${page._id}`}
                    type="button"
                    onClick={() => onSelectPage(page._id)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                      selectedPageId === page._id
                        ? "bg-cyan-400/10 text-cyan-400"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{page.title ?? "Untitled"}</span>
                    <span className="shrink-0 text-[10px] text-slate-600">
                      {formatDate(page.updatedAt ?? page.createdAt ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div>
              {!search && (
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  All Pages
                </div>
              )}
              {filteredPages.map((page) => (
                <button
                  key={page._id}
                  type="button"
                  onClick={() => onSelectPage(page._id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                    selectedPageId === page._id
                      ? "bg-cyan-400/10 text-cyan-400"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
