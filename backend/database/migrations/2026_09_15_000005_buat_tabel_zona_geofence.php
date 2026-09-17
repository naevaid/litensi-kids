<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel zona geofence (GeofenceZone)
    public function up(): void
    {
        Schema::create('zona_geofence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->enum('category', ['safe', 'danger', 'warning', 'school', 'home'])->default('safe');
            $table->text('address');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->integer('radius_meters')->default(100);
            $table->text('assigned_children')->nullable(); // JSON array ID anak
            $table->boolean('notify_on_enter')->default(true);
            $table->boolean('notify_on_exit')->default(true);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('color', 20)->nullable();
            $table->timestamp('last_triggered')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zona_geofence');
    }
};
