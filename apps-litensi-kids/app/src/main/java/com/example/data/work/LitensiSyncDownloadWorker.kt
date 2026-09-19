package com.example.data.work

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.data.local.LitensiKidsDatabase
import com.example.data.location.GeofenceManager
import com.example.data.repository.LitensiRepository
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

// (P2 SYNC DOWNLOAD WORKER Periodic 15 MENIT SAFETY NET)
// Background WorkManager Periodic minimum 15 menit (sesuai hard limit Google WorkManager Policy)
// Tujuan: Guarantee sync data dari DB server ke Room lokal & Play Services Geofence TETAP UP TO DATE WALAU:
//   - FCM push missed (karena Doze mode, App Standby bucket, offline beberapa jam, HP restart tanpa user buka app)
//   - User menonaktifkan notifikasi / ForceStop app FCM service
// Isi Worker 2 Task UTAMA:
//   1) SYNC PROFIL ANAK LATEST: syncChildProfileFromServer (kuota AV harian, battery_level latest, is_online, screen_time remaining, poin reward)
//   2) RELOAD SEMUA ZONA GEOFENCE LATEST: GeofenceManager.loadAndRegisterAllZones → hapus semua geofence lama Play Services lalu register terbaru dari GF1 API
//
// Jika perangkat BELUM terpairing → worker langsung success tanpa network call.
// Schedule: Setelah pairing SUCCESS (dipanggil di LitensiViewModel L285) + juga via BootCompletedReceiver saat HP restart BOOT.
class LitensiSyncDownloadWorker(
    ctx: Context,
    params: WorkerParameters
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext

        // (1) Ambil state pairing terbaru dari Room (value first Flow, jangan hang collect)
        val db = LitensiKidsDatabase.getDatabase(ctx)
        val repository = LitensiRepository(db = db)
        val pairing = runCatching { repository.pairingState.first() }.getOrNull()
            ?: return Result.retry()

        // Jika BELUM terpairing → tidak ada yang di-sync, sukses tanpa error.
        if (!pairing.isConnected) {
            Log.i(TAG, "SyncDownloadWorker: Skip. Perangkat blm terpairing. isConnected=false")
            return Result.success()
        }

        // (2) Gate kepemilikan: WAJIB ada anakId + userIdOrtu untuk endpoint AN4 & GF1
        val anakId = pairing.profilAnakId ?: return Result.retry()
        val userIdOrtu = pairing.userIdOrtu
        val currentChild = runCatching { db.childProfileDao().getProfile()?.first() }.getOrNull()
        val currentChildId = currentChild?.id ?: 1
        val currentPoints = currentChild?.points ?: 0

        if (userIdOrtu == null || userIdOrtu <= 0) {
            Log.w(TAG, "SyncDownloadWorker: userIdOrtu null/0. Retry (menunggu pairing data lengkap). anakId=$anakId")
            return Result.retry()
        }

        return runCatching {
            // ------------------------------------------------------------------
            // STEP A: SYNC PROFIL ANAK TERBARU DARI SERVER (AN4 endpoint)
            // ------------------------------------------------------------------
            // Catatan: Modul poin reward server-side BELUM ADA endpoint?
            //   repository.syncChildProfileFromServer parameter currentPoints = nilai lokal saat ini → jadi TIDAK di-overwrite dengan 0 dari API (aman).
            repository.syncChildProfileFromServer(
                anakId = anakId,
                currentChildProfileId = currentChildId,
                currentPoints = currentPoints
            )
            Log.i(TAG, "✅ STEP 1/2 Profil Anak sync sukses. anakId=$anakId userIdOrtu=$userIdOrtu. Room ChildProfileEntity di-upsert (kuota/battery/online state SINKRON).")

            // ------------------------------------------------------------------
            // STEP B: RELOAD & RE-REGISTER SEMUA ZONA GEOFENCE TERBARU DARI GF1 API → Play Services GeofencingClient
            // ------------------------------------------------------------------
            // Case sync penting ini: Orang tua tambah zona "Sekolah" via dashboard web → companion app TIDAK buka app selama 2 hari →
            //   FCM push missed → Play Services geofence TIDAK ada zona baru → alarm enter/exit TIDAK FIRE.
            // Solusi: WorkManager periodic 15 menit reload paksa → walau FCM missed, tetap ter-update maks 15 menit kemudian.
            GeofenceManager.loadAndRegisterAllZones(
                context = ctx,
                profilAnakId = anakId,
                userIdOrtu = userIdOrtu
            )
            Log.i(TAG, "✅ STEP 2/2 Geofence reload + register Play Services SUCCESS. anakId=$anakId userIdOrtu=$userIdOrtu. Zone terbaru dari GF1 API terdaftar ENTER/EXIT alarm ready.")

            // ------------------------------------------------------------------
            // RESULT SUCCESS: Next sync scheduled sesuai interval periodic 15 menit
            // ------------------------------------------------------------------
            Log.i(TAG, "🎉 P2 SYNC DOWNLOAD WORKER FULL SUCCESS (2/2 step OK). Next sync otomatis dlm 15 menit.")
            Result.success()
        }.getOrElse { err ->
            // Network error / API down / server maintenance → Retry exponential backoff default WorkManager (tidak fatal)
            Log.w(TAG, "⚠️  SyncDownloadWorker GAGAL (non-fatal, retry nanti): ${err.message}. Cause: ${err.cause?.message}", err)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "LitensiSyncDownload"
        const val UNIQUE_WORK_NAME = "litensi-periodic-sync-download-worker"

        // Schedule PeriodicWorkRequest 15 MENIT MIN ANDROID WORKMANAGER (tidak bisa kurang dari 15!)
        // ExistingPeriodicWorkPolicy.KEEP = jika user buka app BERULANG kali, tidak duplicate schedule, tetap 1 instance saja.
        fun schedulePeriodic(ctx: Context) {
            val workRequest = PeriodicWorkRequestBuilder<LitensiSyncDownloadWorker>(
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
            Log.i(TAG, "schedulePeriodic KEEP → LitensiSyncDownloadWorker 15 menit terdaftar (unique, tdk duplikat).")
        }

        // Cancel worker jika user unpair / disconnect (tidak ada gunanya sync tanpa data pairing).
        fun cancel(ctx: Context) {
            WorkManager.getInstance(ctx).cancelUniqueWork(UNIQUE_WORK_NAME)
            Log.i(TAG, "cancel → Sync download worker dibatalkan (user unpair/disconnect).")
        }
    }
}
