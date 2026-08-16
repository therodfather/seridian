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
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  contracts: defineTable({
    name: v.string(),
    clientId: v.id("clients"),
    value: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("signed"),
      v.literal("active"),
      v.literal("completed"),
    ),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    body: v.optional(v.string()),
    proposalId: v.optional(v.id("proposals")),
    fileId: v.optional(v.id("files")),
    signToken: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    signerName: v.optional(v.string()),
    signerEmail: v.optional(v.string()),
    signerTitle: v.optional(v.string()),
    signatureText: v.optional(v.string()),
    signedAt: v.optional(v.number()),
  })
    .index("by_clientId", ["clientId"])
    .index("by_status", ["status"])
    .index("by_signToken", ["signToken"])
    .index("by_proposalId", ["proposalId"]),

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
    /**
     * GitHub Projects v2 is ground truth for this board — these fields link
     * a local issue to its GitHub Issue + Project item. Populated once
     * either side creates the pairing; pulls overwrite local status/title
     * on conflict, pushes create the GitHub side if these are still unset.
     */
    githubIssueNumber: v.optional(v.number()),
    githubIssueNodeId: v.optional(v.string()),
    githubProjectItemId: v.optional(v.string()),
    githubUpdatedAt: v.optional(v.string()),
  })
    .index("by_linearId", ["linearId"])
    .index("by_status", ["status"])
    .index("by_clientId", ["clientId"])
    .index("by_status_and_clientId", ["status", "clientId"])
    .index("by_githubIssueNumber", ["githubIssueNumber"])
    .index("by_githubProjectItemId", ["githubProjectItemId"]),

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
    /** Masked preview only — never return ciphertext from public queries. */
    maskedValue: v.string(),
    /**
     * Secret material for server-side use (actions via internalQuery).
     * Relies on Convex encryption at rest; never expose to clients.
     * Optional for legacy rows that only stored masks.
     */
    ciphertext: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  /**
   * Admin-configured third-party integrations (Linear, GitHub bookmarks, etc.).
   * Secrets live in `secrets`; this table holds enablement + non-secret IDs.
   */
  integrationConfigs: defineTable({
    provider: v.union(
      v.literal("linear"),
      v.literal("github"),
      v.literal("netlify"),
      v.literal("stripe"),
      v.literal("mercury"),
      v.literal("telnyx"),
    ),
    enabled: v.boolean(),
    /** Honest setup state — not a live OAuth health check. */
    status: v.union(
      v.literal("not_configured"),
      v.literal("configured"),
      v.literal("connected"),
    ),
    teamId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    /** Points at secrets.name when a vault entry backs this integration. */
    secretName: v.optional(v.string()),
    configuredBy: v.string(),
    configuredAt: v.number(),
    updatedAt: v.number(),
  }).index("by_provider", ["provider"]),

  /**
   * Optional tenant registry for multi-business workspaces. IVR flows can
   * optionally point at a business; the rest of the app remains single-tenant.
   */
  businesses: defineTable({
    name: v.string(),
    slug: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  /**
   * Telnyx-backed inbound IVR flow. Draft graph is edited in the dashboard;
   * Telnyx executes the published version snapshot only.
   */
  ivrFlows: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    businessId: v.optional(v.id("businesses")),
    /** Editable draft; published copy lives in ivrFlowVersions. */
    draftGraph: v.object({
      entryNodeId: v.string(),
      nodes: v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("speak"),
            v.literal("gather"),
            v.literal("transfer"),
            v.literal("voicemail"),
            v.literal("hours"),
            v.literal("hangup"),
            v.literal("webhook"),
          ),
          label: v.string(),
          text: v.optional(v.string()),
          voice: v.optional(v.string()),
          language: v.optional(v.string()),
          transferTo: v.optional(v.string()),
          webhookUrl: v.optional(v.string()),
          timezone: v.optional(v.string()),
          openHour: v.optional(v.number()),
          closeHour: v.optional(v.number()),
          openDays: v.optional(v.array(v.number())),
          maxRecordingSecs: v.optional(v.number()),
          edges: v.array(
            v.object({
              key: v.union(
                v.literal("0"),
                v.literal("1"),
                v.literal("2"),
                v.literal("3"),
                v.literal("4"),
                v.literal("5"),
                v.literal("6"),
                v.literal("7"),
                v.literal("8"),
                v.literal("9"),
                v.literal("*"),
                v.literal("#"),
                v.literal("timeout"),
                v.literal("invalid"),
                v.literal("no_input"),
                v.literal("next"),
                v.literal("open"),
                v.literal("closed"),
              ),
              targetNodeId: v.string(),
            }),
          ),
        }),
      ),
    }),
    publishedVersionId: v.optional(v.id("ivrFlowVersions")),
    publishedVersion: v.optional(v.number()),
    phoneNumber: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    callControlAppId: v.optional(v.string()),
    connectionId: v.optional(v.string()),
    /** True when a Telnyx number is wired to this flow's Call Control app. */
    numberActive: v.boolean(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_phoneNumber", ["phoneNumber"])
    .index("by_business", ["businessId"]),

  /** Immutable published snapshots executed by the Telnyx webhook. */
  ivrFlowVersions: defineTable({
    flowId: v.id("ivrFlows"),
    version: v.number(),
    graph: v.object({
      entryNodeId: v.string(),
      nodes: v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("speak"),
            v.literal("gather"),
            v.literal("transfer"),
            v.literal("voicemail"),
            v.literal("hours"),
            v.literal("hangup"),
            v.literal("webhook"),
          ),
          label: v.string(),
          text: v.optional(v.string()),
          voice: v.optional(v.string()),
          language: v.optional(v.string()),
          transferTo: v.optional(v.string()),
          webhookUrl: v.optional(v.string()),
          timezone: v.optional(v.string()),
          openHour: v.optional(v.number()),
          closeHour: v.optional(v.number()),
          openDays: v.optional(v.array(v.number())),
          maxRecordingSecs: v.optional(v.number()),
          edges: v.array(
            v.object({
              key: v.union(
                v.literal("0"),
                v.literal("1"),
                v.literal("2"),
                v.literal("3"),
                v.literal("4"),
                v.literal("5"),
                v.literal("6"),
                v.literal("7"),
                v.literal("8"),
                v.literal("9"),
                v.literal("*"),
                v.literal("#"),
                v.literal("timeout"),
                v.literal("invalid"),
                v.literal("no_input"),
                v.literal("next"),
                v.literal("open"),
                v.literal("closed"),
              ),
              targetNodeId: v.string(),
            }),
          ),
        }),
      ),
    }),
    publishedBy: v.string(),
    publishedAt: v.number(),
  })
    .index("by_flow", ["flowId"])
    .index("by_flow_and_version", ["flowId", "version"]),

  /** Inbound call events handled by the Telnyx IVR webhook (admin-only reads). */
  ivrCallLogs: defineTable({
    flowId: v.id("ivrFlows"),
    versionId: v.optional(v.id("ivrFlowVersions")),
    callControlId: v.string(),
    fromNumber: v.string(),
    toNumber: v.string(),
    digitPressed: v.optional(v.string()),
    currentNodeId: v.optional(v.string()),
    routedTo: v.optional(v.string()),
    status: v.union(
      v.literal("ringing"),
      v.literal("answered"),
      v.literal("in_progress"),
      v.literal("transferred"),
      v.literal("recorded"),
      v.literal("no_input"),
      v.literal("hangup"),
      v.literal("error"),
    ),
    lastEventType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_callControlId", ["callControlId"])
    .index("by_flow", ["flowId"]),

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

  // Stripe events land here first, keyed by Stripe's event id, so a retried
  // webhook delivery is a no-op instead of double-recording a payment.
  stripeEvents: defineTable({
    stripeEventId: v.string(),
    type: v.string(),
    receivedAt: v.number(),
  }).index("by_stripeEventId", ["stripeEventId"]),

  payments: defineTable({
    stripePaymentIntentId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    amount: v.number(), // smallest currency unit (cents), as Stripe reports it
    currency: v.string(),
    status: v.union(
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    description: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    proposalId: v.optional(v.id("proposals")),
    contractId: v.optional(v.id("contracts")),
    createdAt: v.number(),
  })
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
    .index("by_clientId", ["clientId"])
    .index("by_createdAt", ["createdAt"]),

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
    /** Projects v2 node ID — an opaque string (e.g. "PVT_..."), not numeric. */
    githubId: v.string(),
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
      v.literal("system"),
      v.literal("payment")
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

  memoryBanks: defineTable({
    name: v.string(),
    mission: v.string(),
    directives: v.array(v.string()),
    disposition: v.object({
      skepticism: v.number(),
      literalism: v.number(),
      empathy: v.number(),
    }),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  bankConfig: defineTable({
    bankId: v.id("memoryBanks"),
    retainMission: v.optional(v.string()),
    retainExtractionMode: v.union(
      v.literal("concise"),
      v.literal("verbose"),
      v.literal("custom"),
    ),
    entityLabels: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_bank", ["bankId"]),

  entities: defineTable({
    bankId: v.id("memoryBanks"),
    name: v.string(),
    type: v.union(
      v.literal("person"),
      v.literal("organization"),
      v.literal("place"),
      v.literal("concept"),
      v.literal("product"),
    ),
    aliases: v.array(v.string()),
    metadata: v.optional(v.any()),
    mentionCount: v.number(),
    firstSeen: v.number(),
    lastSeen: v.number(),
    createdAt: v.number(),
  })
    .index("by_bank", ["bankId"])
    .index("by_name", ["bankId", "name"])
    .index("by_type", ["bankId", "type"]),

  memories: defineTable({
    bankId: v.id("memoryBanks"),
    type: v.union(
      v.literal("world_fact"),
      v.literal("experience_fact"),
      v.literal("observation"),
      v.literal("mental_model"),
    ),
    content: v.string(),
    evidence: v.array(v.string()),
    proofCount: v.number(),
    embedding: v.array(v.number()),
    tags: v.array(v.string()),
    relations: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    consolidatedAt: v.optional(v.number()),
  })
    .index("by_bank", ["bankId"])
    .index("by_bank_type", ["bankId", "type"]),

  memoryConnections: defineTable({
    bankId: v.id("memoryBanks"),
    sourceMemoryId: v.id("memories"),
    targetMemoryId: v.id("memories"),
    connectionType: v.union(
      v.literal("entity"),
      v.literal("temporal"),
      v.literal("semantic"),
      v.literal("causal"),
    ),
    strength: v.number(),
    createdAt: v.number(),
  })
    .index("by_bank", ["bankId"])
    .index("by_source", ["sourceMemoryId"])
    .index("by_target", ["targetMemoryId"]),

  agentActivity: defineTable({
    bankId: v.id("memoryBanks"),
    agentId: v.string(),
    action: v.string(),
    details: v.string(),
    timestamp: v.number(),
  }),

  wikiPages: defineTable({
    bankId: v.id("memoryBanks"),
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    lastEditedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_bank", ["bankId"]),

  /**
   * First-party workflow automation (n8n/Pipedream-style capability, not a fork).
   * Draft graph is edited in the dashboard; executor runs published snapshots only
   * (manual / webhook / schedule triggers).
   */
  workflows: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    draftGraph: v.object({
      trigger: v.object({
        type: v.union(
          v.literal("manual"),
          v.literal("webhook"),
          v.literal("schedule"),
          v.literal("form_submission"),
        ),
        intervalMinutes: v.optional(v.number()),
        formId: v.optional(v.string()),
        formSlug: v.optional(v.string()),
      }),
      steps: v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("http_request"),
            v.literal("create_issue"),
            v.literal("create_linear_issue"),
            v.literal("append_client_note"),
            v.literal("delay"),
            v.literal("filter"),
          ),
          label: v.string(),
          url: v.optional(v.string()),
          method: v.optional(
            v.union(
              v.literal("GET"),
              v.literal("POST"),
              v.literal("PUT"),
              v.literal("PATCH"),
              v.literal("DELETE"),
            ),
          ),
          headersJson: v.optional(v.string()),
          bodyTemplate: v.optional(v.string()),
          issueTitle: v.optional(v.string()),
          issueDescription: v.optional(v.string()),
          issuePriority: v.optional(
            v.union(
              v.literal("urgent"),
              v.literal("high"),
              v.literal("medium"),
              v.literal("low"),
              v.literal("none"),
            ),
          ),
          clientId: v.optional(v.string()),
          noteText: v.optional(v.string()),
          delaySeconds: v.optional(v.number()),
          filterField: v.optional(v.string()),
          filterEquals: v.optional(v.string()),
        }),
      ),
    }),
    publishedVersionId: v.optional(v.id("workflowVersions")),
    publishedVersion: v.optional(v.number()),
    /** Secret path token for /workflows/webhook/{token} */
    webhookToken: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("live"),
      v.literal("archived"),
    ),
    lastRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("succeeded"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
    ),
    /** Next scheduled fire (ms); only meaningful when live + schedule trigger */
    nextRunAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_webhookToken", ["webhookToken"])
    .index("by_status_and_nextRunAt", ["status", "nextRunAt"]),

  /** Immutable published snapshots executed by webhook / schedule / Run now. */
  workflowVersions: defineTable({
    workflowId: v.id("workflows"),
    version: v.number(),
    graph: v.object({
      trigger: v.object({
        type: v.union(
          v.literal("manual"),
          v.literal("webhook"),
          v.literal("schedule"),
          v.literal("form_submission"),
        ),
        intervalMinutes: v.optional(v.number()),
        formId: v.optional(v.string()),
        formSlug: v.optional(v.string()),
      }),
      steps: v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("http_request"),
            v.literal("create_issue"),
            v.literal("create_linear_issue"),
            v.literal("append_client_note"),
            v.literal("delay"),
            v.literal("filter"),
          ),
          label: v.string(),
          url: v.optional(v.string()),
          method: v.optional(
            v.union(
              v.literal("GET"),
              v.literal("POST"),
              v.literal("PUT"),
              v.literal("PATCH"),
              v.literal("DELETE"),
            ),
          ),
          headersJson: v.optional(v.string()),
          bodyTemplate: v.optional(v.string()),
          issueTitle: v.optional(v.string()),
          issueDescription: v.optional(v.string()),
          issuePriority: v.optional(
            v.union(
              v.literal("urgent"),
              v.literal("high"),
              v.literal("medium"),
              v.literal("low"),
              v.literal("none"),
            ),
          ),
          clientId: v.optional(v.string()),
          noteText: v.optional(v.string()),
          delaySeconds: v.optional(v.number()),
          filterField: v.optional(v.string()),
          filterEquals: v.optional(v.string()),
        }),
      ),
    }),
    publishedBy: v.string(),
    publishedAt: v.number(),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_workflow_and_version", ["workflowId", "version"]),

  workflowRuns: defineTable({
    workflowId: v.id("workflows"),
    versionId: v.id("workflowVersions"),
    trigger: v.union(
      v.literal("manual"),
      v.literal("webhook"),
      v.literal("schedule"),
      v.literal("form_submission"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    /** Truncated JSON string of trigger payload — never secrets vault material. */
    triggerPayload: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    startedBy: v.optional(v.string()),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_workflow_and_startedAt", ["workflowId", "startedAt"])
    .index("by_status", ["status"]),

  workflowRunSteps: defineTable({
    runId: v.id("workflowRuns"),
    stepId: v.string(),
    stepType: v.string(),
    stepLabel: v.string(),
    order: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    inputSummary: v.optional(v.string()),
    outputSummary: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  }).index("by_run", ["runId"]),

  /**
   * Forms — Formspree/Jotform-style builders.
   * Public submit uses slug + published fields only (never draft).
   */
  forms: defineTable({
    name: v.string(),
    /** URL-safe public id, unique among non-archived forms. */
    slug: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("live"),
      v.literal("archived"),
    ),
    draftFields: v.array(
      v.object({
        id: v.string(),
        type: v.union(
          v.literal("text"),
          v.literal("email"),
          v.literal("phone"),
          v.literal("textarea"),
          v.literal("number"),
          v.literal("select"),
          v.literal("checkbox"),
          v.literal("url"),
          v.literal("date"),
        ),
        label: v.string(),
        name: v.string(),
        placeholder: v.optional(v.string()),
        helpText: v.optional(v.string()),
        required: v.boolean(),
        options: v.optional(v.array(v.string())),
        showIfFieldId: v.optional(v.string()),
        showIfEquals: v.optional(v.string()),
      }),
    ),
    /** Snapshot published for public submit. */
    publishedFields: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("text"),
            v.literal("email"),
            v.literal("phone"),
            v.literal("textarea"),
            v.literal("number"),
            v.literal("select"),
            v.literal("checkbox"),
            v.literal("url"),
            v.literal("date"),
          ),
          label: v.string(),
          name: v.string(),
          placeholder: v.optional(v.string()),
          helpText: v.optional(v.string()),
          required: v.boolean(),
          options: v.optional(v.array(v.string())),
          showIfFieldId: v.optional(v.string()),
          showIfEquals: v.optional(v.string()),
        }),
      ),
    ),
    publishedVersion: v.optional(v.number()),
    submitButtonLabel: v.string(),
    successMessage: v.string(),
    /** Optional redirect after successful browser submit. */
    redirectUrl: v.optional(v.string()),
    /** Optional webhook notified on each submission (Formspree-style). */
    notifyWebhookUrl: v.optional(v.string()),
    submissionCount: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"]),

  formSubmissions: defineTable({
    formId: v.id("forms"),
    formSlug: v.string(),
    /** JSON string of validated field values. */
    payloadJson: v.string(),
    /** Truncated plain-text preview for list UI. */
    preview: v.string(),
    source: v.union(
      v.literal("public_page"),
      v.literal("embed"),
      v.literal("api"),
    ),
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_form_and_createdAt", ["formId", "createdAt"])
    .index("by_form_and_read", ["formId", "read"]),
});

