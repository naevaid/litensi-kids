<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model R5a: Undangan hak akses wali / pendamping (1 row = 1 undangan)
// Lihat migration: database/migrations/2026_09_18_000012_buat_tabel_undangan_wali_akses_r5.php
class UndanganWaliAkses extends Model
{
    use HasFactory;

    // Explicit table name (mencegah Laravel auto-pluralize salah)
    protected $table = 'undangan_wali_akses';

    /**
     * Kolom yang dapat diisi massal (whitelist defensive)
     * @var list<string>
     */
    protected $fillable = [
        'parent_user_id',
        'pendamping_user_id',
        'role_id',
        'role_name',
        'email_wali',
        'kode_undang_unique',
        'permission_override_json',
        'status',
        'invited_at',
        'expires_at',
        'accepted_at',
        'declined_at',
        'catatan',
    ];

    /**
     * Cast tipe data otomatis
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permission_override_json' => 'array',
            'invited_at'               => 'datetime',
            'expires_at'               => 'datetime',
            'accepted_at'              => 'datetime',
            'declined_at'              => 'datetime',
        ];
    }

    // Relasi: Orang Tua Utama yang MENGIRIM undangan
    public function parentPemilik(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    // Relasi: Pendamping yang menerima undangan (bisa null jika belum terima)
    public function pendampingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pendamping_user_id');
    }
}
