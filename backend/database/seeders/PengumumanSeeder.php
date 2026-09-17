<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PengumumanSeeder extends Seeder
{
    // Mengisi data pengumuman untuk ditampilkan ke pengguna
    public function run(): void
    {
        DB::table('pengumuman')->insert([
            [
                'title' => 'Update Fitur v2.4: AI SafeFilter Lebih Cerdas',
                'badge_text' => 'PEMBARUAN',
                'badge_color' => 'indigo',
                'content_type' => 'text',
                'description' => 'Fitur AI penyaring konten kini lebih akurat mendeteksi kata-kata sensitif dan konten dewasa di pesan WhatsApp, SMS, dan Instagram DM.',
                'image_url' => null,
                'video_url' => null,
                'display_target' => 'header',
                'start_date' => '2026-09-01',
                'end_date' => '2026-10-30',
                'is_active' => true,
                'cta_label' => 'Lihat Catatan Rilis',
                'cta_url' => 'https://litensikids.id/changelog',
                'author' => 'Tim Litensi Kids',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'title' => 'Tips Parenting: Atur Screen Time Seimbang',
                'badge_text' => 'EDUKASI PARENTING',
                'badge_color' => 'amber',
                'content_type' => 'text',
                'description' => 'Pola screen time seimbang membantu fokus dan istirahat tidur anak lebih optimal. Disarankan maksimal 2 jam/hari untuk usia SD dan kombinasi dengan aktivitas fisik.',
                'image_url' => null,
                'video_url' => null,
                'display_target' => 'both',
                'start_date' => '2026-09-10',
                'end_date' => '2026-12-31',
                'is_active' => true,
                'cta_label' => null,
                'cta_url' => null,
                'author' => 'Psikolog Anak Mitra',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'title' => 'Promo Spesial HUT Kemerdekaan - Diskon 30%',
                'badge_text' => 'PROMO',
                'badge_color' => 'rose',
                'content_type' => 'combined',
                'description' => 'Rayakan HUT RI dengan harga spesial! Upgrade ke Family Pro hanya Rp 79.000/bulan. Berlaku hingga 30 September 2026.',
                'image_url' => null,
                'video_url' => null,
                'display_target' => 'modal',
                'start_date' => '2026-08-17',
                'end_date' => '2026-09-30',
                'is_active' => true,
                'cta_label' => 'Upgrade Sekarang',
                'cta_url' => '#/pengaturan/langganan',
                'author' => 'Tim Marketing',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'title' => 'Jadwal Maintenance Server Minggu Dini Hari',
                'badge_text' => 'INFORMASI',
                'badge_color' => 'blue',
                'content_type' => 'text',
                'description' => 'Pemeliharaan server rencana Minggu, 22 September 2026 pukul 02.00 - 04.00 WIB. Fitur push notification dan realtime GPS mungkin tidak tersedia sementara.',
                'image_url' => null,
                'video_url' => null,
                'display_target' => 'header',
                'start_date' => '2026-09-18',
                'end_date' => '2026-09-23',
                'is_active' => true,
                'cta_label' => null,
                'cta_url' => null,
                'author' => 'Tim Infrastruktur',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
