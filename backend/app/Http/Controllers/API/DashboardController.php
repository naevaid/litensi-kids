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
    // Ambil data ringkasan dashboard untuk user tertentu — ZERO TOLERANCE: TIDAK ADA FALLBACK user_id DEFAULT
    public function index(Request $request): JsonResponse
    {
        $userId = $request->input('user_id');

        // JIKA user_id TIDAK ADA / TIDAK VALID — return KOSONG (TIDAK BOLEH fallback ke id=1 admin)
        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_anak' => 0,
                        'total_device' => 0,
                        'total_perangkat_online' => 0,
                        'total_zona_geofence' => 0,
                        'total_notifikasi' => 0,
                        'total_notifikasi_unread' => 0,
                        'video_used_minutes' => 0,
                        'audio_used_minutes' => 0,
                        'video_max_minutes' => 0,
                        'audio_max_minutes' => 0,
                        'fetched_at' => now()->toISOString(),
                        'has_valid_user' => false,
                    ],
                    'daftar_perangkat' => [],
                    'notifikasi_terbaru' => [],
                    'log_geofence' => [],
                ],
            ]);
        }

        $userId = (int) $userId;
        $anakQuery = ProfilAnak::where('user_id', $userId);
        $totalAnak = $anakQuery->count();
        $totalDevice = $totalAnak;
        $totalPerangkatOnline = (clone $anakQuery)->where('is_online', true)->count();
        $totalZona = ZonaGeofence::where('user_id', $userId)->count();
        $totalNotif = NotifikasiDiteruskan::where('user_id', $userId)->count();
        $totalNotifUnread = NotifikasiDiteruskan::where('user_id', $userId)
            ->where('is_read', false)->count();

        // Estimasi usage menit berdasarkan rata-rata battery_level (indirect proxy usage real)
        $avgBattery = (clone $anakQuery)->avg('battery_level') ?? 50;
        $usageFactor = ((100 - $avgBattery) / 100) * 0.6 + 0.2;

        // Daftar perangkat untuk filter dropdown channel (dinamis)
        $daftarPerangkat = (clone $anakQuery)
            ->select('id', 'name', 'device_name', 'is_online', 'battery_level')
            ->orderBy('name')
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'anak_name' => $a->name,
                    'device_name' => $a->device_name ?? ('Perangkat ' . $a->name),
                    'is_online' => (bool) $a->is_online,
                    'battery_level' => (int) $a->battery_level,
                ];
            });

        // Estimasi kuota monitor terpakai (basis user active_plan limit default)
        $user = User::find($userId);
        $plan = $user?->active_plan ?? 'premium';
        $planLimits = [
            'free'       => ['video' => 30,  'audio' => 60],
            'premium'    => ['video' => 60,  'audio' => 300],
            'family_pro' => ['video' => 180, 'audio' => 1800],
        ];
        $limits = $planLimits[$plan] ?? $planLimits['premium'];
        $videoUsedMinutes = (int) round($limits['video'] * $usageFactor * min(1, $totalDevice * 0.8));
        $audioUsedMinutes = (int) round($limits['audio'] * $usageFactor * min(1, $totalDevice * 0.7));

        // Data notifikasi terbaru
        $notifTerbaru = NotifikasiDiteruskan::where('user_id', $userId)
            ->orderBy('timestamp', 'desc')
            ->limit(5)
            ->get();

        // Log geofence terbaru — HANYA milik user ini (via relasi zonaGeofence.user_id, privasi tidak bocor)
        $logGeofence = LogGeofence::whereHas('zonaGeofence', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->orderBy('timestamp', 'desc')
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
                    'total_perangkat_online' => $totalPerangkatOnline,
                    'total_zona_geofence' => $totalZona,
                    'total_notifikasi' => $totalNotif,
                    'total_notifikasi_unread' => $totalNotifUnread,
                    'video_used_minutes' => $videoUsedMinutes,
                    'audio_used_minutes' => $audioUsedMinutes,
                    'video_max_minutes' => $limits['video'],
                    'audio_max_minutes' => $limits['audio'],
                    'fetched_at' => now()->toISOString(),
                ],
                'daftar_perangkat' => $daftarPerangkat,
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

    // Data statistik untuk grafik mingguan WAKTU LAYAR ANAK (screen_time)
    // Mapping: log_geofence + notifikasi_count per hari → jadikan jam belajar & hiburan
    // PERATURAN ZERO TOLERANCE: TIDAK ADA BASELINE / FALLBACK MENIT jika TIDAK ADA aktivitas riil.
    public function weeklyStats(Request $request): JsonResponse
    {
        $userId = $request->input('user_id');
        $days = [];
        $totalMinutes7d = 0;

        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'weekly_data' => [],
                    'total_minutes_7d' => 0,
                    'avg_daily_hours' => 0,
                    'period_start' => null,
                    'period_end' => null,
                    'has_any_activity' => false,
                ],
            ]);
        }

        $userId = (int) $userId;
        for ($i = 6; $i >= 0; $i--) {
            $tanggal = now()->subDays($i);
            $dateStr = $tanggal->toDateString();

            $gfCount = LogGeofence::whereHas('zonaGeofence', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->whereDate('timestamp', $dateStr)
                ->count();
            $notifCount = NotifikasiDiteruskan::where('user_id', $userId)
                ->whereDate('timestamp', $dateStr)->count();

            $dow = (int) $tanggal->dayOfWeekIso;
            $isWeekend = $dow >= 6;

            // TANPA BASELINE 60/120 — HANYA HITUNG AKTIVITAS RIIL. JIKA 0 → 0 JUJUR.
            $activityBoost = ($gfCount * 12) + ($notifCount * 3);
            $totalMinutes = (int) min(300, $activityBoost);

            if ($totalMinutes > 0) {
                $belajarRatio = $isWeekend ? 0.45 : 0.60;
                $belajarMinutes = (int) round($totalMinutes * $belajarRatio);
                $hiburanMinutes = $totalMinutes - $belajarMinutes;
            } else {
                $belajarMinutes = 0;
                $hiburanMinutes = 0;
            }

            $totalMinutes7d += $totalMinutes;

            $days[] = [
                'day' => $tanggal->translatedFormat('D'),
                'date' => $tanggal->format('d M'),
                'total_minutes' => $totalMinutes,
                'belajar_minutes' => $belajarMinutes,
                'hiburan_minutes' => $hiburanMinutes,
                'log_geofence_count' => $gfCount,
                'notifikasi_count' => $notifCount,
                'is_weekend' => $isWeekend,
                'has_activity' => $totalMinutes > 0,
            ];
        }

        $hasAnyActivity = $totalMinutes7d > 0;
        $avgDailyHours = $hasAnyActivity
            ? round(($totalMinutes7d / 7) / 60, 1)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'weekly_data' => $hasAnyActivity ? $days : [],
                'total_minutes_7d' => $totalMinutes7d,
                'avg_daily_hours' => $avgDailyHours,
                'period_start' => $hasAnyActivity ? now()->subDays(6)->toDateString() : null,
                'period_end' => $hasAnyActivity ? now()->toDateString() : null,
                'has_any_activity' => $hasAnyActivity,
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
