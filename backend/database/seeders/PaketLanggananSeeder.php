<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaketLanggananSeeder extends Seeder
{
    // Mengisi data paket langganan (Free, Premium, Family Pro)
    public function run(): void
    {
        DB::table('paket_langganan')->insert([
            // Paket Free (Dasar)
            [
                'name' => 'Free',
                'badge' => null,
                'popular' => false,
                'tagline' => 'Mulai lindungi anak dengan fitur dasar',
                'description' => 'Paket gratisan untuk mencoba fitur inti parental control Litensi Kids.',
                'monthly_price' => 0,
                'annual_price' => 0,
                'max_children_devices' => 1,
                'location_tracking' => 'dasar',
                'location_tracking_label' => 'Lokasi Dasar (Update per 30 menit)',
                'app_restriction' => 'terbatas_3',
                'app_restriction_label' => 'Blokir 3 Aplikasi Pilihan',
                'batas_menit_av_harian' => 0,
                'one_way_audio' => false,
                'one_way_audio_label' => 'Tidak tersedia',
                'live_camera' => false,
                'live_camera_label' => 'Tidak tersedia',
                'max_geofences' => '3',
                'max_geofences_label' => 'Maksimal 3 Zona Aman',
                'read_message_notifications' => false,
                'read_message_notifications_label' => 'Tidak tersedia',
                'remote_screen_lock' => true,
                'remote_screen_lock_label' => 'Kunci Layar Jarak Jauh',
                'highlight_features' => json_encode([
                    '1 Perangkat Anak',
                    'Pelacakan Lokasi Dasar',
                    '3 Zona Geofence',
                    'Blokir Maksimal 3 Aplikasi',
                    'Kunci Layar Jarak Jauh'
                ]),
                'active_users_count' => 342,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now()
            ],
            // Paket Premium (Populer)
            [
                'name' => 'Premium',
                'badge' => 'Paling Populer',
                'popular' => true,
                'tagline' => 'Perlindungan lengkap untuk 1-3 anak',
                'description' => 'Paket pilihan keluarga Indonesia. Sudah termasuk audio monitor 1 arah dan riwayat GPS 7 hari.',
                'monthly_price' => 39000,
                'annual_price' => 299000,
                'max_children_devices' => 3,
                'location_tracking' => 'realtime_7d',
                'location_tracking_label' => 'Realtime GPS 7 Hari (Refresh 5 menit)',
                'app_restriction' => 'unlimited_jadwal',
                'app_restriction_label' => 'Unlimited Blokir + Jadwal',
                'batas_menit_av_harian' => 60,
                'one_way_audio' => true,
                'one_way_audio_label' => 'Audio Monitor 60 menit/hari',
                'live_camera' => false,
                'live_camera_label' => 'Upgrade ke Family Pro',
                'max_geofences' => '25',
                'max_geofences_label' => 'Maksimal 25 Zona Aman',
                'read_message_notifications' => true,
                'read_message_notifications_label' => 'Terusan WA & SMS ke Orang Tua',
                'remote_screen_lock' => true,
                'remote_screen_lock_label' => 'Kunci Layar + Alarm SOS',
                'highlight_features' => json_encode([
                    '3 Perangkat Anak',
                    'Realtime GPS 7 Hari',
                    '25 Zona Geofence',
                    'Unlimited Blokir Aplikasi + Jadwal',
                    'Audio Monitor 1 Arah (60 menit/hari)',
                    'Terusan Notifikasi WA & SMS',
                    'Kunci Layar + Alarm SOS'
                ]),
                'active_users_count' => 1250,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now()
            ],
            // Paket Family Pro (Terlengkap)
            [
                'name' => 'Family Pro',
                'badge' => 'Paket Terlengkap',
                'popular' => false,
                'tagline' => 'Kontrol penuh untuk keluarga besar',
                'description' => 'Paket terlengkap dengan Live Kamera HD, GPS 30 Hari, Unlimited Geofence dan proteksi AI.',
                'monthly_price' => 99000,
                'annual_price' => 999000,
                'max_children_devices' => 10,
                'location_tracking' => 'realtime_30d_sos',
                'location_tracking_label' => 'Realtime GPS 30 Hari + Tombol SOS',
                'app_restriction' => 'unlimited_ai',
                'app_restriction_label' => 'Unlimited + AI SafeFilter Konten',
                'batas_menit_av_harian' => 240,
                'one_way_audio' => true,
                'one_way_audio_label' => 'Audio Monitor Unlimited',
                'live_camera' => true,
                'live_camera_label' => 'Live Kamera HD (240 menit/hari = 4 jam)',
                'max_geofences' => 'Unlimited',
                'max_geofences_label' => 'Zona Geofence Tanpa Batas',
                'read_message_notifications' => true,
                'read_message_notifications_label' => 'Terusan Lengkap (WA, SMS, IG, OTP)',
                'remote_screen_lock' => true,
                'remote_screen_lock_label' => 'Kunci Layar + Alarm + SOS Darurat',
                'highlight_features' => json_encode([
                    '10 Perangkat Anak',
                    'Realtime GPS 30 Hari + SOS',
                    'Unlimited Zona Geofence',
                    'Unlimited Blokir + AI SafeFilter',
                    'Audio Monitor 1 Arah Unlimited',
                    'Live Kamera HD (240 menit/hari = 4 jam)',
                    'Terusan Notifikasi Lengkap',
                    'Deteksi Kata Sensitif Pesan',
                    'Support Prioritas 24/7'
                ]),
                'active_users_count' => 890,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
