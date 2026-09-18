<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration R3 #1: Tabel pesan chat orang tua ↔ anak (1 row = 1 pesan dalam thread)
// Relasi utama: 1 thread = 1 profil_anak_id (semua pesan per anak digabung dalam 1 thread)
// Sender enum: child = pesan dari perangkat anak, parent = pesan dari portal orang tua, system = pesan otomatis (grant waktu, dll)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pesan_chat_orangtua_anak', function (Blueprint $table) {
            $table->id();

            // FK ke profil_anak (cascade: jika anak dihapus → semua pesan thread-nya ikut terhapus)
            $table->unsignedBigInteger('profil_anak_id')->index();
            $table->foreign('profil_anak_id', 'fk_pesan_chat_profil_anak_id')
                ->references('id')->on('profil_anak')
                ->cascadeOnDelete();

            // FK ke users (orang tua yang mengirim / menjadi parent owner)
            // NULLABLE + nullOnDelete: jika akun orang tua dihapus → pesan TETAP ADA sebagai audit trail (tidak ikut terhapus)
            $table->unsignedBigInteger('user_id_orangtua')->nullable()->index();
            $table->foreign('user_id_orangtua', 'fk_pesan_chat_user_id_orangtua')
                ->references('id')->on('users')
                ->nullOnDelete();

            // Siapa yang mengirim pesan ini
            // child = perangkat anak (via Android app), parent = orang tua (via web portal), system = pesan otomatis sistem
            $table->enum('sender', ['child', 'parent', 'system'])->default('parent')->index();

            // Isi pesan (maks 2000 karakter)
            $table->text('text', 2000);

            // Lampiran (opsional: JSON array berisi ID file / URL attachment)
            $table->json('attachments')->nullable();

            // Status sudah dibaca atau belum (hanya berlaku untuk arah: orang tua baca pesan anak)
            $table->boolean('is_read')->default(false)->index();

            // Referensi ID permintaan waktu layar (jika pesan system terhubung dengan permintaan)
            $table->unsignedBigInteger('permintaan_waktu_id')->nullable()->index();

            // Metadata + timestamps
            $table->timestamps();

            // INDEX ORDER CHAT TERBARU (query utama: order by created_at desc per profil_anak_id)
            $table->index(['profil_anak_id', 'created_at'], 'idx_pesan_chat_thread_order');

            // INDEX unread count (query utama: count where is_read=false per anak per user)
            $table->index(['profil_anak_id', 'user_id_orangtua', 'is_read'], 'idx_pesan_chat_unread');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pesan_chat_orangtua_anak');
    }
};
