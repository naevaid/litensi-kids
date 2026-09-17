package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "child_profile")
data class ChildProfileEntity(
    @PrimaryKey val id: Int = 1,
    val points: Int = 250,
    val screenTimeRemainingMinutes: Int = 105, // 1h 45m
    val totalScreenTimeMinutes: Int = 180, // 3h
    val currentSafeZone: String = "Sekolah SDN 01",
    val batteryLevel: Int = 88,
    val isGpsActive: Boolean = true,
    val lastCheckInTime: String = "10:15 WIB"
)
