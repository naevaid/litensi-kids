<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NotifikasiDiteruskanSeeder extends Seeder
{
    // Mengisi data notifikasi pesan yang diteruskan dari perangkat anak
    public function run(): void
    {
        DB::table('notifikasi_diteruskan')->insert([
            [
                'user_id' => 1,
                'profil_anak_id' => 1,
                'child_name' => 'Nadia Putri',
                'device_name' => 'Tablet Samsung Tab A8',
                'app_name' => 'WhatsApp',
                'app_package' => 'com.whatsapp',
                'app_category' => 'chat',
                'sender_or_title' => 'Ibu Guru Kelas 4A',
                'content' => 'Assalamualaikum bu, mohon izin besok anak-anak membawa alat tulis lengkap ya untuk ujian tengah semester. Terima kasih.',
                'timestamp' => '2026-09-15 08:12:00',
                'is_read' => true,
                'is_starred' => false,
                'is_flagged' => false,
                'flag_reason' => null,
                'is_sensitive' => false,
                'sensitive_category' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'profil_anak_id' => 1,
                'child_name' => 'Nadia Putri',
                'device_name' => 'Tablet Samsung Tab A8',
                'app_name' => 'Instagram',
                'app_package' => 'com.instagram.android',
                'app_category' => 'social',
                'sender_or_title' => 'Teman sekelas: Rina',
                'content' => 'Kamu nonton video apa kemarin? Aku nonton yang viral itu loh 😜',
                'timestamp' => '2026-09-15 10:45:00',
                'is_read' => false,
                'is_starred' => false,
                'is_flagged' => true,
                'flag_reason' => 'Penggunaan emoji mencurigakan',
                'is_sensitive' => true,
                'sensitive_category' => 'Sosial / Interaksi Teman',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'profil_anak_id' => 2,
                'child_name' => 'Rayhan Pratama',
                'device_name' => 'Xiaomi Redmi 10',
                'app_name' => 'Pesan SMS',
                'app_package' => 'com.android.sms',
                'app_category' => 'sms',
                'sender_or_title' => 'OTP BCA Mobile',
                'content' => 'Kode OTP Anda: 847291. Berlaku 5 menit. JANGAN BERIKAN KODE INI KE SIAPAPUN.',
                'timestamp' => '2026-09-15 09:30:00',
                'is_read' => true,
                'is_starred' => true,
                'is_flagged' => false,
                'flag_reason' => null,
                'is_sensitive' => false,
                'sensitive_category' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'profil_anak_id' => 2,
                'child_name' => 'Rayhan Pratama',
                'device_name' => 'Xiaomi Redmi 10',
                'app_name' => 'YouTube Kids',
                'app_package' => 'com.google.android.youtube kids',
                'app_category' => 'other',
                'sender_or_title' => 'Notifikasi Video',
                'content' => 'Video baru: Eksperimen Sains Volcano Mini - Siapakah yang akan menang? 🧪',
                'timestamp' => '2026-09-15 09:40:00',
                'is_read' => false,
                'is_starred' => false,
                'is_flagged' => false,
                'flag_reason' => null,
                'is_sensitive' => false,
                'sensitive_category' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'profil_anak_id' => 1,
                'child_name' => 'Nadia Putri',
                'device_name' => 'Tablet Samsung Tab A8',
                'app_name' => 'WhatsApp',
                'app_package' => 'com.whatsapp',
                'app_category' => 'chat',
                'sender_or_title' => 'Nomor tidak dikenal',
                'content' => 'Hai cantik, aku temen kakak kelas ya? Bisa diajak kenalan ga? 😍😘',
                'timestamp' => '2026-09-14 19:15:00',
                'is_read' => false,
                'is_starred' => false,
                'is_flagged' => true,
                'flag_reason' => 'Chat dari nomor tidak dikenal + kata sensitif',
                'is_sensitive' => true,
                'sensitive_category' => 'Potensi Predator / Chat Asing',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 1,
                'profil_anak_id' => 2,
                'child_name' => 'Rayhan Pratama',
                'device_name' => 'Xiaomi Redmi 10',
                'app_name' => 'Free Fire MAX',
                'app_package' => 'com.dts.freefiremax',
                'app_category' => 'games',
                'sender_or_title' => 'Notifikasi Game',
                'content' => 'Top up diamond hanya Rp 10.000, dapatkan bundle senjata eksklusif sekarang!',
                'timestamp' => '2026-09-14 20:30:00',
                'is_read' => false,
                'is_starred' => false,
                'is_flagged' => false,
                'flag_reason' => null,
                'is_sensitive' => false,
                'sensitive_category' => null,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
