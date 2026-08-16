"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label } from "@bytecats/ui-kit";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

type Provider = "stripe" | "mercury";

interface SecretConnectCardProps {
  provider: Provider;
  title: string;
  description: string;
  icon: React.ReactNode;
  fieldLabel: string;
  fieldPlaceholder: string;
  helpText: string;
  helpHref: string;
  currentUserId: string;
}

/**
 * One-field connect/disconnect card for integrations that only need a single
 * pasted credential (no OAuth, no multi-step wizard) — the value is stored
 * in the same Convex secrets vault the Linear integration uses.
 */
export function SecretConnectCard({
  provider,
  title,
  description,
  icon,
  fieldLabel,
  fieldPlaceholder,
  helpText,
  helpHref,
  currentUserId,
}: SecretConnectCardProps) {
  const statuses = useQuery(api.integrations.listStatuses, {});
  const completeStripeSetup = useMutation(api.integrations.completeStripeSetup);
  const disconnectStripe = useMutation(api.integrations.disconnectStripe);
  const completeMercurySetup = useMutation(api.integrations.completeMercurySetup);
  const disconnectMercury = useMutation(api.integrations.disconnectMercury);

  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const row = statuses?.find((s) => s.provider === provider);
  const connected = row?.status === "connected";

  async function handleConnect() {
    setSaving(true);
    try {
      if (provider === "stripe") {
        await completeStripeSetup({ currentUserId, webhookSecret: value });
      } else {
        await completeMercurySetup({ currentUserId, apiToken: value });
      }
      toastMutationSuccess(`${title} connected`);
      setValue("");
      setExpanded(false);
    } catch (error) {
      toastMutationError(error, `Failed to connect ${title}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        `Disconnect ${title}? Stored credentials will be removed from the vault.`,
      )
    ) {
      return;
    }
    setDisconnecting(true);
    try {
      if (provider === "stripe") {
        await disconnectStripe({ currentUserId });
      } else {
        await disconnectMercury({ currentUserId });
      }
      toastMutationSuccess(`${title} disconnected`);
    } catch (error) {
      toastMutationError(error, `Failed to disconnect ${title}`);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#070b14] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <span
          className={
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
            (connected
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-white/[0.03] text-slate-500")
          }
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {connected ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disconnecting}
          onClick={handleDisconnect}
          className="border-red-500/20 text-red-300 hover:bg-red-500/10 text-xs"
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </Button>
      ) : expanded ? (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400">{fieldLabel}</Label>
            <Input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={fieldPlaceholder}
              className="mt-1.5 bg-white/[0.02] border-white/10 text-sm text-white"
              autoComplete="off"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              {helpText}{" "}
              <a
                href={helpHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Get it here
              </a>
              .
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving || value.trim().length === 0}
              onClick={handleConnect}
              className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 font-semibold text-xs"
            >
              {saving ? "Connecting…" : "Save & connect"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setExpanded(false);
                setValue("");
              }}
              className="text-slate-400 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          onClick={() => setExpanded(true)}
          className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 font-semibold text-xs"
        >
          Connect
        </Button>
      )}
    </div>
  );
}
