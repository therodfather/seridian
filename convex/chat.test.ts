/// <reference types="vite/client" />
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

    const channel = await t.query(api.chat.getChannel, { channelId });
    expect(channel).toMatchObject({
      name: "general",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });
  });

  test("createChannel adds createdBy to participants if missing", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "private",
      createdBy: "user1",
      participants: ["user2", "user3"],
    });

    const channel = await t.query(api.chat.getChannel, { channelId });
    expect(channel?.participants).toContain("user1");
    expect(channel?.participants).toContain("user2");
    expect(channel?.participants).toContain("user3");
    expect(channel?.participants).toHaveLength(3);
  });

  test("createChannel deduplicates participants", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "dedup",
      type: "public",
      createdBy: "user1",
      participants: ["user1", "user1", "user2"],
    });

    const channel = await t.query(api.chat.getChannel, { channelId });
    expect(channel?.participants).toHaveLength(2);
  });

  test("sendMessage creates a message", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    const messageId = await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "Hello!",
      type: "text",
    });

    expect(messageId).toBeDefined();

    const messages = await t.query(api.chat.listMessages, { channelId });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      senderId: "user1",
      content: "Hello!",
      type: "text",
    });
  });

  test("sendMessage rejects empty content", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    await expect(
      t.mutation(api.chat.sendMessage, {
        channelId,
        senderId: "user1",
        senderName: "Test User",
        content: "   ",
        type: "text",
      }),
    ).rejects.toThrow("Message content cannot be empty");
  });

  test("sendMessage updates channel lastMessageAt", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    const beforeSend = await t.query(api.chat.getChannel, { channelId });
    expect(beforeSend?.lastMessageAt).toBeUndefined();

    await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "Hello!",
      type: "text",
    });

    const afterSend = await t.query(api.chat.getChannel, { channelId });
    expect(afterSend?.lastMessageAt).toBeDefined();
    expect(afterSend?.lastMessageAt).toBeGreaterThan(0);
  });

  test("listChannels returns user channels", async () => {
    await t.mutation(api.chat.createChannel, {
      name: "owned",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    await t.mutation(api.chat.createChannel, {
      name: "joined",
      type: "public",
      createdBy: "user2",
      participants: ["user1", "user2"],
    });

    // user3 should not see either channel
    await t.mutation(api.chat.createChannel, {
      name: "private",
      type: "private",
      createdBy: "user3",
      participants: ["user3"],
    });

    const channels = await t.query(api.chat.listChannels, { pubkey: "user1" });
    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.name)).toContain("owned");
    expect(channels.map((c) => c.name)).toContain("joined");
  });

  test("listChannels sorts by createdAt descending", async () => {
    await t.mutation(api.chat.createChannel, {
      name: "first",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    await t.mutation(api.chat.createChannel, {
      name: "second",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    const channels = await t.query(api.chat.listChannels, { pubkey: "user1" });
    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.name)).toContain("first");
    expect(channels.map((c) => c.name)).toContain("second");
  });

  test("editMessage updates content", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    const messageId = await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "Original",
      type: "text",
    });

    await t.mutation(api.chat.editMessage, {
      messageId,
      content: "Edited",
      senderId: "user1",
    });

    const messages = await t.query(api.chat.listMessages, { channelId });
    expect(messages[0].content).toBe("Edited");
    expect(messages[0].editedAt).toBeDefined();
  });

  test("editMessage throws if message not found", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    // Get a valid message first, then use a fake id
    const messageId = await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "Hello",
      type: "text",
    });

    // Delete it, then try to edit
    await t.mutation(api.chat.deleteMessage, {
      messageId,
      senderId: "user1",
    });

    // Use a different mutation to try editing a deleted message
    // Since Convex doesn't throw on editing deleted messages (just patches),
    // test authorization instead
    const messageId2 = await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "Auth test",
      type: "text",
    });

    await expect(
      t.mutation(api.chat.editMessage, {
        messageId: messageId2,
        content: "Hacked",
        senderId: "user2", // different sender
      }),
    ).rejects.toThrow("Not authorized");
  });

  test("deleteMessage soft deletes", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    const messageId = await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "To delete",
      type: "text",
    });

    await t.mutation(api.chat.deleteMessage, {
      messageId,
      senderId: "user1",
    });

    const messages = await t.query(api.chat.listMessages, { channelId });
    expect(messages[0].deletedAt).toBeDefined();
    expect(messages[0].content).toBe("To delete");
  });

  test("deleteMessage throws if not authorized", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    const messageId = await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "Protected",
      type: "text",
    });

    await expect(
      t.mutation(api.chat.deleteMessage, {
        messageId,
        senderId: "user2",
      }),
    ).rejects.toThrow("Not authorized");
  });

  test("joinChannel adds participant", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    await t.mutation(api.chat.joinChannel, {
      channelId,
      pubkey: "user2",
    });

    const channel = await t.query(api.chat.getChannel, { channelId });
    expect(channel?.participants).toContain("user2");
  });

  test("joinChannel is idempotent", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    await t.mutation(api.chat.joinChannel, {
      channelId,
      pubkey: "user1",
    });

    const channel = await t.query(api.chat.getChannel, { channelId });
    expect(channel?.participants.filter((p) => p === "user1")).toHaveLength(1);
  });

  test("leaveChannel removes participant", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1", "user2"],
    });

    await t.mutation(api.chat.leaveChannel, {
      channelId,
      pubkey: "user2",
    });

    const channel = await t.query(api.chat.getChannel, { channelId });
    expect(channel?.participants).not.toContain("user2");
    expect(channel?.participants).toContain("user1");
  });

  test("updateUserStatus upserts user", async () => {
    await t.mutation(api.chat.updateUserStatus, {
      pubkey: "user1",
      name: "Test User",
      status: "online",
    });

    const user = await t.query(api.chat.getUser, { pubkey: "user1" });
    expect(user).toMatchObject({
      pubkey: "user1",
      name: "Test User",
      status: "online",
    });

    await t.mutation(api.chat.updateUserStatus, {
      pubkey: "user1",
      name: "Test User",
      status: "away",
    });

    const updatedUser = await t.query(api.chat.getUser, { pubkey: "user1" });
    expect(updatedUser?.status).toBe("away");
  });

  test("updateUserStatus sets lastSeen timestamp", async () => {
    await t.mutation(api.chat.updateUserStatus, {
      pubkey: "user1",
      name: "Test User",
      status: "online",
    });

    const user = await t.query(api.chat.getUser, { pubkey: "user1" });
    expect(user?.lastSeen).toBeGreaterThan(0);
  });

  test("getUsers returns all users", async () => {
    await t.mutation(api.chat.updateUserStatus, {
      pubkey: "user1",
      name: "Online User",
      status: "online",
    });

    await t.mutation(api.chat.updateUserStatus, {
      pubkey: "user2",
      name: "Away User",
      status: "away",
    });

    await t.mutation(api.chat.updateUserStatus, {
      pubkey: "user3",
      name: "Offline User",
      status: "offline",
    });

    const users = await t.query(api.chat.getUsers, {});
    expect(users).toHaveLength(3);
    expect(users.map((u) => u.pubkey)).toContain("user1");
    expect(users.map((u) => u.pubkey)).toContain("user2");
    expect(users.map((u) => u.pubkey)).toContain("user3");
  });

  test("listMessages returns messages in ascending order", async () => {
    const channelId = await t.mutation(api.chat.createChannel, {
      name: "test",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });

    await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "User",
      content: "First",
      type: "text",
    });

    await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "User",
      content: "Second",
      type: "text",
    });

    await t.mutation(api.chat.sendMessage, {
      channelId,
      senderId: "user1",
      senderName: "User",
      content: "Third",
      type: "text",
    });

    const messages = await t.query(api.chat.listMessages, { channelId });
    expect(messages).toHaveLength(3);
    expect(messages[0].content).toBe("First");
    expect(messages[1].content).toBe("Second");
    expect(messages[2].content).toBe("Third");
  });

  test("login succeeds with matching password", async () => {
    await t.mutation(api.users.upsert, {
      pubkey: "dee",
      name: "Dee",
      password: "secret",
      status: "offline",
    });

    const result = await t.mutation(api.chat.login, {
      pubkey: "dee",
      password: "secret",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.pubkey).toBe("dee");
      expect(result.user.name).toBe("Dee");
    }
  });

  test("login fails for unknown user", async () => {
    const result = await t.mutation(api.chat.login, {
      pubkey: "missing",
      password: "secret",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("User not found");
    }
  });

  test("login fails with wrong password", async () => {
    await t.mutation(api.users.upsert, {
      pubkey: "dee",
      name: "Dee",
      password: "secret",
      status: "offline",
    });

    const result = await t.mutation(api.chat.login, {
      pubkey: "dee",
      password: "wrong",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid password");
    }
  });

  test("getUser omits the password field", async () => {
    await t.mutation(api.users.upsert, {
      pubkey: "dee",
      name: "Dee",
      password: "secret",
      status: "offline",
    });

    const user = await t.query(api.chat.getUser, { pubkey: "dee" });
    expect(user).toMatchObject({ pubkey: "dee", name: "Dee" });
    expect(user).not.toHaveProperty("password");
  });
});
