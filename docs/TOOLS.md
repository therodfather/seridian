# Seridian Tools Reference

> Complete inventory of tools, runtimes, and services used across the Seridian project.
> Last updated: 2026-08-11

---

## Table of Contents

1. [Runtime & Package Manager](#runtime--package-manager)
2. [Frontend Framework](#frontend-framework)
3. [Backend (ConvexDB)](#backend-convexdb)
4. [UI Components](#ui-components)
5. [State Management](#state-management)
6. [Authentication](#authentication)
7. [Mobile (KMP & Android)](#mobile-kmp--android)
8. [CI/CD](#cicd)
9. [Testing](#testing)
10. [Data Sources & Integrations](#data-sources--integrations)
11. [Development Tools](#development-tools)

---

## Runtime & Package Manager

| Tool | Version | Purpose |
|------|---------|---------|
| **Bun** | 1.4.0 | Package manager, runtime, and script runner (enforced — no npm/yarn/pnpm) |
| **Node.js** | 22 | Required by Next.js and Convex tooling |
| **Java (Zulu JDK)** | 17 | Android/KMP compilation and Gradle builds |

### Bun Configuration

- `packageManager` field in `package.json` enforces `bun@1.4.0`
- `.bun-version` file for local version pinning
- All CI jobs use `oven-sh/setup-bun@v2` with frozen lockfiles
- Install command: `bun install --frozen-lockfile`

**Never use `npm`, `yarn`, or `pnpm`.** The README's `npm install` reference is stale.

### Key Scripts

```bash
bun run dev          # Next.js dev server (http://localhost:3000)
bun run build        # Production build (next build)
bun run lint         # ESLint via next lint
bunx tsc --noEmit    # TypeScript type checking
bun run test         # Vitest unit tests
bun run seed         # Database seeding
bunx convex dev      # Convex dev server (real-time sync)
bunx convex deploy   # Deploy Convex functions
```

---

## Frontend Framework

| Tool | Version | Purpose |
|------|---------|---------|
| **Next.js** | 16.3.0 | React framework (App Router, Turbopack) |
| **React** | 19.2.8 | UI library |
| **React DOM** | 19.2.8 | DOM rendering |
| **Tailwind CSS** | 4.1.11 | Utility-first CSS framework |
| **@tailwindcss/postcss** | 4.1.11 | PostCSS plugin for Tailwind v4 |

### Next.js Configuration

- **App Router** — all routes under `src/app/`
- **Turbopack** — default bundler in dev mode
- **React 19** — latest concurrent features
- No API routes yet; `.env.example` anticipates `/api/contact`
- Netlify plugin: `@netlify/plugin-nextjs`

### Tailwind CSS v4

Tailwind v4 uses CSS-first configuration (no `tailwind.config.*`):

```css
@import "tailwindcss";

@theme {
  --color-seridian-500: #06b6d4;
  /* ... */
}

@theme inline {
  --font-sans: var(--font-body);
  --font-display: var(--font-space-grotesk);
}
```

PostCSS config (`postcss.config.mjs`):

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Fonts

Loaded via `next/font/google` in `src/app/layout.tsx`:

| Font | Variable | Role |
|------|----------|------|
| **Space Grotesk** | `--font-space-grotesk` | Display / heading font |
| **Inter** | `--font-body` | Body text |
| **JetBrains Mono** | `--font-jetbrains-mono` | Code / monospace |

All fonts use `font-display: swap` for performance.

---

## Backend (ConvexDB)

| Tool | Version | Purpose |
|------|---------|---------|
| **Convex** | 1.43.0 | Real-time serverless database and backend framework |
| **convex-test** | 0.0.55 | Testing utilities for Convex functions |

### Convex Function Types

| Type | Purpose | Examples |
|------|---------|----------|
| **query** | Read data (cached, real-time subscriptions) | `chat.listChannels`, `chat.getUsers` |
| **mutation** | Write data (transactional) | `chat.createChannel`, `chat.sendMessage` |
| **action** | Run server-side code (external API calls) | `linearSync.syncAllLinear`, `githubSync.syncAllGitHub` |
| **internalMutation** | Mutations callable only from actions | `linearSync.upsertIssues`, `githubSync.upsertGitHubIssues` |

### Schema Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `clients` | Client records | `by_status` |
| `contracts` | Client contracts | `by_clientId` |
| `issues` | Linear-synced issues | `by_linearId`, `by_status`, `by_clientId` |
| `bookings` | Client bookings | `by_startTime`, `by_clientId` |
| `channels` | Chat channels | `by_type`, `by_createdBy` |
| `messages` | Chat messages | `by_channelId_and_createdAt`, `by_senderId` |
| `users` | Chat users (pubkey-based) | `by_pubkey`, `by_status` |
| `deals` | Sales pipeline deals | `by_stage`, `by_clientId` |
| `proposals` | Client proposals | `by_status`, `by_clientId` |
| `caseStudies` | Published case studies | `by_published`, `by_order` |
| `emailTemplates` | Email templates | `by_category`, `by_createdBy` |
| `files` | Uploaded files (storage) | `by_parentId`, `by_clientId`, `by_type` |
| `syncMeta` | Sync timestamps | `by_key` |
| `githubIssues` | GitHub-synced issues | `by_githubId`, `by_state` |
| `githubProjects` | GitHub-synced projects | `by_githubId` |
| `linearTeams` | Linear teams | `by_linearId` |
| `linearProjects` | Linear projects | `by_linearId` |
| `linearLabels` | Linear workflow states | `by_linearId` |
| `linearUsers` | Linear users | `by_linearId` |

### Convex File Storage

- Upload: `files.upload` action stores blobs via `ctx.storage.store()`
- Retrieval: `files.getStorageUrl` query returns signed URLs
- Deletion: `files.remove` mutation deletes from storage and database

### Environment Variables

```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url   # Client-side
CONVEX_DEPLOYMENT=your_convex_deployment_name         # Server-side
```

Generated automatically by `bunx convex dev`.

---

## UI Components

### @bytecats/ui-kit (Vendored)

| Property | Value |
|----------|-------|
| **Path** | `vendor/ui-kit/` |
| **Version** | 0.2.0 |
| **Type** | Vendored (committed `dist/`, no build step) |
| **Package ref** | `file:./vendor/ui-kit` (relative only) |

**Do not move, rebuild, or modify `vendor/ui-kit/dist/`** — CI and Netlify depend on committed artifacts.

#### Dependencies

| Package | Purpose |
|---------|---------|
| `radix-ui` | Headless UI primitives |
| `class-variance-authority` | Variant-based component styling |
| `clsx` | Conditional class names |
| `tailwind-merge` | Tailwind class deduplication |
| `lucide-react` | Icon library |
| `motion` | Animations (Framer Motion successor) |
| `cmdk` | Command palette |
| `sonner` | Toast notifications |
| `react-day-picker` | Date picker |
| `date-fns` | Date utilities |
| `canvas-confetti` | Confetti animations |

#### Import Order (Critical)

```tsx
// src/app/layout.tsx
import "@bytecats/ui-kit/styles.css";  // 1. Kit styles FIRST
import "./globals.css";                 // 2. Project overrides SECOND
```

#### Theming

- Kit uses Astryx design tokens + CSS `light-dark()` for automatic dark mode
- Two themes available: `neutral` / `stone` via `data-ui-theme` attribute
- Seridian overrides `--astryx-color-accent` → `#06b6d4` (cyan) in `globals.css`
- No `.dark` class — respects `prefers-color-scheme` natively

#### Re-exports

```ts
// src/lib/utils.ts
export { cn } from "@bytecats/ui-kit";  // clsx + tailwind-merge
```

### shadcn Patterns

The ui-kit is built on shadcn/ui patterns:
- Headless primitives via Radix UI
- Variants via `class-variance-authority`
- Composable component API
- Tailwind-first styling

---

## State Management

### Convex Real-Time Subscriptions

| Hook | Purpose | Usage |
|------|---------|-------|
| `useQuery` | Subscribe to a query (auto-updates) | `useQuery(api.chat.listChannels, { pubkey })` |
| `useMutation` | Create a mutation caller | `const sendMessage = useMutation(api.chat.sendMessage)` |
| `useConvexQuery` | Alternative query hook | Same as `useQuery` |

### React State

| Hook | Purpose |
|------|---------|
| `useState` | Local component state |
| `useMemo` | Derived/computed values |
| `useCallback` | Memoized callbacks |
| `useContext` | Context consumption |

### KMP State Management (Mobile)

| Class | Purpose |
|-------|---------|
| `ChatViewModel` | Manages UI state via `MutableStateFlow<ChatUiState>` |
| `ChatUiState` | Data class holding all chat UI state |
| `StateFlow<T>` | Kotlin coroutine-based reactive state |

---

## Authentication

### Current Implementation

| Method | Status | Notes |
|--------|--------|-------|
| **LocalStorage session** | Active | Pubkey-based identity stored client-side |
| **Convex auth** | Planned | Not yet implemented |

### Pubkey-Based Identity

- Users identified by `pubkey` string (no email/password yet)
- Stored in `localStorage` on the client
- Sent with every Convex request for authorization
- Chat mutations validate `senderId` matches the message owner

### Future: Convex Auth

- Planned for user management and access control
- Will replace localStorage-based identity

---

## Mobile (KMP & Android)

### Kotlin Multiplatform (kmp-chat/)

| Tool | Version | Purpose |
|------|---------|---------|
| **Kotlin** | 2.1.0 | Language (multiplatform) |
| **Ktor** | 3.0.3 | HTTP client (OkHttp engine on Android) |
| **kotlinx-coroutines** | 1.9.0 | Async/concurrent programming |
| **kotlinx-serialization** | 1.7.3 | JSON serialization |
| **kotlinx-datetime** | 0.6.1 | Date/time utilities |

#### Source Sets

| Source Set | Purpose |
|------------|---------|
| `commonMain` | Shared code (client, protocol, viewmodel) |
| `androidMain` | Android-specific implementations |
| `commonTest` | Shared tests |
| `androidUnitTest` | Android-specific unit tests |

#### Key Classes

| Class | Location | Purpose |
|-------|----------|---------|
| `ChatClient` | `commonMain` | Interface for chat operations |
| `ConvexClient` | `commonMain` | HTTP-based Convex implementation |
| `ChatViewModel` | `commonMain` | UI state management |
| `ChatChannel`, `ChatMessage`, `ChatUser` | `commonMain/protocol` | Data models |
| `ConnectionState` | `commonMain/client` | Enum: DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, FAILED |

### Android App (android-chat/)

| Tool | Version | Purpose |
|------|---------|---------|
| **Kotlin** | 2.1.0 | Language |
| **Jetpack Compose** | BOM 2024.12.01 | Declarative UI toolkit |
| **Compose Material 3** | (via BOM) | Material Design components |
| **Compose Navigation** | 2.8.5 | Screen navigation |
| **Ktor Client** | 3.0.3 | HTTP requests |
| **DataStore** | 1.1.1 | Persistent key-value storage |
| **Lifecycle ViewModel** | 2.8.7 | ViewModel integration |

#### Build Configuration

| Setting | Value |
|---------|-------|
| `compileSdk` | 35 |
| `minSdk` | 26 |
| `targetSdk` | 35 |
| `jvmTarget` | 17 |
| `applicationId` | `com.seridian.chat.android` |

#### Screens

| Screen | File |
|--------|------|
| `LoginScreen` | `ui/screens/LoginScreen.kt` |
| `ChatListScreen` | `ui/screens/ChatListScreen.kt` |
| `MessageScreen` | `ui/screens/MessageScreen.kt` |

#### Navigation

```kotlin
// navigation/ChatNavGraph.kt
SeridianChatNavGraph(viewModel)
```

---

## CI/CD

### GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **PR Workflow** | `pr.yml` | PR to main, push to main | Lint → Typecheck → Build → Bundle check → Label |
| **Convex CI** | `convex.yml` | Push/PR to main/feature/* | Typecheck Convex functions |
| **Android CI** | `android.yml` | Push/PR to main/feature/* | Unit tests → Debug APK → Release APK |
| **Linear Sync** | `linear-sync.yml` | Issue events | Comment Linear ↔ GitHub links |
| **Visual Preview** | `visual.yml` | PR to main | Sticky comment with preview instructions |

### PR Workflow Jobs

```
ci (ubuntu-latest)
  ├─ bun install --frozen-lockfile
  ├─ bun run lint
  ├─ bunx tsc --noEmit
  ├─ bun run build (NEXT_TELEMETRY_DISABLED=1)
  └─ Upload build artifact
       │
       ├─ size-check (needs: ci)
       │   └─ Comment bundle hint on PR
       │
       └─ auto-merge-ready (needs: ci)
           └─ Label PR ci:passed
```

### Android CI Jobs

```
test (ubuntu-latest)
  ├─ JDK 17 (Zulu)
  └─ ./gradlew test
       │
       └─ build (needs: test)
           └─ ./gradlew :app:assembleDebug
                │
                └─ release (needs: build, main only)
                    └─ ./gradlew :app:assembleRelease
```

### Netlify Deployment

| Setting | Value |
|---------|-------|
| **Build command** | `bun run build` |
| **Publish directory** | `.next` |
| **Node version** | 22 |
| **Plugin** | `@netlify/plugin-nextjs` |
| **Skew protection** | Enabled (`NETLIFY_NEXT_SKELETON_PROTECTION=true`) |

- Push to `main` → auto-deploy to production
- PRs → Deploy Preview (commented in PR)

---

## Testing

### Vitest (Convex Functions)

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 4.0.0 | Test runner |
| **convex-test** | 0.0.55 | Convex testing utilities |

**Config:** Uses `convexTest()` with schema and glob-imported modules:

```ts
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("chat functions", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("createChannel creates a channel", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "general",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });
    expect(channelId).toBeDefined();
  });
});
```

**Run tests:**

```bash
bun run test        # Single run
bun run test:watch  # Watch mode
```

### kotlin-test (KMP)

| Tool | Version | Purpose |
|------|---------|---------|
| **kotlin-test** | (bundled) | KMP unit testing |
| **kotlinx-coroutines-test** | 1.8.1 | Coroutine test utilities |
| **JUnit 4** | 4.13.2 | Android unit tests |

**Test files:**

| File | Tests |
|------|-------|
| `ChatViewModelTest.kt` | ViewModel state management |
| `ConvexClient.kt` | HTTP client operations |
| `ModelsTest.kt` | Data model serialization |
| `FakeChatClient.kt` | Mock client for testing |

### Playwright (Planned)

- Not yet configured
- Intended for E2E testing of the web application

---

## Data Sources & Integrations

### Linear API

| Property | Value |
|----------|-------|
| **Endpoint** | `https://api.linear.app/graphql` |
| **Auth** | `LINEAR_API_KEY` (Bearer token) |
| **Team ID** | `SER` (Seridian team) |
| **Page size** | 100 (paginated) |

**Synced entities:**

| Entity | Function | Convex Table |
|--------|----------|--------------|
| Issues | `syncLinearIssues` | `issues` |
| Teams | `syncLinearTeams` | `linearTeams` |
| Projects | `syncLinearProjects` | `linearProjects` |
| Labels | `syncLinearLabels` | `linearLabels` |
| Users | `syncLinearUsers` | `linearUsers` |

**Status mapping:**

| Linear Status | Convex Status |
|---------------|---------------|
| backlog | backlog |
| todo | todo |
| in progress | in_progress |
| in review | in_review |
| done, completed, canceled, cancelled, duplicate | done |

**Priority mapping:**

| Linear Priority | Convex Priority |
|-----------------|-----------------|
| 0 | none |
| 1 | urgent |
| 2 | high |
| 3 | medium |
| 4 | low |

### GitHub REST API

| Property | Value |
|----------|-------|
| **Endpoint** | `https://api.github.com` |
| **Auth** | `GITHUB_TOKEN` (Bearer token) |
| **Default repo** | `therodfather/seridian` |
| **Version** | `2022-11-28` |

**Synced entities:**

| Entity | Function | Convex Table |
|--------|----------|--------------|
| Issues | `syncGitHubIssues` | `githubIssues` |
| Projects | `syncGitHubProjects` | `githubProjects` |

### GitHub GraphQL API

| Property | Value |
|----------|-------|
| **Endpoint** | `https://api.github.com/graphql` |
| **Auth** | `GITHUB_TOKEN` (Bearer token) |

**Used for:** Fetching organization projects (v2) with cursor-based pagination.

### Combined Sync

```typescript
// Sync all Linear data
await runAction(api.linearSync.syncAllLinear);

// Sync all GitHub data
await runAction(api.githubSync.syncAllGitHub);
```

---

## Development Tools

### TypeScript

| Tool | Version | Purpose |
|------|---------|---------|
| **TypeScript** | 5.9.2 | Type system |
| **@types/node** | 24.2.1 | Node.js type definitions |
| **@types/react** | 19.1.9 | React type definitions |
| **@types/react-dom** | 19.1.7 | ReactDOM type definitions |

**Configuration (`tsconfig.json`):**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"],
      "convex/_generated/*": ["./convex/_generated/*"]
    }
  }
}
```

**Type check command:**

```bash
bunx tsc --noEmit
```

### ESLint

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.33.0 | Code linting |
| **eslint-config-next** | 16.3.0 | Next.js ESLint rules |
| **@eslint/eslintrc** | 3.3.1 | Config compatibility |

**Config:** `eslint.config.mjs` (flat config format for ESLint 9)

**Known issue:** `next lint` was removed in Next 16. PR CI still runs `bun run lint` which will fail until migrated via `npx @next/codemod@canary next-lint-to-eslint-cli .`.

### Git Worktrees

Used for parallel feature development:

```bash
# Create worktree
git worktree add /tmp/wt-<slug> -b feature/<slug> main

# List worktrees
git worktree list

# Remove worktree
git worktree remove /tmp/wt-<slug>
```

**Conventions:**
- Worktree path: `/tmp/wt-<slug>`
- Branch naming: `feature/<slug>`
- Each Linear issue gets its own worktree

### Gradle (Android/KMP)

| Property | Value |
|----------|-------|
| **Android Gradle Plugin** | 8.7.3 |
| **Kotlin Gradle Plugin** | 2.1.0 |
| **Compose Compiler** | 2.1.0 (via `kotlin.plugin.compose`) |

**Build commands:**

```bash
# Android app
cd android-chat
./gradlew test                    # Unit tests
./gradlew :app:assembleDebug     # Debug APK
./gradlew :app:assembleRelease   # Release APK

# KMP library
cd kmp-chat
./gradlew build                   # Build all targets
./gradlew test                    # Run common tests
```

---

## Version Summary

| Category | Tool | Version |
|----------|------|---------|
| Runtime | Bun | 1.4.0 |
| Runtime | Node.js | 22 |
| Frontend | Next.js | 16.3.0 |
| Frontend | React | 19.2.8 |
| Frontend | Tailwind CSS | 4.1.11 |
| Backend | Convex | 1.43.0 |
| UI Kit | @bytecats/ui-kit | 0.2.0 |
| Mobile | Kotlin | 2.1.0 |
| Mobile | Ktor | 3.0.3 |
| Mobile | Compose BOM | 2024.12.01 |
| Testing | Vitest | 4.0.0 |
| Testing | convex-test | 0.0.55 |
| Language | TypeScript | 5.9.2 |
| Linting | ESLint | 9.33.0 |
| Build | Gradle (AGP) | 8.7.3 |
| CI | GitHub Actions | latest |
| Deploy | Netlify | (managed) |
