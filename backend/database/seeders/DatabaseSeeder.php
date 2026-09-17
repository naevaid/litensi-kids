<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    // Eksekusi semua seeder data dummy Litensi Kids
    public function run(): void
    {
        $this->call([
            PaketLanggananSeeder::class,
            KonfigurasiSistemSeeder::class,
            UsersSeeder::class,
            ProfilAnakSeeder::class,
            CatatanPendapatanSeeder::class,
            PengumumanSeeder::class,
            ZonaGeofenceSeeder::class,
            LogGeofenceSeeder::class,
            NotifikasiDiteruskanSeeder::class,
        ]);
    }
}
