package com.example.data.location

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.example.data.local.LitensiKidsDatabase
import com.example.data.remote.ZonaGeofenceDto
import com.example.data.repository.LitensiRepository
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

// (G3.8) Helper untuk mengelola GeofencingClient Play Services:
//   (1) Load list zona dari endpoint GF1 backend via repository, (2) Convert ke Geofence object,
//   (3) Register ke GeofencingClient untuk listen ENTER/EXIT transition, (4) Remove semua saat unpair.
// PENTING: setInitialTrigger(0) = NEVER (tidak auto-trigger ENTER saat pertama add geofence kalau perangkat sudah di-dalam zona).
//          Ini mencegah double push notif (backend state machine log_geofence handle kasus already inside lewat GPS upload pertama).
object GeofenceManager {
    private const val TAG = "GeofenceManager"

    private var geofencingClient: GeofencingClient? = null
    private var geofencePendingIntent: PendingIntent? = null
    private var isRegistered = false

    // Load semua zona geofence user ID Orang Tua dari backend, filter yang active + assigned ke anak ini,
    //   convert ke Geofence object, lalu add ke GeofencingClient untuk listen transition.
    // Dipanggil oleh LitensiViewModel saat pairing state berubah isConnected=true.
    fun loadAndRegisterAllZones(
        context: Context,
        profilAnakId: Int,
        userIdOrtu: Int
    ) {
        val ctx = context.applicationContext

        // 1. Permission check: ACCESS_FINE_LOCATION wajib untuk geofence.
        if (ContextCompat.checkSelfPermission(
                ctx,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "loadAndRegisterAllZones: ACCESS_FINE_LOCATION belum di-grant. Skip geofence.")
            return
        }

        // 2. Init GeofencingClient jika belum ada.
        if (geofencingClient == null) {
            geofencingClient = LocationServices.getGeofencingClient(ctx)
        }

        // 3. Remove semua geofence existing terlebih dahulu (refresh dari DB backend, jangan append).
        removeAllZonesInternal(ctx, silent = true)

        // 4. Launch coroutine IO scope untuk call API GF1 get list zona.
        CoroutineScope(Dispatchers.IO).launch {
            val db = LitensiKidsDatabase.getDatabase(ctx)
            val repository = LitensiRepository(db = db)

            val listZona = runCatching {
                repository.getGeofenceList(userIdOrtu = userIdOrtu)
            }.getOrElse { err ->
                Log.e(TAG, "Gagal load list zona geofence API: ${err.message}")
                return@launch
            }

            // 5. Filter zona: HANYA yang status=active DAN assigned_children mengandung ID anak ini.
            //    assigned_children = JSON array string ["12", "14"] (string, bukan int — sesuai backend cast array_map strval).
            //    Jika assigned_children NULL/EMPTY artinya zona berlaku untuk SEMUA anak user ini.
            val anakIdStr = profilAnakId.toString()
            val zonaAktifUntukAnak = listZona.filter { zona ->
                val active = zona.status.equals("active", ignoreCase = true)
                val assigned = zona.assignedChildren
                val applicableForThisChild = when {
                    assigned.isNullOrEmpty() -> true // null/empty = untuk semua anak
                    else -> assigned.any { idStr -> idStr.trim() == anakIdStr } // cek ada di list assignment
                }
                active && applicableForThisChild
            }

            if (zonaAktifUntukAnak.isEmpty()) {
                Log.i(TAG, "loadAndRegisterAllZones: TIDAK ADA zona aktif untuk anak=$profilAnakId dari total ${listZona.size} zona user=$userIdOrtu. Skip add geofence (GPS tracking tetap jalan tanpa geofence trigger expedited).")
                return@launch
            }

            // 6. Convert DTO ZonaGeofence → list Geofence object Play Services.
            val geofenceList = zonaAktifUntukAnak.mapNotNull { zonaDto ->
                convertDtoToGeofence(zonaDto)
            }

            if (geofenceList.isEmpty()) {
                Log.w(TAG, "loadAndRegisterAllZones: Convert 0 zona valid dari ${zonaAktifUntukAnak.size} (radius_meters < 10 atau invalid lat/lng?) Skip.")
                return@launch
            }

            // 7. Build GeofencingRequest — setInitialTrigger(0) = NEVER (PENTING: hindari double trigger)
            val request = GeofencingRequest.Builder().apply {
                setInitialTrigger(0) // NEVER initial trigger (tidak auto-fire saat baru add walaupun perangkat sudah di-dalam zona)
                addGeofences(geofenceList)
            }.build()

            // 8. Get PendingIntent ke GeofenceEventReceiver.
            val pendingIntent = getGeofencePendingIntent(ctx)

            // 9. Add geofences ke GeofencingClient.
            runCatching {
                // SDK ≥ 29 butuh ACCESS_BACKGROUND_LOCATION untuk geofence. Jika tidak punya → addGeofences akan gagal.
                // Kita pakai runCatching → log error tapi tidak crash app. GPS tracking periodik 15 menit tetap jalan.
                geofencingClient?.addGeofences(request, pendingIntent)
                    ?.addOnSuccessListener {
                        isRegistered = true
                        Log.i(TAG, "✅ Geofence BERHASIL diregistrasi ${geofenceList.size} zona untuk anak=$profilAnakId: ${zonaAktifUntukAnak.joinToString(", ") { "${it.name}(r=${it.radiusMeters}m)" }}")
                    }
                    ?.addOnFailureListener { err ->
                        Log.e(TAG, "❌ Geofence GAGAL add. Error: ${err.message}. Cek permission ACCESS_BACKGROUND_LOCATION atau Play Services.")
                    }
            }.onFailure { err ->
                Log.e(TAG, "Exception addGeofences: ${err.message}")
            }
        }
    }

    // Remove semua geofence yang terdaftar (dipanggil saat unpair / disconnect).
    fun removeAllZones(context: Context) {
        removeAllZonesInternal(context.applicationContext, silent = false)
    }

    // Internal remove helper (silent = true untuk sebelum refresh, tidak usah log info berlebihan).
    private fun removeAllZonesInternal(ctx: Context, silent: Boolean) {
        val client = geofencingClient
        val pendingIntent = geofencePendingIntent
        if (client != null && pendingIntent != null && isRegistered) {
            runCatching {
                client.removeGeofences(pendingIntent)
                    .addOnSuccessListener {
                        if (!silent) Log.i(TAG, "removeAllZones: Semua geofence berhasil di-remove.")
                        isRegistered = false
                    }
                    .addOnFailureListener { err ->
                        Log.w(TAG, "removeAllZones warning: ${err.message}")
                    }
            }
        }
        if (!silent) {
            isRegistered = false
        }
    }

    // Convert ZonaGeofenceDto (backend shape) ke Geofence (Play Services object). Return null jika invalid.
    private fun convertDtoToGeofence(zona: ZonaGeofenceDto): Geofence? {
        // Validasi pertahanan: radius minimal 10m (Play Services rekomendasi minimal 100m tapi kita support 10m).
        if (zona.radiusMeters < 10) {
            Log.w(TAG, "convertDtoToGeofence: Zona '${zona.name}' radius=${zona.radiusMeters}m < 10m, skip (Play Services tidak reliable dibawah 10m).")
            return null
        }
        // Validasi lat/lng range WGS84 (jika data corrupt dari API jangan sampai crash).
        if (zona.latitude !in -90.0..90.0 || zona.longitude !in -180.0..180.0) {
            Log.w(TAG, "convertDtoToGeofence: Zona '${zona.name}' lat/lng invalid (${zona.latitude}, ${zona.longitude}). Skip.")
            return null
        }

        // requestId = "zona-{id}" (contoh: "zona-3") — di GeofenceEventReceiver kita log requestId ini untuk audit.
        val builder = Geofence.Builder()
            .setRequestId("zona-${zona.id}")
            .setCircularRegion(zona.latitude, zona.longitude, zona.radiusMeters.toFloat())
            // Transition type: ENTER + EXIT saja (DWELL tidak dipakai modul ini, backend cuma handle enter/exit event).
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
            // Never expire: zona aktif sampai user hapus di dashboard web atau status di-set inactive.
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            // Notification responsiveness 500ms → low latency, boros sedikit baterai tapi untuk monitoring anak OK trade-off.
            .setNotificationResponsiveness(500)
            // Loitering delay DWELL 0 (tidak dipakai tapi set biar explicit).
            .setLoiteringDelay(0)
        return builder.build()
    }

    // Get / create PendingIntent untuk GeofenceEventReceiver (FLAG_MUTABLE wajib SDK 31+).
    private fun getGeofencePendingIntent(ctx: Context): PendingIntent {
        val existing = geofencePendingIntent
        if (existing != null) return existing

        val intent = Intent(ctx, GeofenceEventReceiver::class.java)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // SDK 31+ (S) wajib MUTABLE atau IMMUTABLE. Geofence PendingIntent butuh mutable karena Play Services inject extra data (transition, geofence list).
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pending = PendingIntent.getBroadcast(ctx, 0, intent, flags)
        geofencePendingIntent = pending
        return pending
    }
}
