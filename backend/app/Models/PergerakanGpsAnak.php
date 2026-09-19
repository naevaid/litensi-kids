<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PergerakanGpsAnak extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'pergerakan_gps_anak';

    // TIMESTAMPS DISABLE: created_at dan updated_at TIDAK ADA di tabel, karena kita pakai captured_at
    // (waktu penangkapan koordinat di HP anak sesuai GPS clock bukan waktu server)
    public $timestamps = false;

    // Kolom yang dapat diisi secara massal (Mass Assignment dari endpoint upload GPS)
    protected $fillable = [
        'profil_anak_id',
        'latitude',
        'longitude',
        'accuracy_meters',
        'battery_level',
        'speed_kmh',
        'altitude_m',
        'is_mock_detected',
        'captured_at',
    ];

    // Cast tipe data untuk kolom tertentu (otomatis konversi saat read/write Eloquent)
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'accuracy_meters' => 'integer',
            'battery_level' => 'integer',
            'speed_kmh' => 'float',
            'altitude_m' => 'float',
            'is_mock_detected' => 'boolean',
            'captured_at' => 'datetime',
        ];
    }

    // Relasi BelongsTo ke ProfilAnak (1 riwayat GPS milik tepat 1 profil anak)
    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class, 'profil_anak_id');
    }
}
