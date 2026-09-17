<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CatatanPendapatan;
use App\Models\LogGeofence;
use App\Models\NotifikasiDiteruskan;
use App\Models\PaketLangganan;
use App\Models\ProfilAnak;
use App\Models\User;
use App\Models\ZonaGeofence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    // Ambil data ringkasan dashboard untuk user tertentu
    public function index(Request $request): JsonResponse
    {
        $userId = $request->input('user_id', 1); // Default Ahmad Faisal

        $totalAnak = ProfilAnak::where('user_id', $userId)->count();
        $totalDevice = ProfilAnak::where('user_id', $userId)->count();
        $totalZona = ZonaGeofence::where('user_id', $userId)->count();
        $totalNotif = NotifikasiDiteruskan::where('user_id', $userId)->count();

        // Data notifikasi terbaru
        $notifTerbaru = NotifikasiDiteruskan::where('user_id', $userId)
            ->orderBy('timestamp', 'desc')
            ->limit(5)
            ->get();

        // Log geofence terbaru
        $logGeofence = LogGeofence::orderBy('timestamp', 'desc')
            ->limit(5)
            ->get();

        // Data pendapatan mingguan (untuk master dashboard)
        $pendapatan7Hari = CatatanPendapatan::where('status', 'sukses')
            ->where('transaction_date', '>=', now()->subDays(7))
            ->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_anak' => $totalAnak,
                    'total_device' => $totalDevice,
                    'total_zona_geofence' => $totalZona,
                    'total_notifikasi' => $totalNotif,
                ],
                'master_summary' => [
                    'total_user' => User::where('role', 'Orang Tua')->count(),
                    'total_paket_aktif' => User::where('active_plan', '!=', 'free')->count(),
                    'total_pendapatan_7hari' => $pendapatan7Hari,
                    'total_profil_anak' => ProfilAnak::count(),
                ],
                'notifikasi_terbaru' => $notifTerbaru,
                'log_geofence' => $logGeofence,
            ],
        ]);
    }

    // Data statistik untuk grafik mingguan
    public function weeklyStats(Request $request): JsonResponse
    {
        $days = [];
        $total = 0;

        for ($i = 6; $i >= 0; $i--) {
            $tanggal = now()->subDays($i);
            $jumlah = CatatanPendapatan::where('status', 'sukses')
                ->whereDate('transaction_date', $tanggal->toDateString())
                ->count();
            $total += $jumlah;
            $days[] = [
                'day' => $tanggal->translatedFormat('D'),
                'date' => $tanggal->format('d M'),
                'count' => $jumlah,
                'amount' => CatatanPendapatan::where('status', 'sukses')
                    ->whereDate('transaction_date', $tanggal->toDateString())
                    ->sum('amount'),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'weekly_data' => $days,
                'total_transaksi' => $total,
            ],
        ]);
    }

    // Daftar paket langganan untuk pilihan dropdown
    public function paketOptions(): JsonResponse
    {
        $paket = PaketLangganan::where('status', 'active')->get();

        return response()->json([
            'success' => true,
            'data' => $paket,
        ]);
    }
}
