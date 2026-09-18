<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CatatanPendapatan;
use App\Models\KuotaAvMonitorHarian;
use App\Models\LogGeofence;
use App\Models\NotifikasiDiteruskan;
use App\Models\PaketLangganan;
use App\Models\ProfilAnak;
use App\Models\User;
use App\Models\ZonaGeofence;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    // Helper normalisasi nama paket ke snake_case — konsisten dengan MonitorAVController & PaketController
    private function normalizePlanId(string $raw): string
    {
        $norm = trim((string)$raw);
        $norm = preg_replace('/[^a-zA-Z0-9]+/', '_', $norm);
        $norm = preg_replace('/_+/', '_', $norm);
        return strtolower(trim($norm, '_'));
    }

    // Helper: Ambil detail Paket Langganan milik user berdasarkan users.active_plan
    private function getPaketUser(int $userId): ?PaketLangganan
    {
        $user = User::find($userId);
        if (!$user || empty($user->active_plan)) return null;
        $userPlanNorm = $this->normalizePlanId((string)$user->active_plan);
        $allPaket = PaketLangganan::where('status', 'active')->get();
        foreach ($allPaket as $paket) {
            if ($this->normalizePlanId((string)$paket->name) === $userPlanNorm) {
                return $paket;
            }
        }
        return null;
    }

    // Helper PRIORITAS 1: Hitung batas kuota menit AV HARIAN untuk anak tertentu (3 layer zero hardcode)
    private function getBatasPaketKuotaAnak(int $userId, ProfilAnak $anak): int
    {
        if (!empty($anak->av_minutes_daily_override) && (int)$anak->av_minutes_daily_override > 0) {
            return (int)$anak->av_minutes_daily_override;
        }
        $paket = $this->getPaketUser($userId);
        if ($paket !== null) {
            return (int)($paket->batas_menit_av_harian ?? 0);
        }
        return 0; // zero hardcode fallback jujur
    }

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

        // ⚠️ FIX STALE COUNTER: users.children_count / devices_count TIDAK SELALU TER-UPDATE
        // (misal user manual insert DB / belum sync dari AnakController create).
        // JIKA nilai counter mismatch dengan COUNT actual profil_anak → AUTO-SYNC kolom users SEKARANG.
        // (Tidak menunggu next create/delete ProfilAnak untuk update counter — agar dashboard SELALU BENAR realtime).
        $userRow = User::find($userId);
        if ($userRow && ((int)($userRow->children_count ?? 0) !== $totalAnak || (int)($userRow->devices_count ?? 0) !== $totalDevice)) {
            $userRow->children_count = $totalAnak;
            $userRow->devices_count = $totalDevice;
            $userRow->save();
        }

        $totalZona = ZonaGeofence::where('user_id', $userId)->count();
        $totalNotif = NotifikasiDiteruskan::where('user_id', $userId)->count();
        $totalNotifUnread = NotifikasiDiteruskan::where('user_id', $userId)
            ->where('is_read', false)->count();

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

        // ⚠️ R7 FIX KRITIS: KUOTA AV TERPAKAI AMBIL DARI TABEL ASLI kuota_av_monitor_harian
        // (BUKAN proxy battery level * usageFactor * planLimits HARDCODE LAMA YANG SALAH!)
        $tanggalToday = Carbon::now()->toDateString();
        $anakIds = (clone $anakQuery)->pluck('id')->all();

        $audioUsedMinutes = 0;
        $videoUsedMinutes = 0;
        $batasMaxGabunganAllAnak = 0; // Jumlah total kuota max semua anak (untuk dashboard summary)

        if (!empty($anakIds)) {
            // 1) SUM kuota DIGUNAKAN hari ini dari tabel asli (tidak ada proxy sama sekali)
            $sumKuota = KuotaAvMonitorHarian::whereIn('profil_anak_id', $anakIds)
                ->where('tanggal', $tanggalToday)
                ->selectRaw('
                    IFNULL(SUM(digunakan_audio_menit), 0) as total_audio,
                    IFNULL(SUM(digunakan_video_menit), 0) as total_video
                ')
                ->first();
            $audioUsedMinutes = (int)($sumKuota?->total_audio ?? 0);
            $videoUsedMinutes = (int)($sumKuota?->total_video ?? 0);

            // 2) BATAS MAX per anak = SUM dari 3 layer priority (override > paket > 0)
            //    Perhitungan per anak, tidak ambil dari kolom row kuota (bisa outdated jika user baru upgrade)
            $anakAllRows = (clone $anakQuery)->get();
            foreach ($anakAllRows as $anak) {
                $batasPerAnak = $this->getBatasPaketKuotaAnak($userId, $anak);
                // Jika batas=0 → unlimited (tidak dijumlahkan ke max summary agar user tidak bingung "max 0 tapi digunakan")
                // Dashboard client akan interpretasi: maxGabungan = 0 → unlimited / upgrade needed
                $batasMaxGabunganAllAnak += $batasPerAnak;
            }
        }

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
                    // ⚠️ R7: max = BATAS ASLI DARI PAKET (bukan hardcode free/premium/family_pro)
                    // max_minutes = 0 jujur → frontend interpretasi unlimited / nonaktif
                    'video_max_minutes' => $batasMaxGabunganAllAnak,
                    'audio_max_minutes' => $batasMaxGabunganAllAnak,
                    '_batas_gabungan_all_anak_menit' => $batasMaxGabunganAllAnak,
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
