"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Badge, Button } from "@bytecats/ui-kit";
import { PhoneCall, Plus } from "lucide-react";
import {
  EmptyState,
  LoadingBlock,
  PageShell,
  StatusBadge,
} from "@/components/dashboard/kit";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { ivrFlowHref } from "@/lib/routes";
import { useQuery } from "convex/react";
import { useState } from "react";

export function IvrFlowList() {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const flows = useQuery(
    api.ivr.list,
    currentUserId ? { currentUserId } : "skip",
  );
  const createFlow = useMutation(api.ivr.create);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!currentUserId || creating) return;
    setCreating(true);
    try {
      const id = await createFlow({
        currentUserId,
        name: "New IVR flow",
      });
      window.location.href = ivrFlowHref(id);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  return (
    <PageShell
      title="IVR / Voice"
      description="Build inbound call menus, publish a version Telnyx executes, and assign a number."
      icon={<PhoneCall className="h-5 w-5" aria-hidden="true" />}
      action={
        <Button
          type="button"
          size="sm"
          disabled={!currentUserId || creating}
          onClick={() => void handleCreate()}
          className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {creating ? "Creating…" : "New flow"}
        </Button>
      }
    >
      {!flows ? (
        <LoadingBlock rows={2} label="Loading IVR flows" />
      ) : flows.length === 0 ? (
        <EmptyState
          icon="☎"
          title="No IVR flows yet"
          description="Create a flow, edit the menu tree, publish, then assign a Telnyx number."
          action={
            <Button
              type="button"
              size="sm"
              disabled={!currentUserId || creating}
              onClick={() => void handleCreate()}
            >
              Create first flow
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="IVR flows">
          {flows.map((flow) => (
            <li key={flow._id}>
              <Link
                href={ivrFlowHref(flow._id)}
                className="group flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-4 transition-colors hover:border-cyan-500/30 hover:bg-[#0e162a] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                    <PhoneCall className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white group-hover:text-cyan-300">
                      {flow.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {flow.phoneNumber ?? "No number assigned"}
                      {flow.description ? ` · ${flow.description}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge
                    tone={flow.status === "published" ? "success" : "neutral"}
                  >
                    {flow.status === "published"
                      ? `Published v${flow.publishedVersion ?? "?"}`
                      : "Draft"}
                  </StatusBadge>
                  {flow.numberActive && (
                    <Badge className="border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                      Live number
                    </Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
