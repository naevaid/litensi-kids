package com.example.service

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.MainActivity
import com.parental.litensikids.R
import com.example.data.local.LitensiKidsDatabase
import com.example.data.location.GeofenceManager
import com.example.data.repository.LitensiRepository
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

// ============================================================================
// F5.1: Firebase Cloud Messaging Service untuk Companion Android (perangkat anak)
// ----------------------------------------------------------------------------
// 2 Tanggung Jawab Utama:
//   1. onNewToken(token)  → Refresh token FCM jika berubah, upload ke backend
//                           via endpoint F3 POST /anak/{id}/fcm-token (gate ownership).
//   2. onMessageReceived  → Handle push notifikasi yang datang saat app
//                           foreground/background, tampilkan sesuai event_type.
// Pattern Graceful: Semua exception di-wrap try/catch agar TIDAK crash app.
// ============================================================================
class LitensiFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "LitensiFcmService"
        // Channel ID SESUAI dengan FcmPushService.php AndroidConfig.notification.channel_id
        private const val CHANNEL_ID_PENGASUHAN = "PENGASUHAN_CH"
        private const val CHANNEL_NAME = "Notifikasi Pengasuhan Anak"
        private const val CHANNEL_DESC = "Notifikasi realtime: geofence, chat baru, perintah remote"
        const val RC_NOTIF_OPEN_MAIN = 2001
    }

    // Service lifecycle scope — IO dispatcher untuk network / DB operation.
    // SupervisorJob: satu child gagal TIDAK membatalkan sibling yang lain.
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Lazy init Room Database + Repository (butuh Context, hanya diambil saat dibutuhkan).
    private val repository: LitensiRepository by lazy {
        val db = LitensiKidsDatabase.getDatabase(applicationContext)
        LitensiRepository(db)
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        Log.d(TAG, "FcmService onDestroy — scope coroutine dibersihkan.")
    }

    // ========================================================================
    // (1) Token Refresh Handler — dipanggil Firebase jika token BERUBAH
    //   (kasus: cache invalid, clear app data, reinstall, rotate key server).
    // ========================================================================
    @Deprecated("Overrides deprecated member in FirebaseMessagingService")
    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "onNewToken di-trigger, prefix token: ${token.take(10)}... (panjang=${token.length})")
        if (token.isBlank()) {
            Log.w(TAG, "Token kosong — skip upload.")
            return
        }
        // Jalankan di IO scope: baca state Room PairingState + upload ke backend.
        serviceScope.launch {
            runCatching {
                val currentState = repository.pairingState.firstOrNull()
                if (currentState?.isConnected != true) {
                    Log.w(TAG, "Pairing state belum connected — skip upload FCM token.")
                    return@launch
                }
                val anakId = currentState.profilAnakId
                val pin = currentState.pinPairing
                val qr = currentState.qrPairingCode
                if (anakId == null || (pin.isNullOrBlank() && qr.isNullOrBlank())) {
                    Log.w(TAG, "Gate kepemilikan: anakId/pin/qr tidak lengkap — skip upload token. anakId=$anakId, pinLen=${pin?.length ?: 0}, qrLen=${qr?.length ?: 0}")
                    return@launch
                }
                val result = repository.updateFcmTokenAnak(
                    token = token,
                    id = anakId,
                    pairingPin = pin,
                    qrPairingCode = qr
                )
                Log.d(TAG, "Upload FCM token BERHASIL: tokenLen=${result.fcmTokenLength}, updatedAt=${result.updatedAt}, revoked=${result.tokenRevoked}")
            }.onFailure { err ->
                Log.e(TAG, "Upload FCM token GAGAL (non-fatal, retry on next onNewToken): ${err.message}", err)
            }
        }
    }

    // ========================================================================
    // (2) Push Notifikasi Incoming Handler — foreground + background data payload
    // ========================================================================
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        runCatching {
            val notification = remoteMessage.notification
            val data = remoteMessage.data
            val eventType = data["event_type"] ?: "default"

            // (A) Extract title + body: priority notification FCM > data title/body
            val title = notification?.title
                ?: data["title"]
                ?: when (eventType) {
                    "geofence_enter" -> "Anak Masuk Zona Aman"
                    "geofence_exit" -> "Anak Keluar Zona Aman"
                    "remote_lock" -> "Perangkat Dikunci Otomatis"
                    "chat_new" -> "Pesan Baru dari Orang Tua"
                    "broadcast_pesan" -> "Pesan Pengumuman Baru"
                    else -> "Notifikasi Litensi Kids"
                }
            val body = notification?.body
                ?: data["body"]
                ?: when (eventType) {
                    "geofence_enter" -> "Perangkat anak memasuki area aman yang ditentukan."
                    "geofence_exit" -> "Perangkat anak keluar dari batas area aman yang ditentukan."
                    "remote_lock" -> "Orang tua mengunci perangkat dari jarak jauh untuk melindungi anak."
                    "chat_new" -> "Orang tua mengirim pesan baru — buka halaman Chat untuk melihat."
                    "broadcast_pesan" -> "Ada pengumuman baru dari dashboard orang tua — cek Inbox."
                    else -> "Pembaruan terbaru dari aplikasi pengasuhan anak."
                }

            Log.d(TAG, "Push diterima — event_type=$eventType, titleLen=${title.length}, bodyLen=${body.length}")

            // (B) Cek Runtime Permission POST_NOTIFICATIONS (Android 13+ API 33).
            //     Jika user deny → skip show notification (graceful TIDAK crash).
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = ActivityCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    Log.w(TAG, "Permission POST_NOTIFICATIONS BELUM di-granted user — skip tampilkan notifikasi.")
                    return@runCatching
                }
            }

            // (C) Pastikan Notification Channel ADA (Android O API 26+ WAJIB).
            ensureNotificationChannelExists()

            // (D) Build PendingIntent untuk buka MainActivity saat user klik notifikasi.
            val openIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                // Pass extra event_type untuk MainActivity bisa navigate ke tab yang sesuai nanti
                putExtra("fcm_event_type", eventType)
                data["anak_id"]?.toIntOrNull()?.let { putExtra("anak_id", it) }
            }
            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(
                this, RC_NOTIF_OPEN_MAIN, openIntent, pendingIntentFlags
            )

            // (E) Build NotificationCompat sesuai event_type priority.
            val smallIcon = R.mipmap.ic_launcher
            val vibratePattern = longArrayOf(200, 100, 200)
            val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID_PENGASUHAN)
                .setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(
                    when (eventType) {
                        "geofence_exit", "remote_lock", "sos_alert" -> NotificationCompat.PRIORITY_MAX
                        else -> NotificationCompat.PRIORITY_HIGH
                    }
                )
                .setCategory(
                    when (eventType) {
                        "geofence_enter", "geofence_exit" -> NotificationCompat.CATEGORY_STATUS
                        "chat_new" -> NotificationCompat.CATEGORY_MESSAGE
                        "remote_lock" -> NotificationCompat.CATEGORY_ALARM
                        else -> NotificationCompat.CATEGORY_EVENT
                    }
                )
                .setVibrate(vibratePattern)
                .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE) // Hide sensitive di lockscreen

            // (F) Kirim notifikasi ke system tray.
            val notifId = (System.currentTimeMillis() and 0xFFFF).toInt()
            with(NotificationManagerCompat.from(this)) {
                notify(notifId, notificationBuilder.build())
            }
            Log.d(TAG, "Notifikasi ditampilkan (id=$notifId, channel=$CHANNEL_ID_PENGASUHAN)")

            // ============================================================================
            // (P1 REALTIME SYNC DATA) — SETELAH NOTIF TAMPIL, LANJUT SYNC DATA KE ROOM LOKAL.
            // ----------------------------------------------------------------------------
            // Ini ROOT CAUSE kenapa data di Android SEBELUMNYA TIDAK realtime:
            //   onMessageReceived HANYA menampilkan notifikasi UI HEADS UP,
            //   TAPI TIDAK MEMPERBARUI Room DB lokal yang menjadi sumber StateFlow UI Compose!
            // Hasil perbaikan ini: setiap push FCM data payload masuk,
            //   StateFlow pairngState / childProfile / tasks / rewards otomatis rerender
            //   secara reactive VIA FLOW COLLECT tanpa user perlu restart / close app.
            // ============================================================================
            serviceScope.launch {
                runCatching {
                    // (1) Baca state pairing dari Room (pastikan sudah connect & gate kepemilikan).
                    val currentPairing = repository.pairingState.firstOrNull()
                        ?: run {
                            Log.w(TAG, "FCM sync: PairingState Room null/belum terhubung → skip sync.")
                            return@launch
                        }
                    if (!currentPairing.isConnected) {
                        Log.w(TAG, "FCM sync: isConnected=false (sudah unpair) → skip sync.")
                        return@launch
                    }
                    val anakId = currentPairing.profilAnakId ?: run {
                        Log.w(TAG, "FCM sync: profilAnakId null → skip sync.")
                        return@launch
                    }
                    val userIdOrtu = currentPairing.userIdOrtu
                    val ctx = applicationContext

                    // (2) Ambil nilai saat ini ChildProfile untuk preserve points (JANGAN overwrite 0!)
                    val currentChild = repository.childProfile.firstOrNull()

                    // ------------------------------------------------------------------
                    // SYNC HANDLER 1: EVENT YANG MENGUBAH PROFIL ANAK (KUOTA / BATTERY)
                    //   → trigger: profil_update, remote_lock, sos_alert, broadcast_pesan
                    // ------------------------------------------------------------------
                    val needSyncProfile = when (eventType) {
                        "profil_update", "remote_lock", "sos_alert",
                        "broadcast_pesan", "profile_update", "profile_updated" -> true
                        else -> false
                    }
                    if (needSyncProfile) {
                        runCatching {
                            repository.syncChildProfileFromServer(
                                anakId = anakId,
                                currentChildProfileId = currentChild?.id ?: 1L,
                                currentPoints = currentChild?.points ?: 0
                            )
                            Log.i(TAG, "FCM sync (P1 ✅): Profil Anak id=$anakId di-refresh via AN4 endpoint (kuota/battery/online state).")
                        }.onFailure { err ->
                            Log.e(TAG, "FCM sync Profile GAGAL (non-fatal, retry next sync): ${err.message}", err)
                        }
                    }

                    // ------------------------------------------------------------------
                    // SYNC HANDLER 2: EVENT YANG MENGUBAH DATA GEOFENCE
                    //   → trigger: geofence_enter, geofence_exit, geofence_update, geofence_changed, zone_updated
                    //   Action: remove old zones + reload + register zones BARU dari GF1 backend ke Play Services
                    //   Hasil: Alarm ENTER/EXIT geofence TERBARU langsung AKTIF
                    //     TANPA user harus Force Close + restart aplikasi Android.
                    // ------------------------------------------------------------------
                    val needSyncGeofence = when (eventType) {
                        "geofence_enter", "geofence_exit",
                        "geofence_update", "geofence_changed",
                        "zone_updated", "zone_added", "zone_deleted",
                        "safezone_updated" -> true
                        else -> false
                    }
                    if (needSyncGeofence && userIdOrtu != null && userIdOrtu > 0) {
                        runCatching {
                            GeofenceManager.loadAndRegisterAllZones(
                                context = ctx,
                                profilAnakId = anakId,
                                userIdOrtu = userIdOrtu
                            )
                            Log.i(TAG, "FCM sync (P1 ✅): Geofence reload + register sukses untuk anak=$anakId user=$userIdOrtu.")
                        }.onFailure { err ->
                            Log.e(TAG, "FCM sync Geofence GAGAL (non-fatal, retry next sync): ${err.message}", err)
                        }
                    }

                    // ------------------------------------------------------------------
                    // SYNC HANDLER 3: EVENT CHAT BARU / BROADCAST PESAN
                    //   → trigger: chat_new, broadcast_pesan
                    //   Action: (A) fetchChatMessages terbaru dari CH2 backend
                    //              TIDAK PERLU save ke Room (Chat simpan di ViewModel StateFlow
                    //              CHAT SCOPE) → saat user tap Notif → buka MainActivity
                    //              FLAG_ACTIVITY_CLEAR_TOP → LitensiViewModel init collect pairing
                    //              TIDAK fire lagi. KITA BUTUH ViewModel bisa observe event.
                    //           (B) SOLUSI LEBIH SIMPLE DAN EFFECTIVE:
                    //              Fetch chat & update state CHAT di FCM service → SUDAH
                    //              otomatis tersimpan di cache. ViewModel di MainActivity
                    //              ketika akan di-create ulang dari pendingIntent CLEAR_TOP
                    //              akan memanggil fetchChatMessages LAGI via L184 collect
                    //              pairingState → konsisten.
                    //   Hasil: user KLIK notif chat → MainActivity CLEAR TOP
                    //          → ChatTabContent SUDAH MENAMPILKAN PESAN TERBARU.
                    // ------------------------------------------------------------------
                    val needRefreshChat = (eventType == "chat_new" || eventType == "broadcast_pesan")
                    if (needRefreshChat && userIdOrtu != null && userIdOrtu > 0) {
                        runCatching {
                            repository.fetchChatMessages(
                                anakId = anakId,
                                userIdOrtu = userIdOrtu,
                                page = 1,
                                perPage = 50
                            )
                            Log.i(TAG, "FCM sync (P1 ✅): Chat list anak=$anakId refresh sukses 50 rows terbaru CH2 endpoint.")
                        }.onFailure { err ->
                            Log.e(TAG, "FCM sync Chat GAGAL (non-fatal, coba saat buka app): ${err.message}", err)
                        }
                    }

                }.onFailure { errGlobal ->
                    Log.e(TAG, "FCM sync scope GAGAL global (non-fatal): ${errGlobal.message}", errGlobal)
                }
            }
        }.onFailure { err ->
            Log.e(TAG, "Handle push notifikasi GAGAL (non-fatal, skip): ${err.message}", err)
        }
    }

    // ========================================================================
    // Helper: Buat Notification Channel untuk Android O ke atas (API 26+).
    // Channel TIDAK BISA DIUBAH setelah dibuat (hanya create ulang ID baru).
    // ========================================================================
    private fun ensureNotificationChannelExists() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val existing = notificationManager.getNotificationChannel(CHANNEL_ID_PENGASUHAN)
        if (existing != null) {
            Log.d(TAG, "Notification channel sudah ada sebelumnya — skip create.")
            return
        }
        val channel = NotificationChannel(
            CHANNEL_ID_PENGASUHAN, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = CHANNEL_DESC
            enableLights(true)
            enableVibration(true)
            vibrationPattern = longArrayOf(200, 100, 200)
            setShowBadge(true)
        }
        notificationManager.createNotificationChannel(channel)
        Log.d(TAG, "Notification channel BARU berhasil dibuat: $CHANNEL_ID_PENGASUHAN")
    }
}
