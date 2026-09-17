<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ZonaGeofence extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'zona_geofence';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'user_id',
        'name',
        'category',
        'address',
        'latitude',
        'longitude',
        'radius_meters',
        'assigned_children',
        'notify_on_enter',
        'notify_on_exit',
        'status',
        'color',
        'last_triggered',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'radius_meters' => 'integer',
            'assigned_children' => 'array',
            'notify_on_enter' => 'boolean',
            'notify_on_exit' => 'boolean',
            'last_triggered' => 'datetime',
        ];
    }

    // Relasi ke tabel users (pemilik zona)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Relasi ke tabel log_geofence (riwayat trigger)
    public function logGeofence(): HasMany
    {
        return $this->hasMany(LogGeofence::class, 'zona_geofence_id');
    }
}
