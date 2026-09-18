<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Migration R6: Tambah batas kuota AV menit HARIAN (1 kolam Audio+Video digabung)
    // - di tabel paket_langganan (default per paket)
    // - di tabel profil_anak (override per anak, prioritas lebih tinggi dari paket)
    // Sesuai user explicit confirm: Listen + Camera GABUNG 1 KUOTA (tidak terpisah)
    public function up(): void
    {
        // === 1. TAMBAH KOLOM DI TABEL paket_langganan ===
        Schema::table('paket_langganan', function (Blueprint $table) {
            // Batas menit AV HARIAN (0 = unlimited / OFF sesuai status paket)
            // Unsigned integer karena menit tidak bisa negatif
            $table->unsignedInteger('batas_menit_av_harian')
                ->default(0)
                ->after('app_restriction_label')
                ->comment('Batas menit AV HARIAN 1 KOLAM (audio_listen + camera_live DIGABUNG). 0 = unlimited jika paket ijinkan fitur, tapi jika one_way_audio/live_camera=false maka fitur MATI total.');
        });

        // === 2. TAMBAH KOLOM DI TABEL profil_anak ===
        Schema::table('profil_anak', function (Blueprint $table) {
            // Override per anak: 0 = gunakan default dari paket langganan orang tua
            // >0 = nilai batas khusus untuk anak ini, mengabaikan paket (bisa lebih tinggi/lebih rendah)
            $table->unsignedInteger('av_minutes_daily_override')
                ->default(0)
                ->after('used_today')
                ->comment('Override batas kuota AV menit HARIAN per anak. 0 = pakai default paket langganan user. >0 = nilai khusus mengabaikan paket.');
        });

        // === 3. UPDATE DATA EXISTING PAKET (karena seeder SUDAH di-run sebelumnya TIDAK BOLEH re-seed)
        // User explicitly mapping:
        // - Free (id=1): one_way_audio=false & live_camera=false → batas 0 (TIDAK BISA PAKAI FITUR INI SAMA SEKALI, bukan unlimited)
        // - Premium (id=2): one_way_audio=true, live_camera=false → batas 60 menit/hari (audio only 60 menit)
        // - Family Pro (id=3): one_way_audio=true, live_camera=true → batas 240 menit/hari (4 jam, gabung semua mode)
        DB::statement("
            UPDATE `paket_langganan`
            SET `batas_menit_av_harian` = CASE `id`
                WHEN 1 THEN 0      -- Free: Tidak ada fitur AV sama sekali
                WHEN 2 THEN 60     -- Premium: 60 menit/hari (Audio Monitor)
                WHEN 3 THEN 240    -- Family Pro: 240 menit/hari = 4 jam (Audio + Live Camera Gabung)
                ELSE 0
            END
            WHERE `id` IN (1,2,3) AND `status` = 'active'
        ");
    }

    public function down(): void
    {
        Schema::table('paket_langganan', function (Blueprint $table) {
            $table->dropColumn('batas_menit_av_harian');
        });
        Schema::table('profil_anak', function (Blueprint $table) {
            $table->dropColumn('av_minutes_daily_override');
        });
    }
};
