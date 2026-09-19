package com.example.data.remote

import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// Interface Retrofit untuk 6 endpoint companion Android (AN2, AN3, AN4, AN8, CH2, CH5)
// SEMUA parameter @Field / @Query WAJIB 1:1 sesuai actual validate() di Controller (ZERO ASSUMPTION!)
// Semua method suspend (Coroutines) agar dipanggil via viewModelScope / IO dispatcher
interface LitensiApiService {

    // AN2 — Cek status pairing sebelum confirm (apakah kode valid / expired / sudah dipakai)
    @GET("api/v1/anak/pairing/status")
    suspend fun getPairingStatus(@Query("code") code: String): ApiResponse<PairingStatusDto>

    // AN3 — Konfirmasi pairing dari perangkat anak (Android) setelah scan QR / input manual
    // @Field WAJIB sesuai validate() L149 AnakController: code, pin, device_id s/d fcm_token + child_name (baru)
    @FormUrlEncoded
    @POST("api/v1/anak/pairing/confirm")
    suspend fun confirmPairing(
        @Field("code") code: String,
        @Field("pin") pin: String,
        @Field("device_id") deviceId: String? = null,
        @Field("nama_perangkat") namaPerangkat: String? = null,
        @Field("model") model: String? = null,
        @Field("os_version") osVersion: String? = null,
        @Field("app_version") appVersion: String? = null,
        @Field("battery") battery: Int? = null,
        @Field("fcm_token") fcmToken: String? = null,
        // (Baru) Nama panggilan anak dari user Android — opsional, boleh null
        @Field("child_name") childName: String? = null
    ): ApiResponse<PairingConfirmResponseDto>

    // AN4 — Get detail profil anak by ID (sync data setelah pairing confirm sukses)
    @GET("api/v1/anak/{id}")
    suspend fun getProfilAnak(@Path("id") id: Int): ApiResponse<ProfilAnakDto>

    // AN8 — Upload telemetry berkala (battery / online / last_active / used_today)
    // Gate kepemilikan: salah satu pairing_pin ATAU qr_pairing_code WAJIB cocok row.
    @FormUrlEncoded
    @POST("api/v1/anak/{id}/telemetry")
    suspend fun uploadTelemetry(
        @Path("id") id: Int,
        @Field("pairing_pin") pairingPin: String? = null,
        @Field("qr_pairing_code") qrPairingCode: String? = null,
        @Field("battery_level") batteryLevel: Int? = null,
        @Field("is_online") isOnline: Boolean? = null,
        @Field("last_active") lastActive: String? = null,
        @Field("used_today") usedToday: Int? = null
    ): ApiResponse<TelemetryResponseDto>

    // CH2 — List pesan chat thread per anak (butuh user_id = ID Orang Tua dari response AN3)
    // @Query("perPage") CAMELCASE sesuai actual Controller L143: ->input('perPage',50) BUKAN snake_case!
    @GET("api/v1/chat/{anakId}/messages")
    suspend fun getChatMessages(
        @Path("anakId") anakId: Int,
        @Query("user_id") userId: Int,
        @Query("page") page: Int = 1,
        @Query("perPage") perPage: Int = 50
    ): ApiResponse<ChatListResponseDto>

    // CH5 — Kirim pesan dari ANAK (Android companion) ke Orang Tua. sender=child enum di DB.
    // Gate kepemilikan: salah satu pairing_pin ATAU qr_pairing_code WAJIB dikirim & cocok.
    @FormUrlEncoded
    @POST("api/v1/chat/{anakId}/kirim-dari-anak")
    suspend fun kirimPesanDariAnak(
        @Path("anakId") anakId: Int,
        @Field("pairing_pin") pairingPin: String? = null,
        @Field("qr_pairing_code") qrPairingCode: String? = null,
        @Field("text") text: String,
        @Field("attachments[]") attachments: List<String>? = null
    ): ApiResponse<ChatSendResponseDto>

    // F3 — Update/Register FCM token perangkat Android (dipanggil oleh onNewToken & ViewModel force get).
    // Gate kepemilikan: SAMA PERSIS dengan AN8 uploadTelemetry. Minimal salah satu pairing_pin/qr_pairing_code NON EMPTY.
    @FormUrlEncoded
    @POST("api/v1/anak/{id}/fcm-token")
    suspend fun updateFcmTokenAnak(
        @Path("id") id: Int,
        @Field("pairing_pin") pairingPin: String? = null,
        @Field("qr_pairing_code") qrPairingCode: String? = null,
        @Field("fcm_token") fcmToken: String? = null
    ): ApiResponse<FcmTokenResponseDto>
}
