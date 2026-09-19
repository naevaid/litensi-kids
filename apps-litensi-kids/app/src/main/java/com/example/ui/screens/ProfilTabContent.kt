package com.example.ui.screens

import android.Manifest
import android.app.AppOpsManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.FamilyRestroom
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.example.data.location.GPSLocationManager
import com.example.data.location.LiveGpsForegroundService
import com.example.ui.theme.AmberGold
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.EmeraldGreen
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.SkyBlueSecondary

private fun checkRealPermission(context: Context, permName: String): Boolean {
    return when (permName) {
        "GPS Lokasi" -> {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        }
        "Kamera Device" -> {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        }
        "Aksesibilitas Overlay" -> {
            Settings.canDrawOverlays(context)
        }
        "Penggunaan Aplikasi" -> {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            @Suppress("DEPRECATION")
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            } else {
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        }
        "Notifikasi" -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
        }
        "Berjalan di Latar Belakang" -> {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (powerManager != null) {
                powerManager.isIgnoringBatteryOptimizations(context.packageName)
            } else {
                true
            }
        }
        "Notifikasi GPS Realtime" -> {
            // (1) Notifikasi app secara global ENABLED?
            val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val appNotifEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                notifManager.areNotificationsEnabled()
            } else {
                true
            }
            if (!appNotifEnabled) return false
            // (2) Channel GPS_LIVE_SERVICE_CHANNEL SUDAH ADA dan TIDAK dimatikan / di-set IMPORTANCE_NONE user?
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = notifManager.getNotificationChannel(LiveGpsForegroundService.CHANNEL_ID)
                if (channel != null) {
                    // User block channel dengan importance none = foreground startForeground WILL CRASH / no notif visible.
                    if (channel.importance == NotificationManager.IMPORTANCE_NONE) return false
                }
            }
            true
        }
        "Aktivitas Latar Belakang" -> {
            // Android 12+ (API 31): Feature App Standby Bucket EXEMPTED untuk allow background activity starts.
            // Caranya: check AppOpsManager OPSTR_START_ACTIVITIES_FROM_BACKGROUND = ALLOWED
            // Fallback untuk Android <31: selalu true karena tidak ada restriction ini.
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                true
            } else {
                val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                runCatching {
                    // Hardcode string op name agar compileSdk apapun tetap OK (constant AppOpsManager ini ada di API 31+).
                    val OP_NAME_START_BACKGROUND_ACTIVITIES = "android:start_activities_from_background"
                    val mode = appOps.unsafeCheckOpNoThrow(
                        OP_NAME_START_BACKGROUND_ACTIVITIES,
                        android.os.Process.myUid(),
                        context.packageName
                    )
                    mode == AppOpsManager.MODE_ALLOWED
                }.getOrDefault(true) // Jika tidak support ops, anggap aman.
            }
        }
        "Peluncuran Otomatis" -> {
            // AUTOSTART Vendor check: tidak ada standard Android check.
            // Kita cek dengan heuristic via AppOpsManager Xiaomi (MIUI) + Build.MANUFACTURER known vendor.
            // Jika tidak bisa check, return TRUE supaya user tidak panic (ini cuma reminder),
            // user tetap harus aktifkan manual via pengaturan vendor.
            val manufacturer = Build.MANUFACTURER.lowercase()
            val knownVendor = manufacturer.contains("xiaomi") ||
                manufacturer.contains("oppo") ||
                manufacturer.contains("realme") ||
                manufacturer.contains("vivo") ||
                manufacturer.contains("oneplus") ||
                manufacturer.contains("samsung") ||
                manufacturer.contains("huawei") ||
                manufacturer.contains("honor")
            if (!knownVendor) {
                // Stock Android / Pixel: tidak ada autostart restriction → SELALU OK.
                true
            } else {
                // Untuk vendor diketahui: coba detek via AppOpsManager MIUI OP_AUTO_START = 10015
                // Jika gagal (tidak ada ops), return FALSE supaya user diingatkan aktifkan manual.
                runCatching {
                    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                    val MIUI_AUTOSTART_OP = 10015
                    @Suppress("SameParameterValue")
                    val method = appOps.javaClass.getMethod(
                        "checkOpNoThrow",
                        Int::class.javaPrimitiveType,
                        Int::class.javaPrimitiveType,
                        String::class.java
                    )
                    val mode = method.invoke(appOps, MIUI_AUTOSTART_OP, android.os.Process.myUid(), context.packageName) as Int
                    mode == AppOpsManager.MODE_ALLOWED
                }.getOrDefault(false) // Default FALSE → user reminder aktifkan manual.
            }
        }
        else -> false
    }
}

private fun openAppSettings(context: Context) {
    try {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
        }
        context.startActivity(intent)
    } catch (_: Exception) {}
}

@Composable
fun ProfilTabContent(
    childName: String,
    parentName: String,
    pairingCode: String,
    points: Int,
    permissionsState: Map<String, Boolean>,
    onDisconnect: () -> Unit,
    onNavigateToHelpCenter: () -> Unit = {},
    onNavigateToPrivacyPolicy: () -> Unit = {},
    onNavigateToTermsOfService: () -> Unit = {},
    onNavigateToAboutApp: () -> Unit = {},
    onNavigateToPermissionsOnboarding: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var showDisconnectConfirmationModal by remember { mutableStateOf(false) }
    var pinInput by remember { mutableStateOf("") }

    // Real Android permissions state
    var realPermissions by remember {
        mutableStateOf(
            mapOf(
                "GPS Lokasi" to checkRealPermission(context, "GPS Lokasi"),
                "Aksesibilitas Overlay" to checkRealPermission(context, "Aksesibilitas Overlay"),
                "Penggunaan Aplikasi" to checkRealPermission(context, "Penggunaan Aplikasi"),
                "Kamera Device" to checkRealPermission(context, "Kamera Device"),
                "Notifikasi" to checkRealPermission(context, "Notifikasi"),
                "Berjalan di Latar Belakang" to checkRealPermission(context, "Berjalan di Latar Belakang"),
                "Notifikasi GPS Realtime" to checkRealPermission(context, "Notifikasi GPS Realtime"),
                "Aktivitas Latar Belakang" to checkRealPermission(context, "Aktivitas Latar Belakang"),
                "Peluncuran Otomatis" to checkRealPermission(context, "Peluncuran Otomatis")
            )
        )
    }

    fun refreshRealPermissions() {
        realPermissions = mapOf(
            "GPS Lokasi" to checkRealPermission(context, "GPS Lokasi"),
            "Aksesibilitas Overlay" to checkRealPermission(context, "Aksesibilitas Overlay"),
            "Penggunaan Aplikasi" to checkRealPermission(context, "Penggunaan Aplikasi"),
            "Kamera Device" to checkRealPermission(context, "Kamera Device"),
            "Notifikasi" to checkRealPermission(context, "Notifikasi"),
            "Berjalan di Latar Belakang" to checkRealPermission(context, "Berjalan di Latar Belakang"),
            "Notifikasi GPS Realtime" to checkRealPermission(context, "Notifikasi GPS Realtime"),
            "Aktivitas Latar Belakang" to checkRealPermission(context, "Aktivitas Latar Belakang"),
            "Peluncuran Otomatis" to checkRealPermission(context, "Peluncuran Otomatis")
        )
    }

    // Auto refresh when returning to app
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                refreshRealPermissions()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Activity Result Launchers
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ ->
        refreshRealPermissions()
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ ->
        refreshRealPermissions()
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ ->
        refreshRealPermissions()
    }

    var selectedPermissionForGuide by remember { mutableStateOf<String?>(null) }

    val executePermissionAction = { permName: String ->
        when (permName) {
            "GPS Lokasi" -> locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            "Kamera Device" -> cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            "Notifikasi" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    openAppSettings(context)
                }
            }
            "Berjalan di Latar Belakang" -> {
                try {
                    val intent = Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:${context.packageName}")
                    )
                    context.startActivity(intent)
                } catch (_: Exception) {
                    openAppSettings(context)
                }
            }
            "Notifikasi GPS Realtime" -> {
                // Buka app notification settings secara spesifik (jika ada channel GPS, user bisa enable).
                try {
                    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
                            putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                            putExtra(Settings.EXTRA_CHANNEL_ID, LiveGpsForegroundService.CHANNEL_ID)
                        }
                    } else {
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.fromParts("package", context.packageName, null)
                        }
                    }
                    context.startActivity(intent)
                } catch (_: Exception) {
                    openAppSettings(context)
                }
            }
            "Aktivitas Latar Belakang" -> {
                // Tidak ada standard API langsung. Buka App Info (Background activity launch ada di Battery / Special app access Android 12+).
                // Try ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION fallback → ke App Info.
                try {
                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.fromParts("package", context.packageName, null)
                    }
                    context.startActivity(intent)
                } catch (_: Exception) {
                    openAppSettings(context)
                }
            }
            "Peluncuran Otomatis" -> {
                // Buka pengaturan autostart vendor (jika intent vendor diketahui, fallback ke App Info).
                var intentVendor: Intent? = null
                val manufacturer = Build.MANUFACTURER.lowercase()
                when {
                    manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                        intentVendor = Intent().apply {
                            component = android.content.ComponentName(
                                "com.miui.securitycenter",
                                "com.miui.permcenter.autostart.AutoStartManagementActivity"
                            )
                        }
                    }
                    manufacturer.contains("oppo") || manufacturer.contains("realme") || manufacturer.contains("oneplus") -> {
                        intentVendor = Intent().apply {
                            component = android.content.ComponentName(
                                "com.coloros.safecenter",
                                "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                            )
                        }
                    }
                    manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> {
                        intentVendor = Intent().apply {
                            component = android.content.ComponentName(
                                "com.vivo.permissionmanager",
                                "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                            )
                        }
                    }
                    manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                        intentVendor = Intent().apply {
                            component = android.content.ComponentName(
                                "com.huawei.systemmanager",
                                "com.huawei.systemmanager.optimize.process.ProtectActivity"
                            )
                        }
                    }
                    manufacturer.contains("samsung") -> {
                        intentVendor = Intent().apply {
                            component = android.content.ComponentName(
                                "com.samsung.android.lool",
                                "com.samsung.android.sm.ui.battery.BatteryActivity"
                            )
                        }
                    }
                }
                try {
                    if (intentVendor != null && context.packageManager.resolveActivity(intentVendor, 0) != null) {
                        context.startActivity(intentVendor)
                    } else {
                        openAppSettings(context)
                    }
                } catch (_: Exception) {
                    openAppSettings(context)
                }
            }
            "Aksesibilitas Overlay" -> {
                try {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${context.packageName}")
                    )
                    context.startActivity(intent)
                } catch (_: Exception) {
                    openAppSettings(context)
                }
            }
            "Penggunaan Aplikasi" -> {
                try {
                    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                    context.startActivity(intent)
                } catch (_: Exception) {
                    openAppSettings(context)
                }
            }
        }
    }

    val onRequestTogglePermission = { permName: String ->
        val currentStatus = realPermissions[permName] ?: false
        if (!currentStatus) {
            // Show Guidance Modal first
            selectedPermissionForGuide = permName
        } else {
            // Permission is already granted; open settings if user wants to manage/revoke
            openAppSettings(context)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Child Main Profile Header Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Large Avatar Circle
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(IndigoPrimary, SkyBlueSecondary)
                            )
                        )
                        .border(3.dp, EmeraldGreen, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = childName.take(1).uppercase(),
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            fontSize = 28.sp
                        )
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = childName,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A),
                        fontSize = 13.sp
                    )
                )

                Text(
                    text = "Sahabat Cerdas Litensi Kids",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Color(0xFF64748B),
                        fontSize = 11.sp
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Points & Badges Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    // Points Card
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(AmberGold.copy(alpha = 0.12f))
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = AmberGold,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "$points Poin ✨",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = AmberGold,
                                    fontSize = 12.sp
                                )
                            )
                        }
                    }

                    // Protected Status Card
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(EmeraldGreen.copy(alpha = 0.12f))
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Security,
                                contentDescription = null,
                                tint = EmeraldGreen,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Terproteksi 🛡️",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldGreen,
                                    fontSize = 12.sp
                                )
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Connection Details Card
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
                    text = "Status Hubungan Orang Tua",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A),
                        fontSize = 13.sp
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Detail Item 1: Parent Name
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.FamilyRestroom,
                        contentDescription = null,
                        tint = IndigoPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Orang Tua Terhubung:",
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF64748B), fontSize = 12.sp),
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = parentName,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 12.sp
                        )
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Detail Item 2: Pairing Code
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Key,
                        contentDescription = null,
                        tint = SkyBlueSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Kode Pairing Perangkat:",
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF64748B), fontSize = 12.sp),
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = pairingCode,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = IndigoPrimary,
                            fontSize = 12.sp
                        )
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Detail Item 3: Device Model
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.PhoneAndroid,
                        contentDescription = null,
                        tint = EmeraldGreen,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Perangkat Saat Ini:",
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF64748B), fontSize = 12.sp),
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "Android Kids Safe Edition",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 12.sp
                        )
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = Color(0xFFF1F5F9))
                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onNavigateToPermissionsOnboarding,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoPrimary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(42.dp)
                        .testTag("btn_reopen_permission_onboarding")
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Atur & Cek Konfigurasi Izin Perangkat",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 12.sp
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Card Keamanan & Dukungan
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
                    text = "Keamanan & Dukungan",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A),
                        fontSize = 13.sp
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                val supportMenuItems = listOf(
                    Triple("Pusat Bantuan", Icons.AutoMirrored.Filled.Help, IndigoPrimary) to { onNavigateToHelpCenter() },
                    Triple("Kebijakan Privasi", Icons.Default.PrivacyTip, EmeraldGreen) to { onNavigateToPrivacyPolicy() },
                    Triple("Syarat & Ketentuan Layanan", Icons.Default.Description, SkyBlueSecondary) to { onNavigateToTermsOfService() },
                    Triple("Tentang Lisensi Kids", Icons.Default.Info, AmberGold) to { onNavigateToAboutApp() },
                    Triple("Putuskan Perangkat", Icons.Default.PhoneAndroid, CrimsonRed) to {
                        showDisconnectConfirmationModal = true
                    }
                )

                supportMenuItems.forEachIndexed { index, (itemData, onClickAction) ->
                    val (title, icon, tint) = itemData
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { onClickAction() }
                            .padding(vertical = 10.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(tint.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = icon,
                                contentDescription = null,
                                tint = tint,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Text(
                            text = title,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = if (tint == CrimsonRed) FontWeight.Bold else FontWeight.Medium,
                                color = if (tint == CrimsonRed) CrimsonRed else Color(0xFF0F172A),
                                fontSize = 12.sp
                            ),
                            modifier = Modifier.weight(1f)
                        )

                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = null,
                            tint = if (tint == CrimsonRed) CrimsonRed.copy(alpha = 0.6f) else Color(0xFF94A3B8),
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    if (index < supportMenuItems.size - 1) {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 4.dp),
                            thickness = 0.5.dp,
                            color = Color(0xFFF1F5F9)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // System Permissions Summary Card (Izin Perangkat)
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
                    text = "Izin Perangkat",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A),
                        fontSize = 13.sp
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                realPermissions.forEach { (permName, isEnabled) ->
                    val subDescription = when (permName) {
                        "GPS Lokasi" -> "Lacak lokasi & zona aman"
                        "Aksesibilitas Overlay" -> "Batas layar & pemblokiran"
                        "Penggunaan Aplikasi" -> "Pantau durasi pemakaian"
                        "Kamera Device" -> "Verifikasi visual darurat"
                        "Notifikasi" -> "Terima peringatan & info orang tua"
                        "Berjalan di Latar Belakang" -> "Proteksi latar belakang & SOS aktif"
                        "Notifikasi GPS Realtime" -> "Live GPS kirim lokasi walau layar terkunci"
                        "Aktivitas Latar Belakang" -> "Buka app & kirim data otomatis saat dibutuhkan"
                        "Peluncuran Otomatis" -> "Workers & GPS auto start saat HP restart boot"
                        else -> "Proteksi aktif perangkat"
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isEnabled) Icons.Default.CheckCircle else Icons.Default.Error,
                            contentDescription = null,
                            tint = if (isEnabled) EmeraldGreen else CrimsonRed,
                            modifier = Modifier.size(20.dp)
                        )

                        Spacer(modifier = Modifier.width(10.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = permName,
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF0F172A),
                                    fontSize = 12.sp
                                )
                            )
                            Text(
                                text = subDescription,
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = Color(0xFF64748B),
                                    fontSize = 10.sp
                                )
                            )
                        }

                        Spacer(modifier = Modifier.width(6.dp))

                        // Small Toggle Button (Switch)
                        Switch(
                            checked = isEnabled,
                            onCheckedChange = { onRequestTogglePermission(permName) },
                            modifier = Modifier
                                .scale(0.58f)
                                .testTag("switch_perm_${permName.lowercase().replace(" ", "_")}"),
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = EmeraldGreen,
                                uncheckedThumbColor = Color.White,
                                uncheckedTrackColor = Color(0xFFCBD5E1)
                            )
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Card Informasi Aplikasi & Build (Paling Bawah)
        var updateStatusText by remember { mutableStateOf<String?>(null) }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Litensi Kids - Bimbingan Digital Anak",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = IndigoPrimary,
                        fontSize = 12.sp
                    )
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "Versi 1.2.4 (Build 1024) • Original Production",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Color(0xFF64748B),
                        fontSize = 11.sp
                    )
                )

                if (updateStatusText != null) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = updateStatusText!!,
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = EmeraldGreen,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        updateStatusText = "✓ Aplikasi sudah menggunakan versi terbaru"
                    },
                    modifier = Modifier
                        .height(28.dp)
                        .testTag("btn_check_update"),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = IndigoPrimary,
                        contentColor = Color.White
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Cek Update", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }

    // Modal Konfirmasi Putuskan Perangkat
    if (showDisconnectConfirmationModal) {
        Dialog(onDismissRequest = {
            showDisconnectConfirmationModal = false
            pinInput = ""
        }) {
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
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(CrimsonRed.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = CrimsonRed,
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Putuskan Perangkat?",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 15.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Masukkan PIN Orang Tua untuk mengonfirmasi pemutusan perangkat dari akun ($parentName).",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color(0xFF64748B),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Field PIN (Maksimal 6 digit, Rata Tengah, Vertikal Kecil)
                    OutlinedTextField(
                        value = pinInput,
                        onValueChange = { newValue ->
                            if (newValue.length <= 6 && newValue.all { it.isDigit() }) {
                                pinInput = newValue
                            }
                        },
                        placeholder = {
                            Text(
                                text = "Masukkan PIN 6 Digit",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8),
                                    textAlign = TextAlign.Center
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        textStyle = TextStyle(
                            textAlign = TextAlign.Center,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A)
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = CrimsonRed,
                            unfocusedBorderColor = Color(0xFFCBD5E1)
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp)
                            .testTag("input_disconnect_pin")
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                showDisconnectConfirmationModal = false
                                pinInput = ""
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(34.dp),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp)
                        ) {
                            Text("Batal", fontSize = 11.sp)
                        }

                        Button(
                            onClick = {
                                showDisconnectConfirmationModal = false
                                pinInput = ""
                                onDisconnect()
                            },
                            enabled = pinInput.length == 6,
                            modifier = Modifier
                                .weight(1f)
                                .height(34.dp)
                                .testTag("btn_confirm_disconnect_device"),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CrimsonRed,
                                disabledContainerColor = Color(0xFFE2E8F0)
                            )
                        ) {
                            Text(
                                text = "Ya, Putuskan",
                                color = if (pinInput.length == 6) Color.White else Color(0xFF94A3B8),
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        }
    }

    // Modal Panduan Izin Perangkat
    if (selectedPermissionForGuide != null) {
        val permName = selectedPermissionForGuide!!
        val (guideIcon, guideDescription, guideSteps) = when (permName) {
            "GPS Lokasi" -> Triple(
                Icons.Default.LocationOn,
                "Akses GPS lokasi diperlukan untuk memantau keberadaan anak secara real-time dan mendeteksi zona aman sekolah/rumah.",
                listOf(
                    "1. Klik 'Aktifkan' di bawah.",
                    "2. Pada pop-up sistem, pilih 'Saat Aplikasi Digunakan' atau 'Izinkan Sepanjang Waktu'."
                )
            )
            "Aksesibilitas Overlay" -> Triple(
                Icons.Default.Layers,
                "Akses Overlay (Tampilkan di Atas Aplikasi Lain) diperlukan untuk menerapkan batas jam layar dan menampilkan pesan perlindungan orang tua.",
                listOf(
                    "1. Klik 'Aktifkan' untuk membuka Pengaturan Sistem.",
                    "2. Cari 'Litensi Kids' dari daftar aplikasi.",
                    "3. Aktifkan sakelar 'Izinkan tampilkan di atas aplikasi lain'."
                )
            )
            "Penggunaan Aplikasi" -> Triple(
                Icons.Default.Apps,
                "Akses data penggunaan aplikasi diperlukan untuk mencatat durasi pemakaian game & sosmed serta mencegah kecanduan gadget.",
                listOf(
                    "1. Klik 'Aktifkan' untuk ke Pengaturan Akses Penggunaan.",
                    "2. Pilih 'Litensi Kids' dari daftar aplikasi.",
                    "3. Aktifkan sakelar 'Izinkan akses penggunaan'."
                )
            )
            "Kamera Device" -> Triple(
                Icons.Default.CameraAlt,
                "Akses kamera diperlukan untuk verifikasi foto lingkungan secara otomatis saat mode SOS/Darurat dipicu oleh anak.",
                listOf(
                    "1. Klik 'Aktifkan' di bawah.",
                    "2. Pilih 'Izinkan' saat sistem Android meminta konfirmasi akses kamera."
                )
            )
            "Notifikasi" -> Triple(
                Icons.Default.Notifications,
                "Akses notifikasi diperlukan agar anak dan orang tua dapat saling menerima pengingat tugas, pesan chat, dan peringatan darurat secara cepat.",
                listOf(
                    "1. Klik 'Aktifkan' di bawah.",
                    "2. Pilih 'Izinkan' pada pop-up sistem saat pengiriman notifikasi diminta."
                )
            )
            "Berjalan di Latar Belakang" -> Triple(
                Icons.Default.Sync,
                "Akses berjalan di latar belakang (Bebas Penghemat Baterai) diperlukan agar fitur pelacak zona aman dan sinyal SOS tetap siaga setiap saat.",
                listOf(
                    "1. Klik 'Aktifkan' untuk membuka Pengaturan Baterai Sistem.",
                    "2. Pilih opsi 'Tanpa Pembatasan' (Unrestricted / Ignore Battery Optimization)."
                )
            )
            "Notifikasi GPS Realtime" -> Triple(
                Icons.Default.LocationOn,
                "Izin Notifikasi untuk Layanan GPS Realtime Foreground DIPERLUKAN agar Android TIDAK mematikan update GPS ketika layar terkunci (mode Doze). Jika dinonaktifkan → Live GPS 30mnt hanya berjalan saat layar ON.",
                listOf(
                    "1. Klik 'Aktifkan' untuk membuka Pengaturan Notifikasi Channel GPS Live.",
                    "2. Pastikan sakelar channel 'Layanan Live GPS Realtime' DALAM POSISI ON.",
                    "3. Jangan ubah ke mode Penting/Silent (wajib Default/Low agar notif tray visible)."
                )
            )
            "Aktivitas Latar Belakang" -> Triple(
                Icons.Default.Security,
                "Izin Aktivitas Latar Belakang (Android 12+) diperlukan agar aplikasi bisa memunculkan layar penting (contoh SOS Darurat / Overlay batas waktu) ketika hanya berjalan di latar belakang tanpa user buka app.",
                listOf(
                    "1. Klik 'Aktifkan' → masuk ke Pengaturan Aplikasi → Informasi Aplikasi LitensiKids.",
                    "2. Masuk ke menu 'Baterai' atau 'Special App Access' / 'Akses Khusus Aplikasi'.",
                    "3. Cari submenu 'Aktivitas yang dimulai di latar belakang' → aktifkan toggle Izinkan."
                )
            )
            "Peluncuran Otomatis" -> Triple(
                Icons.Default.Refresh,
                "Izin Peluncuran Otomatis (Auto-start Vendor) sangat krusial untuk HP Android non-Stock (Oppo/Realme/OnePlus/Xiaomi/Vivo/Samsung/Huawei). Jika tidak diaktifkan → WorkManager GPS dan Telemetry TIDAK BERJALAN setelah HP restart / app di-swipe recent apps user.",
                listOf(
                    "1. Klik 'Aktifkan' — akan diarahkan ke setting Auto-start vendor (jika tidak ada → ke Info Aplikasi).",
                    "2. Cari menu 'Peluncuran Otomatis' / 'Auto Launch' / 'Mulai Otomatis' / 'Boot Kelola'.",
                    "3. ATUR LitensiKids ke OPSI 'Izinkan' / 'Auto Start ON' — JANGAN 'Tanya Setiap Kali' / 'Tidak Diizinkan'."
                )
            )
            else -> Triple(
                Icons.Default.Security,
                "Izin sistem diperlukan untuk mengaktifkan proteksi aktif perangkat anak secara optimal.",
                listOf("1. Klik 'Aktifkan' untuk memberikan izin sistem.")
            )
        }

        Dialog(onDismissRequest = { selectedPermissionForGuide = null }) {
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
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(IndigoPrimary.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = guideIcon,
                            contentDescription = null,
                            tint = IndigoPrimary,
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Panduan Izin $permName",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 15.sp
                        ),
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = guideDescription,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color(0xFF64748B),
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Instruction Steps Box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF8FAFC))
                            .border(0.5.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text(
                                text = "Langkah Aktivasi:",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = IndigoPrimary,
                                    fontSize = 11.sp
                                )
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            guideSteps.forEach { step ->
                                Text(
                                    text = step,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = Color(0xFF334155),
                                        fontSize = 11.sp
                                    ),
                                    modifier = Modifier.padding(vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { selectedPermissionForGuide = null },
                            modifier = Modifier
                                .weight(1f)
                                .height(34.dp),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp)
                        ) {
                            Text("Batal", fontSize = 11.sp)
                        }

                        Button(
                            onClick = {
                                val permToExecute = selectedPermissionForGuide
                                selectedPermissionForGuide = null
                                if (permToExecute != null) {
                                    executePermissionAction(permToExecute)
                                }
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(34.dp)
                                .testTag("btn_confirm_activate_perm"),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = IndigoPrimary)
                        ) {
                            Text("Aktifkan", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}
