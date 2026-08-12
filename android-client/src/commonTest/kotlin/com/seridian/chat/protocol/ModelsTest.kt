package com.seridian.chat.protocol

import com.seridian.chat.createTestChannel
import com.seridian.chat.createTestMessage
import com.seridian.chat.createTestUser
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ModelsTest {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
        coerceInputValues = true
    }

    @Test
    fun chatMessageSerializesToValidJson() {
        val message = createTestMessage()
        val encoded = json.encodeToString(ChatMessage.serializer(), message)

        assertTrue(encoded.contains("\"_id\":\"msg_001\""))
        assertTrue(encoded.contains("\"channelId\":\"channel_001\""))
        assertTrue(encoded.contains("\"senderId\":\"0x1234567890abcdef\""))
        assertTrue(encoded.contains("\"senderName\":\"Alice\""))
        assertTrue(encoded.contains("\"content\":\"Hello, world!\""))
        assertTrue(encoded.contains("\"type\":\"text\""))
        assertTrue(encoded.contains("\"createdAt\":1000"))
    }

    @Test
    fun chatMessageDeserializesFromJson() {
        val json = """
            {
                "_id": "msg_002",
                "channelId": "ch_002",
                "senderId": "0xabcdef",
                "senderName": "Bob",
                "content": "Test message",
                "type": "text",
                "createdAt": 2000
            }
        """.trimIndent()

        val message = json.trimIndent().let { this.json.decodeFromString<ChatMessage>(it) }

        assertEquals("msg_002", message._id)
        assertEquals("ch_002", message.channelId)
        assertEquals("0xabcdef", message.senderId)
        assertEquals("Bob", message.senderName)
        assertEquals("Test message", message.content)
        assertEquals("text", message.type)
        assertEquals(2000L, message.createdAt)
    }

    @Test
    fun chatMessageHandlesOptionalFields() {
        val json = """
            {
                "_id": "msg_003",
                "channelId": "ch_003",
                "senderId": "0x1111",
                "senderName": "Charlie",
                "content": "Reply message",
                "type": "text",
                "replyTo": "msg_001",
                "editedAt": 3000,
                "deletedAt": null,
                "createdAt": 2500
            }
        """.trimIndent()

        val message = this.json.decodeFromString<ChatMessage>(json)

        assertEquals("msg_001", message.replyTo)
        assertEquals(3000L, message.editedAt)
        assertNull(message.deletedAt)
    }

    @Test
    fun chatMessageDefaultValuesAreCorrect() {
        val message = ChatMessage()

        assertEquals("", message._id)
        assertEquals("", message.channelId)
        assertEquals("", message.senderId)
        assertEquals("", message.senderName)
        assertEquals("", message.content)
        assertEquals("text", message.type)
        assertNull(message.replyTo)
        assertNull(message.editedAt)
        assertNull(message.deletedAt)
        assertEquals(0L, message.createdAt)
    }

    @Test
    fun chatMessageRoundTripPreservesData() {
        val original = createTestMessage(
            replyTo = "msg_parent",
            editedAt = 5000L,
            deletedAt = null
        )

        val encoded = json.encodeToString(ChatMessage.serializer(), original)
        val decoded = json.decodeFromString<ChatMessage>(encoded)

        assertEquals(original, decoded)
    }

    @Test
    fun chatMessageIgnoresUnknownKeys() {
        val json = """
            {
                "_id": "msg_004",
                "channelId": "ch_004",
                "senderId": "0x2222",
                "senderName": "Dave",
                "content": "With extra",
                "type": "text",
                "createdAt": 4000,
                "unknownField": "should be ignored"
            }
        """.trimIndent()

        val message = this.json.decodeFromString<ChatMessage>(json)

        assertEquals("msg_004", message._id)
        assertEquals("With extra", message.content)
    }

    @Test
    fun chatChannelSerializesToValidJson() {
        val channel = createTestChannel()
        val encoded = json.encodeToString(ChatChannel.serializer(), channel)

        assertTrue(encoded.contains("\"_id\":\"channel_001\""))
        assertTrue(encoded.contains("\"name\":\"general\""))
        assertTrue(encoded.contains("\"type\":\"public\""))
        assertTrue(encoded.contains("\"createdBy\":\"0x1234567890abcdef\""))
    }

    @Test
    fun chatChannelDeserializesFromJson() {
        val json = """
            {
                "_id": "ch_002",
                "name": "random",
                "description": "Random chat",
                "type": "public",
                "createdBy": "0xaaaa",
                "participants": ["0xaaaa", "0xbbbb"],
                "lastMessageAt": 5000,
                "createdAt": 4000
            }
        """.trimIndent()

        val channel = this.json.decodeFromString<ChatChannel>(json)

        assertEquals("ch_002", channel._id)
        assertEquals("random", channel.name)
        assertEquals("Random chat", channel.description)
        assertEquals("public", channel.type)
        assertEquals("0xaaaa", channel.createdBy)
        assertEquals(listOf("0xaaaa", "0xbbbb"), channel.participants)
        assertEquals(5000L, channel.lastMessageAt)
        assertEquals(4000L, channel.createdAt)
    }

    @Test
    fun chatChannelHandlesNullDescription() {
        val json = """
            {
                "_id": "ch_003",
                "name": "no-desc",
                "type": "private",
                "createdBy": "0xcccc",
                "createdAt": 6000
            }
        """.trimIndent()

        val channel = this.json.decodeFromString<ChatChannel>(json)

        assertNull(channel.description)
        assertNull(channel.lastMessageAt)
        assertTrue(channel.participants.isEmpty())
    }

    @Test
    fun chatChannelDefaultValuesAreCorrect() {
        val channel = ChatChannel()

        assertEquals("", channel._id)
        assertEquals("", channel.name)
        assertNull(channel.description)
        assertEquals("public", channel.type)
        assertEquals("", channel.createdBy)
        assertTrue(channel.participants.isEmpty())
        assertNull(channel.lastMessageAt)
        assertEquals(0L, channel.createdAt)
    }

    @Test
    fun chatChannelRoundTripPreservesData() {
        val original = createTestChannel(
            description = "Round trip test",
            participants = listOf("0x1", "0x2", "0x3")
        )

        val encoded = json.encodeToString(ChatChannel.serializer(), original)
        val decoded = json.decodeFromString<ChatChannel>(encoded)

        assertEquals(original, decoded)
    }

    @Test
    fun chatUserSerializesToValidJson() {
        val user = createTestUser()
        val encoded = json.encodeToString(ChatUser.serializer(), user)

        assertTrue(encoded.contains("\"_id\":\"user_001\""))
        assertTrue(encoded.contains("\"pubkey\":\"0x1234567890abcdef\""))
        assertTrue(encoded.contains("\"name\":\"Alice\""))
        assertTrue(encoded.contains("\"status\":\"online\""))
        assertTrue(encoded.contains("\"deviceType\":\"android\""))
    }

    @Test
    fun chatUserDeserializesFromJson() {
        val json = """
            {
                "_id": "user_002",
                "pubkey": "0x9999",
                "name": "Eve",
                "avatar": "https://example.com/avatar.png",
                "status": "online",
                "lastSeen": 7000,
                "deviceType": "ios"
            }
        """.trimIndent()

        val user = this.json.decodeFromString<ChatUser>(json)

        assertEquals("user_002", user._id)
        assertEquals("0x9999", user.pubkey)
        assertEquals("Eve", user.name)
        assertEquals("https://example.com/avatar.png", user.avatar)
        assertEquals("online", user.status)
        assertEquals(7000L, user.lastSeen)
        assertEquals("ios", user.deviceType)
    }

    @Test
    fun chatUserHandlesNullOptionalFields() {
        val json = """
            {
                "_id": "user_003",
                "pubkey": "0x5555",
                "name": "Frank",
                "status": "offline",
                "lastSeen": 8000
            }
        """.trimIndent()

        val user = this.json.decodeFromString<ChatUser>(json)

        assertNull(user.avatar)
        assertNull(user.deviceType)
    }

    @Test
    fun chatUserDefaultValuesAreCorrect() {
        val user = ChatUser()

        assertEquals("", user._id)
        assertEquals("", user.pubkey)
        assertEquals("", user.name)
        assertNull(user.avatar)
        assertEquals("offline", user.status)
        assertEquals(0L, user.lastSeen)
        assertNull(user.deviceType)
    }

    @Test
    fun chatUserRoundTripPreservesData() {
        val original = createTestUser(
            avatar = "https://example.com/img.png",
            deviceType = "desktop"
        )

        val encoded = json.encodeToString(ChatUser.serializer(), original)
        val decoded = json.decodeFromString<ChatUser>(encoded)

        assertEquals(original, decoded)
    }

    @Test
    fun chatMessageSerializationIncludesNullOptionalFields() {
        val message = createTestMessage()
        val encoded = json.encodeToString(ChatMessage.serializer(), message)

        assertTrue(encoded.contains("\"replyTo\":null"))
        assertTrue(encoded.contains("\"editedAt\":null"))
        assertTrue(encoded.contains("\"deletedAt\":null"))
    }

    @Test
    fun chatChannelSerializationIncludesEmptyParticipants() {
        val channel = createTestChannel(participants = emptyList())
        val encoded = json.encodeToString(ChatChannel.serializer(), channel)

        assertTrue(encoded.contains("\"participants\":[]"))
    }

    @Test
    fun chatUserSerializationIncludesNullAvatarAndDeviceType() {
        val user = createTestUser(avatar = null, deviceType = null)
        val encoded = json.encodeToString(ChatUser.serializer(), user)

        assertTrue(encoded.contains("\"avatar\":null"))
        assertTrue(encoded.contains("\"deviceType\":null"))
    }
}
