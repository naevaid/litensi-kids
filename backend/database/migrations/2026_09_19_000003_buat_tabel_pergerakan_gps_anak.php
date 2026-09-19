<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration: Buat tabel pergerakan GPS anak (riwayat tracking pergerakan realtime)
    public function up(): void
    {
        Schema::create('pergerakan_gps_anak', function (Blueprint $table) {
            $table->id();
            // Relasi ke profil anak (cascade: anak dihapus -> semua riwayat GPS ikut terhapus)
            $table->foreignId('profil_anak_id')
                ->constrained('profil_anak')
                ->onDelete('cascade')
                ->index('idx_pergerakan_profil_anak_id');

            // Koordinat WGS84 (lintang/bujur) dengan presisi 7 digit desimal (mm level akurasi)
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);

            // Metadata lokasi dari FusedLocationProvider Android
            $table->integer('accuracy_meters')->nullable();
            $table->integer('battery_level')->nullable(); // 0-100% persen battery perangkat anak
            $table->float('speed_kmh')->nullable(); // Kecepatan gerak km/jam (dari GPS Android)
            $table->float('altitude_m')->nullable(); // Ketinggian di atas permukaan laut meter
            $table->boolean('is_mock_detected')->default(false); // Deteksi GPS mock/spoof app

            // Waktu PENANGKAPAN KOORDINAT DI HP ANAK (BUKAN created_at server!)
            // Penting: Untuk analisis geofence trigger dan interval sampling tidak terpengaruh latency upload
            $table->dateTime('captured_at');

            // Index composite untuk query utama: "Riwayat GPS anak X selama 6 jam terakhir order captured_at DESC"
            $table->index(['profil_anak_id', 'captured_at'], 'idx_profil_captured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pergerakan_gps_anak');
    }
};
