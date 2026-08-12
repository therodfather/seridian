"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Loader2,
  Save,
  Check,
  Download,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  FileText,
  Cloud,
  CloudOff,
} from "lucide-react";
import { Button } from "@bytecats/ui-kit";
import { saveLocal, loadLocal, markSynced } from "@/lib/localDocs";

interface OdtEditorProps {
  fileId: Id<"files">;
  fileName: string;
  currentUserId?: string;
}

export function OdtEditor({
  fileId,
  fileName,
  currentUserId = "dee",
}: OdtEditorProps) {
  const storageUrl = useQuery(api.files.getStorageUrl, { fileId });
  const docContent = useQuery(api.collaboration.getDocumentContent, { fileId });
  const updateDocContent = useMutation(api.collaboration.updateDocumentContent);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "local">("idle");
  const [error, setError] = useState<string | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  
  const editorRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Loading document...</p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm prose-invert max-w-none focus:outline-none min-h-[500px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save to local on every change (debounced)
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(async () => {
        const html = editor.getHTML();
        await saveLocal(fileId, html);
        setSaveStatus("local");
      }, 300);
    },
  });

  // Load content - priority: local > collaboration doc > original file
  useEffect(() => {
    if (!editor) return;

    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Try local store first (instant load)
        const local = await loadLocal(fileId);
        if (local?.content) {
          editor.commands.setContent(local.content);
          setIsLocalOnly(true);
          setSaveStatus("local");
          setLoading(false);
          return;
        }

        // 2. Try collaboration doc
        if (docContent?.content) {
          editor.commands.setContent(docContent.content);
          // Save to local for future offline access
          await saveLocal(fileId, docContent.content);
          setSaveStatus("saved");
          setLoading(false);
          return;
        }

        // 3. Load from original file
        if (!storageUrl) return;

        const res = await fetch(storageUrl);
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        setOriginalBytes(bytes);

        // Check if valid ZIP (ODT)
        const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;

        let html: string;
        if (isZip) {
          const { odtToHtml } = await import("odf-kit/reader");
          html = odtToHtml(bytes);
        } else {
          // Plain text fallback
          const text = new TextDecoder().decode(bytes);
          html = text
            .split("\n\n")
            .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
            .join("");
        }

        editor.commands.setContent(html || "<p></p>");
        // Save to local for future offline access
        await saveLocal(fileId, html);
        setIsLocalOnly(true);
        setSaveStatus("local");
      } catch (err) {
        console.error("Failed to load document:", err);
        setError("Failed to load document.");
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [fileId, editor, storageUrl, docContent]);

  // Save to local + sync to Convex
  const handleSave = useCallback(async () => {
    if (!editor || !fileId) return;

    setSaving(true);
    setSaveStatus("saving");

    try {
      const html = editor.getHTML();
      
      // 1. Save to local (instant)
      await saveLocal(fileId, html);

      // 2. Sync to Convex (background)
      try {
        await updateDocContent({
          fileId,
          content: html,
          userPubkey: currentUserId,
        });
        await markSynced(fileId);
        setSaveStatus("saved");
        setIsLocalOnly(false);
      } catch (syncErr) {
        // Convex sync failed, but local save succeeded
        console.warn("Cloud sync failed, saved locally:", syncErr);
        setSaveStatus("local");
        setIsLocalOnly(true);
      }

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }, [editor, fileId, currentUserId, updateDocContent]);

  // Download original ODT
  const handleDownload = () => {
    if (!originalBytes) return;
    const blob = new Blob([new Uint8Array(originalBytes)], {
      type: "application/vnd.oasis.opendocument.text",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#070b14] text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        <span className="text-xs">Loading document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-red-500/20 bg-[#070b14] p-6 text-center">
        <FileText className="h-10 w-10 text-red-400" />
        <div>
          <p className="text-xs font-semibold text-red-300">{error}</p>
        </div>
        {storageUrl && (
          <a href={storageUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
            <Button size="sm" variant="outline" className="border-white/10 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download Original
            </Button>
          </a>
        )}
      </div>
    );
  }

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
                .odt
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-[#080d1a] text-[11px] font-semibold text-slate-300">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                <span className="text-cyan-300">Saving...</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Cloud className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-300">Synced</span>
              </>
            ) : saveStatus === "local" ? (
              <>
                <CloudOff className="h-3 w-3 text-amber-400" />
                <span className="text-amber-300">Local</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-slate-500" />
                <span className="text-slate-400">Ready</span>
              </>
            )}
          </div>

          {/* Download Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-7 border-white/10 text-xs gap-1 text-slate-300 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>

          {/* Save Button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] bg-[#080d1a] px-4 py-1.5 text-xs text-slate-400">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("bold") ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("italic") ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("strike") ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("code") ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Inline Code"
        >
          <Code className="h-3.5 w-3.5" />
        </button>

        <span className="h-3 w-[1px] bg-white/10 mx-1" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("heading", { level: 1 }) ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Heading 1"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("heading", { level: 2 }) ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("heading", { level: 3 }) ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Heading 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>

        <span className="h-3 w-[1px] bg-white/10 mx-1" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("bulletList") ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("orderedList") ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded hover:bg-white/10 transition-colors ${
            editor?.isActive("blockquote") ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          title="Blockquote"
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 transition-colors"
          title="Horizontal Rule"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <span className="h-3 w-[1px] bg-white/10 mx-1" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto bg-[#0b101d]">
        <EditorContent editor={editor} className="odt-editor" />
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#080d1a] px-4 py-1.5 text-[11px] font-mono text-slate-500">
        <span>OpenDocument Text — Local-first editing</span>
        <div className="flex items-center gap-3">
          <span>{editor?.getText().length ?? 0} chars</span>
          <span>{editor?.getText().split(/\s+/).filter(Boolean).length ?? 0} words</span>
        </div>
      </div>
    </div>
  );
}
