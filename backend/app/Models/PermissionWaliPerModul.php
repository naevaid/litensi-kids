<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model R5b: Relasi permanen PENDAMPING <-> PEMILIK KELUARGA (setelah undangan diterima W3)
// Menyimpan 5 boolean permission canX JSON + status aktif
// Lihat migration: database/migrations/2026_09_18_000013_buat_tabel_permission_wali_per_modul_r5.php
class PermissionWaliPerModul extends Model
{
    use HasFactory;

    // Explicit table name: TANPA huruf 's' di belakang (pluralization Laravel default salah)
    protected $table = 'permission_wali_per_modul';

    /**
     * Kolom yang dapat diisi massal (whitelist defensive)
     * @var list<string>
     */
    protected $fillable = [
        'parent_user_id',
        'pendamping_user_id',
        'undangan_asal_id',
        'role_id_awal',
        'permission_json',
        'tanggal_jadi_awal',
        'tanggal_nonaktif',
        'status_aktif',
        'dibuat_oleh_user_id',
    ];

    /**
     * Cast tipe data otomatis
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permission_json'   => 'array',
            'tanggal_jadi_awal' => 'datetime',
            'tanggal_nonaktif'  => 'datetime',
        ];
    }

    // Relasi: PEMILIK KELUARGA (Orang Tua Utama)
    public function parentPemilik(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    // Relasi: PENDAMPING / WALI yang sudah diterima
    public function pendampingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pendamping_user_id');
    }

    // Relasi: Asal undangan yang diterima (opsional)
    public function undanganAsal(): BelongsTo
    {
        return $this->belongsTo(UndanganWaliAkses::class, 'undangan_asal_id');
    }
}
