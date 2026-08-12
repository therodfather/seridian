import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(500);
    return users.map(({ password: _password, ...rest }) => rest);
  },
});

export const upsert = mutation({
  args: {
    pubkey: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    avatar: v.optional(v.string()),
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("away")),
    deviceType: v.optional(v.union(v.literal("web"), v.literal("android"), v.literal("ios"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_pubkey", (q) => q.eq("pubkey", args.pubkey))
      .first();

    if (existing) {
      const passwordUpdate = (() => {
        if (args.password === undefined) return undefined;
        if (!existing.password) return args.password;
        return args.password;
      })();

      await ctx.db.patch(existing._id, {
        name: args.name,
        avatar: args.avatar,
        status: args.status,
        lastSeen: Date.now(),
        deviceType: args.deviceType,
        ...(args.email !== undefined && { email: args.email }),
        ...(passwordUpdate !== undefined && { password: passwordUpdate }),
      });

      await ctx.db.insert("auditLogs", {
        action: "User Access Updated",
        actor: "Admin",
        details: `Updated member account @${args.pubkey} (${args.name})`,
        category: "user",
        timestamp: Date.now(),
        metadata: JSON.stringify({ pubkey: args.pubkey, name: args.name }),
      });

      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      pubkey: args.pubkey,
      name: args.name,
      email: args.email,
      password: args.password,
      avatar: args.avatar,
      status: args.status,
      lastSeen: Date.now(),
      deviceType: args.deviceType,
    });

    await ctx.db.insert("auditLogs", {
      action: "User Access Granted",
      actor: "Admin",
      details: `Created member account @${args.pubkey} (${args.name})`,
      category: "user",
      timestamp: Date.now(),
      metadata: JSON.stringify({ pubkey: args.pubkey, name: args.name }),
    });

    return userId;
  },
});

export const remove = mutation({
  args: { userId: v.id("users"), actor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.delete(args.userId);
      await ctx.db.insert("auditLogs", {
        action: "User Revocation Executed",
        actor: args.actor || "Admin",
        details: `Revoked access and deleted member account @${user.pubkey} (${user.name})`,
        category: "user",
        timestamp: Date.now(),
        metadata: JSON.stringify({ pubkey: user.pubkey, name: user.name }),
      });
    }
    return args.userId;
  },
});



export const get = query({
  args: { pubkey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_pubkey", (q) => q.eq("pubkey", args.pubkey))
      .first();
    if (!user) return null;
    const { password: _password, ...safeUser } = user;
    return safeUser;
  },
});
