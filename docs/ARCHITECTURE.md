# Seridian Architecture

System architecture documentation for the Seridian consulting platform.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Frontend Architecture](#frontend-architecture-nextjs-app-router)
- [Backend Architecture](#backend-architecture-convexdb)
- [Data Flow](#data-flow)
- [Authentication Flow](#authentication-flow)
- [Real-Time Subscriptions](#real-time-subscriptions)
- [Mobile Architecture](#mobile-architecture-kmp--android)
- [CI/CD Pipeline](#cicd-pipeline)
- [Directory Structure](#directory-structure)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                      │
│                                                                         │
│   ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐     │
│   │  Next.js Web │    │  Android Native  │    │  Contact Form    │     │
│   │  (App Router)│    │  (Compose UI)    │    │  (API Route)     │     │
│   └──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘     │
│          │                     │                       │                │
│          │              ┌──────┴───────┐               │                │
│          │              │  KMP Shared  │               │                │
│          │              │  Module      │               │                │
│          │              └──────┬───────┘               │                │
│          │                     │                       │                │
└──────────┼─────────────────────┼───────────────────────┼────────────────┘
           │                     │                       │
           ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONVEX CLOUD                                    │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                     ConvexDB (Real-time)                        │  │
│   │                                                                 │  │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ │  │
│   │  │ clients │ │ issues  │ │ deals   │ │ channels │ │ files  │ │  │
│   │  │ bookings│ │proposals│ │ messages│ │  users   │ │contracts│ │  │
│   │  └─────────┘ └─────────┘ └─────────┘ └──────────┘ └────────┘ │  │
│   │                                                                 │  │
│   │  ┌──────────────────────────────────────────────────────────┐  │  │
│   │  │  Linear/GitHub Sync Tables                               │  │  │
│   │  │  linearTeams │ linearProjects │ githubIssues │ syncMeta  │  │  │
│   │  └──────────────────────────────────────────────────────────┘  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  Convex Functions (Queries, Mutations, Actions)                 │  │
│   │                                                                 │  │
│   │  chat.ts    clients.ts   issues.ts   deals.ts   bookings.ts   │  │
│   │  files.ts   proposals.ts users.ts    contracts.ts              │  │
│   │  linearSync.ts    githubSync.ts    emailTemplates.ts           │  │
│   │  linearIngest.ts  githubIngest.ts  caseStudies.ts              │  │
│   └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
           ┌───────────────┐            ┌────────────────┐
           │  Linear API   │            │  GitHub API    │
           │  (GraphQL)    │            │  (REST + GQL)  │
           └───────────────┘            └────────────────┘
```

**Key design decisions:**

- **Convex as the single source of truth** -- all application data lives in ConvexDB with real-time subscriptions. No separate database.
- **KMP shared module** -- chat logic is shared between the web app (via Convex React client) and the native Android app (via KMP ConvexClient).
- **Sync architecture** -- Linear and GitHub data is ingested into Convex tables via Convex actions, enabling unified querying across internal and external data.
- **Vendored UI kit** -- `@bytecats/ui-kit` is committed directly in `vendor/ui-kit/` with pre-built `dist/` artifacts to avoid CI/Netlify build step dependencies.

---

## Frontend Architecture (Next.js App Router)

```
src/app/
├── layout.tsx                    # Root layout (fonts, Header, Footer, Toaster)
├── ConvexClientProvider.tsx      # Global Convex provider (client component)
├── page.tsx                      # Landing page
├── globals.css                   # Tailwind v4 + Seridian theme
│
├── dashboard/
│   ├── layout.tsx                # Dashboard layout (ConvexClientProvider + DashboardLayout)
│   ├── page.tsx                  # Dashboard overview
│   ├── issues/
│   │   ├── page.tsx              # Kanban board
│   │   └── [issueId]/page.tsx    # Issue detail
│   ├── clients/
│   │   ├── page.tsx              # Client list
│   │   └── [clientId]/page.tsx   # Client detail
│   ├── bookings/page.tsx         # Booking calendar
│   ├── sales/page.tsx            # Sales pipeline
│   ├── proposals/
│   │   ├── page.tsx              # Proposal list
│   │   └── [proposalId]/page.tsx # Proposal detail
│   ├── templates/page.tsx        # Email templates
│   ├── files/page.tsx            # File management
│   ├── chat/page.tsx             # Real-time chat
│   └── sync/page.tsx             # Linear/GitHub sync
│
├── packages/page.tsx             # Service packages/pricing
├── casestudies/
│   ├── layout.tsx                # Case studies layout
│   └── page.tsx                  # Public case studies
│
└── api/contact/route.ts          # Contact form → GitHub issue
```

### Component Architecture

```
src/components/
├── ui/                           # Reusable primitives (shadcn-style)
│   ├── SearchCommand.tsx         # Cmd+K search (must be inside ConvexProvider)
│   ├── MobileNav.tsx             # Mobile navigation drawer
│   ├── Breadcrumbs.tsx
│   ├── PageHeader.tsx
│   └── ResponsiveGrid.tsx
│
├── dashboard/                    # Dashboard layout components
│   ├── DashboardLayout.tsx       # Sidebar + main content wrapper
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── DashboardGuard.tsx        # Auth gate (localStorage-based)
│   ├── PageHeader.tsx
│   ├── PageSkeleton.tsx
│   └── EmptyState.tsx
│
├── chat/                         # Real-time chat UI
│   ├── ChatLayout.tsx
│   ├── ChannelList.tsx
│   ├── ChannelForm.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── UserPanel.tsx
│
├── kanban/                       # Drag-and-drop issue board
│   ├── KanbanBoard.tsx
│   └── IssueCard.tsx
│
├── sync/                         # GitHub sync UI (Linear via Convex only)
│   ├── SyncDashboard.tsx
│   ├── SyncCard.tsx
│   └── GitHubSyncSection.tsx
│
├── clients/                      # Client management
├── bookings/                     # Booking calendar
├── sales/                        # Sales pipeline (Kanban)
├── proposals/                    # Proposal management
├── files/                        # File upload/management
├── emailtemplates/               # Email template editor
├── casestudies/                  # Case study display
├── auth/                         # Login screen
│
└── [landing]                     # Marketing/landing components
    ├── Hero.tsx / HeroWebGL.tsx / WebGLHero.tsx
    ├── Services.tsx
    ├── Approach.tsx
    ├── Expertise.tsx
    ├── Contact.tsx
    ├── Packages.tsx
    ├── Header.tsx
    └── Footer.tsx
```

### Routing Strategy

| Route | Type | Auth | Convex | Description |
|-------|------|------|--------|-------------|
| `/` | Static | Public | No | Landing page |
| `/packages` | Static | Public | No | Pricing/packages |
| `/casestudies` | Dynamic | Public | Yes | Case studies from Convex |
| `/dashboard` | Dynamic | Guarded | Yes | Dashboard overview |
| `/dashboard/issues` | Dynamic | Guarded | Yes | Kanban board |
| `/dashboard/clients` | Dynamic | Guarded | Yes | Client management |
| `/dashboard/bookings` | Dynamic | Guarded | Yes | Booking calendar |
| `/dashboard/sales` | Dynamic | Guarded | Yes | Sales pipeline |
| `/dashboard/proposals` | Dynamic | Guarded | Yes | Proposal management |
| `/dashboard/templates` | Dynamic | Guarded | Yes | Email templates |
| `/dashboard/files` | Dynamic | Guarded | Yes | File management |
| `/dashboard/chat` | Dynamic | Guarded | Yes | Real-time chat |
| `/dashboard/sync` | Dynamic | Guarded | Yes | Linear/GitHub sync |
| `/api/contact` | API Route | Public | No | Contact form submission |

### Styling

- **Tailwind CSS v4** with `@import "tailwindcss"` + `@theme` in `globals.css` (no `tailwind.config.*`)
- **Vendored UI kit** (`@bytecats/ui-kit`) provides shadcn-inspired primitives with Astryx design tokens
- **CSS `light-dark()`** theming (no `.dark` class -- respects `prefers-color-scheme`)
- **Seridian custom palette**: cyan accent (`#06b6d4`), dark surfaces (`#070b14`, `#172033`, `#0c1222`)
- **Fonts**: Space Grotesk (headings), Inter (body), JetBrains Mono (code) via `next/font/google`

---

## Backend Architecture (ConvexDB)

### Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ConvexDB Tables                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Core Business                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐ │
│  │ clients │  │ contracts│  │  deals  │  │   bookings   │ │
│  └─────────┘  └──────────┘  └─────────┘  └──────────────┘ │
│                                                              │
│  Project Management                                          │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────────┐ │
│  │ issues  │  │proposals │  │      emailTemplates        │ │
│  └─────────┘  └──────────┘  └────────────────────────────┘ │
│                                                              │
│  Communication                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ channels │  │ messages │  │  users   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                              │
│  Content & Storage                                           │
│  ┌────────────┐  ┌──────────┐                               │
│  │caseStudies │  │  files   │  (uses _storage for blobs)    │
│  └────────────┘  └──────────┘                               │
│                                                              │
│  External Sync                                               │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│  │ linearTeams│  │ linearProjects│  │   linearLabels   │   │
│  └────────────┘  └───────────────┘  └──────────────────┘   │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ linearUsers│  │ githubIssues │  │  githubProjects  │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌──────────┐                                               │
│  │ syncMeta │  (key/value store for sync timestamps)        │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

### Function Categories

| File | Type | Purpose |
|------|------|---------|
| `chat.ts` | Queries + Mutations | Channel CRUD, message send/edit/delete, user status, join/leave |
| `clients.ts` | Queries + Mutations | Client CRUD with status filtering |
| `issues.ts` | Queries + Mutations | Issue CRUD with status/priority/client indexing |
| `deals.ts` | Queries + Mutations | Sales pipeline deals |
| `bookings.ts` | Queries + Mutations | Calendar booking management |
| `proposals.ts` | Queries + Mutations | Proposal lifecycle (draft → sent → accepted) |
| `contracts.ts` | Queries + Mutations | Client contract management |
| `emailTemplates.ts` | Queries + Mutations | Reusable email templates with variables |
| `files.ts` | Queries + Mutations + Actions | File upload to `_storage`, CRUD, URL generation |
| `users.ts` | Queries + Mutations | User upsert by pubkey, status management |
| `caseStudies.ts` | Queries + Mutations | Published case studies |
| `linearSync.ts` | Actions + Internal Mutations | Fetch from Linear API → upsert into Convex tables |
| `githubSync.ts` | Actions + Internal Mutations | Fetch from GitHub API → upsert into Convex tables |
| `linearIngest.ts` | Mutations | Internal upsert helpers for Linear data |
| `githubIngest.ts` | Mutations | Internal upsert helpers for GitHub data |

### Convex Function Types

```
┌─────────────────────────────────────────────────────┐
│                  Convex Functions                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  query ─────── Read-only, runs on Convex servers     │
│    │         Can subscribe to for real-time updates  │
│    │         Uses ctx.db for database access          │
│    │                                                  │
│  mutation ──── Write operations, transactional       │
│    │         Runs on Convex servers                   │
│    │         Can read/write database                  │
│    │                                                  │
│  action ────── Side effects, runs in edge runtime    │
│              Can call external APIs (Linear, GitHub) │
│              Can run mutations via ctx.runMutation    │
│              Can call other actions via ctx.runAction │
│                                                      │
│  internalMutation ── Private, not exposed to clients │
│                     Used by actions for upserts       │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow

### Read Path (Real-Time Subscription)

```
┌──────────┐      useQuery()       ┌──────────┐      Subscription      ┌──────────┐
│  React   │ ────────────────────  │  Convex  │ ────────────────────  │ ConvexDB │
│ Component│                       │  React   │                        │          │
│          │ ◀──────────────────── │  Client  │ ◀──────────────────── │          │
└──────────┘   Re-render on data   └──────────┘   Push on mutation     └──────────┘
     │                                                                  │
     │  1. Component mounts with useQuery(api.xxx.list, args)           │
     │  2. ConvexReactClient opens WebSocket subscription              │
     │  3. Server executes query function, returns initial data         │
     │  4. Any mutation affecting the query result triggers push        │
     │  5. Client receives update, React re-renders                     │
```

### Write Path (Mutation)

```
┌──────────┐     useMutation()     ┌──────────┐      Mutation        ┌──────────┐
│  React   │ ────────────────────  │  Convex  │ ───────────────────  │ ConvexDB │
│ Component│                       │  React   │                      │          │
│          │ ◀──────────────────── │  Client  │ ◀─────────────────── │          │
└──────────┘   Return result       └──────────┘   Transaction OK     └──────────┘
     │                                                                  │
     │  1. User action triggers mutation function                       │
     │  2. ConvexReactClient sends mutation over WebSocket              │
     │  3. Server executes mutation in transaction                      │
     │  4. Transaction commits, affected subscriptions triggered        │
     │  5. All subscribed clients receive real-time updates             │
```

### Sync Path (Linear/GitHub → Convex)

```
┌──────────┐    User clicks Sync    ┌──────────┐    Action Trigger     ┌──────────┐
│ Dashboard│ ─────────────────────  │  Convex  │ ────────────────────  │ Linear/  │
│   UI     │                        │  Action  │                       │ GitHub   │
│          │ ◀───────────────────── │          │ ◀──────────────────── │   API    │
└──────────┘    Return results      └──────────┘    Fetch data         └──────────┘
     │                                                                  │
     │  1. User triggers sync (syncAllLinear / syncAllGitHub)           │
     │  2. Convex action calls external API with API key                │
     │  3. Action paginates through all records                         │
     │  4. Action calls internalMutation to upsert into Convex          │
     │  5. syncMeta table updated with lastSyncTime                     │
     │  6. Subscribed dashboard components auto-refresh                  │
```

### Contact Form Path

```
┌──────────┐    POST /api/contact   ┌──────────────┐    Create Issue    ┌──────────┐
│  Hero    │ ─────────────────────  │  Next.js API │ ────────────────  │  GitHub  │
│  Form    │                        │    Route     │                    │   API    │
│          │ ◀───────────────────── │              │ ◀──────────────── │          │
└──────────┘    Return 201 + URL    └──────────────┘    Issue created   └──────────┘
     │                                                                  │
     │  1. Form submits name, email, message via POST                   │
     │  2. API route validates input, applies rate limiting             │
     │  3. Creates GitHub issue via REST API (GITHUB_TOKEN)             │
     │  4. Returns issue URL to client                                  │
     │  5. (Separate) githubSync action ingests into Convex             │
```

---

## Authentication Flow

Seridian uses a **simplified pubkey-based authentication** system. There is no OAuth, JWT, or session management -- authentication is identity-only for the real-time chat system.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User visits /dashboard                                       │
│           │                                                      │
│           ▼                                                      │
│  2. DashboardGuard checks localStorage for "seridian_user"       │
│           │                                                      │
│     ┌─────┴─────┐                                                │
│     │           │                                                │
│  Not found   Found                                              │
│     │           │                                                │
│     ▼           ▼                                                │
│  3a. Show      3b. Parse { pubkey, name }                       │
│      Login         │                                             │
│      Screen        ▼                                             │
│     │          4. Render dashboard with user context              │
│     │                                                             │
│     ▼                                                             │
│  4. User enters pubkey + display name                             │
│     (or clicks "Quick Login as Admin")                            │
│           │                                                      │
│           ▼                                                      │
│  5. Save to localStorage:                                         │
│     { "seridian_user": { "pubkey": "admin", "name": "Admin" } }  │
│           │                                                      │
│           ▼                                                      │
│  6. Dashboard renders, chat connects with pubkey as identity      │
│                                                                  │
│  Chat uses pubkey for:                                            │
│  - User identification in messages                                │
│  - Channel membership (participants array)                        │
│  - Message ownership (senderId)                                   │
│  - User presence (online/offline/away status)                     │
│                                                                  │
│  No password required -- this is a team-internal tool.            │
└─────────────────────────────────────────────────────────────────┘
```

**Login credentials** (from seed data):

| Pubkey | Name | Role |
|--------|------|------|
| `admin` | Admin | Primary admin |
| `rod` | Rod | Team member |

---

## Real-Time Subscriptions

Convex provides real-time subscriptions through its React integration. Every `useQuery()` call automatically subscribes to changes.

```
┌──────────────────────────────────────────────────────────────┐
│                Real-Time Subscription Architecture            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ConvexReactClient                                            │
│       │                                                       │
│       ├── WebSocket Connection (persistent)                   │
│       │       │                                               │
│       │       ├── Subscription: chat.listChannels              │
│       │       ├── Subscription: chat.listMessages              │
│       │       ├── Subscription: chat.getUsers                  │
│       │       ├── Subscription: clients.list                   │
│       │       ├── Subscription: issues.list                    │
│       │       └── Subscription: ... (all useQuery calls)      │
│       │                                                       │
│       └── Mutation Channel (request/response)                  │
│               │                                               │
│               ├── chat.sendMessage                             │
│               ├── chat.createChannel                           │
│               ├── clients.create                               │
│               └── ... (all useMutation calls)                 │
│                                                               │
│  Flow:                                                        │
│  1. Component calls useQuery(api.chat.listMessages, {         │
│       channelId })                                            │
│  2. Client sends subscription request over WebSocket          │
│  3. Server executes query, returns initial result             │
│  4. Server watches for changes to related tables              │
│  5. When messages table changes for this channelId,           │
│     server pushes updated result                               │
│  6. Client updates state, React re-renders                    │
│                                                               │
│  Key behaviors:                                               │
│  - Subscriptions are automatic (no manual setup)              │
│  - Deduplication built in                                     │
│  - Connection management handled by ConvexReactClient         │
│  - Offline support with automatic reconnection               │
│  - Optimistic updates supported via useMutation               │
└──────────────────────────────────────────────────────────────┘
```

### Chat Real-Time Flow

```
User A sends message
        │
        ▼
useMutation(chat.sendMessage) ──→ Convex Server
        │                              │
        │                         Insert into messages table
        │                              │
        │                         Update channels.lastMessageAt
        │                              │
        │                         Trigger subscription push
        │                              │
        ▼                              ▼
User A sees message          User B's component re-renders
(immediate, optimistic)      (real-time via subscription)
```

### Presence System

```
┌──────────────────────────────────────────────────┐
│              User Presence                        │
├──────────────────────────────────────────────────┤
│                                                   │
│  Status values: online | offline | away           │
│                                                   │
│  Tracked via:                                     │
│  - users table (pubkey, status, lastSeen)         │
│  - chat.updateUserStatus mutation                 │
│                                                   │
│  Device types: web | android | ios                │
│                                                   │
│  Online users query:                              │
│  - Filter users by status = "online"              │
│  - Combined with "away" users                     │
│  - Displayed in UserPanel sidebar                 │
└──────────────────────────────────────────────────┘
```

---

## Mobile Architecture (KMP + Android)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile Architecture                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  android-chat/ (Native Android App)                       │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Jetpack Compose UI                                 │  │  │
│  │  │                                                     │  │  │
│  │  │  LoginScreen.kt ─→ ChatListScreen.kt ─→ MessageScreen.kt │
│  │  │                                                     │  │  │
│  │  │  Components:                                        │  │  │
│  │  │  - MessageBubble.kt                                 │  │  │
│  │  │  - ChannelCard.kt                                   │  │  │
│  │  │  - UserAvatar.kt                                    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                         │                                  │  │
│  │                         ▼                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Navigation (ChatNavGraph.kt)                       │  │  │
│  │  │  - Login → ChatList → Messages                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  kmp-chat/ (Shared Kotlin Multiplatform Module)           │  │
│  │                                                           │  │
│  │  commonMain/                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  ChatViewModel.kt                                   │  │  │
│  │  │  - UI state management (StateFlow<ChatUiState>)     │  │  │
│  │  │  - Channel selection, message sending                │  │  │
│  │  │  - User connection management                       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  ChatClient.kt (interface)                          │  │  │
│  │  │  - connect/disconnect                               │  │  │
│  │  │  - Channel CRUD                                     │  │  │
│  │  │  - Message send/edit/delete                         │  │  │
│  │  │  - User management                                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  ConvexClient.kt                                    │  │  │
│  │  │  - HTTP-based Convex client (Ktor)                  │  │  │
│  │  │  - Calls Convex functions via REST                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Models.kt (ChatChannel, ChatMessage, ChatUser)     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  androidMain/                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  PlatformClient.kt (actual implementation)          │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Convex Cloud (same backend as web)                       │  │
│  │                                                           │  │
│  │  - Same chat.ts queries/mutations                         │  │
│  │  - Same channels, messages, users tables                  │  │
│  │  - Same real-time subscription support (via HTTP polling) │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### KMP Module Structure

```
kmp-chat/
├── src/
│   ├── commonMain/kotlin/com/seridian/chat/
│   │   ├── client/
│   │   │   ├── ChatClient.kt          # Interface defining chat operations
│   │   │   └── ConvexClient.kt        # Ktor HTTP client for Convex API
│   │   ├── protocol/
│   │   │   └── Models.kt             # Data classes (ChatChannel, ChatMessage, ChatUser)
│   │   └── viewmodel/
│   │       └── ChatViewModel.kt       # Shared ViewModel with StateFlow
│   │
│   ├── androidMain/kotlin/com/seridian/chat/client/
│   │   └── PlatformClient.kt          # Android-specific client implementation
│   │
│   └── commonTest/kotlin/com/seridian/chat/
│       ├── client/
│       │   ├── FakeChatClient.kt
│       │   ├── ChatViewModelTest.kt
│       │   └── ConvexClientTest.kt
│       ├── protocol/
│       │   └── ModelsTest.kt
│       └── TestConfig.kt
│
├── build.gradle.kts                   # Kotlin 2.1.0, Android Library 8.7.3
├── settings.gradle.kts
└── gradle.properties
```

### Web vs Mobile Comparison

| Feature | Web (Next.js) | Mobile (KMP + Android) |
|---------|---------------|------------------------|
| UI Framework | React 19 + Tailwind | Jetpack Compose |
| Real-time | WebSocket (ConvexReactClient) | HTTP polling (ConvexClient) |
| State Management | React hooks + Convex | Kotlin StateFlow |
| Auth | localStorage pubkey | Same (pubkey-based) |
| Chat Protocol | Convex queries/mutations | Same (via HTTP) |
| Build System | Bun + Next.js | Gradle + Kotlin |
| CI | GitHub Actions (pr.yml) | GitHub Actions (android.yml) |

---

## CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Workflow: pr.yml (PR to main / push to main)                    │   │
│  │                                                                   │   │
│  │  ┌─────────┐    ┌───────────┐    ┌─────────┐                    │   │
│  │  │  Lint   │ →  │ Typecheck │ →  │  Build  │                    │   │
│  │  │(bun run │    │(tsc --noEmit)   │(next    │                    │   │
│  │  │  lint)  │    │           │    │  build) │                    │   │
│  │  └─────────┘    └───────────┘    └─────────┘                    │   │
│  │       │                              │                           │   │
│  │       │         ┌────────────────────┘                           │   │
│  │       │         │                                                │   │
│  │       │    ┌────┴─────┐    ┌──────────────────┐                 │   │
│  │       │    │  Bundle  │ →  │  Label PR as     │                 │   │
│  │       │    │  Size    │    │  ci:passed       │                 │   │
│  │       │    │  Check   │    └──────────────────┘                 │   │
│  │       │    └──────────┘                                          │   │
│  │                                                                   │   │
│  │  Triggers: PR to main, push to main                              │   │
│  │  Concurrency: cancel-in-progress per ref                         │   │
│  │  Runtime: bun@latest, ubuntu-latest                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Workflow: convex.yml (push to main/feature/*, PR to main)       │   │
│  │                                                                   │   │
│  │  ┌───────────┐                                                  │   │
│  │  │ Typecheck │  (bunx tsc --noEmit)                             │   │
│  │  └───────────┘                                                  │   │
│  │                                                                   │   │
│  │  Validates Convex function types independently                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Workflow: android.yml (push to main/feature/*, PR to main)      │   │
│  │                                                                   │   │
│  │  ┌─────────┐    ┌──────────────┐    ┌────────────────┐          │   │
│  │  │  Test   │ →  │ Build Debug  │ →  │ Build Release  │          │   │
│  │  │(JUnit 4)│    │    APK       │    │    APK (main)  │          │   │
│  │  └─────────┘    └──────────────┘    └────────────────┘          │   │
│  │                                                                   │   │
│  │  Runtime: JDK 17 (Zulu), Gradle cache                           │   │
│  │  Release builds only on main branch                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Workflow: linear-sync.yml (issue events)                        │   │
│  │                                                                   │   │
│  │  Triggers on issues labeled/opened/edited with "track:" label     │   │
│  │  Comments Linear ↔ GitHub tandem link on matched issues          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Deployment: Netlify (auto)                                      │   │
│  │                                                                   │   │
│  │  Push to main → Netlify build → Production deploy                │   │
│  │  PR → Netlify Deploy Preview                                     │   │
│  │                                                                   │   │
│  │  Config (netlify.toml):                                          │   │
│  │  - Build: bun run build                                          │   │
│  │  - Publish: .next                                                │   │
│  │  - Node 22, @netlify/plugin-nextjs                               │   │
│  │  - Skew protection enabled                                       │   │
│  │  - Security headers (X-Frame-Options, etc.)                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (auto-generated) | Yes |
| `CONVEX_DEPLOYMENT` | Convex deployment name (auto-generated) | Yes (convex dev) |
| `GITHUB_TOKEN` | GitHub PAT for contact form + sync | Contact form |
| `GITHUB_REPO` | Target repo for contact issues (`owner/repo`) | Contact form |
| `LINEAR_API_KEY` | Linear personal API key for sync | Linear sync |

### Build Commands

| Command | Purpose |
|---------|---------|
| `bun install --frozen-lockfile` | Install dependencies (CI) |
| `bun run dev` | Local development server |
| `bun run build` | Production build |
| `bun run lint` | ESLint check |
| `bunx tsc --noEmit` | TypeScript typecheck |
| `bun run test` | Convex unit tests (vitest) |
| `bun run seed` | Seed database with demo data |
| `bunx convex dev` | Start Convex dev server |
| `bunx convex deploy` | Deploy Convex functions |
| `./gradlew :app:assembleDebug` | Build Android debug APK |
| `./gradlew test` | Run Android unit tests |

---

## Directory Structure

```
seridian/
├── .github/
│   └── workflows/
│       ├── pr.yml              # PR gate: lint → typecheck → build
│       ├── convex.yml          # Convex typecheck
│       ├── android.yml         # Android test → build → release
│       ├── linear-sync.yml     # Linear ↔ GitHub link bot
│       └── visual.yml          # Visual regression
│
├── convex/                     # Backend functions
│   ├── _generated/             # Auto-generated types (DO NOT EDIT)
│   ├── schema.ts               # Database schema definition
│   ├── chat.ts                 # Chat queries/mutations
│   ├── clients.ts              # Client CRUD
│   ├── issues.ts               # Issue CRUD
│   ├── deals.ts                # Sales pipeline
│   ├── bookings.ts             # Calendar bookings
│   ├── proposals.ts            # Proposal management
│   ├── contracts.ts            # Contract management
│   ├── emailTemplates.ts       # Email templates
│   ├── files.ts                # File upload/storage
│   ├── users.ts                # User management
│   ├── caseStudies.ts          # Published case studies
│   ├── linearSync.ts           # Linear API sync
│   ├── githubSync.ts           # GitHub API sync
│   ├── linearIngest.ts         # Linear data upserts
│   └── githubIngest.ts         # GitHub data upserts
│
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/contact/        # Contact form API route
│   │   ├── dashboard/          # Dashboard routes
│   │   ├── casestudies/        # Public case studies
│   │   └── packages/           # Pricing page
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable primitives
│   │   ├── dashboard/          # Dashboard layout
│   │   ├── chat/               # Real-time chat
│   │   ├── kanban/             # Issue board
│   │   ├── sync/               # Linear/GitHub sync
│   │   ├── clients/            # Client management
│   │   ├── bookings/           # Calendar
│   │   ├── sales/              # Pipeline
│   │   ├── proposals/          # Proposals
│   │   ├── files/              # File management
│   │   ├── emailtemplates/     # Templates
│   │   ├── casestudies/        # Case studies
│   │   ├── auth/               # Login
│   │   └── [landing]           # Marketing components
│   └── lib/
│       ├── utils.ts            # Re-exports cn from ui-kit
│       └── github.ts           # GitHub API helper
│
├── kmp-chat/                   # Kotlin Multiplatform shared module
│   └── src/
│       ├── commonMain/         # Shared code (ChatClient, ViewModel, Models)
│       ├── androidMain/        # Android-specific implementation
│       └── commonTest/         # Shared tests
│
├── android-chat/               # Native Android app
│   └── app/src/main/java/      # Compose UI screens + navigation
│
├── vendor/
│   └── ui-kit/                 # Vendored @bytecats/ui-kit (committed dist/)
│
├── docs/                       # Documentation
│
├── public/                     # Static assets
│
├── package.json                # Bun@1.4.0, Next.js 16, React 19
├── netlify.toml                # Netlify deployment config
├── vitest.config.ts            # Test config for Convex functions
├── tsconfig.json               # TypeScript strict config
├── eslint.config.mjs           # ESLint config
└── seed.ts                     # Database seeder (gitignored)
```

---

*Last updated: 2026-08-11*
