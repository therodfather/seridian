# Seridian Lander — Docs

Documentation for the public Seridian marketing site (`seridian.dev`, deployed as
`seridian.netlify.app`). Operational secrets and private-repo details stay out of
this repository — docs here only reference environment variable **names**.

## Index

| Doc | What it covers |
|-----|----------------|
| [contact-form.md](contact-form.md) | How the contact form hooks up end-to-end: request lifecycle, HMAC signing scheme, everything the lander side must configure (Netlify + local dev), worked local-testing examples, secret rotation, troubleshooting |
| [deploy.md](deploy.md) | Netlify deploy flow, full environment-variable inventory for this repo, and post-deploy verification steps |
| [UI_KIT.md](UI_KIT.md) | The vendored `@bytecats/ui-kit`: shadcn/ui + Astryx tokens + Magic UI, theming via `data-ui-theme`, import-order rules |
| [BRANDING.md](BRANDING.md) | Seridian visual identity: logo, colors, typography for designers and developers |

## Quick links

- Getting started, tech stack, project structure: the [root README](../README.md)
- Contact form quick setup: [contact-form.md § Setup](contact-form.md#setup-lander-side-only)
- Verify a deploy works: [deploy.md § Post-deploy verification](deploy.md#post-deploy-verification)

## Repo boundaries

| Repo | Visibility | Role |
|------|------------|------|
| `seridian` (this repo) | **public** | Lander site, contact form UI, signing server action |
| portal (`adventurers-tech`) | **private** | Webhook receiver at `app.seridian.dev`, Resend email delivery |

The lander never stores email recipients, API keys, or portal internals — only the
webhook URL (public) and the shared secret (Netlify env only, blank in
`.env.example`).

> Note: the Linear ↔ GitHub bidirectional sync is deprecated and removed
> (`linear-sync.yml` deleted, PR/issue templates de-linked from Linear).
> GitHub issues are the tracker for this repo.
