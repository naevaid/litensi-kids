<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration R3 #2: Tabel permintaan TAMBAH WAKTU LAYAR dari anak ke orang tua
// Flow: Anak klik "Minta Tambah Waktu" di Android app → insert row status=pending
//       Orang tua klik Approve/Reject di halaman Inbox CH4 → update status + auto tambah kuota AV (jika approve)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permintaan_tambah_waktu_layar', function (Blueprint $table) {
            $table->id();

            // FK ke profil_anak yang meminta tambah waktu (cascade: anak dihapus → riwayat permintaan ikut terhapus)
            $table->unsignedBigInteger('profil_anak_id')->index();
            $table->foreign('profil_anak_id', 'fk_permintaan_waktu_profil_anak_id')
                ->references('id')->on('profil_anak')
                ->cascadeOnDelete();

            // Durasi menit yang diminta oleh anak (minimal 1 menit)
            $table->unsignedInteger('durasi_menit_diminta')->default(5);

            // Kategori alasan permintaan (enum bantu filter frontend)
            $table->enum('alasan_kategori', ['belajar', 'tugas_sekolah', 'komunikasi', 'hiburan', 'lainnya'])->default('lainnya');

            // Catatan opsional dari anak (misal: "Buat kerjakan PR Matematika")
            $table->text('catatan')->nullable();

            // Status permintaan
            // pending = menunggu respon orang tua, approved = disetujui waktu ditambahkan, rejected = ditolak
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();

            // FK ke users (orang tua yang approve / reject permintaan ini)
            // NULLABLE + nullOnDelete: permintaan TETAP ADA meskipun akun approver dihapus nanti
            $table->unsignedBigInteger('approved_by_user_id')->nullable()->index();
            $table->foreign('approved_by_user_id', 'fk_permintaan_waktu_approved_by_user_id')
                ->references('id')->on('users')
                ->nullOnDelete();

            // Catatan balasan dari orang tua (misal: "Oke tambah 15 menit, tapi PR harus selesai dulu")
            $table->text('catatan_orangtua')->nullable();

            // Waktu approve / reject dilakukan
            $table->datetime('approved_at')->nullable();

            // Metadata + timestamps
            $table->timestamps();

            // INDEX list pending permintaan per user (query Inbox Tab1 widget)
            $table->index(['profil_anak_id', 'status', 'created_at'], 'idx_permintaan_waktu_pending_list');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permintaan_tambah_waktu_layar');
    }
};
