<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel R2: SESI STREAM AV MONITOR (1 Row = 1 Kali Start-Stream sampai Stop-Stream).
 * - Digunakan untuk audit trail per-sesi, hitung durasi menit AKTUAL stop-start, dan UI History Riwayat Sesi AV5.
 * - Setiap start/stop AV2 & AV3 → insert + update row di tabel ini, lalu trigger UPDATE kuota R1 kolom total_digunakan_menit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesi_stream_av_monitor', function (Blueprint $table) {
            $table->id();
            // === FK CUSTOM NAME ===
            $table->unsignedBigInteger('profil_anak_id')->index();
            $table->foreign('profil_anak_id', 'fk_sesi_stream_av_monitor_profil_anak_id')
                ->references('id')->on('profil_anak')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('user_id_yg_memantau')->nullable()->index(); // Orang tua ID siapa yang start sesi Listen/Camera (nullable karena nullOnDelete!)
            $table->foreign('user_id_yg_memantau', 'fk_sesi_stream_av_monitor_user_pemantau_id')
                ->references('id')->on('users')
                ->nullOnDelete(); // Kalau user dihapus, biarkan row audit ada (tidak orphan delete)

            // === SESI INFO ===
            $table->enum('mode', ['audio_listen','camera_live'])->default('audio_listen')->index();
            $table->timestamp('started_at')->useCurrent()->index();
            $table->timestamp('stopped_at')->nullable();
            $table->unsignedInteger('durasi_menit_aktual')->default(0); // Hitung saat stop (stop-start di-CEILING ke menit terdekat, minimal 1 menit)
            $table->enum('kualitas', ['HD','Standard'])->default('Standard');
            $table->unsignedTinyInteger('jumlah_snapshot_ambil')->default(0);
            $table->boolean('alarm_dibunyikan')->default(false);
            $table->boolean('kunci_layar_dieksekusi')->default(false);
            $table->enum('status', ['active','completed','force_disconnect','error'])->default('active')->index();
            $table->text('catatan_error')->nullable();
            $table->timestamps();

            // Index untuk cepat filter "semua sesi aktif" per user / per anak
            $table->index(['user_id_yg_memantau', 'status'], 'idx_sesi_av_user_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sesi_stream_av_monitor');
    }
};
