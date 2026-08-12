# Android Chat App

Native Android client for the Seridian real-time chat system. Built with Kotlin Multiplatform (KMP) shared logic and Jetpack Compose UI.

## Architecture Overview

The Android app follows a two-module architecture:

```
kmp-chat/                   # Shared KMP library (platform-agnostic)
├── commonMain/             # Interfaces, models, ViewModels
│   └── kotlin/com/seridian/chat/
│       ├── protocol/       # Data models (ChatMessage, ChatChannel, ChatUser)
│       ├── client/         # ChatClient interface, ConvexClient implementation
│       └── viewmodel/      # ChatViewModel (shared across platforms)
├── commonTest/             # Unit tests (kotlin-test)
└── androidMain/            # Android-specific implementations
    └── kotlin/.../client/  # PlatformClient (OkHttp engine, UUID generation)

android-chat/               # Android application
├── app/src/main/java/com/seridian/chat/android/
│   ├── MainActivity.kt     # Entry point, creates ConvexClient + ViewModel
│   ├── SeridianChatApp.kt  # Application class
│   ├── PlatformClient.kt   # DataStore preferences for saved connections
│   ├── navigation/         # NavGraph (login → channels → messages)
│   └── ui/
│       ├── screens/        # LoginScreen, ChatListScreen, MessageScreen
│       ├── components/     # MessageBubble, ChannelCard, UserAvatar
│       └── theme/          # Colors, Typography, SeridianTheme
└── app/src/main/res/       # Android resources (strings, themes)
```

### Key Design Decisions

- **Platform-agnostic core:** `ChatClient` interface and `ChatViewModel` live in `commonMain`, testable on JVM without Android dependencies.
- **Convex over WebSockets:** `ConvexClient` communicates via HTTP POST to Convex query/mutation endpoints (not WebSocket subscriptions).
- **Single ViewModel pattern:** `ChatViewModel` holds all UI state as a `StateFlow<ChatUiState>`, consumed by Compose screens via `collectAsState()`.
- **Manual DI:** No dependency injection framework; `MainActivity` wires `ConvexClient → ChatViewModel → NavGraph` directly.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| JDK | 17 | Required for Kotlin JVM target |
| Android SDK | compileSdk 35 | Android 15 |
| Kotlin | 2.1.0 | Set in Gradle plugin versions |
| Gradle | 8.7.3 (AGP) | Android Gradle Plugin |
| Ktor | 3.0.3 | HTTP client + WebSocket support |

No `gradlew` wrapper is committed — use your system Gradle or install the wrapper first:

```bash
# From android-chat/ directory
gradle wrapper --gradle-version 8.10
```

## Build Instructions

### Debug Build

```bash
cd android-chat
./gradlew :app:assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

### Release Build

```bash
cd android-chat
./gradlew :app:assembleRelease
```

Requires signing configuration (not currently set up in `build.gradle.kts`). The release build type enables:
- `isMinifyEnabled = true` (R8 code shrinking)
- `isShrinkResources = true` (resource shrinking)
- ProGuard rules from `proguard-rules.pro`

### Build KMP Library

```bash
cd kmp-chat
./gradlew :androidTarget:compileKotlinAndroid
```

### Run Tests

```bash
cd kmp-chat
./gradlew :allTests              # All platform tests
./gradlew :androidUnitTest       # Android unit tests only
```

### Clean Build

```bash
./gradlew clean
```

## Setup Instructions

### 1. Clone and Open

```bash
git clone <repo-url>
cd seridian/android-chat
```

Open in Android Studio (Hedgehog 2023.1+ or later recommended).

### 2. Gradle Sync

Android Studio will prompt to sync Gradle. If not:
- **File → Sync Project with Gradle Files**

### 3. Configure Convex Backend

The app connects to a Convex deployment for chat functionality. You need:

1. A running Convex deployment (see root project's `CONVEX_DEPLOYMENT` setup)
2. The deployment URL (e.g., `https://fine-flamingo-162.convex.cloud`)

### 4. Run on Device/Emulator

- Connect an Android device or start an emulator (API 26+)
- Click **Run** in Android Studio, or:

```bash
./gradlew :app:installDebug
```

## Architecture Deep Dive

### ChatClient Interface

Defined in `kmp-chat/commonMain`, this is the contract for all chat operations:

```kotlin
interface ChatClient {
    val isConnected: Boolean
    val connectionState: Flow<ConnectionState>

    suspend fun connect(deploymentUrl: String)
    suspend fun disconnect()

    // Channels
    suspend fun listChannels(pubkey: String): List<ChatChannel>
    suspend fun getChannel(channelId: String): ChatChannel?
    suspend fun createChannel(name: String, description: String?, type: String, createdBy: String, participants: List<String>): String

    // Messages
    suspend fun listMessages(channelId: String, limit: Int = 50): List<ChatMessage>
    suspend fun sendMessage(channelId: String, senderId: String, senderName: String, content: String, type: String = "text"): String
    suspend fun editMessage(messageId: String, content: String, senderId: String)
    suspend fun deleteMessage(messageId: String, senderId: String)

    // Membership
    suspend fun joinChannel(channelId: String, pubkey: String)
    suspend fun leaveChannel(channelId: String, pubkey: String)

    // Users
    suspend fun getUser(pubkey: String): ChatUser?
    suspend fun upsertUser(pubkey: String, name: String, status: String, avatar: String?, deviceType: String?)
}
```

### ConnectionState

```kotlin
enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    FAILED
}
```

### ConvexClient Implementation

The production client communicates with Convex via HTTP POST:

- **Queries** → `POST {deploymentUrl}/api/query` with `ConvexRequest(path, args)`
- **Mutations** → `POST {deploymentUrl}/api/mutation` with `ConvexRequest(path, args)`

```kotlin
class ConvexClient : ChatClient {
    // Uses Ktor HttpClient with OkHttp engine
    // Sends JSON payloads via ContentNegotiation plugin
    // Manages connection state via MutableStateFlow
}
```

### ChatViewModel

Shared ViewModel managing all UI state:

```kotlin
data class ChatUiState(
    val connectionState: ConnectionState,
    val channels: List<ChatChannel>,
    val messages: List<ChatMessage>,
    val onlineUsers: List<ChatUser>,
    val currentChannel: ChatChannel?,
    val currentUser: ChatUser?,
    val isLoading: Boolean,
    val error: String?
)
```

Key methods:

| Method | Description |
|--------|-------------|
| `connect(url, pubkey, name)` | Connects to Convex, upserts user, loads channels |
| `loadChannels(pubkey)` | Fetches all channels for the user |
| `selectChannel(channelId)` | Loads channel details and messages |
| `sendMessage(content)` | Sends message to current channel |
| `createChannel(...)` | Creates a new channel and reloads list |
| `joinChannel(channelId)` | Joins a channel and reloads list |
| `leaveChannel(channelId)` | Leaves channel, clears current selection |

### Navigation

Three-screen flow managed by Jetpack Navigation Compose:

```
LoginScreen → ChatListScreen → MessageScreen
   (login)      (channels)      (messages)
```

- `LoginScreen`: Collects deployment URL, display name, and pubkey
- `ChatListScreen`: Lists all channels with FAB for creation (TODO)
- `MessageScreen`: Displays messages with input field and send button

## Features

### Current Features

| Feature | Status | Description |
|---------|--------|-------------|
| Login/Connect | Working | Enter deployment URL, display name, and pubkey to connect |
| Channel List | Working | View all channels you're a member of |
| View Messages | Working | Tap a channel to view its message history |
| Send Messages | Working | Type and send text messages to any channel |
| Message Bubbles | Working | Own messages right-aligned, others left-aligned |
| User Avatar | Working | Initials-based avatar circle |
| Dark Theme | Working | Seridian cyan accent on dark surfaces |

### Planned / TODO

| Feature | Status | Notes |
|---------|--------|-------|
| Create Channel | TODO | FAB exists but dialog not implemented |
| Edit Message | API ready | `editMessage` in ChatClient, no UI |
| Delete Message | API ready | `deleteMessage` in ChatClient, no UI |
| Real-time Updates | Not implemented | Currently polls; Convex subscriptions available |
| Push Notifications | Not implemented | Would require Firebase integration |
| User Profile | Not implemented | Avatar upload, status editing |
| Channel Members | Partial | `participants` field exists, no member list UI |
| Message Reactions | Not implemented | `replyTo` field exists for thread support |

## Data Models

### ChatMessage

```kotlin
@Serializable
data class ChatMessage(
    val _id: String = "",
    val channelId: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val content: String = "",
    val type: String = "text",        // "text", "image", "file"
    val replyTo: String? = null,      // Parent message ID for threads
    val editedAt: Long? = null,       // Timestamp of last edit
    val deletedAt: Long? = null,      // Soft delete timestamp
    val createdAt: Long = 0L          // Unix timestamp millis
)
```

### ChatChannel

```kotlin
@Serializable
data class ChatChannel(
    val _id: String = "",
    val name: String = "",
    val description: String? = null,
    val type: String = "public",      // "public", "private", "direct"
    val createdBy: String = "",
    val participants: List<String> = emptyList(),
    val lastMessageAt: Long? = null,
    val createdAt: Long = 0L
)
```

### ChatUser

```kotlin
@Serializable
data class ChatUser(
    val _id: String = "",
    val pubkey: String = "",          // Unique identifier (e.g., "0xabc...")
    val name: String = "",
    val avatar: String? = null,       // URL to avatar image
    val status: String = "offline",   // "online", "offline", "away"
    val lastSeen: Long = 0L,
    val deviceType: String? = null    // "android", "ios", "desktop"
)
```

## Platform Persistence

`PlatformPreferences` (in `android-chat/PlatformClient.kt`) uses Jetpack DataStore to persist connection details:

```kotlin
object PlatformPreferences {
    suspend fun saveConnection(context: Context, deploymentUrl: String, pubkey: String, displayName: String)
    suspend fun getConnection(context: Context): Triple<String, String, String>?
    suspend fun clear(context: Context)
}
```

Stored preferences:
- `deployment_url` — Convex deployment URL
- `pubkey` — User's public key identifier
- `display_name` — User's display name

**Note:** Persistence is not yet wired into the login flow — the app currently requires manual entry on each launch.

## Theme

The app uses a custom dark theme built on Material 3:

| Token | Color | Usage |
|-------|-------|-------|
| `SeridianCyan` | `#06B6D4` | Primary accent, buttons, links |
| `Surface0` | `#070B14` | App background |
| `Surface1` | `#0C1222` | Card/sheet background |
| `Surface2` | `#111827` | Input fields, avatars |
| `Surface3` | `#172033` | Elevated surfaces |
| `TextPrimary` | `#F1F5F9` | Primary text |
| `TextSecondary` | `#94A3B8` | Secondary/label text |
| `OwnMessageBg` | `#06B6D4` | Own message bubble |
| `OthersMessageBg` | `#1E293B` | Other users' message bubbles |

## Testing

Tests are in `kmp-chat/src/commonTest/`:

| Test Class | Coverage |
|------------|----------|
| `ModelsTest` | Serialization/deserialization of ChatMessage, ChatChannel, ChatUser |
| `ConvexClientTest` | Connection state transitions, request/response serialization |
| `ChatViewModelTest` | All ViewModel operations (connect, channels, messages, errors) |
| `FakeChatClient` | Test double implementing ChatClient for isolated ViewModel testing |

Run tests:

```bash
cd kmp-chat
./gradlew :allTests
```

## Dependencies

### Android App (`android-chat/app`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| Compose BOM | 2024.12.01 | Compose UI toolkit |
| Material 3 | (via BOM) | UI components |
| Navigation Compose | 2.8.5 | Screen navigation |
| Lifecycle ViewModel Compose | 2.8.7 | ViewModel integration |
| DataStore Preferences | 1.1.1 | Local persistence |
| Ktor Client Android | 3.0.3 | HTTP client |
| Ktor Serialization JSON | 3.0.3 | JSON parsing |
| Kotlinx Datetime | 0.6.1 | Date/time utilities |

### KMP Library (`kmp-chat`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| Kotlinx Coroutines | 1.9.0 | Async operations |
| Kotlinx Serialization JSON | 1.7.3 | JSON serialization |
| Ktor Client Core | 3.0.3 | HTTP client interface |
| Ktor Client WebSockets | 3.0.3 | WebSocket support |
| Ktor Client OkHttp | 3.0.3 | Android HTTP engine |

## Troubleshooting

### Build fails with "Could not resolve" errors

Ensure Gradle can reach Google and Maven Central repositories. Check `settings.gradle.kts` in both `android-chat/` and `kmp-chat/`:

```kotlin
repositories {
    google()
    mavenCentral()
}
```

### ConvexClient returns null on queries

- Verify the deployment URL is correct and accessible
- Check that Convex functions (`chat:listChannels`, etc.) are deployed
- Ensure network permissions are granted (`INTERNET`, `ACCESS_NETWORK_STATE`)

### Compose compilation errors

- Ensure `kotlin("plugin.compose")` version matches Kotlin version (both 2.1.0)
- Run `./gradlew clean` and rebuild

### Tests fail with "No such message"

The `FakeChatClient` returns mock data — ensure `mockMessages`, `mockChannels`, etc. are set before calling the method under test.

## Project Configuration

### android-chat/gradle.properties

```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
```

### kmp-chat/gradle.properties

```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
kotlin.code.style=official
kotlin.mpp.stability.nowarn=true
kotlin.mpp.androidSourceSetLayoutVersion=2
android.useAndroidX=true
```
