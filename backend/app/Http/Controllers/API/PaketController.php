<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PaketLangganan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaketController extends Controller
{
    // Mapping normalisasi nama paket (users.active_plan → paket_langganan.name)
    // agar pencocokan case-insensitive dan tanda baca diabaikan (konsisten pattern mine())
    private function normalizePlanSlug(string $raw): string
    {
        return strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '_', (string) $raw), '_'));
    }

    // Daftar KOLOM YANG BENAR-BENAR EKSIS di real DB tabel paket_langganan
    // (DIVERIFIKASI via SHOW COLUMNS lokal — ZERO ASSUMPTION, tidak andal migration file)
    // Ini digunakan sebagai DEFENSIF FILTER: buang field $valid yang tidak ada di DB
    // agar tidak terjadi SQLSTATE[42S22] Unknown column error
    // Updated R8: Tambah max_children_devices_label (sudah di-migrate 2026_09_18_000011)
    private const PAKET_COLS_EXISTS = [
        'id', 'name', 'badge', 'popular', 'tagline', 'description',
        'monthly_price', 'annual_price', 'max_children_devices',
        'max_children_devices_label',
        'location_tracking', 'location_tracking_label',
        'app_restriction', 'app_restriction_label',
        'batas_menit_av_harian',
        'one_way_audio', 'one_way_audio_label',
        'live_camera', 'live_camera_label',
        'max_geofences', 'max_geofences_label',
        'read_message_notifications', 'read_message_notifications_label',
        'remote_screen_lock', 'remote_screen_lock_label',
        'highlight_features', 'active_users_count', 'status',
        'created_at', 'updated_at'
    ];

    // Filter array validasi HANYA field yang benar-benar ada di tabel DB
    private function filterHanyaKolomEksis(array $valid): array
    {
        return array_filter(
            $valid,
            fn($key) => in_array($key, self::PAKET_COLS_EXISTS, true),
            ARRAY_FILTER_USE_KEY
        );
    }

    // Hitung jumlah active_users_count asli SEMUA paket per hari ini (dari tabel users)
    // TIDAK PAKAI kolom DB active_users_count (default 0 / stale) — selalu query COUNT asli
    private function hitungActiveUsersAllPakets(): array
    {
        try {
            $rows = User::selectRaw('active_plan, COUNT(*) AS total')
                ->whereNotNull('active_plan')
                ->where('active_plan', '!=', '')
                ->groupBy('active_plan')
                ->get();
            $map = [];
            foreach ($rows as $row) {
                $norm = $this->normalizePlanSlug((string)$row->active_plan);
                if (!isset($map[$norm])) $map[$norm] = 0;
                $map[$norm] += (int)$row->total;
            }
            return $map;
        } catch (\Throwable $e) {
            return [];
        }
    }

    // Daftar semua paket langganan
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status', 'active');

        $paket = PaketLangganan::when($status !== 'all', function ($q) use ($status) {
            $q->where('status', $status);
        })
            ->orderBy('monthly_price')
            ->get();

        // Inject active_users_count ASLI (query tabel users, TIDAK ANDAL kolom DB default 0 / stale)
        $countMap = $this->hitungActiveUsersAllPakets();
        foreach ($paket as $row) {
            $norm = $this->normalizePlanSlug((string)$row->name);
            $row->active_users_count = (int)($countMap[$norm] ?? 0);
            // Set appended agar terserializable
            $row->makeVisible(['active_users_count']);
        }

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
        $valid = $request->validate([
            'name' => 'required|string|max:255|unique:paket_langganan,name',
            'tagline' => 'required|string|max:255',
            'description' => 'required|string',
            'monthly_price' => 'required|integer|min:0',
            'annual_price' => 'required|integer|min:0',
            'badge' => 'nullable|string|max:50',
            'popular' => 'nullable|boolean',
            'status' => 'nullable|in:active,archived',
            // Kolom batas kuota AV 1 kolam (PRIORITAS 1 R6) — bisa di-set admin master
            'batas_menit_av_harian' => 'nullable|integer|min:0|max:14400',
            // Batasan fitur (sesuai fillable tabel paket_langganan R6)
            'max_children_devices' => 'nullable|integer|min:0',
            'max_children_devices_label' => 'nullable|string|max:50',
            'location_tracking' => 'nullable|string|max:50', // enum: dasar / realtime_7d / realtime_30d_sos
            'location_tracking_label' => 'nullable|string|max:50',
            'app_restriction' => 'nullable|string|max:50', // enum: terbatas_3 / unlimited_jadwal / unlimited_ai
            'app_restriction_label' => 'nullable|string|max:50',
            'one_way_audio' => 'nullable|boolean',
            'one_way_audio_label' => 'nullable|string|max:50',
            'live_camera' => 'nullable|boolean',
            'live_camera_label' => 'nullable|string|max:50',
            'max_geofences' => 'nullable|string|max:30', // bisa '5' atau 'unlimited'
            'max_geofences_label' => 'nullable|string|max:50',
            'read_message_notifications' => 'nullable|boolean',
            'read_message_notifications_label' => 'nullable|string|max:50',
            'remote_screen_lock' => 'nullable|boolean',
            'remote_screen_lock_label' => 'nullable|string|max:50',
            'highlight_features' => 'nullable|array',
            'active_users_count' => 'nullable|integer|min:0',
        ]);

        // Default batas_menit_av_harian JUJUR = 0 (TIDAK ADA HARDCODE default Premium 60!)
        if (!isset($valid['batas_menit_av_harian'])) {
            $valid['batas_menit_av_harian'] = 0;
        }
        if (empty($valid['status'])) {
            $valid['status'] = 'active';
        }
        // Cast highlight_features ke JSON jika array dikirim (Eloquent casts auto, tapi aman explicit)
        if (isset($valid['highlight_features']) && is_array($valid['highlight_features'])) {
            $valid['highlight_features'] = json_encode($valid['highlight_features']);
        }

        // ⚠️ DEFENSIF FILTER: buang field yang TIDAK ADA di real DB (SHOW COLUMNS diverifikasi)
        // Mencegah SQLSTATE[42S22] Unknown column (misal max_children_devices_label di fillable
        // tapi tidak ada di DB actual sampai migration R8 dijalankan)
        $validClean = $this->filterHanyaKolomEksis($valid);

        try {
            $paket = PaketLangganan::create($validClean);
            // Inject active_users asli agar response sama dengan index()
            $countMap = $this->hitungActiveUsersAllPakets();
            $norm = $this->normalizePlanSlug((string)$paket->name);
            $paket->active_users_count = (int)($countMap[$norm] ?? 0);
            $paket->makeVisible(['active_users_count']);

            return response()->json([
                'success' => true,
                'message' => 'Paket langganan berhasil ditambahkan',
                'data' => $paket,
            ], 201);
        } catch (\Throwable $e) {
            $msg = app()->environment('local') ? $e->getMessage() : 'Data tidak valid atau duplikat.';
            return response()->json(['success' => false, 'message' => $msg], 422);
        }
    }

    // Update paket
    public function update(Request $request, int $id): JsonResponse
    {
        $paket = PaketLangganan::findOrFail($id);

        $valid = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'tagline' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'monthly_price' => 'sometimes|required|integer|min:0',
            'annual_price' => 'sometimes|required|integer|min:0',
            'badge' => 'sometimes|nullable|string|max:50',
            'popular' => 'sometimes|nullable|boolean',
            'status' => 'sometimes|in:active,archived',
            // Batas menit AV 1 kolam
            'batas_menit_av_harian' => 'sometimes|nullable|integer|min:0|max:14400',
            // Batasan fitur (sesuai fillable tabel paket_langganan R6)
            'max_children_devices' => 'sometimes|nullable|integer|min:0',
            'max_children_devices_label' => 'sometimes|nullable|string|max:50',
            'location_tracking' => 'sometimes|nullable|string|max:50',
            'location_tracking_label' => 'sometimes|nullable|string|max:50',
            'app_restriction' => 'sometimes|nullable|string|max:50', // enum string, BUKAN boolean
            'app_restriction_label' => 'sometimes|nullable|string|max:50',
            'one_way_audio' => 'sometimes|nullable|boolean',
            'one_way_audio_label' => 'sometimes|nullable|string|max:50',
            'live_camera' => 'sometimes|nullable|boolean',
            'live_camera_label' => 'sometimes|nullable|string|max:50',
            'max_geofences' => 'sometimes|nullable|string|max:30', // bisa angka atau 'unlimited'
            'max_geofences_label' => 'sometimes|nullable|string|max:50',
            'read_message_notifications' => 'sometimes|nullable|boolean',
            'read_message_notifications_label' => 'sometimes|nullable|string|max:50',
            'remote_screen_lock' => 'sometimes|nullable|boolean',
            'remote_screen_lock_label' => 'sometimes|nullable|string|max:50',
            'highlight_features' => 'sometimes|nullable|array',
            'active_users_count' => 'sometimes|nullable|integer|min:0',
        ]);

        // Cast batas_menit_av_harian ke integer (null → 0 JUJUR)
        if (array_key_exists('batas_menit_av_harian', $valid)) {
            $valid['batas_menit_av_harian'] = (int)$valid['batas_menit_av_harian'];
        }
        // Cast highlight_features ke JSON jika array dikirim (Eloquent casts auto, tapi aman explicit)
        if (isset($valid['highlight_features']) && is_array($valid['highlight_features'])) {
            $valid['highlight_features'] = json_encode($valid['highlight_features']);
        }

        // ⚠️ DEFENSIF FILTER: buang field yang TIDAK ADA di real DB (SHOW COLUMNS diverifikasi)
        $validClean = $this->filterHanyaKolomEksis($valid);

        try {
            $paket->update($validClean);
            $paket->refresh();
            // Inject active_users_count asli agar response fresh
            $countMap = $this->hitungActiveUsersAllPakets();
            $norm = $this->normalizePlanSlug((string)$paket->name);
            $paket->active_users_count = (int)($countMap[$norm] ?? 0);
            $paket->makeVisible(['active_users_count']);

            return response()->json([
                'success' => true,
                'message' => 'Paket langganan berhasil diperbarui',
                'data' => $paket,
                'saved_fields' => array_keys($validClean),
                'filtered_fields' => array_values(array_diff(array_keys($valid), array_keys($validClean))),
            ]);
        } catch (\Throwable $e) {
            $msg = app()->environment('local') ? $e->getMessage() : 'Data tidak valid atau duplikat.';
            return response()->json(['success' => false, 'message' => $msg], 422);
        }
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
