"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Button, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { FileUpload } from "./FileUpload";
import {
  Folder, File, FileText, FileImage, FileVideo, FileAudio, FileCode, FileArchive,
  FileJson, FileSpreadsheet, Presentation, Eye, Download, Trash2, Info,
  Grid, List, Search, ChevronRight, Plus, X, HardDrive, ArrowLeft, Edit2, FilePlus, Sparkles
} from "lucide-react";
import { ConvexFilePreview } from "./ConvexFilePreview";

type FileRecord = Doc<"files">;

const FILE_TYPE_CONFIG: Record<string, { icon: typeof File; color: string; label: string }> = {
  "image/": { icon: FileImage, color: "text-pink-400 bg-pink-500/10", label: "Image" },
  "video/": { icon: FileVideo, color: "text-purple-400 bg-purple-500/10", label: "Video" },
  "audio/": { icon: FileAudio, color: "text-amber-400 bg-amber-500/10", label: "Audio" },
  "application/pdf": { icon: FileText, color: "text-red-400 bg-red-500/10", label: "PDF" },
  "application/vnd.oasis.opendocument.text": { icon: FileText, color: "text-cyan-400 bg-cyan-500/10", label: "ODT Document" },
  "application/rtf": { icon: FileText, color: "text-indigo-400 bg-indigo-500/10", label: "RTF Document" },
  "application/zip": { icon: FileArchive, color: "text-yellow-400 bg-yellow-500/10", label: "Archive" },
  "application/json": { icon: FileJson, color: "text-emerald-400 bg-emerald-500/10", label: "JSON" },
  "text/": { icon: FileText, color: "text-blue-400 bg-blue-500/10", label: "Text / Markdown" },
  "text/html": { icon: FileCode, color: "text-orange-400 bg-orange-500/10", label: "HTML" },
  "text/css": { icon: FileCode, color: "text-cyan-400 bg-cyan-500/10", label: "CSS" },
  "text/javascript": { icon: FileCode, color: "text-yellow-400 bg-yellow-500/10", label: "JavaScript" },
  "application/vnd.openxmlformats-officedocument": { icon: Presentation, color: "text-orange-400 bg-orange-500/10", label: "Document" },
  "spreadsheet": { icon: FileSpreadsheet, color: "text-green-400 bg-green-500/10", label: "Spreadsheet" },
};

const CREATE_FILE_TEMPLATES = [
  { id: "odt", name: "Open Document (.odt)", mimeType: "application/vnd.oasis.opendocument.text", extension: ".odt" },
  { id: "md", name: "Markdown Document (.md)", mimeType: "text/markdown", extension: ".md" },
  { id: "rtf", name: "Rich Text Format (.rtf)", mimeType: "application/rtf", extension: ".rtf" },
  { id: "txt", name: "Plain Text (.txt)", mimeType: "text/plain", extension: ".txt" },
  { id: "json", name: "JSON Data (.json)", mimeType: "application/json", extension: ".json" },
];

function getFileConfig(mimeType: string) {
  for (const [prefix, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (mimeType.startsWith(prefix)) return config;
  }
  return { icon: File, color: "text-slate-400 bg-slate-500/10", label: "File" };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isPreviewable(mimeType: string, fileName?: string): boolean {
  if (!mimeType) return false;
  const name = fileName ? fileName.toLowerCase() : "";
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/vnd.oasis.opendocument.text" ||
    mimeType === "application/rtf" ||
    name.endsWith(".md") ||
    name.endsWith(".txt") ||
    name.endsWith(".odt") ||
    name.endsWith(".rtf")
  );
}

interface FileManagerProps {
  clientId?: Id<"clients">;
}

export function FileManager({ clientId }: FileManagerProps) {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>();
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileRecord | null>(null);
  const [renameFileItem, setRenameFileItem] = useState<FileRecord | null>(null);
  const [newFileName, setNewFileName] = useState("");

  // Create Document Form state
  const [docWizardStep, setDocWizardStep] = useState<1 | 2>(1);
  const [createTitle, setCreateTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("odt");
  const [createInitialContent, setCreateInitialContent] = useState("");
  const [creating, setCreating] = useState(false);

  const files = useQuery(api.files.list, { parentId: currentFolder });
  const removeFile = useMutation(api.files.remove);
  const renameFile = useMutation(api.files.rename);
  const createDoc = useMutation(api.files.createDocument);

  const folders = useMemo(() => files?.filter((f) => f.type === "folder") ?? [], [files]);
  const fileItems = useMemo(() => {
    const items = files?.filter((f) => f.type !== "folder") ?? [];
    if (!search) return items;
    return items.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  }, [files, search]);

  const totalSize = useMemo(() => fileItems.reduce((sum, f) => sum + f.size, 0), [fileItems]);

  const handleDelete = useCallback(async (fileId: Id<"files">) => {
    try {
      await removeFile({ fileId });
      setDeleteConfirm(null);
      setSelectedFile(null);
      toastMutationSuccess("File deleted");
    } catch (error) {
      toastMutationError(error, "Failed to delete file");
    }
  }, [removeFile]);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFileItem || !newFileName.trim()) return;
    try {
      await renameFile({ fileId: renameFileItem._id, name: newFileName.trim() });
      setRenameFileItem(null);
      setNewFileName("");
      toastMutationSuccess("File renamed");
    } catch (error) {
      toastMutationError(error, "Failed to rename file");
    }
  };

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleCreateDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      toastMutationError("Document title is required");
      return;
    }
    setCreating(true);
    try {
      const template = CREATE_FILE_TEMPLATES.find((t) => t.id === selectedTemplateId) || CREATE_FILE_TEMPLATES[0];
      const finalName = createTitle.endsWith(template.extension) ? createTitle : `${createTitle}${template.extension}`;

      const postUrl = await generateUploadUrl();
      
      let blob: Blob;
      let initialContent: string;
      
      if (template.id === "odt") {
        // Create proper ODT binary using odf-kit
        const { OdtDocument } = await import("odf-kit");
        const doc = new OdtDocument();
        doc.setMetadata({ title: createTitle });
        
        const content = createInitialContent.trim();
        initialContent = content;
        if (content) {
          // Split by double newlines for paragraphs
          const paragraphs = content.split("\n\n");
          for (const para of paragraphs) {
            doc.addParagraph(para);
          }
        } else {
          doc.addParagraph("");
        }
        
        const bytes = await doc.save();
        blob = new Blob([new Uint8Array(bytes)], { type: template.mimeType });
      } else {
        // For other formats, use text content
        const content = createInitialContent.trim() || `# ${createTitle}\n\nDocument initialized.`;
        initialContent = content;
        blob = new Blob([content], { type: template.mimeType });
      }

      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": template.mimeType },
        body: blob,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await res.json();

      await createDoc({
        name: finalName,
        type: template.mimeType,
        storageId: storageId as Id<"_storage">,
        size: blob.size,
        initialContent: initialContent,
        parentId: currentFolder,
        clientId,
        uploadedBy: "Dee",
      });

      setShowCreateDoc(false);
      setCreateTitle("");
      setCreateInitialContent("");
      setDocWizardStep(1);
      toastMutationSuccess("Document created");
    } catch (error) {
      toastMutationError(error, "Failed to create document");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <HardDrive className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="truncate text-sm text-slate-400">{fileItems.length} files · {formatBytes(totalSize)}</span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="h-8 w-full pl-8 bg-white/5 border-white/10 text-xs sm:h-7 sm:w-40"
            />
          </div>
          <div className="flex items-center rounded-md border border-white/10 bg-white/[0.03] p-0.5">
            <button type="button" onClick={() => setViewMode("list")} className={cn("h-7 w-7 sm:h-6 sm:w-6 flex items-center justify-center rounded text-xs", viewMode === "list" ? "bg-white/10 text-white" : "text-slate-500")} aria-label="List view"><List className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setViewMode("grid")} className={cn("h-7 w-7 sm:h-6 sm:w-6 flex items-center justify-center rounded text-xs", viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-500")} aria-label="Grid view"><Grid className="h-3.5 w-3.5" /></button>
          </div>

          <Button size="sm" onClick={() => setShowCreateDoc(true)} className="h-8 flex-1 bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1 sm:h-7 sm:flex-none">
            <FilePlus className="h-3.5 w-3.5" />
            <span className="sm:inline">Create</span>
            <span className="hidden sm:inline"> Document</span>
          </Button>

          <Button size="sm" onClick={() => setShowUpload(!showUpload)} className="h-8 flex-1 bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1 sm:h-7 sm:flex-none">
            {showUpload ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showUpload ? "Close" : "Upload"}
          </Button>
        </div>
      </div>

      {/* Upload area */}
      {showUpload && (
        <FileUpload parentId={currentFolder} clientId={clientId} onComplete={() => setShowUpload(false)} />
      )}

      {/* Breadcrumbs */}
      {currentFolder && (
        <button type="button" onClick={() => setCurrentFolder(undefined)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to root
        </button>
      )}

      {/* Content */}
      {files === undefined ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : files.length === 0 ? (
        <EmptyState
          title={currentFolder ? "Empty folder" : "No files yet"}
          description={
            currentFolder
              ? "Upload a file or create a document in this folder."
              : "Upload files or create a document to get started."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowCreateDoc(true)}
                className="h-7 bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1"
              >
                <FilePlus className="h-3.5 w-3.5" />
                Create Document
              </Button>
              <Button
                size="sm"
                onClick={() => setShowUpload(true)}
                className="h-7 bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Upload
              </Button>
            </div>
          }
        />
      ) : viewMode === "list" ? (
        <div className="space-y-0.5">
          {/* Folders */}
          {folders.map((folder) => (
            <button key={folder._id} type="button" onClick={() => setCurrentFolder(folder._id)} className="group flex w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-[#0c1222]/60 px-3 py-2 text-left transition-colors hover:border-white/[0.1] hover:bg-[#0c1222]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400"><Folder className="h-4 w-4" /></div>
              <span className="flex-1 truncate text-sm text-slate-200 group-hover:text-white">{folder.name}</span>
              <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />
            </button>
          ))}

          {/* Files */}
          {fileItems.map((file) => {
            const config = getFileConfig(file.type);
            const Icon = config.icon;
            return (
              <div key={file._id} className="group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[#0c1222]/60 px-3 py-2 transition-colors hover:border-white/[0.1] hover:bg-[#0c1222]">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", config.color)}><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-slate-200 group-hover:text-white">{file.name}</p>
                  <p className="text-[11px] text-slate-500">{formatBytes(file.size)} · {config.label} · {formatDate(file.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  {isPreviewable(file.type, file.name) && (
                    <button type="button" onClick={() => setPreviewFile(file)} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10" title="Preview / Edit"><Eye className="h-3.5 w-3.5" /></button>
                  )}
                  <button type="button" onClick={() => { setRenameFileItem(file); setNewFileName(file.name); }} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10" title="Rename"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setSelectedFile(file)} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10" title="Details"><Info className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setDeleteConfirm(file)} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {folders.map((folder) => (
            <button key={folder._id} type="button" onClick={() => setCurrentFolder(folder._id)} className="group flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c1222]/60 p-4 transition-colors hover:border-white/[0.1]">
              <Folder className="h-8 w-8 text-yellow-400" />
              <span className="truncate text-xs text-slate-300 group-hover:text-white w-full text-center">{folder.name}</span>
            </button>
          ))}
          {fileItems.map((file) => {
            const config = getFileConfig(file.type);
            const Icon = config.icon;
            return (
              <button key={file._id} type="button" onClick={() => isPreviewable(file.type, file.name) ? setPreviewFile(file) : setSelectedFile(file)} className="group flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c1222]/60 p-4 transition-colors hover:border-white/[0.1]">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", config.color)}><Icon className="h-6 w-6" /></div>
                <span className="truncate text-xs text-slate-300 group-hover:text-white w-full text-center">{file.name}</span>
                <span className="text-[10px] text-slate-600">{formatBytes(file.size)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Document Multi-Step Wizard Dialog */}
      <Dialog open={showCreateDoc} onOpenChange={(o) => { setShowCreateDoc(o); if (!o) setDocWizardStep(1); }}>
        <DialogContent className="max-w-md border-white/[0.08] bg-[#080d1a] shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-white/[0.08]">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <FilePlus className="h-4 w-4 text-cyan-400" />
                {docWizardStep === 1 ? "Select Document Format" : "Document Details & Content"}
              </DialogTitle>
              <div className="flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-full", docWizardStep === 1 ? "bg-cyan-400" : "bg-slate-600")} />
                <span className={cn("h-2 w-2 rounded-full", docWizardStep === 2 ? "bg-cyan-400" : "bg-slate-600")} />
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateDocumentSubmit} className="py-3 space-y-4">
            {/* STEP 1: Format Selection */}
            {docWizardStep === 1 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Choose your preferred workspace document format:</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {CREATE_FILE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={cn(
                        "flex flex-col justify-between p-3 rounded-xl border text-left text-xs transition-all min-h-[76px]",
                        selectedTemplateId === tmpl.id
                          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-950/20"
                          : "border-white/10 bg-[#070b14] text-slate-400 hover:text-slate-200 hover:border-white/20 hover:bg-white/[0.03]"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <FileText className={cn("h-4 w-4", selectedTemplateId === tmpl.id ? "text-cyan-400" : "text-slate-500")} />
                        <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                          {tmpl.extension}
                        </span>
                      </div>
                      <div className="mt-2 font-semibold text-slate-200 truncate">{tmpl.name}</div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateDoc(false)} className="text-slate-400 text-xs">Cancel</Button>
                  <Button type="button" onClick={() => setDocWizardStep(2)} className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1">
                    Next Step <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Name & Content */}
            {docWizardStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Document Title *</Label>
                  <Input
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Technical_Architecture_Spec"
                    className="bg-[#070b14] border-white/10 text-xs"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Initial Content (Optional)</Label>
                  <textarea
                    value={createInitialContent}
                    onChange={(e) => setCreateInitialContent(e.target.value)}
                    placeholder={selectedTemplateId === "odt" ? "ODT files are rich text documents. Leave empty for blank document." : "Type initial document notes or markdown content..."}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-[#070b14] p-3 text-xs text-slate-200 focus:border-cyan-500/40 focus:outline-none resize-none font-mono"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="ghost" onClick={() => setDocWizardStep(1)} className="text-slate-400 text-xs flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowCreateDoc(false)} className="text-slate-400 text-xs">Cancel</Button>
                    <Button type="submit" disabled={creating || !createTitle.trim()} className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs">
                      {creating ? "Creating..." : "Create Document"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={renameFileItem !== null} onOpenChange={(o) => !o && setRenameFileItem(null)}>
        <DialogContent className="max-w-sm border-white/[0.08] bg-[#080d1a]">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Rename File</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">New Filename</Label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="bg-[#070b14] border-white/10 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRenameFileItem(null)} className="text-slate-400">Cancel</Button>
              <Button type="submit" disabled={!newFileName.trim()} className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs">Save Name</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        {previewFile && (
          <DialogContent className="max-h-[92vh] w-[95vw] overflow-hidden border-white/[0.08] bg-[#0c1222] p-0 shadow-2xl sm:max-w-5xl">
            <DialogHeader className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between">
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                {(() => { const Icon = getFileConfig(previewFile.type).icon; return <Icon className="h-4 w-4 text-cyan-400" />; })()}
                {previewFile.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex max-h-[min(80vh,100%)] min-h-[40vh] flex-1 flex-col bg-[#070b14] p-3 sm:min-h-[520px] sm:p-4">
              <ConvexFilePreview
                fileId={previewFile._id}
                fileName={previewFile.name}
                mimeType={previewFile.type}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={(o) => !o && setSelectedFile(null)}>
        {selectedFile && (
          <DialogContent className="max-w-sm border-white/[0.06] bg-[#0c1222] p-4 space-y-3">
            <div className="flex items-start gap-3">
              {(() => { const config = getFileConfig(selectedFile.type); const Icon = config.icon; return <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", config.color)}><Icon className="h-5 w-5" /></div>; })()}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-white truncate">{selectedFile.name}</h3>
                <p className="text-xs text-slate-500">{selectedFile.type}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Size</span><span className="text-slate-300">{formatBytes(selectedFile.size)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="text-slate-300">{formatDate(selectedFile.createdAt)} {formatTime(selectedFile.createdAt)}</span></div>
              {selectedFile.parentId && <div className="flex justify-between"><span className="text-slate-500">Folder</span><span className="text-slate-300">{selectedFile.parentId}</span></div>}
            </div>
            <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-2 sm:flex-row">
              {isPreviewable(selectedFile.type, selectedFile.name) && <Button size="sm" variant="outline" onClick={() => { setPreviewFile(selectedFile); setSelectedFile(null); }} className="w-full border-white/10 text-xs sm:flex-1"><Eye className="h-3.5 w-3.5 mr-1" />Preview</Button>}
              <Button size="sm" variant="outline" onClick={() => { setRenameFileItem(selectedFile); setNewFileName(selectedFile.name); setSelectedFile(null); }} className="w-full border-white/10 text-xs sm:flex-1"><Edit2 className="h-3.5 w-3.5 mr-1" />Rename</Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(selectedFile)} className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs sm:flex-1"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        {deleteConfirm && (
          <DialogContent className="max-w-sm border-white/[0.06] bg-[#0c1222] p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">Delete file?</h3>
            <p className="text-xs text-slate-400">Are you sure you want to delete <span className="text-white">{deleteConfirm.name}</span>? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="text-slate-400 text-xs">Cancel</Button>
              <Button size="sm" onClick={() => handleDelete(deleteConfirm._id)} className="bg-red-500 text-white hover:bg-red-400 text-xs">Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
