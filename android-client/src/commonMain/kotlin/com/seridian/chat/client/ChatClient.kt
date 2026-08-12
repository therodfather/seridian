package com.seridian.chat.client

import com.seridian.chat.protocol.ChatChannel
import com.seridian.chat.protocol.ChatMessage
import com.seridian.chat.protocol.ChatUser
import kotlinx.coroutines.flow.Flow

interface ChatClient {
    val isConnected: Boolean
    val connectionState: Flow<ConnectionState>

    suspend fun connect(deploymentUrl: String)
    suspend fun disconnect()

    suspend fun listChannels(pubkey: String): List<ChatChannel>
    suspend fun getChannel(channelId: String): ChatChannel?
    suspend fun createChannel(
        name: String,
        description: String?,
        type: String,
        createdBy: String,
        participants: List<String>
    ): String

    suspend fun listMessages(channelId: String, limit: Int = 50): List<ChatMessage>
    suspend fun sendMessage(
        channelId: String,
        senderId: String,
        senderName: String,
        content: String,
        type: String = "text"
    ): String
    suspend fun editMessage(messageId: String, content: String, senderId: String)
    suspend fun deleteMessage(messageId: String, senderId: String)

    suspend fun joinChannel(channelId: String, pubkey: String)
    suspend fun leaveChannel(channelId: String, pubkey: String)

    suspend fun getUser(pubkey: String): ChatUser?
    suspend fun upsertUser(
        pubkey: String,
        name: String,
        status: String,
        avatar: String? = null,
        deviceType: String? = null
    )
}

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    FAILED
}
