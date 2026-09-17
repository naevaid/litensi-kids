package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.ChildProfileEntity
import com.example.data.model.PairingStateEntity
import com.example.data.model.RewardEntity
import com.example.data.model.SosLogEntity
import com.example.data.model.TaskEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PairingDao {
    @Query("SELECT * FROM pairing_state WHERE id = 1")
    fun getPairingState(): Flow<PairingStateEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun savePairingState(pairingState: PairingStateEntity)

    @Query("UPDATE pairing_state SET isConnected = :isConnected WHERE id = 1")
    suspend fun setConnected(isConnected: Boolean)
}

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks ORDER BY id ASC")
    fun getAllTasks(): Flow<List<TaskEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tasks: List<TaskEntity>)

    @Query("UPDATE tasks SET status = :status WHERE id = :taskId")
    suspend fun updateTaskStatus(taskId: Long, status: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity)
}

@Dao
interface RewardDao {
    @Query("SELECT * FROM rewards ORDER BY pointCost ASC")
    fun getAllRewards(): Flow<List<RewardEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(rewards: List<RewardEntity>)

    @Query("UPDATE rewards SET isRedeemed = :isRedeemed WHERE id = :rewardId")
    suspend fun updateRewardRedeemed(rewardId: Long, isRedeemed: Boolean)
}

@Dao
interface SosDao {
    @Query("SELECT * FROM sos_logs ORDER BY timestamp DESC")
    fun getAllSosLogs(): Flow<List<SosLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSosLog(sosLog: SosLogEntity)
}

@Dao
interface ChildProfileDao {
    @Query("SELECT * FROM child_profile WHERE id = 1")
    fun getChildProfile(): Flow<ChildProfileEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProfile(profile: ChildProfileEntity)

    @Query("UPDATE child_profile SET points = :newPoints WHERE id = 1")
    suspend fun updatePoints(newPoints: Int)

    @Query("UPDATE child_profile SET lastCheckInTime = :checkInTime WHERE id = 1")
    suspend fun updateCheckInTime(checkInTime: String)
}
