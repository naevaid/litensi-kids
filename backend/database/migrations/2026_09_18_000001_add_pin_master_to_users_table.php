<?php
// 2026_09_18_000001_add_pin_master_to_users_table.php
// Menambahkan kolom pin_master untuk PIN Master Parental Control (4-6 digit angka)
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('pin_master', 10)->nullable()->default(null)->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pin_master');
        });
    }
};
