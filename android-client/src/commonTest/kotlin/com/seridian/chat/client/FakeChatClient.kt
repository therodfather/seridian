package com.seridian.chat.client

import com.seridian.chat.protocol.ChatChannel
import com.seridian.chat.protocol.ChatMessage
import com.seridian.chat.protocol.ChatUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class FakeChatClient : ChatClient {

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    override val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    override val isConnected: Boolean
        get() = _connectionState.value == ConnectionState.CONNECTED

    var mockChannels: List<ChatChannel> = emptyList()
    var mockMessages: List<ChatMessage> = emptyList()
    var mockUser: ChatUser? = null
    var mockMessageId: String = "mock_msg_id"
    var mockChannelId: String = "mock_channel_id"
    var shouldFailConnect: Boolean = false

    val sentMessages: MutableList<Triple<String, String, String>> = mutableListOf()
    val joinedChannels: MutableList<Pair<String, String>> = mutableListOf()
    val leftChannels: MutableList<Pair<String, String>> = mutableListOf()
    val createdChannels: MutableList<Map<String, Any?>> = mutableListOf()

    override suspend fun connect(deploymentUrl: String) {
        _connectionState.value = ConnectionState.CONNECTING
        if (shouldFailConnect) {
            _connectionState.value = ConnectionState.FAILED
            return
        }
        _connectionState.value = ConnectionState.CONNECTED
    }

    override suspend fun disconnect() {
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    override suspend fun listChannels(pubkey: String): List<ChatChannel> = mockChannels

    override suspend fun getChannel(channelId: String): ChatChannel? =
        mockChannels.find { it._id == channelId }

    override suspend fun createChannel(
        name: String,
        description: String?,
        type: String,
        createdBy: String,
        participants: List<String>
    ): String {
        createdChannels.add(
            mapOf(
                "name" to name,
                "description" to description,
                "type" to type,
                "createdBy" to createdBy,
                "participants" to participants
            )
        )
        return mockChannelId
    }

    override suspend fun listMessages(channelId: String, limit: Int): List<ChatMessage> =
        mockMessages.filter { it.channelId == channelId }.take(limit)

    override suspend fun sendMessage(
        channelId: String,
        senderId: String,
        senderName: String,
        content: String,
        type: String
    ): String {
        sentMessages.add(Triple(channelId, senderId, content))
        return mockMessageId
    }

    override suspend fun editMessage(messageId: String, content: String, senderId: String) {}

    override suspend fun deleteMessage(messageId: String, senderId: String) {}

    override suspend fun joinChannel(channelId: String, pubkey: String) {
        joinedChannels.add(channelId to pubkey)
    }

    override suspend fun leaveChannel(channelId: String, pubkey: String) {
        leftChannels.add(channelId to pubkey)
    }

    override suspend fun getUser(pubkey: String): ChatUser? = mockUser

    override suspend fun upsertUser(
        pubkey: String,
        name: String,
        status: String,
        avatar: String?,
        deviceType: String?
    ) {}

    fun clear() {
        _connectionState.value = ConnectionState.DISCONNECTED
        mockChannels = emptyList()
        mockMessages = emptyList()
        mockUser = null
        sentMessages.clear()
        joinedChannels.clear()
        leftChannels.clear()
        createdChannels.clear()
        shouldFailConnect = false
    }
}
