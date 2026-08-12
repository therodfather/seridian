/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("messages API", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  async function createChannel() {
    return t.mutation(api.channels.create, {
      name: "general",
      type: "public",
      createdBy: "user1",
      participants: ["user1"],
    });
  }

  test("send creates a message and updates lastMessageAt", async () => {
    const channelId = await createChannel();

    const messageId = await t.mutation(api.messages.send, {
      channelId,
      senderId: "user1",
      senderName: "Test User",
      content: "  Hello channel  ",
      type: "text",
    });

    expect(messageId).toBeDefined();

    const messages = await t.query(api.messages.listByChannel, { channelId });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      senderId: "user1",
      senderName: "Test User",
      content: "Hello channel",
      type: "text",
    });

    const channel = await t.query(api.channels.get, { channelId });
    expect(channel?.lastMessageAt).toBeDefined();
  });

  test("send rejects empty or whitespace-only content", async () => {
    const channelId = await createChannel();

    await expect(
      t.mutation(api.messages.send, {
        channelId,
        senderId: "user1",
        senderName: "Test User",
        content: "   ",
        type: "text",
      }),
    ).rejects.toThrow("Message content cannot be empty");
  });

  test("send rejects missing sender identity", async () => {
    const channelId = await createChannel();

    await expect(
      t.mutation(api.messages.send, {
        channelId,
        senderId: "  ",
        senderName: "Test User",
        content: "Hello",
        type: "text",
      }),
    ).rejects.toThrow("Authenticated sender is required");
  });

  test("channels.create rejects empty name and anonymous creator", async () => {
    await expect(
      t.mutation(api.channels.create, {
        name: "  ",
        type: "public",
        createdBy: "user1",
        participants: ["user1"],
      }),
    ).rejects.toThrow("Channel name cannot be empty");

    await expect(
      t.mutation(api.channels.create, {
        name: "ops",
        type: "public",
        createdBy: "  ",
        participants: [],
      }),
    ).rejects.toThrow("Authenticated creator is required");
  });

  test("channels.create adds creator to participants", async () => {
    const channelId = await t.mutation(api.channels.create, {
      name: "private-ops",
      type: "private",
      createdBy: "user1",
      participants: ["user2"],
    });

    const channel = await t.query(api.channels.get, { channelId });
    expect(channel?.participants).toEqual(expect.arrayContaining(["user1", "user2"]));
  });
});
