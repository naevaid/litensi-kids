package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.PairingScreen
import com.example.ui.screens.PermissionOnboardingScreen
import com.example.ui.screens.WelcomeScreen
import com.example.ui.theme.LitensiKidsTheme
import com.example.ui.viewmodel.AppScreen
import com.example.ui.viewmodel.LitensiViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LitensiKidsTheme {
                val viewModel: LitensiViewModel = viewModel()
                val currentScreen by viewModel.currentScreen.collectAsState()

                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    when (currentScreen) {
                        AppScreen.WELCOME -> {
                            WelcomeScreen(
                                onNavigateToPairing = { viewModel.navigateTo(AppScreen.PAIRING) }
                            )
                        }
                        AppScreen.PAIRING -> {
                            PairingScreen(
                                onConnectSuccess = { parentName, childName, code ->
                                    viewModel.connectDevice(parentName, childName, code)
                                }
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

