"use client";

import { FileManager } from "@/components/files/FileManager";
import { HardDrive, Cloud, FileCode, Shield } from "lucide-react";
import { Badge } from "@bytecats/ui-kit";
import { PageShell } from "@/components/dashboard/kit";

export default function FilesPage() {
  return (
    <PageShell
      className="min-h-[calc(100vh-6rem)]"
      title="Files & Workspace Storage"
      description="Centralized file manager, native ODT document generation, image previews, and asset storage."
      icon={<HardDrive className="h-6 w-6" aria-hidden="true" />}
      badge={
        <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-400">
          Cloud Storage
        </Badge>
      }
      action={
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
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#070b14]/90 p-4 shadow-2xl backdrop-blur-md sm:p-6">
        <FileManager />
      </div>
    </PageShell>
  );
}
