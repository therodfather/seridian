"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { GridBackground } from "@/components/three/backgrounds";
import {
  Wand2,
  Sparkles,
  Monitor,
  Smartphone,
  Code2,
  Eye,
  Plus,
  ArrowLeft,
  Variable,
  Sliders,
  Search,
  Copy,
  Trash2,
} from "lucide-react";

type EmailTemplate = Doc<"emailTemplates">;
const CATEGORIES = ["proposal", "invoice", "follow_up", "welcome", "custom"] as const;

const categoryConfig: Record<string, { color: string; label: string }> = {
  proposal: { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Proposal" },
  invoice: { color: "bg-green-500/15 text-green-400 border-green-500/20", label: "Invoice" },
  follow_up: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Follow Up" },
  welcome: { color: "bg-purple-500/15 text-purple-400 border-purple-500/20", label: "Welcome" },
  custom: { color: "bg-slate-500/15 text-slate-400 border-slate-500/20", label: "Custom" },
};

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  clientName: "Acme Corp",
  contactName: "Sarah Jenkins",
  proposalTitle: "Enterprise AI Transformation",
  amount: "$45,000",
  dueDate: "August 30, 2026",
  companyName: "Seridian Digital",
  supportEmail: "support@seridian.dev",
};

export default function TemplatesPage() {
  const templates = useQuery(api.emailTemplates.list, {});
  const createTemplate = useMutation(api.emailTemplates.create);
  const updateTemplate = useMutation(api.emailTemplates.update);
  const removeTemplate = useMutation(api.emailTemplates.remove);
  const duplicateTemplate = useMutation(api.emailTemplates.duplicate);

  // Gallery Filters
  const [gridSearch, setGridSearch] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");

  // View state: "grid" (list view) or active studio step ("meta" | "studio" | "preview")
  const [viewMode, setViewMode] = useState<"grid" | "meta" | "studio" | "preview">("grid");
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"emailTemplates"> | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<EmailTemplate | null>(null);

  // Studio form states
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("custom");
  const [variablesInput, setVariablesInput] = useState("clientName, contactName, proposalTitle, amount, dueDate");
  const [saving, setSaving] = useState(false);

  // Preview & Editor controls
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Filtered Templates List
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      const matchesCategory = selectedCatFilter === "all" || t.category === selectedCatFilter;
      const matchesSearch =
        !gridSearch.trim() ||
        t.name.toLowerCase().includes(gridSearch.toLowerCase()) ||
        t.subject.toLowerCase().includes(gridSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCatFilter, gridSearch]);

  function handleCreateNew() {
    setSelectedTemplateId(null);
    setName("New Enterprise Template");
    setSubject("Scope & Notice for {{clientName}}");
    setCategory("custom");
    setVariablesInput("clientName, contactName, proposalTitle, amount, dueDate");
    setBody(
      `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #0891b2; margin: 0; font-size: 24px;">Seridian Enterprise Notice</h1>
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
    setViewMode("meta");
  }

  function handleSelectTemplate(tmpl: EmailTemplate) {
    setSelectedTemplateId(tmpl._id);
    setName(tmpl.name);
    setSubject(tmpl.subject);
    setCategory(tmpl.category);
    setBody(tmpl.body);
    setVariablesInput(tmpl.variables.join(", "));
    setViewMode("studio");
  }

  async function handleDuplicate(e: React.MouseEvent, tmpl: EmailTemplate) {
    e.stopPropagation();
    try {
      await duplicateTemplate({
        templateId: tmpl._id,
        name: `${tmpl.name} (Copy)`,
      });
      toastMutationSuccess("Template duplicated");
    } catch (err) {
      toastMutationError(err, "Failed to duplicate template");
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmTemplate) return;
    try {
      await removeTemplate({ templateId: deleteConfirmTemplate._id });
      toastMutationSuccess("Template deleted");
      setDeleteConfirmTemplate(null);
    } catch (err) {
      toastMutationError(err, "Failed to delete template");
    }
  }

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

  function insertSnippet(snippetType: "button" | "callout" | "divider") {
    if (snippetType === "button") {
      setBody((prev) => prev + `\n<div style="text-align: center; margin: 24px 0;"><a href="#" style="background: #06b6d4; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">View Proposal &rarr;</a></div>`);
    } else if (snippetType === "callout") {
      setBody((prev) => prev + `\n<div style="background: #ecfeff; border-left: 4px solid #06b6d4; padding: 16px; border-radius: 6px; margin: 16px 0;"><p style="margin: 0; color: #0e7490; font-weight: 600;">Important Notice:</p><p style="margin: 4px 0 0 0; color: #164e63;">Please complete verification before the due date.</p></div>`);
    } else if (snippetType === "divider") {
      setBody((prev) => prev + `\n<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />`);
    }
  }

  function handleGenerateAi() {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setTimeout(() => {
      if (aiPrompt.toLowerCase().includes("proposal")) {
        setSubject("Proposal & Scope of Work for {{proposalTitle}} - {{clientName}}");
        setBody(
          `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #0f172a; border-radius: 8px; border: 1px solid #cbd5e1;">
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
          `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #0f172a; border-radius: 8px; border: 1px solid #cbd5e1;">
  <h2 style="color: #0891b2;">Follow-Up: {{proposalTitle}}</h2>
  <p>Hi {{contactName}},</p>
  <p>Following up on our recent discussion for {{clientName}} regarding {{proposalTitle}}.</p>
  <p>Please let us know if you have any questions prior to {{dueDate}}.</p>
</div>`
        );
      }
      setIsGeneratingAi(false);
      setAiPrompt("");
      toastMutationSuccess("Template generated with AI");
    }, 600);
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim()) return;
    setSaving(true);
    try {
      if (selectedTemplateId) {
        await updateTemplate({
          templateId: selectedTemplateId,
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category: category,
          variables: variablesList,
        });
        toastMutationSuccess("Template updated successfully");
      } else {
        const newId = await createTemplate({
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category: category,
          variables: variablesList,
          createdBy: "current-user",
        });
        setSelectedTemplateId(newId);
        toastMutationSuccess("Template published successfully");
      }
      setViewMode("grid");
    } catch (err) {
      toastMutationError(err, "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <GridBackground />
      <div className="flex flex-col min-h-[calc(100vh-6rem)] text-slate-100">
        {/* TOP BAR / NAVIGATION HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5 mb-6">
          <div className="flex items-center gap-3">
            {viewMode !== "grid" && (
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Back to template gallery"
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {viewMode === "grid" ? "Email Template Studio" : name || "Untitled Template"}
                </h1>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-xs">
                  Enterprise Suite
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {viewMode === "grid"
                  ? "Manage, edit, and preview enterprise email templates with live dynamic tag rendering."
                  : "Multi-stage workflow studio for email creation, template configuration, and responsive testing."}
              </p>
            </div>
          </div>

          {/* Action Header / Stage Navigator */}
          {viewMode !== "grid" ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* Stages Pill Navigator */}
              <div className="flex items-center overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0c1222] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("meta")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                    viewMode === "meta"
                      ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Sliders className="w-3.5 h-3.5" /> Stage 1: Meta & Variables
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("studio")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                    viewMode === "studio"
                      ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Code2 className="w-3.5 h-3.5" /> Stage 2: Split Studio
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                    viewMode === "preview"
                      ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" /> Stage 3: Sandbox Preview
                </button>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving || !name.trim() || !subject.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-lg shadow-cyan-500/20 text-xs"
              >
                {saving ? "Saving..." : selectedTemplateId ? "Save Changes" : "Publish Template"}
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" onClick={handleCreateNew} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs">
              <Plus className="w-4 h-4 mr-1.5" /> New Template Studio
            </Button>
          )}
        </div>

        {/* 1. GRID / GALLERY VIEW */}
        {viewMode === "grid" && (
          <div className="space-y-6">
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0c1222]/80 border border-white/[0.08] p-3 rounded-xl">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  placeholder="Search template name or subject..."
                  aria-label="Search templates"
                  className="border-white/10 bg-[#070b14] pl-9 text-xs text-white placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedCatFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                    selectedCatFilter === "all"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                  )}
                >
                  All Templates ({templates?.length ?? 0})
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCatFilter(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 capitalize",
                      selectedCatFilter === cat
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                    )}
                  >
                    {categoryConfig[cat]?.label ?? cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Studio Creation Launcher Card */}
              <button
                type="button"
                onClick={handleCreateNew}
                className="group flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/[0.02] hover:bg-cyan-500/[0.06] hover:border-cyan-500/50 transition-all text-center min-h-[180px]"
              >
                <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform mb-3">
                  <Wand2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300">Launch New Template Studio</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Build responsive email templates with live tag parsing & AI drafting.</p>
              </button>

              {templates === undefined ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-[180px] rounded-xl bg-white/5" />)
              ) : filteredTemplates.length === 0 && templates.length > 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-[#0c1222]/40 py-12 text-center">
                  <p className="text-xs text-slate-500">No email templates match your filter query.</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setGridSearch("");
                      setSelectedCatFilter("all");
                    }}
                    className="mt-3 bg-white/5 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const cat = categoryConfig[tmpl.category] ?? categoryConfig.custom;
                  return (
                    <div
                      key={tmpl._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectTemplate(tmpl)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectTemplate(tmpl);
                        }
                      }}
                      className="group relative flex min-h-[180px] cursor-pointer flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-5 shadow-lg transition-all hover:border-cyan-500/30 hover:bg-[#0c1222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold text-slate-100 group-hover:text-white line-clamp-1">
                            {tmpl.name}
                          </h3>
                          <Badge variant="secondary" className={cn("shrink-0 text-[10px] px-2 py-0.5", cat.color)}>
                            {cat.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 font-mono">{tmpl.subject}</p>
                      </div>

                      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Variable className="w-3.5 h-3.5 text-cyan-400" /> {tmpl.variables.length} Tags
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDuplicate(e, tmpl)}
                            className="rounded p-1 text-slate-500 transition-colors hover:bg-cyan-500/10 hover:text-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                            aria-label={`Duplicate ${tmpl.name}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmTemplate(tmpl);
                            }}
                            className="rounded p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                            aria-label={`Delete ${tmpl.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="group-hover:text-cyan-400 font-medium transition-colors ml-1">
                            Studio &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 2. STAGE 1: METADATA & VARIABLE SETTINGS */}
        {viewMode === "meta" && (
          <div className="max-w-4xl mx-auto w-full space-y-6 py-4">
            <div className="p-6 rounded-xl border border-white/[0.08] bg-[#0c1222] space-y-6">
              <div>
                <h2 className="text-base font-semibold text-white">Stage 1: Core Template Configuration</h2>
                <p className="text-xs text-slate-400">Specify general metadata, category tags, and dynamic handlebar variables.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Template Title *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Client Proposal Notice"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Category Tag</label>
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
                <label className="text-xs font-medium text-slate-300">Subject Line (supports variables) *</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Scope & Terms for {{proposalTitle}} - {{clientName}}"
                  className="bg-white/5 border-white/10 text-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Active Variable Tokens (comma-separated)</label>
                <Input
                  value={variablesInput}
                  onChange={(e) => setVariablesInput(e.target.value)}
                  placeholder="clientName, contactName, proposalTitle, amount, dueDate"
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
                <div className="flex flex-wrap gap-2 pt-2">
                  {variablesList.map((v) => (
                    <Badge key={v} variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-xs py-1">
                      <Variable className="w-3.5 h-3.5 mr-1" /> {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="button" onClick={() => setViewMode("studio")} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs">
                  Proceed to Split Studio &rarr;
                </Button>
              </div>
            </div>

            {/* AI Generator Panel */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] space-y-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm font-semibold">AI Template Generator Agent</h3>
              </div>
              <p className="text-xs text-slate-400">Describe the email purpose to auto-build subject headers and HTML body structure.</p>
              <div className="flex gap-2">
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Draft a high-touch sales proposal review email"
                  className="bg-white/5 border-cyan-500/20 text-white text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateAi}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shrink-0 text-xs"
                >
                  {isGeneratingAi ? "Generating..." : "Run AI Agent"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 3. STAGE 2: SPLIT STUDIO (FULL PAGE DUAL PANE EDITOR) */}
        {viewMode === "studio" && (
          <div className="flex-1 flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
            {/* Left Pane: Code & Content Editor */}
            <div className="w-full md:w-1/2 flex flex-col rounded-xl border border-white/[0.08] bg-[#0c1222] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#080d1a] border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">HTML Source Code</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400">Snippets:</span>
                  <button
                    type="button"
                    onClick={() => insertSnippet("button")}
                    className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium"
                  >
                    + Button
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("callout")}
                    className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium"
                  >
                    + Callout
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("divider")}
                    className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium"
                  >
                    + Divider
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type HTML email body content..."
                  className="w-full h-full min-h-[450px] resize-none bg-[#040711] border-white/10 text-cyan-200 font-mono text-xs leading-relaxed p-4 rounded-lg focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Right Pane: Live Evaluated Rendering */}
            <div className="w-full md:w-1/2 flex flex-col rounded-xl border border-white/[0.08] bg-[#0c1222] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#080d1a] border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">Live Client View</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Live Evaluated
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeviceMode("desktop")}
                    className={cn(
                      "rounded-md p-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
                      deviceMode === "desktop" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
                    )}
                    aria-label="Desktop preview"
                    aria-pressed={deviceMode === "desktop"}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode("mobile")}
                    className={cn(
                      "rounded-md p-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
                      deviceMode === "mobile" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
                    )}
                    aria-label="Mobile preview"
                    aria-pressed={deviceMode === "mobile"}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Canvas Frame */}
              <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-[#050812]">
                <div
                  className={cn(
                    "transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/50 self-start",
                    deviceMode === "desktop" ? "w-full max-w-lg" : "w-[340px]"
                  )}
                >
                  <div className="bg-slate-100 border-b border-slate-200 p-4 text-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>To: <strong>Sarah Jenkins &lt;sarah@acme.com&gt;</strong></span>
                      <span>Just now</span>
                    </div>
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {renderedSubject || "(No Subject Header)"}
                    </div>
                  </div>
                  <div
                    className="p-6 overflow-y-auto text-slate-900 text-sm"
                    dangerouslySetInnerHTML={{ __html: renderedBody }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. STAGE 3: FULL SCREEN SANDBOX PREVIEW */}
        {viewMode === "preview" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050812] rounded-xl border border-white/[0.08]">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 text-slate-900 my-auto">
              <div className="bg-slate-100 border-b border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>To: <strong>sarah@acme.com</strong></span>
                  <Badge variant="outline" className="border-slate-300 text-slate-600 text-[10px]">
                    Production Sandbox
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmTemplate} onOpenChange={(o) => !o && setDeleteConfirmTemplate(null)}>
        {deleteConfirmTemplate && (
          <DialogContent className="max-w-sm border-white/[0.08] bg-[#0c1222] p-5 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">Delete Template?</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{deleteConfirmTemplate.name}</strong>? This template will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmTemplate(null)} className="text-slate-400 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-400 text-white font-semibold text-xs">
                Delete Template
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

