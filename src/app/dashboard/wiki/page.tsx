"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Skeleton } from "@bytecats/ui-kit";
import { BookOpen, Plus, AlertCircle, Sparkles } from "lucide-react";
import { WikiSidebar } from "@/components/wiki/WikiSidebar";
import { WikiPage } from "@/components/wiki/WikiPage";
import { FloatingPagesBackground } from "@/components/three/backgrounds";
import { cn } from "@/lib/utils";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

export default function WikiDashboardPage() {
  const banks = useQuery(api.memory.listBanks);
  const seedKnowledge = useMutation(api.wikiSeed.seedCompanyKnowledge);
  const createPage = useMutation(api.wiki.createPage);

  const [selectedBankId, setSelectedBankId] = useState<Id<"memoryBanks"> | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<Id<"wikiPages"> | null>(null);
  const [creatingBank, setCreatingBank] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const autoSeeded = useRef(false);

  const pages = useQuery(
    api.wiki.listPages,
    selectedBankId ? { bankId: selectedBankId } : "skip",
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageContent, setNewPageContent] = useState("");
  const [newPageTags, setNewPageTags] = useState("");
  const [creatingPage, setCreatingPage] = useState(false);

  const loadCompanyKnowledge = async (opts?: { silent?: boolean }) => {
    if (seeding || creatingBank) return;
    setCreatingBank(true);
    setSeeding(true);
    setBankError(null);
    try {
      const result = await seedKnowledge({ lastEditedBy: "dashboard-user" });
      setSelectedBankId(result.bankId);
      if (!opts?.silent) {
        toastMutationSuccess(
          `Loaded ${result.pagesUpserted} company pages` +
            (result.memoriesAdded > 0 ? ` and ${result.memoriesAdded} facts` : ""),
        );
      }
    } catch (error) {
      setBankError(
        error instanceof Error ? error.message : "Failed to load company knowledge",
      );
      if (!opts?.silent) {
        toastMutationError(error, "Failed to load company knowledge");
      }
    } finally {
      setCreatingBank(false);
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (banks === undefined) return;
    if (banks.length === 0 && !creatingBank && !selectedBankId && !bankError) {
      void loadCompanyKnowledge({ silent: true });
    } else if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot bank bootstrap
  }, [banks, creatingBank, selectedBankId, bankError]);

  useEffect(() => {
    if (!selectedBankId || pages === undefined || autoSeeded.current) return;
    if (pages.length === 0 && !seeding && !bankError) {
      autoSeeded.current = true;
      void loadCompanyKnowledge({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot empty-wiki seed
  }, [selectedBankId, pages, seeding, bankError]);

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
      toastMutationError(error, "Failed to create page");
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
        <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center sm:justify-between">
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
          <Button
            onClick={() => void loadCompanyKnowledge()}
            disabled={seeding}
            className="bg-white/5 hover:bg-white/10 text-white text-sm gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            {seeding ? "Loading…" : "Load company knowledge"}
          </Button>
        </div>

        <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b14] md:h-[calc(100vh-12rem)] md:flex-row">
          {!selectedBankId ? (
            <div className="flex flex-1 items-center justify-center">
              {bankError ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                  <p className="text-sm text-slate-400 max-w-sm">{bankError}</p>
                  <Button
                    onClick={() => void loadCompanyKnowledge()}
                    disabled={creatingBank}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm"
                  >
                    {creatingBank ? "Retrying…" : "Retry setup"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <p className="text-sm text-slate-400">Setting up wiki...</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "w-full md:w-[280px] md:shrink-0",
                  selectedPageId && "hidden md:block",
                )}
              >
                <WikiSidebar
                  bankId={selectedBankId}
                  selectedPageId={selectedPageId ?? undefined}
                  onSelectPage={setSelectedPageId}
                  onCreatePage={handleOpenCreateDialog}
                />
              </div>
              <div
                className={cn(
                  "flex-1 overflow-y-auto bg-[#0c1222]",
                  !selectedPageId && "hidden md:flex md:flex-col",
                )}
              >
                {selectedPageId ? (
                  <WikiPage
                    pageId={selectedPageId}
                    onBack={() => setSelectedPageId(null)}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
                    <h2 className="text-lg font-semibold text-white mb-2">
                      Welcome to the Wiki
                    </h2>
                    <p className="text-sm text-slate-400 max-w-md mb-6">
                      Select a page from the sidebar or load company knowledge
                      (offers, stack, and how we make money) for the LLM Arena.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={() => void loadCompanyKnowledge()}
                        disabled={seeding}
                        className="bg-white/5 hover:bg-white/10 text-white gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Load company knowledge
                      </Button>
                      <Button
                        onClick={handleOpenCreateDialog}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Page
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {showCreateDialog && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-lg rounded-t-xl border border-white/[0.08] bg-[#0c1222] shadow-2xl sm:rounded-xl">
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
              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
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
