package com.seridian.chat.client

data class User(
    val pubkey: String,
    val displayName: String,
    val avatarUrl: String? = null
)
