package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

// (G3.2) Room Entity untuk cache point GPS yang pending upload ke backend (offline mode).
// Saat perangkat offline / upload gagal, GPS point disimpan dulu disini sampai berhasil di-sync.
// Sync status: PENDING = belum upload, SYNCED = berhasil upload (segera hapus), FAILED = gagal upload perlu retry.
@Entity(tableName = "pergerakan_gps_cache")
data class PergerakanGpsCacheEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    // Data GPS inti — 1:1 mapping field endpoint AN10 POST /anak/{id}/gps
    val latitude: Double,                 // WGS84 decimal degree (-90 s/d 90)
    val longitude: Double,                // (-180 s/d 180)
    val capturedAtEpochMillis: Long,      // Timestamp saat GPS di-capture oleh HP (epoch millis, convert ke ISO 8601 saat upload)
    // Metadata opsional
    val accuracyMeters: Int? = null,      // Akurasi GPS dalam meter (misal 15 = 15m)
    val batteryLevel: Int? = null,        // Level baterai 0-100 saat capture (di-parse jadi "70%" string untuk log geofence)
    val speedKmh: Double? = null,         // Kecepatan km/jam
    val altitudeMeters: Double? = null,   // Ketinggian mdpl
    val isMockDetected: Boolean = false,  // true jika terdeteksi mock lokasi (fake GPS)
    // Sync management
    val syncStatus: String = SYNC_STATUS_PENDING,  // "pending" / "synced" / "failed"
    val retryCount: Int = 0,              // Sudah berapa kali dicoba upload (exponential backoff)
    val lastError: String? = null,        // Pesan error terakhir jika FAILED (untuk debug log)
    val createdAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val SYNC_STATUS_PENDING = "pending"
        const val SYNC_STATUS_SYNCED = "synced"
        const val SYNC_STATUS_FAILED = "failed"
    }
}
