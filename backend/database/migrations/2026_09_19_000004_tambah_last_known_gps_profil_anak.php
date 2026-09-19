<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration: Tambah kolom last_known GPS ke tabel profil_anak
    // Tujuannya: Monitor page Maps bisa initial camera position DARI DATA ANAK (BUKAN hardcode Jakarta!)
    // sesuai agent.md Rule Zero Tolerance No Hardcode termasuk fallback.
    public function up(): void
    {
        Schema::table('profil_anak', function (Blueprint $table) {
            // Koordinat posisi terakhir anak yang diketahui (snapshot terakhir dari GPS HP)
            $table->decimal('last_known_latitude', 10, 7)
                ->nullable()
                ->after('last_active');

            $table->decimal('last_known_longitude', 10, 7)
                ->nullable()
                ->after('last_known_latitude');

            // Waktu penangkapan koordinat terakhir di HP anak (BUKAN waktu server!)
            $table->dateTime('last_gps_captured_at')
                ->nullable()
                ->after('last_known_longitude');

            // Index untuk cepat filter "Semua anak yang last_gps > N jam lalu" untuk Monitor page
            $table->index(
                ['user_id', 'last_gps_captured_at'],
                'idx_user_last_gps_captured'
            );
        });
    }

    public function down(): void
    {
        Schema::table('profil_anak', function (Blueprint $table) {
            $table->dropIndex('idx_user_last_gps_captured');
            $table->dropColumn([
                'last_known_latitude',
                'last_known_longitude',
                'last_gps_captured_at',
            ]);
        });
    }
};
