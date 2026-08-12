package com.seridian.chat.client

import com.seridian.chat.protocol.ChatChannel
import com.seridian.chat.protocol.ChatMessage
import com.seridian.chat.protocol.ChatUser
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject

@Serializable
data class ConvexRequest(
    val path: String,
    val args: Map<String, JsonElement> = emptyMap()
)

@Serializable
data class ConvexResponse(
    val value: JsonElement? = null,
    val error: String? = null
)

class ConvexClient(
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default + Job()),
    private val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
        coerceInputValues = true
    }
) : ChatClient {

    private val httpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(json)
        }
    }

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    override val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private var deploymentUrl: String = ""
    private var pollingJob: Job? = null
    private var lastMessageTimestamp: Long = 0L

    override val isConnected: Boolean
        get() = _connectionState.value == ConnectionState.CONNECTED

    override suspend fun connect(deploymentUrl: String) {
        this.deploymentUrl = deploymentUrl.trimEnd('/')
        _connectionState.value = ConnectionState.CONNECTING

        try {
            val testResult = httpClient.post("$deploymentUrl/api/query") {
                contentType(ContentType.Application.Json)
                setBody(ConvexRequest(
                    path = "chat:listChannels",
                    args = mapOf("pubkey" to JsonPrimitive("__test__"))
                ))
            }
            if (testResult.status.value == 200) {
                _connectionState.value = ConnectionState.CONNECTED
                startPolling()
            } else {
                _connectionState.value = ConnectionState.FAILED
            }
        } catch (e: Exception) {
            _connectionState.value = ConnectionState.FAILED
        }
    }

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = scope.launch {
            while (isActive && _connectionState.value == ConnectionState.CONNECTED) {
                delay(3000)
            }
        }
    }

    override suspend fun disconnect() {
        pollingJob?.cancel()
        pollingJob = null
        _connectionState.value = ConnectionState.DISCONNECTED
        httpClient.close()
    }

    private suspend fun query(path: String, args: Map<String, JsonElement> = emptyMap()): JsonElement? {
        return withContext(Dispatchers.IO) {
            try {
                val response = httpClient.post("$deploymentUrl/api/query") {
                    contentType(ContentType.Application.Json)
                    setBody(ConvexRequest(path = path, args = args))
                }
                val result = response.body<ConvexResponse>()
                result.value
            } catch (e: Exception) {
                null
            }
        }
    }

    private suspend fun mutation(path: String, args: Map<String, JsonElement> = emptyMap()): JsonElement? {
        return withContext(Dispatchers.IO) {
            try {
                val response = httpClient.post("$deploymentUrl/api/mutation") {
                    contentType(ContentType.Application.Json)
                    setBody(ConvexRequest(path = path, args = args))
                }
                val result = response.body<ConvexResponse>()
                result.value
            } catch (e: Exception) {
                null
            }
        }
    }

    override suspend fun listChannels(pubkey: String): List<ChatChannel> {
        val result = query(
            "chat:listChannels",
            mapOf("pubkey" to JsonPrimitive(pubkey))
        ) ?: return emptyList()

        return try {
            val items = json.decodeFromString<List<ChatChannel>>(result.toString())
            items
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getChannel(channelId: String): ChatChannel? {
        val result = query(
            "chat:getChannel",
            mapOf("channelId" to JsonPrimitive(channelId))
        ) ?: return null

        return try {
            json.decodeFromString<ChatChannel>(result.toString())
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun createChannel(
        name: String,
        description: String?,
        type: String,
        createdBy: String,
        participants: List<String>
    ): String {
        val args = mutableMapOf<String, JsonElement>(
            "name" to JsonPrimitive(name),
            "type" to JsonPrimitive(type),
            "createdBy" to JsonPrimitive(createdBy),
            "participants" to buildJsonArray {
                participants.forEach { add(JsonPrimitive(it)) }
            }
        )
        if (description != null) {
            args["description"] = JsonPrimitive(description)
        }

        val result = mutation("chat:createChannel", args)
        return result?.toString()?.trim('"') ?: ""
    }

    override suspend fun listMessages(channelId: String, limit: Int): List<ChatMessage> {
        val result = query(
            "chat:listMessages",
            mapOf(
                "channelId" to JsonPrimitive(channelId),
                "limit" to JsonPrimitive(limit)
            )
        ) ?: return emptyList()

        return try {
            json.decodeFromString<List<ChatMessage>>(result.toString())
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun sendMessage(
        channelId: String,
        senderId: String,
        senderName: String,
        content: String,
        type: String
    ): String {
        val result = mutation(
            "chat:sendMessage",
            mapOf(
                "channelId" to JsonPrimitive(channelId),
                "senderId" to JsonPrimitive(senderId),
                "senderName" to JsonPrimitive(senderName),
                "content" to JsonPrimitive(content),
                "type" to JsonPrimitive(type)
            )
        )
        return result?.toString()?.trim('"') ?: ""
    }

    override suspend fun editMessage(messageId: String, content: String, senderId: String) {
        mutation(
            "chat:editMessage",
            mapOf(
                "messageId" to JsonPrimitive(messageId),
                "content" to JsonPrimitive(content),
                "senderId" to JsonPrimitive(senderId)
            )
        )
    }

    override suspend fun deleteMessage(messageId: String, senderId: String) {
        mutation(
            "chat:deleteMessage",
            mapOf(
                "messageId" to JsonPrimitive(messageId),
                "senderId" to JsonPrimitive(senderId)
            )
        )
    }

    override suspend fun joinChannel(channelId: String, pubkey: String) {
        mutation(
            "chat:joinChannel",
            mapOf(
                "channelId" to JsonPrimitive(channelId),
                "pubkey" to JsonPrimitive(pubkey)
            )
        )
    }

    override suspend fun leaveChannel(channelId: String, pubkey: String) {
        mutation(
            "chat:leaveChannel",
            mapOf(
                "channelId" to JsonPrimitive(channelId),
                "pubkey" to JsonPrimitive(pubkey)
            )
        )
    }

    override suspend fun getUser(pubkey: String): ChatUser? {
        val result = query(
            "chat:getUser",
            mapOf("pubkey" to JsonPrimitive(pubkey))
        ) ?: return null

        return try {
            json.decodeFromString<ChatUser>(result.toString())
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun upsertUser(
        pubkey: String,
        name: String,
        status: String,
        avatar: String?,
        deviceType: String?
    ) {
        val args = mutableMapOf<String, JsonElement>(
            "pubkey" to JsonPrimitive(pubkey),
            "name" to JsonPrimitive(name),
            "status" to JsonPrimitive(status)
        )
        if (avatar != null) args["avatar"] = JsonPrimitive(avatar)
        if (deviceType != null) args["deviceType"] = JsonPrimitive(deviceType)

        mutation("chat:updateUserStatus", args)
    }
}
