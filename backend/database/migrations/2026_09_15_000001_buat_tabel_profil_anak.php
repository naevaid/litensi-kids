<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel profil anak (ChildProfile)
    public function up(): void
    {
        Schema::create('profil_anak', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->integer('age');
            $table->enum('gender', ['laki-laki', 'perempuan']);
            $table->string('device_name');
            $table->string('device_model')->nullable();
            $table->string('os_version')->nullable();
            $table->integer('battery_level')->default(0);
            $table->boolean('is_online')->default(false);
            $table->enum('status', ['active', 'restricted', 'locked'])->default('active');
            $table->string('avatar')->default('icon:Smile');
            $table->string('qr_pairing_code', 50)->nullable();
            $table->string('pairing_pin', 10)->nullable();
            $table->timestamp('paired_at')->nullable();
            $table->timestamp('last_active')->nullable();
            $table->string('used_today', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profil_anak');
    }
};
