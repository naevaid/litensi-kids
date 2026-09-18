<?php

// Migration R5c: Tambah kolom email_sent_at untuk audit tanggal email undangan wali terkirim via SMTP
// Pattern FK CUSTOM TIDAK DIGUNAKAN DI SINI karena hanya alter add column (tanpa foreign key)
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('undangan_wali_akses', function (Blueprint $table) {
            // Timestamp saat SMTP benar-benar mengirim email (NULL jika gagal / belum dikirim)
            $table->timestamp('email_sent_at')->nullable()->after('invited_at');
            // Field cache email error jika SMTP gagal (untuk audit tanpa buka log laravel)
            $table->string('email_last_error', 500)->nullable()->after('email_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('undangan_wali_akses', function (Blueprint $table) {
            $table->dropColumn(['email_sent_at', 'email_last_error']);
        });
    }
};
