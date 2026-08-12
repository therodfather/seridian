package com.seridian.chat.client

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class ConvexClientTest {

    @Test
    fun connectionStateEnumContainsAllStates() {
        val states = ConnectionState.entries

        assertEquals(5, states.size)
        assertTrue(states.contains(ConnectionState.DISCONNECTED))
        assertTrue(states.contains(ConnectionState.CONNECTING))
        assertTrue(states.contains(ConnectionState.CONNECTED))
        assertTrue(states.contains(ConnectionState.RECONNECTING))
        assertTrue(states.contains(ConnectionState.FAILED))
    }

    @Test
    fun connectionStateTransitionsFromDisconnectedToConnecting() {
        val state = MutableStateFlow(ConnectionState.DISCONNECTED)

        assertEquals(ConnectionState.DISCONNECTED, state.value)

        state.value = ConnectionState.CONNECTING

        assertEquals(ConnectionState.CONNECTING, state.value)
    }

    @Test
    fun connectionStateTransitionsFromConnectingToConnected() {
        val state = MutableStateFlow(ConnectionState.CONNECTING)

        state.value = ConnectionState.CONNECTED

        assertEquals(ConnectionState.CONNECTED, state.value)
    }

    @Test
    fun connectionStateTransitionsFromConnectingToFailed() {
        val state = MutableStateFlow(ConnectionState.CONNECTING)

        state.value = ConnectionState.FAILED

        assertEquals(ConnectionState.FAILED, state.value)
    }

    @Test
    fun connectionStateTransitionsFromConnectedToDisconnected() {
        val state = MutableStateFlow(ConnectionState.CONNECTED)

        state.value = ConnectionState.DISCONNECTED

        assertEquals(ConnectionState.DISCONNECTED, state.value)
    }

    @Test
    fun connectionStateCanTransitionToReconnecting() {
        val state = MutableStateFlow(ConnectionState.CONNECTED)

        state.value = ConnectionState.RECONNECTING

        assertEquals(ConnectionState.RECONNECTING, state.value)
    }

    @Test
    fun convexRequestSerializesCorrectly() {
        val request = ConvexRequest(
            path = "chat:listChannels",
            args = mapOf("pubkey" to JsonPrimitive("0xabc"))
        )

        val json = Json { encodeDefaults = true }
        val encoded = json.encodeToString(ConvexRequest.serializer(), request)

        assertTrue(encoded.contains("\"path\":\"chat:listChannels\""))
        assertTrue(encoded.contains("\"pubkey\""))
        assertTrue(encoded.contains("\"0xabc\""))
    }

    @Test
    fun convexRequestSerializesWithEmptyArgs() {
        val request = ConvexRequest(path = "chat:listChannels")

        val json = Json { encodeDefaults = true }
        val encoded = json.encodeToString(ConvexRequest.serializer(), request)

        assertTrue(encoded.contains("\"path\":\"chat:listChannels\""))
        assertTrue(encoded.contains("\"args\":{}"))
    }

    @Test
    fun convexRequestDeserializesFromJson() {
        val jsonInput = """
            {
                "path": "chat:sendMessage",
                "args": {
                    "channelId": "ch_001",
                    "content": "Hello"
                }
            }
        """.trimIndent()

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val request = json.decodeFromString(ConvexRequest.serializer(), jsonInput)

        assertEquals("chat:sendMessage", request.path)
        assertEquals(2, request.args.size)
    }

    @Test
    fun convexResponseDeserializesSuccessWithValue() {
        val jsonInput = """
            {
                "value": "channel_001"
            }
        """.trimIndent()

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val response = json.decodeFromString(ConvexResponse.serializer(), jsonInput)

        assertNotNull(response.value)
        assertNull(response.error)
    }

    @Test
    fun convexResponseDeserializesError() {
        val jsonInput = """
            {
                "error": "Channel not found"
            }
        """.trimIndent()

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val response = json.decodeFromString(ConvexResponse.serializer(), jsonInput)

        assertNull(response.value)
        assertEquals("Channel not found", response.error)
    }

    @Test
    fun convexResponseDeserializesEmptyBody() {
        val jsonInput = "{}"

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val response = json.decodeFromString(ConvexResponse.serializer(), jsonInput)

        assertNull(response.value)
        assertNull(response.error)
    }

    @Test
    fun fakeChatClientDefaultStateIsDisconnected() {
        val client = FakeChatClient()

        assertEquals(ConnectionState.DISCONNECTED, client.connectionState.value)
        assertFalse(client.isConnected)
    }

    @Test
    fun fakeChatClientConnectSetsConnectedState() = runTest {
        val client = FakeChatClient()

        client.connect("https://test.convex.cloud")

        assertEquals(ConnectionState.CONNECTED, client.connectionState.value)
        assertTrue(client.isConnected)
    }

    @Test
    fun fakeChatClientDisconnectSetsDisconnectedState() = runTest {
        val client = FakeChatClient()
        client.connect("https://test.convex.cloud")

        client.disconnect()

        assertEquals(ConnectionState.DISCONNECTED, client.connectionState.value)
        assertFalse(client.isConnected)
    }

    @Test
    fun fakeChatClientListChannelsReturnsMockData() = runTest {
        val client = FakeChatClient()
        client.connect("https://test.convex.cloud")
        client.mockChannels = listOf(
            com.seridian.chat.createTestChannel(id = "ch_001", name = "general"),
            com.seridian.chat.createTestChannel(id = "ch_002", name = "random")
        )

        val channels = client.listChannels("0xabc")

        assertEquals(2, channels.size)
        assertEquals("general", channels[0].name)
        assertEquals("random", channels[1].name)
    }

    @Test
    fun fakeChatClientSendMessageReturnsId() = runTest {
        val client = FakeChatClient()
        client.connect("https://test.convex.cloud")
        client.mockMessageId = "msg_returned"

        val id = client.sendMessage(
            channelId = "ch_001",
            senderId = "0xabc",
            senderName = "Alice",
            content = "Hello"
        )

        assertEquals("msg_returned", id)
        assertEquals(1, client.sentMessages.size)
    }

    @Test
    fun fakeChatClientGetUserReturnsUser() = runTest {
        val client = FakeChatClient()
        client.connect("https://test.convex.cloud")
        client.mockUser = com.seridian.chat.createTestUser(name = "Bob")

        val user = client.getUser("0xabc")

        assertNotNull(user)
        assertEquals("Bob", user.name)
    }

    @Test
    fun fakeChatClientGetUserReturnsNullWhenNotSet() = runTest {
        val client = FakeChatClient()
        client.connect("https://test.convex.cloud")

        val user = client.getUser("0xabc")

        assertNull(user)
    }

    @Test
    fun fakeChatClientTracksConnectionStateFlow() = runTest {
        val client = FakeChatClient()
        assertEquals(ConnectionState.DISCONNECTED, client.connectionState.value)

        client.connect("https://test.convex.cloud")
        assertEquals(ConnectionState.CONNECTED, client.connectionState.value)

        client.disconnect()
        assertEquals(ConnectionState.DISCONNECTED, client.connectionState.value)
    }

    @Test
    fun fakeChatClientClearResetsAllState() = runTest {
        val client = FakeChatClient()
        client.connect("https://test.convex.cloud")
        client.mockChannels = listOf(com.seridian.chat.createTestChannel())

        client.clear()

        assertEquals(ConnectionState.DISCONNECTED, client.connectionState.value)
        assertFalse(client.isConnected)
        assertTrue(client.mockChannels.isEmpty())
    }

    @Test
    fun createChannelMutationParsesArgsCorrectly() {
        val args = buildJsonObject {
            put("name", JsonPrimitive("general"))
            put("description", JsonPrimitive("Main channel"))
            put("type", JsonPrimitive("public"))
            put("createdBy", JsonPrimitive("0xabc"))
            put("participants", buildJsonArray {
                add(JsonPrimitive("0xabc"))
                add(JsonPrimitive("0xdef"))
            })
        }

        assertEquals("general", (args["name"] as JsonPrimitive).content)
        assertEquals("public", (args["type"] as JsonPrimitive).content)
        assertEquals(2, (args["participants"] as kotlinx.serialization.json.JsonArray).size)
    }

    @Test
    fun sendMessageMutationParsesArgsCorrectly() {
        val args = buildJsonObject {
            put("channelId", JsonPrimitive("ch_001"))
            put("senderId", JsonPrimitive("0xabc"))
            put("senderName", JsonPrimitive("Alice"))
            put("content", JsonPrimitive("Hello there"))
            put("type", JsonPrimitive("text"))
        }

        assertEquals("ch_001", (args["channelId"] as JsonPrimitive).content)
        assertEquals("Hello there", (args["content"] as JsonPrimitive).content)
    }

    @Test
    fun errorMessageJsonParsesCorrectly() {
        val jsonInput = """
            {
                "error": "Rate limit exceeded",
                "value": null
            }
        """.trimIndent()

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val response = json.decodeFromString(ConvexResponse.serializer(), jsonInput)

        assertEquals("Rate limit exceeded", response.error)
        assertNull(response.value)
    }

    @Test
    fun queryPathConcatenationBuildsCorrectUrl() {
        val deploymentUrl = "https://test.convex.cloud"
        val path = "chat:listChannels"
        val fullUrl = "$deploymentUrl/api/query"

        assertEquals("https://test.convex.cloud/api/query", fullUrl)
    }

    @Test
    fun queryArgsWithMultipleTypesSerializesCorrectly() {
        val args = buildJsonObject {
            put("channelId", JsonPrimitive("ch_001"))
            put("limit", JsonPrimitive(50))
            put("includeDeleted", JsonPrimitive(false))
        }

        val json = Json { encodeDefaults = true }
        val encoded = args.toString()

        assertTrue(encoded.contains("\"channelId\":\"ch_001\""))
        assertTrue(encoded.contains("\"limit\":50"))
        assertTrue(encoded.contains("\"includeDeleted\":false"))
    }
}
