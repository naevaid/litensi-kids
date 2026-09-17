package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.LitensiKidsDatabase
import com.example.data.model.ChildProfileEntity
import com.example.data.model.PairingStateEntity
import com.example.data.model.RewardEntity
import com.example.data.model.SosLogEntity
import com.example.data.model.TaskEntity
import com.example.data.repository.LitensiRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
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

    private val _chatMessages = MutableStateFlow(
        listOf(
            ChatMessage(
                id = "1",
                senderName = "Mama",
                isFromChild = false,
                messageText = "Halo Budi! ❤️ Jangan lupa kerjakan tugas matematika dan istirahat ya nak.",
                timestamp = "08:15 WIB"
            ),
            ChatMessage(
                id = "2",
                senderName = "Budi",
                isFromChild = true,
                messageText = "Siap Ma, tugas matematika sudah Budi selesaikan di aplikasi! ✨",
                timestamp = "08:30 WIB"
            ),
            ChatMessage(
                id = "3",
                senderName = "Mama",
                isFromChild = false,
                messageText = "Anak hebat! Nanti sore Mama belikan es krim hadiahmu ya 🍦",
                timestamp = "08:32 WIB"
            )
        )
    )
    val chatMessages: StateFlow<List<ChatMessage>> = _chatMessages.asStateFlow()

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

    // Device Admin Permissions State
    private val _permissionsState = MutableStateFlow(
        mapOf(
            "GPS Lokasi" to true,
            "Aksesibilitas Overlay" to true,
            "Penggunaan Aplikasi" to true,
            "Kamera Device" to true
        )
    )
    val permissionsState: StateFlow<Map<String, Boolean>> = _permissionsState.asStateFlow()

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

        // Auto-navigate to Dashboard if already connected
        viewModelScope.launch {
            pairingState.collect { state ->
                if (state?.isConnected == true && _currentScreen.value == AppScreen.WELCOME) {
                    _currentScreen.value = AppScreen.DASHBOARD
                }
            }
        }
    }

    fun navigateTo(screen: AppScreen) {
        _currentScreen.value = screen
    }

    fun connectDevice(parentName: String, childName: String, code: String) {
        viewModelScope.launch {
            repository.connectWithCode(parentName, childName, code)
            _currentScreen.value = AppScreen.PERMISSION_ONBOARDING
        }
    }

    fun completePermissionOnboarding() {
        _currentScreen.value = AppScreen.DASHBOARD
    }

    fun disconnectDevice() {
        viewModelScope.launch {
            repository.disconnect()
            _currentScreen.value = AppScreen.WELCOME
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
            // Execute SOS trigger
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
        val loc = childProfile.value?.currentSafeZone ?: "Zona Sekolah SDN 01"
        viewModelScope.launch {
            repository.triggerSosAlert("Darurat dari Perangkat Anak di $loc")
            _sosSentSuccessModal.value = true
        }
    }

    fun dismissSosSentModal() {
        _sosSentSuccessModal.value = false
    }

    fun completeTask(task: TaskEntity) {
        val currentPoints = childProfile.value?.points ?: 250
        viewModelScope.launch {
            repository.completeTask(task.id, task.rewardPoints, currentPoints)
        }
    }

    fun addNewTask(title: String, points: Int, category: String) {
        viewModelScope.launch {
            repository.addNewTask(title, points, category)
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

    fun sendChatMessage(text: String) {
        if (text.isBlank()) return
        val currentTime = SimpleDateFormat("HH:mm 'WIB'", Locale.getDefault()).format(Date())
        val childName = pairingState.value?.childName ?: "Anak"
        val newMsg = ChatMessage(
            id = System.currentTimeMillis().toString(),
            senderName = childName,
            isFromChild = true,
            messageText = text.trim(),
            timestamp = currentTime
        )
        _chatMessages.value = _chatMessages.value + newMsg

        viewModelScope.launch {
            delay(1800)
            val parentName = pairingState.value?.parentName ?: "Orang Tua"
            val replies = listOf(
                "Pesan diterima $childName! Tetap semangat ya nak ❤️",
                "Ibu sudah baca pesannya. Selalu atur waktu layarmu ya ✨",
                "Oke sayang! Nanti Ibu cek lagi lokasi dan tugasmu 👍",
                "Anak pintar! Tetap fokus belajar dan jaga kesehatan ya!"
            )
            val replyMsg = ChatMessage(
                id = (System.currentTimeMillis() + 1).toString(),
                senderName = parentName,
                isFromChild = false,
                messageText = replies.random(),
                timestamp = SimpleDateFormat("HH:mm 'WIB'", Locale.getDefault()).format(Date())
            )
            _chatMessages.value = _chatMessages.value + replyMsg
        }
    }
}
