package com.example.data.repository

import com.example.data.local.LitensiKidsDatabase
import com.example.data.model.ChildProfileEntity
import com.example.data.model.PairingStateEntity
import com.example.data.model.RewardEntity
import com.example.data.model.SosLogEntity
import com.example.data.model.TaskEntity
import kotlinx.coroutines.flow.Flow

class LitensiRepository(private val db: LitensiKidsDatabase) {

    val pairingState: Flow<PairingStateEntity?> = db.pairingDao().getPairingState()
    val tasks: Flow<List<TaskEntity>> = db.taskDao().getAllTasks()
    val rewards: Flow<List<RewardEntity>> = db.rewardDao().getAllRewards()
    val sosLogs: Flow<List<SosLogEntity>> = db.sosDao().getAllSosLogs()
    val childProfile: Flow<ChildProfileEntity?> = db.childProfileDao().getChildProfile()

    suspend fun connectWithCode(parentName: String, childName: String, code: String) {
        db.pairingDao().savePairingState(
            PairingStateEntity(
                id = 1,
                isConnected = true,
                parentName = parentName,
                childName = childName,
                pairingCode = code,
                connectedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun disconnect() {
        db.pairingDao().setConnected(false)
    }

    suspend fun completeTask(taskId: Long, rewardPoints: Int, currentPoints: Int) {
        db.taskDao().updateTaskStatus(taskId, "COMPLETED")
        db.childProfileDao().updatePoints(currentPoints + rewardPoints)
    }

    suspend fun addNewTask(title: String, points: Int, category: String) {
        db.taskDao().insertTask(
            TaskEntity(
                title = title,
                rewardPoints = points,
                status = "PENDING",
                category = category
            )
        )
    }

    suspend fun redeemReward(rewardId: Long, costPoints: Int, currentPoints: Int): Boolean {
        if (currentPoints >= costPoints) {
            db.rewardDao().updateRewardRedeemed(rewardId, true)
            db.childProfileDao().updatePoints(currentPoints - costPoints)
            return true
        }
        return false
    }

    suspend fun triggerSosAlert(location: String): SosLogEntity {
        val sosLog = SosLogEntity(
            timestamp = System.currentTimeMillis(),
            locationName = location,
            status = "ALERT_SENT"
        )
        db.sosDao().insertSosLog(sosLog)
        return sosLog
    }

    suspend fun performCheckIn(checkInTime: String) {
        db.childProfileDao().updateCheckInTime(checkInTime)
    }
}
