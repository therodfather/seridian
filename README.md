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
│   ├── actions/
│   │   └── contact.ts   # "use server" action: validate + sign + forward
│   ├── globals.css      # Global styles & theme
│   ├── layout.tsx       # Root layout with metadata
│   └── page.tsx         # Home page
├── components/
│   ├── Header.tsx       # Navigation
│   ├── Hero.tsx         # Hero section
│   ├── Services.tsx     # Service offerings
│   ├── Approach.tsx     # Consulting approach
│   ├── Expertise.tsx    # Technology stack
│   ├── Contact.tsx      # Contact form & CTA
│   └── Footer.tsx       # Site footer
└── lib/
    └── utils.ts         # cn() re-exported from @bytecats/ui-kit
docs/                    # Guides — indexed below
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

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/README.md](docs/README.md) | Docs index + repo boundaries (what's public vs private) |
| [docs/contact-form.md](docs/contact-form.md) | Contact pipeline end-to-end: request lifecycle, HMAC signing scheme, lander setup (Netlify + local), worked curl/stub-receiver examples, secret rotation, troubleshooting |
| [docs/deploy.md](docs/deploy.md) | Netlify deploy flow, env-var inventory, post-deploy verification |

## Links

- **Live site:** [https://seridian.netlify.app](https://seridian.netlify.app)
- **GitHub:** [https://github.com/therodfather/seridian](https://github.com/therodfather/seridian)
- **Netlify dashboard:** [https://app.netlify.com/projects/seridian](https://app.netlify.com/projects/seridian)

## Contact form (quick reference)

The form is a server action (`src/app/actions/contact.ts`) that validates input,
HMAC-signs it, and forwards it to the contact webhook on the portal deploy
(`app.seridian.dev`), which delivers the message by email. Delivery and recipients
are handled entirely in the private portal repo — nothing private is stored here.

| Variable | Required | Description |
|----------|----------|-------------|
| `CONTACT_WEBHOOK_URL` | Yes | Receiver URL, e.g. `https://app.seridian.dev/api/webhooks/seridian-contact` |
| `CONTACT_WEBHOOK_SECRET` | Yes | Shared secret — must match the portal deploy exactly; set via Netlify env only |

Full setup, local testing examples, rotation, and troubleshooting:
**[docs/contact-form.md](docs/contact-form.md)**

## Deploy

Pushes to `main` automatically deploy via Netlify. To deploy manually from the CLI:

```bash
bunx netlify deploy --prod --build
```

Env vars, verification steps, and pipeline details: **[docs/deploy.md](docs/deploy.md)**
