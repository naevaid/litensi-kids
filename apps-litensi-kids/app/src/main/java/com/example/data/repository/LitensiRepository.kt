package com.example.data.repository

import android.os.Build
import com.example.data.local.LitensiKidsDatabase
import com.example.data.model.ChildProfileEntity
import com.example.data.model.PairingStateEntity
import com.example.data.model.RewardEntity
import com.example.data.model.SosLogEntity
import com.example.data.model.TaskEntity
import com.example.data.remote.ApiResponse
import com.example.data.remote.ChatListResponseDto
import com.example.data.remote.ChatSendResponseDto
import com.example.data.remote.FcmTokenResponseDto
import com.example.data.remote.GpsUploadResponseDto
import com.example.data.remote.LitensiApiClient
import com.example.data.remote.LitensiApiService
import com.example.data.remote.ProfilAnakDto
import com.example.data.remote.TelemetryResponseDto
import com.example.data.remote.ZonaGeofenceDto
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import kotlinx.coroutines.flow.Flow
import retrofit2.HttpException

// Repository pattern: Single source of truth untuk data local (Room) dan remote (API backend).
// Semua business logic integrasi API di-tempat-kan DISINI (bukan di ViewModel), agar ViewModel hanya
//   menangani state UI dan event click.
class LitensiRepository(
    private val db: LitensiKidsDatabase,
    // Inject API service (default singleton LitensiApiClient)
    private val apiService: LitensiApiService = LitensiApiClient.instance
) {

    private val moshiParser: Moshi by lazy {
        Moshi.Builder()
            .addLast(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
            .build()
    }
    // (Crash Fix) ApiResponse<T> adalah GENERIC type — TIDAK BOLEH pakai ApiResponse::class.java (T erased, Moshi crash No JsonAdapter for T).
    // Untuk error body parser: kita hanya butuh field {success, message}, concrete type parameter = Any (nullable deserialize null/object/array bebas).
    // Build ParameterizedType via com.squareup.moshi.Types.newParameterizedType(rawType, typeArg1) sesuai Moshi best practice.
    private val apiErrorBodyType = Types.newParameterizedType(ApiResponse::class.java, Any::class.java)
    @Suppress("UNCHECKED_CAST")
    private val apiResponseAdapter = moshiParser.adapter<ApiResponse<Any>>(apiErrorBodyType)

    val pairingState: Flow<PairingStateEntity?> = db.pairingDao().getPairingState()
    val tasks: Flow<List<TaskEntity>> = db.taskDao().getAllTasks()
    val rewards: Flow<List<RewardEntity>> = db.rewardDao().getAllRewards()
    val sosLogs: Flow<List<SosLogEntity>> = db.sosDao().getAllSosLogs()
    val childProfile: Flow<ChildProfileEntity?> = db.childProfileDao().getChildProfile()

    // (BUG FIX #3) Extract pesan error asli dari server ketika HTTP non-2xx (404/409/422/403/5xx).
    // Retrofit default throw HttpException tanpa parse errorBody, sehingga UI cuma toast "HTTP 404".
    // Helper ini parse errorBody menjadi ApiResponse Laravel wrapper standard {success, message}
    //   → return string message asli untuk ditampilkan ke user.
    private fun extractApiErrorMessage(err: Throwable): String {
        return when (err) {
            is HttpException -> {
                val errorBody = err.response()?.errorBody()?.string()
                val parsed = errorBody?.let {
                    runCatching { apiResponseAdapter.fromJson(it) }.getOrNull()
                }
                val serverMsg = parsed?.message
                val httpCode = err.code()
                val httpMsg = err.message()
                if (!serverMsg.isNullOrBlank()) {
                    "[$httpCode] $serverMsg"
                } else if (!httpMsg.isNullOrBlank()) {
                    "Kesalahan jaringan $httpCode: $httpMsg"
                } else {
                    "Kesalahan jaringan: HTTP $httpCode"
                }
            }
            is IllegalArgumentException -> err.message ?: "Validasi input gagal."
            else -> err.message ?: "Terjadi kesalahan pada koneksi atau server."
        }
    }

    // Wrap suspend block API call → catch exception → pesan error asli.
    private suspend fun <T> apiCall(block: suspend () -> T): T {
        return runCatching { block() }.getOrElse { err ->
            error(extractApiErrorMessage(err))
        }
    }

    // =========================================================================
    // PAIRING FLOW (B4) — 4 step real API bukan cuma simpan hardcode ke Room
    // =========================================================================
    // Pairing-First Pattern: semua langkah divalidasi server side dulu sebelum save state ke Room.
    // @param code: Kode pairing dari QR / input manual (format LTN-XXX-YYYY-SEC)
    // @param pin: PIN 6 digit (dari field QR payload "p" ATAU input manual user)
    // @param parentNameFallback: Fallback nama orang tua JIKA response API null (jarang terjadi)
    // @param childNameFallback: Fallback nama anak JIKA response API null
    // @param batteryLevelSekarang: Battery level 0-100 (dihitung oleh ViewModel via BatteryManager)
    // @param androidDeviceId: Settings.Secure.ANDROID_ID (dihitung ViewModel, butuh Context)
    // @throws IllegalArgumentException jika validasi pin/code / expired / PIN salah
    suspend fun connectWithCode(
        code: String,
        pin: String,
        parentNameFallback: String = "Orang Tua",
        childNameFallback: String = "Anak",
        batteryLevelSekarang: Int? = null,
        androidDeviceId: String? = null
    ) {
        // --- Validasi input sebelum network call ---
        require(code.isNotBlank()) { "Kode pairing tidak boleh kosong." }
        require(pin.isNotBlank()) { "PIN pairing tidak boleh kosong." }
        require(pin.length in 4..10) { "PIN pairing harus 4-10 digit." }
        require(batteryLevelSekarang == null || batteryLevelSekarang in 0..100) {
            "Battery level harus antara 0-100."
        }

        // =====================================================================
        // STEP 1 (AN2): Cek status pairing di server — apakah kode valid / expired.
        // =====================================================================
        val statusResp = apiCall { apiService.getPairingStatus(code = code) }
        if (!statusResp.success) {
            error("Kode pairing tidak valid: ${statusResp.message ?: "Terjadi kesalahan"}")
        }
        val status = statusResp.data
        if (status.expired) {
            error("Kode pairing sudah kedaluwarsa. Silakan generate kode baru di dashboard Orang Tua.")
        }
        if (status.paired) {
            error("Kode pairing ini sudah digunakan oleh perangkat lain.")
        }

        // =====================================================================
        // STEP 2 (AN3): POST confirm pairing — kirim code + pin + info perangkat.
        // =====================================================================
        val namaPerangkat = Build.MODEL?.takeIf { it.isNotBlank() } ?: "Perangkat Android"
        val modelDevice = Build.DEVICE?.takeIf { it.isNotBlank() }
        val osVersi = "Android ${Build.VERSION.RELEASE}"
        val appVersi = com.parental.litensikids.BuildConfig.VERSION_NAME

        val confirmResp = apiCall {
            apiService.confirmPairing(
                code = code,
                pin = pin,
                deviceId = androidDeviceId,
                namaPerangkat = namaPerangkat,
                model = modelDevice,
                osVersion = osVersi,
                appVersion = appVersi,
                battery = batteryLevelSekarang,
                fcmToken = null,
                // (Baru) Kirim nama panggilan anak dari input user di PairingScreen ke backend
                // untuk disimpan ke ProfilAnak.name (rule: tidak overwrite jika name sudah diisi user web)
                childName = childNameFallback.takeIf { it.isNotBlank() }
            )
        }

        if (!confirmResp.success) {
            error(confirmResp.message ?: "Pairing gagal: kesalahan pada server.")
        }
        val confirmData = confirmResp.data
        if (!confirmData.paired) {
            error("Pairing gagal: status paired=false dari server.")
        }

        // =====================================================================
        // STEP 3: Dapat profil_anak dari response confirm (jika null — jarang, coba sync AN4)
        // =====================================================================
        val userIdOrtu = confirmData.userId
            ?: error("User ID Orang Tua tidak ditemukan di response pairing.")

        val profilAnakDto = confirmData.profilAnak ?: run {
            // Jika response confirm tidak include profil_anak, coba get via endpoint AN4
            // (kondisi jarang terjadi; biasanya user belum klik "Simpan" data anak di web)
            error(
                "Profil Anak belum tersimpan di backend.\n" +
                "Silakan lengkapi data Profil Anak di dashboard Orang Tua, lalu coba pairing kembali."
            )
        }

        // Optional: call AN4 getProfilAnak untuk sync data terbaru (battery / is_online / used_today)
        val profilSync: ProfilAnakDto = runCatching {
            apiCall { apiService.getProfilAnak(id = profilAnakDto.id) }.data
        }.getOrDefault(profilAnakDto)

        // =====================================================================
        // STEP 4: SAVE ke Room — PairingState + ChildProfile (data 100% dari API)
        // =====================================================================
        val namaOrtu = profilSync.user?.name?.takeIf { it.isNotBlank() } ?: parentNameFallback
        val namaAnak = profilSync.name.takeIf { it.isNotBlank() } ?: childNameFallback

        val kuotaHarian = profilSync.avMinutesDailyOverride ?: 0
        val usedToday = profilSync.usedToday ?: 0
        val sisaWaktu = (kuotaHarian - usedToday).coerceAtLeast(0)

        // 4a. Save PairingState (termasuk field B3: profilAnakId / pinPairing / qrPairingCode / userIdOrtu)
        db.pairingDao().savePairingState(
            PairingStateEntity(
                isConnected = true,
                parentName = namaOrtu,
                childName = namaAnak,
                pairingCode = code,
                deviceType = "Smartphone",
                connectedAt = System.currentTimeMillis(),
                profilAnakId = profilSync.id,
                pinPairing = pin,
                qrPairingCode = profilSync.qrPairingCode ?: code,
                userIdOrtu = userIdOrtu
            )
        )

        // 4b. Save ChildProfile — SEMUA data dari API, TIDAK ADA HARDCODE!
        db.childProfileDao().saveProfile(
            ChildProfileEntity(
                points = 0, // modul point & reward belum ada API khusus; default 0
                screenTimeRemainingMinutes = sisaWaktu,
                totalScreenTimeMinutes = kuotaHarian,
                currentSafeZone = "", // modul safe zone name belum ada API; default kosong
                batteryLevel = profilSync.batteryLevel ?: batteryLevelSekarang ?: 0,
                isGpsActive = false, // actual permission cek di ViewModel
                lastCheckInTime = "" // akan di-update ketika user tap Check-in manual
            )
        )
    }

    suspend fun disconnect() {
        db.pairingDao().setConnected(false)
    }

    suspend fun completeTask(taskId: Long, rewardPoints: Int, currentPoints: Int) {
        db.taskDao().updateTaskStatus(taskId, "COMPLETED")
        db.childProfileDao().updatePoints(currentPoints + rewardPoints)
    }

    suspend fun addNewTask(title: String, points: Int, category: String) {
        db.taskDao().insertTask(
            TaskEntity(
                title = title,
                rewardPoints = points,
                status = "PENDING",
                category = category
            )
        )
    }

    suspend fun redeemReward(rewardId: Long, costPoints: Int, currentPoints: Int): Boolean {
        if (currentPoints >= costPoints) {
            db.rewardDao().updateRewardRedeemed(rewardId, true)
            db.childProfileDao().updatePoints(currentPoints - costPoints)
            return true
        }
        return false
    }

    suspend fun triggerSosAlert(location: String): SosLogEntity {
        val sosLog = SosLogEntity(
            timestamp = System.currentTimeMillis(),
            locationName = location,
            status = "ALERT_SENT"
        )
        db.sosDao().insertSosLog(sosLog)
        return sosLog
    }

    suspend fun performCheckIn(checkInTime: String) {
        db.childProfileDao().updateCheckInTime(checkInTime)
    }

    // =========================================================================
    // MODUL CHAT — Real API call (bukan hardcode sample / auto reply simulasi)
    // =========================================================================

    // CH2 — Get list pesan chat thread dari backend (per page 50)
    // @param anakId = PairingState.profilAnakId
    // @param userIdOrtu = PairingState.userIdOrtu (dibutuhkan oleh gate CH2 endpoint)
    suspend fun fetchChatMessages(
        anakId: Int,
        userIdOrtu: Int,
        page: Int = 1,
        perPage: Int = 50
    ): ChatListResponseDto {
        val resp = apiCall {
            apiService.getChatMessages(
                anakId = anakId,
                userId = userIdOrtu,
                page = page,
                perPage = perPage
            )
        }
        if (!resp.success) error(resp.message ?: "Gagal mengambil pesan.")
        return resp.data
    }

    // CH5 — Kirim pesan dari ANAK (Android companion) ke Orang Tua via backend.
    // Gate kepemilikan: pairingPin ATAU qrPairingCode WAJIB sesuai row ProfilAnak (403 jika salah).
    suspend fun sendChatMessageFromChild(
        anakId: Int,
        pairingPin: String?,
        qrPairingCode: String?,
        text: String
    ): ChatSendResponseDto {
        val textClean = text.trim()
        require(textClean.isNotEmpty()) { "Pesan tidak boleh kosong." }
        require(textClean.length <= 2000) { "Pesan maksimal 2000 karakter." }
        require(!pairingPin.isNullOrBlank() || !qrPairingCode.isNullOrBlank()) {
            "Gate kepemilikan: pairingPin atau qrPairingCode wajib disertakan."
        }
        val resp = apiCall {
            apiService.kirimPesanDariAnak(
                anakId = anakId,
                pairingPin = pairingPin,
                qrPairingCode = qrPairingCode,
                text = textClean
            )
        }
        if (!resp.success) error(resp.message ?: "Gagal mengirim pesan.")
        return resp.data
    }

    // =========================================================================
    // MODUL TELEMETRY (AN8) — Upload battery / online / used_today ke backend
    // =========================================================================
    // Dipanggil oleh WorkManager periodic atau setiap app foreground.
    suspend fun uploadTelemetry(
        anakId: Int,
        pairingPin: String?,
        qrPairingCode: String?,
        batteryLevel: Int? = null,
        isOnline: Boolean? = true,
        usedTodayMinutes: Int? = null
    ): TelemetryResponseDto {
        val resp = apiCall {
            apiService.uploadTelemetry(
                id = anakId,
                pairingPin = pairingPin,
                qrPairingCode = qrPairingCode,
                batteryLevel = batteryLevel,
                isOnline = isOnline,
                lastActive = null,
                usedToday = usedTodayMinutes
            )
        }
        if (!resp.success) error(resp.message ?: "Gagal upload telemetry.")
        return resp.data
    }

    // =========================================================================
    // MODUL FCM (F3) — Upload/Update FCM token perangkat Android ke backend
    // =========================================================================
    // Dipanggil oleh: (1) LitensiFirebaseMessagingService.onNewToken saat token berubah;
    //                 (2) ViewModel force getToken setelah pairing sukses (onboarding cache).
    // Gate kepemilikan: pairingPin ATAU qrPairingCode WAJIB salah satu NON EMPTY.
    suspend fun updateFcmTokenAnak(
        token: String?,
        id: Int,
        pairingPin: String?,
        qrPairingCode: String?
    ): FcmTokenResponseDto {
        require(!pairingPin.isNullOrBlank() || !qrPairingCode.isNullOrBlank()) {
            "Gate kepemilikan: pairingPin atau qrPairingCode wajib disertakan (minimal salah satu)."
        }
        // Token boleh NULL = case revoke token saat unpair (tidak ada flow unpair saat ini tapi support OK).
        val tokenClean = token?.takeIf { it.isNotBlank() }
        val resp = apiCall {
            apiService.updateFcmTokenAnak(
                id = id,
                pairingPin = pairingPin,
                qrPairingCode = qrPairingCode,
                fcmToken = tokenClean
            )
        }
        if (!resp.success) error(resp.message ?: "Gagal update FCM token perangkat anak.")
        return resp.data
    }

    // =========================================================================
    // MODUL GEOFENCE (G3.8 / GF1) — Ambil list semua zona geofence user ID Orang Tua
    // =========================================================================
    // Dipanggil oleh GeofenceManager saat pairing baru → untuk add semua zona aktif ke Play Services GeofencingClient.
    // Validasi pertahanan: userId WAJIB positive integer (minimal 1).
    suspend fun getGeofenceList(userIdOrtu: Int): List<ZonaGeofenceDto> {
        require(userIdOrtu > 0) { "getGeofenceList: userIdOrtu harus > 0 (nilai dikirim=$userIdOrtu)." }
        val resp = apiCall {
            apiService.getGeofenceList(userId = userIdOrtu)
        }
        if (!resp.success) error(resp.message ?: "Gagal get list zona geofence user=$userIdOrtu.")
        return resp.data
    }

    // =========================================================================
    // MODUL GPS (G3.5 / AN10) — Upload satu point GPS pergerakan ke backend
    // =========================================================================
    // Dipanggil oleh: GPSUploadWorker.doWork() saat flush batch 10 point Room pending.
    // Gate kepemilikan: EXACT COPY pattern F3 updateFcmTokenAnak (L352). Minimal salah satu pin/qr non empty.
    // Validasi pertahanan (defensive) di level repository: lat/lng range WGS84 & capturedAt tidak kosong.
    suspend fun uploadGpsPergerakan(
        anakId: Int,
        pairingPin: String?,
        qrPairingCode: String?,
        latitude: Double,
        longitude: Double,
        capturedAtIso: String,
        accuracyMeters: Int? = null,
        batteryLevel: Int? = null,
        speedKmh: Double? = null,
        altitudeMeters: Double? = null,
        isMockDetected: Boolean? = null
    ): GpsUploadResponseDto {
        // (1) Gate kepemilikan: minimal salah satu PIN atau QR pairing code NON EMPTY dan value benar di server-side validate.
        require(!pairingPin.isNullOrBlank() || !qrPairingCode.isNullOrBlank()) {
            "Gate kepemilikan GPS: pairingPin atau qrPairingCode wajib disertakan (minimal salah satu)."
        }
        // (2) Validasi range latitude/longitude (WGS84 standard) agar tidak mengirim data corrupt ke backend.
        require(latitude in -90.0..90.0) {
            "Latitude GPS harus antara -90 s/d 90 derajat (nilai dikirim=$latitude)."
        }
        require(longitude in -180.0..180.0) {
            "Longitude GPS harus antara -180 s/d 180 derajat (nilai dikirim=$longitude)."
        }
        // (3) capturedAt WAJIB ada (waktu dari HP, bukan server) untuk snapshot ProfilAnak.last_gps_captured_at.
        require(capturedAtIso.isNotBlank()) {
            "capturedAt ISO 8601 waktu HP tidak boleh kosong (wajib kirim waktu capture GPS asli perangkat)."
        }
        // (4) Validasi tambahan: battery 0-100, accuracy >=0 (jika dikirim)
        if (batteryLevel != null) require(batteryLevel in 0..100) {
            "Battery level harus antara 0-100 (nilai=$batteryLevel)."
        }
        if (accuracyMeters != null) require(accuracyMeters >= 0) {
            "Accuracy GPS tidak boleh negatif (nilai=$accuracyMeters)."
        }

        val resp = apiCall {
            apiService.uploadGpsPergerakan(
                id = anakId,
                pairingPin = pairingPin,
                qrPairingCode = qrPairingCode,
                latitude = latitude,
                longitude = longitude,
                capturedAtIso = capturedAtIso,
                accuracyMeters = accuracyMeters,
                batteryLevel = batteryLevel,
                speedKmh = speedKmh,
                altitudeMeters = altitudeMeters,
                // (G10.1) Konversi Boolean? → Int? 0/1:
                // Retrofit @Field Boolean di-encode ke literal string "true"/"false" lowercase,
                // yang DITOLAK oleh Laravel boolean validation rule PHP 8.5 strict (422 error
                // menyebabkan redirect 302 ke SPA HTML JIKA Accept JSON header tidak dikirim).
                // Kirim Int? 0/1 → di-encode ke string "0"/"1" yang SELALU lolos validasi boolean.
                isMockDetected = if (isMockDetected == null) null else if (isMockDetected) 1 else 0
            )
        }
        if (!resp.success) error(resp.message ?: "Gagal upload data GPS pergerakan anak.")
        return resp.data
    }
}
