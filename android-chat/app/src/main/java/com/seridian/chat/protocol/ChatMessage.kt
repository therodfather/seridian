package com.seridian.chat.protocol

data class ChatMessage(
    val id: String,
    val channelId: String,
    val senderId: String,
    val senderName: String,
    val content: String,
    val createdAt: Long = 0L,
    val deletedAt: Long? = null
)
