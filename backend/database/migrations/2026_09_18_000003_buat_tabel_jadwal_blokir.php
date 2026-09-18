<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel JADWAL BLOKIR RUTIN (subtab "Jadwal" halaman Kontrol Aplikasi).
 * 1 row = 1 jadwal blokir untuk 1 (anak/aturan_aplikasi + hari aktif + jam start-end)
 * Contoh penggunaan: Anak Budi, setiap Senin-Jumat 19:00-05:00 → block semua game/social
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jadwal_blokir', function (Blueprint $table) {
            $table->id();
            // Relasi ke anak (wajib)
            $table->unsignedBigInteger('profil_anak_id')->index();
            $table->foreign('profil_anak_id', 'fk_jadwal_blokir_profil_anak_id')
                ->references('id')->on('profil_anak')
                ->cascadeOnDelete();
            // Opsional: jika null = berlaku untuk SEMUA aplikasi di anak itu.
            // Jika terisi = hanya berlaku untuk aturan_aplikasi spesifik.
            $table->unsignedBigInteger('aturan_aplikasi_id')->nullable()->index();
            $table->foreign('aturan_aplikasi_id', 'fk_jadwal_blokir_aturan_aplikasi_id')
                ->references('id')->on('aturan_aplikasi')
                ->cascadeOnDelete();
            $table->string('nama_jadwal', 255)->default('Jadwal Blokir');
            // Hari aktif: Comma separated array enum 0-6 ISO-8601 (0=Minggu, 1=Senin, ..., 6=Sabtu)
            // Disimpan JSON → cast array di Model. Bisa akses: $jadwal->days = [1,2,3,4,5] (Senin-Jumat)
            $table->json('days_active')->comment('array integer 0-6, 0=Minggu 6=Sabtu');
            $table->time('jam_mulai');
            $table->time('jam_selesai');
            // Aksi yang dilakukan jika cocok jadwal:
            //   block   = paksa status = blocked
            //   limit   = override durasi ke durasi_jadwal_minutes
            //   unblock = sementara allow (jadwal bebas)
            $table->enum('action_when_match', ['block','limit','unblock'])->default('block');
            $table->integer('durasi_jadwal_minutes')->unsigned()->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jadwal_blokir');
    }
};
