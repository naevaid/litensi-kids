<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfilAnak extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'profil_anak';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'user_id',
        'name',
        'age',
        'gender',
        'device_name',
        'device_model',
        'os_version',
        'battery_level',
        'is_online',
        'status',
        'avatar',
        'qr_pairing_code',
        'pairing_pin',
        'paired_at',
        'last_active',
        'used_today',
        'notes',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'battery_level' => 'integer',
            'is_online' => 'boolean',
            'paired_at' => 'datetime',
            'last_active' => 'datetime',
        ];
    }

    // Relasi ke tabel users (orang tua)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
