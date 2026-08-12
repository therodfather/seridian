# Seridian Convex API Reference

> Auto-generated from `convex/*.ts` source files. Last updated: August 2026.

## Table of Contents

- [Overview](#overview)
- [Schema Reference](#schema-reference)
- [Clients](#clients)
- [Issues](#issues)
- [Bookings](#bookings)
- [Contracts](#contracts)
- [Proposals](#proposals)
- [Deals](#deals)
- [Case Studies](#case-studies)
- [Email Templates](#email-templates)
- [Files](#files)
- [Users](#users)
- [Channels & Messages](#channels--messages)
- [Chat](#chat)
- [Linear Sync](#linear-sync)
- [Linear Ingest](#linear-ingest)
- [GitHub Sync](#github-sync)
- [GitHub Ingest](#github-ingest)

---

## Overview

The Seridian backend is built on [Convex](https://convex.dev). All database functions live in `convex/` and are organized by domain module. Functions fall into four categories:

| Type | Description |
|---|---|
| **Query** | Read-only database reads. Safe to call from clients; automatically reactive. |
| **Mutation** | Write operations that modify the database. Transactional and consistent. |
| **Action** | Server-side logic that can call external APIs (Linear, GitHub) and run mutations. Requires environment variables. |
| **Internal Mutation** | Mutations callable only from actions within the Convex backend (not from clients). Used for sync upserts. |

### Calling Conventions

```ts
import { api } from "../convex/_generated/api";

// Query
const clients = await useQuery(api.clients.list, { status: "active" });

// Mutation
const id = await useMutation(api.clients.create)({ name: "Acme", ... });

// Action (server-side)
const result = await useAction(api.linearSync.syncAllLinear)({});
```

---

## Schema Reference

Database tables and their indexes are defined in `convex/schema.ts`. Each module section below references the table it operates on. Key tables:

| Table | Module | Primary Indexes |
|---|---|---|
| `clients` | clients | `by_status` |
| `issues` | issues | `by_linearId`, `by_status`, `by_clientId`, `by_status_and_clientId` |
| `bookings` | bookings | `by_startTime`, `by_clientId` |
| `contracts` | contracts | `by_clientId` |
| `proposals` | proposals | `by_status`, `by_clientId`, `by_createdBy` |
| `deals` | deals | `by_stage`, `by_clientId`, `by_stage_and_clientId` |
| `caseStudies` | caseStudies | `by_published`, `by_order` |
| `emailTemplates` | emailTemplates | `by_category`, `by_createdBy` |
| `files` | files | `by_parentId`, `by_clientId`, `by_type` |
| `channels` | channels | `by_type`, `by_createdBy` |
| `messages` | messages | `by_channelId_and_createdAt`, `by_senderId` |
| `users` | users | `by_pubkey`, `by_status` |
| `syncMeta` | sync modules | `by_key` |
| `githubIssues` | githubIngest | `by_githubId`, `by_state` |
| `githubProjects` | githubIngest | `by_githubId` |
| `linearTeams` | linearIngest | `by_linearId` |
| `linearProjects` | linearIngest | `by_linearId` |
| `linearLabels` | linearIngest | `by_linearId` |
| `linearUsers` | linearIngest | `by_linearId` |

---

## Clients

**Module:** `convex/clients.ts`
**Table:** `clients`

### `clients.list` — Query

List clients, optionally filtered by status.

| Arg | Type | Required | Description |
|---|---|---|---|
| `status` | `"active" \| "inactive"` | No | Filter by client status |

**Returns:** `Client[]` — up to 500 records, ordered descending.

---

### `clients.get` — Query

Fetch a single client by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `clientId` | `Id<"clients">` | Yes | The client document ID |

**Returns:** `Client | null`

---

### `clients.create` — Mutation

Create a new client.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Contact name |
| `company` | `string` | Yes | Company name |
| `email` | `string` | Yes | Contact email |
| `phone` | `string` | No | Phone number |
| `notes` | `string` | No | Free-form notes |
| `status` | `"active" \| "inactive"` | Yes | Initial status |
| `website` | `string` | No | Company website |
| `industry` | `string` | No | Industry vertical |

**Returns:** `Id<"clients">` — the new document ID.

---

### `clients.update` — Mutation

Update an existing client. Only provided fields are patched (undefined fields are ignored).

| Arg | Type | Required | Description |
|---|---|---|---|
| `clientId` | `Id<"clients">` | Yes | The client to update |
| `name` | `string` | No | |
| `company` | `string` | No | |
| `email` | `string` | No | |
| `phone` | `string` | No | |
| `notes` | `string` | No | |
| `status` | `"active" \| "inactive"` | No | |
| `website` | `string` | No | |
| `industry` | `string` | No | |

**Returns:** `Id<"clients">`

---

### `clients.remove` — Mutation

Delete a client permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `clientId` | `Id<"clients">` | Yes | The client to delete |

**Returns:** `void`

---

## Issues

**Module:** `convex/issues.ts`
**Table:** `issues`

### `issues.list` — Query

List issues with optional filters. Uses composite indexes for efficient filtered queries.

| Arg | Type | Required | Description |
|---|---|---|---|
| `status` | `"backlog" \| "todo" \| "in_progress" \| "in_review" \| "done"` | No | Filter by status |
| `clientId` | `Id<"clients">` | No | Filter by linked client |

**Returns:** `Issue[]` — up to 500 records. Ordered ascending when filtering by status (for board ordering), descending otherwise.

---

### `issues.get` — Query

Fetch a single issue by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `issueId` | `Id<"issues">` | Yes | The issue document ID |

**Returns:** `Issue | null`

---

### `issues.create` — Mutation

Create a new issue. Automatically assigns the next `order` value within the target status column.

| Arg | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Issue title |
| `description` | `string` | Yes | Markdown description |
| `status` | `"backlog" \| "todo" \| "in_progress" \| "in_review" \| "done"` | Yes | Initial status |
| `priority` | `"urgent" \| "high" \| "medium" \| "low" \| "none"` | Yes | Priority level |
| `clientId` | `Id<"clients">` | No | Link to a client |
| `labels` | `string[]` | Yes | Tag labels |
| `linearId` | `string` | No | Linear issue ID (for sync) |
| `assignee` | `string` | No | Assignee name |
| `dueDate` | `string` | No | Due date string |

**Returns:** `Id<"issues">`

---

### `issues.update` — Mutation

Update an existing issue. Only provided fields are patched.

| Arg | Type | Required | Description |
|---|---|---|---|
| `issueId` | `Id<"issues">` | Yes | The issue to update |
| `title` | `string` | No | |
| `description` | `string` | No | |
| `status` | `"backlog" \| "todo" \| "in_progress" \| "in_review" \| "done"` | No | |
| `priority` | `"urgent" \| "high" \| "medium" \| "low" \| "none"` | No | |
| `clientId` | `Id<"clients"> \| null` | No | Pass `null` to unlink |
| `labels` | `string[]` | No | |
| `linearId` | `string` | No | |
| `assignee` | `string` | No | |
| `dueDate` | `string` | No | |
| `order` | `number` | No | |

**Returns:** `Id<"issues">`

---

### `issues.remove` — Mutation

Delete an issue permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `issueId` | `Id<"issues">` | Yes | The issue to delete |

**Returns:** `void`

---

### `issues.reorder` — Mutation

Move an issue to a new position within the same status column or across columns. Reindexes all affected siblings automatically.

| Arg | Type | Required | Description |
|---|---|---|---|
| `issueId` | `Id<"issues">` | Yes | The issue to move |
| `status` | `"backlog" \| "todo" \| "in_progress" \| "in_review" \| "done"` | Yes | Target status column |
| `order` | `number` | Yes | Target position (0-indexed) |

**Returns:** `void`

**Throws:** `"Issue not found"` if the issue does not exist.

---

### `issues.getLinearSyncStats` — Query

Get summary statistics for issues synced from Linear.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:**

```ts
{
  totalIssues: number;
  byStatus: Record<string, number>;
  lastSyncTime: number | null;
}
```

---

## Bookings

**Module:** `convex/bookings.ts`
**Table:** `bookings`

### `bookings.list` — Query

List bookings, optionally filtered by client.

| Arg | Type | Required | Description |
|---|---|---|---|
| `startAfter` | `string` | No | _(Reserved, not used in handler)_ |
| `startBefore` | `string` | No | _(Reserved, not used in handler)_ |
| `clientId` | `Id<"clients">` | No | Filter by client |

**Returns:** `Booking[]` — up to 500 records, ordered ascending by start time.

---

### `bookings.get` — Query

Fetch a single booking by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `bookingId` | `Id<"bookings">` | Yes | The booking document ID |

**Returns:** `Booking | null`

---

### `bookings.create` — Mutation

Create a new booking.

| Arg | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Booking title |
| `clientId` | `Id<"clients">` | Yes | Linked client |
| `startTime` | `string` | Yes | ISO start time |
| `endTime` | `string` | Yes | ISO end time |
| `type` | `"consultation" \| "development" \| "review"` | Yes | Booking type |
| `notes` | `string` | No | Free-form notes |
| `location` | `string` | No | Physical location |
| `meetingUrl` | `string` | No | Video meeting link |

**Returns:** `Id<"bookings">`

---

### `bookings.update` — Mutation

Update an existing booking.

| Arg | Type | Required | Description |
|---|---|---|---|
| `bookingId` | `Id<"bookings">` | Yes | The booking to update |
| `title` | `string` | No | |
| `clientId` | `Id<"clients">` | No | |
| `startTime` | `string` | No | |
| `endTime` | `string` | No | |
| `type` | `"consultation" \| "development" \| "review"` | No | |
| `notes` | `string` | No | |
| `location` | `string` | No | |
| `meetingUrl` | `string` | No | |

**Returns:** `Id<"bookings">`

---

### `bookings.remove` — Mutation

Delete a booking permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `bookingId` | `Id<"bookings">` | Yes | The booking to delete |

**Returns:** `void`

---

## Contracts

**Module:** `convex/contracts.ts`
**Table:** `contracts`

### `contracts.list` — Query

List all contracts for a given client.

| Arg | Type | Required | Description |
|---|---|---|---|
| `clientId` | `Id<"clients">` | Yes | The client to filter by |

**Returns:** `Contract[]` — up to 500 records, ordered descending.

---

### `contracts.get` — Query

Fetch a single contract by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `contractId` | `Id<"contracts">` | Yes | The contract document ID |

**Returns:** `Contract | null`

---

### `contracts.create` — Mutation

Create a new contract.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Contract name |
| `clientId` | `Id<"clients">` | Yes | Linked client |
| `value` | `number` | Yes | Contract value (currency units) |
| `status` | `"draft" \| "active" \| "completed"` | Yes | Initial status |
| `startDate` | `string` | Yes | Start date string |
| `endDate` | `string` | No | End date string |
| `notes` | `string` | No | Free-form notes |

**Returns:** `Id<"contracts">`

---

### `contracts.update` — Mutation

Update an existing contract.

| Arg | Type | Required | Description |
|---|---|---|---|
| `contractId` | `Id<"contracts">` | Yes | The contract to update |
| `name` | `string` | No | |
| `clientId` | `Id<"clients">` | No | |
| `value` | `number` | No | |
| `status` | `"draft" \| "active" \| "completed"` | No | |
| `startDate` | `string` | No | |
| `endDate` | `string` | No | |
| `notes` | `string` | No | |

**Returns:** `Id<"contracts">`

---

### `contracts.remove` — Mutation

Delete a contract permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `contractId` | `Id<"contracts">` | Yes | The contract to delete |

**Returns:** `void`

---

## Proposals

**Module:** `convex/proposals.ts`
**Table:** `proposals`

### Status Lifecycle

```
draft → sent → accepted
                  ↘ rejected
                  ↘ expired
```

### `proposals.list` — Query

List proposals with optional filters.

| Arg | Type | Required | Description |
|---|---|---|---|
| `status` | `"draft" \| "sent" \| "accepted" \| "rejected" \| "expired"` | No | Filter by status |
| `clientId` | `Id<"clients">` | No | Filter by client |

**Returns:** `Proposal[]` — up to 500 records, ordered descending.

---

### `proposals.get` — Query

Fetch a single proposal by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `proposalId` | `Id<"proposals">` | Yes | The proposal document ID |

**Returns:** `Proposal | null`

---

### `proposals.getByClient` — Query

List all proposals for a specific client.

| Arg | Type | Required | Description |
|---|---|---|---|
| `clientId` | `Id<"clients">` | Yes | The client to filter by |

**Returns:** `Proposal[]` — up to 500 records, ordered descending.

---

### `proposals.create` — Mutation

Create a new proposal. Automatically sets `createdAt` and `updatedAt` to the current time.

| Arg | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Proposal title |
| `clientId` | `Id<"clients">` | No | Linked client |
| `content` | `string` | Yes | Proposal body (markdown) |
| `status` | `"draft" \| "sent" \| "accepted" \| "rejected" \| "expired"` | Yes | Initial status |
| `value` | `number` | No | Proposed value |
| `validUntil` | `number` | No | Expiration timestamp |
| `sentAt` | `number` | No | Sent timestamp |
| `acceptedAt` | `number` | No | Accepted timestamp |
| `notes` | `string` | No | Internal notes |
| `createdBy` | `string` | Yes | Creator identifier |

**Returns:** `Id<"proposals">`

---

### `proposals.update` — Mutation

Update an existing proposal. Automatically bumps `updatedAt`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `proposalId` | `Id<"proposals">` | Yes | The proposal to update |
| `title` | `string` | No | |
| `clientId` | `Id<"clients">` | No | |
| `content` | `string` | No | |
| `status` | `"draft" \| "sent" \| "accepted" \| "rejected" \| "expired"` | No | |
| `value` | `number` | No | |
| `validUntil` | `number` | No | |
| `sentAt` | `number` | No | |
| `acceptedAt` | `number` | No | |
| `notes` | `string` | No | |

**Returns:** `Id<"proposals">`

---

### `proposals.remove` — Mutation

Delete a proposal permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `proposalId` | `Id<"proposals">` | Yes | The proposal to delete |

**Returns:** `void`

---

### `proposals.send` — Mutation

Mark a proposal as sent. Sets `status` to `"sent"` and records `sentAt`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `proposalId` | `Id<"proposals">` | Yes | The proposal to send |

**Returns:** `Id<"proposals">`

---

### `proposals.accept` — Mutation

Mark a proposal as accepted. Sets `status` to `"accepted"` and records `acceptedAt`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `proposalId` | `Id<"proposals">` | Yes | The proposal to accept |

**Returns:** `Id<"proposals">`

---

### `proposals.reject` — Mutation

Mark a proposal as rejected. Sets `status` to `"rejected"`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `proposalId` | `Id<"proposals">` | Yes | The proposal to reject |

**Returns:** `Id<"proposals">`

---

## Deals

**Module:** `convex/deals.ts`
**Table:** `deals`

### Deal Stages

```
lead → proposal → negotiation → closed_won
                                     ↘ closed_lost
```

### `deals.list` — Query

List deals with optional filters.

| Arg | Type | Required | Description |
|---|---|---|---|
| `stage` | `"lead" \| "proposal" \| "negotiation" \| "closed_won" \| "closed_lost"` | No | Filter by stage |
| `clientId` | `Id<"clients">` | No | Filter by client |

**Returns:** `Deal[]` — up to 500 records, ordered descending.

---

### `deals.get` — Query

Fetch a single deal by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `dealId` | `Id<"deals">` | Yes | The deal document ID |

**Returns:** `Deal | null`

---

### `deals.create` — Mutation

Create a new deal.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Deal name |
| `clientId` | `Id<"clients">` | Yes | Linked client |
| `value` | `number` | Yes | Deal value |
| `stage` | `"lead" \| "proposal" \| "negotiation" \| "closed_won" \| "closed_lost"` | Yes | Pipeline stage |
| `probability` | `number` | Yes | Win probability (0–100) |
| `expectedCloseDate` | `string` | No | Expected close date |
| `notes` | `string` | No | Free-form notes |
| `contactEmail` | `string` | No | Contact email |

**Returns:** `Id<"deals">`

---

### `deals.update` — Mutation

Update an existing deal.

| Arg | Type | Required | Description |
|---|---|---|---|
| `dealId` | `Id<"deals">` | Yes | The deal to update |
| `name` | `string` | No | |
| `clientId` | `Id<"clients">` | No | |
| `value` | `number` | No | |
| `stage` | `"lead" \| "proposal" \| "negotiation" \| "closed_won" \| "closed_lost"` | No | |
| `probability` | `number` | No | |
| `expectedCloseDate` | `string` | No | |
| `notes` | `string` | No | |
| `contactEmail` | `string` | No | |

**Returns:** `Id<"deals">`

---

### `deals.remove` — Mutation

Delete a deal permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `dealId` | `Id<"deals">` | Yes | The deal to delete |

**Returns:** `void`

---

## Case Studies

**Module:** `convex/caseStudies.ts`
**Table:** `caseStudies`

### `caseStudies.list` — Query

List case studies, optionally filtered by published status.

| Arg | Type | Required | Description |
|---|---|---|---|
| `published` | `boolean` | No | Filter by published flag |

**Returns:** `CaseStudy[]` — up to 500 records, ordered descending.

---

### `caseStudies.listPublished` — Query

List only published case studies. Convenience wrapper.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `CaseStudy[]` — up to 500 records, ordered descending.

---

### `caseStudies.get` — Query

Fetch a single case study by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `caseStudyId` | `Id<"caseStudies">` | Yes | The case study document ID |

**Returns:** `CaseStudy | null`

---

### `caseStudies.count` — Query

Count case studies, optionally filtered by published status.

| Arg | Type | Required | Description |
|---|---|---|---|
| `published` | `boolean` | No | Filter by published flag |

**Returns:** `number` — count of matching records (up to 1000 scanned).

---

### `caseStudies.create` — Mutation

Create a new case study. Automatically assigns the next `order` value.

| Arg | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Case study title |
| `clientId` | `Id<"clients">` | No | Associated client |
| `summary` | `string` | Yes | Short summary |
| `challenge` | `string` | Yes | The challenge description |
| `solution` | `string` | Yes | The solution description |
| `results` | `string` | Yes | Results achieved |
| `technologies` | `string[]` | Yes | Technologies used |
| `industry` | `string` | Yes | Industry vertical |
| `imageUrl` | `string` | No | Hero image URL |
| `published` | `boolean` | Yes | Publish immediately |

**Returns:** `Id<"caseStudies">`

---

### `caseStudies.update` — Mutation

Update an existing case study.

| Arg | Type | Required | Description |
|---|---|---|---|
| `caseStudyId` | `Id<"caseStudies">` | Yes | The case study to update |
| `title` | `string` | No | |
| `clientId` | `Id<"clients"> \| null` | No | Pass `null` to unlink |
| `summary` | `string` | No | |
| `challenge` | `string` | No | |
| `solution` | `string` | No | |
| `results` | `string` | No | |
| `technologies` | `string[]` | No | |
| `industry` | `string` | No | |
| `imageUrl` | `string` \| null | No | Pass `null` to remove |
| `published` | `boolean` | No | |
| `order` | `number` | No | |

**Returns:** `Id<"caseStudies">`

---

### `caseStudies.remove` — Mutation

Delete a case study permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `caseStudyId` | `Id<"caseStudies">` | Yes | The case study to delete |

**Returns:** `void`

---

## Email Templates

**Module:** `convex/emailTemplates.ts`
**Table:** `emailTemplates`

### Categories

`"proposal" | "invoice" | "follow_up" | "welcome" | "custom"`

### `emailTemplates.list` — Query

List templates, optionally filtered by category.

| Arg | Type | Required | Description |
|---|---|---|---|
| `category` | `string` (see above) | No | Filter by category |

**Returns:** `EmailTemplate[]` — up to 500 records, ordered descending.

---

### `emailTemplates.get` — Query

Fetch a single template by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `templateId` | `Id<"emailTemplates">` | Yes | The template document ID |

**Returns:** `EmailTemplate | null`

---

### `emailTemplates.getByCategory` — Query

List all templates for a specific category.

| Arg | Type | Required | Description |
|---|---|---|---|
| `category` | `string` (see above) | Yes | The category to filter by |

**Returns:** `EmailTemplate[]` — up to 500 records, ordered descending.

---

### `emailTemplates.create` — Mutation

Create a new email template.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Template name |
| `subject` | `string` | Yes | Email subject line (may contain `{{variables}}`) |
| `body` | `string` | Yes | Email body (HTML/markdown, may contain `{{variables}}`) |
| `category` | `string` (see above) | Yes | Template category |
| `variables` | `string[]` | Yes | List of template variable names |
| `createdBy` | `string` | Yes | Creator identifier |

**Returns:** `Id<"emailTemplates">`

---

### `emailTemplates.update` — Mutation

Update an existing template. Automatically bumps `updatedAt`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `templateId` | `Id<"emailTemplates">` | Yes | The template to update |
| `name` | `string` | No | |
| `subject` | `string` | No | |
| `body` | `string` | No | |
| `category` | `string` (see above) | No | |
| `variables` | `string[]` | No | |

**Returns:** `Id<"emailTemplates">`

---

### `emailTemplates.remove` — Mutation

Delete a template permanently.

| Arg | Type | Required | Description |
|---|---|---|---|
| `templateId` | `Id<"emailTemplates">` | Yes | The template to delete |

**Returns:** `void`

---

### `emailTemplates.duplicate` — Mutation

Clone an existing template with a new name. Copies `subject`, `body`, `category`, `variables`, and `createdBy` from the original.

| Arg | Type | Required | Description |
|---|---|---|---|
| `templateId` | `Id<"emailTemplates">` | Yes | The template to duplicate |
| `name` | `string` | Yes | Name for the new copy |

**Returns:** `Id<"emailTemplates">` — the new template ID.

**Throws:** `"Template not found"` if the source does not exist.

---

## Files

**Module:** `convex/files.ts`
**Table:** `files`

### `files.list` — Query

List files. If `parentId` is provided, returns children of that folder. Otherwise returns root-level files.

| Arg | Type | Required | Description |
|---|---|---|---|
| `parentId` | `string` | No | Parent folder ID (omit for root) |

**Returns:** `File[]` — up to 500 records, ordered descending.

---

### `files.get` — Query

Fetch a single file record by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `fileId` | `Id<"files">` | Yes | The file document ID |

**Returns:** `File | null`

---

### `files.getByClient` — Query

List all files for a specific client.

| Arg | Type | Required | Description |
|---|---|---|---|
| `clientId` | `Id<"clients">` | Yes | The client to filter by |

**Returns:** `File[]` — up to 500 records, ordered descending.

---

### `files.getStorageUrl` — Query

Get the signed storage URL for a file's blob.

| Arg | Type | Required | Description |
|---|---|---|---|
| `fileId` | `Id<"files">` | Yes | The file document ID |

**Returns:** `string | null` — the Convex storage URL, or `null` if the file record doesn't exist.

---

### `files.create` — Mutation

Register a file record in the database. Does not upload the blob — use `files.upload` action for that.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | File name |
| `type` | `string` | Yes | MIME type |
| `size` | `number` | Yes | File size in bytes |
| `storageId` | `Id<"_storage">` | Yes | Convex storage ID |
| `parentId` | `string` | No | Parent folder ID |
| `clientId` | `Id<"clients">` | No | Associated client |
| `uploadedBy` | `string` | Yes | Uploader identifier |

**Returns:** `Id<"files">`

---

### `files.remove` — Mutation

Delete a file record and its stored blob.

| Arg | Type | Required | Description |
|---|---|---|---|
| `fileId` | `Id<"files">` | Yes | The file to delete |

**Returns:** `void`

---

### `files.move` — Mutation

Move a file to a different parent folder (or to root if `parentId` is omitted).

| Arg | Type | Required | Description |
|---|---|---|---|
| `fileId` | `Id<"files">` | Yes | The file to move |
| `parentId` | `string` | No | New parent folder ID (omit for root) |

**Returns:** `Id<"files">`

---

### `files.upload` — Action

Upload a file blob to Convex storage and create the file record in one step.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | File name |
| `type` | `string` | Yes | MIME type |
| `blob` | `Bytes` | Yes | Raw file content |
| `size` | `number` | Yes | File size in bytes |
| `parentId` | `string` | No | Parent folder ID |
| `clientId` | `Id<"clients">` | No | Associated client |
| `uploadedBy` | `string` | Yes | Uploader identifier |

**Returns:** `Id<"files">` — the new file record ID.

---

## Users

**Module:** `convex/users.ts`
**Table:** `users`

### `users.list` — Query

List all registered users.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `User[]`

---

### `users.get` — Query

Look up a user by their public key.

| Arg | Type | Required | Description |
|---|---|---|---|
| `pubkey` | `string` | Yes | User's public key |

**Returns:** `User | null`

---

### `users.upsert` — Mutation

Create a new user or update an existing one (matched by `pubkey`). Sets `lastSeen` to the current time.

| Arg | Type | Required | Description |
|---|---|---|---|
| `pubkey` | `string` | Yes | User's public key (unique identifier) |
| `name` | `string` | Yes | Display name |
| `avatar` | `string` | No | Avatar URL |
| `status` | `"online" \| "offline" \| "away"` | Yes | Current presence status |
| `deviceType` | `"web" \| "android" \| "ios"` | No | Device platform |

**Returns:** `Id<"users">`

---

## Channels & Messages

**Module:** `convex/channels.ts`, `convex/messages.ts`

### `channels.list` — Query

List all channels.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `Channel[]`

---

### `channels.get` — Query

Fetch a single channel by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | The channel document ID |

**Returns:** `Channel | null`

---

### `channels.create` — Mutation

Create a new channel.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Channel name |
| `description` | `string` | No | Channel description |
| `type` | `"public" \| "private" \| "direct"` | Yes | Channel type |
| `createdBy` | `string` | Yes | Creator's pubkey |
| `participants` | `string[]` | Yes | Initial participant pubkeys |

**Returns:** `Id<"channels">`

---

### `messages.listByChannel` — Query

List messages for a channel, ordered chronologically.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | The channel to query |

**Returns:** `Message[]` — up to 500 records, ordered ascending.

---

### `messages.listAll` — Query

List all messages across all channels. Use with caution on large datasets.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `Message[]`

---

### `messages.send` — Mutation

Send a message to a channel. Automatically updates the channel's `lastMessageAt`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | Target channel |
| `senderId` | `string` | Yes | Sender's pubkey |
| `senderName` | `string` | Yes | Sender's display name |
| `content` | `string` | Yes | Message content |
| `type` | `"text" \| "system" \| "command"` | Yes | Message type |
| `replyTo` | `Id<"messages">` | No | Parent message for thread replies |

**Returns:** `Id<"messages">`

---

## Chat

**Module:** `convex/chat.ts`

The chat module provides a higher-level API for the real-time chat interface. It wraps channels, messages, and users with convenience functions.

### `chat.listChannels` — Query

List channels the user owns or participates in, sorted by most recently created.

| Arg | Type | Required | Description |
|---|---|---|---|
| `pubkey` | `string` | Yes | The user's public key |

**Returns:** `Channel[]` — owned channels first, then joined channels, sorted by `createdAt` descending.

---

### `chat.getChannel` — Query

Fetch a single channel by ID.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | The channel document ID |

**Returns:** `Channel | null`

---

### `chat.listMessages` — Query

List messages for a channel.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | The channel to query |

**Returns:** `Message[]` — up to 500 records, ordered ascending.

---

### `chat.getUsers` — Query

Get all currently online or away users (excludes offline).

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `User[]`

---

### `chat.getUser` — Query

Look up a single user by public key.

| Arg | Type | Required | Description |
|---|---|---|---|
| `pubkey` | `string` | Yes | The user's public key |

**Returns:** `User | null`

---

### `chat.createChannel` — Mutation

Create a channel. Automatically includes the creator in the participants list if not already present; deduplicates participants.

| Arg | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Channel name |
| `description` | `string` | No | Channel description |
| `type` | `"public" \| "private" \| "direct"` | Yes | Channel type |
| `createdBy` | `string` | Yes | Creator's pubkey |
| `participants` | `string[]` | Yes | Participant pubkeys |

**Returns:** `Id<"channels">`

---

### `chat.sendMessage` — Mutation

Send a message. Updates the channel's `lastMessageAt`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | Target channel |
| `senderId` | `string` | Yes | Sender's pubkey |
| `senderName` | `string` | Yes | Sender's display name |
| `content` | `string` | Yes | Message content |
| `type` | `"text" \| "system" \| "command"` | Yes | Message type |
| `replyTo` | `Id<"messages">` | No | Parent message for threads |

**Returns:** `Id<"messages">`

---

### `chat.editMessage` — Mutation

Edit a message's content. Only the original sender can edit.

| Arg | Type | Required | Description |
|---|---|---|---|
| `messageId` | `Id<"messages">` | Yes | The message to edit |
| `content` | `string` | Yes | New content |
| `senderId` | `string` | Yes | Must match original sender |

**Returns:** `Id<"messages">`

**Throws:** `"Message not found"` or `"Not authorized"`.

---

### `chat.deleteMessage` — Mutation

Soft-delete a message (sets `deletedAt`). Only the original sender can delete.

| Arg | Type | Required | Description |
|---|---|---|---|
| `messageId` | `Id<"messages">` | Yes | The message to delete |
| `senderId` | `string` | Yes | Must match original sender |

**Returns:** `Id<"messages">`

**Throws:** `"Message not found"` or `"Not authorized"`.

---

### `chat.joinChannel` — Mutation

Add a user to a channel's participants. No-op if already a member.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | The channel to join |
| `pubkey` | `string` | Yes | User's pubkey |

**Returns:** `Id<"channels">`

**Throws:** `"Channel not found"`.

---

### `chat.leaveChannel` — Mutation

Remove a user from a channel's participants.

| Arg | Type | Required | Description |
|---|---|---|---|
| `channelId` | `Id<"channels">` | Yes | The channel to leave |
| `pubkey` | `string` | Yes | User's pubkey |

**Returns:** `Id<"channels">`

**Throws:** `"Channel not found"`.

---

### `chat.updateUserStatus` — Mutation

Update a user's presence status. Creates the user if they don't exist yet.

| Arg | Type | Required | Description |
|---|---|---|---|
| `pubkey` | `string` | Yes | User's public key |
| `status` | `"online" \| "offline" \| "away"` | Yes | New status |
| `name` | `string` | Yes | Display name |
| `avatar` | `string` | No | Avatar URL |
| `deviceType` | `"web" \| "android" \| "ios"` | No | Device platform |

**Returns:** `Id<"users">`

---

## Linear Sync

**Module:** `convex/linearSync.ts`

Synchronizes data from the Linear API into Seridian's Convex database. All actions require the `LINEAR_API_KEY` environment variable.

### Actions (server-side)

#### `linearSync.syncLinearIssues` — Action

Fetch all issues from Linear and upsert them into the `issues` table.

| Arg | Type | Required | Description |
|---|---|---|---|
| `teamId` | `string` | No | Limit to a specific Linear team |

**Returns:** `{ created: number; updated: number; total: number }`

**Requires:** `LINEAR_API_KEY`

---

#### `linearSync.syncLinearTeams` — Action

Fetch all teams from Linear and upsert into `linearTeams`.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `{ created: number; updated: number; total: number }`

**Requires:** `LINEAR_API_KEY`

---

#### `linearSync.syncLinearProjects` — Action

Fetch all projects from Linear and upsert into `linearProjects`.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `{ created: number; updated: number; total: number }`

**Requires:** `LINEAR_API_KEY`

---

#### `linearSync.syncLinearLabels` — Action

Fetch all workflow states (labels) from Linear and upsert into `linearLabels`.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `{ created: number; updated: number; total: number }`

**Requires:** `LINEAR_API_KEY`

---

#### `linearSync.syncLinearUsers` — Action

Fetch all users from Linear and upsert into `linearUsers`.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `{ created: number; updated: number; total: number }`

**Requires:** `LINEAR_API_KEY`

---

#### `linearSync.syncAllLinear` — Action

Run all five sync operations (issues, teams, projects, labels, users) and update the global `lastSyncTime`.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:**

```ts
{
  issues: { created: number; updated: number; total: number };
  teams: { created: number; updated: number; total: number };
  projects: { created: number; updated: number; total: number };
  labels: { created: number; updated: number; total: number };
  users: { created: number; updated: number; total: number };
}
```

**Requires:** `LINEAR_API_KEY`

---

### Queries

#### `linearSync.getLinearIssues` — Query

Paginated query of all issues (including Linear-synced ones).

| Arg | Type | Required | Description |
|---|---|---|---|
| `paginationOpts` | `PaginationOptions` | Yes | Convex pagination options |

**Returns:** `Paginated<Issue>`

---

#### `linearSync.getLastSyncTime` — Query

Get the timestamp of the last full Linear sync.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `string | null` — timestamp as a string, or `null` if never synced.

---

### Internal Mutations

These are callable only from within Convex actions (not from clients).

| Mutation | Purpose |
|---|---|
| `linearSync.upsertIssues` | Upsert an array of mapped Linear issues |
| `linearSync.upsertTeams` | Upsert an array of mapped Linear teams |
| `linearSync.upsertProjects` | Upsert an array of mapped Linear projects |
| `linearSync.upsertLabels` | Upsert an array of mapped Linear labels |
| `linearSync.upsertUsers` | Upsert an array of mapped Linear users |
| `linearSync.updateSyncMeta` | Write a key/value pair to the `syncMeta` table |

---

## Linear Ingest

**Module:** `convex/linearIngest.ts`

Read-only queries for data synced from Linear.

### `linearIngest.getLinearTeams` — Query

List synced Linear teams.

| Arg | Type | Required | Description |
|---|---|---|---|
| `paginationOpts` | `PaginationOptions` | No | If omitted, returns up to 500 records |

**Returns:** `LinearTeam[] | Paginated<LinearTeam>`

---

### `linearIngest.getLinearProjects` — Query

List synced Linear projects.

| Arg | Type | Required | Description |
|---|---|---|---|
| `paginationOpts` | `PaginationOptions` | No | If omitted, returns up to 500 records |

**Returns:** `LinearProject[] | Paginated<LinearProject>`

---

### `linearIngest.getLinearLabels` — Query

List synced Linear labels (workflow states).

| Arg | Type | Required | Description |
|---|---|---|---|
| `paginationOpts` | `PaginationOptions` | No | If omitted, returns up to 500 records |

**Returns:** `LinearLabel[] | Paginated<LinearLabel>`

---

### `linearIngest.getLinearUsers` — Query

List synced Linear users.

| Arg | Type | Required | Description |
|---|---|---|---|
| `paginationOpts` | `PaginationOptions` | No | If omitted, returns up to 500 records |

**Returns:** `LinearUser[] | Paginated<LinearUser>`

---

### `linearIngest.getLinearStats` — Query

Aggregate statistics for all synced Linear data including per-entity sync timestamps.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:**

```ts
{
  counts: {
    issues: number;
    teams: number;
    projects: number;
    labels: number;
    users: number;
  };
  lastSync: {
    all: number | null;
    issues: number | null;
    teams: number | null;
    projects: number | null;
    labels: number | null;
    users: number | null;
  };
}
```

---

## GitHub Sync

**Module:** `convex/githubSync.ts`

Synchronizes issues and projects from a GitHub repository. Requires the `GITHUB_TOKEN` environment variable.

### Actions (server-side)

#### `githubSync.syncGitHubIssues` — Action

Fetch all issues from the configured GitHub repo and upsert into `githubIssues`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `repo` | `string` | No | Repo in `owner/repo` format (defaults to `GITHUB_REPO` env var or `therodfather/seridian`) |

**Returns:** `{ created: number; updated: number; total: number }`

**Requires:** `GITHUB_TOKEN`

---

#### `githubSync.syncGitHubProjects` — Action

Fetch all organization projects via GitHub GraphQL API and upsert into `githubProjects`.

| Arg | Type | Required | Description |
|---|---|---|---|
| `org` | `string` | No | GitHub org (defaults to `therodfather`) |

**Returns:** `{ created: number; updated: number; total: number }`

**Requires:** `GITHUB_TOKEN`

---

#### `githubSync.syncAllGitHub` — Action

Run both issue and project syncs and update sync metadata.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:**

```ts
{
  issues: { created: number; updated: number; total: number };
  projects: { created: number; updated: number; total: number };
}
```

**Requires:** `GITHUB_TOKEN`

---

### Internal Mutations

| Mutation | Purpose |
|---|---|
| `githubSync.upsertGitHubIssues` | Upsert an array of GitHub issues |
| `githubSync.upsertGitHubProjects` | Upsert an array of GitHub projects |
| `githubSync.updateSyncMeta` | Write a key/value pair to the `syncMeta` table |

---

## GitHub Ingest

**Module:** `convex/githubIngest.ts`

Read-only queries for data synced from GitHub.

### `githubIngest.getGitHubIssues` — Query

List synced GitHub issues, optionally filtered by state.

| Arg | Type | Required | Description |
|---|---|---|---|
| `state` | `string` | No | Filter by issue state (`"open"`, `"closed"`, etc.) |

**Returns:** `GitHubIssue[]` — up to 500 records, ordered descending.

---

### `githubIngest.getGitHubProjects` — Query

List synced GitHub projects.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:** `GitHubProject[]` — up to 100 records, ordered descending.

---

### `githubIngest.getGitHubStats` — Query

Aggregate statistics for all synced GitHub data.

| Arg | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | |

**Returns:**

```ts
{
  totalIssues: number;
  totalProjects: number;
  issuesByState: Record<string, number>;
  projectsByState: Record<string, number>;
  lastIssueSync: number | null;
  lastProjectSync: number | null;
  lastFullSync: number | null;
}
```

---

## Environment Variables

The following environment variables are required for sync actions:

| Variable | Used By | Description |
|---|---|---|
| `LINEAR_API_KEY` | `linearSync.*` | Linear Personal API key |
| `GITHUB_TOKEN` | `githubSync.*` | GitHub personal access token |
| `GITHUB_REPO` | `githubSync.syncGitHubIssues` | Default repo (`owner/repo`), fallback `therodfather/seridian` |

---

## Function Index

| Module | Function | Type |
|---|---|---|
| clients | `list` | Query |
| clients | `get` | Query |
| clients | `create` | Mutation |
| clients | `update` | Mutation |
| clients | `remove` | Mutation |
| issues | `list` | Query |
| issues | `get` | Query |
| issues | `create` | Mutation |
| issues | `update` | Mutation |
| issues | `remove` | Mutation |
| issues | `reorder` | Mutation |
| issues | `getLinearSyncStats` | Query |
| bookings | `list` | Query |
| bookings | `get` | Query |
| bookings | `create` | Mutation |
| bookings | `update` | Mutation |
| bookings | `remove` | Mutation |
| contracts | `list` | Query |
| contracts | `get` | Query |
| contracts | `create` | Mutation |
| contracts | `update` | Mutation |
| contracts | `remove` | Mutation |
| proposals | `list` | Query |
| proposals | `get` | Query |
| proposals | `getByClient` | Query |
| proposals | `create` | Mutation |
| proposals | `update` | Mutation |
| proposals | `remove` | Mutation |
| proposals | `send` | Mutation |
| proposals | `accept` | Mutation |
| proposals | `reject` | Mutation |
| deals | `list` | Query |
| deals | `get` | Query |
| deals | `create` | Mutation |
| deals | `update` | Mutation |
| deals | `remove` | Mutation |
| caseStudies | `list` | Query |
| caseStudies | `listPublished` | Query |
| caseStudies | `get` | Query |
| caseStudies | `count` | Query |
| caseStudies | `create` | Mutation |
| caseStudies | `update` | Mutation |
| caseStudies | `remove` | Mutation |
| emailTemplates | `list` | Query |
| emailTemplates | `get` | Query |
| emailTemplates | `getByCategory` | Query |
| emailTemplates | `create` | Mutation |
| emailTemplates | `update` | Mutation |
| emailTemplates | `remove` | Mutation |
| emailTemplates | `duplicate` | Mutation |
| files | `list` | Query |
| files | `get` | Query |
| files | `getByClient` | Query |
| files | `getStorageUrl` | Query |
| files | `create` | Mutation |
| files | `remove` | Mutation |
| files | `move` | Mutation |
| files | `upload` | Action |
| users | `list` | Query |
| users | `get` | Query |
| users | `upsert` | Mutation |
| channels | `list` | Query |
| channels | `get` | Query |
| channels | `create` | Mutation |
| messages | `listByChannel` | Query |
| messages | `listAll` | Query |
| messages | `send` | Mutation |
| chat | `listChannels` | Query |
| chat | `getChannel` | Query |
| chat | `listMessages` | Query |
| chat | `getUsers` | Query |
| chat | `getUser` | Query |
| chat | `createChannel` | Mutation |
| chat | `sendMessage` | Mutation |
| chat | `editMessage` | Mutation |
| chat | `deleteMessage` | Mutation |
| chat | `joinChannel` | Mutation |
| chat | `leaveChannel` | Mutation |
| chat | `updateUserStatus` | Mutation |
| linearSync | `syncLinearIssues` | Action |
| linearSync | `syncLinearTeams` | Action |
| linearSync | `syncLinearProjects` | Action |
| linearSync | `syncLinearLabels` | Action |
| linearSync | `syncLinearUsers` | Action |
| linearSync | `syncAllLinear` | Action |
| linearSync | `getLinearIssues` | Query |
| linearSync | `getLastSyncTime` | Query |
| linearSync | `upsertIssues` | Internal Mutation |
| linearSync | `upsertTeams` | Internal Mutation |
| linearSync | `upsertProjects` | Internal Mutation |
| linearSync | `upsertLabels` | Internal Mutation |
| linearSync | `upsertUsers` | Internal Mutation |
| linearSync | `updateSyncMeta` | Internal Mutation |
| linearIngest | `getLinearTeams` | Query |
| linearIngest | `getLinearProjects` | Query |
| linearIngest | `getLinearLabels` | Query |
| linearIngest | `getLinearUsers` | Query |
| linearIngest | `getLinearStats` | Query |
| githubSync | `syncGitHubIssues` | Action |
| githubSync | `syncGitHubProjects` | Action |
| githubSync | `syncAllGitHub` | Action |
| githubSync | `upsertGitHubIssues` | Internal Mutation |
| githubSync | `upsertGitHubProjects` | Internal Mutation |
| githubSync | `updateSyncMeta` | Internal Mutation |
| githubIngest | `getGitHubIssues` | Query |
| githubIngest | `getGitHubProjects` | Query |
| githubIngest | `getGitHubStats` | Query |
