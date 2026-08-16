# Email Template Studio

**URL:** `/dashboard/templates`

**What it does:** Email template gallery + multi-stage editor.

**Edit here**
- Page frame / gallery / studio steps: `src/app/dashboard/templates/page.tsx` (`PageShell`, `Toolbar`, `FlowSteps`)
- Shared form helpers: `src/components/emailtemplates/`

**Multi-step flow:** `FlowSteps` stages Meta → Split Studio → Sandbox Preview (`allowJump`); also `TemplateForm` MultiStepForm for simpler creates.

← [All pages](./index.md)
