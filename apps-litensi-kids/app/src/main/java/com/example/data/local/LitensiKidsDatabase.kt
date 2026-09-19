package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.data.model.ChildProfileEntity
import com.example.data.model.PairingStateEntity
import com.example.data.model.PergerakanGpsCacheEntity
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
        ChildProfileEntity::class,
        PergerakanGpsCacheEntity::class
    ],
    // (G3.3) Bump version 2 → 3 karena tambah entity PergerakanGpsCacheEntity (tabel pergerakan_gps_cache).
    version = 3,
    exportSchema = false
)
abstract class LitensiKidsDatabase : RoomDatabase() {

    abstract fun pairingDao(): PairingDao
    abstract fun taskDao(): TaskDao
    abstract fun rewardDao(): RewardDao
    abstract fun sosDao(): SosDao
    abstract fun childProfileDao(): ChildProfileDao
    // (G3.2) DAO cache GPS pending upload offline
    abstract fun gpsCacheDao(): GpsCacheDao

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
                // (B3) Schema mismatch → drop & recreate DB (dev mode aman. Production butuh Migration class!)
                // (B7 Warning Fix) Overload baru Room 2.7+ wajib parameter dropAllTables (true = semua tabel di-drop)
                .fallbackToDestructiveMigration(dropAllTables = true)
                .addCallback(object : RoomDatabase.Callback() {
                    override fun onCreate(db: SupportSQLiteDatabase) {
                        super.onCreate(db)
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

        // Seed initial data: HANYA Task, Reward, dan default PairingState kosong.
        // JANGAN ada hardcode data profil anak / nama ortu — data asli dari API setelah pairing sukses.
        private suspend fun populateInitialData(db: LitensiKidsDatabase) {
            // Pairing default: isConnected=false, field lain kosong (menunggu hasil API real)
            db.pairingDao().savePairingState(
                PairingStateEntity(
                    isConnected = false,
                    parentName = "Orang Tua",
                    childName = "Anak",
                    pairingCode = ""
                )
            )

            // ChildProfile default 0 semua (hardcode points=250 / battery=88 DIHAPUS sesuai B5)
            db.childProfileDao().saveProfile(
                ChildProfileEntity(
                    points = 0,
                    screenTimeRemainingMinutes = 0,
                    totalScreenTimeMinutes = 0,
                    currentSafeZone = "",
                    batteryLevel = 0,
                    isGpsActive = false,
                    lastCheckInTime = ""
                )
            )

            // Seed Task sample (modul tugas & reward belum ada API khusus; seed sementara agar UI tidak kosong)
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

            // Seed Reward sample
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
