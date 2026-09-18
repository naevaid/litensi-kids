<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration: Tambah kolom fcm_token ke tabel profil_anak (untuk FCM push notification ke perangkat anak)
    public function up(): void
    {
        Schema::table('profil_anak', function (Blueprint $table) {
            // Simpan instance ID token FCM per perangkat Android (rotate tiap 6 bulan / reinstall app)
            $table->string('fcm_token', 255)
                ->nullable()
                ->after('av_minutes_daily_override')
                ->comment('Instance ID token Firebase Cloud Messaging perangkat anak Android');
        });
    }

    public function down(): void
    {
        Schema::table('profil_anak', function (Blueprint $table) {
            $table->dropColumn('fcm_token');
        });
    }
};
