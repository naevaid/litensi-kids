<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel log geofence (GeofenceLog)
    public function up(): void
    {
        Schema::create('log_geofence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zona_geofence_id')->nullable()->constrained('zona_geofence')->nullOnDelete();
            $table->string('child_name');
            $table->string('device_name');
            $table->string('zone_name');
            $table->enum('zone_type', ['safe', 'danger', 'warning', 'school', 'home'])->default('safe');
            $table->enum('event_type', ['enter', 'exit', 'dwell'])->default('enter');
            $table->datetime('timestamp');
            $table->string('location_coordinates')->nullable();
            $table->string('battery_status', 20)->nullable();
            $table->string('accuracy', 20)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('log_geofence');
    }
};
