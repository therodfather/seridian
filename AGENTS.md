# AGENTS.md

## Package manager — bun only
- `bun@1.3.14` enforced (`packageManager` + `.bun-version`, Node `22` via `.nvmrc` / `netlify.toml`). Never use `npm`/`yarn`/`pnpm`.
- Install: `bun install --frozen-lockfile` (CI uses `oven-sh/setup-bun@v2` with this exact command).
- Do not commit `package-lock.json`. README's `npm install` is stale — use `bun`.

## Commands
- `bun run dev` — Next.js dev server (http://localhost:3000)
- `bun run lint` — `eslint src/` (matches CI; do not use `next lint`, removed in Next 16)
- `bun run typecheck` — `tsc --noEmit`
- `bun run test` — Vitest (Convex `edge-runtime` + `src/**/*.test.ts` unit)
- `bun run test:unit` — unit project only (`src/**/*.test.ts`, includes route leak guards)
- `bun run test:convex` — Convex project only (`convex/**/*.test.ts`)
- `bun run test:e2e` — full Playwright suite (starts local server unless `BASE_URL` is remote)
- `bun run test:e2e:smoke` — Playwright Chromium smoke (`@smoke` tag); covers marketing + dashboard login page
- `bun run test:e2e:smoke:prod` — same smoke against **https://seridian.netlify.app** via `BASE_URL` (no local server, no secrets; client `localStorage` auth only)
- `bun run build` — production build (`next build`); `NEXT_TELEMETRY_DISABLED=1` in CI

## CI / PR gate
- `.github/workflows/pr.yml`: lint → typecheck → vitest → build, then Playwright smoke on PRs (full e2e on `main`). Concurrency cancels in-progress runs per ref.
- `.github/workflows/android.yml`: `./gradlew check` on Android path changes; AAR pre-release only on `android-v*` tags.
- `.github/workflows/convex.yml`: Convex tests + tsc when `convex/**` changes.
- PR checklist (`.github/PULL_REQUEST_TEMPLATE.md`): lint, typecheck, test, e2e smoke, build, bun-only lockfile, CLS/fonts/WebGL checks.
- Netlify (`netlify.toml`): `command = "bun run build"`, plugin `@netlify/plugin-nextjs`. Push to `main` auto-deploys; PRs get Deploy Preview from Netlify Git integration.

## Architecture
- Next.js 16 App Router + React 19 + Tailwind CSS 4 (`@tailwindcss/postcss` in `postcss.config.mjs`) + TypeScript strict (`@/*` → `src/*`).
- Marketing lives under `src/app/(marketing)/` (route group — **not** part of the URL): home `/`, `/packages`, `/casestudies`. Dashboard lives under `src/app/dashboard/` → `/dashboard/*`.
- Root layout: `src/app/layout.tsx` (metadata, font, providers). Contact API: `src/app/api/contact/route.ts`.
- Typed public paths: `src/lib/routes.ts` + `src/lib/dashboardNav.ts`. Never put `(marketing)` / `(dashboard)` in `href`s — unit test + eslint guard.
- Sections live in `src/components/`; global theme in `src/app/globals.css`.
- `src/app/icon.tsx` — app icon route.

## Vendored UI kit — do not break
- `@bytecats/ui-kit` is vendored at `vendor/ui-kit/` with committed `dist/` (no build step). `package.json` uses `file:./vendor/ui-kit` (relative path only — absolute `file:` paths break CI/Netlify).
- `vendor/ui-kit/package.json` exports both `.` and `./styles.css` → `./dist/styles.css`. Dependencies are externalized via `tsup` — keep `dependencies` in vendored manifest, no `prepare` script.
- Import once at app root before globals — order matters (`src/app/layout.tsx:3-4`):
  ```ts
  import "@bytecats/ui-kit/styles.css";
  import "./globals.css";
  ```
- `src/lib/utils.ts` re-exports `cn` from the kit — do not duplicate `clsx`/`tailwind-merge` logic.
- Theming: kit uses Astryx tokens + CSS `light-dark()` (no `.dark` class, respects `prefers-color-scheme`). Two kit themes `neutral`/`stone` via `data-ui-theme`. `globals.css` `:root` overrides `--astryx-color-accent` → `#06b6d4` (Seridian cyan) and dark surfaces → `#070b14`/`#172033`/`#0c1222`. Keep `@theme` Seridian palette + utilities (`.gradient-text`, `.grid-bg`, `.glow-orb`, `.card-glow`). `body` uses `bg-background text-foreground` from kit.

## Env / Linear & Convex integration
- `.env.example` & `.env.local`: legacy local hints only. **Do not rely on Netlify env vars for Linear.**
- **Preferred (admin UI):** Settings → Integrations & Sync → **Start setup** → enable Linear → paste API key (and optional team/project IDs). Key is stored in Convex `secrets.ciphertext` + `integrationConfigs`; sync reads the vault first.
- **Deprecated fallback:** `bunx convex env set LINEAR_API_KEY "lin_api_..."` still works if no vault ciphertext exists. Plan to remove after all environments complete UI setup.
- **Convex environment variables** (other keys): Must be configured in Convex deployment separately from local `.env.local` or Netlify env vars.
  - Run sync action: `bunx convex run linearSync:syncAllLinear`
- **Netlify environment & linking**:
  - Production site: **https://seridian.netlify.app** (Netlify project `seridian`, repo `therodfather/seridian`)
  - Site link (if you have access): `bunx netlify link --name seridian`
  - Fork preview site `seridian-4ce` tracks `4cecoder/seridian` — not canonical prod
  - Check env list: `bunx netlify env:list`
  - Avoid setting `LINEAR_API_KEY` on Netlify going forward (not used by Convex actions).

## Branches
- Branch feature work from `origin/main`. Check `git branch -a` / use a dedicated worktree before creating new work.
- Historical track branches (may be merged/stale): `feature/ui-kit`, `feature/webgl`, `feature/fonts`, `feature/linear-sync`.

## Gotchas & Quirks
- `next lint` was removed in Next 16 — `package.json` `lint` script is `eslint src/`, matching CI.
- **Linear GraphQL API Schema Quirk**: In `projects` query (`SyncLinearProjects`), querying `teamId` directly on `Project` nodes causes HTTP 400. Do not request `teamId` directly on `projects` GraphQL nodes in `convex/linearSync.ts`.
- **Convex Env vs Netlify/Local Env**: Setting env vars in Netlify CLI or `.env.local` does NOT populate Convex serverless runtime env vars. You must set Convex env vars using `bunx convex env set <KEY> <VALUE>`.
- Do not add `npm`-generated lockfiles or run `npm install` — it drifts from `bun.lock`.
- Do not move or rebuild `vendor/ui-kit/dist/` — Netlify/CI need the committed artifacts.
- Tailwind v4 uses `@import "tailwindcss"` + `@theme` in `globals.css`, not `tailwind.config.*`.
- **Route groups ≠ URLs**: `(marketing)` is a folder only. Links must be `/packages`, not `/(marketing)/packages`. Prefer `ROUTES` from `src/lib/routes.ts`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
