# Forms (Business)

In-house Formspree + Jotform replacement.

## Stack

- **Convex** — forms, fields, submissions, Formspree-style `POST /forms/{slug}`
- **Next.js 16 server actions** — `src/app/actions/forms.ts`
- **TanStack Query** — `src/lib/forms/queries.ts` (dashboard + public page)
- **Workflows** — trigger `form_submission` (optional form slug filter)

## Where to edit

| What | Path |
|------|------|
| List UI | `src/components/forms/FormList.tsx` |
| Builder (steps) | `src/components/forms/FormBuilder.tsx` |
| Public page | `src/app/f/[slug]/page.tsx` + `PublicFormView.tsx` |
| Field types | `convex/lib/formDefinition.ts` + `src/components/forms/formTypes.ts` |
| Server actions | `src/app/actions/forms.ts` |

## Multi-step flow

Basics → Fields → Settings → Publish (see `docs/dashboard/flows/forms.md`).

## Public URLs

- Hosted: `/f/{slug}`
- API: `POST {CONVEX_SITE_URL}/forms/{slug}` (JSON or form-urlencoded)
