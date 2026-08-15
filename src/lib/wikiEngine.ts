/**
 * Pure, framework-free core of the Wiki Engine pipeline (scan -> plan -> generate).
 * No React, no Convex client, no browser APIs — safe to import from the
 * WikiEngine UI component AND from a plain CLI script (see scripts/wiki-engine-cli.ts).
 */

export const AUTO_GENERATED_TAG = "auto-generated";

export interface WikiPageLike {
  title: string;
  content: string;
  tags?: string[];
}

export interface MemoryLike {
  content: string;
  tags?: string[];
}

export interface ClientLike {
  name: string;
  company: string;
  industry?: string;
}

export interface PlanItem {
  action: "create" | "update";
  title: string;
  reason: string;
}

export interface PageSummary {
  title: string;
  excerpt: string;
  tags: string[];
}

export interface ContextSummary {
  pageTitles: string[];
  memorySnippets: string[];
  clientNames: string[];
  pageContents: PageSummary[];
  /**
   * Real, human-written company facts pulled from wiki pages that are NOT
   * themselves auto-generated placeholders. This is what lets a page like
   * "Client Services" get filled in with real Seridian info even when the
   * `memories` table is empty — the source material already exists in the
   * wiki itself (e.g. seeded pages), it just wasn't being read.
   */
  companyFacts: string[];
}

export const SUGGESTED_TOPICS: Array<{ title: string; keyword: string }> = [
  { title: "Company Overview", keyword: "company overview" },
  { title: "Client Services", keyword: "client services" },
  { title: "Technology Stack", keyword: "technology" },
  { title: "Team & Roles", keyword: "team" },
  { title: "Pricing & Plans", keyword: "pricing" },
  { title: "Project Workflow", keyword: "workflow" },
  { title: "Security & Compliance", keyword: "security" },
  { title: "API Documentation", keyword: "api" },
  { title: "Onboarding Guide", keyword: "onboarding" },
  { title: "Troubleshooting", keyword: "troubleshoot" },
];

const THIN_CONTENT_CHARS = 150;
const EXCERPT_CHARS = 300;

export function buildContextSummary(
  wikiPages: WikiPageLike[] | undefined,
  memories: MemoryLike[] | undefined,
  clients: ClientLike[] | undefined,
): ContextSummary {
  const pageTitles = wikiPages?.map((p) => p.title) ?? [];
  const memorySnippets =
    memories?.slice(0, 20).map((m) => m.content.slice(0, 120)) ?? [];
  const clientNames = clients?.map((c) => `${c.name} (${c.company})`) ?? [];

  const pageContents: PageSummary[] =
    wikiPages?.map((p) => ({
      title: p.title,
      excerpt: p.content.slice(0, EXCERPT_CHARS),
      tags: p.tags ?? [],
    })) ?? [];

  const companyFacts = (wikiPages ?? [])
    .filter((p) => !(p.tags ?? []).includes(AUTO_GENERATED_TAG))
    .map((p) => `${p.title}: ${p.content.slice(0, 220).replace(/\s+/g, " ").trim()}`);

  return { pageTitles, memorySnippets, clientNames, pageContents, companyFacts };
}

/**
 * A page counts as "enriched" (i.e. actually contains company-specific
 * info, not just a generic placeholder) if it either wasn't auto-generated
 * by this pipeline, or its content demonstrably references a known client
 * or a real company fact pulled from another page / memory bank.
 */
export function isEnriched(page: PageSummary, context: ContextSummary): boolean {
  if (!page.tags.includes(AUTO_GENERATED_TAG)) return true;

  const lower = page.excerpt.toLowerCase();

  const mentionsClient = context.clientNames.some((name) => {
    const bareName = name.split(" (")[0].trim().toLowerCase();
    return bareName.length > 2 && lower.includes(bareName);
  });
  if (mentionsClient) return true;

  const mentionsFact = [...context.memorySnippets, ...context.companyFacts].some(
    (snippet) => {
      const needle = snippet.slice(0, 40).toLowerCase().trim();
      return needle.length > 10 && lower.includes(needle);
    },
  );
  return mentionsFact;
}

export function generatePlan(context: ContextSummary): PlanItem[] {
  const plans: PlanItem[] = [];

  for (const topic of SUGGESTED_TOPICS) {
    const existingPage = context.pageContents.find((p) =>
      p.title.toLowerCase().includes(topic.keyword) ||
      topic.title.toLowerCase() === p.title.toLowerCase(),
    );

    if (!existingPage) {
      plans.push({
        action: "create",
        title: topic.title,
        reason: `No wiki page covers "${topic.title}"`,
      });
      continue;
    }

    if (!isEnriched(existingPage, context)) {
      plans.push({
        action: "update",
        title: existingPage.title,
        reason: `"${existingPage.title}" is still a generic auto-generated placeholder — no company-specific info has been inserted yet`,
      });
    }
  }

  if (context.memorySnippets.length > 0 && context.pageContents.length < 5) {
    plans.push({
      action: "create",
      title: "Memory Index",
      reason: "Consolidate memory bank facts into a single reference page",
    });
  }

  for (const page of context.pageContents) {
    if (
      page.excerpt.length < THIN_CONTENT_CHARS &&
      !plans.some((p) => p.title === page.title)
    ) {
      plans.push({
        action: "update",
        title: page.title,
        reason: `"${page.title}" has thin content (${page.excerpt.length} chars)`,
      });
    }
  }

  return plans.slice(0, 10);
}

export function buildGeneratePrompt(
  planItem: PlanItem,
  context: ContextSummary,
): string {
  const existingPage = context.pageContents.find(
    (p) => p.title === planItem.title,
  );

  let prompt = `You are a technical documentation writer for Seridian, a technology company.\n\n`;

  if (existingPage) {
    prompt += `EXISTING PAGE "${planItem.title}":\n${existingPage.excerpt}\n\n`;
    prompt += `IMPROVEMENT REASON: ${planItem.reason}\n\n`;
    prompt += `Rewrite this page with significantly more detail, grounded in the real company facts below. Keep the same title.`;
  } else {
    prompt += `CREATE A NEW WIKI PAGE titled "${planItem.title}".\n`;
    prompt += `REASON: ${planItem.reason}\n\n`;
  }

  if (context.clientNames.length > 0) {
    prompt += `KNOWN CLIENTS: ${context.clientNames.slice(0, 10).join(", ")}\n`;
  }
  if (context.companyFacts.length > 0) {
    prompt += `REAL COMPANY FACTS (from existing wiki pages):\n${context.companyFacts.slice(0, 6).join("\n")}\n`;
  }
  if (context.memorySnippets.length > 0) {
    prompt += `MEMORY BANK FACTS:\n${context.memorySnippets.slice(0, 5).join("\n")}\n`;
  }

  prompt += `\nWrite comprehensive markdown documentation grounded in the facts above — do not invent generic filler. Include sections, bullet points, and clear explanations. Be specific and actionable.`;
  return prompt;
}

export function generateFallbackContent(
  plan: PlanItem,
  context: ContextSummary,
): string {
  const clientList = context.clientNames.slice(0, 5).join(", ");
  const factList = context.companyFacts.slice(0, 4).join("\n");
  const memoryContext = context.memorySnippets.slice(0, 3).join("\n");
  const grounding = [factList, memoryContext].filter(Boolean).join("\n");

  if (plan.title === "Company Overview") {
    return `# Company Overview

${grounding || "Seridian is a technology company providing innovative solutions."}

## Key Clients
${clientList || "Various enterprise clients"}

---
*Auto-generated by Wiki Engine — review and refine this content.*`;
  }

  if (plan.title === "Client Services") {
    return `# Client Services

${grounding || "Our service offerings are designed to meet diverse technology needs."}

## Client Portfolio
${clientList || "A growing portfolio of satisfied clients"}

---
*Auto-generated by Wiki Engine — review and refine this content.*`;
  }

  return `# ${plan.title}

> ${plan.reason}

## Overview
${grounding || `This page provides comprehensive documentation for ${plan.title.toLowerCase()}.`}

## Related Clients
${clientList || "- Client data pending integration."}

---
*Auto-generated by Wiki Engine — review and refine this content.*`;
}
