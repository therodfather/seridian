"use client";

/**
 * Telnyx connect — steps: API key → Public key → Confirm.
 * Change labels in the expanded FlowSteps UI below.
 */
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label } from "@bytecats/ui-kit";
import { PhoneCall } from "lucide-react";
import { FlowSteps, StatusBadge } from "@/components/dashboard/kit";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ROUTES } from "@/lib/routes";

const TELNYX_STEPS = [
  { id: "api", label: "API key" },
  { id: "public", label: "Public key" },
  { id: "confirm", label: "Confirm" },
];

export function TelnyxConnectCard({ currentUserId }: { currentUserId: string }) {
  const statuses = useQuery(api.integrations.listStatuses, {});
  const completeSetup = useMutation(api.telnyx.completeTelnyxSetup);
  const disconnect = useMutation(api.telnyx.disconnectTelnyx);

  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState(0);
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
      setStep(0);
    } catch (error) {
      toastMutationError(error, "Failed to connect Telnyx");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Disconnect Telnyx? Inbound IVR numbers will stop working until you reconnect.",
      )
    ) {
      return;
    }
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
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#070b14] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <PhoneCall className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Telnyx</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Call Control API key + webhook public key for inbound IVR
            </p>
          </div>
        </div>
        <StatusBadge tone={connected ? "success" : "neutral"}>
          {connected ? row?.status : "not configured"}
        </StatusBadge>
      </div>

      {expanded ? (
        <div className="space-y-4">
          <FlowSteps steps={TELNYX_STEPS} current={step} onStepChange={setStep} />

          {step === 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="telnyx-api-key">API key</Label>
              <Input
                id="telnyx-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="KEY…"
                className="border-white/10 bg-[#0c1222] font-mono text-xs"
                autoComplete="off"
              />
              <Button
                type="button"
                size="sm"
                className="mt-2 bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                disabled={apiKey.trim().length < 20}
                onClick={() => setStep(1)}
              >
                Next
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="telnyx-public-key">Webhook public key</Label>
              <Input
                id="telnyx-public-key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Base64 Ed25519 public key"
                className="border-white/10 bg-[#0c1222] font-mono text-xs"
                autoComplete="off"
              />
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  disabled={publicKey.trim().length < 20}
                  onClick={() => setStep(2)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Portal → Auth → API Keys, and Account → Public Key. Build flows under{" "}
                <Link href={ROUTES.dashboard.ivr} className="text-cyan-400 hover:underline">
                  IVR / Voice
                </Link>
                .
              </p>
              <dl className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between gap-2">
                  <dt>API key</dt>
                  <dd className="font-mono text-slate-300">
                    {apiKey ? `${apiKey.slice(0, 6)}…` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Public key</dt>
                  <dd className="font-mono text-slate-300">
                    {publicKey ? `${publicKey.slice(0, 8)}…` : "—"}
                  </dd>
                </div>
              </dl>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || apiKey.trim().length < 20 || publicKey.trim().length < 20}
                  onClick={() => void handleConnect()}
                  className="bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  {saving ? "Saving…" : "Save keys"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-xs"
                  onClick={() => {
                    setExpanded(false);
                    setStep(0);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-seridian-500 text-xs font-semibold text-slate-950 hover:bg-seridian-400"
            onClick={() => {
              setExpanded(true);
              setStep(0);
            }}
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
