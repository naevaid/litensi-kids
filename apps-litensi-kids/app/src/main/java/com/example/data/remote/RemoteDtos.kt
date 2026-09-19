package com.example.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ============================================================
// DTO Pairing (AN2 + AN3) — 1:1 mapping shape response backend
// ============================================================

// Device info nested di dalam response pairing status / confirm
@JsonClass(generateAdapter = true)
data class DeviceInfoDto(
    @Json(name = "nama_perangkat") val namaPerangkat: String? = null,
    @Json(name = "model") val model: String? = null,
    @Json(name = "os") val os: String? = null,
    @Json(name = "versi_app") val versiApp: String? = null,
    @Json(name = "battery") val battery: Int? = null,
    @Json(name = "mac_address") val macAddress: String? = null,
    @Json(name = "fcm_token") val fcmToken: String? = null
)

// Response AN2 GET /anak/pairing/status
@JsonClass(generateAdapter = true)
data class PairingStatusDto(
    @Json(name = "code") val code: String,
    @Json(name = "paired") val paired: Boolean,
    @Json(name = "device_info") val deviceInfo: DeviceInfoDto? = null,
    @Json(name = "paired_at") val pairedAt: String? = null,
    @Json(name = "expired") val expired: Boolean
)

// User relation (Orang Tua) nested di ProfilAnakDto (from ->with('user'))
@JsonClass(generateAdapter = true)
data class UserOrtuDto(
    @Json(name = "id") val id: Int,
    @Json(name = "name") val name: String? = null,
    @Json(name = "email") val email: String? = null,
    @Json(name = "active_plan") val activePlan: String? = null,
    @Json(name = "children_count") val childrenCount: Int? = null,
    @Json(name = "devices_count") val devicesCount: Int? = null
)

// Shape ProfilAnak (from DB + relation user), digunakan oleh AN4 show, AN3 confirm, dst.
@JsonClass(generateAdapter = true)
data class ProfilAnakDto(
    @Json(name = "id") val id: Int,
    @Json(name = "user_id") val userId: Int,
    @Json(name = "name") val name: String,
    @Json(name = "age") val age: Int? = null,
    @Json(name = "gender") val gender: String? = null,
    @Json(name = "device_name") val deviceName: String? = null,
    @Json(name = "device_model") val deviceModel: String? = null,
    @Json(name = "os_version") val osVersion: String? = null,
    @Json(name = "battery_level") val batteryLevel: Int? = 0,
    @Json(name = "is_online") val isOnline: Boolean? = false,
    @Json(name = "status") val status: String? = null,
    @Json(name = "avatar") val avatar: String? = null,
    @Json(name = "qr_pairing_code") val qrPairingCode: String? = null,
    @Json(name = "pairing_pin") val pairingPin: String? = null,
    @Json(name = "paired_at") val pairedAt: String? = null,
    @Json(name = "last_active") val lastActive: String? = null,
    @Json(name = "used_today") val usedToday: Int? = 0,
    @Json(name = "av_minutes_daily_override") val avMinutesDailyOverride: Int? = null,
    @Json(name = "notes") val notes: String? = null,
    @Json(name = "user") val user: UserOrtuDto? = null,
    @Json(name = "created_at") val createdAt: String? = null,
    @Json(name = "updated_at") val updatedAt: String? = null
)

// Response AN3 POST /anak/pairing/confirm
@JsonClass(generateAdapter = true)
data class PairingConfirmResponseDto(
    @Json(name = "code") val code: String,
    @Json(name = "paired") val paired: Boolean,
    @Json(name = "paired_at") val pairedAt: String? = null,
    @Json(name = "device_info") val deviceInfo: DeviceInfoDto? = null,
    @Json(name = "user_id") val userId: Int? = null,
    @Json(name = "profil_anak") val profilAnak: ProfilAnakDto? = null,
    @Json(name = "expires_at") val expiresAt: String? = null
)

// ============================================================
// DTO Telemetry (AN8 POST /anak/{id}/telemetry)
// ============================================================
@JsonClass(generateAdapter = true)
data class TelemetryResponseDto(
    @Json(name = "id") val id: Int,
    @Json(name = "battery_level") val batteryLevel: Int,
    @Json(name = "is_online") val isOnline: Boolean,
    @Json(name = "last_active") val lastActive: String? = null,
    @Json(name = "used_today_minutes") val usedTodayMinutes: Int,
    @Json(name = "updated_at") val updatedAt: String
)

// ============================================================
// DTO Chat (CH2 list messages + CH5 kirim dari anak)
// ============================================================

// 1 row chat message dari list CH2
@JsonClass(generateAdapter = true)
data class ChatMessageDto(
    @Json(name = "id") val id: Int,
    @Json(name = "sender") val sender: String, // enum: parent / child / system
    @Json(name = "text") val text: String,
    @Json(name = "attachments") val attachments: List<Any>? = null,
    @Json(name = "is_read") val isRead: Boolean,
    @Json(name = "permintaan_waktu_id") val permintaanWaktuId: Int? = null,
    @Json(name = "timestamp") val timestamp: String
)

// Header info anak nested di CH2 response data.anak
@JsonClass(generateAdapter = true)
data class ChatAnakHeaderDto(
    @Json(name = "id") val id: Int,
    @Json(name = "name") val name: String,
    @Json(name = "avatar") val avatar: String? = null,
    @Json(name = "device_model") val deviceModel: String? = null,
    @Json(name = "battery") val battery: Int
)

// Response CH2 GET /chat/{anakId}/messages
@JsonClass(generateAdapter = true)
data class ChatListResponseDto(
    @Json(name = "list") val list: List<ChatMessageDto>,
    @Json(name = "total") val total: Int,
    @Json(name = "page") val page: Int,
    @Json(name = "per_page") val perPage: Int,
    @Json(name = "has_next") val hasNext: Boolean,
    @Json(name = "next_cursor") val nextCursor: Int? = null,
    @Json(name = "anak") val anak: ChatAnakHeaderDto
)

// Response CH5 POST /chat/{anakId}/kirim-dari-anak
@JsonClass(generateAdapter = true)
data class ChatSendResponseDto(
    @Json(name = "id") val id: Int,
    @Json(name = "anak_id") val anakId: Int,
    @Json(name = "nama_anak") val namaAnak: String,
    @Json(name = "sender") val sender: String, // "child"
    @Json(name = "text") val text: String,
    @Json(name = "attachments") val attachments: List<Any>? = null,
    @Json(name = "is_read") val isRead: Boolean,
    @Json(name = "timestamp") val timestamp: String,
    @Json(name = "saved_to_db") val savedToDb: Boolean,
    @Json(name = "thread_unread_orangtua_count") val threadUnreadOrangtuaCount: Int
)

// ============================================================
// DTO FCM Token (F3 POST /anak/{id}/fcm-token) — endpoint Android F5
// ============================================================
@JsonClass(generateAdapter = true)
data class FcmTokenResponseDto(
    @Json(name = "fcm_token_length") val fcmTokenLength: Int,
    @Json(name = "token_revoked") val tokenRevoked: Boolean,
    @Json(name = "updated_at") val updatedAt: String?
)
