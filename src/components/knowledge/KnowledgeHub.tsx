/**
 * Knowledge hub — wiki, brain, files, templates, arena, chat.
 */
"use client";

import { useState } from "react";
import {
  BookOpen,
  Brain,
  Folder,
  Mail,
  Bot,
  MessageSquare,
  Library,
  Sparkles,
} from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import {
  HubCard,
  PageSection,
  PageShell,
} from "@/components/dashboard/kit";
import { KNOWLEDGE_HUB_LINKS } from "@/lib/dashboardNav";
import { KnowledgeSetupFlow } from "@/components/knowledge/KnowledgeSetupFlow";

const ICONS = {
  Wiki: BookOpen,
  "Second Brain": Brain,
  Files: Folder,
  Templates: Mail,
  "LLM Arena": Bot,
  Chat: MessageSquare,
} as const;

export function KnowledgeHub() {
  const [setupOpen, setSetupOpen] = useState(false);

  return (
    <PageShell
      title="Knowledge"
      description="Docs, memory, files, templates, model arena, and team chat."
      icon={<Library className="h-5 w-5" aria-hidden="true" />}
      action={
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          onClick={() => setSetupOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Set up knowledge
        </Button>
      }
    >
      <PageSection
        title="Areas"
        description="Pick a tool. Cmd+K still finds every nested page."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE_HUB_LINKS.map((link) => {
            const Icon = ICONS[link.label as keyof typeof ICONS] ?? BookOpen;
            return (
              <HubCard
                key={link.href}
                href={link.href}
                title={link.label}
                description={link.description}
                icon={<Icon className="h-4 w-4" aria-hidden="true" />}
              />
            );
          })}
        </div>
      </PageSection>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-lg border-white/[0.08] bg-[#0c1222]">
          <DialogHeader>
            <DialogTitle className="text-white">Set up knowledge</DialogTitle>
          </DialogHeader>
          <KnowledgeSetupFlow
            onDone={() => setSetupOpen(false)}
            onCancel={() => setSetupOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
