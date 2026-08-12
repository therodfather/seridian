package com.seridian.chat.viewmodel

import com.seridian.chat.client.ChatClient
import com.seridian.chat.client.ConnectionState
import com.seridian.chat.protocol.ChatChannel
import com.seridian.chat.protocol.ChatMessage
import com.seridian.chat.protocol.ChatUser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ChatUiState(
    val connectionState: ConnectionState = ConnectionState.DISCONNECTED,
    val channels: List<ChatChannel> = emptyList(),
    val messages: List<ChatMessage> = emptyList(),
    val onlineUsers: List<ChatUser> = emptyList(),
    val currentChannel: ChatChannel? = null,
    val currentUser: ChatUser? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

class ChatViewModel(
    private val client: ChatClient,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Main)
) {
    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    init {
        scope.launch {
            client.connectionState.collect { state ->
                _uiState.value = _uiState.value.copy(connectionState = state)
            }
        }
    }

    suspend fun connect(deploymentUrl: String, pubkey: String, name: String) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)

        client.connect(deploymentUrl)
        client.upsertUser(pubkey = pubkey, name = name, status = "online", deviceType = "android")

        val user = client.getUser(pubkey)
        _uiState.value = _uiState.value.copy(
            currentUser = user,
            isLoading = false
        )

        loadChannels(pubkey)
    }

    suspend fun loadChannels(pubkey: String) {
        val channels = client.listChannels(pubkey)
        _uiState.value = _uiState.value.copy(channels = channels)
    }

    suspend fun selectChannel(channelId: String) {
        _uiState.value = _uiState.value.copy(isLoading = true)

        val channel = client.getChannel(channelId)
        val messages = client.listMessages(channelId)

        _uiState.value = _uiState.value.copy(
            currentChannel = channel,
            messages = messages.reversed(),
            isLoading = false
        )
    }

    suspend fun sendMessage(content: String) {
        val channel = _uiState.value.currentChannel ?: return
        val user = _uiState.value.currentUser ?: return

        client.sendMessage(
            channelId = channel._id,
            senderId = user.pubkey,
            senderName = user.name,
            content = content
        )

        val messages = client.listMessages(channel._id)
        _uiState.value = _uiState.value.copy(messages = messages.reversed())
    }

    suspend fun createChannel(name: String, description: String?, type: String, participants: List<String>) {
        val user = _uiState.value.currentUser ?: return

        client.createChannel(
            name = name,
            description = description,
            type = type,
            createdBy = user.pubkey,
            participants = participants
        )

        loadChannels(user.pubkey)
    }

    suspend fun joinChannel(channelId: String) {
        val user = _uiState.value.currentUser ?: return
        client.joinChannel(channelId, user.pubkey)
        loadChannels(user.pubkey)
    }

    suspend fun leaveChannel(channelId: String) {
        val user = _uiState.value.currentUser ?: return
        client.leaveChannel(channelId, user.pubkey)
        _uiState.value = _uiState.value.copy(currentChannel = null, messages = emptyList())
        loadChannels(user.pubkey)
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
