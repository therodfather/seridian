package com.seridian.chat.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.seridian.chat.client.ConnectionState
import com.seridian.chat.viewmodel.ChatViewModel
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    viewModel: ChatViewModel,
    onConnected: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()

    var deploymentUrl by remember { mutableStateOf("https://fine-flamingo-162.convex.cloud") }
    var displayName by remember { mutableStateOf("") }
    var pubkey by remember { mutableStateOf("") }

    val isLoading = uiState.connectionState == ConnectionState.CONNECTING ||
            uiState.connectionState == ConnectionState.RECONNECTING

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Seridian Chat",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF06B6D4)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Connect to your team",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = deploymentUrl,
            onValueChange = { deploymentUrl = it },
            label = { Text("Convex Deployment URL") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF06B6D4),
                focusedLabelColor = Color(0xFF06B6D4)
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = displayName,
            onValueChange = { displayName = it },
            label = { Text("Display Name") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF06B6D4),
                focusedLabelColor = Color(0xFF06B6D4)
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = pubkey,
            onValueChange = { pubkey = it },
            label = { Text("Your ID (pubkey)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF06B6D4),
                focusedLabelColor = Color(0xFF06B6D4)
            )
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                scope.launch {
                    viewModel.connect(
                        deploymentUrl = deploymentUrl,
                        pubkey = pubkey,
                        name = displayName
                    )
                    onConnected()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading && deploymentUrl.isNotBlank() && displayName.isNotBlank() && pubkey.isNotBlank(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF06B6D4)
            )
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.height(20.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Connect")
            }
        }

        if (uiState.error != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = uiState.error ?: "",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
