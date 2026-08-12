# Database Schema Reference

Convex database schema for Seridian. Source: [`convex/schema.ts`](../convex/schema.ts).

---

## Table of Contents

- [CRM Tables](#crm-tables)
  - [clients](#clients)
  - [contracts](#contracts)
  - [deals](#deals)
  - [proposals](#proposals)
  - [bookings](#bookings)
  - [caseStudies](#casestudies)
- [Project Management Tables](#project-management-tables)
  - [issues](#issues)
  - [files](#files)
  - [emailTemplates](#emailtemplates)
- [Chat Tables](#chat-tables)
  - [channels](#channels)
  - [messages](#messages)
  - [users](#users)
- [Sync / Integration Tables](#sync--integration-tables)
  - [syncMeta](#syncmeta)
  - [githubIssues](#githubissues)
  - [githubProjects](#githubprojects)
  - [linearTeams](#linearteams)
  - [linearProjects](#linearprojects)
  - [linearLabels](#linearlabels)
  - [linearUsers](#linearusers)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Common Query Patterns](#common-query-patterns)

---

## CRM Tables

### `clients`

Central entity for all client relationships. Referenced by contracts, deals, proposals, bookings, issues, case studies, and files.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Client contact name |
| `company` | `string` | Yes | Company name |
| `email` | `string` | Yes | Primary email address |
| `phone` | `string` | No | Phone number |
| `notes` | `string` | No | Freeform notes |
| `status` | `"active" \| "inactive"` | Yes | Current client status |
| `website` | `string` | No | Company website URL |
| `industry` | `string` | No | Industry classification |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_status` | `status` | Filter active vs. inactive clients |

**Relationships:**
- Has many `contracts` (via `contracts.clientId`)
- Has many `deals` (via `deals.clientId`)
- Has many `proposals` (via `proposals.clientId`)
- Has many `bookings` (via `bookings.clientId`)
- Has many `issues` (via `issues.clientId`)
- Has many `caseStudies` (via `caseStudies.clientId`)
- Has many `files` (via `files.clientId`)

---

### `contracts`

Tracks formal agreements with clients.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Contract title or identifier |
| `clientId` | `id("clients")` | Yes | Reference to the client |
| `value` | `number` | Yes | Contract value in currency units |
| `status` | `"draft" \| "active" \| "completed"` | Yes | Contract lifecycle status |
| `startDate` | `string` | Yes | Start date (ISO 8601 or display string) |
| `endDate` | `string` | No | End date |
| `notes` | `string` | No | Additional notes |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_clientId` | `clientId` | List contracts for a specific client |

**Relationships:**
- Belongs to `clients` (via `clientId`)

---

### `deals`

Sales pipeline tracking. Follows a lead-to-close lifecycle.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Deal name |
| `clientId` | `id("clients")` | Yes | Reference to the client |
| `value` | `number` | Yes | Deal value in currency units |
| `stage` | `"lead" \| "proposal" \| "negotiation" \| "closed_won" \| "closed_lost"` | Yes | Pipeline stage |
| `probability` | `number` | Yes | Win probability (0–100) |
| `expectedCloseDate` | `string` | No | Expected close date |
| `notes` | `string` | No | Additional notes |
| `contactEmail` | `string` | No | Deal contact email |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_stage` | `stage` | Filter deals by pipeline stage |
| `by_clientId` | `clientId` | List deals for a specific client |
| `by_stage_and_clientId` | `stage`, `clientId` | Compound filter: stage + client |

**Relationships:**
- Belongs to `clients` (via `clientId`)

---

### `proposals`

Client proposals with a sent/accept/reject workflow.

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Proposal title |
| `clientId` | `id("clients")` | No | Reference to the client (optional) |
| `content` | `string` | Yes | Proposal body content (Markdown) |
| `status` | `"draft" \| "sent" \| "accepted" \| "rejected" \| "expired"` | Yes | Proposal status |
| `value` | `number` | No | Proposed value |
| `validUntil` | `number` | No | Expiration timestamp (ms) |
| `sentAt` | `number` | No | When the proposal was sent (ms) |
| `acceptedAt` | `number` | No | When accepted (ms) |
| `notes` | `string` | No | Internal notes |
| `createdBy` | `string` | Yes | Creator's pubkey or identifier |
| `createdAt` | `number` | Yes | Creation timestamp (ms) |
| `updatedAt` | `number` | Yes | Last update timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_status` | `status` | Filter proposals by status |
| `by_clientId` | `clientId` | List proposals for a specific client |
| `by_createdBy` | `createdBy` | Filter proposals by creator |

**Relationships:**
- Belongs to `clients` (via `clientId`, optional)

**Mutations:** `send`, `accept`, `reject` — convenience mutations that update `status` and set corresponding timestamps.

---

### `bookings`

Scheduled meetings and sessions with clients.

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Booking title |
| `clientId` | `id("clients")` | Yes | Reference to the client |
| `startTime` | `string` | Yes | Start time |
| `endTime` | `string` | Yes | End time |
| `type` | `"consultation" \| "development" \| "review"` | Yes | Booking type |
| `notes` | `string` | No | Meeting notes |
| `location` | `string` | No | Physical location |
| `meetingUrl` | `string` | No | Video conference URL |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_startTime` | `startTime` | Sort/filter bookings by start time |
| `by_clientId` | `clientId` | List bookings for a specific client |

**Relationships:**
- Belongs to `clients` (via `clientId`)

---

### `caseStudies`

Published case studies for marketing/social proof.

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Case study title |
| `clientId` | `id("clients")` | No | Reference to the featured client |
| `summary` | `string` | Yes | Brief summary |
| `challenge` | `string` | Yes | Problem description |
| `solution` | `string` | Yes | Solution description |
| `results` | `string` | Yes | Outcomes and results |
| `technologies` | `string[]` | Yes | Technologies used |
| `industry` | `string` | No | Industry classification |
| `imageUrl` | `string` | No | Hero image URL |
| `published` | `boolean` | Yes | Whether published to the public site |
| `order` | `number` | Yes | Display sort order (auto-assigned) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_published` | `published` | Filter published vs. draft case studies |
| `by_order` | `order` | Sort by display order |

**Relationships:**
- Belongs to `clients` (via `clientId`, optional)

---

## Project Management Tables

### `issues`

Task/ticket tracking. Supports Linear sync, drag-and-drop reordering, and client association.

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Issue title |
| `description` | `string` | Yes | Issue body (Markdown) |
| `status` | `"backlog" \| "todo" \| "in_progress" \| "in_review" \| "done"` | Yes | Kanban status |
| `priority` | `"urgent" \| "high" \| "medium" \| "low" \| "none"` | Yes | Priority level |
| `clientId` | `id("clients")` | No | Associated client |
| `labels` | `string[]` | Yes | Freeform label tags |
| `linearId` | `string` | No | Linear issue ID (for sync) |
| `identifier` | `string` | No | Linear issue identifier (e.g. `SER-42`) |
| `assignee` | `string` | No | Assigned team member |
| `dueDate` | `string` | No | Due date |
| `order` | `number` | Yes | Sort order within status column |
| `linearCreatedAt` | `string` | No | Linear creation timestamp |
| `linearUpdatedAt` | `string` | No | Linear update timestamp |
| `lastSyncedAt` | `number` | No | Last Linear sync timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_linearId` | `linearId` | Lookup by Linear ID (sync dedup) |
| `by_status` | `status` | Filter by kanban column |
| `by_clientId` | `clientId` | Filter by associated client |
| `by_status_and_clientId` | `status`, `clientId` | Compound filter: status + client |

**Relationships:**
- Belongs to `clients` (via `clientId`, optional)

**Key patterns:**
- **Reorder:** `reorder` mutation moves issues within/between status columns, recalculating `order` values for siblings.
- **Create:** Auto-assigns `order` as max order in target status + 1.
- **Linear sync:** `linearId` is set when synced from Linear; `lastSyncedAt` tracks sync freshness.

---

### `files`

File attachments with optional folder hierarchy and client association. Uses Convex `_storage` for blob storage.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | File name |
| `type` | `string` | Yes | MIME type |
| `size` | `number` | Yes | File size in bytes |
| `storageId` | `id("_storage")` | Yes | Convex storage reference |
| `parentId` | `string` | No | Parent folder ID (string, not an ID) |
| `clientId` | `id("clients")` | No | Associated client |
| `uploadedBy` | `string` | Yes | Uploader's pubkey or identifier |
| `createdAt` | `number` | Yes | Upload timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_parentId` | `parentId` | List files in a folder (tree navigation) |
| `by_clientId` | `clientId` | List files for a specific client |
| `by_type` | `type` | Filter by MIME type |

**Relationships:**
- Belongs to `clients` (via `clientId`, optional)
- References Convex `_storage` (via `storageId`)

**Key patterns:**
- `upload` action stores blob in `_storage`, then inserts the record via mutation.
- `getStorageUrl` query resolves a `storageId` to a downloadable URL.
- `move` mutation changes `parentId` for folder operations.
- `remove` deletes both the storage blob and the database record.

---

### `emailTemplates`

Reusable email templates with variable interpolation.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Template name |
| `subject` | `string` | Yes | Email subject line |
| `body` | `string` | Yes | Email body (supports variable placeholders) |
| `category` | `"proposal" \| "invoice" \| "follow_up" \| "welcome" \| "custom"` | Yes | Template category |
| `variables` | `string[]` | Yes | List of supported variable names |
| `createdBy` | `string` | Yes | Creator's pubkey or identifier |
| `createdAt` | `number` | Yes | Creation timestamp (ms) |
| `updatedAt` | `number` | Yes | Last update timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_category` | `category` | Filter templates by category |
| `by_createdBy` | `createdBy` | Filter by creator |

**Key patterns:**
- `duplicate` mutation clones an existing template with a new name.
- `updatedAt` is auto-set on create and update.

---

## Chat Tables

### `channels`

Messaging channels. Supports public, private, and direct message types.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Channel name |
| `description` | `string` | No | Channel description |
| `type` | `"public" \| "private" \| "direct"` | Yes | Channel type |
| `createdBy` | `string` | Yes | Creator's pubkey |
| `participants` | `string[]` | Yes | Array of participant pubkeys |
| `lastMessageAt` | `number` | No | Timestamp of most recent message (ms) |
| `createdAt` | `number` | Yes | Channel creation timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_type` | `type` | Filter by channel type |
| `by_createdBy` | `createdBy` | List channels created by a user |

**Relationships:**
- Has many `messages` (via `messages.channelId`)

**Key patterns:**
- `participants` is a string array of pubkeys, not an ID reference. The creator is always included.
- `lastMessageAt` is updated automatically when a message is sent.

---

### `messages`

Chat messages within channels.

| Field | Type | Required | Description |
|---|---|---|---|
| `channelId` | `id("channels")` | Yes | Parent channel |
| `senderId` | `string` | Yes | Sender's pubkey |
| `senderName` | `string` | Yes | Sender display name (denormalized) |
| `content` | `string` | Yes | Message text |
| `type` | `"text" \| "system" \| "command"` | Yes | Message type |
| `replyTo` | `id("messages")` | No | Parent message for thread replies |
| `editedAt` | `number` | No | Edit timestamp (ms) |
| `deletedAt` | `number` | No | Soft-delete timestamp (ms) |
| `createdAt` | `number` | Yes | Creation timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_channelId_and_createdAt` | `channelId`, `createdAt` | Chronological message list per channel |
| `by_senderId` | `senderId` | Messages by a specific sender |

**Relationships:**
- Belongs to `channels` (via `channelId`)
- Self-referential: `replyTo` points to another `messages` row (thread)

**Key patterns:**
- Messages are soft-deleted (`deletedAt` set), not hard-deleted.
- Editing sets `editedAt`; the `content` is overwritten.
- `senderName` is denormalized for display without a user lookup.

---

### `users`

Chat user profiles. Identified by a public key (pubkey), not Convex auth.

| Field | Type | Required | Description |
|---|---|---|---|
| `pubkey` | `string` | Yes | User's public key (unique identifier) |
| `name` | `string` | Yes | Display name |
| `avatar` | `string` | No | Avatar image URL |
| `status` | `"online" \| "offline" \| "away"` | Yes | Presence status |
| `lastSeen` | `number` | Yes | Last seen timestamp (ms) |
| `deviceType` | `"web" \| "android" \| "ios"` | No | Client device type |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_pubkey` | `pubkey` | Lookup by public key (unique) |
| `by_status` | `status` | Filter by presence status |

**Key patterns:**
- `upsert` mutation: finds existing user by `pubkey`, patches if found, inserts if not.
- `lastSeen` is always set to `Date.now()` on upsert.
- No hard deletes — users are updated, not removed.

---

## Sync / Integration Tables

### `syncMeta`

Key-value store for synchronization metadata (e.g., last sync timestamps).

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | Yes | Metadata key (e.g. `"lastSyncTime"`) |
| `value` | `string` | Yes | Metadata value (string-encoded) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_key` | `key` | Unique lookup by key |

---

### `githubIssues`

GitHub issue data synced via `githubIngest.ts`.

| Field | Type | Required | Description |
|---|---|---|---|
| `githubId` | `number` | Yes | GitHub node ID |
| `number` | `number` | Yes | Issue number (e.g. `#42`) |
| `title` | `string` | Yes | Issue title |
| `body` | `string` | No | Issue body (Markdown) |
| `state` | `string` | Yes | `"open"` or `"closed"` |
| `labels` | `string[]` | Yes | Label names |
| `assignee` | `string` | No | Assigned GitHub username |
| `projectId` | `number` | No | Associated GitHub project ID |
| `createdAt` | `string` | Yes | GitHub creation timestamp |
| `updatedAt` | `string` | Yes | GitHub update timestamp |
| `syncedAt` | `number` | Yes | Local sync timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_githubId` | `githubId` | Deduplication / lookup by GitHub ID |
| `by_state` | `state` | Filter open vs. closed |

---

### `githubProjects`

GitHub project data synced via `githubIngest.ts`.

| Field | Type | Required | Description |
|---|---|---|---|
| `githubId` | `number` | Yes | GitHub project node ID |
| `number` | `number` | Yes | Project number |
| `title` | `string` | Yes | Project title |
| `description` | `string` | No | Project description |
| `state` | `string` | Yes | Project state |
| `syncedAt` | `number` | Yes | Local sync timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_githubId` | `githubId` | Deduplication / lookup by GitHub ID |

---

### `linearTeams`

Linear team data synced via `linearIngest.ts`.

| Field | Type | Required | Description |
|---|---|---|---|
| `linearId` | `string` | Yes | Linear team ID |
| `name` | `string` | Yes | Team name |
| `key` | `string` | Yes | Team key (e.g. `SER`) |
| `syncedAt` | `number` | Yes | Local sync timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_linearId` | `linearId` | Deduplication / lookup by Linear ID |

---

### `linearProjects`

Linear project data synced via `linearIngest.ts`.

| Field | Type | Required | Description |
|---|---|---|---|
| `linearId` | `string` | Yes | Linear project ID |
| `name` | `string` | Yes | Project name |
| `description` | `string` | No | Project description |
| `state` | `string` | Yes | Project state |
| `teamId` | `string` | No | Associated Linear team ID |
| `syncedAt` | `number` | Yes | Local sync timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_linearId` | `linearId` | Deduplication / lookup by Linear ID |

---

### `linearLabels`

Linear label data synced via `linearIngest.ts`.

| Field | Type | Required | Description |
|---|---|---|---|
| `linearId` | `string` | Yes | Linear label ID |
| `name` | `string` | Yes | Label name |
| `color` | `string` | No | Label color |
| `syncedAt` | `number` | Yes | Local sync timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_linearId` | `linearId` | Deduplication / lookup by Linear ID |

---

### `linearUsers`

Linear user data synced via `linearIngest.ts`.

| Field | Type | Required | Description |
|---|---|---|---|
| `linearId` | `string` | Yes | Linear user ID |
| `name` | `string` | Yes | User name |
| `email` | `string` | No | User email |
| `avatarUrl` | `string` | No | Avatar URL |
| `syncedAt` | `number` | Yes | Local sync timestamp (ms) |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| `by_linearId` | `linearId` | Deduplication / lookup by Linear ID |

---

## Entity Relationship Diagram

```
clients ──┬── contracts     (1:N, clientId)
          ├── deals          (1:N, clientId)
          ├── proposals      (1:N, clientId, optional)
          ├── bookings       (1:N, clientId)
          ├── issues         (1:N, clientId, optional)
          ├── caseStudies    (1:N, clientId, optional)
          └── files          (1:N, clientId, optional)

channels ──── messages       (1:N, channelId)
              │  └─ replyTo  (self-ref, optional)

users ──────── (standalone, keyed by pubkey)

syncMeta ───── (standalone key-value store)

githubIssues ─ (standalone, synced from GitHub)
githubProjects─ (standalone, synced from GitHub)

linearTeams ── (standalone, synced from Linear)
linearProjects─(standalone, synced from Linear)
linearLabels ─(standalone, synced from Linear)
linearUsers ──(standalone, synced from Linear)
```

---

## Common Query Patterns

### Filtering by status

Most CRM tables use a status field with an index for filtering:

```ts
// Active clients
ctx.db.query("clients")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .order("desc")
  .take(500);

// Issues in a specific kanban column
ctx.db.query("issues")
  .withIndex("by_status", (q) => q.eq("status", "in_progress"))
  .order("asc")
  .take(500);

// Deals by pipeline stage
ctx.db.query("deals")
  .withIndex("by_stage", (q) => q.eq("stage", "proposal"))
  .order("desc")
  .take(500);
```

### Compound filters

Tables with compound indexes support multi-field queries:

```ts
// Issues filtered by both status AND client
ctx.db.query("issues")
  .withIndex("by_status_and_clientId", (q) =>
    q.eq("status", "todo").eq("clientId", someClientId)
  )
  .order("asc")
  .take(500);

// Deals filtered by stage AND client
ctx.db.query("deals")
  .withIndex("by_stage_and_clientId", (q) =>
    q.eq("stage", "negotiation").eq("clientId", someClientId)
  )
  .order("desc")
  .take(500);
```

### Looking up by foreign key

```ts
// All contracts for a client
ctx.db.query("contracts")
  .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
  .order("desc")
  .take(500);

// All messages in a channel (chronological)
ctx.db.query("messages")
  .withIndex("by_channelId_and_createdAt", (q) =>
    q.eq("channelId", channelId)
  )
  .order("asc")
  .take(500);
```

### Sync deduplication

All integration tables (GitHub, Linear) use a unique ID index for upsert-on-sync:

```ts
// Check if a Linear issue already exists
const existing = await ctx.db
  .query("issues")
  .withIndex("by_linearId", (q) => q.eq("linearId", linearId))
  .unique();

if (existing) {
  await ctx.db.patch(existing._id, { ...updatedFields, lastSyncedAt: Date.now() });
} else {
  await ctx.db.insert("issues", { linearId, ...fields });
}
```

### User upsert by pubkey

```ts
const existing = await ctx.db
  .query("users")
  .withIndex("by_pubkey", (q) => q.eq("pubkey", pubkey))
  .first();

if (existing) {
  await ctx.db.patch(existing._id, { status: "online", lastSeen: Date.now() });
} else {
  await ctx.db.insert("users", { pubkey, status: "online", lastSeen: Date.now(), ... });
}
```

### Channel participants

Channel membership is stored as a string array, not a relational join. Queries for "channels a user belongs to" require a scan:

```ts
// Channels a user owns
const owned = await ctx.db.query("channels")
  .withIndex("by_createdBy", (q) => q.eq("createdBy", pubkey))
  .collect();

// All channels, then filter by participant
const all = await ctx.db.query("channels").collect();
const joined = all.filter((c) =>
  c.participants.includes(pubkey) && c.createdBy !== pubkey
);
```

### Soft-delete pattern

Messages use soft-delete (`deletedAt` timestamp) rather than hard-delete:

```ts
await ctx.db.patch(messageId, { deletedAt: Date.now() });

// When querying, filter out deleted messages
const messages = await ctx.db
  .query("messages")
  .withIndex("by_channelId_and_createdAt", (q) => q.eq("channelId", channelId))
  .order("asc")
  .collect();

const visible = messages.filter((m) => !m.deletedAt);
```

---

## Validation Types

Common union types used across the schema:

| Type | Values | Used In |
|---|---|---|
| Client status | `"active" \| "inactive"` | `clients.status` |
| Contract status | `"draft" \| "active" \| "completed"` | `contracts.status` |
| Deal stage | `"lead" \| "proposal" \| "negotiation" \| "closed_won" \| "closed_lost"` | `deals.stage` |
| Proposal status | `"draft" \| "sent" \| "accepted" \| "rejected" \| "expired"` | `proposals.status` |
| Issue status | `"backlog" \| "todo" \| "in_progress" \| "in_review" \| "done"` | `issues.status` |
| Issue priority | `"urgent" \| "high" \| "medium" \| "low" \| "none"` | `issues.priority` |
| Booking type | `"consultation" \| "development" \| "review"` | `bookings.type` |
| Channel type | `"public" \| "private" \| "direct"` | `channels.type` |
| Message type | `"text" \| "system" \| "command"` | `messages.type` |
| User status | `"online" \| "offline" \| "away"` | `users.status` |
| Device type | `"web" \| "android" \| "ios"` | `users.deviceType` |
| Template category | `"proposal" \| "invoice" \| "follow_up" \| "welcome" \| "custom"` | `emailTemplates.category` |

---

## Notes

- **IDs:** Convex auto-generates `_id` fields. Foreign keys use `v.id("tableName")`.
- **Timestamps:** All timestamps are in milliseconds (`Date.now()`). Stored as `number`, not `string`.
- **Limits:** Queries use `.take(500)` as the standard result cap.
- **No cascade deletes:** Deleting a parent record does not automatically delete children. Orphaned foreign keys are possible — application code should handle this.
- **Denormalization:** `messages.senderName` and `issues.identifier` are denormalized for read performance.
- **Sync tables:** GitHub and Linear tables are append-only from the syncer's perspective. Each record carries a `syncedAt` timestamp for freshness tracking.
