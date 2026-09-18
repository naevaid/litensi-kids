package com.example.data.work

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.BatteryManager
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import android.util.Log
import com.example.data.local.LitensiKidsDatabase
import com.example.data.repository.LitensiRepository
import kotlinx.coroutines.flow.first
import java.util.Calendar
import java.util.concurrent.TimeUnit

// CoroutineWorker untuk upload telemetry berkala (battery + used_today) ke backend via AN8 endpoint.
// Dijadwalkan sebagai PeriodicWorkRequest interval MIN 15 MENIT (batas minimum system Android).
// Jika perangkat BELUM terpairing → worker langsung success tanpa network call.
class LitensiTelemetryWorker(
    ctx: Context,
    params: WorkerParameters
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext

        // 1. Ambil state pairing dari Room (first value Flow, jangan hang collect)
        val db = LitensiKidsDatabase.getDatabase(ctx)
        val repository = LitensiRepository(db = db)
        val pairing = runCatching { repository.pairingState.first() }.getOrNull()
            ?: return Result.retry()

        // Jika BELUM terpairing → tidak ada yang di-upload, sukses tanpa error.
        if (!pairing.isConnected) {
            return Result.success()
        }

        // 2. Gate kepemilikan: WAJIB ada (anakId + pairingPin/qrPairingCode) agar endpoint AN8 tidak 403.
        val anakId = pairing.profilAnakId
            ?: return Result.retry()
        val pinPairing = pairing.pinPairing
        val qrPairingCode = pairing.qrPairingCode
        if (pinPairing.isNullOrBlank() && qrPairingCode.isNullOrBlank()) {
            Log.e(TAG, "TelemetryWorker: Gate pin/qr kosong. Retry.")
            return Result.retry()
        }

        // 3. Hitung battery level saat ini (0-100 integer)
        val batteryLevel = hitungBatteryLevel(ctx)

        // 4. Hitung total waktu layar HARI INI (00:00 s.d. sekarang) dalam satuan menit integer
        val usedTodayMinutes = hitungUsageStatsHariIni(ctx)

        // 5. Upload ke backend via AN8 (repository sudah wrap error handling).
        return runCatching {
            repository.uploadTelemetry(
                anakId = anakId,
                pairingPin = pinPairing,
                qrPairingCode = qrPairingCode,
                batteryLevel = batteryLevel,
                isOnline = true,
                usedTodayMinutes = usedTodayMinutes
            )
            Result.success()
        }.getOrElse { err ->
            Log.w(TAG, "TelemetryWorker gagal upload: ${err.message}. Retry exponential backoff.")
            Result.retry()
        }
    }

    // Hitung battery level (0-100) via BatteryManager system service.
    private fun hitungBatteryLevel(ctx: Context): Int {
        val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return level.coerceIn(0, 100)
    }

    // Hitung total durasi foreground usage SEMUA package hari ini (00:00 - sekarang) dalam menit.
    // Izin PACKAGE_USAGE_STATS wajib (sudah ada di AndroidManifest + user di-approve ketika onboarding permission).
    // @Suppress DEPRECATION: MOVE_TO_FOREGROUND / MOVE_TO_BACKGROUND deprecated API 34 tapi value int backward compat.
    // SDK 34+ pakai constant baru ACTIVITY_RESUMED / ACTIVITY_PAUSED, else fallback constant deprecated.
    @Suppress("DEPRECATION")
    private fun hitungUsageStatsHariIni(ctx: Context): Int {
        // Check app ops PACKAGE_USAGE_STATS granted?
        if (!cekUsageStatsPermission(ctx)) return 0

        val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val mulaiHariIni = cal.timeInMillis
        val sekarang = System.currentTimeMillis()

        // (Warning Cleanup 2) Constant UsageEvents deprecated targetSdk 36.
        // SDK ≥ 34 (UPSIDE_DOWN_CAKE) pakai ACTIVITY_RESUMED = 19 / ACTIVITY_PAUSED = 23.
        // SDK < 34 fallback constant deprecated MOVE_TO_FOREGROUND (1) / MOVE_TO_BACKGROUND (2).
        val eventStart = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
            UsageEvents.Event.ACTIVITY_RESUMED else UsageEvents.Event.MOVE_TO_FOREGROUND
        val eventEnd = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
            UsageEvents.Event.ACTIVITY_PAUSED else UsageEvents.Event.MOVE_TO_BACKGROUND

        val events = usm.queryEvents(mulaiHariIni, sekarang)
        val event = UsageEvents.Event()
        val lastForegroundTime = hashMapOf<String, Long>() // packageName -> start time resume
        var totalMilliseconds: Long = 0

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            when (event.eventType) {
                eventStart -> {
                    lastForegroundTime[event.packageName] = event.timeStamp
                }
                eventEnd -> {
                    val startTime = lastForegroundTime.remove(event.packageName) ?: continue
                    if (event.timeStamp > startTime) {
                        totalMilliseconds += (event.timeStamp - startTime)
                    }
                }
            }
        }

        val sisaDetikPerPackage = lastForegroundTime.values.sumOf { startTime ->
            if (sekarang > startTime) (sekarang - startTime) else 0L
        }
        totalMilliseconds += sisaDetikPerPackage
        val menit = TimeUnit.MINUTES.convert(totalMilliseconds, TimeUnit.MILLISECONDS)
        return menit.coerceIn(0, 24 * 60).toInt()
    }

    private fun cekUsageStatsPermission(ctx: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                ctx.packageName
            )
            mode == AppOpsManager.MODE_ALLOWED
        } else {
            true
        }
    }

    companion object {
        private const val TAG = "LitensiTelemetryWork"
        // Unique work name (supaya tidak duplicate tiap kali app start schedule)
        const val UNIQUE_WORK_NAME = "litensi-periodic-telemetry-worker"

        // Schedule worker periodic 15 menit (batas minimum Android system).
        // ExistingPeriodicWorkPolicy.KEEP = jika sudah ada schedule, TIDAK dibuat ulang.
        fun schedulePeriodic(ctx: Context) {
            val workRequest = PeriodicWorkRequestBuilder<LitensiTelemetryWorker>(
                repeatInterval = 15,
                repeatIntervalTimeUnit = TimeUnit.MINUTES
            )
                .addTag(UNIQUE_WORK_NAME)
                .build()
            WorkManager.getInstance(ctx)
                .enqueueUniquePeriodicWork(
                    UNIQUE_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    workRequest
                )
        }

        // Cancel worker jika user disconnect pairing (tidak ada gunanya upload telemetry tanpa data perangkat).
        fun cancel(ctx: Context) {
            WorkManager.getInstance(ctx).cancelUniqueWork(UNIQUE_WORK_NAME)
        }
    }
}
