<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel utama: ATURAN APLIKASI (aturan akses per aplikasi per anak)
 * Dipakai oleh halaman Kontrol Aplikasi subtab "Daftar".
 * 1 row = 1 aturan untuk 1 (anak + package_name) = UNIQUE kombinasi.
 *
 * Enums & struktur SESUAI interface KontrolAplikasiPage L13-L29 (FRONTEND TIDAK BOLEH mismatch)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aturan_aplikasi', function (Blueprint $table) {
            $table->id();
            // Relasi ke profil_anak (foreign key cascade delete jika anak dihapus → aturan otomatis hilang)
            $table->unsignedBigInteger('profil_anak_id')->index();
            $table->foreign('profil_anak_id', 'fk_aturan_aplikasi_profil_anak_id')
                ->references('id')->on('profil_anak')
                ->cascadeOnDelete();
            // Identitas aplikasi (Android package name unik contoh: com.google.android.youtube)
            $table->string('package_name', 255)->index();
            $table->string('app_name', 255)->default('');
            // Kategori app SESUAI frontend L17: game/social/video/education/chat/utility
            $table->enum('category', ['game','social','video','education','chat','utility'])->default('utility')->index();
            $table->string('icon', 255)->nullable();
            // Status aturan (sesuai AppRuleItem.status L22)
            $table->enum('status', ['allowed','limited','blocked'])->default('allowed')->index();
            $table->integer('daily_limit_minutes')->unsigned()->default(0); // 0 = tanpa batas
            $table->integer('used_today_minutes')->unsigned()->default(0);
            // Jadwal mode (sesuai AppRuleItem.scheduleMode L25)
            $table->enum('schedule_mode', ['all_day','study_time_blocked','bedtime_blocked','custom'])->default('all_day');
            $table->boolean('allow_weekend_extra')->default(false);
            $table->integer('weekend_extra_minutes')->unsigned()->default(0);
            // Metadata audit
            $table->timestamp('last_used_time')->nullable();
            $table->timestamps();

            // UNIQUE constraint: 1 anak tidak boleh punya 2 aturan duplicate untuk package YANG SAMA.
            $table->unique(['profil_anak_id', 'package_name'], 'unik_aturan_per_anak_per_aplikasi');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aturan_aplikasi');
    }
};
