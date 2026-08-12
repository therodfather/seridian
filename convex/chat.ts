import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const listChannels = query({
  args: { pubkey: v.string() },
  handler: async (ctx, args) => {
    const owned = await ctx.db
      .query("channels")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.pubkey))
      .take(500);
    const all = await ctx.db.query("channels").take(500);
    const joined = all.filter((c) =>
      c.participants.includes(args.pubkey) && c.createdBy !== args.pubkey
    );
    const merged = [...owned, ...joined];
    return merged.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId);
  },
});

export const listMessages = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channelId_and_createdAt", (q) => q.eq("channelId", args.channelId))
      .order("asc")
      .take(500);
    return messages;
  },
});

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(500);
    return Promise.all(
      users.map(async ({ password: _password, ...rest }) => {
        if (rest.avatar && !rest.avatar.startsWith("http") && !rest.avatar.startsWith("blob:")) {
          const url = await ctx.storage.getUrl(rest.avatar as Id<"_storage">);
          return { ...rest, avatar: url ?? rest.avatar };
        }
        return rest;
      }),
    );
  },
});

export const getUser = query({
  args: { pubkey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_pubkey", (q) => q.eq("pubkey", args.pubkey))
      .unique();
    if (!user) return null;
    const { password: _password, ...safeUser } = user;
    return safeUser;
  },
});

export const createChannel = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("public"), v.literal("private"), v.literal("direct")),
    createdBy: v.string(),
    participants: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new Error("Channel name cannot be empty");
    }
    const createdBy = args.createdBy.trim();
    if (!createdBy) {
      throw new Error("Authenticated creator is required");
    }
    const allParticipants = args.participants.includes(createdBy)
      ? args.participants
      : [...args.participants, createdBy];
    const uniqueParticipants = [
      ...new Set(allParticipants.map((p) => p.trim()).filter(Boolean)),
    ];
    return await ctx.db.insert("channels", {
      name,
      description: args.description?.trim() || undefined,
      type: args.type,
      createdBy,
      participants: uniqueParticipants,
      createdAt: Date.now(),
    });
  },
});

export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    senderId: v.string(),
    senderName: v.string(),
    content: v.string(),
    type: v.union(v.literal("text"), v.literal("system"), v.literal("command")),
    replyTo: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    if (!content) {
      throw new Error("Message content cannot be empty");
    }
    const senderId = args.senderId.trim();
    const senderName = args.senderName.trim();
    if (!senderId || !senderName) {
      throw new Error("Authenticated sender is required");
    }
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      senderId,
      senderName,
      content,
      type: args.type,
      replyTo: args.replyTo,
      createdAt: now,
    });
    await ctx.db.patch(args.channelId, { lastMessageAt: now });
    return messageId;
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.senderId) throw new Error("Not authorized");
    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });
    return args.messageId;
  },
});

export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.senderId) throw new Error("Not authorized");
    await ctx.db.patch(args.messageId, { deletedAt: Date.now() });
    return args.messageId;
  },
});

export const joinChannel = mutation({
  args: {
    channelId: v.id("channels"),
    pubkey: v.string(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");
    if (channel.participants.includes(args.pubkey)) return args.channelId;
    await ctx.db.patch(args.channelId, {
      participants: [...channel.participants, args.pubkey],
    });
    return args.channelId;
  },
});

export const leaveChannel = mutation({
  args: {
    channelId: v.id("channels"),
    pubkey: v.string(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");
    await ctx.db.patch(args.channelId, {
      participants: channel.participants.filter((p) => p !== args.pubkey),
    });
    return args.channelId;
  },
});

export const updateUserStatus = mutation({
  args: {
    pubkey: v.string(),
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("away")),
    name: v.string(),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    avatar: v.optional(v.string()),
    deviceType: v.optional(
      v.union(v.literal("web"), v.literal("android"), v.literal("ios")),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_pubkey", (q) => q.eq("pubkey", args.pubkey))
      .unique();
    const now = Date.now();
    if (existing) {
      // Password update validation: only allow if user has no password (first time) or has existing password
      const passwordUpdate = (() => {
        if (args.password === undefined) return undefined;
        // Allow setting password for first time
        if (!existing.password) return args.password;
        // Allow updating if user already has password
        return args.password;
      })();

      await ctx.db.patch(existing._id, {
        status: args.status,
        lastSeen: now,
        name: args.name,
        ...(args.email !== undefined && { email: args.email }),
        ...(passwordUpdate !== undefined && { password: passwordUpdate }),
        ...(args.avatar !== undefined && { avatar: args.avatar }),
        ...(args.deviceType !== undefined && { deviceType: args.deviceType }),
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      pubkey: args.pubkey,
      name: args.name,
      email: args.email,
      password: args.password,
      avatar: args.avatar,
      status: args.status,
      lastSeen: now,
      deviceType: args.deviceType,
    });
  },
});

export const login = mutation({
  args: {
    pubkey: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_pubkey", (q) => q.eq("pubkey", args.pubkey))
      .unique();

    if (!user) {
      return { ok: false as const, error: "User not found" };
    }

    // Password validation logic
    if (user.password && user.password !== args.password) {
      return { ok: false as const, error: "Invalid password" };
    }
    if (user.password && !args.password) {
      return { ok: false as const, error: "Password required" };
    }
    // If user has no password set but one was provided — still allow

    await ctx.db.patch(user._id, {
      status: "online",
      lastSeen: Date.now(),
    });

    return {
      ok: true as const,
      user: {
        pubkey: user.pubkey,
        name: user.name,
        email: user.email,
      },
    };
  },
});
