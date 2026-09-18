<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaketLangganan extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'paket_langganan';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'name',
        'badge',
        'popular',
        'tagline',
        'description',
        'monthly_price',
        'annual_price',
        'max_children_devices',
        'max_children_devices_label',
        'location_tracking',
        'location_tracking_label',
        'app_restriction',
        'app_restriction_label',
        'one_way_audio',
        'one_way_audio_label',
        'live_camera',
        'live_camera_label',
        'max_geofences',
        'max_geofences_label',
        'read_message_notifications',
        'read_message_notifications_label',
        'remote_screen_lock',
        'remote_screen_lock_label',
        'highlight_features',
        'active_users_count',
        'status',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'popular' => 'boolean',
            'monthly_price' => 'integer',
            'annual_price' => 'integer',
            'max_children_devices' => 'integer',
            'one_way_audio' => 'boolean',
            'live_camera' => 'boolean',
            'read_message_notifications' => 'boolean',
            'remote_screen_lock' => 'boolean',
            'highlight_features' => 'array',
            'active_users_count' => 'integer',
        ];
    }
}
