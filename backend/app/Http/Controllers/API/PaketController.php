<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PaketLangganan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaketController extends Controller
{
    // Daftar semua paket langganan
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status', 'active');

        $paket = PaketLangganan::when($status !== 'all', function ($q) use ($status) {
            $q->where('status', $status);
        })
            ->orderBy('monthly_price')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $paket,
        ]);
    }

    // Detail paket — terima string/int, cek is_numeric (defensif jika route regex numeric terlewat)
    public function show($id): JsonResponse
    {
        // Defensif: jika ID bukan numeric (contoh: string "mine" yang salah masuk ke route ini) → 404
        if (!is_numeric($id) || (int)$id <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'ID paket tidak valid (harus numeric)',
            ], 404);
        }
        $paket = PaketLangganan::findOrFail((int)$id);

        return response()->json([
            'success' => true,
            'data' => $paket,
        ]);
    }

    // Tambah paket baru (master admin)
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:paket_langganan,name',
            'tagline' => 'required|string|max:255',
            'description' => 'required|string',
            'monthly_price' => 'required|integer|min:0',
            'annual_price' => 'required|integer|min:0',
            'status' => 'in:active,archived',
        ]);

        $paket = PaketLangganan::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Paket langganan berhasil ditambahkan',
            'data' => $paket,
        ], 201);
    }

    // Update paket
    public function update(Request $request, int $id): JsonResponse
    {
        $paket = PaketLangganan::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'monthly_price' => 'sometimes|required|integer|min:0',
            'annual_price' => 'sometimes|required|integer|min:0',
            'status' => 'sometimes|in:active,archived',
        ]);

        $paket->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Paket langganan berhasil diperbarui',
            'data' => $paket,
        ]);
    }

    // Endpoint status paket user SAAT INI (per user_id)
    // Dipakai frontend LanggananSayaTab untuk menampilkan paket aktif + expired
    public function mine(Request $request): JsonResponse
    {
        // ZERO TOLERANCE PRIVASI: TIDAK BOLEH ada default user_id = apapun
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => false,
                'message' => 'user_id tidak valid atau belum login',
            ], 401);
        }
        $userId = (int) $userId;

        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan',
            ], 404);
        }

        // Cari detail paket dari tabel paket_langganan berdasarkan active_plan
        // ROOT CAUSE FIX: DB paket_langganan.name = TITLE CASE (misal 'Family Pro')
        // TAPI users.active_plan SEEDER LAMA = SNAKE CASE (misal 'family_pro')
        // WHERE name = $planName (exact match) → TIDAK PERNAH KETEMU → fallback Free terus!
        // SOLUSI: Ambil SEMUA paket active, lalu NORMALISASI dua sisi (paket.name & user.active_plan)
        // ke snake_case underscore, baru bandingkan.
        $userPlanRaw = !empty($user->active_plan) ? $user->active_plan : 'free';
        $userPlanNorm = strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '_', (string) $userPlanRaw), '_'));
        $paket = null;
        $allActivePaket = PaketLangganan::where('status', 'active')->orderBy('monthly_price')->get();
        $fallbackPaket = $allActivePaket->first();
        foreach ($allActivePaket as $row) {
            $paketNameNorm = strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '_', (string) $row->name), '_'));
            if ($paketNameNorm === $userPlanNorm) {
                $paket = $row;
                break;
            }
        }
        // Fallback JUJUR jika paket name tidak ada di DB (misal data korup): pilih termurah / free
        if (!$paket) {
            $paket = $fallbackPaket;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'active_plan' => $userPlanRaw,
                'active_plan_normalized' => $userPlanNorm,
                'active_plan_label' => !empty($user->active_plan_label) ? $user->active_plan_label : ($paket->badge ?? $paket->name ?? 'Paket Gratis'),
                'expires_at' => $this->formatExpiresAtSafe($user->expires_at),
                'status' => $user->status ?? 'trial',
                'children_count' => (int) ($user->children_count ?? 0),
                'devices_count' => (int) ($user->devices_count ?? 0),
                'paket' => $paket,
            ],
        ]);
    }

    // FORMAT SAFE expires_at ke ISO 8601: Bisa terima Carbon object, string date, atau null
    // Pencegah ERROR Call to a member function toISOString() on string / null (HTTP 500)
    // Ketika User model $casts 'expires_at' tidak di-set ke 'datetime' (default string date Y-m-d dari seeder)
    private function formatExpiresAtSafe(mixed $value): ?string
    {
        if ($value === null || (is_string($value) && trim($value) === '')) {
            return null;
        }
        try {
            // Jika objek Carbon / DateTime, panggil methodnya
            if (is_object($value) && method_exists($value, 'toISOString')) {
                return (string) $value->toISOString();
            }
            if ($value instanceof \DateTimeInterface) {
                return (string) $value->format('c');
            }
            // Jika string (Y-m-d / Y-m-d H:i:s), parse via Carbon
            if (is_string($value) || is_numeric($value)) {
                $parsed = \Illuminate\Support\Carbon::parse((string) $value);
                return $parsed->toISOString();
            }
        } catch (\Throwable $e) {
            // Gagal parse, return null secara JUJUR (tidak bocor error)
        }
        return null;
    }

    // Helper normalisasi nama paket ke snake_case supaya KONSISTEN antara users.active_plan vs paket_langganan.name (title case)
    private function normalizePlanId(string $raw): string
    {
        return strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '_', (string) $raw), '_'));
    }

    // Upgrade paket untuk user
    public function upgrade(Request $request): JsonResponse
    {
        // ZERO TOLERANCE PRIVASI: TIDAK BOLEH ada default user_id
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => false,
                'message' => 'user_id tidak valid (wajib dikirim)',
            ], 422);
        }

        $request->validate([
            'paket_id' => 'required|exists:paket_langganan,id',
            'periode' => 'required|in:bulanan,tahunan',
        ]);

        $user = User::findOrFail((int) $userId);
        $paket = PaketLangganan::findOrFail($request->paket_id);

        $expiresAt = $request->periode === 'tahunan'
            ? now()->addYear()
            : now()->addMonth();

        // KONSISTEN: Selalu simpan active_plan = snake_case (bukan title case)
        // Supaya next query mine() match normalized user.active_plan vs paket.name (title case)
        $user->update([
            'active_plan' => $this->normalizePlanId((string) $paket->name),
            'active_plan_label' => $paket->badge ?? $paket->name,
            'expires_at' => $expiresAt,
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Paket berhasil di-upgrade',
            'data' => [
                'user' => $user->makeHidden(['password', 'remember_token']),
                'paket' => $paket,
            ],
        ]);
    }

    // Hapus paket
    public function destroy(int $id): JsonResponse
    {
        $paket = PaketLangganan::findOrFail($id);
        $paket->delete();

        return response()->json([
            'success' => true,
            'message' => 'Paket langganan berhasil dihapus',
        ]);
    }
}
