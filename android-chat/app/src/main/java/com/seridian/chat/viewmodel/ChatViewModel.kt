package com.seridian.chat.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.seridian.chat.client.ChatUiState
import com.seridian.chat.client.ConnectionState
import com.seridian.chat.client.ConvexClient
import com.seridian.chat.protocol.ChatChannel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ChatViewModel(private val client: ConvexClient) : ViewModel() {
    val uiState: StateFlow<ChatUiState> = client.uiState

    fun connect(deploymentUrl: String, pubkey: String, name: String) {
        viewModelScope.launch {
            client.connect(deploymentUrl, pubkey, name)
        }
    }

    fun disconnect() {
        client.disconnect()
    }

    fun loadChannels() {
        viewModelScope.launch {
            client.loadChannels()
        }
    }

    fun selectChannel(channelId: String) {
        client.selectChannel(channelId)
    }

    fun sendMessage(content: String) {
        viewModelScope.launch {
            client.sendMessage(content)
        }
    }

    fun clearError() {
        client.clearError()
    }
}
