package com.seridian.chat.protocol

import kotlinx.serialization.Serializable

@Serializable
data class ChatMessage(
    val _id: String = "",
    val channelId: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val content: String = "",
    val type: String = "text",
    val replyTo: String? = null,
    val editedAt: Long? = null,
    val deletedAt: Long? = null,
    val createdAt: Long = 0L
)

@Serializable
data class ChatChannel(
    val _id: String = "",
    val name: String = "",
    val description: String? = null,
    val type: String = "public",
    val createdBy: String = "",
    val participants: List<String> = emptyList(),
    val lastMessageAt: Long? = null,
    val createdAt: Long = 0L
)

@Serializable
data class ChatUser(
    val _id: String = "",
    val pubkey: String = "",
    val name: String = "",
    val avatar: String? = null,
    val status: String = "offline",
    val lastSeen: Long = 0L,
    val deviceType: String? = null
)
