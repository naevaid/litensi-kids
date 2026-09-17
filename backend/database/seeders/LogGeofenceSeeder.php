<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LogGeofenceSeeder extends Seeder
{
    // Mengisi data riwayat log aktivitas geofence
    public function run(): void
    {
        DB::table('log_geofence')->insert([
            [
                'zona_geofence_id' => 2,
                'child_name' => 'Nadia Putri',
                'device_name' => 'Tablet Samsung Tab A8',
                'zone_name' => 'SDN Menteng 01',
                'zone_type' => 'school',
                'event_type' => 'enter',
                'timestamp' => '2026-09-15 07:15:00',
                'location_coordinates' => '-6.190000, 106.833500',
                'battery_status' => '84%',
                'accuracy' => 'Tinggi (5m)',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'zona_geofence_id' => 2,
                'child_name' => 'Rayhan Pratama',
                'device_name' => 'Xiaomi Redmi 10',
                'zone_name' => 'SDN Menteng 01',
                'zone_type' => 'school',
                'event_type' => 'enter',
                'timestamp' => '2026-09-15 07:20:00',
                'location_coordinates' => '-6.190050, 106.833480',
                'battery_status' => '62%',
                'accuracy' => 'Tinggi (7m)',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'zona_geofence_id' => 1,
                'child_name' => 'Nadia Putri',
                'device_name' => 'Tablet Samsung Tab A8',
                'zone_name' => 'Rumah Keluarga',
                'zone_type' => 'home',
                'event_type' => 'exit',
                'timestamp' => '2026-09-15 06:50:00',
                'location_coordinates' => '-6.194400, 106.832000',
                'battery_status' => '90%',
                'accuracy' => 'Tinggi (4m)',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'zona_geofence_id' => 2,
                'child_name' => 'Nadia Putri',
                'device_name' => 'Tablet Samsung Tab A8',
                'zone_name' => 'SDN Menteng 01',
                'zone_type' => 'school',
                'event_type' => 'exit',
                'timestamp' => '2026-09-14 13:30:00',
                'location_coordinates' => '-6.190000, 106.833500',
                'battery_status' => '58%',
                'accuracy' => 'Tinggi (6m)',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'zona_geofence_id' => 3,
                'child_name' => 'Nadia Putri',
                'device_name' => 'Tablet Samsung Tab A8',
                'zone_name' => 'Tempat Les Privat',
                'zone_type' => 'safe',
                'event_type' => 'dwell',
                'timestamp' => '2026-09-14 16:00:00',
                'location_coordinates' => '-6.187500, 106.834000',
                'battery_status' => '48%',
                'accuracy' => 'Sedang (15m)',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
