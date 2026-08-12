import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  clients: defineTable({
    name: v.string(),
    company: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    // Corporate Social Media & Web Presence
    companyLinkedin: v.optional(v.string()),
    companyTwitter: v.optional(v.string()),
    companyGithub: v.optional(v.string()),
    // Business Intelligence & Deep Corporate Network fields
    techStack: v.optional(v.array(v.string())),
    identifiedNeeds: v.optional(v.array(v.string())),
    competitors: v.optional(v.array(v.string())),
    annualRevenue: v.optional(v.string()),
    companySize: v.optional(v.string()),
    // Client's downstream customer network ("Their Clients")
    downstreamClients: v.optional(
      v.array(
        v.object({
          name: v.string(),
          industry: v.optional(v.string()),
          relationshipType: v.string(), // e.g. "Key Account", "Vendor", "Partner"
          notes: v.optional(v.string()),
        })
      )
    ),
    // Rich Personnel & Employee Dossiers (Who's Who + Background Checks + Social Media)
    keyPersonnel: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          role: v.string(),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          twitter: v.optional(v.string()),
          github: v.optional(v.string()),
          personalWebsite: v.optional(v.string()),
          influenceLevel: v.optional(v.union(v.literal("champion"), v.literal("decision_maker"), v.literal("blocker"), v.literal("neutral"))),
          personalInterests: v.optional(v.array(v.string())),
          backgroundCheckNotes: v.optional(v.string()),
          backgroundCheckStatus: v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("flagged"), v.literal("none"))),
          notes: v.optional(v.string()),
        })
      )
    ),
    // Corporate Relationship Graph Mapping
    relationshipGraph: v.optional(
      v.array(
        v.object({
          sourceId: v.string(),
          targetId: v.string(),
          relation: v.string(), // e.g. "Reports To", "Influences", "Partnered With"
        })
      )
    ),
    intelligenceNotes: v.optional(v.string()),
  }).index("by_status", ["status"]),

  contracts: defineTable({
    name: v.string(),
    clientId: v.id("clients"),
    value: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed"),
    ),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_clientId", ["clientId"]),

  issues: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("in_review"),
      v.literal("done"),
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("none"),
    ),
    clientId: v.optional(v.id("clients")),
    labels: v.array(v.string()),
    linearId: v.optional(v.string()),
    identifier: v.optional(v.string()),
    assignee: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    order: v.number(),
    linearCreatedAt: v.optional(v.string()),
    linearUpdatedAt: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_linearId", ["linearId"])
    .index("by_status", ["status"])
    .index("by_clientId", ["clientId"])
    .index("by_status_and_clientId", ["status", "clientId"]),

  bookings: defineTable({
    title: v.string(),
    clientId: v.id("clients"),
    startTime: v.string(),
    endTime: v.string(),
    type: v.union(
      v.literal("consultation"),
      v.literal("development"),
      v.literal("review"),
    ),
    notes: v.optional(v.string()),
    location: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
  })
    .index("by_startTime", ["startTime"])
    .index("by_clientId", ["clientId"]),

  syncMeta: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  secrets: defineTable({
    name: v.string(),
    maskedValue: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  caseStudies: defineTable({
    title: v.string(),
    clientId: v.optional(v.id("clients")),
    summary: v.string(),
    challenge: v.string(),
    solution: v.string(),
    results: v.string(),
    technologies: v.array(v.string()),
    industry: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    published: v.boolean(),
    order: v.number(),
  })
    .index("by_published", ["published"])
    .index("by_order", ["order"]),

  deals: defineTable({
    name: v.string(),
    clientId: v.id("clients"),
    value: v.number(),
    stage: v.union(
      v.literal("lead"),
      v.literal("proposal"),
      v.literal("negotiation"),
      v.literal("closed_won"),
      v.literal("closed_lost"),
    ),
    probability: v.number(),
    expectedCloseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  })
    .index("by_stage", ["stage"])
    .index("by_clientId", ["clientId"])
    .index("by_stage_and_clientId", ["stage", "clientId"]),

  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("public"), v.literal("private"), v.literal("direct")),
    createdBy: v.string(),
    participants: v.array(v.string()),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_createdBy", ["createdBy"]),

  messages: defineTable({
    channelId: v.id("channels"),
    senderId: v.string(),
    senderName: v.string(),
    content: v.string(),
    type: v.union(v.literal("text"), v.literal("system"), v.literal("command")),
    replyTo: v.optional(v.id("messages")),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_channelId_and_createdAt", ["channelId", "createdAt"])
    .index("by_senderId", ["senderId"]),

  users: defineTable({
    pubkey: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    avatar: v.optional(v.string()),
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("away")),
    lastSeen: v.number(),
    deviceType: v.optional(
      v.union(v.literal("web"), v.literal("android"), v.literal("ios")),
    ),
  })
    .index("by_pubkey", ["pubkey"])
    .index("by_status", ["status"]),

  proposals: defineTable({
    title: v.string(),
    clientId: v.optional(v.id("clients")),
    content: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
    value: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_clientId", ["clientId"])
    .index("by_createdBy", ["createdBy"]),

  emailTemplates: defineTable({
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    category: v.union(
      v.literal("proposal"),
      v.literal("invoice"),
      v.literal("follow_up"),
      v.literal("welcome"),
      v.literal("custom"),
    ),
    variables: v.array(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_createdBy", ["createdBy"]),

  files: defineTable({
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    parentId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    uploadedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_parentId", ["parentId"])
    .index("by_clientId", ["clientId"])
    .index("by_type", ["type"]),

  githubIssues: defineTable({
    githubId: v.number(),
    number: v.number(),
    title: v.string(),
    body: v.optional(v.string()),
    state: v.string(),
    labels: v.array(v.string()),
    assignee: v.optional(v.string()),
    projectId: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
    syncedAt: v.number(),
  })
    .index("by_githubId", ["githubId"])
    .index("by_state", ["state"]),

  githubProjects: defineTable({
    githubId: v.number(),
    number: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    state: v.string(),
    syncedAt: v.number(),
  }).index("by_githubId", ["githubId"]),

  linearTeams: defineTable({
    linearId: v.string(),
    name: v.string(),
    key: v.string(),
    syncedAt: v.number(),
  }).index("by_linearId", ["linearId"]),

  linearProjects: defineTable({
    linearId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    state: v.string(),
    teamId: v.optional(v.string()),
    syncedAt: v.number(),
  }).index("by_linearId", ["linearId"]),

  linearLabels: defineTable({
    linearId: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    syncedAt: v.number(),
  }).index("by_linearId", ["linearId"]),

  linearUsers: defineTable({
    linearId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    syncedAt: v.number(),
  }).index("by_linearId", ["linearId"]),

  auditLogs: defineTable({
    action: v.string(),
    actor: v.string(),
    details: v.string(),
    category: v.union(
      v.literal("secret"),
      v.literal("user"),
      v.literal("sync"),
      v.literal("system")
    ),
    timestamp: v.number(),
    metadata: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_category", ["category"]),

  // Real-time Collaborative Document Multiplayer Editing & Presence (Google Docs Style)
  docPresence: defineTable({
    fileId: v.id("files"),
    userPubkey: v.string(),
    userName: v.string(),
    cursorPosition: v.number(),
    activeSelection: v.optional(v.string()),
    lastSeen: v.number(),
  })
    .index("by_fileId", ["fileId"])
    .index("by_fileId_and_pubkey", ["fileId", "userPubkey"]),

  docEdits: defineTable({
    fileId: v.id("files"),
    content: v.string(),
    lastUpdatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_fileId", ["fileId"]),
});

