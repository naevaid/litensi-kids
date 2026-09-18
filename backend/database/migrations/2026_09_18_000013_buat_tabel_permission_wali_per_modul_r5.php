<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration R5b: Tabel relasi permanen PENDAMPING <-> PEMILIK KELUARGA (setelah undangan W3 diterima)
// 1 row = 1 hubungan wali yang AKTIF, dengan permission JSON 5 boolean canX
// Pattern FK CUSTOM: unsignedBigInteger + foreign('col', 'fk_[table]_[col]')
// → Mencegah InnoDB errno 121 duplicate constraint name (dilarang pakai foreignId()->constrained()!)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permission_wali_per_modul', function (Blueprint $table) {
            $table->id();

            // FK ke users: PEMILIK KELUARGA (Orang Tua Utama pemilik akun keluarga)
            $table->unsignedBigInteger('parent_user_id')->index();
            $table->foreign('parent_user_id', 'fk_permission_wali_parent_user_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();

            // FK ke users: PENDAMPING / WALI yang sudah ACC undangan
            $table->unsignedBigInteger('pendamping_user_id')->index();
            $table->foreign('pendamping_user_id', 'fk_permission_wali_pendamping_user_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();

            // FK opsional: ke undangan_wali_akses (asal undangan yang diterima)
            $table->unsignedBigInteger('undangan_asal_id')->nullable()->index();
            $table->foreign('undangan_asal_id', 'fk_permission_wali_undangan_asal_id')
                ->references('id')->on('undangan_wali_akses')
                ->nullOnDelete();

            // Role template ID saat hubungan dibuat (snapshot, tidak berubah walau role di-edit nanti)
            $table->string('role_id_awal', 50)->default('role-2')->index();

            // ⭐ PERMISSION UTAMA: 5 boolean canX (sesuai HakAksesTab.tsx L17-L23)
            // Tersimpan sebagai JSON (mudah expand nanti tambah permission baru tanpa migration)
            $table->json('permission_json');

            // Tanggal hubungan aktif & nonaktif
            $table->timestamp('tanggal_jadi_awal')->useCurrent()->index();
            $table->timestamp('tanggal_nonaktif')->nullable()->index();

            // Status aktif / nonaktif
            $table->enum('status_aktif', ['aktif', 'nonaktif', 'diblokir'])->default('aktif')->index();

            // Siapa yang membuat hubungan ini (parent_user_id sendiri / admin sistem)
            $table->unsignedBigInteger('dibuat_oleh_user_id')->nullable()->index();
            $table->foreign('dibuat_oleh_user_id', 'fk_permission_wali_dibuat_oleh_user_id')
                ->references('id')->on('users')
                ->nullOnDelete();

            $table->timestamps();

            // INDEX UNIQUE: 1 KELUARGA + 1 PENDAMPING = HANYA BOLEH 1 ROW RELASI
            // (tidak peduli status_aktif aktif/nonaktif — cuma 1 row, nanti set status_aktif saja)
            // → Mencegah duplicate data & error 1062 Duplicate Entry ketika nonaktifkan
            //    (dulu unique composite include status_aktif → gagal kalau ada data history nonaktif sebelumnya)
            $table->unique(
                ['parent_user_id', 'pendamping_user_id'],
                'uniq_permission_wali_parent_pendamping_unik'
            );

            // INDEX Query cepat: list semua pendamping milik 1 parent
            $table->index(['parent_user_id', 'status_aktif', 'tanggal_jadi_awal'], 'idx_permission_wali_parent_list');

            // INDEX Query cepat: di user pendamping login, cek "saya jadi wali untuk keluarga siapa saja?"
            $table->index(['pendamping_user_id', 'status_aktif'], 'idx_permission_wali_pendamping_cari');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_wali_per_modul');
    }
};
