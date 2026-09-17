<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel paket langganan (SubscriptionPlan)
    public function up(): void
    {
        Schema::create('paket_langganan', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // free / premium / family_pro
            $table->string('badge')->nullable();
            $table->boolean('popular')->default(false);
            $table->string('tagline');
            $table->text('description');
            $table->integer('monthly_price')->default(0);
            $table->integer('annual_price')->default(0);
            // Batasan fitur (SubscriptionLimits)
            $table->integer('max_children_devices')->default(1);
            $table->string('location_tracking')->default('dasar'); // dasar / realtime_7d / realtime_30d_sos
            $table->string('location_tracking_label')->nullable();
            $table->string('app_restriction')->default('terbatas_3'); // terbatas_3 / unlimited_jadwal / unlimited_ai
            $table->string('app_restriction_label')->nullable();
            $table->boolean('one_way_audio')->default(false);
            $table->string('one_way_audio_label')->nullable();
            $table->boolean('live_camera')->default(false);
            $table->string('live_camera_label')->nullable();
            $table->string('max_geofences')->default('5');
            $table->string('max_geofences_label')->nullable();
            $table->boolean('read_message_notifications')->default(false);
            $table->string('read_message_notifications_label')->nullable();
            $table->boolean('remote_screen_lock')->default(false);
            $table->string('remote_screen_lock_label')->nullable();
            $table->text('highlight_features')->nullable(); // JSON array
            $table->integer('active_users_count')->default(0);
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paket_langganan');
    }
};
