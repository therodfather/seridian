import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ===== Memory Bank Operations =====

export const createBank = mutation({
  args: {
    name: v.string(),
    mission: v.string(),
    directives: v.array(v.string()),
    disposition: v.object({
      skepticism: v.number(),
      literalism: v.number(),
      empathy: v.number(),
    }),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const bankId = await ctx.db.insert("memoryBanks", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    // Create default bank config
    await ctx.db.insert("bankConfig", {
      bankId,
      retainExtractionMode: "concise",
      createdAt: now,
      updatedAt: now,
    });

    return bankId;
  },
});

export const getBank = query({
  args: { bankId: v.id("memoryBanks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bankId);
  },
});

export const listBanks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("memoryBanks").order("desc").take(100);
  },
});

export const getBankConfig = query({
  args: { bankId: v.id("memoryBanks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bankConfig")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .first();
  },
});

export const updateBankConfig = mutation({
  args: {
    bankId: v.id("memoryBanks"),
    retainMission: v.optional(v.string()),
    retainExtractionMode: v.optional(
      v.union(v.literal("concise"), v.literal("verbose"), v.literal("custom")),
    ),
    entityLabels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bankConfig")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.retainMission !== undefined && { retainMission: args.retainMission }),
        ...(args.retainExtractionMode !== undefined && { retainExtractionMode: args.retainExtractionMode }),
        ...(args.entityLabels !== undefined && { entityLabels: args.entityLabels }),
        updatedAt: Date.now(),
      });
    }
  },
});

// ===== Entity Operations =====

export const upsertEntity = mutation({
  args: {
    bankId: v.id("memoryBanks"),
    name: v.string(),
    type: v.union(
      v.literal("person"),
      v.literal("organization"),
      v.literal("place"),
      v.literal("concept"),
      v.literal("product"),
    ),
    aliases: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const nameLower = args.name.toLowerCase();

    // Check if entity exists (fuzzy match by name)
    const existing = await ctx.db
      .query("entities")
      .withIndex("by_name", (q) =>
        q.eq("bankId", args.bankId).eq("name", args.name),
      )
      .first();

    if (existing) {
      // Update existing entity
      const newAliases = [...new Set([...existing.aliases, ...(args.aliases ?? [])])];
      await ctx.db.patch(existing._id, {
        aliases: newAliases,
        mentionCount: existing.mentionCount + 1,
        lastSeen: now,
        ...(args.metadata && { metadata: args.metadata }),
      });
      return existing._id;
    }

    // Check for similar entities (fuzzy name matching)
    const allEntities = await ctx.db
      .query("entities")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(100);

    const similar = allEntities.find((e) => {
      const eNameLower = e.name.toLowerCase();
      // Check if names are similar (contains or edit distance)
      return (
        eNameLower.includes(nameLower) ||
        nameLower.includes(eNameLower) ||
        e.aliases.some((a) => a.toLowerCase() === nameLower)
      );
    });

    if (similar) {
      // Merge into existing entity
      const newAliases = [...new Set([...similar.aliases, args.name, ...(args.aliases ?? [])])];
      await ctx.db.patch(similar._id, {
        aliases: newAliases,
        mentionCount: similar.mentionCount + 1,
        lastSeen: now,
      });
      return similar._id;
    }

    // Create new entity
    return await ctx.db.insert("entities", {
      bankId: args.bankId,
      name: args.name,
      type: args.type,
      aliases: args.aliases ?? [args.name],
      metadata: args.metadata,
      mentionCount: 1,
      firstSeen: now,
      lastSeen: now,
      createdAt: now,
    });
  },
});

export const getEntities = query({
  args: {
    bankId: v.id("memoryBanks"),
    entityType: v.optional(
      v.union(
        v.literal("person"),
        v.literal("organization"),
        v.literal("place"),
        v.literal("concept"),
        v.literal("product"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (args.entityType) {
      return await ctx.db
        .query("entities")
        .withIndex("by_type", (q) =>
          q.eq("bankId", args.bankId).eq("type", args.entityType!),
        )
        .order("desc")
        .take(100);
    }
    return await ctx.db
      .query("entities")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .order("desc")
      .take(100);
  },
});

// ===== Knowledge Graph Operations =====

export const createConnection = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if connection already exists
    const existing = await ctx.db
      .query("memoryConnections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.sourceMemoryId))
      .filter((q) => q.eq(q.field("targetMemoryId"), args.targetMemoryId))
      .first();

    if (existing) {
      // Update strength if stronger
      if (args.strength > existing.strength) {
        await ctx.db.patch(existing._id, { strength: args.strength });
      }
      return existing._id;
    }

    return await ctx.db.insert("memoryConnections", {
      bankId: args.bankId,
      sourceMemoryId: args.sourceMemoryId,
      targetMemoryId: args.targetMemoryId,
      connectionType: args.connectionType,
      strength: args.strength,
      createdAt: now,
    });
  },
});

export const getConnections = query({
  args: {
    memoryId: v.id("memories"),
    connectionType: v.optional(
      v.union(
        v.literal("entity"),
        v.literal("temporal"),
        v.literal("semantic"),
        v.literal("causal"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const outgoing = await ctx.db
      .query("memoryConnections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.memoryId))
      .take(50);

    const incoming = await ctx.db
      .query("memoryConnections")
      .withIndex("by_target", (q) => q.eq("targetMemoryId", args.memoryId))
      .take(50);

    const all = [...outgoing, ...incoming];

    if (args.connectionType) {
      return all.filter((c) => c.connectionType === args.connectionType);
    }

    return all;
  },
});

// ===== Rich Fact Extraction & Retain =====

/**
 * Extract entities from text content.
 * This is a simple regex-based extractor. In production, use an LLM.
 */
function extractEntitiesFromText(text: string): Array<{ name: string; type: "person" | "organization" | "place" | "concept" | "product" }> {
  const entities: Array<{ name: string; type: "person" | "organization" | "place" | "concept" | "product" }> = [];

  // Simple patterns for demonstration
  // In production, use NLP/LLM for entity extraction
  const personPattern = /\b([A-Z][a-z]+ (?:[A-Z][a-z]+ )?[A-Z][a-z]+)\b/g;
  const orgPattern = /\b(Google|Microsoft|Apple|Amazon|Meta|OpenAI|Anthropic|MIT|Stanford|Harvard)\b/gi;

  let match;
  while ((match = personPattern.exec(text)) !== null) {
    entities.push({ name: match[1], type: "person" });
  }

  while ((match = orgPattern.exec(text)) !== null) {
    entities.push({ name: match[1], type: "organization" });
  }

  return entities;
}

/**
 * Simple text similarity using Jaccard index
 */
function textSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

export const retain = mutation({
  args: {
    bankId: v.id("memoryBanks"),
    type: v.union(
      v.literal("world_fact"),
      v.literal("experience_fact"),
      v.literal("observation"),
      v.literal("mental_model"),
    ),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    agentId: v.string(),
    context: v.optional(v.string()), // Who is speaking (for fact type determination)
  },
  handler: async (ctx, args) => {
    const bank = await ctx.db.get(args.bankId);
    if (!bank) throw new Error("Memory bank not found");

    const now = Date.now();

    // Extract entities from content
    const extractedEntities = extractEntitiesFromText(args.content);

    // Create the memory
    const memoryId = await ctx.db.insert("memories", {
      bankId: args.bankId,
      type: args.type,
      content: args.content,
      evidence: [],
      proofCount: 1,
      embedding: [], // Would be populated by embedding service
      tags: args.tags ?? [],
      relations: [],
      createdAt: now,
      updatedAt: now,
      consolidatedAt: undefined,
    });

    // Upsert extracted entities
    for (const entity of extractedEntities) {
      const entityId = await ctx.db.insert("entities", {
        bankId: args.bankId,
        name: entity.name,
        type: entity.type,
        aliases: [entity.name],
        mentionCount: 1,
        firstSeen: now,
        lastSeen: now,
        createdAt: now,
      });

      // Create entity connection to this memory
      await ctx.db.insert("memoryConnections", {
        bankId: args.bankId,
        sourceMemoryId: memoryId,
        targetMemoryId: memoryId, // Self-reference for entity association
        connectionType: "entity",
        strength: 1.0,
        createdAt: now,
      });
    }

    // Find and connect to similar existing memories
    const existingMemories = await ctx.db
      .query("memories")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(100);

    for (const existing of existingMemories) {
      if (existing._id === memoryId) continue;

      const similarity = textSimilarity(args.content, existing.content);
      if (similarity > 0.3) {
        // Create semantic connection
        await ctx.db.insert("memoryConnections", {
          bankId: args.bankId,
          sourceMemoryId: memoryId,
          targetMemoryId: existing._id,
          connectionType: "semantic",
          strength: similarity,
          createdAt: now,
        });
      }
    }

    // Log activity
    await ctx.db.insert("agentActivity", {
      bankId: args.bankId,
      agentId: args.agentId,
      action: "retain",
      details: JSON.stringify({
        memoryId,
        type: args.type,
        content: args.content.slice(0, 200),
        entities: extractedEntities.map((e) => e.name),
      }),
      timestamp: now,
    });

    // Update bank timestamp
    await ctx.db.patch(args.bankId, { updatedAt: now });

    return memoryId;
  },
});

// ===== TEMPR Recall (4-Way Search) =====

export const recall = query({
  args: {
    bankId: v.id("memoryBanks"),
    searchText: v.string(),
    memoryType: v.optional(
      v.union(
        v.literal("world_fact"),
        v.literal("experience_fact"),
        v.literal("observation"),
        v.literal("mental_model"),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchLower = args.searchText.toLowerCase();
    const searchTokens = searchLower.split(/\s+/);

    // Get all memories for the bank
    let memories = await ctx.db
      .query("memories")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(500);

    // Filter by type if specified
    if (args.memoryType) {
      memories = memories.filter((m) => m.type === args.memoryType);
    }

    // Filter by tags if specified
    if (args.tags && args.tags.length > 0) {
      memories = memories.filter((m) =>
        args.tags!.some((tag) => m.tags.includes(tag)),
      );
    }

    // TEMPR: 4 scoring strategies
    const scored = memories.map((memory) => {
      const contentLower = memory.content.toLowerCase();
      const contentTokens = new Set(contentLower.split(/\s+/));

      // 1. Semantic score: token overlap
      const semanticScore = searchTokens.filter((t) => contentTokens.has(t)).length / searchTokens.length;

      // 2. Keyword score: exact phrase match
      const keywordScore = contentLower.includes(searchLower) ? 1.0 : 0.0;

      // 3. Graph score: connections count
      const graphScore = Math.min(memory.relations.length * 0.1, 1.0);

      // 4. Temporal score: recency (simple linear decay)
      const daysSinceCreation = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24);
      const temporalScore = Math.max(0.1, 1.0 - daysSinceCreation / 365);

      // RRF-like fusion
      const k = 60;
      const rrfScore =
        1 / (k + 1 / Math.max(semanticScore, 0.001)) +
        1 / (k + 1 / Math.max(keywordScore, 0.001)) +
        1 / (k + 1 / Math.max(graphScore, 0.001)) +
        1 / (k + 1 / Math.max(temporalScore, 0.001));

      // Boost for observations with more evidence
      const proofBoost = 1 + 0.05 * Math.min(memory.proofCount / 10, 1);

      return {
        memory,
        score: rrfScore * proofBoost,
        semanticScore,
        keywordScore,
        graphScore,
        temporalScore,
      };
    });

    // Sort by score and return top results
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => ({
        ...s.memory,
        _score: s.score,
        _semanticScore: s.semanticScore,
        _keywordScore: s.keywordScore,
        _graphScore: s.graphScore,
        _temporalScore: s.temporalScore,
      }));
  },
});

// ===== Reflect (Mission-Aware Reasoning) =====

export const reflect = query({
  args: {
    bankId: v.id("memoryBanks"),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const bank = await ctx.db.get(args.bankId);
    if (!bank) return null;

    // Get bank config
    const config = await ctx.db
      .query("bankConfig")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .first();

    // Get memories
    let memories = await ctx.db
      .query("memories")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .order("desc")
      .take(limit);

    // Priority: Mental Models > Observations > Raw Facts
    const mentalModels = memories.filter((m) => m.type === "mental_model");
    const observations = memories.filter((m) => m.type === "observation");
    const facts = memories.filter(
      (m) => m.type === "world_fact" || m.type === "experience_fact",
    );

    // Get entities for context
    const entities = await ctx.db
      .query("entities")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(100);

    return {
      bank: {
        name: bank.name,
        mission: bank.mission,
        directives: bank.directives,
        disposition: bank.disposition,
      },
      config: config
        ? {
            retainMission: config.retainMission,
            retainExtractionMode: config.retainExtractionMode,
            entityLabels: config.entityLabels,
          }
        : null,
      memories: {
        mentalModels,
        observations,
        facts,
        total: memories.length,
      },
      entities,
      memoryCount: memories.length,
    };
  },
});

// ===== Helper Queries =====

export const getMemories = query({
  args: {
    bankId: v.id("memoryBanks"),
    memoryType: v.optional(
      v.union(
        v.literal("world_fact"),
        v.literal("experience_fact"),
        v.literal("observation"),
        v.literal("mental_model"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.memoryType) {
      return await ctx.db
        .query("memories")
        .withIndex("by_bank_type", (q) =>
          q.eq("bankId", args.bankId).eq("type", args.memoryType!),
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("memories")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .order("desc")
      .take(limit);
  },
});

export const getMemory = query({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.memoryId);
  },
});

// ===== Memory Update & Delete =====

export const updateMemory = mutation({
  args: {
    memoryId: v.id("memories"),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memoryId);
    if (!existing) throw new Error("Memory not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.content !== undefined) patch.content = args.content;
    if (args.tags !== undefined) patch.tags = args.tags;

    await ctx.db.patch(args.memoryId, patch);
    return args.memoryId;
  },
});

export const deleteMemory = mutation({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memoryId);
    if (!existing) throw new Error("Memory not found");

    // Remove associated connections
    const outgoing = await ctx.db
      .query("memoryConnections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.memoryId))
      .take(50);
    const incoming = await ctx.db
      .query("memoryConnections")
      .withIndex("by_target", (q) => q.eq("targetMemoryId", args.memoryId))
      .take(50);

    for (const conn of [...outgoing, ...incoming]) {
      await ctx.db.delete(conn._id);
    }

    await ctx.db.delete(args.memoryId);
    return args.memoryId;
  },
});

export const getMemoryStats = query({
  args: { bankId: v.id("memoryBanks") },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(1000);

    const entities = await ctx.db
      .query("entities")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(1000);

    const connections = await ctx.db
      .query("memoryConnections")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .take(1000);

    const byType = {
      world_fact: memories.filter((m) => m.type === "world_fact").length,
      experience_fact: memories.filter((m) => m.type === "experience_fact").length,
      observation: memories.filter((m) => m.type === "observation").length,
      mental_model: memories.filter((m) => m.type === "mental_model").length,
    };

    const byEntityType = {
      person: entities.filter((e) => e.type === "person").length,
      organization: entities.filter((e) => e.type === "organization").length,
      place: entities.filter((e) => e.type === "place").length,
      concept: entities.filter((e) => e.type === "concept").length,
      product: entities.filter((e) => e.type === "product").length,
    };

    return {
      totalMemories: memories.length,
      totalEntities: entities.length,
      totalConnections: connections.length,
      byType,
      byEntityType,
      consolidatedCount: memories.filter((m) => m.consolidatedAt).length,
    };
  },
});
