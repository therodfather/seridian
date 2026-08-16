/**
 * Knowledge setup — Create wiki space → Import company knowledge → Open wiki.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button, Input, Label } from "@bytecats/ui-kit";
import { PageFlow } from "@/components/dashboard/kit";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ROUTES } from "@/lib/routes";

const STEPS = [
  {
    id: "space",
    label: "Create space",
    description: "Name a wiki / memory bank for company knowledge.",
  },
  {
    id: "import",
    label: "Import",
    description: "Optionally load Seridian company starter pages.",
  },
  {
    id: "done",
    label: "Open",
    description: "Jump into the wiki to edit pages.",
  },
];

interface KnowledgeSetupFlowProps {
  onDone: () => void;
  onCancel?: () => void;
}

export function KnowledgeSetupFlow({ onDone, onCancel }: KnowledgeSetupFlowProps) {
  const { user } = useDashboardAuth();
  const createBank = useMutation(api.memory.createBank);
  const seedKnowledge = useMutation(api.wikiSeed.seedCompanyKnowledge);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [bankId, setBankId] = useState<Id<"memoryBanks"> | null>(null);
  const [name, setName] = useState("Company Wiki");
  const [mission, setMission] = useState("Capture how we work and what we know.");
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const handleCreateSpace = async () => {
    if (!name.trim()) {
      setError("Space name is required");
      return;
    }
    if (!user?.pubkey) {
      setError("Sign in required");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const id = await createBank({
        name: name.trim(),
        mission: mission.trim() || "Company knowledge",
        directives: ["Prefer accurate, current facts", "Link to source docs when possible"],
        disposition: { skepticism: 0.4, literalism: 0.6, empathy: 0.5 },
        createdBy: user.pubkey,
      });
      setBankId(id);
      toastMutationSuccess("Wiki space created");
      setStep(1);
    } catch (err) {
      toastMutationError(err, "Could not create space");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await seedKnowledge({ lastEditedBy: user?.pubkey ?? "dashboard-user" });
      setBankId(result.bankId);
      setImportSummary(
        `Loaded ${result.pagesUpserted} pages` +
          (result.memoriesAdded > 0 ? ` and ${result.memoriesAdded} facts` : ""),
      );
      toastMutationSuccess("Company knowledge imported");
      setStep(2);
    } catch (err) {
      toastMutationError(err, "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFlow
      steps={STEPS}
      current={step}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              className="text-slate-400"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : (
            <span />
          )}
          {step === 1 && (
            <Button
              type="button"
              variant="outline"
              className="border-white/10 text-xs"
              disabled={busy}
              onClick={() => setStep(2)}
            >
              Skip import
            </Button>
          )}
        </div>
      }
    >
      {step === 0 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="know-space-name">Space name</Label>
            <Input
              id="know-space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-white/10 bg-[#070b14]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="know-mission">Mission</Label>
            <Input
              id="know-mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="border-white/10 bg-[#070b14]"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
            onClick={() => void handleCreateSpace()}
          >
            {busy ? "Creating…" : "Create space"}
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Import starter SOPs and company pages into the wiki. Safe to re-run — upserts by title.
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
            onClick={() => void handleImport()}
          >
            {busy ? "Importing…" : "Import company knowledge"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {importSummary && (
            <p className="text-xs text-emerald-400" role="status">
              {importSummary}
            </p>
          )}
          {bankId && (
            <p className="text-xs text-slate-500">
              Space id ready. Open the wiki to edit pages.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400">
              <Link href={ROUTES.dashboard.wiki} onClick={onDone}>
                Open wiki
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/10">
              <Link href={ROUTES.dashboard.brain} onClick={onDone}>
                Open second brain
              </Link>
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-slate-400" onClick={onDone}>
              Done
            </Button>
          </div>
        </div>
      )}
    </PageFlow>
  );
}
