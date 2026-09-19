package com.example

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.PairingScreen
import com.example.ui.screens.PermissionOnboardingScreen
import com.example.ui.screens.WelcomeScreen
import com.example.ui.theme.LitensiKidsTheme
import com.example.ui.viewmodel.AppScreen
import com.example.ui.viewmodel.LitensiViewModel
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    companion object {
        // Request code untuk runtime permission POST_NOTIFICATIONS (Android 13+ API 33).
        // Tidak perlu handle callback hasil — jika user deny, notifikasi TIDAK muncul
        // (graceful degradation, tidak crash app).
        private const val RC_POST_NOTIF_PERM = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ============================================================================
        // (F5.2 lanjutan) Runtime Request Permission POST_NOTIFICATIONS untuk Android 13+
        // ----------------------------------------------------------------------------
        // Android 13 (Tiramisu, API 33) memerlukan PERMISSION REQUEST SECARA EKSPLISIT
        //   untuk MENAMPILKAN NOTIFIKASI ke user (manifest <uses-permission> saja TIDAK
        //   CUKUP untuk Android 13+). Jika user deny = notifikasi tidak tampil (graceful).
        // ============================================================================
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    RC_POST_NOTIF_PERM
                )
            }
        }

        enableEdgeToEdge()
        setContent {
            LitensiKidsTheme {
                val viewModel: LitensiViewModel = viewModel()
                val currentScreen by viewModel.currentScreen.collectAsState()

                // Global Snackbar untuk toastMessage state dari ViewModel
                val snackbarHostState = remember { SnackbarHostState() }
                val scope = rememberCoroutineScope()
                val toastMessage by viewModel.toastMessage.collectAsState()
                val pairingLoading by viewModel.pairingLoading.collectAsState(initial = false)

                LaunchedEffect(toastMessage) {
                    toastMessage?.let { msg ->
                        scope.launch {
                            snackbarHostState.showSnackbar(
                                message = msg,
                                duration = SnackbarDuration.Short
                            )
                        }
                        viewModel.clearToastMessage()
                    }
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    snackbarHost = { SnackbarHost(snackbarHostState) }
                ) { innerPadding ->
                    when (currentScreen) {
                        AppScreen.WELCOME -> {
                            WelcomeScreen(
                                onNavigateToPairing = { viewModel.navigateTo(AppScreen.PAIRING) }
                            )
                        }
                        AppScreen.PAIRING -> {
                            PairingScreen(
                                onConnectSuccess = { code, pin, parentFallback, childFallback ->
                                    viewModel.connectDevice(
                                        code = code,
                                        pin = pin,
                                        parentNameFallback = parentFallback,
                                        childNameFallback = childFallback
                                    )
                                },
                                isPairingLoading = pairingLoading
                            )
                        }
                        AppScreen.PERMISSION_ONBOARDING -> {
                            val pairingState by viewModel.pairingState.collectAsState()
                            PermissionOnboardingScreen(
                                parentName = pairingState?.parentName ?: "Orang Tua",
                                childName = pairingState?.childName ?: "Anak",
                                onCompleteOnboarding = {
                                    viewModel.completePermissionOnboarding()
                                }
                            )
                        }
                        AppScreen.DASHBOARD -> {
                            DashboardScreen(
                                viewModel = viewModel
                            )
                        }
                    }
                }
            }
        }
    }
}

