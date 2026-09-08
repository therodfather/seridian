# Changelog

All notable changes to the Seridian project are documented in this file.

## [2026-08-11]

### Added
- `AGENTS.md` with project conventions, build commands, architecture, and agent instructions.

### Fixed
- Netlify Next.js asset delivery and deploy skew protection.
- Approach and Contact dark theme section and card backgrounds.

### Changed
- Added video logo and public assets folder structure.
- Documented Linear contact form env vars and fixed team reference.

---

## [2026-08-10]

### Added
- PR workflow (lint/typecheck/build + preview) and PR template.
- Custom font system: Space Grotesk, Inter, JetBrains Mono with display swap and Tailwind vars.
- Immersive WebGL hero with shader gradient, bun, and reduced-motion support.
- `@bytecats/ui-kit` consumption (Astryx + shadcn + MagicUI) with Seridian overrides.
- shadcn/ui integration.
- Linear + GitHub tandem workflow: issue templates, labels, linear-sync workflow.
- Complete form → Linear integration (`createLinearIssue`, `/api/contact`, contact form).
- Live site and deployment links to README.
- `AGENTS.md` conventions and `bun`-only documentation.

### Fixed
- Vendored `@bytecats/ui-kit` into repo so CI/Netlify can resolve it.
- WebGL hero: fixed shader-error fallback, disposed GPU resources, dropped dead three wrapper.

### Changed
- **Build system**: `bun`-only (removed npm, added `bun.lock`, `oven-sh/setup-bun`, Netlify bun config).
- Matured font system.
- Matured WebGL hero implementation.
- Ignored local `.netlify` state from netlify CLI link.
- Documented `bun`-only + official Linear MCP `/mcp` endpoint.

---

## [Unreleased]

### Removed
- `android-chat/` and `kmp-chat/` chat clients + tests (portal-owned).
- `.github/workflows/android.yml` Android CI.
- `.github/workflows/linear-sync.yml` Linear ↔ GitHub bidirectional sync.

### Changed
- Deprecated bidirectional Linear ↔ GitHub sync — GitHub issues are the tracker (issue/PR templates de-linked from Linear).

### Planned
- `feature/ui-kit` — shadcn/ui integration refinements.
- `feature/webgl` — WebGL enhancements.
- `feature/fonts` — Font system polish.
- `feature/linear-sync` — Linear sync automation.
- `chore/next-16` — Next.js 15 → 16 upgrade.
