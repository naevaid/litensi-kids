<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel R1: KUOTA AV MONITOR HARIAN per Anak per Tanggal.
 * — User explicit: MODE LISTEN (audio) + CAMERA (video) DITAMBAHKAN JADI 1 KUOTA BERSAMA (bukan terpisah)!
 * — total_digunakan_menit = digunakan_audio_menit + digunakan_video_menit.
 * — Jika total_digunakan_menit >= paket_kuota_menit_harian → auto force stop stream apapun yang aktif di frontend.
 * — UNIQUE composite (profil_anak_id, tanggal) → 1 anak TIDAK BISA 2 row kuota untuk tanggal YANG SAMA (hindari double counting)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kuota_av_monitor_harian', function (Blueprint $table) {
            $table->id();
            // === RELASI FK DENGAN NAMA CUSTOM UNIK (hindari InnoDB errno 121 duplicate key name!) ===
            $table->unsignedBigInteger('profil_anak_id')->index();
            $table->foreign('profil_anak_id', 'fk_kuota_av_monitor_profil_anak_id')
                ->references('id')->on('profil_anak')
                ->cascadeOnDelete();
            // === KUOTA UTAMA ===
            $table->date('tanggal')->index(); // Tanggal kuota berlaku (today)
            $table->unsignedInteger('paket_kuota_menit_harian')->default(0); // 0 = unlimited / sesuai paket (dipake AV4 tambah kuota manual nanti)
            // === DIGUNAKAN: Audio + Video GABUNG = 1 kolam! ===
            $table->unsignedInteger('digunakan_audio_menit')->default(0); // Mode Listen Suara
            $table->unsignedInteger('digunakan_video_menit')->default(0); // Mode Kamera Live
            $table->unsignedInteger('total_digunakan_menit')->default(0)->index(); // SUM audio + video, index untuk cepat sort paling boros
            // SISA dihitung runtime, tapi simpan juga denormalized untuk cepat query UI progress bar
            $table->integer('sisa_kuota_menit')->default(0);
            // === STATUS SESI TERAKHIR (untuk frontend render "Masih aktif Listen/Camera" badge) ===
            $table->enum('last_mode', ['idle','audio_listen','camera_live'])->default('idle')->index();
            $table->timestamp('last_started_at')->nullable();
            $table->timestamp('last_stopped_at')->nullable();
            $table->unsignedInteger('last_sesi_id')->nullable(); // ID sesi R2 yang masih aktif (jika ada)
            $table->timestamps();

            // === UNIQUE COMPOSITE: 1 ANAK TIDAK BOLEH 2 ROW KUOTA TANGGAL SAMA! ===
            $table->unique(['profil_anak_id', 'tanggal'], 'unik_kuota_av_per_anak_per_tanggal');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kuota_av_monitor_harian');
    }
};
