"use client";

/**
 * Resend connect — API key + verified from address.
 * Powers Forms notifications and Workflow "Send email" steps.
 */
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label } from "@bytecats/ui-kit";
import { Mail } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/kit";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

export function ResendConnectCard({ currentUserId }: { currentUserId: string }) {
  const statuses = useQuery(api.integrations.listStatuses, {});
  const completeSetup = useMutation(api.resend.completeResendSetup);
  const disconnect = useMutation(api.resend.disconnectResend);

  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const row = statuses?.find((s) => s.provider === "resend");
  const connected =
    row?.status === "connected" || row?.status === "configured";

  const handleConnect = async () => {
    setSaving(true);
    try {
      await completeSetup({ currentUserId, apiKey, fromEmail });
      toastMutationSuccess("Resend connected");
      setApiKey("");
      setFromEmail("");
      setExpanded(false);
    } catch (error) {
      toastMutationError(error, "Failed to connect Resend");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Disconnect Resend? Form notifications and Workflow email steps will stop until you reconnect.",
      )
    ) {
      return;
    }
    setDisconnecting(true);
    try {
      await disconnect({ currentUserId });
      toastMutationSuccess("Resend disconnected");
    } catch (error) {
      toastMutationError(error, "Failed to disconnect Resend");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#070b14] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Resend</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Transactional email for Forms, Workflows, and product alerts
              {row?.teamId ? ` · from ${row.teamId}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge tone={connected ? "success" : "neutral"}>
          {connected ? row?.status : "not configured"}
        </StatusBadge>
      </div>

      {expanded ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="resend-api-key">API key</Label>
            <Input
              id="resend-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="re_…"
              className="border-white/10 bg-[#0c1222] font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resend-from">From email</Label>
            <Input
              id="resend-from"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="Seridian <hello@yourdomain.com>"
              className="border-white/10 bg-[#0c1222] text-xs"
            />
            <p className="text-[11px] text-slate-500">
              Domain must be verified in{" "}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Resend → Domains
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                saving || apiKey.trim().length < 20 || fromEmail.trim().length < 5
              }
              onClick={() => void handleConnect()}
              className="bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10 text-xs"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-seridian-500 text-xs font-semibold text-slate-950 hover:bg-seridian-400"
            onClick={() => setExpanded(true)}
          >
            {connected ? "Update keys" : "Connect Resend"}
          </Button>
          {connected && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-500/20 text-xs text-red-300"
              disabled={disconnecting}
              onClick={() => void handleDisconnect()}
            >
              {disconnecting ? "Removing…" : "Disconnect"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
