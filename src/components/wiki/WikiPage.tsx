"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button, Input, Textarea } from "@bytecats/ui-kit";
import { Save, Edit3, Clock, User, Tag } from "lucide-react";

interface WikiPageProps {
  pageId: Id<"wikiPages">;
  onBack?: () => void;
}

export function WikiPage({ pageId, onBack }: WikiPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");

  const page = useQuery(api.wiki.getPage, { pageId });
  const updatePage = useMutation(api.wiki.updatePage);

  const handleEdit = () => {
    if (page) {
      setTitle(page.title);
      setContent(page.content);
      setTagInput(page.tags?.join(", ") ?? "");
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    try {
      const tags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updatePage({
        pageId,
        title,
        content,
        tags,
        lastEditedBy: "dee",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save page:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle("");
    setContent("");
    setTagInput("");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (page === undefined) {
    return (
      <div className="bg-[#070b14] rounded-lg border border-white/[0.08] p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Clock className="w-5 h-5 animate-spin" />
          <span>Loading wiki page...</span>
        </div>
      </div>
    );
  }

  if (page === null) {
    return (
      <div className="bg-[#070b14] rounded-lg border border-white/[0.08] p-8">
        <p className="text-slate-400">Page not found.</p>
        {onBack && (
          <Button
            onClick={onBack}
            className="mt-4 bg-white/5 hover:bg-white/10 text-white"
          >
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#070b14] rounded-lg border border-white/[0.08] overflow-hidden">
      <div className="bg-[#0c1222] border-b border-white/[0.08] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                onClick={onBack}
                className="bg-white/5 hover:bg-white/10 text-white text-sm px-3 py-1"
              >
                ← Back
              </Button>
            )}
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title"
                className="bg-[#070b14] border-white/[0.08] text-white text-xl font-semibold focus:border-cyan-400"
              />
            ) : (
              <h1 className="text-xl font-semibold text-white">{page.title}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleCancel}
                  className="bg-white/5 hover:bg-white/10 text-slate-400 text-sm px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm px-4 py-2 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEdit}
                className="bg-white/5 hover:bg-white/10 text-white text-sm px-4 py-2 flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-400">
          {page.lastEditedBy && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{page.lastEditedBy}</span>
            </div>
          )}
          {page.updatedAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Updated {formatDate(page.updatedAt)}</span>
            </div>
          )}
          {page.createdAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Created {formatDate(page.createdAt)}</span>
            </div>
          )}
        </div>

        {page.tags && page.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Tag className="w-4 h-4 text-slate-400" />
            {page.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Content
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your content here... (Markdown supported)"
                className="bg-[#0c1222] border-white/[0.08] text-white min-h-[400px] font-mono text-sm focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Tags (comma separated)
              </label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g., react, convex, tutorial"
                className="bg-[#0c1222] border-white/[0.08] text-white focus:border-cyan-400"
              />
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <div className="bg-[#0c1222] rounded-lg border border-white/[0.08] p-6">
              <pre className="whitespace-pre-wrap text-slate-300 font-sans text-sm leading-relaxed">
                {page.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
