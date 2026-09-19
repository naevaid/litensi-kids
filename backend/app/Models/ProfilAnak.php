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
        'av_minutes_daily_override',
        'fcm_token',
        'notes',
        // G1.3 - Last known GPS (snapshot terakhir untuk Monitor initial center, TIDAK hardcode Jakarta!)
        'last_known_latitude',
        'last_known_longitude',
        'last_gps_captured_at',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'battery_level' => 'integer',
            'is_online' => 'boolean',
            'paired_at' => 'datetime',
            'last_active' => 'datetime',
            'av_minutes_daily_override' => 'integer',
            // G1.3 cast untuk GPS last known
            'last_known_latitude' => 'decimal:7',
            'last_known_longitude' => 'decimal:7',
            'last_gps_captured_at' => 'datetime',
        ];
    }

    // Relasi ke tabel users (orang tua)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
