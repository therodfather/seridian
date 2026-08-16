# Health Check

**URL:** `/dashboard/health-check`

**What it does:** Fillable one-page SRE report for the $999 package.

**Edit here**
- Route: `src/app/dashboard/health-check/page.tsx`
- Report: `src/components/health-check/HealthCheckReport.tsx` (`PageShell` + `FlowSteps`)
- Draft helpers: `src/lib/healthCheckReport.ts`

**Multi-step flow:** Client → Findings → 30/60/90 → Print ([flow doc](../flows/health-check.md)). Off-step sections use `hidden print:block` so print still includes the full report.

**E2E must keep:** heading `Health Check`, `Print report`, SOW Lite strings

← [All pages](./index.md)
