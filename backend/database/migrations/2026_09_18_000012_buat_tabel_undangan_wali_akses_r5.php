<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration R5a: Tabel undangan hak akses wali / pendamping (co-parent)
// Setiap undangan 1 row = 1 email wali yang diundang oleh PEMILIK KELUARGA (parent_user_id)
// Pattern FK CUSTOM: unsignedBigInteger + foreign('col', 'fk_[table]_[col]')
// → Mencegah InnoDB errno 121 duplicate constraint name (dilarang pakai foreignId()->constrained()!)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('undangan_wali_akses', function (Blueprint $table) {
            $table->id();

            // FK ke users: PEMILIK KELUARGA (Orang Tua Utama yang mengirim undangan)
            $table->unsignedBigInteger('parent_user_id')->index();
            $table->foreign('parent_user_id', 'fk_undangan_wali_parent_user_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();

            // FK ke users: PENDAMPING yang menerima undangan (BISA NULL jika belum register = kode_invite blm dipakai)
            $table->unsignedBigInteger('pendamping_user_id')->nullable()->index();
            $table->foreign('pendamping_user_id', 'fk_undangan_wali_pendamping_user_id')
                ->references('id')->on('users')
                ->nullOnDelete();

            // Template role yang diminta: role-1 Orang Tua Utama, role-2 Pendamping, role-3 Guru Les
            $table->string('role_id', 50)->default('role-2')->index();
            $table->string('role_name', 150)->nullable();

            // Email undangan (WAJIB, unique composite dengan parent_user_id agar tidak 2x undang email yang sama)
            $table->string('email_wali', 200)->index();

            // Kode undangan UNIQUE untuk link terima undangan (W3)
            $table->string('kode_undang_unique', 80)->unique()->index();

            // Permission JSON (jika user mau override dari template role default; 5 boolean canX)
            $table->json('permission_override_json')->nullable();

            // Status workflow undangan
            $table->enum('status', [
                'pending_invited',
                'accepted',
                'declined',
                'expired',
                'cancelled'
            ])->default('pending_invited')->index();

            // Timestamp workflow
            $table->timestamp('invited_at')->useCurrent()->index();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('declined_at')->nullable();

            // Catatan opsional (alasan tolak dll)
            $table->text('catatan')->nullable();

            $table->timestamps();

            // INDEX Composite: 1 parent tidak boleh undang email YANG SAMA 2x ketika masih pending/accepted
            $table->unique(
                ['parent_user_id', 'email_wali', 'status'],
                'uniq_undangan_parent_email_status'
            );

            // INDEX Cepat query daftar undangan per parent
            $table->index(['parent_user_id', 'created_at'], 'idx_undangan_parent_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('undangan_wali_akses');
    }
};
