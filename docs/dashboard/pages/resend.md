# Resend (email)

Shared transactional email for Seridian — Forms notifications, Workflow **Send email** steps, and future product mail.

## Setup

1. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
2. Verify your domain at [resend.com/domains](https://resend.com/domains)
3. Settings → Integrations → **Connect Resend** (API key + from address)

Vault stores `RESEND_API_KEY`; from-address lives on `integrationConfigs.teamId` for provider `resend`.

## Used by

| Product | How |
|---------|-----|
| Forms | Optional **Notify email** on form settings |
| Workflows | Step type **Send email (Resend)** — templates `{{trigger.*}}` |
| Future | Call `internal.resend.sendEmail` from any Convex action |

## Code

- `convex/resend.ts` — setup + `sendEmail` action
- `src/components/settings/ResendConnectCard.tsx`
