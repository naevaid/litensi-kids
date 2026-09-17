<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogGeofence extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'log_geofence';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'zona_geofence_id',
        'child_name',
        'device_name',
        'zone_name',
        'zone_type',
        'event_type',
        'timestamp',
        'location_coordinates',
        'battery_status',
        'accuracy',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
        ];
    }

    // Relasi ke tabel zona_geofence (bisa null jika zona dihapus)
    public function zonaGeofence(): BelongsTo
    {
        return $this->belongsTo(ZonaGeofence::class, 'zona_geofence_id');
    }
}
