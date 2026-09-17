package com.example.ui.screens

import android.app.Activity
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddTask
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CheckCircleOutline
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Icecream
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.LockClock
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PersonPin
import androidx.compose.material.icons.filled.PhoneInTalk
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.model.RewardEntity
import com.example.data.model.TaskEntity
import com.example.ui.components.ParentCallModal
import com.example.ui.components.SosEmergencyModal
import com.example.ui.theme.AmberGold
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.EmeraldGreen
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.PurpleAccent
import com.example.ui.theme.SkyBlueSecondary
import com.example.ui.components.AnimatedBottomNavigation
import com.example.ui.viewmodel.AppScreen
import com.example.ui.viewmodel.DashboardTab
import com.example.ui.viewmodel.LitensiViewModel

import androidx.compose.ui.draw.scale
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.navigationBarsPadding

@Composable
fun DashboardScreen(
    viewModel: LitensiViewModel,
    modifier: Modifier = Modifier
) {
    val pairingState by viewModel.pairingState.collectAsState()
    val tasks by viewModel.tasks.collectAsState()
    val rewards by viewModel.rewards.collectAsState()
    val childProfile by viewModel.childProfile.collectAsState()
    val sosCountdownActive by viewModel.sosCountdownActive.collectAsState()
    val sosCountdownSeconds by viewModel.sosCountdownSeconds.collectAsState()
    val sosSentSuccessModal by viewModel.sosSentSuccessModal.collectAsState()
    val showParentCallModal by viewModel.showParentCallModal.collectAsState()
    val checkInMessage by viewModel.checkInMessage.collectAsState()
    val rewardMessage by viewModel.rewardMessage.collectAsState()
    val permissionsState by viewModel.permissionsState.collectAsState()
    val selectedTab by viewModel.selectedTab.collectAsState()
    val chatMessages by viewModel.chatMessages.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    var showHelpCenterScreen by remember { mutableStateOf(false) }
    var showPrivacyPolicyScreen by remember { mutableStateOf(false) }
    var showTermsOfServiceScreen by remember { mutableStateOf(false) }
    var showAboutAppScreen by remember { mutableStateOf(false) }
    var showAppLimitOverlay by remember { mutableStateOf(false) }
    var activeLockedAppName by remember { mutableStateOf("YouTube Kids") }

    val context = LocalContext.current
    var lastBackPressTime by remember { mutableStateOf(0L) }

    BackHandler(enabled = true) {
        when {
            showAppLimitOverlay -> showAppLimitOverlay = false
            showAboutAppScreen -> showAboutAppScreen = false
            showTermsOfServiceScreen -> showTermsOfServiceScreen = false
            showPrivacyPolicyScreen -> showPrivacyPolicyScreen = false
            showHelpCenterScreen -> showHelpCenterScreen = false
            selectedTab != DashboardTab.BERANDA -> viewModel.selectTab(DashboardTab.BERANDA)
            else -> {
                val currentTime = System.currentTimeMillis()
                if (currentTime - lastBackPressTime < 2000) {
                    (context as? Activity)?.finish()
                } else {
                    lastBackPressTime = currentTime
                    Toast.makeText(context, "Tekan sekali lagi untuk keluar dari Litensi Kids", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    LaunchedEffect(checkInMessage) {
        checkInMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearCheckInMessage()
        }
    }

    LaunchedEffect(rewardMessage) {
        rewardMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearRewardMessage()
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "blinking")
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dotAlpha"
    )

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                when (selectedTab) {
                    DashboardTab.BERANDA -> {
                        Column(modifier = Modifier.fillMaxSize()) {
                            // Top Backdrop Header
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))
                                    .background(
                                        brush = Brush.verticalGradient(
                                            colors = listOf(
                                                IndigoPrimary,
                                                SkyBlueSecondary
                                            )
                                        )
                                    )
                                    .statusBarsPadding()
                                    .padding(start = 20.dp, top = 16.dp, end = 20.dp, bottom = 20.dp)
                            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Child Avatar
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                                .border(2.dp, EmeraldGreen, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = (pairingState?.childName ?: "Budi").take(1).uppercase(),
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = IndigoPrimary
                                )
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = "Halo, ${pairingState?.childName ?: "Budi"}! ✨",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    fontSize = 13.sp
                                )
                            )
                            Text(
                                text = "Litensi Kids • ${pairingState?.deviceType ?: "Smartphone"}",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = Color.White.copy(alpha = 0.9f),
                                    fontSize = 11.sp
                                )
                            )
                        }
                    }
                }
            }

            // Scrollable Modules Body
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                // 1. TOP STATUS CARD (PROTEKSI AKTIF)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // Blinking Green Indicator Dot
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(EmeraldGreen.copy(alpha = dotAlpha))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Terhubung dengan ${pairingState?.parentName?.ifBlank { null } ?: "Orang Tua"}",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A)
                                )
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(EmeraldGreen.copy(alpha = 0.15f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "Proteksi Aktif",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = EmeraldGreen,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Battery Status
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.BatteryChargingFull,
                                    contentDescription = null,
                                    tint = EmeraldGreen,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Baterai: ${childProfile?.batteryLevel ?: 88}%",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = Color(0xFF475569),
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 11.sp
                                    )
                                )
                            }

                            // GPS Status
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.MyLocation,
                                    contentDescription = null,
                                    tint = SkyBlueSecondary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (childProfile?.isGpsActive != false) "GPS Tracker" else "GPS Off",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = Color(0xFF475569),
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 11.sp
                                    )
                                )
                            }

                            // Poin Anak
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = AmberGold,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${childProfile?.points ?: 250} Poin",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = AmberGold,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 2. TOMBOL SOS / DARURAT UTAMA (EMERGENCY PANIC BUTTON)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = CrimsonRed.copy(alpha = 0.08f)),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, CrimsonRed.copy(alpha = 0.3f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "SOS / DARURAT ANAK",
                            style = MaterialTheme.typography.labelLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = CrimsonRed
                            )
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = "Tekan tombol di bawah dalam situasi bahaya untuk mengirimkan lokasi presisi & sinyal peringatan darurat ke HP Orang Tua secara instan.",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color(0xFF475569),
                                fontSize = 11.sp,
                                textAlign = TextAlign.Center
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = { viewModel.startSosEmergencyTimer() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(30.dp)
                                .testTag("btn_trigger_sos"),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CrimsonRed,
                                contentColor = Color.White
                            ),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp)
                        ) {
                            Text(
                                text = "Kirim Sinyal Darurat / SOS ke Orang Tua",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp
                                )
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 4. MODUL TUGAS & POIN SAYA (GAMIFIED TASKS & REWARDS)
                ModuleHeader(
                    title = "Tugas Hari Ini & Poin Saya",
                    icon = Icons.Default.Star,
                    iconTint = AmberGold
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Task List Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "Daftar Tugas dari Orang Tua",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A)
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        if (tasks.isEmpty()) {
                            Text(
                                text = "Belum ada tugas hari ini. Nikmati waktu belajarmu!",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Color.Gray),
                                modifier = Modifier.padding(vertical = 12.dp)
                            )
                        } else {
                            tasks.forEach { task ->
                                TaskItemRow(
                                    task = task,
                                    onComplete = { viewModel.completeTask(task) }
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Reward Claim Store
                        Text(
                            text = "🎁 Toko Klaim Hadiah",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A)
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        rewards.forEach { reward ->
                            RewardItemRow(
                                reward = reward,
                                childPoints = childProfile?.points ?: 0,
                                onRedeem = { viewModel.redeemReward(reward) }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // 5. MODUL BATAS WAKTU LAYAR & APLIKASI (SCREEN TIME & APP RESTRICTOR)
                ModuleHeader(
                    title = "Waktu Layar & Batas Aplikasi",
                    icon = Icons.Default.LockClock,
                    iconTint = SkyBlueSecondary
                )

                Spacer(modifier = Modifier.height(8.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = SkyBlueSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Sisa Waktu Layar Hari Ini: 1 Jam 45 Menit",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A)
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        LinearProgressIndicator(
                            progress = { 105f / 180f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(10.dp)
                                .clip(RoundedCornerShape(8.dp)),
                            color = SkyBlueSecondary,
                            trackColor = Color(0xFFE2E8F0)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "Status Pembatasan Aplikasi:",
                            style = MaterialTheme.typography.labelLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A)
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // App Restriction Item 1
                        RestrictedAppItem(
                            appName = "YouTube Kids",
                            statusText = "Batas 30 Menit/Hari Terlampaui (Klik untuk Buka Overlay)",
                            isLocked = true,
                            onClick = {
                                activeLockedAppName = "YouTube Kids"
                                showAppLimitOverlay = true
                            }
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // App Restriction Item 2
                        RestrictedAppItem(
                            appName = "TikTok & Mobile Legends",
                            statusText = "Terkunci selama jam belajar (18:00 - 20:00)",
                            isLocked = true,
                            onClick = {
                                activeLockedAppName = "TikTok & Mobile Legends"
                                showAppLimitOverlay = true
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
                        }
                    }
                    DashboardTab.CHAT -> {
                        ChatTabContent(
                            parentName = pairingState?.parentName ?: "Orang Tua",
                            messages = chatMessages,
                            onSendMessage = { viewModel.sendChatMessage(it) }
                        )
                    }
                    DashboardTab.PROFIL -> {
                        ProfilTabContent(
                            childName = pairingState?.childName ?: "Anak",
                            parentName = pairingState?.parentName ?: "Orang Tua",
                            pairingCode = pairingState?.pairingCode ?: "LMN-8942-KID",
                            points = childProfile?.points ?: 0,
                            permissionsState = permissionsState,
                            onDisconnect = { viewModel.disconnectDevice() },
                            onNavigateToHelpCenter = { showHelpCenterScreen = true },
                            onNavigateToPrivacyPolicy = { showPrivacyPolicyScreen = true },
                            onNavigateToTermsOfService = { showTermsOfServiceScreen = true },
                            onNavigateToAboutApp = { showAboutAppScreen = true },
                            onNavigateToPermissionsOnboarding = { viewModel.navigateTo(AppScreen.PERMISSION_ONBOARDING) },
                            modifier = Modifier.statusBarsPadding()
                        )
                    }
                }
            }

            // Animated Curved Bottom Navigation Bar
            AnimatedBottomNavigation(
                selectedTab = selectedTab,
                onTabSelected = { viewModel.selectTab(it) }
            )
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        )
    }

    // Full Screen Help Center Page Overlay
    if (showHelpCenterScreen) {
        HelpCenterScreen(
            onBackClick = { showHelpCenterScreen = false },
            modifier = Modifier.fillMaxSize()
        )
    }

    // Full Screen Privacy Policy Page Overlay
    if (showPrivacyPolicyScreen) {
        PrivacyPolicyScreen(
            onBackClick = { showPrivacyPolicyScreen = false },
            modifier = Modifier.fillMaxSize()
        )
    }

    // Full Screen Terms of Service Page Overlay
    if (showTermsOfServiceScreen) {
        TermsOfServiceScreen(
            onBackClick = { showTermsOfServiceScreen = false },
            modifier = Modifier.fillMaxSize()
        )
    }

    // Full Screen About App Page Overlay
    if (showAboutAppScreen) {
        AboutAppScreen(
            onBackClick = { showAboutAppScreen = false },
            modifier = Modifier.fillMaxSize()
        )
    }

    // Full Screen App Limit Lock Overlay
    if (showAppLimitOverlay) {
        AppLimitOverlayScreen(
            appName = activeLockedAppName,
            initialCountdownSeconds = 900,
            parentName = pairingState?.parentName ?: "Orang Tua",
            onCloseOverlay = { showAppLimitOverlay = false },
            modifier = Modifier.fillMaxSize()
        )
    }

    // Modal Components
    if (sosCountdownActive) {
        SosEmergencyModal(
            secondsRemaining = sosCountdownSeconds,
            onCancel = { viewModel.cancelSosEmergency() }
        )
    }

    if (sosSentSuccessModal) {
        Dialog(onDismissRequest = { viewModel.dismissSosSentModal() }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(EmeraldGreen.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = EmeraldGreen,
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Sinyal SOS Terkirim!",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A)
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Lokasi dan notifikasi peringatan suara nyaring telah terkirim ke HP Ibu Siska.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Color(0xFF475569),
                            textAlign = TextAlign.Center
                        )
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = { viewModel.dismissSosSentModal() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(32.dp)
                            .testTag("btn_close_sos_success"),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = IndigoPrimary)
                    ) {
                        Text("Mengerti", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                }
            }
        }
    }


}

@Composable
private fun ModuleHeader(
    title: String,
    icon: ImageVector,
    iconTint: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )
        )
    }
}

@Composable
private fun TaskItemRow(
    task: TaskEntity,
    onComplete: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFF8FAFC))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
            .padding(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Normal,
                        color = Color(0xFF0F172A)
                    )
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "+${task.rewardPoints} Poin ✨",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = EmeraldGreen,
                            fontWeight = FontWeight.Normal
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "• ${task.category}",
                        style = MaterialTheme.typography.labelSmall.copy(color = Color.Gray)
                    )
                }
            }

            when (task.status) {
                "COMPLETED" -> {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(EmeraldGreen.copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "Selesai ✓",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = EmeraldGreen,
                                fontWeight = FontWeight.Medium,
                                fontSize = 10.sp
                            )
                        )
                    }
                }
                "WAITING_APPROVAL" -> {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(AmberGold.copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "Menunggu Persetujuan",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = AmberGold,
                                fontWeight = FontWeight.Medium,
                                fontSize = 10.sp
                            )
                        )
                    }
                }
                else -> {
                    Button(
                        onClick = onComplete,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                        modifier = Modifier
                            .height(25.dp)
                            .testTag("btn_complete_task_${task.id}")
                    ) {
                        Text("Tandai Selesai", fontSize = 10.sp, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun RewardItemRow(
    reward: RewardEntity,
    childPoints: Int,
    onRedeem: () -> Unit
) {
    val canRedeem = childPoints >= reward.pointCost && !reward.isRedeemed

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFF8FAFC))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
            .padding(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(AmberGold.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when (reward.iconName) {
                        "icecream" -> Icons.Default.Icecream
                        "menu_book" -> Icons.AutoMirrored.Filled.MenuBook
                        else -> Icons.Default.SportsEsports
                    },
                    contentDescription = null,
                    tint = AmberGold,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = reward.title,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Normal,
                        color = Color(0xFF0F172A)
                    )
                )
                Text(
                    text = "${reward.pointCost} Poin ✨",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = AmberGold,
                        fontWeight = FontWeight.Normal
                    )
                )
            }

            if (reward.isRedeemed) {
                Text(
                    text = "Terklaim ✓",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = EmeraldGreen,
                        fontWeight = FontWeight.Medium,
                        fontSize = 10.sp
                    )
                )
            } else {
                Button(
                    onClick = onRedeem,
                    enabled = canRedeem,
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AmberGold,
                        disabledContainerColor = Color(0xFFCBD5E1)
                    ),
                    modifier = Modifier
                        .height(25.dp)
                        .testTag("btn_redeem_reward_${reward.id}")
                ) {
                    Text("Klaim Hadiah", fontSize = 10.sp, color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun RestrictedAppItem(
    appName: String,
    statusText: String,
    isLocked: Boolean,
    onClick: () -> Unit = {}
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFFF8FAFC))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(if (isLocked) CrimsonRed.copy(alpha = 0.15f) else EmeraldGreen.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isLocked) Icons.Default.Lock else Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = if (isLocked) CrimsonRed else EmeraldGreen,
                    modifier = Modifier.size(18.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = appName,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )
                )
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = if (isLocked) CrimsonRed else EmeraldGreen,
                        fontSize = 12.sp
                    )
                )
            }
        }
    }
}
