package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

// Entitas Profil Anak di local Room DB.
// ZERO HARDCODE: Semua default = 0 / empty / false, nilai aktual diisi dari API response
//   setelah pairing confirm sukses (dari method connectWithCode repository).
@Entity(tableName = "child_profile")
data class ChildProfileEntity(
    @PrimaryKey val id: Int = 1,
    // Point reward (default 0 sampai modul point API tersedia)
    val points: Int = 0,
    // Sisa menit waktu layar hari ini (kuota - used_today; default 0 sebelum sync API)
    val screenTimeRemainingMinutes: Int = 0,
    // Total kuota menit harian (av_minutes_daily_override / paket user; default 0)
    val totalScreenTimeMinutes: Int = 0,
    // Nama zona aman lokasi (default kosong sebelum modul safe zone API siap)
    val currentSafeZone: String = "",
    // Battery level 0-100 dari ProfilAnak.battery_level (default 0 sebelum sync)
    val batteryLevel: Int = 0,
    // Status GPS aktif (default false, actual permission cek di ViewModel)
    val isGpsActive: Boolean = false,
    // Jam check-in terakhir (default kosong sebelum user tap check-in manual)
    val lastCheckInTime: String = ""
)
