package com.example.data.work

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.data.local.LitensiKidsDatabase
import com.example.data.model.PergerakanGpsCacheEntity
import com.example.data.repository.LitensiRepository
import kotlinx.coroutines.flow.first
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

// (G3.6) CoroutineWorker untuk flush batch GPS pending dari Room cache ke backend endpoint AN10.
// Pattern EXACT MIRROR LitensiTelemetryWorker (periodic 15 menit). Tambah expedited OneTimeWork untuk trigger geofence event upload segera.
// Logika: batch 10 row PENDING → upload satu per satu via repository → mark SYNCED/FAILED → hapus synced → Result.retry() jika ada FAILED.
class GPSUploadWorker(
    ctx: Context,
    params: WorkerParameters
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val db = LitensiKidsDatabase.getDatabase(ctx)
        val repository = LitensiRepository(db = db)
        val gpsCacheDao = db.gpsCacheDao()

        // 1. Ambil state pairing dari Room (Flow.first → JANGAN collect hang!).
        val pairing = runCatching { repository.pairingState.first() }.getOrNull()
            ?: return Result.retry()

        // Jika BELUM terpairing → kosongkan cache (tidak ada gunanya) dan sukses tanpa network call.
        if (!pairing.isConnected) {
            runCatching { gpsCacheDao.clearAll() }
            Log.i(TAG, "GPSUploadWorker: Belum terpairing. Skip upload & clear cache.")
            return Result.success()
        }

        // 2. Gate kepemilikan: WAJIB ada (anakId + pairingPin/qrPairingCode) minimal salah satu non-empty.
        val anakId = pairing.profilAnakId
            ?: return Result.retry()
        val pinPairing = pairing.pinPairing
        val qrPairingCode = pairing.qrPairingCode
        if (pinPairing.isNullOrBlank() && qrPairingCode.isNullOrBlank()) {
            Log.e(TAG, "GPSUploadWorker: Gate pin/qr kosong. Retry.")
            return Result.retry()
        }

        // 3. Cap storage: Jika pending > 1000 row → hapus 100 row tertua agar storage tidak penuh.
        runCatching {
            val pendingCount = gpsCacheDao.countPending()
            if (pendingCount > MAX_PENDING_ROW_CAP) {
                gpsCacheDao.deleteOldestRows(100)
                Log.w(TAG, "GPSUploadWorker: pending=$pendingCount > cap, hapus 100 row tertua.")
            }
        }

        // 4. Ambil batch pending = 10 row FIFO (capturedAt ASC → row paling tua diupload duluan).
        val batch = runCatching { gpsCacheDao.getPendingBatch(BATCH_LIMIT) }.getOrNull()
            ?: return Result.retry()
        if (batch.isEmpty()) {
            Log.i(TAG, "GPSUploadWorker: Tidak ada pending batch kosong. Sukses idle.")
            return Result.success()
        }

        Log.i(TAG, "GPSUploadWorker: Start flush ${batch.size} pending → id=$anakId")

        // 5. Loop setiap row → upload → update status SYNCED / FAILED (graceful non-fatal: satu row gagal tidak block yang lain)
        var adaGagal = false
        for (gpsRow in batch) {
            val capturedAtIso = convertEpochMillisToIsoUtc(gpsRow.capturedAtEpochMillis)
            val hasil = runCatching {
                repository.uploadGpsPergerakan(
                    anakId = anakId,
                    pairingPin = pinPairing,
                    qrPairingCode = qrPairingCode,
                    latitude = gpsRow.latitude,
                    longitude = gpsRow.longitude,
                    capturedAtIso = capturedAtIso,
                    accuracyMeters = gpsRow.accuracyMeters,
                    batteryLevel = gpsRow.batteryLevel,
                    speedKmh = gpsRow.speedKmh,
                    altitudeMeters = gpsRow.altitudeMeters,
                    isMockDetected = gpsRow.isMockDetected
                )
            }
            if (hasil.isSuccess) {
                    // Sukses → update SYNCED
                    val syncedRow = gpsRow.copy(
                        syncStatus = PergerakanGpsCacheEntity.SYNC_STATUS_SYNCED,
                        lastError = null
                    )
                    runCatching { gpsCacheDao.updateGpsPoint(syncedRow) }
                    val resp = hasil.getOrNull()
                    Log.d(TAG, "  OK gps_id=${resp?.gpsId} jarak=${resp?.distanceFromLastKnownMeters}m zona=${resp?.isInsideAnyActiveZone}")
                } else {
                    // Gagal → increment retry count + mark FAILED (jika > MAX_RETRY → hapus row corrupt)
                    val errMsg = hasil.exceptionOrNull()?.message ?: "unknown error"
                    val retryBaru = gpsRow.retryCount + 1
                    if (retryBaru > MAX_RETRY_PER_ROW) {
                        Log.e(TAG, "  !! Row id=${gpsRow.id} retry > MAX_RETRY. Hapus row corrupt. Err=$errMsg")
                        // Row corrupt langsung hapus permanen via UPDATE ke dao? Tidak bisa @Delete? Kita mark FAILED + retryCount max, nanti tidak akan diambil getPendingBatch WHERE syncStatus='pending' lho. Cek: getPendingBatch hanya WHERE syncStatus='pending' → row FAILED tidak akan di-retrieve lagi, jadi tidak akan diupload lagi.
                        val failedRow = gpsRow.copy(
                            syncStatus = PergerakanGpsCacheEntity.SYNC_STATUS_FAILED,
                            retryCount = retryBaru,
                            lastError = "MAX_RETRY_EXCEEDED: $errMsg"
                        )
                        runCatching { gpsCacheDao.updateGpsPoint(failedRow) }
                    } else {
                        adaGagal = true
                        val failedRow = gpsRow.copy(
                            syncStatus = PergerakanGpsCacheEntity.SYNC_STATUS_FAILED,
                            retryCount = retryBaru,
                            lastError = errMsg
                        )
                        // ! PENTING: syncStatus FAILED → PERLU di-RESET kembali ke PENDING saat worker run berikutnya agar diikutsertakan lagi? Kita modifikasi query getPendingBatch OR syncStatus IN ('pending','failed') ya biar FAILED juga ikut? TAPI kode sekarang getPendingBatch cuma WHERE syncStatus='pending'. Kita rubah line ini → KEMBALI set syncStatus PENDING saat retry berikutnya? ATAU rubah getPendingBatch querynya.

                        // Opsi yang lebih simple: Di worker, sebelum gagal → KEMBALI set ke PENDING, karena FAILED cuma state temporary? ATAU langsung set syncStatus = PENDING + increment retryCount. Biar getPendingBatch (WHERE pending) ikut ke loop lagi. YANG BENAR: syncStatus = PENDING (agar next run ikut lagi). retryCount sudah tercatat. lastError diisi pesan error.
                        val retryRow = gpsRow.copy(
                            syncStatus = PergerakanGpsCacheEntity.SYNC_STATUS_PENDING,
                            retryCount = retryBaru,
                            lastError = errMsg
                        )
                        runCatching { gpsCacheDao.updateGpsPoint(retryRow) }
                        Log.w(TAG, "  !! Gagal upload id=${gpsRow.id} retry=$retryBaru. Retry next run: $errMsg")
                    }
                }
        }

        // 6. Hapus SEMUA row yang status SYNCED dari cache local (hemat storage).
        runCatching { gpsCacheDao.deleteSyncedRows() }

        // 7. Return: Jika ADA row gagal (retryBaru <= MAX_RETRY) → Result.retry() exponential backoff default WorkManager (30s → 2min → 4min...). Jika SEMUA sukses → Result.success().
        return if (adaGagal) {
            Log.w(TAG, "GPSUploadWorker: Ada ${batch.size} selesai, tapi ada yang gagal → Retry exponential backoff.")
            Result.retry()
        } else {
            Log.i(TAG, "GPSUploadWorker: Batch ${batch.size} GPS point SUKSES SEMUA.")
            Result.success()
        }
    }

    // Convert epoch millis (waktu HP capture GPS) ke format ISO 8601 UTC agar backend bisa parse konsisten.
    // Kenapa UTC? Backend Laravel umumnya simpan dalam UTC.
    // MinSdk 24 → java.time API butuh API 26, jadi pakai SimpleDateFormat legacy (API 1+) yang backward compatible.
    private fun convertEpochMillisToIsoUtc(epochMillis: Long): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date(epochMillis))
    }

    companion object {
        private const val TAG = "GPSUploadWorker"

        // Batch per run worker: 10 row GPS point per flush (hemat kuota data & CPU)
        private const val BATCH_LIMIT = 10

        // Max retry per point sebelum dianggap corrupt & di-skip (tidak diikutkan upload lagi → di tabel FAILED state)
        private const val MAX_RETRY_PER_ROW = 10

        // Cap max 1000 row pending → jika > hapus 100 row tertua agar SQLite tidak membengkak.
        private const val MAX_PENDING_ROW_CAP = 1000

        // Unique work name (supaya tidak duplicate schedule tiap app dibuka → ExistingPeriodicWorkPolicy.KEEP)
        const val UNIQUE_WORK_NAME = "litensi-periodic-gps-upload-worker"

        // Unique work name untuk expedited OneTimeWork (trigger geofence event upload segera)
        const val UNIQUE_GEOFENCE_EXPEDITED_WORK_NAME = "litensi-geofence-expedited-gps-upload"

        // Schedule worker PERIODIC 15 MENIT (batas minimum Android system WorkManager; TIDAK BISA KURANG).
        fun schedulePeriodic(ctx: Context) {
            val workRequest = PeriodicWorkRequestBuilder<GPSUploadWorker>(
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
            Log.i(TAG, "schedulePeriodic: GPS periodic worker 15min dijadwalkan/keep existing.")
        }

        // Cancel worker periodic + expedited (dipanggil saat unpair/disconnect perangkat)
        fun cancel(ctx: Context) {
            val wm = WorkManager.getInstance(ctx)
            wm.cancelUniqueWork(UNIQUE_WORK_NAME)
            wm.cancelUniqueWork(UNIQUE_GEOFENCE_EXPEDITED_WORK_NAME)
            Log.i(TAG, "cancel: GPS periodic & expedited worker dicancel.")
        }

        // (G3.8) Trigger IMMEDIATE OneTimeWork EXPEDITED untuk upload GPS SEGERA saat GeofenceEventReceiver onReceive enter/exit.
        // TIDAK menunggu 15 menit periodik.
        // OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_AT_LAST = jika app standby bucket quota expedited habis → fallback normal work biasa (tidak crash/skip).
        fun enqueueExpeditedOneTime(ctx: Context) {
            val request = OneTimeWorkRequestBuilder<GPSUploadWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .addTag(UNIQUE_GEOFENCE_EXPEDITED_WORK_NAME)
                .build()
            WorkManager.getInstance(ctx)
                .enqueueUniqueWork(
                    UNIQUE_GEOFENCE_EXPEDITED_WORK_NAME,
                    ExistingWorkPolicy.REPLACE,
                    request
                )
            Log.i(TAG, "enqueueExpeditedOneTime: GPS expedited di-enqueue (geofence trigger).")
        }
    }
}
