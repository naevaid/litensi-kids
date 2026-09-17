<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProfilAnakSeeder extends Seeder
{
    // Mengisi data profil anak untuk user Ahmad Faisal (user_id = 1)
    public function run(): void
    {
        DB::table('profil_anak')->insert([
            [
                'user_id' => 1, // Ahmad Faisal
                'name' => 'Nadia Putri',
                'age' => 10,
                'gender' => 'perempuan',
                'device_name' => 'Tablet Samsung Tab A8',
                'device_model' => 'SM-X200 (Android 13)',
                'os_version' => 'Android 13 OneUI 5.1',
                'battery_level' => 84,
                'is_online' => true,
                'status' => 'active',
                'avatar' => 'icon:Smile',
                'qr_pairing_code' => 'LTN-NAD-8842-SEC',
                'pairing_pin' => '884291',
                'paired_at' => '2026-01-12 10:30:00',
                'last_active' => now(),
                'used_today' => '1j 15m',
                'notes' => 'Akses YouTube Kids & Duolingo',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1, // Ahmad Faisal
                'name' => 'Rayhan Pratama',
                'age' => 7,
                'gender' => 'laki-laki',
                'device_name' => 'Xiaomi Redmi 10',
                'device_model' => 'Redmi 10 2022 (MIUI 14)',
                'os_version' => 'Android 12 MIUI 14',
                'battery_level' => 42,
                'is_online' => true,
                'status' => 'active',
                'avatar' => 'icon:Rocket',
                'qr_pairing_code' => 'LTN-RAY-4921-SEC',
                'pairing_pin' => '492107',
                'paired_at' => '2026-01-28 14:00:00',
                'last_active' => now()->subMinutes(10),
                'used_today' => '30m',
                'notes' => 'Batas malam jam 20:00',
                'created_at' => now(),
                'updated_at' => now()
            ],
            // Anak Siti Rahmawati (user_id = 2)
            [
                'user_id' => 2,
                'name' => 'Alika Zahra',
                'age' => 12,
                'gender' => 'perempuan',
                'device_name' => 'Oppo Reno 8',
                'device_model' => 'CPH2359 (ColorOS 13)',
                'os_version' => 'Android 13 ColorOS 13.1',
                'battery_level' => 95,
                'is_online' => false,
                'status' => 'active',
                'avatar' => 'icon:Star',
                'qr_pairing_code' => 'LTN-ALK-3129-SEC',
                'pairing_pin' => '312944',
                'paired_at' => '2026-02-05 09:15:00',
                'last_active' => now()->subHours(2),
                'used_today' => '2j 10m',
                'notes' => 'Kelas 6 SD - Mode Belajar Aktif',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
