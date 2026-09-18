<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Menambahkan kolom token FCM Web Push (Notifikasi Browser) ke tabel users
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Token FCM Web Push (Panjang token bisa > 255 char, maka TEXT bukan VARCHAR)
            // NULLABLE = jika user belum izin notifikasi browser, kosong
            $table->text('web_fcm_token')
                ->nullable()
                ->comment('Token FCM Web Push untuk browser orang tua. NULL jika user belum izin notifikasi.')
                ->after('remember_token');

            // Waktu refresh terakhir token, untuk detect token stale 6 bulan rotate
            $table->timestamp('web_fcm_token_updated_at')
                ->nullable()
                ->comment('Timestamp token FCM Web di-refresh terakhir.')
                ->after('web_fcm_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['web_fcm_token', 'web_fcm_token_updated_at']);
        });
    }
};
