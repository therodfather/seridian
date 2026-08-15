import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type SeedPage = {
  title: string;
  tags: string[];
  content: string;
};

const SEED_PAGES: SeedPage[] = [
  {
    title: "Seridian — Company",
    tags: ["company", "seridian", "seed"],
    content: `# Seridian

Seridian is a cloud infrastructure and application development consultancy. We partner with organizations to architect resilient systems, ship modern applications, and make technical decisions that last.

**Positioning:** practical consulting, not slide decks. Discover → Architect → Deliver → Evolve.

**Public site:** https://seridian.netlify.app  
**Repo (source of truth):** https://github.com/therodfather/seridian  
**Contact:** hello@seridian.dev (form creates a GitHub issue)

**Who we serve:** startups and small teams that need a working MVP, a bounded feature sprint, or a clear picture of their cloud/SRE posture — without a six-month engagement.

**How we work:** fixed-scope packages with transparent pricing and timelines. Cash before work. Deposits on sprints. Prepaid assessments.

**Dashboard:** internal ops OS — clients, issues, sales, proposals, files, wiki, LLM arena, second brain, chat, settings. GitHub is SoT; Netlify ships production; Linear is trial-only.`,
  },
  {
    title: "Tech stack",
    tags: ["engineering", "stack", "seed"],
    content: `# Tech stack

## Web
- **Next.js 16** App Router + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 4** (\`@theme\` in \`globals.css\`, no \`tailwind.config\`)
- **Bun 1.3.14** only — never npm/yarn/pnpm
- **@bytecats/ui-kit** vendored at \`vendor/ui-kit/\` (committed \`dist/\`)
- Marketing routes: \`src/app/(marketing)/\` — route groups are **not** URLs (\`/packages\` not \`/(marketing)/packages\`)
- Typed paths: \`src/lib/routes.ts\` + \`src/lib/dashboardNav.ts\`

## Backend
- **Convex** — database, queries/mutations/actions, file storage, realtime
- Auth today: dashboard localStorage session + Convex \`chat.login\` (pubkey + password)
- Secrets/integrations: Convex vault + \`integrationConfigs\` (admin multi-step setup). Linear key prefers vault, then deprecated \`convex env set\`
- Contact form: \`POST /api/contact\` → GitHub issue + Projects v2

## Hosting & CI
- **Netlify** production: https://seridian.netlify.app (project \`seridian\`, repo \`therodfather/seridian\`)
- \`NEXT_PUBLIC_CONVEX_URL\` baked in \`netlify.toml\`
- CSP \`connect-src\` must include \`https://*.convex.cloud\` **and** \`wss://*.convex.cloud\`
- GitHub Actions: lint, typecheck, vitest, Playwright smoke on PRs, full e2e on main
- Android: \`android-client/\` KMP library (AAR), Gradle CI on path changes

## Knowledge / AI
- Wiki pages + memory banks (Convex) feed **Wiki Engine** / LLM Arena
- Arena: local-first ONNX-compatible models; do not auto-download on visit
- Second Brain: entities, memories, mental models

## Do not
- Rebuild \`vendor/ui-kit/dist/\`
- Put route-group folders in \`href\`s
- Treat Netlify env as Convex runtime env`,
  },
  {
    title: "Offers and packages",
    tags: ["sales", "packages", "seed"],
    content: `# Offers and packages

Live SKUs (marketing \`/packages\`):

## Application development
- **MVP Sprint** — $3,500–$5,000 · 2–3 weeks · working deployed app (bounded screens/workflows)
- **Feature Sprint** — $2,500–$4,000 · 1–3 defined features shipped

## DevOps & infrastructure
- **Cloud / SRE Assessment (Health Check)** — **$999 prepaid** · written report with severity, cost, 30/60/90 plan
- **CI/CD pipeline** — $2,500–$4,500 · Git push → build → test → deploy

## Cash rules
- Health Check: **100% prepaid** before kickoff
- Sprints: **50% deposit** to start, remainder on delivery
- Free discovery: **30-minute fit call only** — no unpaid multi-day audits
- Invoice within **1 hour** of verbal yes; no work before funds clear

## Ladder (do not skip rungs)
1. $999 Health Check (wedge, this week)
2. Remediation / CI/CD / Feature sprint (same readout meeting)
3. Optional short prepaid operate month — only after a shipped pilot
4. Kits / affiliates — only after ≥ $3k collected

Dashboard: Client → Deal (\`lead\` → \`proposal\` → \`closed_won\`) → Proposal SOW Lite → invoice → kickoff.`,
  },
  {
    title: "Making money — operating playbook",
    tags: ["revenue", "sales", "seed"],
    content: `# Making money — operating playbook

Seridian survives on **sold, prepaid work**, not on shipping more product for its own sake.

## This week (survival)
- Floor: **$3,000 collected** (not verbal). Target **$7,000**. Stretch **$10,000**.
- Outbound offers: **$999 Cloud Health Check** and **MVP/Feature 50% deposits** only.
- Volume: 15+ warm asks/day. Cold outbound only pitches $999 prepaid.
- Ranking: warm network → past contacts → warm LinkedIn → cold → communities.
- Cursor/AI: **delivery margin** (faster close/deliver). Do not spend the week on $29 digital products.

## What buyers pay for
Concrete workflow pain: “review this infra and tell us what to fix,” “ship this MVP in 2–3 weeks,” “stop deploying by hand.” Not novelty AI demos.

## Portable streams (do not get tied down)
Activate now: prepaid Health Check, sprint deposits, optional prepaid workshop/Cursor-eng audit.
Defer: exclusive retainers, on-call, Gumroad kits until cash is in.
Kill a stream if it becomes hostage (raise price, productize, or drop).

## AI tools as revenue
Sell Slack bots, CSV helpers, internal tools as **Feature/MVP sprints with deposit** — not unpaid experiments. The dashboard (wiki, arena, chat) is **delivery proof**, not the SKU.

## Day-7 kill
Below $3k collected with a weak pipeline → shut down or hard pivot. Do not “keep building tools” as coping. At/above floor with a paid kickoff → continue on delivery + $999 → remediation.`,
  },
  {
    title: "Wiki and LLM Arena — how knowledge is used",
    tags: ["wiki", "arena", "seed"],
    content: `# Wiki and LLM Arena

The **Wiki** is the human-editable knowledge base (pages in Convex \`wikiPages\`).

The **Wiki Engine** (LLM Arena) scans:
- Wiki page titles + content
- Memory bank facts (\`world_fact\` / observations)
- Client names

It uses that context to propose and write pages. Seeded company/stack/revenue pages exist so the engine does not invent a generic software company.

## How to keep it true
- Edit these seed pages when offers or stack change
- Use **Load company knowledge** on the Wiki page to upsert the canonical seed set (idempotent by slug)
- Do not treat Linear as source of truth
- Prefer GitHub issues for new work

## Arena behavior
- No auto-download of ONNX models on visit
- Load a model explicitly, then generate
- Empty/error states should not crash the page`,
  },
];

const SEED_FACTS: { content: string; tags: string[] }[] = [
  {
    content:
      "Seridian is a cloud infrastructure and application development consultancy. Public site: https://seridian.netlify.app. Contact: hello@seridian.dev.",
    tags: ["company", "seed"],
  },
  {
    content:
      "Fastest cash offer is the $999 prepaid Cloud/SRE Health Check. Sprints require 50% deposit. No work before funds clear.",
    tags: ["revenue", "seed"],
  },
  {
    content:
      "Stack: Next.js 16, React 19, Tailwind 4, Bun, Convex, Netlify, vendored @bytecats/ui-kit. GitHub therodfather/seridian is source of truth.",
    tags: ["stack", "seed"],
  },
  {
    content:
      "Linear is trial-only. Integrations and secrets are configured in Settings by an admin via Convex vault, not Netlify env vars.",
    tags: ["ops", "seed"],
  },
  {
    content:
      "This week sell Health Checks and sprint deposits. Cursor is for delivery speed. Do not build unpaid AI micro-products.",
    tags: ["revenue", "seed"],
  },
];

export const seedCompanyKnowledge = mutation({
  args: {
    lastEditedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const editor = args.lastEditedBy?.trim() || "system";
    const now = Date.now();

    const banks = await ctx.db.query("memoryBanks").collect();
    let bank = banks.find((b) => b.name === "Seridian Wiki");
    if (!bank) {
      const bankId = await ctx.db.insert("memoryBanks", {
        name: "Seridian Wiki",
        mission:
          "Central knowledge base for Seridian operations, offers, stack, and how we make money.",
        directives: [
          "Keep company, stack, and offer pages accurate",
          "Prefer cash-before-work and fixed packages",
          "Do not invent unpaid product roadmaps",
        ],
        disposition: { skepticism: 0.4, literalism: 0.7, empathy: 0.5 },
        createdBy: editor,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("bankConfig", {
        bankId,
        retainExtractionMode: "concise",
        createdAt: now,
        updatedAt: now,
      });
      bank = (await ctx.db.get(bankId))!;
    }

    const bankId = bank._id as Id<"memoryBanks">;
    let pagesUpserted = 0;

    for (const page of SEED_PAGES) {
      const slug = slugify(page.title);
      const existing = await ctx.db
        .query("wikiPages")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: page.title,
          content: page.content,
          tags: page.tags,
          lastEditedBy: editor,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("wikiPages", {
          bankId,
          title: page.title,
          slug,
          content: page.content,
          tags: page.tags,
          lastEditedBy: editor,
          createdAt: now,
          updatedAt: now,
        });
      }
      pagesUpserted += 1;
    }

    const existingMemories = await ctx.db
      .query("memories")
      .withIndex("by_bank", (q) => q.eq("bankId", bankId))
      .take(200);
    const existingContents = new Set(existingMemories.map((m) => m.content));

    let memoriesAdded = 0;
    for (const fact of SEED_FACTS) {
      if (existingContents.has(fact.content)) continue;
      await ctx.db.insert("memories", {
        bankId,
        type: "world_fact",
        content: fact.content,
        evidence: ["wiki-seed"],
        proofCount: 1,
        embedding: [],
        tags: fact.tags,
        relations: [],
        createdAt: now,
        updatedAt: now,
      });
      memoriesAdded += 1;
    }

    await ctx.db.patch(bankId, { updatedAt: now });

    return {
      bankId,
      pagesUpserted,
      memoriesAdded,
    };
  },
});
