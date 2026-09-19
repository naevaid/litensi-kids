package com.example.data.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.example.data.local.LitensiKidsDatabase
import com.example.data.model.PergerakanGpsCacheEntity
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// (G3.7) Helper untuk mengelola FusedLocationProviderClient Google Play Services Location.
// Config: PRIORITY_HIGH_ACCURACY (GPS satelit akurasi tinggi ~5m), interval 5 menit, displacement 10m.
// Setiap ada update lokasi → insert ke Room cache PergerakanGpsCacheEntity status=PENDING → nanti GPSUploadWorker flush batch 10 ke backend.
// Singleton pattern (object) agar hanya ada 1 instance yang manage lifecycle location callback.
object GPSLocationManager {
    private const val TAG = "GPSLocationManager"

    // Interval update GPS: 5 MENIT (cukup untuk tracking anak tanpa boros baterai).
    private const val LOCATION_INTERVAL_MS: Long = 5 * 60 * 1000L
    // Fastest interval: 2 menit (jika ada app lain request GPS, kita bisa dapat update lebih cepat gratis).
    private const val LOCATION_FASTEST_INTERVAL_MS: Long = 2 * 60 * 1000L
    // Minimum displacement / pergeseran jarak 10 METER → jika perangkat cuma diam di meja, tidak kirim update (hemat baterai & kuota data).
    private const val MIN_UPDATE_DISTANCE_METERS: Float = 10.0f

    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var currentProfilAnakId: Int? = null

    // Coroutine scope dedicated untuk GPSLocationManager (IO dispatcher untuk Room DB operations).
    // SupervisorJob: jika satu job gagal, job lain tidak ikut di-cancel.
    // Di-cancel saat removeUpdates() dipanggil (unpair/disconnect) untuk menghindari memory leak.
    private var supervisorJob: Job = SupervisorJob()
    private val ioScope: CoroutineScope = CoroutineScope(Dispatchers.IO + supervisorJob)

    // Mulai request update lokasi berkelanjutan. Dipanggil saat ViewModel detect isConnected=true pairing sukses.
    fun requestLocationUpdates(context: Context, profilAnakId: Int) {
        val ctx = context.applicationContext
        currentProfilAnakId = profilAnakId

        // 1. Permission check: ACCESS_FINE_LOCATION wajib (sudah ada di manifest L6). Jika belum granted → log warning skip (tidak crash).
        if (ContextCompat.checkSelfPermission(
                ctx,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "requestLocationUpdates: ACCESS_FINE_LOCATION BELUM di-grant user. Skip GPS tracking.")
            return
        }

        // 2. Init FusedLocationProviderClient jika belum ada.
        if (fusedLocationClient == null) {
            fusedLocationClient = LocationServices.getFusedLocationProviderClient(ctx)
        }

        // 3. Build LocationRequest (LocationServices recent API: LocationRequest.Builder)
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            LOCATION_INTERVAL_MS
        ).apply {
            setMinUpdateIntervalMillis(LOCATION_FASTEST_INTERVAL_MS)
            setMinUpdateDistanceMeters(MIN_UPDATE_DISTANCE_METERS)
            setWaitForAccurateLocation(true) // Tunggu fix akurat (tidak pakai triangulasi menara BTS kasar)
        }.build()

        // 4. Build LocationCallback → handle setiap lokasi terbaru.
        val callback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                // Ambil lokasi paling recent terakhir dari batch (bisa multiple locations dalam satu callback).
                val location = locationResult.lastLocation ?: return
                Log.d(TAG, "onLocationResult: GPS fix dapat! lat=${location.latitude} lng=${location.longitude} accuracy=${location.accuracy}m time=${location.time}")

                // Insert ke Room cache GPS status PENDING → worker nanti yang upload ke backend.
                val db = LitensiKidsDatabase.getDatabase(ctx)
                val battery = hitungBatteryLevel(ctx)
                val entity = PergerakanGpsCacheEntity(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    capturedAtEpochMillis = location.time, // Waktu ASLI HP capture GPS (bukan waktu sekarang)
                    accuracyMeters = if (location.hasAccuracy()) location.accuracy.toInt() else null,
                    batteryLevel = battery,
                    speedKmh = if (location.hasSpeed()) (location.speed * 3.6).toDouble() else null, // m/s → km/jam
                    altitudeMeters = if (location.hasAltitude()) location.altitude else null,
                    // Deteksi mock lokasi (fake GPS app): SDK ≥ 31 pakai location.isMock, SDK <31 fallback isFromMockProvider
                    isMockDetected = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        location.isMock
                    } else {
                        @Suppress("DEPRECATION")
                        location.isFromMockProvider
                    },
                    syncStatus = PergerakanGpsCacheEntity.SYNC_STATUS_PENDING,
                    retryCount = 0,
                    lastError = null,
                    createdAt = System.currentTimeMillis()
                )

                // Insert ke Room via DAO di IO coroutine scope (insertGpsPoint adalah suspend function).
                // runCatching → jika DB error tidak crash app, cuma log.
                ioScope.launch {
                    val insertedId = runCatching {
                        db.gpsCacheDao().insertGpsPoint(entity)
                    }.getOrElse { err ->
                        Log.e(TAG, "Gagal insert GPS cache ke Room: ${err.message}")
                        return@launch
                    }
                    Log.d(TAG, "  Insert GPS cache success id=$insertedId, battery=$battery%")
                }
            }
        }

        locationCallback = callback

        // 5. Request update lokasi ke FusedLocationProviderClient.
        runCatching {
            fusedLocationClient?.requestLocationUpdates(locationRequest, callback, ctx.mainLooper)
        }.onSuccess {
            Log.i(TAG, "requestLocationUpdates: GPS tracking AKTIF interval=${LOCATION_INTERVAL_MS / 1000}s displacement=$MIN_UPDATE_DISTANCE_METERS m anak=$profilAnakId")
        }.onFailure { err ->
            Log.e(TAG, "requestLocationUpdates GAGAL start GPS: ${err.message}")
        }
    }

    // Hentikan request update lokasi. Dipanggil saat unpair/disconnect atau app destroy.
    fun removeUpdates(context: Context) {
        val client = fusedLocationClient
        val callback = locationCallback
        if (client != null && callback != null) {
            runCatching {
                client.removeLocationUpdates(callback)
            }.onSuccess {
                Log.i(TAG, "removeUpdates: GPS tracking DISTOP.")
            }.onFailure { err ->
                Log.w(TAG, "removeUpdates warning: ${err.message}")
            }
        }
        fusedLocationClient = null
        locationCallback = null
        currentProfilAnakId = null

        // Cancel semua job pending di coroutine scope (jangan sampai ada leak DB insert yang tidak selesai).
        // Re-create baru SupervisorJob + scope agar jika user pair ulang tanpa kill app → ioScope masih active.
        runCatching { supervisorJob.cancel() }
        supervisorJob = SupervisorJob()
    }

    // Hitung battery level integer 0-100 via BatteryManager (sama pattern LitensiTelemetryWorker L77).
    private fun hitungBatteryLevel(ctx: Context): Int? {
        return runCatching {
            val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            level.coerceIn(0, 100)
        }.getOrNull()
    }
}
