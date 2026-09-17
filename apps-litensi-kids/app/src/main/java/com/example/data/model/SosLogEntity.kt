package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sos_logs")
data class SosLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val locationName: String = "Zona Sekolah SDN 01",
    val latitude: Double = -6.2088,
    val longitude: Double = 106.8456,
    val status: String = "ALERT_SENT"
)
