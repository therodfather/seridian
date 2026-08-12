# Deployment Guide

Production deployment for the Seridian marketing site.

## Prerequisites

- **Bun** 1.4.0 (`packageManager` in `package.json`)
- **Node** 22 (`.nvmrc` / `netlify.toml`)
- **Netlify** account linked to GitHub repo
- **Convex** project (for backend features)

## Netlify Setup

### 1. Connect Repository

1. Log in to [Netlify](https://app.netlify.com)
2. **Add new site → Import an existing project**
3. Select GitHub and authorize `therodfather/seridian`
4. Netlify auto-detects the `@netlify/plugin-nextjs` plugin from `netlify.toml`

### 2. Build Settings

Configured in `netlify.toml` — no manual Netlify UI overrides needed:

| Setting       | Value                  |
|---------------|------------------------|
| Build command | `bun run build`        |
| Publish dir   | `.next`                |
| Node version  | `22`                   |
| Plugin        | `@netlify/plugin-nextjs` |

### 3. Environment Variables

Set these in **Netlify → Site → Build & deploy → Environment**:

| Variable                          | Required | Description                                       |
|-----------------------------------|----------|---------------------------------------------------|
| `NEXT_PUBLIC_CONVEX_URL`          | Yes      | Convex deployment URL (e.g. `https://xxx.convex.cloud`) |
| `CONVEX_DEPLOYMENT`               | Yes      | Convex deployment name (from `npx convex dev`)    |
| `LINEAR_API_KEY`                  | No       | Linear API key for sync features                  |
| `LINEAR_TEAM_ID`                  | No       | Linear team ID (default: `SER`)                   |
| `LINEAR_PROJECT_ID`               | No       | Linear project ID for issue routing               |
| `GITHUB_TOKEN`                    | No       | GitHub PAT for contact form → Projects            |
| `GITHUB_REPO`                     | No       | Target repo for contact issues (`owner/repo`)     |
| `GITHUB_PROJECT_NUMBER`           | No       | GitHub Projects v2 board number                   |
| `GITHUB_PROJECT_STATUS`           | No       | Status column label for new contact issues        |

> **Note:** `NEXT_TELEMETRY_DISABLED=1` is set automatically in `netlify.toml` — no env var needed.

### 4. Deploy

- **Production:** Push to `main` branch → auto-deploys
- **Preview:** Open a PR → Netlify creates a Deploy Preview
- **Manual:** Netlify UI → Deploys → Trigger deploy

## Domain Setup

1. **Netlify → Domain management → Add custom domain**
2. Enter `seridian.dev` (or your domain)
3. Update DNS records:
   - **Option A (recommended):** Point nameservers to Netlify
   - **Option B:** Add CNAME record: `www` → `your-site.netlify.app`
4. Enable **HTTPS** (automatic via Let's Encrypt)
5. Set primary domain and redirect `www` → apex (or vice versa)

## Convex Deployment

Convex powers backend features (contact form, data sync).

### Initial Setup

```bash
# Install Convex CLI
bun add -D convex

# Initialize Convex in project (if not already)
npx convex init

# Start dev server (auto-generates .env.local)
npx convex dev
```

### Production Deployment

```bash
# Deploy Convex functions to production
npx convex deploy
```

This outputs:
- `NEXT_PUBLIC_CONVEX_URL` → set in Netlify env vars
- `CONVEX_DEPLOYMENT` → set in Netlify env vars

### Linking Netlify to Convex

After deploying Convex:
1. Copy the deployment URL from `npx convex deploy` output
2. Add `NEXT_PUBLIC_CONVEX_URL` to Netlify environment variables
3. Redeploy the Netlify site to pick up the new env var

## Android APK Builds (GitHub Actions)

APK builds run via GitHub Actions for the companion mobile experience.

### Setup

1. Ensure `.github/workflows/android.yml` exists (or create it)
2. Add a **GitHub PAT** with `repo` scope to repository secrets:
   - Go to **Settings → Secrets and variables → Actions**
   - Add `GH_PAT` with your personal access token

### Triggering Builds

- **Automatic:** Push a tag matching `v*` (e.g. `v1.0.0`)
- **Manual:** Actions tab → Android Build → Run workflow

### Build Process

GitHub Actions workflow:
1. Checks out code
2. Sets up JDK 17
3. Runs `./gradlew assembleRelease`
4. Uploads APK as a release artifact

### Downloading APKs

- **From GitHub Releases:** Tag page → Assets → download `.apk`
- **From Actions:** Actions tab → completed run → Artifacts section

## CI/CD Pipeline

GitHub Actions runs on every PR (`.github/workflows/pr.yml`):

| Stage       | Command                     | Gate |
|-------------|-----------------------------|------|
| Lint        | `bun run lint`              | Must pass |
| Typecheck   | `bunx tsc --noEmit`        | Must pass |
| Build       | `bun run build`             | Must pass |

All three must pass before a PR can merge.

## Troubleshooting

### Build Fails on Netlify

- **Bun version mismatch:** Ensure `packageManager` in `package.json` matches Netlify's bun version
- **Lockfile drift:** Run `bun install --frozen-lockfile` locally and commit `bun.lock`
- **Memory errors:** Netlify defaults to 1024MB; contact support if build OOMs

### Convex Connection Errors

- Verify `NEXT_PUBLIC_CONVEX_URL` is set correctly in Netlify env vars
- Ensure Convex deployment is active: `npx convex dev` (check dashboard)
- Check Convex function logs: `npx convex dashboard`

### APK Build Failures

- Verify `GH_PAT` secret is set with correct permissions
- Check Java/JDK version compatibility (requires JDK 17+)
- Review Gradle sync errors in Actions logs
