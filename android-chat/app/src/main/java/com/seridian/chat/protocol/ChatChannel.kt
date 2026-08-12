package com.seridian.chat.protocol

data class ChatChannel(
    val id: String,
    val name: String,
    val description: String? = null,
    val type: String = "public",
    val createdAt: Long = 0L,
    val createdBy: String? = null
)
