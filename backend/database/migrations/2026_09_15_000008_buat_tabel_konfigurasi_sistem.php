<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel konfigurasi sistem (MasterSystemConfig)
    public function up(): void
    {
        Schema::create('konfigurasi_sistem', function (Blueprint $table) {
            $table->id();
            $table->string('app_name')->default('Litensi Kids');
            $table->string('app_version', 50)->nullable();
            $table->boolean('maintenance_mode')->default(false);
            $table->text('maintenance_notice')->nullable();
            $table->boolean('registration_open')->default(true);
            $table->integer('max_trial_days')->default(7);
            $table->string('server_region')->nullable();
            $table->enum('server_status', ['optimal', 'maintenance', 'degraded'])->default('optimal');
            $table->enum('fcm_push_status', ['connected', 'disconnected'])->default('connected');
            $table->enum('database_status', ['healthy', 'backup_in_progress'])->default('healthy');
            $table->boolean('sms_gateway_active')->default(true);
            $table->boolean('whatsapp_gateway_active')->default(true);
            $table->string('support_email')->nullable();
            $table->string('support_phone', 30)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('konfigurasi_sistem');
    }
};
