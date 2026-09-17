package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.data.model.ChildProfileEntity
import com.example.data.model.PairingStateEntity
import com.example.data.model.RewardEntity
import com.example.data.model.SosLogEntity
import com.example.data.model.TaskEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        PairingStateEntity::class,
        TaskEntity::class,
        RewardEntity::class,
        SosLogEntity::class,
        ChildProfileEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class LitensiKidsDatabase : RoomDatabase() {

    abstract fun pairingDao(): PairingDao
    abstract fun taskDao(): TaskDao
    abstract fun rewardDao(): RewardDao
    abstract fun sosDao(): SosDao
    abstract fun childProfileDao(): ChildProfileDao

    companion object {
        @Volatile
        private var INSTANCE: LitensiKidsDatabase? = null

        fun getDatabase(context: Context): LitensiKidsDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    LitensiKidsDatabase::class.java,
                    "litensi_kids_db"
                )
                .addCallback(object : RoomDatabase.Callback() {
                    override fun onCreate(db: SupportSQLiteDatabase) {
                        super.onCreate(db)
                        // Seed initial data
                        INSTANCE?.let { database ->
                            CoroutineScope(Dispatchers.IO).launch {
                                populateInitialData(database)
                            }
                        }
                    }
                })
                .build()
                INSTANCE = instance
                instance
            }
        }

        private suspend fun populateInitialData(db: LitensiKidsDatabase) {
            db.pairingDao().savePairingState(
                PairingStateEntity(
                    isConnected = false,
                    parentName = "Orang Tua",
                    childName = "Budi",
                    pairingCode = "LMN-8942-KID"
                )
            )

            db.childProfileDao().saveProfile(
                ChildProfileEntity(
                    points = 250,
                    screenTimeRemainingMinutes = 105,
                    totalScreenTimeMinutes = 180,
                    currentSafeZone = "Sekolah SDN 01",
                    batteryLevel = 88,
                    isGpsActive = true,
                    lastCheckInTime = "07:30 WIB"
                )
            )

            db.taskDao().insertAll(
                listOf(
                    TaskEntity(
                        id = 1,
                        title = "Selesaikan PR Matematika",
                        rewardPoints = 50,
                        status = "PENDING",
                        category = "Pelajaran"
                    ),
                    TaskEntity(
                        id = 2,
                        title = "Merapikan Tempat Tidur",
                        rewardPoints = 30,
                        status = "PENDING",
                        category = "Rumah"
                    ),
                    TaskEntity(
                        id = 3,
                        title = "Bantu Cuci Piring",
                        rewardPoints = 40,
                        status = "WAITING_APPROVAL",
                        category = "Rumah"
                    )
                )
            )

            db.rewardDao().insertAll(
                listOf(
                    RewardEntity(
                        id = 1,
                        title = "Main Game 30 Menit",
                        pointCost = 100,
                        iconName = "sports_esports",
                        isRedeemed = false
                    ),
                    RewardEntity(
                        id = 2,
                        title = "Beli Es Krim Favorit",
                        pointCost = 150,
                        iconName = "icecream",
                        isRedeemed = false
                    ),
                    RewardEntity(
                        id = 3,
                        title = "Buku Komik Baru",
                        pointCost = 300,
                        iconName = "menu_book",
                        isRedeemed = false
                    )
                )
            )
        }
    }
}
