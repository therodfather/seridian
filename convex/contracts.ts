import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("signed"),
  v.literal("active"),
  v.literal("completed"),
);

function newSignToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export const list = query({
  args: {
    clientId: v.optional(v.id("clients")),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    if (args.clientId) {
      return await ctx.db
        .query("contracts")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .take(500);
    }
    if (args.status) {
      return await ctx.db
        .query("contracts")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(500);
    }
    return await ctx.db.query("contracts").order("desc").take(500);
  },
});

export const get = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contractId);
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) return null;
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_signToken", (q) => q.eq("signToken", token))
      .unique();
    if (!contract) return null;
    const client = await ctx.db.get(contract.clientId);
    return {
      _id: contract._id,
      name: contract.name,
      value: contract.value,
      status: contract.status,
      body: contract.body ?? "",
      startDate: contract.startDate,
      endDate: contract.endDate,
      clientName: client?.name ?? "Client",
      clientCompany: client?.company ?? "",
      signedAt: contract.signedAt,
      signerName: contract.signerName,
      signatureText: contract.signatureText,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    clientId: v.id("clients"),
    value: v.number(),
    status: v.optional(statusValidator),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    body: v.optional(v.string()),
    proposalId: v.optional(v.id("proposals")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contracts", {
      name: args.name,
      clientId: args.clientId,
      value: args.value,
      status: args.status ?? "draft",
      startDate: args.startDate,
      endDate: args.endDate,
      notes: args.notes,
      body: args.body,
      proposalId: args.proposalId,
    });
  },
});

export const createFromProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (!proposal.clientId) {
      throw new Error("Proposal needs a client before it can become a contract");
    }

    const existing = await ctx.db
      .query("contracts")
      .withIndex("by_proposalId", (q) => q.eq("proposalId", args.proposalId))
      .first();
    if (existing) return existing._id;

    const today = new Date().toISOString().slice(0, 10);
    return await ctx.db.insert("contracts", {
      name: proposal.title,
      clientId: proposal.clientId,
      value: proposal.value ?? 0,
      status: "draft",
      startDate: today,
      body: proposal.content,
      notes: proposal.notes,
      proposalId: args.proposalId,
    });
  },
});

export const update = mutation({
  args: {
    contractId: v.id("contracts"),
    name: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    value: v.optional(v.number()),
    status: v.optional(statusValidator),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contractId, ...fields } = args;
    const contract = await ctx.db.get(contractId);
    if (!contract) throw new Error("Contract not found");
    if (contract.status === "signed" || contract.status === "completed") {
      throw new Error("Signed contracts cannot be edited");
    }
    const nonUndefined = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(contractId, nonUndefined);
    return contractId;
  },
});

export const sendForSignature = mutation({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("Contract not found");
    if (contract.status === "signed" || contract.status === "completed") {
      throw new Error("Contract is already signed");
    }
    const signToken = contract.signToken ?? newSignToken();
    await ctx.db.patch(args.contractId, {
      status: "sent",
      signToken,
      sentAt: Date.now(),
    });
    return { contractId: args.contractId, signToken };
  },
});

export const signByToken = mutation({
  args: {
    token: v.string(),
    signerName: v.string(),
    signerEmail: v.optional(v.string()),
    signerTitle: v.optional(v.string()),
    signatureText: v.string(),
  },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    const signerName = args.signerName.trim();
    const signatureText = args.signatureText.trim();
    if (!token) throw new Error("Missing signing link");
    if (signerName.length < 2) throw new Error("Type your full legal name");
    if (signatureText.length < 2) throw new Error("Signature is required");

    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_signToken", (q) => q.eq("signToken", token))
      .unique();
    if (!contract) throw new Error("Signing link is invalid or expired");
    if (contract.status === "signed" || contract.status === "completed") {
      throw new Error("This contract is already signed");
    }
    if (contract.status !== "sent" && contract.status !== "draft") {
      throw new Error("This contract is not open for signature");
    }

    await ctx.db.patch(contract._id, {
      status: "signed",
      signerName,
      signerEmail: args.signerEmail?.trim() || undefined,
      signerTitle: args.signerTitle?.trim() || undefined,
      signatureText,
      signedAt: Date.now(),
    });
    return contract._id;
  },
});

export const activate = mutation({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("Contract not found");
    if (contract.status !== "signed") {
      throw new Error("Only signed contracts can be marked active");
    }
    await ctx.db.patch(args.contractId, { status: "active" });
    return args.contractId;
  },
});

export const remove = mutation({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("Contract not found");
    if (contract.status === "signed" || contract.status === "active") {
      throw new Error("Cannot delete a signed or active contract");
    }
    await ctx.db.delete(args.contractId);
  },
});
