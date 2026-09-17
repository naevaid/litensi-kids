<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Migration tabel catatan pendapatan (MasterRevenueRecord)
    public function up(): void
    {
        Schema::create('catatan_pendapatan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name');
            $table->string('user_email');
            $table->string('user_phone', 20)->nullable();
            $table->string('item'); // Item yang dibeli
            $table->bigInteger('amount')->default(0);
            $table->string('provider'); // Penyedia pembayaran
            $table->enum('status', ['sukses', 'menunggu', 'kadaluwarsa', 'gagal', 'refund'])->default('menunggu');
            $table->datetime('transaction_date');
            $table->string('invoice_no', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catatan_pendapatan');
    }
};
