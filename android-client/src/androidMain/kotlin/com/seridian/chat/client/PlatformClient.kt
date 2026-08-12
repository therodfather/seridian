package com.seridian.chat.client

import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.websocket.WebSockets
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import java.util.UUID

actual fun currentTimeMillis(): Long = System.currentTimeMillis()

actual fun generateTempId(): String = UUID.randomUUID().toString()

fun createPlatformChatClient(
    scope: CoroutineScope = CoroutineScope(Dispatchers.Default + Job())
): ChatClient {
    return ConvexClient(
        scope = scope
    )
}
