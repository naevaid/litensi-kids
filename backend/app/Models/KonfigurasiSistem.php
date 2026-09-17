<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KonfigurasiSistem extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'konfigurasi_sistem';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'app_name',
        'app_version',
        'maintenance_mode',
        'maintenance_notice',
        'registration_open',
        'max_trial_days',
        'server_region',
        'server_status',
        'fcm_push_status',
        'database_status',
        'sms_gateway_active',
        'whatsapp_gateway_active',
        'support_email',
        'support_phone',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'maintenance_mode' => 'boolean',
            'registration_open' => 'boolean',
            'max_trial_days' => 'integer',
            'sms_gateway_active' => 'boolean',
            'whatsapp_gateway_active' => 'boolean',
        ];
    }
}
