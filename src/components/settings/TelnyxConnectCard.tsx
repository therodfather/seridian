"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label } from "@bytecats/ui-kit";
import { PhoneCall } from "lucide-react";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ROUTES } from "@/lib/routes";

export function TelnyxConnectCard({ currentUserId }: { currentUserId: string }) {
  const statuses = useQuery(api.integrations.listStatuses, {});
  const completeSetup = useMutation(api.telnyx.completeTelnyxSetup);
  const disconnect = useMutation(api.telnyx.disconnectTelnyx);

  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const row = statuses?.find((s) => s.provider === "telnyx");
  const connected =
    row?.status === "connected" || row?.status === "configured";

  const handleConnect = async () => {
    setSaving(true);
    try {
      await completeSetup({ currentUserId, apiKey, publicKey });
      toastMutationSuccess("Telnyx connected");
      setApiKey("");
      setPublicKey("");
      setExpanded(false);
    } catch (error) {
      toastMutationError(error, "Failed to connect Telnyx");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect({ currentUserId });
      toastMutationSuccess("Telnyx disconnected");
    } catch (error) {
      toastMutationError(error, "Failed to disconnect Telnyx");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#070b14] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <PhoneCall className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Telnyx</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Call Control API key + webhook public key for inbound IVR
            </p>
          </div>
        </div>
        <span
          className={
            connected
              ? "inline-flex rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"
              : "inline-flex rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          }
        >
          {connected ? row?.status : "not configured"}
        </span>
      </div>

      {expanded ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="telnyx-api-key">API key</Label>
            <Input
              id="telnyx-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="KEY…"
              className="bg-[#0c1222] border-white/10 font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telnyx-public-key">Webhook public key</Label>
            <Input
              id="telnyx-public-key"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="Base64 Ed25519 public key"
              className="bg-[#0c1222] border-white/10 font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Portal → Auth → API Keys, and Account → Public Key. Build flows under{" "}
            <Link href={ROUTES.dashboard.ivr} className="text-cyan-400 hover:underline">
              IVR / Voice
            </Link>
            .
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving || apiKey.trim().length < 20 || publicKey.trim().length < 20}
              onClick={() => void handleConnect()}
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold text-xs"
            >
              {saving ? "Saving…" : "Save keys"}
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
            className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 font-semibold text-xs"
            onClick={() => setExpanded(true)}
          >
            {connected ? "Update keys" : "Connect Telnyx"}
          </Button>
          <Button asChild size="sm" variant="outline" className="border-white/10 text-xs">
            <Link href={ROUTES.dashboard.ivr}>Open IVR builder</Link>
          </Button>
          {connected && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-500/20 text-red-300 text-xs"
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
