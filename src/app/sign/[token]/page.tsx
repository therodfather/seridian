"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input } from "@bytecats/ui-kit";
import { toastMutationError } from "@/lib/mutationToast";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SignContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const contract = useQuery(api.contracts.getByToken, { token });
  const signByToken = useMutation(api.contracts.signByToken);

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const alreadySigned =
    contract !== undefined &&
    contract !== null &&
    (contract.status === "signed" ||
      contract.status === "active" ||
      contract.status === "completed" ||
      Boolean(contract.signedAt));

  const canSubmit =
    signerName.trim().length >= 2 &&
    signatureText.trim().length >= 2 &&
    agreed &&
    !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await signByToken({
        token,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
        signerTitle: signerTitle.trim() || undefined,
        signatureText: signatureText.trim(),
      });
      setSuccess(true);
    } catch (error) {
      toastMutationError(error, "Failed to sign contract");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-medium tracking-wider text-cyan-400 uppercase">
          Seridian
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Sign contract</h1>

        {contract === undefined ? (
          <div className="mt-8 space-y-3">
            <div className="h-8 w-48 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-40 animate-pulse rounded-lg bg-white/[0.03]" />
          </div>
        ) : contract === null ? (
          <p className="mt-8 text-sm text-slate-400">
            This signing link is invalid or expired
          </p>
        ) : success || alreadySigned ? (
          <div className="mt-8 rounded-xl border border-green-500/20 bg-green-500/5 p-6">
            <p className="text-sm font-medium text-green-400">
              This contract has been signed.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {contract.signerName ?? signerName}
              {contract.signedAt
                ? ` · ${formatDate(contract.signedAt)}`
                : success
                  ? " · Just now"
                  : ""}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-white/[0.06] bg-[#0c1222] p-4 sm:p-6">
              <h2 className="text-lg font-semibold">{contract.name}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {contract.clientName}
                {contract.clientCompany ? ` · ${contract.clientCompany}` : ""}
              </p>
              <p className="mt-3 text-xl font-bold tabular-nums">
                {formatCurrency(contract.value)}
              </p>
              {contract.body && (
                <div className="mt-4 whitespace-pre-wrap rounded-lg bg-white/[0.02] p-3 text-sm leading-relaxed text-slate-300 sm:p-4">
                  {contract.body}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="signerName" className="text-xs text-slate-400">
                  Full legal name <span className="text-red-400">*</span>
                </label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Jordan Lee"
                  autoComplete="name"
                  className="border-white/10 bg-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signerEmail" className="text-xs text-slate-400">
                  Email
                </label>
                <Input
                  id="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="border-white/10 bg-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signerTitle" className="text-xs text-slate-400">
                  Title
                </label>
                <Input
                  id="signerTitle"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="Director of Engineering"
                  autoComplete="organization-title"
                  className="border-white/10 bg-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signatureText" className="text-xs text-slate-400">
                  Signature (type your legal name){" "}
                  <span className="text-red-400">*</span>
                </label>
                <Input
                  id="signatureText"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Type your full legal name"
                  className="border-white/10 bg-white/5 font-serif italic"
                />
              </div>
              <label className="flex items-start gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-cyan-500"
                />
                <span>I agree this typed name is my signature</span>
              </label>
              <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                {submitting ? "Signing..." : "Sign contract"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
