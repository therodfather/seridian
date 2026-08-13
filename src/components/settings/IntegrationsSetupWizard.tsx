"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label } from "@bytecats/ui-kit";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Provider = "github" | "netlify" | "linear";
type SetupStep = 1 | 2 | 3;

const PROVIDER_META: Record<
  Provider,
  { title: string; blurb: string; mode: "links" | "connect" }
> = {
  github: {
    title: "GitHub",
    blurb: "Source of truth for code and issues. Links only — no OAuth in this MVP.",
    mode: "links",
  },
  netlify: {
    title: "Netlify",
    blurb: "Production deploys for seridian.netlify.app. Links only.",
    mode: "links",
  },
  linear: {
    title: "Linear",
    blurb: "Trial issue sync. Stores API key in Convex vault (not Netlify env).",
    mode: "connect",
  },
};

function statusBadge(status: string, hasSecret?: boolean) {
  if (status === "connected" || (status === "configured" && hasSecret !== false)) {
    if (status === "connected") {
      return {
        label: "Connected",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      };
    }
    return {
      label: "Configured",
      className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    };
  }
  if (status === "configured") {
    return {
      label: "Configured",
      className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    };
  }
  return {
    label: "Not configured",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };
}

export function IntegrationsSetupWizard({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const statuses = useQuery(api.integrations.listStatuses);
  const setEnabledProviders = useMutation(api.integrations.setEnabledProviders);
  const completeLinearSetup = useMutation(api.integrations.completeLinearSetup);
  const disconnectLinear = useMutation(api.integrations.disconnectLinear);

  const [step, setStep] = useState<SetupStep>(1);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selected, setSelected] = useState<Provider[]>(["github", "netlify"]);
  const [apiKey, setApiKey] = useState("");
  const [teamId, setTeamId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMasked, setDoneMasked] = useState<string | null>(null);

  const linear = useMemo(
    () => statuses?.find((s) => s.provider === "linear"),
    [statuses],
  );

  useEffect(() => {
    if (!statuses) return;
    const enabled = statuses.filter((s) => s.enabled).map((s) => s.provider);
    if (enabled.length > 0) setSelected(enabled as Provider[]);
    if (linear?.teamId) setTeamId(linear.teamId);
    if (linear?.projectId) setProjectId(linear.projectId);
  }, [statuses, linear?.teamId, linear?.projectId]);

  function toggleProvider(provider: Provider) {
    setSelected((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider],
    );
  }

  async function handleStep1Next() {
    setSaving(true);
    setError(null);
    try {
      await setEnabledProviders({
        currentUserId,
        providers: selected,
      });
      if (selected.includes("linear") && linear?.status !== "connected") {
        setStep(2);
      } else {
        setStep(3);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save selection");
    } finally {
      setSaving(false);
    }
  }

  async function handleLinearConnect() {
    setSaving(true);
    setError(null);
    try {
      const result = await completeLinearSetup({
        currentUserId,
        apiKey,
        teamId: teamId.trim() || undefined,
        projectId: projectId.trim() || undefined,
      });
      setDoneMasked(result.maskedValue);
      setApiKey("");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Linear key");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    setError(null);
    try {
      await disconnectLinear({ currentUserId });
      setDoneMasked(null);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setSaving(false);
    }
  }

  function openWizard() {
    setWizardOpen(true);
    setStep(1);
    setError(null);
    setDoneMasked(null);
    setApiKey("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            Admin setup
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Multi-step enablement for integrations. Linear stores its API key in the
            Convex secrets vault — prefer this wizard over Netlify or{" "}
            <code className="text-slate-500">convex env set</code> (deprecated fallback).
          </p>
        </div>
        <Button
          size="sm"
          onClick={openWizard}
          className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 font-semibold text-xs"
        >
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          {linear?.status === "connected" ? "Manage setup" : "Start setup"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {(
          statuses?.filter(
            (row): row is typeof row & { provider: Provider } =>
              row.provider === "github" ||
              row.provider === "netlify" ||
              row.provider === "linear",
          ) ?? [
            { provider: "github" as const, enabled: true, status: "configured" as const, hasSecret: false },
            { provider: "netlify" as const, enabled: true, status: "configured" as const, hasSecret: false },
            { provider: "linear" as const, enabled: false, status: "not_configured" as const, hasSecret: false },
          ]
        ).map((row) => {
          const meta = PROVIDER_META[row.provider];
          const badge = statusBadge(row.status, row.hasSecret);
          return (
            <div
              key={row.provider}
              className="rounded-xl border border-white/[0.08] bg-[#070b14] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {row.provider === "github" ? (
                    <GitBranch className="h-4 w-4 text-cyan-400" />
                  ) : row.provider === "netlify" ? (
                    <Globe className="h-4 w-4 text-cyan-400" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm font-semibold text-white">{meta.title}</span>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{meta.blurb}</p>
              {row.provider === "linear" && row.status !== "connected" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openWizard}
                  className="border-white/10 text-slate-300 hover:bg-white/5 text-xs h-7"
                >
                  Setup
                </Button>
              )}
              {row.provider === "linear" && row.status === "connected" && (
                <p className="text-[11px] font-mono text-slate-600">
                  Vault key present{row.teamId ? ` · team ${row.teamId}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {wizardOpen && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <StepPill n={1} active={step === 1} done={step > 1} label="Choose" />
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <StepPill n={2} active={step === 2} done={step > 2} label="Linear key" />
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <StepPill n={3} active={step === 3} done={false} label="Confirm" />
            </div>
            <button
              type="button"
              onClick={() => setWizardOpen(false)}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              Close
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Select which integrations this workspace should use. Link-only
                tools do not collect secrets.
              </p>
              <div className="space-y-2">
                {(Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
                  const meta = PROVIDER_META[provider];
                  const checked = selected.includes(provider);
                  return (
                    <label
                      key={provider}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                        checked
                          ? "border-seridian-500/30 bg-seridian-500/5"
                          : "border-white/[0.06] bg-[#070b14]/60 hover:border-white/10",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProvider(provider)}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {meta.title}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-500">
                            {meta.mode === "links" ? "Links" : "Connect"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{meta.blurb}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={handleStep1Next}
                  disabled={saving || selected.length === 0}
                  className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 text-xs"
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <KeyRound className="h-4 w-4 text-cyan-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Connect Linear</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Create a personal API key in Linear → Settings → API. The key
                    is saved to the Convex secrets table (ciphertext field) and is
                    never returned to the browser after save.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Linear API key *</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="lin_api_..."
                  className="bg-white/5 border-white/10 text-xs font-mono"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Team ID (optional)</Label>
                  <Input
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    placeholder="Linear team UUID"
                    className="bg-white/5 border-white/10 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Project ID (optional)</Label>
                  <Input
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="Linear project UUID"
                    className="bg-white/5 border-white/10 text-xs font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <Link2 className="h-3 w-3" />
                Prefer this UI over Netlify env vars. Env fallback still works during migration.
              </p>
              <div className="flex justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={saving}
                  className="text-slate-400 text-xs"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleLinearConnect}
                  disabled={saving || !apiKey.trim()}
                  className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 text-xs"
                >
                  {saving ? "Saving…" : "Save & connect"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Setup saved</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {doneMasked
                      ? `Linear key stored as ${doneMasked}. Sync will prefer the vault over env.`
                      : linear?.status === "connected"
                        ? "Linear is connected from a previous setup."
                        : "Selection saved. Enable Linear and paste an API key when you are ready to sync."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-slate-400 text-xs"
                >
                  Run again
                </Button>
                <div className="flex gap-2">
                  {linear?.status === "connected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={saving}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      Disconnect Linear
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setWizardOpen(false)}
                    className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 text-xs"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepPill({
  n,
  active,
  done,
  label,
}: {
  n: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        active
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          : done
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : "border-white/10 text-slate-500",
      )}
    >
      <span className="tabular-nums">{n}</span>
      {label}
    </span>
  );
}
