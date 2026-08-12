"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  FileText,
  Download,
  ExternalLink,
  Loader2,
  Bold,
  Italic,
  List,
  Heading,
  Code,
  Save,
  Check,
  Eye,
  Edit3,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@bytecats/ui-kit";
import { OdtEditor } from "./OdtEditor";

interface ConvexFilePreviewProps {
  fileId: Id<"files">;
  fileName: string;
  mimeType: string;
  currentUserId?: string;
  currentUserName?: string;
}

export function ConvexFilePreview({
  fileId,
  fileName,
  mimeType,
  currentUserId = "dee",
  currentUserName = "Dee",
}: ConvexFilePreviewProps) {
  const storageUrl = useQuery(api.files.getStorageUrl, { fileId });
  const docContent = useQuery(api.collaboration.getDocumentContent, { fileId });
  const presence = useQuery(api.collaboration.getPresence, { fileId });
  const updatePresence = useMutation(api.collaboration.updatePresence);
  const updateDocContent = useMutation(api.collaboration.updateDocumentContent);

  const [textContent, setTextContent] = useState<string>("");
  const [loadingText, setLoadingText] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // File type detection
  const isOdtFile = mimeType === "application/vnd.oasis.opendocument.text" || fileName.endsWith(".odt");
  const isRtfFile = mimeType === "application/rtf" || fileName.endsWith(".rtf");
  const isJsonFile = mimeType === "application/json" || fileName.endsWith(".json");
  const isCsvFile = fileName.endsWith(".csv");
  const isSvgFile = fileName.endsWith(".svg");
  const isCodeFile = fileName.endsWith(".ts") || fileName.endsWith(".js") || fileName.endsWith(".tsx") || fileName.endsWith(".jsx") || fileName.endsWith(".css") || fileName.endsWith(".html") || fileName.endsWith(".xml") || fileName.endsWith(".yaml") || fileName.endsWith(".yml");
  const isMarkdownFile = fileName.endsWith(".md") || fileName.endsWith(".markdown");

  // ODT and RTF are binary formats - treat as read-only rich documents
  const isBinaryDocument = isOdtFile || isRtfFile;

  const isTextDocument =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    isMarkdownFile ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".json") ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".xml") ||
    fileName.endsWith(".yaml") ||
    fileName.endsWith(".yml") ||
    fileName.endsWith(".svg") ||
    isCodeFile;

  // JSON Syntax Validator & Colorizer
  const renderFormattedJson = (text: string) => {
    if (!text.trim()) return <p className="text-slate-500 italic">Empty JSON data.</p>;
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 text-[10px] font-mono text-emerald-400">
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Valid JSON Payload</span>
            <span>{Object.keys(parsed).length} top-level keys</span>
          </div>
          <pre className="font-mono text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-lg overflow-x-auto leading-relaxed">
            {formatted}
          </pre>
        </div>
      );
    } catch (err) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-red-500/20 pb-1 text-[11px] font-mono font-semibold text-red-400">
            <span>JSON Syntax Error: {(err as Error).message}</span>
          </div>
          <pre className="font-mono text-xs text-slate-300 bg-[#070b14] p-3 rounded-lg overflow-x-auto leading-relaxed">
            {text}
          </pre>
        </div>
      );
    }
  };

  // Load initial content from storage or Convex live doc state
  useEffect(() => {
    if (docContent?.content) {
      setTextContent(docContent.content);
      if (!isEditing) setEditedText(docContent.content);
    } else if (storageUrl && isTextDocument && !isBinaryDocument && !textContent) {
      setLoadingText(true);
      fetch(storageUrl)
        .then((res) => res.text())
        .then((data) => {
          setTextContent(data);
          setEditedText(data);
        })
        .catch(() => {
          setTextContent("Failed to load text content from storage.");
        })
        .finally(() => setLoadingText(false));
    }
  }, [storageUrl, docContent, isTextDocument, isBinaryDocument]);

  // Heartbeat presence for Google Docs multiplayer experience
  useEffect(() => {
    if (!fileId || isBinaryDocument) return;
    const sendHeartbeat = () => {
      updatePresence({
        fileId,
        userPubkey: currentUserId,
        userName: currentUserName,
        cursorPosition: editedText.length,
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [fileId, currentUserId, currentUserName, editedText.length, updatePresence, isBinaryDocument]);

  const [autoSaveStatus, setAutoSaveStatus] = useState<"synced" | "saving" | "idle">("synced");

  // Debounced Auto-Save Effect (Google Docs Style)
  useEffect(() => {
    if (!isEditing || !fileId || isBinaryDocument) return;
    setAutoSaveStatus("saving");
    const timeout = setTimeout(async () => {
      await updateDocContent({ fileId, content: editedText, userPubkey: currentUserId });
      setTextContent(editedText);
      setAutoSaveStatus("synced");
    }, 600);

    return () => clearTimeout(timeout);
  }, [editedText, fileId, currentUserId, isEditing, updateDocContent, isBinaryDocument]);

  const handleFormat = (prefix: string, suffix: string = "") => {
    const updated = `${editedText}\n${prefix}sample text${suffix}`;
    setEditedText(updated);
  };

  const handleTextChange = (newVal: string) => {
    setEditedText(newVal);
  };

  const otherCollaborators = (presence || []).filter((p) => p.userPubkey !== currentUserId);

  if (storageUrl === undefined) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#070b14] text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        <span className="text-xs">Resolving secure file storage URL...</span>
      </div>
    );
  }

  if (!storageUrl) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-[#070b14] p-6 text-center">
        <FileText className="h-10 w-10 text-slate-600" />
        <div>
          <p className="text-xs font-semibold text-slate-300">File Storage URL Unavailable</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
            This file does not have a public HTTP endpoint or the storage link has expired.
          </p>
        </div>
      </div>
    );
  }

  // Image Preview
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-[#070b14] p-2">
        <img src={storageUrl} alt={fileName} className="max-h-[680px] max-w-full rounded-md object-contain" />
      </div>
    );
  }

  // PDF Preview
  if (mimeType === "application/pdf") {
    return (
      <div className="flex h-full w-full flex-1 flex-col gap-2 rounded-lg bg-[#070b14] p-1">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded border border-white/5">
          <span className="text-xs font-semibold text-slate-200 truncate max-w-md">{fileName}</span>
          <a
            href={storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> Open Fullscreen
          </a>
        </div>
        <iframe
          src={`${storageUrl}#toolbar=0`}
          className="h-[650px] w-full rounded-md border border-white/10"
          title={fileName}
        />
      </div>
    );
  }

  // ODT Document — Editable with TipTap + odf-kit
  if (isOdtFile) {
    return (
      <OdtEditor
        fileId={fileId}
        fileName={fileName}
        currentUserId={currentUserId}
      />
    );
  }

  // RTF Binary Document Preview (Read-Only)
  if (isRtfFile) {
    return (
      <div className="flex h-full w-full flex-1 flex-col rounded-xl border border-white/[0.08] bg-[#070b14] overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1222] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">{fileName}</span>
                <span className="font-mono text-[9.5px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                  {mimeType}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Read-Only Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-[11px] font-semibold text-amber-300">
              <Lock className="h-3 w-3" />
              <span>Read-Only</span>
            </div>

            <a href={storageUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              <Button size="sm" variant="outline" className="h-7 border-white/10 text-xs gap-1 text-slate-300 hover:text-white">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/20">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-200">
              <p className="font-semibold">Binary Document Format</p>
              <p className="text-amber-300/70 mt-0.5">
                {isOdtFile 
                  ? "ODT files are ZIP archives containing XML. Download to edit with LibreOffice, Google Docs, or Microsoft Word."
                  : "RTF files contain rich text formatting. Download to edit with a compatible word processor."}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area - Try to render or show download prompt */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#070b14]">
          <div className="max-w-md text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto">
              <FileText className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{fileName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isOdtFile ? "OpenDocument Text" : "Rich Text Format"} — {(1024 * 1024 * 2).toLocaleString()} bytes
              </p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This is a binary document file. To view and edit its contents, download it and open with a compatible application.
            </p>
            <div className="flex gap-2 justify-center">
              <a href={storageUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
                <Button size="sm" className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download to Edit
                </Button>
              </a>
              <a href={storageUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="border-white/10 text-xs gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CSV Data Grid Table Renderer
  const renderFormattedCsv = (text: string) => {
    if (!text.trim()) return <p className="text-slate-500 italic">Empty CSV data.</p>;
    const rows = text.split("\n").filter((r) => r.trim());
    if (rows.length === 0) return null;

    const headers = rows[0].split(",");
    const bodyRows = rows.slice(1);

    return (
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#070b14]">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0c1222] text-[11px] font-semibold uppercase text-cyan-400 border-b border-white/10">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 border-r border-white/5 last:border-0">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-[11px]">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02]">
                {row.split(",").map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 border-r border-white/5 last:border-0">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Code IDE Line-Numbered View
  const renderFormattedCode = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="font-mono text-xs bg-[#070b14] border border-white/10 rounded-lg p-3 overflow-x-auto leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-4 hover:bg-white/[0.02] px-1 rounded">
            <span className="w-8 text-right text-slate-600 select-none text-[10px] tabular-nums">{i + 1}</span>
            <span className="text-cyan-300 whitespace-pre">{l}</span>
          </div>
        ))}
      </div>
    );
  };

  // Markdown Renderer
  const renderFormattedMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-500 italic">No document content.</p>;

    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Heading 1 (# title)
      if (line.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-xl font-bold text-white border-b border-cyan-500/20 pb-1.5 mt-3 mb-2 tracking-tight">
            {line.slice(2)}
          </h1>
        );
      }
      // Heading 2 (## title)
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-lg font-bold text-cyan-300 border-b border-white/10 pb-1 mt-3 mb-1.5 tracking-tight">
            {line.slice(3)}
          </h2>
        );
      }
      // Heading 3 (### title)
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-sm font-bold text-slate-100 mt-2.5 mb-1 tracking-tight">
            {line.slice(4)}
          </h3>
        );
      }
      // Bullet list items (- item or * item)
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 my-0.5 text-xs">
            {line.slice(2)}
          </li>
        );
      }
      // Blockquote (> text)
      if (line.startsWith("> ")) {
        return (
          <blockquote key={idx} className="border-l-2 border-cyan-400 bg-cyan-500/5 px-3 py-1.5 my-2 rounded-r-md text-slate-300 text-xs italic">
            {line.slice(2)}
          </blockquote>
        );
      }
      // Code block lines (``` code)
      if (line.startsWith("```")) {
        return (
          <div key={idx} className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2 py-1 rounded my-1">
            {line}
          </div>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Inline Bold (**text**) parser
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return (
        <p key={idx} className="my-1 text-xs leading-relaxed text-slate-300">
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("`") && part.endsWith("`")) {
              return <code key={pIdx} className="bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px] text-cyan-300">{part.slice(1, -1)}</code>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  // Document Format Dispatcher
  const renderFormattedContent = (text: string) => {
    if (isJsonFile) return renderFormattedJson(text);
    if (isCsvFile) return renderFormattedCsv(text);
    if (isCodeFile) return renderFormattedCode(text);
    if (isMarkdownFile) return renderFormattedMarkdown(text);
    if (!text) return <p className="text-slate-500 italic">No document content.</p>;

    // Plain text - just render as paragraphs
    const paragraphs = text.split("\n\n");
    return paragraphs.map((para, i) => (
      <p key={i} className="text-xs text-slate-200 leading-relaxed my-2">
        {para}
      </p>
    ));
  };

  // Determine if this file type supports editing
  const supportsEditing = isMarkdownFile || isTextDocument;

  // Real-time Collaborative Document Studio
  if (supportsEditing) {
    return (
      <div className="flex h-full w-full flex-1 flex-col rounded-xl border border-white/[0.08] bg-[#070b14] overflow-hidden shadow-2xl">
        {/* Enterprise Studio Command Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1222] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">{fileName}</span>
                <span className="font-mono text-[9.5px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                  {mimeType}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Multiplayer Collaborators */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-[#080d1a] text-xs">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-semibold text-slate-200">
                {presence?.length ?? 1} Active
              </span>
              <div className="flex -space-x-1.5 ml-1">
                {(presence || []).map((user) => (
                  <span
                    key={user.userPubkey}
                    title={`${user.userName} (${user.userPubkey})`}
                    className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-black border border-[#070b14]"
                  >
                    {user.userName.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Cloud Sync Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-[#080d1a] text-[11px] font-semibold text-slate-300">
              {autoSaveStatus === "saving" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                  <span className="text-cyan-300">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>Cloud Synced</span>
                </>
              )}
            </div>

            <a href={storageUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              <Button size="sm" variant="outline" className="h-7 border-white/10 text-xs gap-1 text-slate-300 hover:text-white">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </a>
          </div>
        </div>

        {/* Studio Formatting Command Strip - Only for Markdown files */}
        {isMarkdownFile && (
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#080d1a] px-4 py-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleFormat("**", "**")}
                className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 font-bold hover:text-white transition-colors"
                title="Bold (Ctrl+B)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => handleFormat("*", "*")}
                className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 italic hover:text-white transition-colors"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
              <span className="h-3 w-[1px] bg-white/10 mx-1" />
              <button
                type="button"
                onClick={() => handleFormat("# ")}
                className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 font-mono text-[11px] hover:text-white transition-colors"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => handleFormat("## ")}
                className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 font-mono text-[11px] hover:text-white transition-colors"
                title="Heading 2"
              >
                H2
              </button>
              <span className="h-3 w-[1px] bg-white/10 mx-1" />
              <button
                type="button"
                onClick={() => handleFormat("- ")}
                className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 text-xs hover:text-white transition-colors"
                title="Bullet List"
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => handleFormat("```\n", "\n```")}
                className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 font-mono text-[11px] hover:text-white transition-colors"
                title="Code Snippet"
              >
                {"</>"} Code
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
              <span>{editedText.split(/\s+/).filter(Boolean).length} words</span>
              <span>{editedText.length} chars</span>
            </div>
          </div>
        )}

        {/* Content info for non-markdown text files */}
        {!isMarkdownFile && (
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#080d1a] px-4 py-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Plain Text Editor</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
              <span>{editedText.split(/\s+/).filter(Boolean).length} words</span>
              <span>{editedText.length} chars</span>
            </div>
          </div>
        )}

        {/* Studio Split Workspace Editor & Live Rendered Preview */}
        <div className="grid flex-1 grid-cols-2 divide-x divide-white/[0.08] min-h-[580px]">
          {/* Left Column: Source Editor */}
          <div className="flex flex-col bg-[#070b14] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <Edit3 className="h-3 w-3 text-cyan-400" /> {isMarkdownFile ? "Markdown Editor" : "Text Editor"}
            </div>
            {loadingText ? (
              <div className="flex h-full items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> Loading document...
              </div>
            ) : (
              <textarea
                value={editedText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={isMarkdownFile ? "Type document content in Markdown..." : "Type document content..."}
                className="h-full w-full resize-none bg-transparent font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none leading-relaxed selection:bg-cyan-500/30"
              />
            )}
          </div>

          {/* Right Column: Live Rendered Output */}
          <div className="flex flex-col bg-[#080d1a] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <Eye className="h-3 w-3 text-emerald-400" /> {isMarkdownFile ? "Rendered Preview" : "Formatted View"}
            </div>
            <div className="h-full w-full overflow-y-auto font-sans text-xs text-slate-200 leading-relaxed selection:bg-cyan-500/30 pr-2">
              {renderFormattedContent(editedText || textContent)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Binary Download Card
  return (
    <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-[#070b14] p-6 text-center">
      <FileText className="h-10 w-10 text-slate-500" />
      <div>
        <p className="text-xs font-semibold text-slate-200">{fileName}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{mimeType}</p>
      </div>
      <a href={storageUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
        <Button size="sm" className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" /> Download File
        </Button>
      </a>
    </div>
  );
}
