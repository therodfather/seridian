package com.seridian.chat.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = SeridianCyan,
    onPrimary = OwnMessageText,
    primaryContainer = SeridianCyanDark,
    onPrimaryContainer = OwnMessageText,
    secondary = Surface3,
    onSecondary = TextPrimary,
    tertiary = SeridianCyanLight,
    background = Surface0,
    onBackground = TextPrimary,
    surface = Surface1,
    onSurface = TextPrimary,
    surfaceVariant = Surface2,
    onSurfaceVariant = TextSecondary,
    error = ErrorRed,
    onError = TextPrimary
)

@Composable
fun SeridianChatTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
