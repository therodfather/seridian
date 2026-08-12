package com.seridian.chat

import com.seridian.chat.protocol.ChatChannel
import com.seridian.chat.protocol.ChatMessage
import com.seridian.chat.protocol.ChatUser

object TestConfig {
    const val TEST_PUBKEY = "0x1234567890abcdef"
    const val TEST_USER_NAME = "Alice"
    const val TEST_CHANNEL_ID = "channel_001"
    const val TEST_CHANNEL_NAME = "general"
    const val TEST_MESSAGE_ID = "msg_001"
    const val TEST_MESSAGE_CONTENT = "Hello, world!"
    const val TEST_DEPLOYMENT_URL = "https://test.convex.cloud"
}

fun createTestUser(
    id: String = "user_001",
    pubkey: String = TestConfig.TEST_PUBKEY,
    name: String = TestConfig.TEST_USER_NAME,
    avatar: String? = null,
    status: String = "online",
    lastSeen: Long = 1000L,
    deviceType: String? = "android"
): ChatUser = ChatUser(
    _id = id,
    pubkey = pubkey,
    name = name,
    avatar = avatar,
    status = status,
    lastSeen = lastSeen,
    deviceType = deviceType
)

fun createTestChannel(
    id: String = TestConfig.TEST_CHANNEL_ID,
    name: String = TestConfig.TEST_CHANNEL_NAME,
    description: String? = "Test channel",
    type: String = "public",
    createdBy: String = TestConfig.TEST_PUBKEY,
    participants: List<String> = listOf(TestConfig.TEST_PUBKEY),
    lastMessageAt: Long? = 1000L,
    createdAt: Long = 900L
): ChatChannel = ChatChannel(
    _id = id,
    name = name,
    description = description,
    type = type,
    createdBy = createdBy,
    participants = participants,
    lastMessageAt = lastMessageAt,
    createdAt = createdAt
)

fun createTestMessage(
    id: String = TestConfig.TEST_MESSAGE_ID,
    channelId: String = TestConfig.TEST_CHANNEL_ID,
    senderId: String = TestConfig.TEST_PUBKEY,
    senderName: String = TestConfig.TEST_USER_NAME,
    content: String = TestConfig.TEST_MESSAGE_CONTENT,
    type: String = "text",
    replyTo: String? = null,
    editedAt: Long? = null,
    deletedAt: Long? = null,
    createdAt: Long = 1000L
): ChatMessage = ChatMessage(
    _id = id,
    channelId = channelId,
    senderId = senderId,
    senderName = senderName,
    content = content,
    type = type,
    replyTo = replyTo,
    editedAt = editedAt,
    deletedAt = deletedAt,
    createdAt = createdAt
)
