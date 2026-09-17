package com.example.ui.screens

import android.Manifest
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.LockClock
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Power
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.example.ui.theme.AmberGold
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.EmeraldGreen
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.SkyBlueSecondary

private data class PermissionItem(
    val key: String,
    val stepTitle: String,
    val permissionTitle: String,
    val badgeTag: String,
    val icon: ImageVector,
    val iconTint: Color,
    val shortSummary: String,
    val detailedReason: String,
    val systemGuideSteps: List<String>,
    val settingsButtonLabel: String
)

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun PermissionOnboardingScreen(
    parentName: String = "Orang Tua",
    childName: String = "Anak",
    onCompleteOnboarding: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    // List of all essential parental control permissions
    val permissionSteps = remember {
        listOf(
            PermissionItem(
                key = "LOCATION",
                stepTitle = "Langkah 1 dari 5",
                permissionTitle = "Izin Lokasi Presisi (Real-Time GPS)",
                badgeTag = "KESELAMATAN LOKASI",
                icon = Icons.Default.LocationOn,
                iconTint = IndigoPrimary,
                shortSummary = "Memantau keberadaan anak & mendeteksi zona aman (Sekolah/Rumah) secara real-time.",
                detailedReason = "Aplikasi membutuhkan izin 'Izinkan Sepanjang Waktu' agar Orang Tua dapat memastikan kamu berada di lokasi yang aman, menerima notifikasi saat tiba di sekolah, serta menerima sinyal darurat (SOS) lengkap dengan koordinat tepat saat kamu butuh bantuan.",
                systemGuideSteps = listOf(
                    "Pilih 'Buka Pengaturan HP'",
                    "Klik menu 'Izin' / 'Permissions'",
                    "Pilih 'Lokasi' dan aktifkan 'Izinkan Sepanjang Waktu' (Allow all the time)"
                ),
                settingsButtonLabel = "Aktifkan Izin Lokasi GPS"
            ),
            PermissionItem(
                key = "USAGE_STATS",
                stepTitle = "Langkah 2 dari 5",
                permissionTitle = "Akses Penggunaan Aplikasi (Usage Stats)",
                badgeTag = "BATAS WAKTU LAYAR",
                icon = Icons.Default.HourglassTop,
                iconTint = SkyBlueSecondary,
                shortSummary = "Menghitung durasi pemakaian HP & membatasi aplikasi berlebih seperti Game dan Medsos.",
                detailedReason = "Akses penggunaan aplikasi digunakan untuk mencatat durasi layar harian secara otomatis. Dengan izin ini, Orang Tua dapat mengatur batas durasi belajar dan memastikan kamu mempunyai waktu istirahat yang cukup setiap harinya.",
                systemGuideSteps = listOf(
                    "Klik 'Buka Akses Penggunaan'",
                    "Cari & pilih nama aplikasi 'Litensi Kids'",
                    "Nyalakan sakelar 'Izinkan akses penggunaan' (Allow usage tracking)"
                ),
                settingsButtonLabel = "Buka Akses Penggunaan Aplikasi"
            ),
            PermissionItem(
                key = "OVERLAY",
                stepTitle = "Langkah 3 dari 5",
                permissionTitle = "Tampilkan di Atas Aplikasi Lain (Overlay)",
                badgeTag = "PENJAGAAN WAKTU BELAJAR",
                icon = Icons.Default.Layers,
                iconTint = CrimsonRed,
                shortSummary = "Menampilkan layar pengunci otomatis saat jam belajar atau batas waktu layar tercapai.",
                detailedReason = "Fitur penutup layar (Overlay Lock) memerlukan izin ini agar dapat muncul secara otomatis menutupi layar game/YouTube ketika batas waktu harian yang disepakati dengan Orang Tua telah habis.",
                systemGuideSteps = listOf(
                    "Klik 'Izinkan Penutupan Layar'",
                    "Cari 'Litensi Kids' pada daftar aplikasi",
                    "Nyalakan sakelar 'Izinkan tampil di atas aplikasi lain'"
                ),
                settingsButtonLabel = "Izinkan Tampil di Atas Aplikasi Lain"
            ),
            PermissionItem(
                key = "NOTIFICATIONS",
                stepTitle = "Langkah 4 dari 5",
                permissionTitle = "Notifikasi & Peringatan Sistem",
                badgeTag = "KOMUNIKASI ORANG TUA",
                icon = Icons.Default.NotificationsActive,
                iconTint = AmberGold,
                shortSummary = "Menerima pesan dari Orang Tua, pengingat tugas harian, dan instruksi keselamatan.",
                detailedReason = "Notifikasi memastikan kamu tidak ketinggalan pesan penting dari Orang Tua, pengingat waktu ibadah/belajar, serta konfirmasi hadiah poin yang telah kamu kumpulkan.",
                systemGuideSteps = listOf(
                    "Tekan 'Aktifkan Notifikasi'",
                    "Pilih 'Izinkan' (Allow) pada jendela konfirmasi Android"
                ),
                settingsButtonLabel = "Aktifkan Notifikasi Sistem"
            ),
            PermissionItem(
                key = "BACKGROUND",
                stepTitle = "Langkah 5 dari 5",
                permissionTitle = "Berjalan di Latar Belakang & Baterai",
                badgeTag = "PERLINDUNGAN 24/7",
                icon = Icons.Default.BatteryChargingFull,
                iconTint = EmeraldGreen,
                shortSummary = "Menjaga pemantauan keselamatan tetap aktif meski HP dimasukkan ke dalam saku.",
                detailedReason = "Sistem hemat baterai HP terkadang mematikan aplikasi pemantau keselamatan. Pengecualian optimasi baterai memastikan Litensi Kids tetap bekerja melindungi perangkat secara 24 jam tanpa terhenti.",
                systemGuideSteps = listOf(
                    "Klik 'Abaikan Optimasi Baterai'",
                    "Pilih 'Tidak Ada Batasan' (Unrestricted) / 'Izinkan'"
                ),
                settingsButtonLabel = "Abaikan Optimasi Baterai HP"
            )
        )
    }

    val lifecycleOwner = LocalLifecycleOwner.current

    // Permission Grant Statuses (Dynamically checked against Android system)
    val permissionGrantedMap = remember {
        mutableStateMapOf<String, Boolean>().apply {
            permissionSteps.forEach { step ->
                this[step.key] = checkSystemPermission(context, step.key)
            }
        }
    }

    // Refresh permission statuses whenever user returns to or resumes the screen
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                permissionSteps.forEach { step ->
                    val systemGranted = checkSystemPermission(context, step.key)
                    if (systemGranted) {
                        permissionGrantedMap[step.key] = true
                    }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    var currentStepIndex by remember { mutableIntStateOf(0) }
    val isFinalStep = currentStepIndex >= permissionSteps.size

    val locationLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        permissionGrantedMap["LOCATION"] = granted
        if (granted) {
            Toast.makeText(context, "Izin Lokasi berhasil diberikan!", Toast.LENGTH_SHORT).show()
            currentStepIndex += 1
        } else {
            openSystemPermissionSettings(context, "LOCATION")
        }
    }

    val notificationLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        permissionGrantedMap["NOTIFICATIONS"] = granted
        if (granted) {
            Toast.makeText(context, "Izin Notifikasi berhasil diberikan!", Toast.LENGTH_SHORT).show()
            currentStepIndex += 1
        } else {
            openSystemPermissionSettings(context, "NOTIFICATIONS")
        }
    }

    val requestPermissionForKey: (String) -> Unit = { key ->
        when (key) {
            "LOCATION" -> {
                locationLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            }
            "NOTIFICATIONS" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    notificationLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    openSystemPermissionSettings(context, "NOTIFICATIONS")
                }
            }
            else -> {
                openSystemPermissionSettings(context, key)
            }
        }
    }

    BackHandler(enabled = currentStepIndex > 0) {
        if (currentStepIndex > 0) {
            currentStepIndex -= 1
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .systemBarsPadding()
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Header Progress Bar
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    if (currentStepIndex > 0 && !isFinalStep) {
                        IconButton(
                            onClick = { currentStepIndex -= 1 },
                            modifier = Modifier
                                .size(32.dp)
                                .testTag("btn_permission_back_step")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Kembali",
                                tint = Color(0xFF0F172A)
                            )
                        }
                    } else {
                        Box(modifier = Modifier.size(32.dp))
                    }

                    Text(
                        text = if (isFinalStep) "Ringkasan Izin Ready ✨" else "Konfigurasi Izin HP ($childName)",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 15.sp
                        )
                    )

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(IndigoPrimary.copy(alpha = 0.1f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = if (isFinalStep) "5/5 Selesai" else "${currentStepIndex + 1}/${permissionSteps.size}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = IndigoPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                val progress = if (isFinalStep) 1f else (currentStepIndex + 1).toFloat() / permissionSteps.size.toFloat()
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = EmeraldGreen,
                    trackColor = Color(0xFFE2E8F0)
                )
            }

            HorizontalDivider(color = Color(0xFFE2E8F0))

            // Animated Content Body
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                AnimatedContent(
                    targetState = currentStepIndex,
                    transitionSpec = {
                        if (targetState > initialState) {
                            (slideInHorizontally { width -> width } + fadeIn()).togetherWith(
                                slideOutHorizontally { width -> -width } + fadeOut())
                        } else {
                            (slideInHorizontally { width -> -width } + fadeIn()).togetherWith(
                                slideOutHorizontally { width -> width } + fadeOut())
                        }
                    },
                    label = "permission_step_anim"
                ) { targetStep ->
                    if (targetStep < permissionSteps.size) {
                        val currentItem = permissionSteps[targetStep]
                        val isGranted = permissionGrantedMap[currentItem.key] == true

                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 20.dp),
                            contentPadding = PaddingValues(top = 20.dp, bottom = 24.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Step Title & Badge
                            item {
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(currentItem.iconTint.copy(alpha = 0.15f))
                                                .padding(horizontal = 8.dp, vertical = 3.dp)
                                        ) {
                                            Text(
                                                text = currentItem.badgeTag,
                                                style = MaterialTheme.typography.labelSmall.copy(
                                                    color = currentItem.iconTint,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 10.sp
                                                )
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = currentItem.stepTitle,
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                color = Color(0xFF64748B),
                                                fontWeight = FontWeight.Medium,
                                                fontSize = 12.sp
                                            )
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Text(
                                        text = currentItem.permissionTitle,
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF0F172A),
                                            fontSize = 13.sp,
                                            lineHeight = 18.sp
                                        )
                                    )
                                }
                            }

                            // Big Hero Permission Explanation Card
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, currentItem.iconTint.copy(alpha = 0.25f))
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(20.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                modifier = Modifier
                                                    .size(56.dp)
                                                    .clip(CircleShape)
                                                    .background(currentItem.iconTint.copy(alpha = 0.12f)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = currentItem.icon,
                                                    contentDescription = null,
                                                    tint = currentItem.iconTint,
                                                    modifier = Modifier.size(30.dp)
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(14.dp))

                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = "Mengapa Izin Ini Dibutuhkan?",
                                                    style = MaterialTheme.typography.titleSmall.copy(
                                                        fontWeight = FontWeight.Bold,
                                                        color = Color(0xFF0F172A),
                                                        fontSize = 13.sp
                                                    )
                                                )
                                                Text(
                                                    text = currentItem.shortSummary,
                                                    style = MaterialTheme.typography.bodySmall.copy(
                                                        color = Color(0xFF64748B),
                                                        fontSize = 11.sp,
                                                        lineHeight = 15.sp
                                                    )
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(14.dp))
                                        HorizontalDivider(color = Color(0xFFF1F5F9))
                                        Spacer(modifier = Modifier.height(14.dp))

                                        Text(
                                            text = currentItem.detailedReason,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                color = Color(0xFF334155),
                                                fontSize = 12.sp,
                                                lineHeight = 18.sp
                                            )
                                        )
                                    }
                                }
                            }

                            // Interactive Permission Toggle & System Action Card
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isGranted) Color(0xFFF0FDF4) else Color.White
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isGranted) EmeraldGreen.copy(alpha = 0.5f) else Color(0xFFE2E8F0)
                                    )
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(18.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(
                                                    imageVector = if (isGranted) Icons.Default.CheckCircle else Icons.Default.Shield,
                                                    contentDescription = null,
                                                    tint = if (isGranted) EmeraldGreen else Color(0xFF64748B),
                                                    modifier = Modifier.size(20.dp)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = if (isGranted) "Status: Aktif ✓" else "Status: Nonaktif (Belum Diizinkan)",
                                                    style = MaterialTheme.typography.titleSmall.copy(
                                                        fontWeight = FontWeight.Bold,
                                                        color = if (isGranted) EmeraldGreen else CrimsonRed,
                                                        fontSize = 13.sp
                                                    )
                                                )
                                            }

                                            Switch(
                                                checked = isGranted,
                                                onCheckedChange = { checked ->
                                                    if (checked) {
                                                        requestPermissionForKey(currentItem.key)
                                                    } else {
                                                        permissionGrantedMap[currentItem.key] = false
                                                        Toast.makeText(context, "${currentItem.permissionTitle} dinonaktifkan.", Toast.LENGTH_SHORT).show()
                                                    }
                                                },
                                                colors = SwitchDefaults.colors(
                                                    checkedThumbColor = Color.White,
                                                    checkedTrackColor = EmeraldGreen,
                                                    uncheckedThumbColor = Color.White,
                                                    uncheckedTrackColor = Color(0xFFCBD5E1)
                                                ),
                                                modifier = Modifier
                                                    .scale(0.7f)
                                                    .testTag("switch_toggle_permission_${currentItem.key.lowercase()}")
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        // Open Android System Settings or Request Permission Button
                                        Button(
                                            onClick = {
                                                requestPermissionForKey(currentItem.key)
                                            },
                                            shape = RoundedCornerShape(12.dp),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (isGranted) EmeraldGreen else currentItem.iconTint
                                            ),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(42.dp)
                                                .testTag("btn_trigger_system_setting_${currentItem.key.lowercase()}")
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Settings,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = if (isGranted) "Atur Ulang di Pengaturan HP" else currentItem.settingsButtonLabel,
                                                style = MaterialTheme.typography.titleMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White,
                                                    fontSize = 12.sp
                                                )
                                            )
                                        }
                                    }
                                }
                            }

                            // Step-by-step Guide Card
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Info,
                                                contentDescription = null,
                                                tint = SkyBlueSecondary,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = "Panduan Langkah Pengaturan HP:",
                                                style = MaterialTheme.typography.labelMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF0F172A),
                                                    fontSize = 12.sp
                                                )
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(10.dp))

                                        currentItem.systemGuideSteps.forEachIndexed { index, stepDesc ->
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 3.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(20.dp)
                                                        .clip(CircleShape)
                                                        .background(Color(0xFFF1F5F9)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(
                                                        text = "${index + 1}",
                                                        style = MaterialTheme.typography.labelSmall.copy(
                                                            color = Color(0xFF475569),
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 10.sp
                                                        )
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = stepDesc,
                                                    style = MaterialTheme.typography.bodySmall.copy(
                                                        color = Color(0xFF475569),
                                                        fontSize = 11.sp
                                                    )
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // All Permission Summary Final Screen
                        PermissionSummaryFinalView(
                            parentName = parentName,
                            childName = childName,
                            permissionGrantedMap = permissionGrantedMap,
                            permissionSteps = permissionSteps,
                            onComplete = onCompleteOnboarding
                        )
                    }
                }
            }

            // Bottom Navigation Next Button Bar (for Steps 1-5)
            if (!isFinalStep) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .padding(horizontal = 20.dp, vertical = 14.dp)
                ) {
                    val currentKey = permissionSteps[currentStepIndex].key
                    val isCurrentGranted = permissionGrantedMap[currentKey] == true

                    Button(
                        onClick = {
                            if (isCurrentGranted) {
                                currentStepIndex += 1
                            } else {
                                requestPermissionForKey(currentKey)
                            }
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isCurrentGranted) EmeraldGreen else IndigoPrimary
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .testTag("btn_next_permission_step")
                    ) {
                        Text(
                            text = if (isCurrentGranted) "Lanjut ke Izin Berikutnya →" else "Minta Izin Perangkat →",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 13.sp
                            )
                        )
                    }

                    if (!isCurrentGranted) {
                        Spacer(modifier = Modifier.height(4.dp))
                        TextButton(
                            onClick = {
                                currentStepIndex += 1
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(32.dp)
                        ) {
                            Text(
                                text = "Lewati langkah ini",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    color = Color(0xFF64748B),
                                    fontSize = 11.sp
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PermissionSummaryFinalView(
    parentName: String,
    childName: String,
    permissionGrantedMap: Map<String, Boolean>,
    permissionSteps: List<PermissionItem>,
    onComplete: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 24.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Success Header Banner
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldGreen.copy(alpha = 0.3f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .clip(CircleShape)
                            .background(EmeraldGreen.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = EmeraldGreen,
                            modifier = Modifier.size(42.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Konfigurasi Izin Selesai! 🎉",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 20.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Perangkat anak telah siap dipantau dan dilindungi secara penuh oleh akun Orang Tua.",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color(0xFF64748B),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center,
                            lineHeight = 17.sp
                        )
                    )
                }
            }
        }

        // List of All Granted Permissions Status
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp)
                ) {
                    Text(
                        text = "Status Seluruh Izin HP:",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 13.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    permissionSteps.forEach { step ->
                        val isGranted = permissionGrantedMap[step.key] == true
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = step.icon,
                                    contentDescription = null,
                                    tint = step.iconTint,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = step.permissionTitle,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = Color(0xFF334155),
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 11.sp
                                    )
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(
                                        if (isGranted) EmeraldGreen.copy(alpha = 0.15f) else CrimsonRed.copy(
                                            alpha = 0.15f
                                        )
                                    )
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = if (isGranted) "Aktif ✓" else "Nonaktif ✗",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = if (isGranted) EmeraldGreen else CrimsonRed,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp
                                    )
                                )
                            }
                        }
                        if (step != permissionSteps.last()) {
                            HorizontalDivider(color = Color(0xFFF1F5F9))
                        }
                    }
                }
            }
        }

        // Finish Onboarding & Go to Dashboard Button
        item {
            Button(
                onClick = onComplete,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .testTag("btn_complete_permission_onboarding")
            ) {
                Text(
                    text = "Selesai & Masuk ke Dashboard Anak 🚀",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 13.sp
                    )
                )
            }
        }
    }
}

private fun checkSystemPermission(context: Context, key: String): Boolean {
    return try {
        when (key) {
            "LOCATION" -> {
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
            }
            "USAGE_STATS" -> {
                val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
                @Suppress("DEPRECATION")
                val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    appOps?.unsafeCheckOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        android.os.Process.myUid(),
                        context.packageName
                    )
                } else {
                    appOps?.checkOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        android.os.Process.myUid(),
                        context.packageName
                    )
                }
                mode == AppOpsManager.MODE_ALLOWED
            }
            "OVERLAY" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Settings.canDrawOverlays(context)
                } else true
            }
            "NOTIFICATIONS" -> {
                NotificationManagerCompat.from(context).areNotificationsEnabled()
            }
            "BACKGROUND" -> {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    powerManager?.isIgnoringBatteryOptimizations(context.packageName) == true
                } else true
            }
            else -> false
        }
    } catch (e: Exception) {
        false
    }
}

private fun openSystemPermissionSettings(context: Context, key: String) {
    try {
        val intent = when (key) {
            "LOCATION" -> {
                Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
            }
            "USAGE_STATS" -> {
                Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            }
            "OVERLAY" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
                } else {
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
                }
            }
            "NOTIFICATIONS" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    }
                } else {
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
                }
            }
            "BACKGROUND" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))
                } else {
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
                }
            }
            else -> {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
            }
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    } catch (e: Exception) {
        try {
            val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(fallbackIntent)
        } catch (ex: Exception) {
            Toast.makeText(context, "Silakan atur di Pengaturan HP -> Aplikasi -> Litensi Kids", Toast.LENGTH_LONG).show()
        }
    }
}
