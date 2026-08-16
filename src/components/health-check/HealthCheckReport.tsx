"use client";

import { useEffect, useState } from "react";
import { Button, Input, Textarea } from "@bytecats/ui-kit";
import { ClipboardCheck, Plus, Printer, Trash2 } from "lucide-react";
import { Field, FormGrid } from "@/components/ui/form";
import { FlowSteps, PageShell } from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";
import {
  FINDING_SECTIONS,
  HEALTH_CHECK_SOW,
  type FindingSeverity,
  type HealthCheckDraft,
  type HealthCheckFinding,
  clearHealthCheckDraft,
  createFinding,
  emptyHealthCheckDraft,
  loadHealthCheckDraft,
  saveHealthCheckDraft,
} from "@/lib/healthCheckReport";

const fieldClass = "bg-white/5 border-white/10";

export function HealthCheckReport() {
  const [draft, setDraft] = useState<HealthCheckDraft>(emptyHealthCheckDraft);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setDraft(loadHealthCheckDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveHealthCheckDraft(draft);
  }, [draft, hydrated]);

  const handlePrint = () => window.print();

  const handleClear = () => {
    clearHealthCheckDraft();
    setDraft(emptyHealthCheckDraft());
  };

  const handleMeta = (
    key:
      | "clientName"
      | "contactName"
      | "preparedBy"
      | "date"
      | "accessNotes"
      | "costSavings"
      | "plan30"
      | "plan60"
      | "plan90",
    value: string,
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleFindings = (
    severity: FindingSeverity,
    rows: HealthCheckFinding[],
  ) => {
    setDraft((prev) => ({ ...prev, [severity]: rows }));
  };

  const HEALTH_STEPS = [
    { id: "client", label: "Client", description: "Who the report is for." },
    { id: "findings", label: "Findings", description: "Critical / High / Recommended / Doing well." },
    { id: "plan", label: "30/60/90", description: "Remediation plan and cost savings." },
    { id: "print", label: "Print", description: "Review the full page, then print." },
  ];

  const showAllSteps = step === 3;
  const showClient = showAllSteps || step === 0;
  const showFindings = showAllSteps || step === 1;
  const showPlan = showAllSteps || step === 2;

  return (
    <PageShell
      title="Health Check"
      description="One-page Cloud/SRE report. Fill, print, hand to the client in 3–5 days."
      icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
      action={
        <div className="print:hidden flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            Clear draft
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-seridian-500 text-slate-950 hover:bg-seridian-400"
          >
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Print report
          </Button>
        </div>
      }
    >
      <div className="print:hidden">
        <FlowSteps steps={HEALTH_STEPS} current={step} onStepChange={setStep} />
        {HEALTH_STEPS[step]?.description && (
          <p className="mt-2 text-xs text-slate-500">{HEALTH_STEPS[step].description}</p>
        )}
      </div>

      <article className="health-check-report space-y-6 rounded-2xl border border-white/[0.08] bg-[#0c1222] p-5 sm:p-8 print:border-0 print:bg-white print:p-0">
        <header className="space-y-1 border-b border-white/[0.08] pb-4 print:border-slate-300">
          <p className="font-mono text-[11px] uppercase tracking-wider text-seridian-400 print:text-slate-600">
            Seridian Digital
          </p>
          <h2 className="font-display text-2xl font-bold text-white print:text-black">
            Cloud &amp; Infrastructure Health Check
          </h2>
          <p className="text-sm text-slate-400 print:text-slate-600">
            {HEALTH_CHECK_SOW.package}
          </p>
        </header>

        <section
          aria-labelledby="sow-lite-heading"
          className={cn("space-y-3", !showClient && "hidden print:block")}
        >
          <h3
            id="sow-lite-heading"
            className="font-mono text-xs font-medium uppercase tracking-wider text-slate-500"
          >
            SOW Lite
          </h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <SowRow term="Scope" detail={HEALTH_CHECK_SOW.scope} />
            <SowRow term="Deliverable" detail={HEALTH_CHECK_SOW.deliverable} />
            <SowRow term="Timeline" detail={HEALTH_CHECK_SOW.timeline} />
            <SowRow term="Out of scope" detail={HEALTH_CHECK_SOW.outOfScope} />
            <SowRow term="Access" detail={HEALTH_CHECK_SOW.access} />
            <SowRow term="Valid" detail={HEALTH_CHECK_SOW.valid} />
          </dl>
        </section>

        <div className={cn(!showClient && "hidden print:block")}>
          <FormGrid cols={2}>
            <Field label="Client">
              <Input
                value={draft.clientName}
                onChange={(event) => handleMeta("clientName", event.target.value)}
                placeholder="Company name"
                className={fieldClass}
              />
            </Field>
            <Field label="Contact">
              <Input
                value={draft.contactName}
                onChange={(event) => handleMeta("contactName", event.target.value)}
                placeholder="Primary contact"
                className={fieldClass}
              />
            </Field>
            <Field label="Prepared by">
              <Input
                value={draft.preparedBy}
                onChange={(event) => handleMeta("preparedBy", event.target.value)}
                placeholder="Reviewer"
                className={fieldClass}
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={draft.date}
                onChange={(event) => handleMeta("date", event.target.value)}
                className={fieldClass}
              />
            </Field>
          </FormGrid>

          <Field label="Access reviewed" className="mt-4">
            <Input
              value={draft.accessNotes}
              onChange={(event) => handleMeta("accessNotes", event.target.value)}
              placeholder="Cloud account, repo, staging URL"
              className={fieldClass}
            />
          </Field>
        </div>

        <div className={cn("space-y-6", !showFindings && "hidden print:block")}>
          {FINDING_SECTIONS.map((section) => (
            <FindingList
              key={section.key}
              section={section}
              findings={draft[section.key]}
              onChange={(rows) => handleFindings(section.key, rows)}
            />
          ))}
        </div>

        <div className={cn("space-y-6", !showPlan && "hidden print:block")}>
          <section
            aria-labelledby="cost-savings-heading"
            className="space-y-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"
          >
            <h3
              id="cost-savings-heading"
              className="font-mono text-xs font-medium uppercase tracking-wider text-cyan-300"
            >
              💰 Cost savings
            </h3>
            <Textarea
              value={draft.costSavings}
              onChange={(event) => handleMeta("costSavings", event.target.value)}
              placeholder="Idle resources, over-provisioned SKUs, unused reserved capacity…"
              rows={3}
              className={fieldClass}
            />
          </section>

          <section aria-labelledby="plan-heading" className="space-y-3">
            <h3
              id="plan-heading"
              className="font-mono text-xs font-medium uppercase tracking-wider text-slate-500"
            >
              📋 30 / 60 / 90-day remediation plan
            </h3>
            <Field label="Next 30 days">
              <Textarea
                value={draft.plan30}
                onChange={(event) => handleMeta("plan30", event.target.value)}
                placeholder="Critical fixes and the first High items"
                rows={3}
                className={fieldClass}
              />
            </Field>
            <Field label="Days 31–60">
              <Textarea
                value={draft.plan60}
                onChange={(event) => handleMeta("plan60", event.target.value)}
                placeholder="Remaining High items and CI/CD or backup work"
                rows={3}
                className={fieldClass}
              />
            </Field>
            <Field label="Days 61–90">
              <Textarea
                value={draft.plan90}
                onChange={(event) => handleMeta("plan90", event.target.value)}
                placeholder="Recommended hygiene and cost work"
                rows={3}
                className={fieldClass}
              />
            </Field>
          </section>
        </div>

        <p className="text-xs leading-relaxed text-slate-500 print:text-slate-600">
          Implementing fixes is out of scope for this Health Check. Remediation
          is a separate CI/CD or feature sprint, scoped from this report.
        </p>
      </article>
    </PageShell>
  );
}

function SowRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 print:border-slate-200">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {term}
      </dt>
      <dd className="mt-0.5 text-slate-300 print:text-slate-800">{detail}</dd>
    </div>
  );
}

function FindingList({
  section,
  findings,
  onChange,
}: {
  section: (typeof FINDING_SECTIONS)[number];
  findings: HealthCheckFinding[];
  onChange: (rows: HealthCheckFinding[]) => void;
}) {
  const handleAdd = () => onChange([...findings, createFinding()]);

  const handleRemove = (id: string) => {
    const next = findings.filter((row) => row.id !== id);
    onChange(next.length > 0 ? next : [createFinding()]);
  };

  const handleUpdate = (
    id: string,
    key: "title" | "detail",
    value: string,
  ) => {
    onChange(
      findings.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  };

  return (
    <section
      aria-labelledby={`${section.key}-heading`}
      className={cn("space-y-3 rounded-xl border p-4", section.accent)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id={`${section.key}-heading`}
            className="text-sm font-semibold text-white print:text-black"
          >
            {section.marker} {section.label}
          </h3>
          <p className="text-xs text-slate-400 print:text-slate-600">
            {section.hint}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className="print:hidden h-8 text-slate-300 hover:text-white"
          aria-label={`Add ${section.label} finding`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <ul className="space-y-3">
        {findings.map((finding, index) => (
          <li key={finding.id} className="flex gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                value={finding.title}
                onChange={(event) =>
                  handleUpdate(finding.id, "title", event.target.value)
                }
                placeholder={`${section.label} finding ${index + 1}`}
                aria-label={`${section.label} finding ${index + 1} title`}
                className={fieldClass}
              />
              <Textarea
                value={finding.detail}
                onChange={(event) =>
                  handleUpdate(finding.id, "detail", event.target.value)
                }
                placeholder="Evidence, impact, and the fix"
                aria-label={`${section.label} finding ${index + 1} detail`}
                rows={2}
                className={fieldClass}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(finding.id)}
              className="print:hidden mt-1 h-8 shrink-0 text-slate-500 hover:text-red-400"
              aria-label={`Remove ${section.label} finding ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
