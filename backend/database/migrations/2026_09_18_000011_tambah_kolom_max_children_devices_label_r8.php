<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration R8: Tambah kolom `max_children_devices_label` yang MISSING di real DB
    // (Semua label lain sudah ada: location_tracking_label, app_restriction_label, dll —
    //  HANYA max_children_devices_label yang lupa / tidak pernah di-migrate dari migration awal)
    public function up(): void
    {
        Schema::table('paket_langganan', function (Blueprint $table) {
            // Hanya tambah jika kolom BELUM ADA (defensif anti error "Duplicate column name")
            if (!Schema::hasColumn('paket_langganan', 'max_children_devices_label')) {
                $table->string('max_children_devices_label', 255)
                    ->nullable()
                    ->default(null)
                    ->after('max_children_devices');
            }
        });
    }

    public function down(): void
    {
        Schema::table('paket_langganan', function (Blueprint $table) {
            if (Schema::hasColumn('paket_langganan', 'max_children_devices_label')) {
                $table->dropColumn('max_children_devices_label');
            }
        });
    }
};
