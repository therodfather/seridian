"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Skeleton } from "@bytecats/ui-kit";
import { BookOpen, Plus } from "lucide-react";
import { WikiSidebar } from "@/components/wiki/WikiSidebar";
import { WikiPage } from "@/components/wiki/WikiPage";
import { FloatingPagesBackground } from "@/components/three/backgrounds";

export default function WikiDashboardPage() {
  const banks = useQuery(api.memory.listBanks);
  const createBank = useMutation(api.memory.createBank);
  const createPage = useMutation(api.wiki.createPage);

  const [selectedBankId, setSelectedBankId] = useState<Id<"memoryBanks"> | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<Id<"wikiPages"> | null>(null);
  const [creatingBank, setCreatingBank] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageContent, setNewPageContent] = useState("");
  const [newPageTags, setNewPageTags] = useState("");
  const [creatingPage, setCreatingPage] = useState(false);

  useEffect(() => {
    if (banks === undefined) return;
    if (banks.length === 0 && !creatingBank) {
      setCreatingBank(true);
      createBank({
        name: "Seridian Wiki",
        mission: "Central knowledge base for Seridian Digital operations, processes, and documentation.",
        directives: [
          "Maintain accurate and up-to-date documentation",
          "Organize pages with clear tags and titles",
          "Keep content concise and actionable",
        ],
        disposition: {
          skepticism: 0.3,
          literalism: 0.7,
          empathy: 0.5,
        },
        createdBy: "system",
      }).then((bankId) => {
        setSelectedBankId(bankId);
        setCreatingBank(false);
      }).catch(() => {
        setCreatingBank(false);
      });
    } else if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0]._id);
    }
  }, [banks, creatingBank, selectedBankId, createBank]);

  const handleCreatePage = async () => {
    if (!selectedBankId || !newPageTitle.trim() || creatingPage) return;
    setCreatingPage(true);
    try {
      const tags = newPageTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const pageId = await createPage({
        bankId: selectedBankId,
        title: newPageTitle.trim(),
        content: newPageContent.trim(),
        tags,
        lastEditedBy: "dashboard-user",
      });
      setSelectedPageId(pageId);
      setShowCreateDialog(false);
      setNewPageTitle("");
      setNewPageContent("");
      setNewPageTags("");
    } catch (error) {
      console.error("Failed to create page:", error);
    } finally {
      setCreatingPage(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setNewPageTitle("");
    setNewPageContent("");
    setNewPageTags("");
    setShowCreateDialog(true);
  };

  return (
    <>
      <FloatingPagesBackground />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Wiki</h1>
              <p className="text-xs text-slate-400">
                Knowledge base and documentation
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-white/[0.08] overflow-hidden bg-[#070b14]">
          {!selectedBankId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <p className="text-sm text-slate-400">Setting up wiki...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-[280px] shrink-0">
                <WikiSidebar
                  bankId={selectedBankId}
                  selectedPageId={selectedPageId ?? undefined}
                  onSelectPage={setSelectedPageId}
                  onCreatePage={handleOpenCreateDialog}
                />
              </div>
              <div className="flex-1 overflow-y-auto bg-[#0c1222]">
                {selectedPageId ? (
                  <WikiPage
                    pageId={selectedPageId}
                    onBack={() => setSelectedPageId(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
                    <h2 className="text-lg font-semibold text-white mb-2">
                      Welcome to the Wiki
                    </h2>
                    <p className="text-sm text-slate-400 max-w-md mb-6">
                      Select a page from the sidebar or create a new one to get
                      started with your documentation.
                    </p>
                    <Button
                      onClick={handleOpenCreateDialog}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Page
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {showCreateDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#0c1222] shadow-2xl">
              <div className="border-b border-white/[0.08] px-6 py-4">
                <h2 className="text-lg font-semibold text-white">New Wiki Page</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Create a new page in the knowledge base
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    placeholder="Page title..."
                    className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Content
                  </label>
                  <textarea
                    value={newPageContent}
                    onChange={(e) => setNewPageContent(e.target.value)}
                    placeholder="Write your content here... (Markdown supported)"
                    rows={8}
                    className="w-full resize-none rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newPageTags}
                    onChange={(e) => setNewPageTags(e.target.value)}
                    placeholder="e.g., react, convex, tutorial"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-6 py-4">
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-400 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePage}
                  disabled={!newPageTitle.trim() || creatingPage}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {creatingPage ? "Creating..." : "Create Page"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
