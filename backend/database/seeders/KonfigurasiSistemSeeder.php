<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KonfigurasiSistemSeeder extends Seeder
{
    // Mengisi data konfigurasi sistem default
    public function run(): void
    {
        DB::table('konfigurasi_sistem')->insert([
            [
                'app_name' => 'Litensi Kids - Parental Control Platform',
                'app_version' => 'v2.4.0 (Enterprise)',
                'maintenance_mode' => false,
                'maintenance_notice' => 'Sistem sedang dalam peningkatan performa server. Silakan coba beberapa saat lagi.',
                'registration_open' => true,
                'max_trial_days' => 7,
                'server_region' => 'Asia-East1 (Jakarta & Singapore Hybrid)',
                'server_status' => 'optimal',
                'fcm_push_status' => 'connected',
                'database_status' => 'healthy',
                'sms_gateway_active' => true,
                'whatsapp_gateway_active' => true,
                'support_email' => 'support@litensikids.id',
                'support_phone' => '+62 812-8888-9999',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
