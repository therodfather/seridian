"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Badge, Button, Skeleton } from "@bytecats/ui-kit";
import { BookOpen, Plus, AlertCircle, Sparkles, FileText, Code2, ShieldAlert, Eye, Edit3 } from "lucide-react";
import { WikiSidebar } from "@/components/wiki/WikiSidebar";
import { WikiPage } from "@/components/wiki/WikiPage";
import { PageShell } from "@/components/dashboard/kit";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { cn } from "@/lib/utils";

const QUICK_TEMPLATES = [
  {
    id: "sop",
    label: "SOP Document",
    icon: ShieldAlert,
    title: "SOP: Operational Process Title",
    tags: "sop, operations, process",
    content: `# Standard Operating Procedure: Process Title\n\n## 1. Overview & Goal\nDescribe the main objectives and scope of this procedure.\n\n## 2. Roles & Requirements\n- **Role:** Administrator / Developer\n- **Prerequisites:** System access and verified credentials\n\n## 3. Step-by-Step Execution\n1. **Step 1:** Initialize the procedure.\n2. **Step 2:** Verify output parameters.\n3. **Step 3:** Record completion metrics.\n\n## 4. Troubleshooting & Support\nContact engineering support if issues arise.`,
  },
  {
    id: "arch",
    label: "Architecture Spec",
    icon: Code2,
    title: "Arch: System Architecture Spec",
    tags: "architecture, tech-spec, design",
    content: `# Architecture Specification\n\n## Summary\nHigh-level breakdown of components, data flow, and database models.\n\n## Core Components\n- **Frontend:** Next.js 15 App Router with Tailwind CSS v4 & @bytecats/ui-kit\n- **Database & Sync:** Convex realtime platform & vector memory\n\n## Data Flow\n1. User submits state change.\n2. Action mutation executes with transactional integrity.\n3. UI updates reactively.`,
  },
  {
    id: "api",
    label: "API Reference",
    icon: FileText,
    title: "API: Service Reference",
    tags: "api, docs, endpoints",
    content: `# API Reference Document\n\n## Endpoints\n\n### \`api.wiki.createPage\`\n- **Type:** Mutation\n- **Arguments:**\n  - \`bankId\`: ID of target memory bank\n  - \`title\`: Page title string\n  - \`content\`: Markdown content string\n  - \`tags\`: Array of tag strings`,
  },
];

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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageContent, setNewPageContent] = useState("");
  const [newPageTags, setNewPageTags] = useState("");
  const [modalTab, setModalTab] = useState<"edit" | "preview">("edit");
  const [creatingPage, setCreatingPage] = useState(false);

  const pages = useQuery(
    api.wiki.listPages,
    selectedBankId ? { bankId: selectedBankId } : "skip",
  );

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
      toastMutationSuccess("Wiki page created");
    } catch (error) {
      toastMutationError(error, "Failed to create wiki page");
    } finally {
      setCreatingPage(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setNewPageTitle("");
    setNewPageContent("");
    setNewPageTags("");
    setModalTab("edit");
    setShowCreateDialog(true);
  };

  const applyTemplate = (tmpl: typeof QUICK_TEMPLATES[number]) => {
    setNewPageTitle(tmpl.title);
    setNewPageContent(tmpl.content);
    setNewPageTags(tmpl.tags);
  };

  useEffect(() => {
    if (!showCreateDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCreateDialog(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreateDialog]);

  return (
    <PageShell
      className="h-[calc(100vh-6rem)]"
      title="Wiki"
      description="Central documentation, process guides, and internal SOPs"
      icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
      badge={
        <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-400">
          Knowledge Base
        </Badge>
      }
      action={
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c1222] px-3 py-1.5 text-xs text-slate-400 sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>{pages ? `${pages.length} Articles` : "Loading..."}</span>
          </div>
          <Button
            type="button"
            onClick={() => void loadCompanyKnowledge()}
            disabled={seeding}
            className="gap-2 bg-white/5 text-sm text-white hover:bg-white/10"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            {seeding ? "Loading…" : "Load company knowledge"}
          </Button>
          <Button
            type="button"
            onClick={handleOpenCreateDialog}
            disabled={!selectedBankId}
            className="gap-1.5 bg-cyan-500 text-xs font-semibold text-black shadow-lg shadow-cyan-950/30 hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Wiki Page
          </Button>
        </div>
      }
    >

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b14] shadow-2xl">
        {!selectedBankId ? (
          <div className="flex flex-1">
            {bankError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
                <p className="max-w-sm text-sm text-slate-400">{bankError}</p>
                <Button
                  type="button"
                  onClick={() => void loadCompanyKnowledge()}
                  disabled={creatingBank}
                  className="bg-cyan-500 text-xs font-semibold text-black hover:bg-cyan-400"
                >
                  {creatingBank ? "Retrying…" : "Retry setup"}
                </Button>
              </div>
            ) : (
              <div className="flex h-full w-full">
                <div className="hidden w-[280px] shrink-0 flex-col gap-2 border-r border-white/[0.08] p-3 md:flex">
                  <Skeleton className="h-8 w-full bg-white/10" />
                  <Skeleton className="h-7 w-full bg-white/10" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-md bg-white/5" />
                  ))}
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                  <Skeleton className="h-10 w-10 rounded-2xl bg-cyan-500/20" />
                  <p className="text-sm text-slate-400">Setting up wiki memory bank...</p>
                  <Skeleton className="h-4 w-48 bg-white/10" />
                  <Skeleton className="h-4 w-64 bg-white/5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-0 w-full">
            <div
              className={cn(
                "w-full shrink-0 border-r border-white/[0.08] md:w-[280px]",
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
                "min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#0c1222]",
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
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                    <BookOpen className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h2 className="mb-2 text-lg font-bold text-white">
                    Welcome to the Seridian Knowledge Base
                  </h2>
                  <p className="mb-6 max-w-md text-xs leading-relaxed text-slate-400">
                    Select a page from the sidebar or load company knowledge
                    (offers, stack, and how we make money) for the LLM Arena.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() => void loadCompanyKnowledge()}
                      disabled={seeding}
                      className="gap-2 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                      Load company knowledge
                    </Button>
                    <Button
                      type="button"
                      onClick={handleOpenCreateDialog}
                      className="gap-2 bg-cyan-500 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-400"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create New Page
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wiki-create-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateDialog(false);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1222] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <div>
                <h2 id="wiki-create-title" className="text-base font-bold text-white">Compose Wiki Article</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Create structured documentation with markdown and dynamic tags
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#070b14] p-0.5">
                <button
                  type="button"
                  onClick={() => setModalTab("edit")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                    modalTab === "edit" ? "bg-cyan-500 font-semibold text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Edit3 className="h-3 w-3" aria-hidden="true" /> Write
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("preview")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                    modalTab === "preview" ? "bg-cyan-500 font-semibold text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye className="h-3 w-3" aria-hidden="true" /> Preview
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.08] bg-[#070b14]/50 px-6 py-2.5">
              <span className="shrink-0 text-[11px] font-semibold text-slate-400">Quick Templates:</span>
              {QUICK_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300"
                  >
                    <Icon className="h-3 w-3 text-cyan-400" />
                    {tmpl.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 px-6 py-4">
              {modalTab === "edit" ? (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="wiki-page-title" className="text-xs font-semibold text-slate-300">
                      Article Title *
                    </label>
                    <input
                      id="wiki-page-title"
                      type="text"
                      value={newPageTitle}
                      onChange={(e) => setNewPageTitle(e.target.value)}
                      placeholder="e.g., SOP: Production Deployment Protocol"
                      className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="wiki-page-content" className="text-xs font-semibold text-slate-300">
                      Content (Markdown Supported)
                    </label>
                    <textarea
                      id="wiki-page-content"
                      value={newPageContent}
                      onChange={(e) => setNewPageContent(e.target.value)}
                      placeholder="Write article details using standard markdown headers, bullet lists, and code blocks..."
                      rows={10}
                      className="w-full resize-none rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 font-mono text-xs leading-relaxed text-cyan-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="wiki-page-tags" className="text-xs font-semibold text-slate-300">
                      Tags (comma separated)
                    </label>
                    <input
                      id="wiki-page-tags"
                      type="text"
                      value={newPageTags}
                      onChange={(e) => setNewPageTags(e.target.value)}
                      placeholder="e.g., sop, deployment, nextjs"
                      className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                    />
                  </div>
                </>
              ) : (
                <div className="prose prose-invert max-h-[400px] min-h-[300px] max-w-none overflow-y-auto rounded-lg border border-white/[0.08] bg-[#070b14] p-4 text-xs text-slate-200">
                  <h2 className="text-base font-bold text-white">{newPageTitle || "Untitled Page"}</h2>
                  <div className="mt-4 whitespace-pre-wrap font-mono text-slate-300">
                    {newPageContent || "(No content written yet)"}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] bg-[#080d1a] px-6 py-4">
              <Button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="bg-white/5 text-xs text-slate-300 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreatePage}
                disabled={!newPageTitle.trim() || creatingPage}
                className="gap-1.5 bg-cyan-500 text-xs font-semibold text-black hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {creatingPage ? "Creating..." : "Save Wiki Page"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}