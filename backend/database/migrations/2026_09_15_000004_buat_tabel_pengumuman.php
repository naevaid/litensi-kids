<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel pengumuman (AnnouncementItem)
    public function up(): void
    {
        Schema::create('pengumuman', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('badge_text')->nullable();
            $table->string('badge_color', 20)->nullable(); // amber / emerald / indigo / rose / blue / purple
            $table->enum('content_type', ['text', 'image', 'video', 'combined'])->default('text');
            $table->text('description');
            $table->string('image_url')->nullable();
            $table->string('video_url')->nullable();
            $table->enum('display_target', ['modal', 'header', 'both'])->default('header');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(true);
            $table->string('cta_label')->nullable();
            $table->string('cta_url')->nullable();
            $table->string('author', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengumuman');
    }
};
