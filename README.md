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
- **Getting paid:** Stripe payouts and client wire/ACH land in Mercury checking — [docs/MONEY_INTO_MERCURY.md](docs/MONEY_INTO_MERCURY.md) (read before travel)

## Contact form (GitHub Projects)

Submissions from the contact form create a **GitHub issue** and add it to a **GitHub Projects v2** board via `POST /api/contact`. Tokens must **never** be committed — configure them as Netlify environment variables (and in `.env.local` for local dev).

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | Personal Access Token with Issues + Projects permissions |
| `GITHUB_REPO` | Yes | Repository for new issues, e.g. `therodfather/seridian` |
| `GITHUB_PROJECT_NUMBER` | One of* | Project number from the project URL (see below) |
| `GITHUB_PROJECT_ID` | One of* | GraphQL node ID for the project (alternative to number) |
| `GITHUB_PROJECT_STATUS` | Recommended | Status column label for new items (see below) |

\* Set either `GITHUB_PROJECT_NUMBER` or `GITHUB_PROJECT_ID`. If both are set, `GITHUB_PROJECT_ID` wins.

Copy `.env.example` → `.env.local` for local development.

### Getting a GitHub token

#### Option A: Fine-grained PAT (recommended)

1. GitHub → **Settings** → **Developer settings** → **Fine-grained personal access tokens**
2. **Generate new token** with access to the target repository (`therodfather/seridian` or a dedicated intake repo)
3. Permissions:
   - **Issues: Read and write** — create issues
   - **Projects: Read and write** — add issues to the project board
   - **Metadata: Read** — included by default
4. If the project belongs to an organization, the org may need to approve the token

#### Option B: Classic PAT

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens (classic)**
2. Scopes: `repo` (private repos) or `public_repo` (public only). For Projects v2, prefer a fine-grained token with **Projects** permission — classic `project` scope targets legacy projects.

### Finding the project number

- User project: `https://github.com/users/therodfather/projects/1` → project number is **`1`**
- Org project: `https://github.com/orgs/ORG/projects/N` → project number is **`N`**

To use the GraphQL node ID instead, run the `projectV2` query in [GitHub's GraphQL Explorer](https://docs.github.com/en/graphql/overview/explorer) and set `GITHUB_PROJECT_ID`.

### Setting the Status column

GitHub Projects v2 boards use a **Status** single-select field for columns. Adding an issue via the API does not set Status — items land in the first option (usually **Todo**) unless you configure `GITHUB_PROJECT_STATUS`.

Set `GITHUB_PROJECT_STATUS` to the **exact label** shown on your project board for the target column (e.g. `Inbox`, `Triage`, `New leads`). Matching is case-insensitive.

**How to find column names:** open your project board and read the Status column headers — use those labels exactly. To list options via GraphQL, run this in the [GraphQL Explorer](https://docs.github.com/en/graphql/overview/explorer) (replace `therodfather` and `1` if needed):

```graphql
query {
  user(login: "therodfather") {
    projectV2(number: 1) {
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          options { name }
        }
      }
    }
  }
}
```

For org-owned projects, use `organization(login: "ORG")` instead of `user(login: "...")`.

### Netlify (production + deploy previews)

```bash
npx netlify-cli env:set GITHUB_TOKEN "ghp_..." --context production --context deploy-preview
npx netlify-cli env:set GITHUB_REPO "therodfather/seridian" --context production --context deploy-preview
npx netlify-cli env:set GITHUB_PROJECT_NUMBER "1" --context production --context deploy-preview
npx netlify-cli env:set GITHUB_PROJECT_STATUS "YourColumnName" --context production --context deploy-preview
```

Remove legacy Linear vars if they are still set:

```bash
npx netlify-cli env:unset LINEAR_API_KEY --context production --context deploy-preview
npx netlify-cli env:unset LINEAR_TEAM_ID --context production --context deploy-preview
```

Redeploy after changing env vars so they take effect on deployed builds.

## Deploy

Pushes to `main` automatically deploy via Netlify. To deploy manually from the CLI:

```bash
bunx netlify deploy --prod --build
```
