package com.seridian.chat.client

import com.seridian.chat.createTestChannel
import com.seridian.chat.createTestMessage
import com.seridian.chat.createTestUser
import com.seridian.chat.viewmodel.ChatViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeClient: FakeChatClient
    private lateinit var viewModel: ChatViewModel

    @BeforeTest
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        fakeClient = FakeChatClient()
        viewModel = ChatViewModel(
            client = fakeClient,
            scope = kotlinx.coroutines.CoroutineScope(testDispatcher)
        )
    }

    @AfterTest
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun initialStateHasDefaultValues() {
        val state = viewModel.uiState.value

        assertEquals(ConnectionState.DISCONNECTED, state.connectionState)
        assertTrue(state.channels.isEmpty())
        assertTrue(state.messages.isEmpty())
        assertTrue(state.onlineUsers.isEmpty())
        assertNull(state.currentChannel)
        assertNull(state.currentUser)
        assertFalse(state.isLoading)
        assertNull(state.error)
    }

    @Test
    fun connectSetsLoadingState() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel())

        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertNotNull(state.currentUser)
        assertEquals("Alice", state.currentUser?.name)
    }

    @Test
    fun connectSetsCurrentUser() = runTest {
        fakeClient.mockUser = createTestUser(pubkey = "0xdef", name = "Bob")

        viewModel.connect("https://test.convex.cloud", "0xdef", "Bob")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.currentUser)
        assertEquals("0xdef", state.currentUser?.pubkey)
        assertEquals("Bob", state.currentUser?.name)
    }

    @Test
    fun connectLoadsChannels() = runTest {
        val channels = listOf(
            createTestChannel(id = "ch_001", name = "general"),
            createTestChannel(id = "ch_002", name = "random")
        )
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = channels

        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(2, state.channels.size)
        assertEquals("general", state.channels[0].name)
        assertEquals("random", state.channels[1].name)
    }

    @Test
    fun selectChannelLoadsMessages() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        fakeClient.mockMessages = listOf(
            createTestMessage(id = "msg_001", channelId = "ch_001", content = "First"),
            createTestMessage(id = "msg_002", channelId = "ch_001", content = "Second")
        )

        viewModel.selectChannel("ch_001")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.currentChannel)
        assertEquals("ch_001", state.currentChannel?._id)
        assertEquals(2, state.messages.size)
        assertEquals("Second", state.messages[0].content)
        assertEquals("First", state.messages[1].content)
    }

    @Test
    fun selectChannelSetsLoadingDuringFetch() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        fakeClient.mockMessages = listOf(createTestMessage(channelId = "ch_001"))

        viewModel.selectChannel("ch_001")

        val stateBeforeAdvance = viewModel.uiState.value
        assertTrue(stateBeforeAdvance.isLoading)

        advanceUntilIdle()

        val stateAfterAdvance = viewModel.uiState.value
        assertFalse(stateAfterAdvance.isLoading)
    }

    @Test
    fun selectChannelReversesMessagesForChronologicalOrder() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        fakeClient.mockMessages = listOf(
            createTestMessage(id = "msg_001", channelId = "ch_001", createdAt = 1000L),
            createTestMessage(id = "msg_002", channelId = "ch_001", createdAt = 2000L),
            createTestMessage(id = "msg_003", channelId = "ch_001", createdAt = 3000L)
        )

        viewModel.selectChannel("ch_001")
        advanceUntilIdle()

        val messages = viewModel.uiState.value.messages
        assertEquals(3000L, messages[0].createdAt)
        assertEquals(2000L, messages[1].createdAt)
        assertEquals(1000L, messages[2].createdAt)
    }

    @Test
    fun sendMessageAppendsToMessages() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        viewModel.selectChannel("ch_001")
        advanceUntilIdle()

        fakeClient.mockMessages = listOf(
            createTestMessage(id = "msg_001", channelId = "ch_001", content = "Old"),
            createTestMessage(id = "msg_002", channelId = "ch_001", content = "New message")
        )

        viewModel.sendMessage("New message")
        advanceUntilIdle()

        assertEquals(1, fakeClient.sentMessages.size)
        val (channelId, senderId, content) = fakeClient.sentMessages[0]
        assertEquals("ch_001", channelId)
        assertEquals("0xabc", senderId)
        assertEquals("New message", content)
    }

    @Test
    fun sendMessageDoesNothingWithoutChannel() = runTest {
        fakeClient.mockUser = createTestUser()

        viewModel.sendMessage("Hello")

        assertTrue(fakeClient.sentMessages.isEmpty())
    }

    @Test
    fun sendMessageWithoutChannelAndUserSendsNothing() = runTest {
        viewModel.sendMessage("Hello")

        assertTrue(fakeClient.sentMessages.isEmpty())
    }

    @Test
    fun createChannelCallsClientAndReloads() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        fakeClient.mockChannels = listOf(
            createTestChannel(id = "ch_001", name = "general"),
            createTestChannel(id = "ch_new", name = "new-channel")
        )

        viewModel.createChannel("new-channel", "A new channel", "public", listOf("0xabc"))
        advanceUntilIdle()

        assertEquals(1, fakeClient.createdChannels.size)
        val created = fakeClient.createdChannels[0]
        assertEquals("new-channel", created["name"])
        assertEquals("A new channel", created["description"])
        assertEquals(2, viewModel.uiState.value.channels.size)
    }

    @Test
    fun joinChannelCallsClientAndReloads() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        viewModel.joinChannel("ch_002")
        advanceUntilIdle()

        assertEquals(1, fakeClient.joinedChannels.size)
        assertEquals("ch_002", fakeClient.joinedChannels[0].first)
        assertEquals("0xabc", fakeClient.joinedChannels[0].second)
    }

    @Test
    fun leaveChannelClearsCurrentChannelAndReloads() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        viewModel.selectChannel("ch_001")
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.value.currentChannel)

        viewModel.leaveChannel("ch_001")
        advanceUntilIdle()

        assertNull(viewModel.uiState.value.currentChannel)
        assertTrue(viewModel.uiState.value.messages.isEmpty())
        assertEquals(1, fakeClient.leftChannels.size)
        assertEquals("ch_001", fakeClient.leftChannels[0].first)
    }

    @Test
    fun clearErrorOnInitialStateIsNoOp() {
        assertNull(viewModel.uiState.value.error)

        viewModel.clearError()

        assertNull(viewModel.uiState.value.error)
    }

    @Test
    fun loadChannelsUpdatesState() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        fakeClient.mockChannels = listOf(
            createTestChannel(id = "ch_001", name = "general"),
            createTestChannel(id = "ch_003", name = "dev"),
            createTestChannel(id = "ch_004", name = "random")
        )

        viewModel.loadChannels("0xabc")
        advanceUntilIdle()

        assertEquals(3, viewModel.uiState.value.channels.size)
    }

    @Test
    fun connectUpdatesConnectionState() = runTest {
        fakeClient.mockUser = createTestUser()

        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        assertEquals(ConnectionState.CONNECTED, viewModel.uiState.value.connectionState)
    }

    @Test
    fun connectWithFailedClientSetsFailedState() = runTest {
        fakeClient.shouldFailConnect = true

        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        assertEquals(ConnectionState.FAILED, viewModel.uiState.value.connectionState)
        assertNull(viewModel.uiState.value.currentUser)
    }

    @Test
    fun selectChannelWithInvalidIdSetsNullChannel() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(createTestChannel(id = "ch_001"))
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        fakeClient.mockMessages = emptyList()

        viewModel.selectChannel("nonexistent")
        advanceUntilIdle()

        assertNull(viewModel.uiState.value.currentChannel)
        assertTrue(viewModel.uiState.value.messages.isEmpty())
    }

    @Test
    fun multipleSelectChannelCallsUpdateState() = runTest {
        fakeClient.mockUser = createTestUser()
        fakeClient.mockChannels = listOf(
            createTestChannel(id = "ch_001"),
            createTestChannel(id = "ch_002")
        )
        viewModel.connect("https://test.convex.cloud", "0xabc", "Alice")
        advanceUntilIdle()

        fakeClient.mockMessages = listOf(createTestMessage(channelId = "ch_001", content = "Msg 1"))
        viewModel.selectChannel("ch_001")
        advanceUntilIdle()
        assertEquals("ch_001", viewModel.uiState.value.currentChannel?._id)

        fakeClient.mockMessages = listOf(createTestMessage(channelId = "ch_002", content = "Msg 2"))
        viewModel.selectChannel("ch_002")
        advanceUntilIdle()
        assertEquals("ch_002", viewModel.uiState.value.currentChannel?._id)
        assertEquals("Msg 2", viewModel.uiState.value.messages[0].content)
    }
}
