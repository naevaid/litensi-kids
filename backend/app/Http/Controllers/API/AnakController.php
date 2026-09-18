<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ProfilAnak;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AnakController extends Controller
{
    // Daftar semua profil anak berdasarkan user
    public function index(Request $request): JsonResponse
    {
        // ZERO TOLERANCE PRIVASI: TIDAK BOLEH ADA default user_id = 1 (bocor data user lain!)
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }
        $userId = (int) $userId;

        $anak = ProfilAnak::where('user_id', $userId)
            ->with('user')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $anak,
        ]);
    }

    // Detail satu profil anak
    public function show(int $id): JsonResponse
    {
        $anak = ProfilAnak::with('user')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $anak,
        ]);
    }

    // Generate pairing code / PIN (Step 1 sebelum form data anak)
    // Digunakan saat modal Tambah Perangkat Anak dibuka: QR Code + kode manual ditampilkan DULU
    public function generatePairing(Request $request): JsonResponse
    {
        $prefix = 'LTN';
        $segmen = strtoupper(Str::random(3));
        $angka = random_int(1000, 9999);
        $code = "{$prefix}-{$segmen}-{$angka}-SEC";
        $pin = (string) random_int(100000, 999999);

        // Simpan ke cache (TTL 10 menit) untuk tracking status pairing
        $cacheKey = "pairing:{$code}";
        Cache::put($cacheKey, [
            'code' => $code,
            'pin' => $pin,
            'user_id' => $request->input('user_id'),
            'paired' => false,
            'device_info' => null,
            'created_at' => now()->toISOString(),
        ], 600);

        // Token QR Code = code + pin (dipindai oleh companion app)
        $qrPayload = json_encode([
            't' => 'litensi-pair',
            'v' => 1,
            'c' => $code,
            'p' => $pin,
            'u' => (int) $request->input('user_id', 0),
            'ts' => time(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kode pairing berhasil dibuat',
            'data' => [
                'code' => $code,
                'pin' => $pin,
                'qr_payload' => $qrPayload,
                'expires_at' => now()->addMinutes(10)->toISOString(),
                'paired' => false,
            ],
        ]);
    }

    // Cek realtime status pairing (dipoll frontend setiap beberapa detik)
    // Untuk simulasi MVP: jika query param ?simulate_paired=1 dikirim dari testing,
    //   mark as paired di cache & return device info (seolah-olah companion app sudah confirm)
    // (BUG FIX #2) Jika cache TIDAK ADA / EXPIRED (TTL 10 menit lewat), fallback query DB ProfilAnak
    //   by qr_pairing_code, agar Android RE-PAIRING (setelah data anak tersimpan) TIDAK error 404.
    public function pairingStatus(Request $request): JsonResponse
    {
        $code = $request->input('code');
        if (!$code) {
            return response()->json([
                'success' => false,
                'message' => 'Kode pairing wajib disertakan',
            ], 422);
        }

        $cacheKey = "pairing:{$code}";
        $pairing = Cache::get($cacheKey);

        // (BUG FIX #2) CACHE EXPIRED / TIDAK ADA → FALLBACK ke DB ProfilAnak by qr_pairing_code.
        // Ini mengatasi flow: user generate kode → save data anak ke DB → cache expire (10 menit lewat)
        //   → baru buka Android app pairing → TIDAK ERROR 404 lagi.
        if (!$pairing) {
            $anakFromDb = ProfilAnak::with('user')
                ->where('qr_pairing_code', $code)
                ->first();

            // Jika ada di DB (artinya sudah pernah disimpan) → construct status dari DB, bukan cache.
            if ($anakFromDb) {
                $dbDeviceInfo = [
                    'nama_perangkat' => $anakFromDb->device_name ?? 'Perangkat Android',
                    'model' => $anakFromDb->device_model,
                    'os' => $anakFromDb->os_version,
                    'versi_app' => 'Litensi Kids Companion',
                    'battery' => (int) ($anakFromDb->battery_level ?? 0),
                ];
                $paired = !empty($anakFromDb->paired_at);

                // Isi ulang cache (segar) 10 menit agar polling frontend tidak fallback terus.
                Cache::put($cacheKey, [
                    'code' => $code,
                    'pin' => $anakFromDb->pairing_pin,
                    'user_id' => (int) $anakFromDb->user_id,
                    'paired' => $paired,
                    'device_info' => $dbDeviceInfo,
                    'paired_at' => $anakFromDb->paired_at?->toISOString(),
                    'created_at' => now()->toISOString(),
                ], 600);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'code' => $code,
                        'paired' => $paired,
                        'device_info' => $dbDeviceInfo,
                        'paired_at' => $anakFromDb->paired_at?->toISOString(),
                        'expired' => false,
                    ],
                ]);
            }

            // BENAR-BENAR TIDAK ADA (cache hilang + row ProfilAnak tidak ada qr_pairing_code = code)
            // → return 404 sesuai kontrak lama.
            return response()->json([
                'success' => false,
                'message' => 'Kode pairing tidak ditemukan atau sudah kedaluwarsa. Silakan generate kode baru.',
                'data' => ['code' => $code, 'paired' => false, 'expired' => true],
            ], 404);
        }

        // Simulasi dari frontend: user klik tombol "Simulasikan Perangkat Terhubung"
        // untuk testing UX flow tanpa companion app
        if (!$pairing['paired'] && $request->boolean('simulate_paired')) {
            $pairing['paired'] = true;
            $pairing['device_info'] = [
                'nama_perangkat' => 'Xiaomi Redmi 13C',
                'model' => 'Xiaomi 23124RN87G',
                'os' => 'Android 14',
                'versi_app' => 'Litensi Kids Companion v2.4.1',
                'battery' => 92,
                'mac_address' => substr(md5($code), 0, 12),
            ];
            $pairing['paired_at'] = now()->toISOString();
            Cache::put($cacheKey, $pairing, 600);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $code,
                'paired' => (bool) $pairing['paired'],
                'device_info' => $pairing['device_info'],
                'paired_at' => $pairing['paired_at'] ?? null,
                'expired' => false,
            ],
        ]);
    }

    // Konfirmasi pairing dari perangkat anak (Android Companion App) setelah scan QR
    // Step 2 flow pairing: Android kirim code + pin + device info, backend mark cache paired=true & update ProfilAnak
    public function confirmPairing(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'pin' => 'required|string|max:10',
            'device_id' => 'nullable|string|max:100',
            'nama_perangkat' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'os_version' => 'nullable|string|max:50',
            'app_version' => 'nullable|string|max:50',
            'battery' => 'nullable|integer|min:0|max:100',
            'fcm_token' => 'nullable|string|max:255',
        ]);

        $code = $validated['code'];
        $cacheKey = "pairing:{$code}";
        $pairing = Cache::get($cacheKey);

        if (!$pairing) {
            return response()->json([
                'success' => false,
                'message' => 'Kode pairing tidak ditemukan atau sudah kedaluwarsa',
                'data' => ['code' => $code, 'expired' => true],
            ], 404);
        }

        if ($pairing['pin'] !== $validated['pin']) {
            return response()->json([
                'success' => false,
                'message' => 'PIN pairing tidak sesuai',
                'data' => ['code' => $code],
            ], 422);
        }

        if ($pairing['paired']) {
            return response()->json([
                'success' => false,
                'message' => 'Kode pairing ini sudah digunakan oleh perangkat lain',
                'data' => ['code' => $code, 'device_info' => $pairing['device_info']],
            ], 409);
        }

        $deviceInfo = [
            'nama_perangkat' => $validated['nama_perangkat'] ?? ($validated['model'] ?? 'Perangkat Android'),
            'model' => $validated['model'] ?? null,
            'os' => $validated['os_version'] ?? 'Android',
            'versi_app' => $validated['app_version'] ?? 'Litensi Kids Companion v1.0',
            'battery' => $validated['battery'] ?? 0,
            'mac_address' => $validated['device_id'] ? substr(md5($validated['device_id']), 0, 12) : substr(md5($code), 0, 12),
            'fcm_token' => $validated['fcm_token'] ?? null,
        ];

        $pairing['paired'] = true;
        $pairing['device_info'] = $deviceInfo;
        $pairing['paired_at'] = now()->toISOString();
        Cache::put($cacheKey, $pairing, 600);

        $userId = $pairing['user_id'] ?? null;
        $profilAnak = null;

        if ($userId) {
            // (BUG FIX #1 - Scenario A) Cari row ProfilAnak existing by qr_pairing_code = code.
            // Idealnya ini selalu ketemu, tapi jika user generate code LAMA & save baru code BARU mismatch,
            //   fallback ke Scenario B / Scenario C di bawah.
            $profilAnak = ProfilAnak::where('user_id', $userId)
                ->where('qr_pairing_code', $code)
                ->first();

            if (!$profilAnak) {
                // (BUG FIX #1 - Scenario B) by qr_pairing_code tidak ketemu,
                //   fallback cari ProfilAnak TERBARU user_id ini yang BELUM punya qr_pairing_code
                //   (baru dibuat / save tapi tanpa qr_pairing_code inject).
                $profilAnak = ProfilAnak::where('user_id', $userId)
                    ->whereNull('qr_pairing_code')
                    ->orderByDesc('id')
                    ->first();

                if (!$profilAnak) {
                    // (BUG FIX #1 - Scenario C) TIDAK ADA row ProfilAnak sama sekali di DB user ini.
                    //   → Auto-create minimal row dengan nama default "Anak #userId" agar pairing TETAP BERHASIL
                    //     tanpa harus user save data anak dahulu di web.
                    //     Nanti user tetap bisa edit nama / age / gender di dashboard setelah pairing.
                    $defaultName = "Anak #{$userId}";
                    $profilAnak = ProfilAnak::create([
                        'user_id' => $userId,
                        'name' => $defaultName,
                        'age' => 10,
                        'gender' => 'laki-laki',
                        'device_name' => $deviceInfo['nama_perangkat'],
                        'device_model' => $deviceInfo['model'],
                        'os_version' => $deviceInfo['os'],
                        'status' => 'active',
                        'qr_pairing_code' => $code,
                        'pairing_pin' => $validated['pin'],
                        'battery_level' => $deviceInfo['battery'],
                        'is_online' => true,
                        'paired_at' => now(),
                        'last_active' => now(),
                        'used_today' => 0,
                        'notes' => 'Auto-created saat Android pairing pertama kali. Silakan edit data di dashboard.',
                    ]);
                }

                // Scenario B: Row ditemukan tanpa qr_pairing_code → inject code & pin ke row tersebut.
                $profilAnak->update([
                    'qr_pairing_code' => $code,
                    'pairing_pin' => $validated['pin'],
                ]);
            }

            // (Scenario A/B/C SEMUA MASUK SINI: row SUDAH ada) → Update kolom device info + timestamp.
            $profilAnak->update([
                'pairing_pin' => $validated['pin'],
                'device_name' => $deviceInfo['nama_perangkat'],
                'device_model' => $deviceInfo['model'],
                'os_version' => $deviceInfo['os'],
                'battery_level' => $deviceInfo['battery'],
                'fcm_token' => $deviceInfo['fcm_token'] ?? null,
                'is_online' => true,
                'paired_at' => now(),
                'last_active' => now(),
            ]);
            $profilAnak = $profilAnak->fresh()->load('user');
        }

        return response()->json([
            'success' => true,
            'message' => 'Pairing perangkat berhasil',
            'data' => [
                'code' => $code,
                'paired' => true,
                'paired_at' => $pairing['paired_at'],
                'device_info' => $deviceInfo,
                'user_id' => $userId,
                'profil_anak' => $profilAnak,
                'expires_at' => now()->addMinutes(10)->toISOString(),
            ],
        ]);
    }

    // Tambah profil anak baru
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'name' => 'required|string|max:255',
            'age' => 'required|integer',
            'gender' => 'required|in:laki-laki,perempuan',
            'device_name' => 'required|string|max:255',
            'status' => 'in:active,restricted,locked',
            'qr_pairing_code' => 'nullable|string|max:50',
            'pairing_pin' => 'nullable|string|max:10',
        ]);

        $anak = ProfilAnak::create($request->all());

        // Update jumlah anak di user
        $user = $anak->user;
        $user->update([
            'children_count' => ProfilAnak::where('user_id', $user->id)->count(),
            'devices_count' => ProfilAnak::where('user_id', $user->id)->count(),
        ]);

        // Setelah save sukses, bersihkan cache pairing
        if ($request->filled('qr_pairing_code')) {
            Cache::forget("pairing:{$request->input('qr_pairing_code')}");
        }

        return response()->json([
            'success' => true,
            'message' => 'Profil anak berhasil ditambahkan',
            'data' => $anak->load('user'),
        ], 201);
    }

    // Update profil anak
    public function update(Request $request, int $id): JsonResponse
    {
        $anak = ProfilAnak::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'age' => 'sometimes|required|integer',
            'gender' => 'sometimes|required|in:laki-laki,perempuan',
            'device_name' => 'sometimes|required|string|max:255',
            'status' => 'sometimes|in:active,restricted,locked',
        ]);

        $anak->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Profil anak berhasil diperbarui',
            'data' => $anak->load('user'),
        ]);
    }

    // AN8 — Upload telemetry berkala dari Companion App Android
    // (battery_level, is_online, last_active, used_today)
    // Endpoint dipanggil setiap X menit via WorkManager periodic Android
    public function uploadTelemetry(Request $request, int $id): JsonResponse
    {
        $anak = ProfilAnak::findOrFail($id);

        $validated = $request->validate([
            // Validasi kepemilikan perangkat: Android kirim salah satu dari 2 field ini
            // agar tidak sembarang perangkat POST telemetry ke id anak lain.
            'qr_pairing_code' => 'sometimes|string|max:50',
            'pairing_pin' => 'sometimes|string|max:10',
            // Field telemetry actual (semua opsional "sometimes": hanya yang dikirim yang diupdate)
            'battery_level' => 'sometimes|integer|min:0|max:100',
            'is_online' => 'sometimes|boolean',
            'last_active' => 'sometimes|date',
            'used_today' => 'sometimes|integer|min:0',
        ]);

        // Gate kepemilikan: jika qr_pairing_code atau pairing_pin dikirim, WAJIB cocok dengan row.
        if (!empty($validated['qr_pairing_code']) && $validated['qr_pairing_code'] !== $anak->qr_pairing_code) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi kepemilikan gagal: qr_pairing_code tidak cocok dengan perangkat ini.',
            ], 403);
        }
        if (!empty($validated['pairing_pin']) && $validated['pairing_pin'] !== $anak->pairing_pin) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi kepemilikan gagal: pairing_pin tidak cocok dengan perangkat ini.',
            ], 403);
        }

        // HANYA update field telemetry yang dikirim (JANGAN overwrite field lain!)
        $updatePayload = [];
        if (isset($validated['battery_level'])) $updatePayload['battery_level'] = $validated['battery_level'];
        if (isset($validated['is_online'])) $updatePayload['is_online'] = $validated['is_online'];
        $updatePayload['last_active'] = $validated['last_active'] ?? now(); // default = sekarang (upload time)
        if (isset($validated['used_today'])) $updatePayload['used_today'] = $validated['used_today'];

        $anak->update($updatePayload);

        return response()->json([
            'success' => true,
            'message' => 'Telemetry perangkat berhasil disimpan',
            'data' => [
                'id' => $anak->id,
                'battery_level' => (int) $anak->battery_level,
                'is_online' => (bool) $anak->is_online,
                'last_active' => $anak->last_active?->toISOString(),
                'used_today_minutes' => (int) $anak->used_today,
                'updated_at' => now()->toISOString(),
            ],
        ]);
    }

    // Hapus profil anak
    public function destroy(int $id): JsonResponse
    {
        $anak = ProfilAnak::findOrFail($id);
        $userId = $anak->user_id;
        $anak->delete();

        // Update jumlah anak di user
        $user = \App\Models\User::find($userId);
        if ($user) {
            $user->update([
                'children_count' => ProfilAnak::where('user_id', $userId)->count(),
                'devices_count' => ProfilAnak::where('user_id', $userId)->count(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profil anak berhasil dihapus',
        ]);
    }
}
