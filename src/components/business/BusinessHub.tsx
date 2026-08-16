/**
 * Business hub — clients, pipeline, contracts, bookings, health check.
 * Nested pages stay out of the primary sidebar.
 */
"use client";

import { useState } from "react";
import {
  Users,
  DollarSign,
  FileText,
  PenLine,
  Calendar,
  ClipboardCheck,
  Briefcase,
  Plus,
  Workflow,
} from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import {
  HubCard,
  PageSection,
  PageShell,
} from "@/components/dashboard/kit";
import { BUSINESS_HUB_LINKS } from "@/lib/dashboardNav";
import { NewEngagementFlow } from "@/components/business/NewEngagementFlow";

const ICONS = {
  Clients: Users,
  Sales: DollarSign,
  Proposals: FileText,
  Contracts: PenLine,
  Bookings: Calendar,
  "Health Check": ClipboardCheck,
  Workflows: Workflow,
} as const;

export function BusinessHub() {
  const [engagementOpen, setEngagementOpen] = useState(false);

  return (
    <PageShell
      title="Business"
      description="Clients, pipeline, proposals, contracts, bookings, and health checks — one place to start."
      icon={<Briefcase className="h-5 w-5" aria-hidden="true" />}
      action={
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          onClick={() => setEngagementOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New engagement
        </Button>
      }
    >
      <PageSection
        title="Areas"
        description="Open a workspace. Deep links like /dashboard/clients still work."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_HUB_LINKS.map((link) => {
            const Icon = ICONS[link.label as keyof typeof ICONS] ?? Briefcase;
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

      <PageSection
        title="Guided flow"
        description="Create a client, then a draft proposal and deal in one pass — fewer missed links."
      >
        <p className="text-xs text-slate-500">
          Use <strong className="font-medium text-slate-300">New engagement</strong> when
          starting work with someone new. You can skip proposal or deal steps later from their
          list pages.
        </p>
      </PageSection>

      <Dialog open={engagementOpen} onOpenChange={setEngagementOpen}>
        <DialogContent className="max-w-lg border-white/[0.08] bg-[#0c1222]">
          <DialogHeader>
            <DialogTitle className="text-white">New engagement</DialogTitle>
          </DialogHeader>
          <NewEngagementFlow
            onSuccess={() => setEngagementOpen(false)}
            onCancel={() => setEngagementOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
