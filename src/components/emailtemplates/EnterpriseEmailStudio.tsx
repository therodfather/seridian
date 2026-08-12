"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import {
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Smartphone,
  Monitor,
  Eye,
  Code2,
  Copy,
  Check,
  Send,
  Plus,
  Trash2,
  Layers,
  Wand2,
  Variable,
  FileText,
} from "lucide-react";

type EmailTemplate = Doc<"emailTemplates">;
const CATEGORIES = ["proposal", "invoice", "follow_up", "welcome", "custom"] as const;

interface EnterpriseEmailStudioProps {
  template?: EmailTemplate;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  clientName: "Acme Corp",
  contactName: "Sarah Jenkins",
  proposalTitle: "Enterprise AI Transformation",
  amount: "$45,000",
  dueDate: "August 30, 2026",
  companyName: "Seridian Digital",
  supportEmail: "support@seridian.dev",
};

export function EnterpriseEmailStudio({
  template,
  onSaveSuccess,
  onCancel,
}: EnterpriseEmailStudioProps) {
  const createTemplate = useMutation(api.emailTemplates.create);
  const updateTemplate = useMutation(api.emailTemplates.update);

  // Form states
  const [activeStep, setActiveStep] = useState<"metadata" | "editor" | "preview">("editor");
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(
    template?.body ??
      `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #0891b2; margin: 0; font-size: 24px;">Seridian Notice</h1>
  </div>
  <p>Hi <strong>{{contactName}}</strong>,</p>
  <p>Thank you for choosing {{companyName}}! We are thrilled to kick off work on <strong>{{proposalTitle}}</strong>.</p>
  <p>Summary details:</p>
  <ul style="background: #f8fafc; padding: 16px 32px; border-radius: 8px;">
    <li>Client: {{clientName}}</li>
    <li>Total Investment: {{amount}}</li>
    <li>Due Date: {{dueDate}}</li>
  </ul>
  <p style="margin-top: 24px;">If you have any questions, reply directly or reach out to <a href="mailto:{{supportEmail}}" style="color: #06b6d4;">{{supportEmail}}</a>.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
  <p style="font-size: 12px; color: #94a3b8; text-align: center;">Sent via Seridian Enterprise Workflows</p>
</div>`
  );
  const [category, setCategory] = useState<typeof CATEGORIES[number]>(
    template?.category ?? "custom"
  );
  const [variablesInput, setVariablesInput] = useState(
    template?.variables?.length ? template.variables.join(", ") : "clientName, contactName, proposalTitle, amount, dueDate"
  );

  // Preview & Editor view controls
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Parsed variables
  const variablesList = useMemo(() => {
    return Array.from(
      new Set(
        variablesInput
          .split(",")
          .map((v) => v.trim().replace(/^\{\{|\}\}$/g, ""))
          .filter(Boolean)
      )
    );
  }, [variablesInput]);

  // Evaluated preview HTML & Subject
  const renderedSubject = useMemo(() => {
    let sub = subject;
    for (const key of variablesList) {
      const val = DEFAULT_SAMPLE_DATA[key] ?? `[${key}]`;
      sub = sub.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
    }
    return sub;
  }, [subject, variablesList]);

  const renderedBody = useMemo(() => {
    let content = body;
    for (const key of variablesList) {
      const val = DEFAULT_SAMPLE_DATA[key] ?? `<span style="background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 600;">{{${key}}}</span>`;
      content = content.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
    }
    return content;
  }, [body, variablesList]);

  // Insert Variable Pill into body
  function insertVariable(varName: string) {
    const pill = `{{${varName}}}`;
    setBody((prev) => prev + " " + pill);
  }

  // AI draft assistant simulation
  function handleGenerateAi() {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setTimeout(() => {
      if (aiPrompt.toLowerCase().includes("proposal")) {
        setSubject("Proposal & Scope of Work for {{proposalTitle}} - {{clientName}}");
        setBody(
          `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #0f172a;">
  <h2 style="color: #0284c7;">Proposal Submission: {{proposalTitle}}</h2>
  <p>Dear {{contactName}},</p>
  <p>We are excited to submit our formal proposal for <strong>{{proposalTitle}}</strong> at <strong>{{clientName}}</strong>.</p>
  <p>Total Estimated Scope: <strong>{{amount}}</strong></p>
  <p>Please review the details and let us know if you'd like to schedule a review session before {{dueDate}}.</p>
  <p>Best regards,<br/>The {{companyName}} Team</p>
</div>`
        );
      } else {
        setSubject("Update regarding {{proposalTitle}} for {{clientName}}");
        setBody(
          `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #0f172a;">
  <h2 style="color: #0891b2;">Follow-Up: {{proposalTitle}}</h2>
  <p>Hi {{contactName}},</p>
  <p>Following up on our recent discussion for {{clientName}} regarding {{proposalTitle}}.</p>
  <p>Please let us know if you have any questions prior to {{dueDate}}.</p>
</div>`
        );
      }
      setIsGeneratingAi(false);
      setAiPrompt("");
    }, 600);
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim()) return;
    setSaving(true);
    try {
      if (template) {
        await updateTemplate({
          templateId: template._id,
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category: category,
          variables: variablesList,
        });
      } else {
        await createTemplate({
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category: category,
          variables: variablesList,
          createdBy: "current-user",
        });
      }
      onSaveSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-[82vh] max-h-[900px] w-full bg-[#070b14] text-slate-100 rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Studio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#0c1222] px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                {template ? `Edit Template: ${template.name}` : "Enterprise Email Studio"}
              </h2>
              <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
                Live Preview
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Multi-step workflow, real-time dynamic tags & responsive engine
            </p>
          </div>
        </div>

        {/* Workflow Steps / Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveStep("metadata")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                activeStep === "metadata"
                  ? "bg-cyan-500 text-black shadow-md font-semibold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <FileText className="w-3.5 h-3.5" /> 1. Meta & Tags
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("editor")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                activeStep === "editor"
                  ? "bg-cyan-500 text-black shadow-md font-semibold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Code2 className="w-3.5 h-3.5" /> 2. Split Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("preview")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                activeStep === "preview"
                  ? "bg-cyan-500 text-black shadow-md font-semibold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Eye className="w-3.5 h-3.5" /> 3. Full Preview
            </button>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="border-white/10 text-slate-300">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !name.trim() || !subject.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-lg shadow-cyan-500/20"
          >
            {saving ? "Saving..." : template ? "Update Template" : "Publish Template"}
          </Button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* STEP 1: METADATA & TAG CONFIGURATION */}
        {activeStep === "metadata" && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl mx-auto w-full">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-white">Template Identification & Variables</h3>
              <p className="text-xs text-slate-400">Configure name, category, subject header, and dynamic variable tokens.</p>
            </div>

            <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Template Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Client Proposal"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Category</label>
                  <Select value={category} onValueChange={(v) => setCategory(v as typeof CATEGORIES[number])}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace(/_/g, " ").toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email Subject Header *</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Scope of Work for {{proposalTitle}} - {{clientName}}"
                  className="bg-white/5 border-white/10 text-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Dynamic Variables (comma-separated)</label>
                <Input
                  value={variablesInput}
                  onChange={(e) => setVariablesInput(e.target.value)}
                  placeholder="clientName, contactName, proposalTitle, amount"
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {variablesList.map((v) => (
                    <Badge key={v} variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5 text-xs py-0.5">
                      <Variable className="w-3 h-3 mr-1" /> {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Agent Quick Draft Assistant */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-6 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-sm font-semibold">AI Template Draft Assistant</h4>
              </div>
              <p className="text-xs text-slate-400">Prompt our AI agent to draft an enterprise template structure for proposals, onboarding, or follow-ups.</p>
              <div className="flex gap-2">
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Generate a high-touch sales proposal follow-up email"
                  className="bg-white/5 border-cyan-500/20 text-white text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateAi}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shrink-0"
                >
                  {isGeneratingAi ? "Generating..." : "Generate Draft"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SPLIT STUDIO (HTML / RICH CODE EDITOR + LIVE PREVIEW) */}
        {activeStep === "editor" && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* Left Pane: Editor */}
            <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#080d1a]">
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c1222] border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">HTML Source Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Insert Tag:</span>
                  <div className="flex flex-wrap gap-1 max-w-[240px] overflow-hidden">
                    {variablesList.slice(0, 3).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-mono"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Code Area */}
              <div className="flex-1 p-3">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter HTML template content..."
                  className="w-full h-full min-h-[400px] resize-none bg-[#040711] border-white/10 text-cyan-200 font-mono text-xs leading-relaxed p-4 rounded-lg focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Right Pane: Live Rendered Preview */}
            <div className="w-full md:w-1/2 flex flex-col bg-[#070b14]">
              {/* Live Preview Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c1222] border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Live Client Preview</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Evaluated
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeviceMode("desktop")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      deviceMode === "desktop" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
                    )}
                    title="Desktop Preview"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode("mobile")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      deviceMode === "mobile" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
                    )}
                    title="Mobile Viewport"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Window Canvas */}
              <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-[#060913]">
                <div
                  className={cn(
                    "transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/50",
                    deviceMode === "desktop" ? "w-full max-w-xl" : "w-[360px]"
                  )}
                >
                  {/* Fake Email Client Header */}
                  <div className="bg-slate-100 border-b border-slate-200 p-4 text-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>To: <strong>Sarah Jenkins &lt;sarah@acme.com&gt;</strong></span>
                      <span>Now</span>
                    </div>
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {renderedSubject || "(No Subject Set)"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      From: Seridian Sales &lt;sales@seridian.dev&gt;
                    </div>
                  </div>

                  {/* Rendered HTML */}
                  <div
                    className="p-6 overflow-y-auto text-slate-900 text-sm"
                    dangerouslySetInnerHTML={{ __html: renderedBody }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FULL PREVIEW & TEST DATA INSPECTOR */}
        {activeStep === "preview" && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-start bg-[#060913]">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 text-slate-900">
              <div className="bg-slate-100 border-b border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>To: <strong>sarah@acme.com</strong></span>
                  <Badge variant="outline" className="border-slate-300 text-slate-600 text-[10px]">
                    Enterprise Sandbox
                  </Badge>
                </div>
                <div className="font-bold text-slate-900 text-base">
                  {renderedSubject || "(No Subject Set)"}
                </div>
              </div>
              <div
                className="p-8 text-sm"
                dangerouslySetInnerHTML={{ __html: renderedBody }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
