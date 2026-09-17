<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel notifikasi diteruskan (ForwardedNotification)
    public function up(): void
    {
        Schema::create('notifikasi_diteruskan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('profil_anak_id')->nullable()->constrained('profil_anak')->onDelete('cascade');
            $table->string('child_name');
            $table->string('device_name');
            $table->string('app_name');
            $table->string('app_package')->nullable();
            $table->string('app_category', 30)->default('other');
            $table->string('sender_or_title')->nullable();
            $table->text('content');
            $table->datetime('timestamp');
            $table->boolean('is_read')->default(false);
            $table->boolean('is_starred')->default(false);
            $table->boolean('is_flagged')->default(false);
            $table->string('flag_reason')->nullable();
            $table->boolean('is_sensitive')->default(false);
            $table->string('sensitive_category')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasi_diteruskan');
    }
};
