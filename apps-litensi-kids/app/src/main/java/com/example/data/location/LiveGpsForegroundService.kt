package com.example.data.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.data.work.GPSUploadWorker

// (AV6) Foreground Service tipe LOCATION untuk mode Live GPS 5s (30 menit).
// -----------------------------------------------------------------------------------
// ALASAN HARUS FOREGROUND SERVICE (bukan cuma FusedLocation client callback):
//   Saat perangkat HP mode LOCKED / layar MATI, Android akan MEMATIKAN semua
//   FusedLocationProviderClient.requestLocationUpdates() biasa dalam <60 detik
//   (Doze Mode ringan / App Standby Buckets battery optimization).
//   Dengan startForeground + notification permanent (foregroundServiceType=location),
//   Android memberikan PRIORITAS TINGGI dan update GPS 5s TETAP BERJALAN
//   walau layar terkunci 30 MENIT PENUH sesuai mode force.
// Service DI-START saat GPSLocationManager.forceFastMode() dipanggil FCM push.
// Service DI-STOP saat: (1) force untilMs expire, (2) user unpair, (3) app clear.
class LiveGpsForegroundService : Service() {
    companion object {
        private const val TAG = "LiveGpsForegroundSvc"
        const val NOTIF_ID = 1001
        const val CHANNEL_ID = "GPS_LIVE_SERVICE_CHANNEL"
        const val ACTION_STOP = "com.example.litensi.ACTION_STOP_LIVE_GPS_SERVICE"
        private const val WAKELOCK_TAG = "LitensiKids:LiveGpsWakeLock"

        // Helper: start foreground service (dipanggil dari GPSLocationManager forceFastMode).
        // Gunakan ContextCompat.startForegroundService Android 8+ auto startForeground.
        fun start(ctx: Context) {
            val svc = Intent(ctx, LiveGpsForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(svc)
            } else {
                ctx.startService(svc)
            }
            Log.i(TAG, "start: LiveGpsForegroundService intent dikirim (ContextCompat.startForegroundService Android ${Build.VERSION.SDK_INT}).")
        }

        // Helper: stop service (dipanggil saat force expire / unpair / destroy).
        fun stop(ctx: Context) {
            val svc = Intent(ctx, LiveGpsForegroundService::class.java)
            val stopped = ctx.stopService(svc)
            Log.i(TAG, "stop: stopService dipanggil → result=$stopped")
        }
    }

    // Wake lock PARCIAL: agar CPU tidak deep sleep selama GPS update 5s jalan.
    // SCREEN_BRIGHT_WAKE_LOCK dilarang (boros baterai), cukup CPU on saja.
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate: Service dibuat, buat channel notif + wakeLock aquire.")
        buatChannelNotifikasiJikaBelumAda()
        ambilWakeLockCpu()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand: intent.action=${intent?.action} startId=$startId")

        // Jika user klik tombol STOP di notif / GPSLocationManager panggil stop via action
        if (intent?.action == ACTION_STOP) {
            Log.i(TAG, "onStartCommand: ACTION_STOP diterima → stopSelf()")
            stopSelf(startId)
            return START_NOT_STICKY
        }

        // StartForeground WAJIB dalam 5 detik setelah service start (Android 8+)
        // Jika tidak → ANR / ForegroundServiceDidNotStartInTimeException.
        val notif = buatNotificationLiveGps()
        startForeground(NOTIF_ID, notif)

        // (PENTING!) Saat service start → restart GPSLocationManager request agar
        //  Play Services FusedLocation TAHU bahwa sekarang sudah ada foreground service
        //  dan TIDAK akan mematikan update walau screen off.
        GPSLocationManager.restartLocationRequestJikaAktif(this)

        // Satu kali expedited upload awal agar marker web berubah dalam <10s
        runCatching { GPSUploadWorker.enqueueExpeditedOneTime(this) }
            .onFailure { err -> Log.w(TAG, "enqueueExpeditedOneTime start fail: ${err.message}") }

        // START_STICKY: jika system kill service karena memori → Android AUTO RESTART
        //  service nanti dengan null intent. Untuk mode GPS live 30mnt, ini = behaviour diinginkan.
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null // Tidak butuh bind, start service saja.

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "onDestroy: Service dihancurkan → lepas wakeLock + remove foreground notif.")
        lepasWakeLock()
        runCatching { stopForeground(STOP_FOREGROUND_REMOVE) }
            .onFailure { err -> Log.w(TAG, "stopForeground fail: ${err.message}") }
    }

    // --- Helper Internal ---
    private fun buatChannelNotifikasiJikaBelumAda() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Layanan Live GPS Realtime",
                    NotificationManager.IMPORTANCE_LOW // Penting LOW: tidak muncul heads-up, tapi notif tray PERMANEN ADA (required untuk foreground type=location).
                ).apply {
                    description = "Layanan yang menjaga agar GPS tracking 5 detik tetap berjalan walau layar HP terkunci selama 30 menit mode Live GPS."
                    setShowBadge(true)
                }
                nm.createNotificationChannel(channel)
                Log.i(TAG, "buatChannelNotifikasi: Channel $CHANNEL_ID created (IMPORTANCE_LOW).")
            }
        }
    }

    // Build permanent notification untuk foreground service.
    // Ketentuan Google Developer Policy: notif HARUS jelas menjelaskan kegunaan
    //  (tidak boleh vague), dan ada tombol STOP agar user bisa hentikan kapanpun.
    private fun buatNotificationLiveGps(): Notification {
        val ctx = this
        // Tap notif → buka MainActivity app (biar user bisa ke dashboard / setting)
        val openIntent = Intent(ctx, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val piOpen = PendingIntent.getActivity(
            ctx, 101, openIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            else PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Tombol aksi STOP → kirim ACTION_STOP ke service sendiri agar berhenti graceful.
        val stopIntent = Intent(ctx, LiveGpsForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val piStop = PendingIntent.getService(
            ctx, 102, stopIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            else PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Baca durasi sisa dari SharedPrefs untuk ditampilkan di notif (jika ada)
        val prefs = ctx.getSharedPreferences(GPSLocationManager.PREFS_NAME, Context.MODE_PRIVATE)
        val untilMs = prefs.getLong(GPSLocationManager.KEY_FORCE_FAST_UNTIL_MS, 0L)
        val sisaMenit = ((untilMs - System.currentTimeMillis()) / 60_000L).coerceAtLeast(0L)
        val intervalMs = prefs.getLong(GPSLocationManager.KEY_FORCE_FAST_INTERVAL_MS, 5_000L)

        val bigText = ("Orang tua memantau lokasi secara realtime selama ${sisaMenit} menit lagi. " +
            "GPS akan update tiap ${intervalMs / 1000} detik walau layar terkunci. " +
            "Setelah selesai otomatis kembali hemat baterai.")

        return NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation) // Icon sistem "lokasi" agar user jelas
            .setContentTitle("📍 Litensi Live GPS Aktif")
            .setContentText("Realtime ${intervalMs / 1000}s • Sisa ${sisaMenit} menit • Tap untuk buka app")
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setContentIntent(piOpen)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Berhenti", piStop)
            .setOngoing(true) // Ongoing: user tidak bisa swipe menghapus (sticky foreground)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE) // Android 12+ sesaat start langsung notif
            .build()
    }

    private fun ambilWakeLockCpu() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKELOCK_TAG).apply {
            setReferenceCounted(false)
            // Acquire maksimal 35 menit (lebih dari max force 240 menit ada coerceIn tadi, jadi 35 cukup aman untuk 30mnt default)
            acquire((35 * 60 * 1000L).coerceAtLeast(60_000L))
        }
        Log.i(TAG, "ambilWakeLockCpu: PARTIAL_WAKE_LOCK di-acquire (CPU tetap bangun, layar OFF oke).")
    }

    private fun lepasWakeLock() {
        val wl = wakeLock ?: return
        if (wl.isHeld) runCatching { wl.release() }
            .onSuccess { Log.i(TAG, "lepasWakeLock: Release berhasil.") }
            .onFailure { err -> Log.w(TAG, "lepasWakeLock fail: ${err.message}") }
        wakeLock = null
    }
}
