package com.seridian.chat.client

import com.seridian.chat.protocol.ChatChannel
import com.seridian.chat.protocol.ChatMessage
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

data class ChatUiState(
    val connectionState: ConnectionState = ConnectionState.DISCONNECTED,
    val channels: List<ChatChannel> = emptyList(),
    val messages: List<ChatMessage> = emptyList(),
    val currentChannel: ChatChannel? = null,
    val currentUser: User? = null,
    val error: String? = null
)

class ConvexClient {
    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private val httpClient = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
            })
        }
    }

    private var deploymentUrl: String = ""
    private var pubkey: String = ""
    private var displayName: String = ""

    suspend fun connect(deploymentUrl: String, pubkey: String, name: String) {
        this.deploymentUrl = deploymentUrl.trimEnd('/')
        this.pubkey = pubkey
        this.displayName = name

        _uiState.update { it.copy(connectionState = ConnectionState.CONNECTING, error = null) }

        try {
            _uiState.update {
                it.copy(
                    connectionState = ConnectionState.CONNECTED,
                    currentUser = User(pubkey = pubkey, displayName = name)
                )
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    connectionState = ConnectionState.ERROR,
                    error = "Connection failed: ${e.message}"
                )
            }
        }
    }

    fun disconnect() {
        _uiState.update { it.copy(connectionState = ConnectionState.DISCONNECTED) }
    }

    suspend fun loadChannels() {
        try {
            // Stub: return empty for now
            _uiState.update { it.copy(channels = emptyList()) }
        } catch (e: Exception) {
            _uiState.update { it.copy(error = "Failed to load channels: ${e.message}") }
        }
    }

    fun selectChannel(channelId: String) {
        val channel = _uiState.value.channels.find { it.id == channelId }
        _uiState.update { it.copy(currentChannel = channel, messages = emptyList()) }
    }

    suspend fun sendMessage(content: String) {
        val channel = _uiState.value.currentChannel ?: return
        val user = _uiState.value.currentUser ?: return

        val message = ChatMessage(
            id = "msg_${System.currentTimeMillis()}",
            channelId = channel.id,
            senderId = user.pubkey,
            senderName = user.displayName,
            content = content,
            createdAt = System.currentTimeMillis()
        )

        _uiState.update { it.copy(messages = it.messages + message) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
