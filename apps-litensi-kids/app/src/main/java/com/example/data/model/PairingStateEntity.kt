package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pairing_state")
data class PairingStateEntity(
    @PrimaryKey val id: Int = 1,
    val isConnected: Boolean = false,
    val parentName: String = "Orang Tua",
    val childName: String = "Budi",
    val pairingCode: String = "LMN-8942-KID",
    val deviceType: String = "Smartphone", // Smartphone or Smartwatch
    val connectedAt: Long = System.currentTimeMillis()
)
