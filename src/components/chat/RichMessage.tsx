"use client";

import { useState } from "react";
import { Check, Copy, Bot, Zap, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichMessageProps {
  content: string;
  isAgent?: boolean;
}

export function RichMessage({ content, isAgent }: RichMessageProps) {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Helper to parse mention pills and bold text within text segments
  const parseInlineElements = (text: string) => {
    // Regex matches @SeridianAI, @LinearSyncBot, @DataPulse, @[Name], **bold**, and `code`
    const parts = text.split(/(@SeridianAI|@LinearSyncBot|@DataPulse|@[a-zA-Z0-9_\-]+|\*\*[^*]+\*\*|`[^`]+`)/g);

    return parts.map((part, idx) => {
      if (!part) return null;

      if (part === "@SeridianAI") {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-xs font-semibold text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
          >
            <Sparkles className="h-3 w-3 text-cyan-400" />
            @SeridianAI
          </span>
        );
      }

      if (part === "@LinearSyncBot") {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-xs font-semibold text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]"
          >
            <Zap className="h-3 w-3 text-purple-400" />
            @LinearSyncBot
          </span>
        );
      }

      if (part === "@DataPulse") {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
          >
            <BarChart3 className="h-3 w-3 text-amber-400" />
            @DataPulse
          </span>
        );
      }

      if (part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-0.5 rounded border border-seridian-500/30 bg-seridian-500/10 px-1.5 py-0.5 text-xs font-medium text-seridian-300"
          >
            {part}
          </span>
        );
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith("`") && part.endsWith("`") && !part.startsWith("```")) {
        return (
          <code
            key={idx}
            className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[12.5px] font-medium text-cyan-300 border border-white/[0.08]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return <span key={idx}>{part}</span>;
    });
  };

  // Split into code blocks and normal paragraphs
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks = [];
  let lastIndex = 0;
  let match;
  let codeBlockCount = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    blocks.push({
      type: "code",
      language: match[1] || "text",
      code: match[2].trim(),
      index: codeBlockCount++,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return (
    <div className={cn("space-y-2 text-sm leading-relaxed text-slate-200", isAgent && "text-slate-100")}>
      {blocks.map((block, i) => {
        if (block.type === "code") {
          const isCopied = copiedCodeIndex === block.index;
          return (
            <div
              key={i}
              className="my-2.5 overflow-hidden rounded-lg border border-white/10 bg-[#090d16] font-mono text-xs shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0d1424] px-3.5 py-1.5 text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {block.language || "code"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(block.code ?? "", block.index ?? 0)}
                  className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto p-3.5 text-xs text-slate-200 leading-relaxed font-mono">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        // Render normal text with line breaks and list bullets
        const lines = (block.content ?? "").split("\n");
        return (
          <div key={i} className="space-y-1">
            {lines.map((line, lineIdx) => {
              if (!line.trim()) {
                return <div key={lineIdx} className="h-2" />;
              }

              // Heading 3
              if (line.startsWith("### ")) {
                return (
                  <h4 key={lineIdx} className="mt-2 text-sm font-bold text-white flex items-center gap-2">
                    {parseInlineElements(line.slice(4))}
                  </h4>
                );
              }

              // Heading 2
              if (line.startsWith("## ")) {
                return (
                  <h3 key={lineIdx} className="mt-2 text-base font-bold text-white border-b border-white/10 pb-1">
                    {parseInlineElements(line.slice(3))}
                  </h3>
                );
              }

              // Bullet points
              if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <span>{parseInlineElements(line.trim().slice(2))}</span>
                  </div>
                );
              }

              // Blockquotes
              if (line.trim().startsWith("> ")) {
                return (
                  <div
                    key={lineIdx}
                    className="my-1.5 border-l-2 border-cyan-500/50 bg-cyan-500/5 py-1 pl-3 text-xs italic text-slate-300 rounded-r"
                  >
                    {parseInlineElements(line.trim().slice(2))}
                  </div>
                );
              }

              return <p key={lineIdx}>{parseInlineElements(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}
