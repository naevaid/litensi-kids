package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val rewardPoints: Int,
    val status: String, // PENDING, WAITING_APPROVAL, COMPLETED
    val category: String, // Homework, Chores, Study, Health
    val dueDate: String = "Hari Ini"
)
