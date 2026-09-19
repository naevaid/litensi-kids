package com.example.data.work

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.data.local.LitensiKidsDatabase
import com.example.data.location.GeofenceManager
import com.example.data.location.GPSLocationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

// (G3.13) BroadcastReceiver untuk menangkap event HP SELESAI REBOOT / BOOT COMPLETED.
// Alasan penting: WorkManager PeriodicWorkRequest SEHARUSNYA persistent setelah reboot.
//   Tapi ada bug vendor (khususnya Xiaomi MIUI ColorOS Oppo Realme Vivo FunTouch One UI) yang
//   menghapus / me-nonaktifkan semua worker berkala saat boot, JIKA user tidak menambahkan app
//   ke whitelist Auto Start / Run in background.
// Solusi double safety: kita DENGAR sendiri event BOOT_COMPLETED → paksa RESCHEDULE 3 worker
//   (Telemetry upload, GPS upload, SYNC DOWNLOAD) + restart FusedLocation GPS tracking + geofence reload.
//
// Persyaratan manifest:
//   - <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/> (SUDAH ADA di L23)
//   - <receiver android:name=".BootCompletedReceiver" exported=false> intent-filter ACTION_BOOT_COMPLETED
class BootCompletedReceiver : BroadcastReceiver() {

    // Coroutine scope untuk IO operation (baca Room DB pairing state) — onReceive cuma 10 detik!
    // Kita gunakan goAsync() PendingResult untuk memastikan coroutine selesai sebelum process dibunuh OS.
    private val receiverScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onReceive(context: Context?, intent: Intent?) {
        val ctx = context ?: return
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED) {
            // Hanya handle event boot & app upgrade (package replaced).
            return
        }
        Log.i(TAG, "📱 Event BOOT_COMPLETED / UPGRADE diterima (action=$action). Mulai reschedule semua worker + GPS tracking + geofence reload.")

        // goAsync(): Beri Android extra 30 detik sebelum dianggap selesai (default cuma 10 detik onReceive timeout)
        val pendingResult: PendingResult = goAsync()

        receiverScope.launch {
            runCatching {
                // (1) Cek state Room: masih terpairing?
                val db = LitensiKidsDatabase.getDatabase(ctx)
                val pairing = runCatching { db.pairingDao().getPairingState().first() }.getOrNull()
                if (pairing == null || !pairing.isConnected) {
                    Log.i(TAG, "Skip reschedule: Pairing state NULL / blm terpairing / user sudah unpair sebelum reboot.")
                    return@runCatching
                }
                val anakId = pairing.profilAnakId
                val userIdOrtu = pairing.userIdOrtu
                if (anakId == null || userIdOrtu == null || userIdOrtu <= 0) {
                    Log.w(TAG, "Skip: anakId=$anakId / userIdOrtu=$userIdOrtu tidak lengkap di Room state (data blm valid)")
                    return@runCatching
                }

                // (2) RESCHEDULE 3 Worker Periodic 15 MENIT = 100% KEEP ExistingPolicy (tidak duplikat):
                LitensiTelemetryWorker.schedulePeriodic(ctx)
                Log.i(TAG, "✅ (1/5) LitensiTelemetryWorker schedulePeriodic KEEP after boot OK.")

                GPSUploadWorker.schedulePeriodic(ctx)
                Log.i(TAG, "✅ (2/5) GPSUploadWorker schedulePeriodic KEEP after boot OK.")

                LitensiSyncDownloadWorker.schedulePeriodic(ctx)
                Log.i(TAG, "✅ (3/5) LitensiSyncDownloadWorker schedulePeriodic KEEP after boot OK (P2 sync safety net).")

                // (3) RESTART FusedLocation FusedLocation tracking GPS (interval 5min adaptive).
                GPSLocationManager.requestLocationUpdates(
                    context = ctx,
                    profilAnakId = anakId,
                    onPermissionMissing = { err ->
                        Log.w(TAG, "⚠️ Post-boot GPS restart onPermissionMissing: $err (user harus buka app & Allow location permission).")
                    }
                )
                Log.i(TAG, "✅ (4/5) GPSLocationManager.requestLocationUpdates restarted after boot. anakId=$anakId")

                // (4) RELOAD & RE-REGISTER SEMUA ZONA GEOFENCE LATEST dari GF1 API ke Play Services GeofencingClient.
                GeofenceManager.loadAndRegisterAllZones(
                    context = ctx,
                    profilAnakId = anakId,
                    userIdOrtu = userIdOrtu
                )
                Log.i(TAG, "✅ (5/5) GeofenceManager.loadAndRegisterAllZones async IO triggered after boot. anakId=$anakId user=$userIdOrtu")

                Log.i(TAG, "🎉 G3.13 BOOT_COMPLETED RECEIVER FULL SUCCESS (5/5 step OK). Worker + GPS tracking + geofence REBORN setelah boot tanpa user buka app!")
            }.onFailure { err ->
                Log.e(TAG, "❌ BootCompletedReceiver gagal (non fatal, next buka app akan init): ${err.message}", err)
            }
            // PENTING: wajib panggil finish() PendingResult agar onReceive dianggap selesai (OS tidak ANR).
            runCatching { pendingResult.finish() }
        }
    }

    companion object {
        private const val TAG = "BootCompletedRcvr"
    }
}
