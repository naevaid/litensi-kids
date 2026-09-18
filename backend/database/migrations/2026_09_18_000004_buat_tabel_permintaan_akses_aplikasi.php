<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel PERMINTAAN AKSES APLIKASI (subtab "Permintaan" halaman Kontrol Aplikasi).
 * Dipicu oleh Android Companion App: anak klik "minta buka blokir" untuk suatu
 * aplikasi (misal YouTube 30 menit buat tugas sekolah) → masuk ke list pending orang tua.
 * Enums status SESUAI AppAccessRequest L50: pending/approved/rejected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permintaan_akses_aplikasi', function (Blueprint $table) {
            $table->id();
            // Siapa yang minta?
            $table->unsignedBigInteger('profil_anak_id')->index();
            $table->foreign('profil_anak_id', 'fk_permintaan_akses_profil_anak_id')
                ->references('id')->on('profil_anak')
                ->cascadeOnDelete();
            // Apa yang diminta?
            $table->string('app_name', 255)->default('');
            $table->string('package_name', 255)->index();
            $table->string('category', 100)->default('other');
            // Berapa lama? (menit / "bebas" sebagai string ke field alasan)
            $table->integer('durasi_menit_diminta')->unsigned()->default(0);
            $table->text('alasan')->nullable();
            // Status permintaan (sesuai interface L50)
            $table->enum('status', ['pending','approved','rejected'])->default('pending')->index();
            // Audit: Siapa yang handle? (user.id orang tua yang approve/reject)
            $table->unsignedBigInteger('handled_by_user_id')->nullable()->index();
            $table->foreign('handled_by_user_id', 'fk_permintaan_akses_handled_by_user_id')
                ->references('id')->on('users')
                ->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->text('catatan_handle')->nullable();
            // Ketika minta:
            $table->timestamp('requested_at')->useCurrent()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permintaan_akses_aplikasi');
    }
};
