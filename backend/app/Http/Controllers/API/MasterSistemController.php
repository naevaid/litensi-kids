<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CatatanPendapatan;
use App\Models\KonfigurasiSistem;
use App\Models\Pengumuman;
use App\Models\ProfilAnak;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MasterSistemController extends Controller
{
    // Ambil konfigurasi sistem saat ini
    public function index(): JsonResponse
    {
        $config = KonfigurasiSistem::first();

        if (! $config) {
            $config = KonfigurasiSistem::create([
                'app_name' => 'Litensi Kids',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $config,
        ]);
    }

    // Update konfigurasi sistem
    public function update(Request $request): JsonResponse
    {
        $config = KonfigurasiSistem::first();

        if (! $config) {
            $config = KonfigurasiSistem::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Konfigurasi sistem berhasil dibuat',
                'data' => $config,
            ], 201);
        }

        $config->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Konfigurasi sistem berhasil diperbarui',
            'data' => $config,
        ]);
    }

    // Statistik keseluruhan sistem (untuk dashboard master)
    public function systemStats(): JsonResponse
    {
        $totalUser = User::where('role', 'Orang Tua')->count();
        $totalAnak = ProfilAnak::count();
        $totalPendapatan = CatatanPendapatan::where('status', 'sukses')->sum('amount');
        $totalPengumumanAktif = Pengumuman::where('is_active', true)
            ->whereDate('start_date', '<=', now())
            ->whereDate('end_date', '>=', now())
            ->count();

        $perPlan = User::selectRaw('active_plan, COUNT(*) as total')
            ->groupBy('active_plan')
            ->pluck('total', 'active_plan')
            ->toArray();

        $perStatus = User::selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $perProvider = CatatanPendapatan::selectRaw('provider, COUNT(*) as total, SUM(amount) as amount')
            ->where('status', 'sukses')
            ->groupBy('provider')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => [
                    'user_orang_tua' => $totalUser,
                    'profil_anak' => $totalAnak,
                    'pendapatan_sukses' => $totalPendapatan,
                    'pengumuman_aktif' => $totalPengumumanAktif,
                ],
                'per_plan' => $perPlan,
                'per_status' => $perStatus,
                'per_provider' => $perProvider,
            ],
        ]);
    }

    // Ringkasan kesehatan sistem
    public function healthCheck(): JsonResponse
    {
        $config = KonfigurasiSistem::first();

        return response()->json([
            'success' => true,
            'data' => [
                'app_name' => $config?->app_name ?? 'Litensi Kids',
                'app_version' => $config?->app_version,
                'maintenance_mode' => $config?->maintenance_mode ?? false,
                'server_status' => $config?->server_status ?? 'optimal',
                'fcm_push_status' => $config?->fcm_push_status ?? 'connected',
                'database_status' => $config?->database_status ?? 'healthy',
                'registration_open' => $config?->registration_open ?? true,
                'timestamp' => now()->toISOString(),
            ],
        ]);
    }
}
