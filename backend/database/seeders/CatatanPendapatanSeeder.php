<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CatatanPendapatanSeeder extends Seeder
{
    // Mengisi data transaksi pendapatan dari pembayaran pengguna
    public function run(): void
    {
        DB::table('catatan_pendapatan')->insert([
            [
                'user_id' => 1,
                'user_name' => 'Ahmad Faisal',
                'user_email' => 'orangtua@litensikids.id',
                'user_phone' => '081234567890',
                'item' => 'Langganan Family Pro (1 Tahun)',
                'amount' => 349000,
                'provider' => 'QRIS / Midtrans',
                'status' => 'sukses',
                'transaction_date' => '2026-08-22 14:35:00',
                'invoice_no' => 'INV/20260822/FP/001',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 2,
                'user_name' => 'Siti Rahmawati',
                'user_email' => 'siti.rahma@gmail.com',
                'user_phone' => '081398765432',
                'item' => 'Langganan Paket Premium (6 Bulan)',
                'amount' => 199000,
                'provider' => 'BCA Virtual Account',
                'status' => 'sukses',
                'transaction_date' => '2026-08-22 11:15:00',
                'invoice_no' => 'INV/20260822/PR/002',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 5,
                'user_name' => 'Hendrawan Pratama',
                'user_email' => 'hendra.p@company.co.id',
                'user_phone' => '081122334455',
                'item' => 'Langganan Family Pro (1 Tahun)',
                'amount' => 349000,
                'provider' => 'Xendit / Mandiri VA',
                'status' => 'sukses',
                'transaction_date' => '2026-08-21 19:40:00',
                'invoice_no' => 'INV/20260821/FP/003',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 4,
                'user_name' => 'Dewi Lestari',
                'user_email' => 'dewi.lestari@outlook.com',
                'user_phone' => '081900112233',
                'item' => 'Perpanjangan Paket Premium (1 Bulan)',
                'amount' => 39000,
                'provider' => 'GoPay / Midtrans',
                'status' => 'kadaluwarsa',
                'transaction_date' => '2026-08-21 16:10:00',
                'invoice_no' => 'INV/20260821/PR/004',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 9,
                'user_name' => 'dr. Satria Nugroho',
                'user_email' => 'satria.nugroho@rsud.go.id',
                'user_phone' => '081344556677',
                'item' => 'Langganan Family Pro (1 Tahun) + Addon Kuota 2 HP',
                'amount' => 429000,
                'provider' => 'BSI Virtual Account',
                'status' => 'sukses',
                'transaction_date' => '2026-08-20 09:20:00',
                'invoice_no' => 'INV/20260820/FP/005',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 6,
                'user_name' => 'Rina Kusuma Wardani',
                'user_email' => 'rina.wardani@gmail.com',
                'user_phone' => '082188776655',
                'item' => 'Langganan Paket Premium (1 Tahun)',
                'amount' => 299000,
                'provider' => 'Google Play Billing',
                'status' => 'sukses',
                'transaction_date' => '2026-08-20 08:05:00',
                'invoice_no' => 'INV/20260820/PR/006',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 7,
                'user_name' => 'Dedi Kurniawan',
                'user_email' => 'dedi.kurniawan@idcloud.com',
                'user_phone' => '087812998877',
                'item' => 'Langganan Family Pro (1 Tahun)',
                'amount' => 349000,
                'provider' => 'BRI Virtual Account',
                'status' => 'sukses',
                'transaction_date' => '2026-08-19 21:00:00',
                'invoice_no' => 'INV/20260819/FP/007',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 10,
                'user_name' => 'Lina Marlina',
                'user_email' => 'lina.marlina@sekolahalam.sch.id',
                'user_phone' => '085233441100',
                'item' => 'Langganan Paket Premium (1 Bulan)',
                'amount' => 39000,
                'provider' => 'ShopeePay / Midtrans',
                'status' => 'menunggu',
                'transaction_date' => '2026-08-19 17:45:00',
                'invoice_no' => 'INV/20260819/PR/008',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => 11,
                'user_name' => 'Fauzi Firmansyah',
                'user_email' => 'fauzi.firmansyah@startup.id',
                'user_phone' => '081977889900',
                'item' => 'Langganan Paket Premium (6 Bulan)',
                'amount' => 199000,
                'provider' => 'QRIS / Xendit',
                'status' => 'sukses',
                'transaction_date' => '2026-08-18 13:25:00',
                'invoice_no' => 'INV/20260818/PR/009',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => null,
                'user_name' => 'Agus Setiawan',
                'user_email' => 'agus.setiawan@gmail.com',
                'user_phone' => '081266554433',
                'item' => 'Langganan Family Pro (1 Tahun)',
                'amount' => 349000,
                'provider' => 'BCA Virtual Account',
                'status' => 'refund',
                'transaction_date' => '2026-08-17 10:10:00',
                'invoice_no' => 'INV/20260817/FP/010',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => null,
                'user_name' => 'Bambang Trihatmodjo',
                'user_email' => 'bambang.tri@corp.id',
                'user_phone' => '081833445566',
                'item' => 'Langganan Family Pro (1 Tahun)',
                'amount' => 349000,
                'provider' => 'BNI Virtual Account',
                'status' => 'sukses',
                'transaction_date' => '2026-08-16 15:50:00',
                'invoice_no' => 'INV/20260816/FP/011',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'user_id' => null,
                'user_name' => 'Nurul Hidayati',
                'user_email' => 'nurul.hidayati@yahoo.com',
                'user_phone' => '085699887766',
                'item' => 'Langganan Paket Premium (1 Bulan)',
                'amount' => 39000,
                'provider' => 'DANA / Midtrans',
                'status' => 'sukses',
                'transaction_date' => '2026-08-15 12:30:00',
                'invoice_no' => 'INV/20260815/PR/012',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
