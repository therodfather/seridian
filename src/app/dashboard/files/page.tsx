"use client";

import { FileManager } from "@/components/files/FileManager";
import { HardDrive, Cloud, FileCode, Shield } from "lucide-react";
import { Badge } from "@bytecats/ui-kit";

export default function FilesPage() {
  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-6rem)]">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/40">
            <HardDrive className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Files & Workspace Storage
              </h1>
              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-400">
                Cloud Storage
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Centralized file manager, native ODT document generation, image previews, and asset storage.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1222] px-3 py-1.5 text-slate-300">
            <Cloud className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>Convex Storage</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1222] px-3 py-1.5 text-slate-300">
            <FileCode className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            <span>ODF Kit Integrated</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1222] px-3 py-1.5 text-slate-300">
            <Shield className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#070b14]/90 p-4 shadow-2xl backdrop-blur-md sm:p-6">
        <FileManager />
      </div>
    </div>
  );
}

