<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ZonaGeofenceSeeder extends Seeder
{
    // Mengisi data zona geofence untuk user Ahmad Faisal (user_id = 1)
    public function run(): void
    {
        DB::table('zona_geofence')->insert([
            [
                'user_id' => 1,
                'name' => 'Rumah Keluarga',
                'category' => 'home',
                'address' => 'Jl. Menteng Dalam No. 12, Jakarta Pusat',
                'latitude' => -6.194400,
                'longitude' => 106.832000,
                'radius_meters' => 100,
                'assigned_children' => json_encode(['child-1', 'child-2']),
                'notify_on_enter' => true,
                'notify_on_exit' => true,
                'status' => 'active',
                'color' => '#10b981',
                'last_triggered' => now()->subHours(3),
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'name' => 'SDN Menteng 01',
                'category' => 'school',
                'address' => 'Jl. Menteng Raya No. 31, Jakarta Pusat',
                'latitude' => -6.190000,
                'longitude' => 106.833500,
                'radius_meters' => 150,
                'assigned_children' => json_encode(['child-1', 'child-2']),
                'notify_on_enter' => true,
                'notify_on_exit' => true,
                'status' => 'active',
                'color' => '#6366f1',
                'last_triggered' => now()->subHours(7),
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'name' => 'Tempat Les Privat',
                'category' => 'safe',
                'address' => 'Jl. Pegangsaan Timur No. 56, Menteng',
                'latitude' => -6.187500,
                'longitude' => 106.834000,
                'radius_meters' => 80,
                'assigned_children' => json_encode(['child-1']),
                'notify_on_enter' => true,
                'notify_on_exit' => false,
                'status' => 'active',
                'color' => '#22c55e',
                'last_triggered' => now()->subDays(1),
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'name' => 'Zona Bahaya: Area Stasiun',
                'category' => 'danger',
                'address' => 'Stasiun Gondangdia, Jakarta Pusat',
                'latitude' => -6.185500,
                'longitude' => 106.828000,
                'radius_meters' => 200,
                'assigned_children' => json_encode(['child-1', 'child-2']),
                'notify_on_enter' => true,
                'notify_on_exit' => false,
                'status' => 'active',
                'color' => '#ef4444',
                'last_triggered' => null,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
