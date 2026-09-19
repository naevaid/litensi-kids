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
import com.example.data.work.GPSUploadWorker
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

// (G5) Helper GPS ADAPTIVE MODE — AI Motion Detection berbasis kecepatan GPS speed.
// -----------------------------------------------------------------------------------
//  MODES:
//    [MODE_STATIONARY / DIAM] (speed ≤ 5 km/jam) : Interval 5 MENIT + displacement 10m
//       → HEMAT BATERAI (~5% per jam). Cocok: anak di sekolah, tidur, main di rumah diam.
//    [MODE_FAST / BERGERAK] (speed ≥ 10 km/jam) : Interval 30 DETIK + displacement 25m
//       → AKURASI TINGGI (~10-20% lebih boros baterai / jam, wajar). Cocok: anak jalan kaki,
//         naik motor/mobil/ojek/angkutan sekolah. Marker maps smooth TIDAK loncat loncat.
//    [HYSTERESIS 5<speed<10 km/jam]: Mode TIDAK DIUBAH (hindari flip-flop terus menerus saat
//         kecepatan borderline jalan santai vs diam).
//  AUTO-UPLOAD EXPEDITED:
//    - Jika MODE_FAST aktif & sudah terkumpul ≥ 4 point GPS berturut (≈1-2 menit perjalanan)
//      ATAU speed > 20 km/jam (naik kendaraan) → LANGSUNG call enqueueExpeditedOneTime()
//      GPSUploadWorker SEGERA flush cache ke DB → tidak nunggu 15 menit WorkManager periodic.
//    - Result: maksimal 30 detik lag antara GPS capture di HP → marker maps web ter-update.
// -----------------------------------------------------------------------------------
// Singleton pattern (object) agar hanya ada 1 instance yang manage lifecycle location callback.
object GPSLocationManager {
    private const val TAG = "GPSLocationManager"

    // ============================================================
    // CONFIG MODE_STATIONARY (hemat baterai, anak diam)
    // ============================================================
    private const val STAT_INTERVAL_MS: Long = 5 * 60 * 1000L     // 5 MENIT
    private const val STAT_FASTEST_MS: Long = 2 * 60 * 1000L      // 2 MENIT
    private const val STAT_MIN_DISTANCE_M: Float = 10.0f           // 10 METER

    // ============================================================
    // CONFIG MODE_FAST (akurasi tinggi, anak bergerak perjalanan)
    // ============================================================
    private const val FAST_INTERVAL_MS: Long = 30 * 1000L          // 30 DETIK (user request! bukan 5 menit)
    private const val FAST_FASTEST_MS: Long = 10 * 1000L          // 10 DETIK tercepat
    private const val FAST_MIN_DISTANCE_M: Float = 25.0f           // 25 METER (hindari noise GPS diam 1-5m)

    // ============================================================
    // THRESHOLD KECEPATAN ADAPTIVE MODE (m/s → km/jam = x3.6)
    // ============================================================
    // HISTERESIS: supaya tidak bolak balik (flip-flop) saat kecepatan borderline.
    //   Naik ke MODE_FAST jika speed >= 10 km/jam (pasti bergerak).
    //   Turun kembali ke MODE_STATIONARY hanya jika speed <= 5 km/jam (pasti diam).
    //   Range 5 < speed < 10 km/jam: mode TETAP APA ADANYA.
    private const val SPEED_THRESHOLD_FAST_KMH: Double = 10.0
    private const val SPEED_THRESHOLD_STATIONARY_KMH: Double = 5.0

    // ============================================================
    // TRIGGER AUTO-UPLOAD EXPEDITED (cepat flush ke DB tanpa nunggu 15m WorkManager)
    // ============================================================
    // N=4 point GPS high-speed berturut → expedited upload.
    private const val FAST_POINT_BATCH_UPLOAD: Int = 4
    // Speed > 20 km/jam → expedited upload SETIAP point (mobil kecepatan tinggi, jarak 30s = ~200m).
    private const val SPEED_EMERGENCY_UPLOAD_KMH: Double = 20.0

    // ============================================================
    // CONFIG FORCE_FAST_MODE (TEMPORER via FCM push dari dashboard Orang Tua)
    // Dipakai oleh tombol "Live GPS 30D" di halaman /monitor web.
    // DURASI = 30 menit default. INTERVAL = 5 detik (seperti Waze / Google Maps realtime).
    // ============================================================
    // Solusi PATUH ATURAN GOOGLE (bukan melanggar batas 15 menit Periodic WorkManager):
    // - Jangan ubah PeriodicWorkManager < 15 menit (risiko di-throttle Play Protect + boros baterai permanen).
    // - LEBIH CERDAS: TEMPORER force masuk FAST MODE via FCM push trigger saat user BENAR-BENAR
    //   sedang memantau (klik tombol). Setelah expire, revert otomatis ke adaptive normal hemat baterai.
    // Constant di-EXPOSE internal package agar LiveGpsForegroundService bisa baca SharedPrefs
    // untuk menampilkan sisa durasi & interval di notifikasi tray (bukan private!).
    const val PREFS_NAME = "litensi_gps_location_prefs"
    const val KEY_FORCE_FAST_UNTIL_MS = "force_fast_until_ms" // Long: System time millisecond saat mode expire
    const val KEY_FORCE_FAST_INTERVAL_MS = "force_fast_interval_ms" // Long: Interval yang diinginkan user (default 5000ms)

    // Track last mode (STATIONARY / FAST) & last ProfilAnakId untuk adaptive switch.
    enum class GpsMode { STATIONARY, FAST }
    private var currentMode: GpsMode = GpsMode.STATIONARY
    // Counter berapa point GPS berturut-turut dalam MODE_FAST (untuk trigger batch expedited upload)
    private var consecutiveFastPointCount: Int = 0
    // (G7 User request MAX LATENCY 5 DETIK!) Flag & debounce timestamp expedited upload scheduled
    //   Setiap ada GPS point baru → JIKA sudah lewat ≥5 DETIK sejak last upload → expedited UPLOAD SEKARANG.
    //   Jika <5 detik → skip (debounce hindari spam HTTP / kuota boros berlebih).
    //   Result: MAX LATENCY 5 DETIK ANTARA GPS CAPTURE DI HP → DB BACKEND TERUPDATE → Web Marker ≤5+polling.
    //   Trade-off: Upload HTTP setiap 5 detik = ~12 request / menit = ~700KB / jam kuota.
    //              Baterai ~5-10% lebih boros / jam (modem radio bangun setiap 5 detik untuk upload).
    //              TAPI user request = realtime seperti Waze/Google Maps navigation → GO APPLY 5 DETIK.
    private var lastExpeditedScheduledAtMs: Long = 0L
    private const val EXPEDITED_DEBOUNCE_INTERVAL_MS: Long = 5_000L // 5 DETIK = MAX LATENCY SESUAI USER REQUEST!
    // ApplicationContext disimpan untuk call enqueueExpeditedOneTime di dalam onLocationResult
    private var appContext: Context? = null

    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var currentProfilAnakId: Int? = null

    // Coroutine scope dedicated untuk GPSLocationManager (IO dispatcher untuk Room DB operations).
    // SupervisorJob: jika satu job gagal, job lain tidak ikut di-cancel.
    // Di-cancel saat removeUpdates() dipanggil (unpair/disconnect) untuk menghindari memory leak.
    private var supervisorJob: Job = SupervisorJob()
    private val ioScope: CoroutineScope = CoroutineScope(Dispatchers.IO + supervisorJob)

    // (G5 Helper) Build LocationRequest sesuai MODE saat ini.
    // UPDATE AV6: JIKA SharedPrefs FORCE_FAST_UNTIL_MS > waktu sekarang → PAKAI CUSTOM INTERVAL
    //   (abaikan normal STATIONARY/FAST mode — user dari dashboard web minta realtime tracking temporer).
    // UPDATE FIX LOCKED SCREEN: JIKA force expire → otomatis panggil stopForegroundServiceIfRunning()
    //   agar notif tray hilang dan hemat baterai kembali.
    private fun buildLocationRequestFor(mode: GpsMode, ctx: Context? = null): LocationRequest {
        // ========== [AV6 LIVE GPS PUSH TRIGGER] ==========
        val now = System.currentTimeMillis()
        val ctxPrefs = ctx ?: appContext
        val (forceActive, forceIntervalMs) = if (ctxPrefs != null) {
            val prefs = ctxPrefs.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val until = prefs.getLong(KEY_FORCE_FAST_UNTIL_MS, 0L)
            val interval = prefs.getLong(KEY_FORCE_FAST_INTERVAL_MS, 5_000L)
            if (until > now) {
                true to interval
            } else {
                // FORCE EXPIRE: Jika sampai disini until <= now tapi SharedPrefs masih ada nilainya →
                //   clear prefs + STOP FOREGROUND SERVICE jika jalan (notif tray dihapus user).
                if (until > 0L) {
                    prefs.edit()
                        .remove(KEY_FORCE_FAST_UNTIL_MS)
                        .remove(KEY_FORCE_FAST_INTERVAL_MS)
                        .apply()
                    Log.i(TAG, "[LIVE GPS FORCE MODE EXPIRED] untilMs($until) <= now($now) → Clear prefs + stop foreground service.")
                    stopForegroundServiceIfRunning(ctxPrefs)
                }
                false to 5_000L
            }
        } else {
            false to 5_000L
        }
        if (forceActive) {
            Log.i(TAG, "[LIVE GPS FORCE MODE] Aktif! Custom interval ${forceIntervalMs}ms (realtime 5 detik kayak Waze).")
            // Fastest = forceIntervalMs / 2 agar cepat capture tapi tidak banjir point.
            val fastest = (forceIntervalMs / 2L).coerceAtLeast(1000L)
            return LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                forceIntervalMs
            ).apply {
                setMinUpdateIntervalMillis(fastest)
                setMinUpdateDistanceMeters(0f) // 0m = user request update apapun jaraknya.
                setWaitForAccurateLocation(true)
            }.build()
        }
        // ========== [NORMAL ADAPTIVE MODE] ==========
        return when (mode) {
            GpsMode.STATIONARY -> LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                STAT_INTERVAL_MS
            ).apply {
                setMinUpdateIntervalMillis(STAT_FASTEST_MS)
                setMinUpdateDistanceMeters(STAT_MIN_DISTANCE_M)
                setWaitForAccurateLocation(true)
            }.build()
            GpsMode.FAST -> LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                FAST_INTERVAL_MS
            ).apply {
                setMinUpdateIntervalMillis(FAST_FASTEST_MS)
                setMinUpdateDistanceMeters(FAST_MIN_DISTANCE_M)
                // Fast mode: tunggu akurat SEKALI SAJA start, selanjutnya tidak biar cepat (untuk perjalanan)
                setWaitForAccurateLocation(false)
                // Set max delay 0 → SEGERA kirim ke callback setiap ada update (tidak di-batch 2 detik)
                setMaxUpdateDelayMillis(0)
            }.build()
        }
    }

    // (G5 Helper) Switch GPS mode: STATIONARY ↔ FAST.
    //   Hanya call FusedLocationClient.remove+request LAGI jika mode BENAR-BENAR BERUBAH (tidak re-init tiap point).
    private fun switchGpsModeIfChanged(newMode: GpsMode, ctx: Context) {
        if (newMode == currentMode) return // NO CHANGE → skip (hindari overhead restart request tiap 30s)
        val oldMode = currentMode
        currentMode = newMode
        val client = fusedLocationClient ?: return
        val oldCallback = locationCallback ?: return

        // Step 1: Remove updates current (mode lama)
        runCatching { client.removeLocationUpdates(oldCallback) }

        // Step 2: Build request MODE BARU + re-register callback SAMA (reuse callback object)
        val newRequest = buildLocationRequestFor(newMode)
        runCatching {
            client.requestLocationUpdates(newRequest, oldCallback, ctx.mainLooper)
        }.onSuccess {
            when (newMode) {
                GpsMode.FAST -> {
                    consecutiveFastPointCount = 0 // reset counter saat MASUK mode fast
                    Log.i(TAG, "⚡ ADAPTIVE SWITCH → MODE_FAST interval=${FAST_INTERVAL_MS/1000}s displacement=$FAST_MIN_DISTANCE_M m (detect bergerak >=$SPEED_THRESHOLD_FAST_KMH km/jam). Reset counter upload.")
                }
                GpsMode.STATIONARY -> {
                    Log.i(TAG, "🐢 ADAPTIVE SWITCH → MODE_STATIONARY interval=${STAT_INTERVAL_MS/1000/60}m displacement=$STAT_MIN_DISTANCE_M m (diam <=$SPEED_THRESHOLD_STATIONARY_KMH km/jam). Hemat baterai.")
                }
            }
        }.onFailure { err ->
            Log.e(TAG, "ADAPTIVE SWITCH FAIL (${oldMode.name}→${newMode.name}): ${err.message}")
        }
    }

    // Mulai request update lokasi berkelanjutan. Dipanggil saat ViewModel detect isConnected=true pairing sukses.
    // Default AWAL MODE: STATIONARY (hemat baterai) — nanti adaptive switch ke FAST jika speed>=10 km/jam.
    // Parameter onPermissionMissing: Callback JIKA user BELUM grant ACCESS_FINE_LOCATION. ViewModel panggil ini untuk
    //   menampilkan Toast / Banner merah di UI agar user ke Settings aktifkan "Allow all the time" Location.
    //   JANGAN skip silent tanpa feedback ke user (BUG G8).
    fun requestLocationUpdates(
        context: Context,
        profilAnakId: Int,
        onPermissionMissing: ((pesan: String) -> Unit)? = null
    ) {
        val ctx = context.applicationContext
        appContext = ctx
        currentProfilAnakId = profilAnakId
        currentMode = GpsMode.STATIONARY // default start diam
        consecutiveFastPointCount = 0

        // 1. Permission check: ACCESS_FINE_LOCATION wajib (manifest L6).
        //   G8 BUG FIX: JIKA BELUM GRANT — TIDAK BOLEH skip silent Log.w SAJA!
        //   Harus: (a) Log.e ERROR (penting di logcat), (b) PANGGIL callback onPermissionMissing untuk UI toast / banner merah.
        val hasFineLoc = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarseLoc = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasBgLoc = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        } else {
            true // SDK <29: background location = include dalam fine/coarse (tidak perlu permission terpisah)
        }

        // (G8.1) Minimal butuh salah satu FINE atau COARSE. Kalau keduanya tidak ada → FATAL stop tracking + CALLBACK ERROR UI
        if (!hasFineLoc && !hasCoarseLoc) {
            val errMsg = ("PERIZINAN LOKASI TIDAK DIAKTIFKAN! GPS tracking TIDAK BERJALAN → marker web akan tetap 0.0000 Null Island.\n" +
                "Cara aktifkan (wajib):\n" +
                "  1. Buka SETTINGS → Apps → LitensiKids → Permissions → Location.\n" +
                "  2. Pilih opsi \"Allow all the time\" (terpenting untuk tracking background saat app tertutup).\n" +
                "  3. Aktifkan juga \"Use precise location\" (toggle ON agar akurasi <20m tidak 200m kasar).\n" +
                "  4. Kembali buka app LitensiKids.\n" +
                "(SDK >=30 Android 11+): Jika opsi \"Allow all the time\" TIDAK MUNCUL → harus pilih dulu \"Allow only while using the app\" → kembali ke settings permission location → baru muncul Allow all the time di bawahnya.")
            Log.e(TAG, "requestLocationUpdates FATAL MISSING PERMISSION: ACCESS_FINE_LOCATION & ACCESS_COARSE_LOCATION keduanya TIDAK DI-GRANT!")
            Log.e(TAG, "  hasFineLoc=$hasFineLoc hasCoarseLoc=$hasCoarseLoc hasBgLoc=$hasBgLoc.")
            Log.e(TAG, "  ↳ Skip GPS tracking. User WAJIB setting sebelum tracking bisa berjalan!")
            onPermissionMissing?.invoke(errMsg)
            return
        }

        // (G8.1 WARNING NON-FATAL): FINE_LOCATION tidak ada tapi COARSE ada → accuracy 200-2000m buruk.
        //   Background location tidak ada (SDK≥29): cuma bisa tracking saat app di foreground/open.
        if (!hasFineLoc && hasCoarseLoc) {
            val warnMsg = ("PERINGATAN: Hanya perizinan \"Approximate location\" (kira-kira) yang aktif.\n" +
                "GPS akurasi hanya 200-2000m (buruk). Untuk akurasi 10-50m, aktifkan \"Use precise location\" ON di Settings → Apps → LitensiKids → Permissions → Location.")
            Log.w(TAG, "requestLocationUpdates WARNING: ACCESS_FINE_LOCATION MISSING! Hanya COARSE yang di-grant → akurasi BURUK 200m+.")
            onPermissionMissing?.invoke(warnMsg)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasBgLoc && (hasFineLoc || hasCoarseLoc)) {
            val warnBgMsg = ("PERINGATAN: Background location TIDAK di-allow (hanya Allow while using).\n" +
                "GPS tracking HANYA BERJALAN SAAT APP TERBUKA / DI FOREGROUND. Jika HP tidur / app ditutup → tracking BERHENTI dan marker web tidak update.\n" +
                "Solusi: Settings → Apps → LitensiKids → Permissions → Location → pilih \"Allow all the time\".")
            Log.w(TAG, "requestLocationUpdates WARNING: ACCESS_BACKGROUND_LOCATION MISSING (SDK >=29). Tracking cuma jalan saat app TERBUKA/foreground.")
            onPermissionMissing?.invoke(warnBgMsg)
        }

        // 2. Init FusedLocationProviderClient jika belum ada.
        if (fusedLocationClient == null) {
            fusedLocationClient = LocationServices.getFusedLocationProviderClient(ctx)
        }

        // 3. Build LocationRequest AWAL → MODE_STATIONARY default.
        val initialRequest = buildLocationRequestFor(currentMode, ctx)

        // 4. Build LocationCallback → handle setiap lokasi terbaru + ADAPTIVE SWITCH MODE + AUTO EXPEDITED UPLOAD.
        val callback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                // Ambil lokasi paling recent terakhir dari batch (bisa multiple locations dalam satu callback).
                val location = locationResult.lastLocation ?: return
                val speedKmh = if (location.hasSpeed()) (location.speed * 3.6) else 0.0
                val accuracyStr = if (location.hasAccuracy()) "accuracy=${location.accuracy}m" else "accuracy=?"
                Log.d(TAG, "onLocationResult[$currentMode]: GPS fix speed=${String.format("%.1f", speedKmh)}km/j lat=${location.latitude} lng=${location.longitude} $accuracyStr time=${location.time}")

                // ============================================================
                // (G5.1) ADAPTIVE MODE SWITCH BERDASARKAN KECEPATAN GPS
                // ============================================================
                // - speed >= 10 km/jam → SWITCH KE FAST (30s interval, tracking realtime)
                // - speed <= 5 km/jam → SWITCH KE STATIONARY (5m interval, hemat baterai)
                // - 5 < speed <10 km/jam → TIDAK DIUBAH (hysteresis hindari flip-flop)
                when {
                    speedKmh >= SPEED_THRESHOLD_FAST_KMH -> switchGpsModeIfChanged(GpsMode.FAST, ctx)
                    speedKmh <= SPEED_THRESHOLD_STATIONARY_KMH -> switchGpsModeIfChanged(GpsMode.STATIONARY, ctx)
                    // else → TIDAK ADA PERUBAHAN MODE (hysteresis gap aman)
                }

                // ============================================================
                // (G5.2) INSERT GPS CACHE KE ROOM (sama persis pattern G3, aman)
                // ============================================================
                val db = LitensiKidsDatabase.getDatabase(ctx)
                val battery = hitungBatteryLevel(ctx)
                val entity = PergerakanGpsCacheEntity(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    capturedAtEpochMillis = location.time, // Waktu ASLI HP capture GPS (bukan waktu sekarang)
                    accuracyMeters = if (location.hasAccuracy()) location.accuracy.toInt() else null,
                    batteryLevel = battery,
                    speedKmh = if (location.hasSpeed()) speedKmh else null, // m/s → km/jam
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
                ioScope.launch {
                    val insertedId = runCatching {
                        db.gpsCacheDao().insertGpsPoint(entity)
                    }.getOrElse { err ->
                        Log.e(TAG, "Gagal insert GPS cache ke Room: ${err.message}")
                        return@launch
                    }
                    Log.v(TAG, "  Insert GPS cache success id=$insertedId, battery=$battery%")

                    // ============================================================
                    // (G5.2 + G6.3 FIX CRITICAL) AUTO-UPLOAD EXPEDITED DEBOUNCE 60 DETIK
                    //   PRINSIP TIDAK BOLEH NUNGGU 15 MENIT WORKMANAGER!
                    // ============================================================
                    // Trigger rules:
                    //   A. Speed emergency ≥20 km/jam (kendaraan cepat) → UPLOAD SETIAP POINT SEKARANG
                    //   B. MODE_FAST & 4+ point berturut (batch lambat jalan kaki) → UPLOAD SEKARANG
                    //   C. (G6 BARU: DEBOUNCE 60 DETIK) — SETIAP KALI ADA GPS POINT BARU MASUK, schedule
                    //      expedited upload 60 DETIK KEDAPAN (jika belum ada scheduled).
                    //      → Hasil: MAX LATENCY 60 DETIK, TIDAK PERNAH nunggu 15 menit periodic WorkManager
                    //      walau anak cuma diam (MODE_STATIONARY) 1 point!
                    val ctxNow = appContext ?: return@launch
                    val triggerA = speedKmh >= SPEED_EMERGENCY_UPLOAD_KMH
                    if (currentMode == GpsMode.FAST) consecutiveFastPointCount++
                    val triggerB = currentMode == GpsMode.FAST && consecutiveFastPointCount >= FAST_POINT_BATCH_UPLOAD
                    // Trigger C = DEBOUNCE: SETIAP point baru → UPLOAD SEKARANG JIKA sudah ≥5 DETIK sejak last schedule
                    val now = System.currentTimeMillis()
                    val triggerC = (now - lastExpeditedScheduledAtMs) >= EXPEDITED_DEBOUNCE_INTERVAL_MS
                    if (triggerA || triggerB || triggerC) {
                        if (triggerC) lastExpeditedScheduledAtMs = now // (C): update scheduled timestamp debounce
                        val triggerStr = when {
                            triggerA -> "speed emergency ≥${SPEED_EMERGENCY_UPLOAD_KMH}km/j (UPLOAD NOW)"
                            triggerB -> "batch $FAST_POINT_BATCH_UPLOAD point mode fast (UPLOAD NOW)"
                            triggerC -> "debounce 5detik point baru (UPLOAD NOW — MAX LATENCY 5d REQUEST USER)"
                            else -> "???"
                        }
                        Log.i(TAG, "🚀 EXPEDITED GPS UPLOAD TRIGGER (trigger: $triggerStr). counter=$consecutiveFastPointCount lastSchedule=$lastExpeditedScheduledAtMs now=$now → call GPSUploadWorker.enqueueExpeditedOneTime(ctx)")
                        // Trigger A/B reset counter 0; Trigger C tidak reset (karena debounce schedule delayed batch)
                        if (triggerA || triggerB) consecutiveFastPointCount = 0
                        runCatching { GPSUploadWorker.enqueueExpeditedOneTime(ctxNow) }
                            .onFailure { err -> Log.e(TAG, "enqueueExpeditedOneTime fail: ${err.message}") }
                    }
                }
            }
        }

        locationCallback = callback

        // 5. Request update lokasi ke FusedLocationProviderClient MODE AWAL (STATIONARY default).
        runCatching {
            fusedLocationClient?.requestLocationUpdates(initialRequest, callback, ctx.mainLooper)
        }.onSuccess {
            Log.i(TAG, "requestLocationUpdates ADAPTIVE: START MODE=$currentMode interval=${STAT_INTERVAL_MS/1000/60}m (awal diam). Switch otomatis ke ${FAST_INTERVAL_MS/1000}s jika speed≥$SPEED_THRESHOLD_FAST_KMH km/j. anak=$profilAnakId")
        }.onFailure { err ->
            Log.e(TAG, "requestLocationUpdates GAGAL start GPS: ${err.message}")
        }
    }

    // Hentikan request update lokasi. Dipanggil saat unpair/disconnect atau app destroy.
    // FIX: Juga STOP foreground service jika sedang berjalan → notif tray hilang & batere tidak terkuras permanen.
    fun removeUpdates(context: Context) {
        // Stop foreground service DULU sebelum hapus callback (jika ada).
        stopForegroundServiceIfRunning(context)
        // Juga clear SharedPrefs force mode jika ada (hapus semua key force).
        runCatching {
            context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                .remove(KEY_FORCE_FAST_UNTIL_MS)
                .remove(KEY_FORCE_FAST_INTERVAL_MS)
                .apply()
        }
        val client = fusedLocationClient
        val callback = locationCallback
        if (client != null && callback != null) {
            runCatching {
                client.removeLocationUpdates(callback)
            }.onSuccess {
                Log.i(TAG, "removeUpdates: GPS tracking ADAPTIVE DISTOP (lastMode=$currentMode).")
            }.onFailure { err ->
                Log.w(TAG, "removeUpdates warning: ${err.message}")
            }
        }
        fusedLocationClient = null
        locationCallback = null
        currentProfilAnakId = null
        appContext = null
        // Reset adaptive state ke default untuk pair berikutnya (jangan bawa state counter mode lama)
        currentMode = GpsMode.STATIONARY
        consecutiveFastPointCount = 0

        // Cancel semua job pending di coroutine scope (jangan sampai ada leak DB insert yang tidak selesai).
        // Re-create baru SupervisorJob + scope agar jika user pair ulang tanpa kill app → ioScope masih active.
        runCatching { supervisorJob.cancel() }
        supervisorJob = SupervisorJob()
    }

    // (AV6 FIX LOCKED SCREEN) Dipanggil oleh LiveGpsForegroundService.onCreate saat service start ulang
    // → rebuild location request dan restart fusedLocation client request agar Play Services tahu
    //   ada foreground service yang berjalan → TIDAK kill GPS update saat screen off.
    fun restartLocationRequestJikaAktif(ctx: Context) {
        val client = fusedLocationClient
        val callback = locationCallback
        if (client == null || callback == null) {
            Log.w(TAG, "restartLocationRequestJikaAktif: client/callback BELUM ADA (GPS belum start pairing). Skip restart.")
            return
        }
        val appCtx = ctx.applicationContext
        appContext = appCtx
        runCatching { client.removeLocationUpdates(callback) }
        val newReq = buildLocationRequestFor(currentMode, appCtx)
        runCatching {
            client.requestLocationUpdates(newReq, callback, appCtx.mainLooper)
        }.onSuccess {
            Log.i(TAG, "restartLocationRequestJikaAktif: ✅ Location request di-restart ulang dengan foreground context (screen off aman).")
        }.onFailure { err ->
            Log.e(TAG, "restartLocationRequestJikaAktif FAIL: ${err.message}")
        }
    }

    // Helper: Start foreground service (jika belum berjalan). Dipanggil forceFastMode.
    private fun startForegroundService(ctx: Context) {
        val appCtx = ctx.applicationContext
        runCatching { LiveGpsForegroundService.start(appCtx) }
            .onSuccess { Log.i(TAG, "startForegroundService: dipanggil.") }
            .onFailure { err -> Log.e(TAG, "startForegroundService GAGAL: ${err.message}") }
    }

    // Helper: Stop foreground service (jika sedang berjalan). Dipanggil saat force expire / removeUpdates.
    private fun stopForegroundServiceIfRunning(ctx: Context) {
        val appCtx = ctx.applicationContext
        runCatching { LiveGpsForegroundService.stop(appCtx) }
            .onSuccess { Log.i(TAG, "stopForegroundServiceIfRunning: dipanggil.") }
            .onFailure { err -> Log.w(TAG, "stopForegroundServiceIfRunning warning: ${err.message}") }
    }

    // ============================================================
    // [AV6 LIVE GPS 30D] PUBLIC API FOR FCM HANDLER!
    // Dipanggil dari LitensiFirebaseMessagingService saat menerima push data payload event_type=request_gps_fast.
    // ============================================================
    /**
     * Force mode GPS RealTime temporer selama [durationMinutes] menit dengan interval [intervalMs] millisecond.
     * Setelah duration expire otomatis kembali ke MODE normal adaptive (STATIONARY diam / FAST bergerak).
     * TIDAK MELANGGAR batas 15 menit Periodic WorkManager karena ini LocationRequest satu-satunya bukan
     * WorkManager periodic yang dicek Play Protect Policy! Aman.
     * FIX LOCKED SCREEN: Sebelum start GPS, STARTS FOREGROUND SERVICE (notification tray) agar
     *   Android tidak mematikan update GPS saat layar terkunci / Doze ringan.
     */
    fun forceFastMode(
        ctx: Context,
        durationMinutes: Int = 30,
        intervalMs: Long = 5_000L,
    ) {
        require(durationMinutes in 1..240) { "durationMinutes harus 1 s/d 240 menit (maks 4 jam, hindari boros baterai permanen)" }
        require(intervalMs in 1_000L..60_000L) { "intervalMs harus 1000 s/d 60000 (1 detik s/d 1 menit)" }

        val durasiMs = durationMinutes.toLong() * 60L * 1000L
        val untilMs = System.currentTimeMillis() + durasiMs

        // Step 0 (FIX LOCKED SCREEN PALING PENTING): Start FOREGROUND SERVICE type=location NOTIF PERMANEN
        // → Android PRIORITAS TINGGI, TIDAK akan kill GPS walau layar off 30 MENIT PENUH!
        startForegroundService(ctx)

        // Step 1: Simpan ke SharedPrefs (buildLocationRequestFor akan check setiap di build,
        // juga ketika app restart / GPSLocationManager requestLocationUpdates dipanggil ulang).
        val prefs = ctx.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putLong(KEY_FORCE_FAST_UNTIL_MS, untilMs)
            .putLong(KEY_FORCE_FAST_INTERVAL_MS, intervalMs)
            .apply()
        Log.i(TAG, "[LIVE GPS FORCE MODE] SAVED PREFS until=${untilMs} (${durationMinutes} menit), interval=${intervalMs}ms.")

        // Step 2: REAL-TIME EFFECT → Force rebuild LocationRequest sekarang juga tanpa menunggu adaptive switch.
        //   Kalau ada fusedLocationClient & callback → remove request saat ini lalu re-create dengan force mode baru.
        val client = fusedLocationClient
        val callback = locationCallback
        val appCtx = ctx.applicationContext
        appContext = appCtx // Pastikan appContext terisi untuk buildLocationRequestFor yang membutuhkan SharedPrefs.
        if (client != null && callback != null) {
            runCatching { client.removeLocationUpdates(callback) }
            val forceRequest = buildLocationRequestFor(currentMode, appCtx)
            runCatching {
                client.requestLocationUpdates(forceRequest, callback, appCtx.mainLooper)
            }.onSuccess {
                Log.i(TAG, "[LIVE GPS FORCE MODE] ✅ LocationRequest RESTARTED dengan interval=${intervalMs}ms selama ${durationMinutes} menit. Realtime seperti Waze/Google Maps!")
            }.onFailure { err ->
                Log.e(TAG, "[LIVE GPS FORCE MODE] ❌ restart requestLocationUpdates FAIL: ${err.message}")
            }

            // Trigger ONE-SHOT upload GPS segera EXPEDITED supaya user ORANG TUA tidak perlu menunggu 5 detik
            // pertama untuk melihat marker update di dashboard web (UX instant feedback).
            runCatching { GPSUploadWorker.enqueueExpeditedOneTime(appCtx) }
                .onFailure { err -> Log.w(TAG, "[LIVE GPS] enqueueExpeditedOneShot gagal (initial upload): ${err.message}") }
        } else {
            Log.w(TAG, "[LIVE GPS FORCE MODE] PREFS tersimpan tapi client/callback BELUM ADA (GPS belum start?). Akan ter-apply otomatis ketika user membuka app / nanti requestLocationUpdates jalan.")
        }
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
