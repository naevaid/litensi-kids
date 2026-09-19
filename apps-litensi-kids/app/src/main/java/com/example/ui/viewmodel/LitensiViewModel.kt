package com.example.ui.viewmodel

import android.Manifest
import android.app.AppOpsManager
import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.LitensiKidsDatabase
import com.example.data.location.GeofenceManager
import com.example.data.location.GPSLocationManager
import com.example.data.model.ChildProfileEntity
import com.example.data.model.PairingStateEntity
import com.example.data.model.RewardEntity
import com.example.data.model.SosLogEntity
import com.example.data.model.TaskEntity
import com.example.data.repository.LitensiRepository
import com.example.data.work.GPSUploadWorker
import com.example.data.work.LitensiTelemetryWorker
import com.google.firebase.Firebase
import com.google.firebase.messaging.messaging
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class AppScreen {
    WELCOME,
    PAIRING,
    PERMISSION_ONBOARDING,
    DASHBOARD
}

enum class DashboardTab {
    CHAT,
    BERANDA,
    PROFIL
}

data class ChatMessage(
    val id: String,
    val senderName: String,
    val isFromChild: Boolean,
    val messageText: String,
    val timestamp: String
)

class LitensiViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: LitensiRepository

    val pairingState: StateFlow<PairingStateEntity?>
    val tasks: StateFlow<List<TaskEntity>>
    val rewards: StateFlow<List<RewardEntity>>
    val sosLogs: StateFlow<List<SosLogEntity>>
    val childProfile: StateFlow<ChildProfileEntity?>

    private val _currentScreen = MutableStateFlow(AppScreen.WELCOME)
    val currentScreen: StateFlow<AppScreen> = _currentScreen.asStateFlow()

    private val _selectedTab = MutableStateFlow(DashboardTab.BERANDA)
    val selectedTab: StateFlow<DashboardTab> = _selectedTab.asStateFlow()

    // ============================================================
    // (B5 Item 2) ChatMessages: EMPTY LIST default! 3 sample Mama+Budi DIHAPUS.
    // Nilai aktual diisi dari CH2 API setelah pairing berhasil.
    // ============================================================
    private val _chatMessages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chatMessages: StateFlow<List<ChatMessage>> = _chatMessages.asStateFlow()

    private val _chatLoading = MutableStateFlow(false)
    val chatLoading: StateFlow<Boolean> = _chatLoading.asStateFlow()

    private val _chatSendLoading = MutableStateFlow(false)
    val chatSendLoading: StateFlow<Boolean> = _chatSendLoading.asStateFlow()

    // SOS Emergency Countdown State
    private val _sosCountdownActive = MutableStateFlow(false)
    val sosCountdownActive: StateFlow<Boolean> = _sosCountdownActive.asStateFlow()

    private val _sosCountdownSeconds = MutableStateFlow(3)
    val sosCountdownSeconds: StateFlow<Int> = _sosCountdownSeconds.asStateFlow()

    private val _sosSentSuccessModal = MutableStateFlow(false)
    val sosSentSuccessModal: StateFlow<Boolean> = _sosSentSuccessModal.asStateFlow()

    private var sosCountdownJob: Job? = null

    // Parent Live Audio/Video Call Simulation
    private val _showParentCallModal = MutableStateFlow(false)
    val showParentCallModal: StateFlow<Boolean> = _showParentCallModal.asStateFlow()

    // Check-in status
    private val _checkInMessage = MutableStateFlow<String?>(null)
    val checkInMessage: StateFlow<String?> = _checkInMessage.asStateFlow()

    // Reward message
    private val _rewardMessage = MutableStateFlow<String?>(null)
    val rewardMessage: StateFlow<String?> = _rewardMessage.asStateFlow()

    // ============================================================
    // (B5 Item 3) PermissionsState: DEFAULT FALSE SEMUA! Jangan hardcode true.
    // Actual status diisi oleh method refreshPermissionsState() via ContextCompat.
    // ============================================================
    private val _permissionsState = MutableStateFlow(
        mapOf(
            "GPS Lokasi" to false,
            "Aksesibilitas Overlay" to false,
            "Penggunaan Aplikasi" to false,
            "Kamera Device" to false
        )
    )
    val permissionsState: StateFlow<Map<String, Boolean>> = _permissionsState.asStateFlow()

    // ============================================================
    // Toast / Snackbar state untuk error & success message UI global
    // ============================================================
    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    // Loading state untuk button pairing (hindari double submit)
    private val _pairingLoading = MutableStateFlow(false)
    val pairingLoading: StateFlow<Boolean> = _pairingLoading.asStateFlow()

    init {
        val database = LitensiKidsDatabase.getDatabase(application)
        repository = LitensiRepository(database)

        pairingState = repository.pairingState.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

        tasks = repository.tasks.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

        rewards = repository.rewards.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

        sosLogs = repository.sosLogs.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

        childProfile = repository.childProfile.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

        // (B5 Item 6) Auto-navigate + Fetch messages & permissions setelah pairing sukses
        viewModelScope.launch {
            pairingState.collect { state ->
                if (state?.isConnected == true) {
                    // Auto navigate dari WELCOME → DASHBOARD jika sudah terhubung
                    if (_currentScreen.value == AppScreen.WELCOME) {
                        _currentScreen.value = AppScreen.DASHBOARD
                    }
                    // Fetch list chat terbaru dari CH2 API (jika ID tersedia)
                    val anakId = state.profilAnakId
                    val userIdOrtu = state.userIdOrtu
                    if (anakId != null && userIdOrtu != null) {
                        fetchChatMessages(anakId, userIdOrtu)
                    }
                    // Refresh status permission actual dari Android system
                    refreshPermissionsState(application)

                    // ==========================================================================
                    // (F5.3) FORCE GET & UPLOAD FCM TOKEN SEKALI SETELAH PAIRING TERSAMBUNG
                    // --------------------------------------------------------------------------
                    // ALASAN: onNewToken() Firebase service TIDAK AKAN DIPANGGIL untuk token
                    //   yang SUDAH ADA di cache Firebase lokal (kasus: app sudah terinstall
                    //   sebelum service di-upgrade, atau user baru selesai pairing pertama kali
                    //   tapi token cache sudah ada sejak install awal). Force get disini memastikan
                    //   token langsung ter-upload ke backend TANPA menunggu onNewToken berikutnya.
                    // Cover BOTH KASUS: (a) Re-open app setelah restar (sudah paired dari sebelumnya)
                    //                   (b) Fresh pairing flow BARU (setelah Room save state, collect
                    //                       akan ter-trigger lagi dengan state baru isConnected=true).
                    // ==========================================================================
                    val pin = state.pinPairing
                    val qr = state.qrPairingCode
                    if (anakId != null && (!pin.isNullOrBlank() || !qr.isNullOrBlank())) {
                        // ==========================================================================
                        // (F5.3) FORCE GET & UPLOAD FCM TOKEN SEKALI SETELAH PAIRING TERSAMBUNG
                        // --------------------------------------------------------------------------
                        // REFACTORED (Sep 2026): HAPUS DEPRECATED FirebaseMessaging.getToken() Task
                        //   Java callback (addOnSuccessListener) yang deprecated di Firebase BOM 34+.
                        //   Ganti dengan idiomatic Kotlin Coroutine Task.await() via extension
                        //   kotlinx-coroutines-play-services.
                        //
                        // ALASAN FORCE GET TETAP DIPERTAHANKAN:
                        //   onNewToken() Firebase service TIDAK AKAN DIPANGGIL untuk token
                        //   yang SUDAH ADA di cache Firebase lokal (kasus: app sudah terinstall
                        //   sebelum service di-upgrade, atau user baru selesai pairing pertama kali
                        //   tapi token cache sudah ada sejak install awal). Force get disini memastikan
                        //   token langsung ter-upload ke backend TANPA menunggu onNewToken berikutnya.
                        // Cover BOTH KASUS: (a) Re-open app setelah restart (sudah paired dari sebelumnya)
                        //                   (b) Fresh pairing flow BARU (setelah Room save state, collect
                        //                       akan ter-trigger lagi dengan state baru isConnected=true).
                        // ==========================================================================
                        runCatching {
                            // Non-deprecated: Kotlin suspend via Task.await() coroutines-play-services.
                            Firebase.messaging.token.await()
                        }.onSuccess { freshToken ->
                            if (freshToken.isNotBlank()) {
                                runCatching {
                                    repository.updateFcmTokenAnak(
                                        token = freshToken,
                                        id = anakId,
                                        pairingPin = pin,
                                        qrPairingCode = qr
                                    )
                                }.onSuccess { result ->
                                    Log.d(
                                        "LitensiViewModel-FCM",
                                        "Force upload FCM token BERHASIL (after pairing): " +
                                        "tokenLen=${result.fcmTokenLength}, " +
                                        "updatedAt=${result.updatedAt}"
                                    )
                                }.onFailure { err ->
                                    Log.w(
                                        "LitensiViewModel-FCM",
                                        "Force upload FCM token GAGAL (non-fatal, retry via onNewToken nanti): ${err.message}",
                                        err
                                    )
                                }
                            } else {
                                Log.w("LitensiViewModel-FCM", "Force get FCM token: token kosong dari Firebase — skip upload.")
                            }
                        }.onFailure { err ->
                            Log.w(
                                "LitensiViewModel-FCM",
                                "Firebase.messaging.token gagal diambil via await() (non-fatal, Google Play Services unavailable?): ${err.message}",
                                err
                            )
                        }
                    } else {
                        Log.w(
                            "LitensiViewModel-FCM",
                            "Gate kepemilikan FCM force upload: anakId=$anakId, " +
                            "pinLen=${pin?.length ?: 0}, qrLen=${qr?.length ?: 0} — skip upload."
                        )
                    }

                    // ==========================================================================
                    // (G3.10) SCHEDULE WORKER GPS + TELEMETRY + INIT LOCATION TRACKING + GEOFENCE
                    // --------------------------------------------------------------------------
                    // Dijalankan SETIAP KALI state pairing collect detect isConnected=true
                    //   (cover 2 kasus: Fresh pairing BARU & Re-open app SETELAH HP restart).
                    // ExistingPeriodicWorkPolicy.KEEP = jika worker sudah di-schedule, TIDAK dibuat ulang.
                    // ==========================================================================
                    val ctx = getApplication<Application>()
                    if (anakId != null && userIdOrtu != null) {
                        // 1. Schedule TelemetryWorker 15min (battery + usage stats upload AN8)
                        LitensiTelemetryWorker.schedulePeriodic(ctx)
                        Log.i("LitensiViewModel-G3", "TelemetryWorker schedulePeriodic KEEP done.")

                        // 2. Schedule GPSUploadWorker 15min (flush cache GPS ke AN10 endpoint)
                        GPSUploadWorker.schedulePeriodic(ctx)
                        Log.i("LitensiViewModel-G3", "GPSUploadWorker schedulePeriodic KEEP done.")

                        // 3. (P2 SAFETY NET) Schedule LitensiSyncDownloadWorker 15min →
                        //    Pull download sync profil_anak latest kuota + reload geofence GF1 terbaru.
                        //    Garansi walau FCM push missed Doze / offline HP restart tanpa buka app.
                        LitensiSyncDownloadWorker.schedulePeriodic(ctx)
                        Log.i("LitensiViewModel-G3", "LitensiSyncDownloadWorker schedulePeriodic KEEP done (P2 sync periodic 15min safety net).")

                        // 4. Mulai GPS tracking FusedLocationProviderClient (interval 5min, displacement 10m)
                        // (G8.1 FIX BUG): Inject callback onPermissionMissing untuk JIKA user BELUM grant location permission
                        //   → SET _toastMessage ERROR BANNER MERAH dengan panduan langkah-langkah setting "Allow all the time".
                        //   TIDAK BOLEH skip silent cuma log.w "ACCESS_FINE_LOCATION BELUM di-grant" tanpa user tau!
                        GPSLocationManager.requestLocationUpdates(
                            context = ctx,
                            profilAnakId = anakId,
                            onPermissionMissing = { pesanError ->
                                Log.w("LitensiViewModel-G3", "GPSLocationManager onPermissionMissing triggered → set toastMessage error banner merah!")
                                _toastMessage.value = ("⚠️ PERIZINAN LOKASI DIBUTUHKAN AGAR GPS TRACKING BERJALAN (marker web tidak akan bergerak kalau ini dilewati):\n\n$pesanError")
                            }
                        )
                        Log.i("LitensiViewModel-G3", "GPSLocationManager requestLocationUpdates started for anak=$anakId (dengan onPermissionMissing callback error)")

                        // 5. Load list zona geofence dari GF1 API → register ke GeofencingClient Play Services
                        //    (asynchronous IO di GeofenceManager internal coroutine scope, tidak block UI)
                        GeofenceManager.loadAndRegisterAllZones(ctx, profilAnakId = anakId, userIdOrtu = userIdOrtu)
                        Log.i("LitensiViewModel-G3", "GeofenceManager loadAndRegisterAllZones triggered (async IO, user=$userIdOrtu)")
                    } else {
                        Log.w("LitensiViewModel-G3", "Skip schedule GPS/Telemetry/Sync worker: anakId=$anakId userIdOrtu=$userIdOrtu")
                    }
                }
            }
        }
    }

    fun navigateTo(screen: AppScreen) {
        _currentScreen.value = screen
    }

    fun clearToastMessage() {
        _toastMessage.value = null
    }

    // ============================================================
    // (B5 Item 4) Pairing ConnectDevice — signature BARU real API.
    // Parameter lama (parentName, childName, code) DIHAPUS.
    // Parameter BARU (code, pin, battery, androidId) + try/catch error state.
    // ============================================================
    fun connectDevice(
        code: String,
        pin: String,
        parentNameFallback: String = "Orang Tua",
        childNameFallback: String = "Anak"
    ) {
        if (_pairingLoading.value) return
        _pairingLoading.value = true
        _toastMessage.value = null

        viewModelScope.launch {
            val battery = getCurrentBatteryLevel(getApplication())
            val androidId = getAndroidId(getApplication())

            runCatching {
                repository.connectWithCode(
                    code = code,
                    pin = pin,
                    parentNameFallback = parentNameFallback,
                    childNameFallback = childNameFallback,
                    batteryLevelSekarang = battery,
                    androidDeviceId = androidId
                )
            }.onSuccess {
                _toastMessage.value = "✅ Pairing berhasil! Perangkat terhubung ke akun Orang Tua."
                // Flow: Pairing → Permission Onboarding → Dashboard (existing pattern)
                _currentScreen.value = AppScreen.PERMISSION_ONBOARDING
            }.onFailure { err ->
                _toastMessage.value = "❌ Gagal pairing: ${err.message ?: "Kesalahan tidak diketahui"}"
            }

            _pairingLoading.value = false
        }
    }

    fun completePermissionOnboarding() {
        _currentScreen.value = AppScreen.DASHBOARD
    }

    fun disconnectDevice() {
        viewModelScope.launch {
            val ctx = getApplication<Application>()

            // (B7) Cancel TelemetryWorker periodic 15min di-cancel sebelum state disconnect (double safety)
            LitensiTelemetryWorker.cancel(ctx)

            // (G3.10) Cancel GPSUploadWorker periodic 15min + expedited geofence one-time work
            GPSUploadWorker.cancel(ctx)

            // (P2 SAFETY NET) Cancel LitensiSyncDownloadWorker periodic 15min agar tidak boros baterai setelah unpair
            LitensiSyncDownloadWorker.cancel(ctx)

            // (G3.10) Stop FusedLocationProviderClient GPS tracking (agar tidak boros baterai setelah unpair)
            GPSLocationManager.removeUpdates(ctx)

            // (G3.10) Remove semua Geofence zone yang terdaftar dari Play Services GeofencingClient
            GeofenceManager.removeAllZones(ctx)

            // (G3.10) Hapus SEMUA cache GPS pending di Room local cache (tidak ada gunanya setelah unpair)
            runCatching {
                LitensiKidsDatabase.getDatabase(ctx).gpsCacheDao().clearAll()
            }

            repository.disconnect()
            _currentScreen.value = AppScreen.WELCOME
            _chatMessages.value = emptyList() // bersihkan chat saat disconnect
            _toastMessage.value = "Perangkat telah terputus dari akun Orang Tua."
            Log.i("LitensiViewModel-G3", "disconnectDevice: Semua worker (Telemetry/GPSUpload/SyncDownload) + GPS + Geofence di-cleanup SUKSES.")
        }
    }

    fun startSosEmergencyTimer() {
        _sosCountdownActive.value = true
        _sosCountdownSeconds.value = 3
        sosCountdownJob?.cancel()

        sosCountdownJob = viewModelScope.launch {
            for (sec in 3 downTo 1) {
                _sosCountdownSeconds.value = sec
                delay(1000)
            }
            triggerSosAlert()
        }
    }

    fun cancelSosEmergency() {
        sosCountdownJob?.cancel()
        _sosCountdownActive.value = false
        _sosCountdownSeconds.value = 3
    }

    private fun triggerSosAlert() {
        _sosCountdownActive.value = false
        val loc = childProfile.value?.currentSafeZone?.takeIf { it.isNotBlank() }
            ?: "Lokasi perangkat tidak diketahui"
        viewModelScope.launch {
            repository.triggerSosAlert("Darurat dari Perangkat Anak di $loc")
            _sosSentSuccessModal.value = true
        }
    }

    fun dismissSosSentModal() {
        _sosSentSuccessModal.value = false
    }

    fun completeTask(task: TaskEntity) {
        val currentPoints = childProfile.value?.points ?: 0
        viewModelScope.launch {
            repository.completeTask(task.id, task.rewardPoints, currentPoints)
            _toastMessage.value = "🎉 Tugas '${task.title}' selesai! +${task.rewardPoints} poin."
        }
    }

    fun addNewTask(title: String, points: Int, category: String) {
        viewModelScope.launch {
            repository.addNewTask(title, points, category)
            _toastMessage.value = "Tugas baru '${title}' berhasil ditambahkan."
        }
    }

    fun redeemReward(reward: RewardEntity) {
        val currentPts = childProfile.value?.points ?: 0
        viewModelScope.launch {
            val success = repository.redeemReward(reward.id, reward.pointCost, currentPts)
            if (success) {
                _rewardMessage.value = "Berhasil klaim '${reward.title}'! Kode voucher telah dikirim ke HP Orang Tua."
            } else {
                _rewardMessage.value = "Poin tidak cukup! Selesaikan tugas untuk menambah poin."
            }
        }
    }

    fun clearRewardMessage() {
        _rewardMessage.value = null
    }

    fun performCheckIn() {
        val currentTime = SimpleDateFormat("HH:mm 'WIB'", Locale.getDefault()).format(Date())
        viewModelScope.launch {
            repository.performCheckIn(currentTime)
            _checkInMessage.value = "Check-in Berhasil! Ibu telah menerima kabar lokasi kamu jam $currentTime ✨"
        }
    }

    fun clearCheckInMessage() {
        _checkInMessage.value = null
    }

    fun toggleParentCallModal(show: Boolean) {
        _showParentCallModal.value = show
    }

    fun togglePermission(permName: String) {
        val current = _permissionsState.value.toMutableMap()
        current[permName] = !(current[permName] ?: false)
        _permissionsState.value = current
    }

    fun selectTab(tab: DashboardTab) {
        _selectedTab.value = tab
    }

    // ============================================================
    // (B5 Item 3) Refresh status permission ACTUAL dari Android System.
    // JANGAN hardcode true/false.
    // ============================================================
    fun refreshPermissionsState(context: Context) {
        val gpsGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val overlayGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }

        val usageGranted = checkUsageStatsPermission(context)

        val cameraGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED

        _permissionsState.value = mapOf(
            "GPS Lokasi" to gpsGranted,
            "Aksesibilitas Overlay" to overlayGranted,
            "Penggunaan Aplikasi" to usageGranted,
            "Kamera Device" to cameraGranted
        )
    }

    // Helper cek AppOps untuk permission usage stats (bukan runtime permission standard)
    // NOTE: Overload 4-param (attributionTag) TIDAK ADA di public SDK API (hidden/restricted).
    // Pakai overload 3-param (op, uid, pkg) standard untuk SEMUA SDK ≥ 24.
    // Deprecated di API 29+ tapi tetap tersedia di compileSdk 36 (backward compat Google never delete).
    @Suppress("DEPRECATION")
    private fun checkUsageStatsPermission(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager?
            ?: return false
        val opStr = AppOpsManager.OPSTR_GET_USAGE_STATS
        val uid = android.os.Process.myUid()
        val pkg = context.packageName

        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(opStr, uid, pkg)
        } else {
            appOps.checkOpNoThrow(opStr, uid, pkg)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    // ============================================================
    // (B5 Item 6) Fetch chat messages dari CH2 API real (bukan hardcode!).
    // Dipanggil otomatis oleh init viewModel saat pairing state connected.
    // ============================================================
    fun fetchChatMessages(anakId: Int, userIdOrtu: Int, page: Int = 1) {
        viewModelScope.launch {
            _chatLoading.value = true
            runCatching {
                repository.fetchChatMessages(anakId, userIdOrtu, page)
            }.onSuccess { listDto ->
                val namaAnak = pairingState.value?.childName ?: "Anak"
                val namaOrtu = pairingState.value?.parentName ?: "Orang Tua"
                // List dari backend urut DESC (terbaru dulu). Reverse agar tampil UI ASC (terlama di atas)
                val mapped = listDto.list.reversed().map { msgDto ->
                    ChatMessage(
                        id = msgDto.id.toString(),
                        senderName = if (msgDto.sender == "child") namaAnak else namaOrtu,
                        isFromChild = msgDto.sender == "child",
                        messageText = msgDto.text,
                        timestamp = formatIsoToTime(msgDto.timestamp)
                    )
                }
                _chatMessages.value = mapped
            }.onFailure { err ->
                _toastMessage.value = "⚠️ Gagal memuat pesan: ${err.message ?: "Periksa koneksi internet"}"
            }
            _chatLoading.value = false
        }
    }

    // ============================================================
    // (B5 Item 5) sendChatMessage — AUTO-REPLY SIMULASI DIHAPUS!
    // Kirim pesan via CH5 API, tambah ke list HANYA JIKA saved_to_db=true.
    // ============================================================
    fun sendChatMessage(text: String) {
        if (text.isBlank() || _chatSendLoading.value) return

        val state = pairingState.value
        val anakId = state?.profilAnakId
        val pin = state?.pinPairing
        val qr = state?.qrPairingCode
        if (anakId == null || (pin.isNullOrBlank() && qr.isNullOrBlank())) {
            _toastMessage.value = "❌ Perangkat belum terpairing: pairingPin/qrPairingCode tidak tersedia di Room."
            return
        }

        val timeNow = SimpleDateFormat("HH:mm 'WIB'", Locale.getDefault()).format(Date())
        val childName = state?.childName ?: "Anak"

        // Optimistic UI prepend dulu (tampilkan pesan user sebelum response API kembali)
        val tempMsg = ChatMessage(
            id = "tmp_${System.currentTimeMillis()}",
            senderName = childName,
            isFromChild = true,
            messageText = text.trim(),
            timestamp = timeNow
        )
        val originalList = _chatMessages.value
        _chatMessages.value = originalList + tempMsg

        _chatSendLoading.value = true
        viewModelScope.launch {
            runCatching {
                repository.sendChatMessageFromChild(
                    anakId = anakId,
                    pairingPin = pin,
                    qrPairingCode = qr,
                    text = text
                )
            }.onSuccess { saved ->
                if (saved.savedToDb) {
                    // Ganti temp msg dengan ID dari DB actual
                    val realMsg = tempMsg.copy(id = saved.id.toString())
                    _chatMessages.value = _chatMessages.value.map { if (it.id == tempMsg.id) realMsg else it }
                    _toastMessage.value = "✅ Pesan terkirim ke ${saved.namaAnak}."
                } else {
                    // saved_to_db false (jarang), rollback temp
                    _chatMessages.value = originalList
                    _toastMessage.value = "❌ Pesan gagal disimpan di server."
                }
            }.onFailure { err ->
                _chatMessages.value = originalList // rollback
                _toastMessage.value = "❌ Gagal kirim: ${err.message ?: "Periksa koneksi"}"
            }
            _chatSendLoading.value = false
        }
    }

    // ============================================================
    // Helper utility
    // ============================================================

    // ISO timestamp backend → format "HH:mm WIB" untuk chat bubble
    private fun formatIsoToTime(iso: String): String {
        return runCatching {
            val parser = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.getDefault())
            } else {
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            }
            val date = parser.parse(iso.replace("Z", "+00:00").replaceAfter(".", "000Z")
                .replace("Z", "+00:00")) ?: return iso
            SimpleDateFormat("HH:mm 'WIB'", Locale.getDefault()).format(date)
        }.getOrDefault(iso)
    }

    // Helper dapat battery level saat ini 0-100 via BatteryManager (tanpa broadcast receiver)
    private fun getCurrentBatteryLevel(context: Context): Int? {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager? ?: return null
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).takeIf { it >= 0 }
    }

    // Helper dapat ANDROID_ID (Settings.Secure) untuk device_id pairing AN3 confirm
    private fun getAndroidId(context: Context): String? {
        return runCatching {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        }.getOrNull()
    }
}
