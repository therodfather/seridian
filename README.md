# Seridian

Professional consulting website for **Seridian** — cloud infrastructure and application development consulting.

## Getting Started

Install dependencies and run the development server:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles & theme
│   ├── layout.tsx       # Root layout with metadata
│   └── page.tsx         # Home page
└── components/
    ├── Header.tsx       # Navigation
    ├── Hero.tsx         # Hero section
    ├── Services.tsx     # Service offerings
    ├── Approach.tsx     # Consulting approach
    ├── Expertise.tsx    # Technology stack
    ├── Contact.tsx      # Contact form & CTA
    └── Footer.tsx       # Site footer
```

## Assets

Static files live in `public/` and are served from the site root:

```
public/assets/
├── images/   # Photos, hero images, backgrounds
├── icons/    # Logos, favicons, brand marks
└── fonts/    # Local font files (optional)
```

Reference them with root-relative paths, e.g. `/assets/images/hero.jpg` or:

```tsx
import Image from "next/image";

<Image src="/assets/icons/logo.svg" alt="Seridian" width={120} height={40} />
```

## Customization

- Update contact email in `src/components/Contact.tsx`
- Modify service offerings in `src/components/Services.tsx`
- Adjust technology tags in `src/components/Expertise.tsx`
- Edit site metadata in `src/app/layout.tsx`

## Links

- **Live site:** [https://seridian.netlify.app](https://seridian.netlify.app)
- **GitHub:** [https://github.com/therodfather/seridian](https://github.com/therodfather/seridian)
- **Netlify dashboard:** [https://app.netlify.com/projects/seridian](https://app.netlify.com/projects/seridian)

## Contact form (webhook → portal)

Submissions from the contact form are handled by a **server action** (`src/app/actions/contact.ts`) that validates input server-side, signs the payload with an HMAC-SHA256 signature, and POSTs it to the **contact webhook** hosted on the Seridian portal deploy (`app.seridian.dev`). The portal receives it and delivers the message by email via Resend. Email delivery, recipients, and the Resend integration live entirely in the private portal repo — nothing about them is stored here.

| Variable | Required | Description |
|----------|----------|-------------|
| `CONTACT_WEBHOOK_URL` | Yes | Webhook receiver URL, e.g. `https://app.seridian.dev/api/webhooks/seridian-contact` |
| `CONTACT_WEBHOOK_SECRET` | Yes | Shared secret — must match the portal deploy exactly |

Secrets must **never** be committed — configure them as Netlify environment variables (and in `.env.local` for local dev). The webhook only accepts requests bearing the shared secret (bearer token + fresh timestamped HMAC signature), so only this deploy can deliver submissions.

Copy `.env.example` → `.env.local` for local development.

### Netlify (production + deploy previews)

```bash
npx netlify-cli env:set CONTACT_WEBHOOK_URL "https://app.seridian.dev/api/webhooks/seridian-contact" --context production --context deploy-preview
npx netlify-cli env:set CONTACT_WEBHOOK_SECRET "<shared secret>" --context production --context deploy-preview
```

Redeploy after changing env vars so they take effect on deployed builds.

## Deploy

Pushes to `main` automatically deploy via Netlify. To deploy manually from the CLI:

```bash
bunx netlify deploy --prod --build
```
