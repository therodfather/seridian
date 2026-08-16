/**
 * First-run checklist on Overview — connect Telnyx, create IVR, add client, open hubs.
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Check, Circle } from "lucide-react";
import { PageSection } from "@/components/dashboard/kit";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { ROUTES, settingsTabHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

export function SetupChecklist() {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const statuses = useQuery(api.integrations.listStatuses, {});
  const clients = useQuery(api.clients.list, { status: "active" });
  const flows = useQuery(
    api.ivr.list,
    currentUserId ? { currentUserId } : "skip",
  );
  const banks = useQuery(api.memory.listBanks, {});

  const telnyx = statuses?.find((s) => s.provider === "telnyx");
  const telnyxConnected =
    telnyx?.status === "connected" || telnyx?.status === "configured";
  const hasClient = (clients?.length ?? 0) > 0;
  const hasIvr = (flows?.length ?? 0) > 0;
  const hasPublished = flows?.some((f) => f.status === "published") ?? false;
  const hasKnowledge = (banks?.length ?? 0) > 0;

  const items: ChecklistItem[] = [
    {
      id: "telnyx",
      label: "Connect Telnyx for inbound voice",
      href: settingsTabHref("sync"),
      done: Boolean(telnyxConnected),
    },
    {
      id: "ivr",
      label: "Create an IVR / voice flow",
      href: ROUTES.dashboard.ivr,
      done: hasIvr,
    },
    {
      id: "publish",
      label: "Publish an IVR (needs transfer or hangup path)",
      href: ROUTES.dashboard.ivr,
      done: hasPublished,
    },
    {
      id: "client",
      label: "Add your first client",
      href: ROUTES.dashboard.business,
      done: hasClient,
    },
    {
      id: "knowledge",
      label: "Set up wiki / company knowledge",
      href: ROUTES.dashboard.knowledge,
      done: hasKnowledge,
    },
  ];

  const remaining = items.filter((i) => !i.done).length;
  if (remaining === 0 && statuses !== undefined && clients !== undefined) {
    return null;
  }

  return (
    <PageSection
      title="Get started"
      description={
        remaining > 0
          ? `${remaining} step${remaining === 1 ? "" : "s"} left to harden the workspace`
          : "Loading checklist…"
      }
    >
      <ul className="space-y-1.5 rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                item.done
                  ? "text-slate-500"
                  : "text-slate-200 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {item.done ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
              )}
              <span className={cn(item.done && "line-through decoration-slate-600")}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <Link href={ROUTES.dashboard.business} className="text-cyan-400 hover:underline">
          Business hub
        </Link>
        <span className="text-white/10" aria-hidden="true">
          ·
        </span>
        <Link href={ROUTES.dashboard.knowledge} className="text-cyan-400 hover:underline">
          Knowledge hub
        </Link>
        <span className="text-white/10" aria-hidden="true">
          ·
        </span>
        <Link href={ROUTES.dashboard.ivr} className="text-cyan-400 hover:underline">
          Voice / IVR
        </Link>
      </div>
    </PageSection>
  );
}
