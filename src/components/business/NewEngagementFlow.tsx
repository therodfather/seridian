/**
 * New engagement — Client → Proposal → Deal.
 * Keeps required fields gated so you cannot publish empty shells.
 */
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button, Input, Label } from "@bytecats/ui-kit";
import { PageFlow } from "@/components/dashboard/kit";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { clientHref, proposalHref, ROUTES } from "@/lib/routes";
import Link from "next/link";

const STEPS = [
  { id: "client", label: "Client", description: "Who are you engaging?" },
  { id: "proposal", label: "Proposal", description: "Optional draft scope (you can skip)." },
  { id: "deal", label: "Deal", description: "Pipeline entry linked to the client." },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NewEngagementFlowProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function NewEngagementFlow({ onSuccess, onCancel }: NewEngagementFlowProps) {
  const { user } = useDashboardAuth();
  const createClient = useMutation(api.clients.create);
  const createProposal = useMutation(api.proposals.create);
  const createDeal = useMutation(api.deals.create);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState<Id<"clients"> | null>(null);
  const [proposalId, setProposalId] = useState<Id<"proposals"> | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalValue, setProposalValue] = useState("");
  const [proposalError, setProposalError] = useState<string | null>(null);

  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealError, setDealError] = useState<string | null>(null);

  const handleCreateClient = async () => {
    const nextError =
      !name.trim()
        ? "Name is required"
        : !company.trim()
          ? "Company is required"
          : !email.trim()
            ? "Email is required"
            : !EMAIL_RE.test(email.trim())
              ? "Enter a valid email"
              : null;
    setClientError(nextError);
    if (nextError) return;

    setBusy(true);
    try {
      const id = await createClient({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        status: "active",
      });
      setClientId(id);
      if (!dealName.trim()) setDealName(`${company.trim()} — engagement`);
      if (!proposalTitle.trim()) setProposalTitle(`${company.trim()} — proposal`);
      toastMutationSuccess("Client created");
      setStep(1);
    } catch (error) {
      toastMutationError(error, "Could not create client");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!clientId || !user?.pubkey) return;
    if (!proposalTitle.trim()) {
      setProposalError("Title is required (or skip this step)");
      return;
    }
    setProposalError(null);
    setBusy(true);
    try {
      const value = proposalValue.trim() ? Number(proposalValue) : undefined;
      if (proposalValue.trim() && (Number.isNaN(value) || (value ?? 0) < 0)) {
        setProposalError("Value must be a non-negative number");
        setBusy(false);
        return;
      }
      const id = await createProposal({
        title: proposalTitle.trim(),
        clientId,
        content: `# ${proposalTitle.trim()}\n\nDraft created from New engagement.`,
        status: "draft",
        value,
        createdBy: user.pubkey,
      });
      setProposalId(id);
      toastMutationSuccess("Draft proposal created");
      setStep(2);
    } catch (error) {
      toastMutationError(error, "Could not create proposal");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!clientId) return;
    if (!dealName.trim()) {
      setDealError("Deal name is required");
      return;
    }
    const value = Number(dealValue);
    if (!dealValue.trim() || Number.isNaN(value) || value < 0) {
      setDealError("Enter a non-negative deal value");
      return;
    }
    setDealError(null);
    setBusy(true);
    try {
      await createDeal({
        name: dealName.trim(),
        clientId,
        value,
        stage: "lead",
        probability: 20,
        contactEmail: email.trim() || undefined,
      });
      toastMutationSuccess("Deal added to pipeline");
      onSuccess();
    } catch (error) {
      toastMutationError(error, "Could not create deal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFlow
      steps={STEPS}
      current={step}
      footer={
        <>
          <div>
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {step === 1 && (
              <Button
                type="button"
                variant="outline"
                className="border-white/10 text-xs"
                disabled={busy || !clientId}
                onClick={() => setStep(2)}
              >
                Skip proposal
              </Button>
            )}
            {step === 2 && clientId && (
              <Button
                type="button"
                variant="outline"
                className="border-white/10 text-xs"
                disabled={busy}
                onClick={onSuccess}
              >
                Skip deal & finish
              </Button>
            )}
          </div>
        </>
      }
    >
      {step === 0 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="eng-name">Contact name</Label>
            <Input
              id="eng-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-white/10 bg-[#070b14]"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eng-company">Company</Label>
            <Input
              id="eng-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="border-white/10 bg-[#070b14]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eng-email">Email</Label>
            <Input
              id="eng-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/10 bg-[#070b14]"
              autoComplete="email"
            />
          </div>
          {clientError && (
            <p role="alert" className="text-xs text-red-400">
              {clientError}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
            onClick={() => void handleCreateClient()}
          >
            {busy ? "Saving…" : "Create client & continue"}
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {clientId && (
            <p className="text-xs text-slate-500">
              Client ready —{" "}
              <Link href={clientHref(clientId)} className="text-cyan-400 hover:underline">
                open record
              </Link>
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="eng-prop-title">Proposal title</Label>
            <Input
              id="eng-prop-title"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              className="border-white/10 bg-[#070b14]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eng-prop-value">Value (optional)</Label>
            <Input
              id="eng-prop-value"
              type="number"
              min={0}
              value={proposalValue}
              onChange={(e) => setProposalValue(e.target.value)}
              className="border-white/10 bg-[#070b14]"
            />
          </div>
          {proposalError && (
            <p role="alert" className="text-xs text-red-400">
              {proposalError}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={busy || !clientId}
            className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
            onClick={() => void handleCreateProposal()}
          >
            {busy ? "Saving…" : "Create draft proposal"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {proposalId && (
            <p className="text-xs text-slate-500">
              Proposal draft —{" "}
              <Link href={proposalHref(proposalId)} className="text-cyan-400 hover:underline">
                open proposal
              </Link>
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="eng-deal-name">Deal name</Label>
            <Input
              id="eng-deal-name"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="border-white/10 bg-[#070b14]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eng-deal-value">Deal value</Label>
            <Input
              id="eng-deal-value"
              type="number"
              min={0}
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              className="border-white/10 bg-[#070b14]"
            />
          </div>
          {dealError && (
            <p role="alert" className="text-xs text-red-400">
              {dealError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !clientId}
              className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
              onClick={() => void handleCreateDeal()}
            >
              {busy ? "Saving…" : "Add deal & finish"}
            </Button>
            <Button asChild type="button" size="sm" variant="outline" className="border-white/10">
              <Link href={ROUTES.dashboard.sales}>Open sales</Link>
            </Button>
          </div>
        </div>
      )}
    </PageFlow>
  );
}
