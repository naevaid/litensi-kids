package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

// Entitas status pairing perangkat anak ↔ akun orang tua di backend
@Entity(tableName = "pairing_state")
data class PairingStateEntity(
    @PrimaryKey val id: Int = 1,
    val isConnected: Boolean = false,
    // Nama Orang Tua dari ProfilAnak→relation user.name (didapat setelah pairing confirm)
    val parentName: String = "Orang Tua",
    // Nama Anak dari ProfilAnak.name (didapat setelah pairing confirm)
    val childName: String = "Anak",
    // Kode pairing format LTN-XXX-YYYY-SEC (dari scan QR / input manual)
    val pairingCode: String = "",
    val deviceType: String = "Smartphone",
    val connectedAt: Long = System.currentTimeMillis(),
    // === FIELD BARU INTEGRASI REAL API (B3) ===
    // ID row ProfilAnak di DB backend (dari response AN3 confirmPairing → profil_anak.id)
    val profilAnakId: Int? = null,
    // PIN pairing 6 digit (dari QR payload field "p") — dipakai sebagai gate kepemilikan endpoint AN8 & CH5
    val pinPairing: String? = null,
    // QR pairing code full (sama dengan pairingCode) — backup gate jika pin hilang
    val qrPairingCode: String? = null,
    // ID Orang Tua (user_id milik ProfilAnak) — diperlukan CH2 getChatMessages query param
    val userIdOrtu: Int? = null
)
