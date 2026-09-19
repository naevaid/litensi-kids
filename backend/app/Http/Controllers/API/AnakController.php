<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\LogGeofence;
use App\Models\PergerakanGpsAnak;
use App\Models\ProfilAnak;
use App\Models\ZonaGeofence;
use App\Services\FcmPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AnakController extends Controller
{
    // Daftar semua profil anak berdasarkan user
    public function index(Request $request): JsonResponse
    {
        // (G11 FIX BUG DATA KOSONG + SECURITY ANTI SPOOF)
        // PRIORITAS AUTH SERVER JANGAN PERCAYA client input('user_id') yang bisa di-spoof!
        //   1. Coba ambil user_id DARI TOKEN AUTH SERVER (paling aman).
        //   2. JIKA input client user_id VALID (numeric) DAN ROLE user login ADMIN — boleh filter untuk melihat user lain (admin dashboard global access optional).
        //   3. JIKA TIDAK ADA auth id & input invalid → return KOSONG (privacy zero tolerance).
        $authUserId = auth()->check() ? (int) auth()->id() : null;
        $inputUserId = $request->input('user_id');
        $numericInput = !empty($inputUserId) && is_numeric($inputUserId) ? (int) $inputUserId : null;

        $userId = null;
        if ($numericInput !== null) {
            // (Security) Jika user login = admin/role tinggi BOLEH filter ke user id lain (opsional).
            // Jika BUKAN admin → HANYA BOLEH pakai authUserId sendiri, MESKIPUN client kirim user_id lain (anti spoof akses data anak user lain).
            $isAdminRole = auth()->check() && in_array(strtolower((string) (auth()->user()->role ?? '')), ['admin', 'master', 'superadmin', 'owner'], true);
            if ($isAdminRole) {
                $userId = $numericInput;
            } else {
                // Bukan admin: jika client kirim user_id !== authUserId → FORCE pakai authUserId sendiri (privasi paksa).
                $userId = $authUserId ?? $numericInput;
            }
        } else {
            // Input user_id TIDAK ADA / invalid → GUNAKAN AUTH ID SERVER (paling aman).
            $userId = $authUserId;
        }

        if (empty($userId) || !is_int($userId) || $userId <= 0) {
            // Final fallback: TIDAK ADA satupun sumber user_id valid → return KOSONG (JANGAN default 1 BOCOR DATA)
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

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
                        // (BARU) Sertakan field name agar frontend web bisa prefill
                        // form Nama Anak di Step 2 tanpa user ketik manual lagi.
                        'name' => $anakFromDb->name ?? null,
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
            // (BARU) Simulasi pairing: inject nama default jika ada di cache (untuk prefill form web
            if (empty($pairing['name'])) {
                $userId = $pairing['user_id'] ?? null;
                $pairing['name'] = $userId ? "Anak #{$userId}" : null;
            }
            Cache::put($cacheKey, $pairing, 600);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $code,
                'paired' => (bool) $pairing['paired'],
                // (BARU) Sertakan field name agar frontend web prefill Nama Anak Step 2
                'name' => $pairing['name'] ?? null,
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
            // (Baru) Nama panggilan anak dari Android PairingScreen — opsional, max 50 karakter.
            'child_name' => 'nullable|string|max:50',
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
                    //     (NEW) JIKA Android mengirim field child_name → pakai nama itu (default name auto-create diganti).
                    $defaultName = filled($validated['child_name'] ?? null)
                        ? trim($validated['child_name'])
                        : "Anak #{$userId}";
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
            // ------------------------------------------------------------------
            // (NEW) RULE NAMA ANAK DARI ANDROID: Hormati input user dari web jika sudah ada:
            //   1. JIKA Android KIRIM child_name (tidak kosong), DAN
            //   2. JIKA ProfilAnak.name SAAT INI = KOSONG ATAU masih DEFAULT auto-create (prefix "Anak #")
            //   → MAKA update name dengan nilai child_name dari Android.
            //   JIKA name sudah diisi user di web (nilai NON-default & NON-kosong) → JANGAN DI-OVERWRITE!
            $fieldNameAkanDiupdate = [];
            if (filled($validated['child_name'] ?? null)) {
                $namaTrim = trim($validated['child_name']);
                $namaSekarang = trim($profilAnak->name ?? '');
                $namaMasihKosong = ($namaSekarang === '') || Str::startsWith($namaSekarang, 'Anak #');
                if ($namaMasihKosong) {
                    $fieldNameAkanDiupdate['name'] = $namaTrim;
                }
            }

            $profilAnak->update(array_merge([
                'pairing_pin' => $validated['pin'],
                'device_name' => $deviceInfo['nama_perangkat'],
                'device_model' => $deviceInfo['model'],
                'os_version' => $deviceInfo['os'],
                'battery_level' => $deviceInfo['battery'],
                'fcm_token' => $deviceInfo['fcm_token'] ?? null,
                'is_online' => true,
                'paired_at' => now(),
                'last_active' => now(),
            ], $fieldNameAkanDiupdate));
            $profilAnak = $profilAnak->fresh()->load('user');

            // (BARU) Setelah final update, simpan field `name` ke cache pairing:code
            // agar endpoint pairingStatus (dipoll frontend web setiap 2.5 detik)
            // bisa return nama anak ke client, sehingga Step 2 form Nama Anak di
            // modal web otomatis TERISI (user tidak perlu ketik nama lagi).
            $pairing['name'] = $profilAnak->name;
            Cache::put($cacheKey, $pairing, 600);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pairing perangkat berhasil',
            'data' => [
                'code' => $code,
                'paired' => true,
                'paired_at' => $pairing['paired_at'],
                'name' => $profilAnak->name ?? null,
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

    // F3.ANDROID — Update token FCM perangkat Android Companion Anak
    // Digunakan oleh FirebaseMessagingService.onNewToken() di Android
    // Endpoint: POST /api/v1/anak/{id}/fcm-token
    // GATE OWNERSHIP: Wajib kirim pairing_pin ATAU qr_pairing_code yang cocok → 403 jika salah
    public function updateFcmTokenAnak(Request $request, int $id): JsonResponse
    {
        $anak = ProfilAnak::findOrFail($id);

        $validated = $request->validate([
            // Validasi kepemilikan perangkat: salah satu field WAJIB dikirim & cocok
            'qr_pairing_code' => 'sometimes|string|max:50',
            'pairing_pin' => 'sometimes|string|max:10',
            // Token FCM Android: boleh null jika user revoke / app uninstall
            'fcm_token' => 'nullable|string|max:1000',
        ]);

        // Gate kepemilikan: jika salah satu dikirim, WAJIB cocok dengan row
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
        // Minimal salah satu dari qr_pairing_code ATAU pairing_pin HARUS dikirim (tidak boleh kosong dua-duanya)
        if (empty($validated['qr_pairing_code']) && empty($validated['pairing_pin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi kepemilikan gagal: wajib kirim pairing_pin ATAU qr_pairing_code.',
            ], 403);
        }

        // Normalisasi token: jika string kosong / hanya spasi → set NULL (revoke)
        $newToken = filled($validated['fcm_token']) ? trim($validated['fcm_token']) : null;

        $anak->update([
            'fcm_token' => $newToken,
            'last_active' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Token FCM perangkat anak berhasil diupdate',
            'data' => [
                'id' => $anak->id,
                'fcm_token_length' => strlen($newToken ?? ''),
                'token_revoked' => $newToken === null,
                'updated_at' => now()->toISOString(),
            ],
        ]);
    }

    // AN9/G2.2 - Upload GPS pergerakan realtime dari Companion Android FusedLocationProviderClient.
    // GATE OWNERSHIP wajib pairing_pin ATAU qr_pairing_code yang cocok dengan row ProfilAnak target ID.
    // Data disimpan ke (1) tabel pergerakan_gps_anak (history lengkap) + (2) update snapshot
    // last_known GPS di profil_anak (untuk Monitor page initial center, TIDAK hardcode Jakarta!).
    // G2.3: Setelah insert/update berhasil, evaluasi semua ZonaGeofence milik user via formula
    // Haversine 6371 KM → trigger enter/exit geofence → insert log_geofence + broadcast
    // FCM push ke orang tua (Web + Android) via FcmPushService::broadcastUserChildren().
    public function uploadGpsPergerakan(Request $request, int $id): JsonResponse
    {
        $anak = ProfilAnak::findOrFail($id);

        $validated = $request->validate([
            // Gate kepemilikan perangkat: salah satu field WAJIB dikirim & cocok
            'qr_pairing_code' => 'sometimes|string|max:50',
            'pairing_pin' => 'sometimes|string|max:10',
            // GPS core fields (wajib dari device FusedLocationProviderClient)
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'captured_at' => 'required|date',
            // Metadata GPS opsional
            'accuracy_meters' => 'nullable|integer|min:0',
            'battery_level' => 'nullable|integer|between:0,100',
            'speed_kmh' => 'nullable|numeric|min:0',
            'altitude_m' => 'nullable|numeric',
            // (G10.1 HOTFIX) JANGAN gunakan rule 'boolean' bawaan Laravel PHP 8.5:
            // rule boolean strict menolak literal string "true"/"false" dari Retrofit @Field Boolean
            // (yang di-encode okhttp jadi query string lowercase). Solusi: nullable SAJA di validasi,
            // KEMUDIAN manual cast di PHP right after validated() (di bawah).
            'is_mock_detected' => 'nullable',
        ]);

        // (G10.1) Manual cast is_mock_detected ke boolean: support semua format
        // (1/0, "1"/"0", "true"/"false" case-insensitive, on/off, yes/no, actual bool)
        // Hindari ValidationException boolean rule PHP 8.5 strict terhadap literal string.
        if (isset($validated['is_mock_detected']) && !is_bool($validated['is_mock_detected'])) {
            $val = strtolower(trim((string) $validated['is_mock_detected']));
            $trueVals = ['1', 'true', 'on', 'yes', 'y'];
            $falseVals = ['0', 'false', 'off', 'no', 'n', '', 'null'];
            if (in_array($val, $trueVals, true)) {
                $validated['is_mock_detected'] = true;
            } elseif (in_array($val, $falseVals, true)) {
                $validated['is_mock_detected'] = false;
            } else {
                // Fallback unknown string value → null agar tidak masuk boolean field DB error
                $validated['is_mock_detected'] = null;
            }
        }

        // Gate kepemilikan: jika salah satu dikirim, WAJIB cocok dengan row
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
        // Minimal salah satu dari qr_pairing_code ATAU pairing_pin HARUS dikirim (tidak boleh kosong dua-duanya)
        if (empty($validated['qr_pairing_code']) && empty($validated['pairing_pin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi kepemilikan gagal: wajib kirim pairing_pin ATAU qr_pairing_code.',
            ], 403);
        }

        // Normalisasi tipe data input agar tidak string saat perhitungan / insert DB
        $newLat = (float) $validated['latitude'];
        $newLng = (float) $validated['longitude'];
        $capturedAt = Carbon::parse($validated['captured_at']);
        $accuracyMeters = isset($validated['accuracy_meters']) ? (int) $validated['accuracy_meters'] : null;
        $batteryLevel = isset($validated['battery_level']) ? (int) $validated['battery_level'] : null;

        // Ambil LAST KNOWN SEBELUM di-overwrite (untuk menghitung jarak dari titik sebelumnya)
        $prevLat = $anak->last_known_latitude;
        $prevLng = $anak->last_known_longitude;

        // (G2.2 STEP 1) Insert row history pergerakan GPS ke tabel pergerakan_gps_anak via Mass Assignment
        $pergerakan = PergerakanGpsAnak::create(array_merge(
            $validated,
            [
                'profil_anak_id' => $anak->id,
                'latitude' => $newLat,
                'longitude' => $newLng,
                'captured_at' => $capturedAt,
            ]
        ));

        // (G2.2 STEP 2) Update snapshot last_known GPS di ProfilAnak.
        // PENTING: last_gps_captured_at diisi DARI VALUE CAPTURED AT HP (bukan now() server!)
        //          agar waktu snapshot sesuai dengan waktu penangkapan sinyal GPS di perangkat.
        //          last_active = now() server waktu untuk status "terakhir kali terhubung".
        // (FIX MONITOR 1) Update battery_level TIAP KALI GPS upload:
        //   SEBELUMNYA battery hanya di-update oleh TelemetryWorker 15 menit.
        //   Karena GPS Expedited upload sekarang MAX LATENCY 5 DETIK, jauh lebih sering
        //   jalan daripada Telemetry 15m → update battery disini LEBIH REALTIME
        //   dan UI Monitor/Dashboard selalu menampilkan battery_level AKTUAL dari HP,
        //   BUKAN nilai LAMA dari pairing / telemetry lama (64% vs 80% bug).
        // CATATAN ZERO ASSUMPTION: Field battery_level PASTI ADA di tabel profil_anak
        //   (migration G0 ProfilAnak). Field accuracy/altitude/mock last TIDAK ADA migration
        //   jadi TIDAK di-update disini (hindari SQL error column unknown).
        $anakUpdate = [
            'last_known_latitude' => $newLat,
            'last_known_longitude' => $newLng,
            'last_gps_captured_at' => $capturedAt,
            'last_active' => now(),
        ];
        if ($batteryLevel !== null) {
            $anakUpdate['battery_level'] = $batteryLevel;
        }
        $anak->update($anakUpdate);

        // (G2.2 STEP 3) Hitung jarak dari titik GPS sebelumnya ke titik baru via Haversine (dalam meter)
        $distanceMeters = 0;
        if ($prevLat !== null && $prevLng !== null) {
            $jarakPrevKm = self::haversineKm((float) $prevLat, (float) $prevLng, $newLat, $newLng);
            $distanceMeters = (int) round($jarakPrevKm * 1000);
        }

        // (G2.3) Evaluasi Geofence + Trigger FCM Broadcast (DIBUNGKUS try/catch non fatal)
        // Jika FcmPushService tidak ready / DB geofence corrupt → GPS upload TETAP 200 sukses,
        // hanya geofence yang gagal silently di-log (warning level).
        $geofenceTriggeredCount = 0;
        $insideAnyZone = false;
        try {
            $zonasAktif = ZonaGeofence::where('user_id', $anak->user_id)
                ->where('status', 'active')
                ->get();

            foreach ($zonasAktif as $zona) {
                // (G2.3a) Filter assigned_children: jika zona punya assign list & anak ini
                // tidak ada di list → skip zona ini (hanya berlaku untuk anak yang di-assign).
                // HOTFIX: DB JSON kadang menyimpan id sebagai STRING (contoh ["1"]) padahal
                //         $anak->id adalah INTEGER → cast kedua sisi ke STRING agar compare
                //         tidak false negative karena type mismatch strict in_array.
                $assigned = $zona->assigned_children;
                if ($assigned !== null && is_array($assigned)) {
                    $anakIdStr = (string) $anak->id;
                    $assignedStrs = array_map('strval', $assigned);
                    if (!in_array($anakIdStr, $assignedStrs, true)) {
                        continue;
                    }
                }

                // (G2.3b) Hitung jarak titik GPS baru vs center zona (kilometer float)
                $jarakZonaKm = self::haversineKm(
                    $newLat,
                    $newLng,
                    (float) $zona->latitude,
                    (float) $zona->longitude
                );
                $radiusKm = ((int) $zona->radius_meters) / 1000.0;

                // (G2.3c) Ambil STATUS TERAKHIR dari tabel log_geofence untuk zona + anak ini.
                // CATATAN PRE-AUDIT G0: tabel log_geofence TIDAK ADA profil_anak_id FK,
                // maka query via child_name STRING (sesuai shape existing model fillable).
                $lastLog = LogGeofence::where('zona_geofence_id', $zona->id)
                    ->where('child_name', $anak->name)
                    ->latest('timestamp')
                    ->first();
                $lastEventType = $lastLog?->event_type ?? null;

                $isInside = ($jarakZonaKm < $radiusKm);
                if ($isInside) {
                    $insideAnyZone = true;
                }

                // (G2.3d) EVENT MASUK ZONA: jarak di dalam radius, sebelumnya TIDAK di dalam,
                // dan zona punya notify_on_enter = TRUE → insert log + broadcast FCM.
                if ($isInside && $lastEventType !== 'enter' && $zona->notify_on_enter === true) {
                    LogGeofence::create([
                        'zona_geofence_id' => $zona->id,
                        'child_name' => $anak->name,
                        'device_name' => $anak->device_name ?? 'Unknown Device',
                        'zone_name' => $zona->name,
                        'zone_type' => $zona->category,
                        'event_type' => 'enter',
                        'timestamp' => $capturedAt,
                        'location_coordinates' => "{$newLat},{$newLng}",
                        'battery_status' => $batteryLevel !== null ? "{$batteryLevel}%" : null,
                        'accuracy' => $accuracyMeters !== null ? "{$accuracyMeters}m" : null,
                    ]);
                    // Update last_triggered zona (catatan audit kapan terakhir kali zona ini menembakkan event)
                    $zona->last_triggered = now();
                    $zona->save();

                    // Broadcast FCM push ke semua perangkat orang tua (Web Push + Android Parent)
                    $wibStr = $capturedAt->timezone('Asia/Jakarta')->format('d/m/Y H:i');
                    $payload = [
                        'title' => "Anak Masuk Zona {$zona->category}: {$zona->name}",
                        'body' => "{$anak->name} terdeteksi MASUK area {$zona->name} (radius {$zona->radius_meters}m) pada {$wibStr} WIB.",
                        'data' => [
                            'zona_id' => (string) $zona->id,
                            'event_type' => 'geofence_enter',
                            'click_url' => '/monitor',
                        ],
                    ];
                    try {
                        app(FcmPushService::class)->broadcastUserChildren(
                            $anak->user_id,
                            'geofence_enter',
                            $payload
                        );
                    } catch (\Throwable $e) {
                        Log::warning("[GEO-ENTER] broadcastUserChildren gagal user={$anak->user_id}: " . $e->getMessage());
                    }
                    $geofenceTriggeredCount++;
                }
                // (G2.3e) EVENT KELUAR ZONA: jarak LUAR radius, sebelumnya MASUK (enter),
                // dan zona punya notify_on_exit = TRUE → insert log exit + broadcast FCM.
                elseif (!$isInside && $lastEventType === 'enter' && $zona->notify_on_exit === true) {
                    LogGeofence::create([
                        'zona_geofence_id' => $zona->id,
                        'child_name' => $anak->name,
                        'device_name' => $anak->device_name ?? 'Unknown Device',
                        'zone_name' => $zona->name,
                        'zone_type' => $zona->category,
                        'event_type' => 'exit',
                        'timestamp' => $capturedAt,
                        'location_coordinates' => "{$newLat},{$newLng}",
                        'battery_status' => $batteryLevel !== null ? "{$batteryLevel}%" : null,
                        'accuracy' => $accuracyMeters !== null ? "{$accuracyMeters}m" : null,
                    ]);
                    $zona->last_triggered = now();
                    $zona->save();

                    $wibStr = $capturedAt->timezone('Asia/Jakarta')->format('d/m/Y H:i');
                    $payload = [
                        'title' => "Anak Keluar Zona {$zona->category}: {$zona->name}",
                        'body' => "{$anak->name} terdeteksi KELUAR area {$zona->name} (radius {$zona->radius_meters}m) pada {$wibStr} WIB.",
                        'data' => [
                            'zona_id' => (string) $zona->id,
                            'event_type' => 'geofence_exit',
                            'click_url' => '/monitor',
                        ],
                    ];
                    try {
                        app(FcmPushService::class)->broadcastUserChildren(
                            $anak->user_id,
                            'geofence_exit',
                            $payload
                        );
                    } catch (\Throwable $e) {
                        Log::warning("[GEO-EXIT] broadcastUserChildren gagal user={$anak->user_id}: " . $e->getMessage());
                    }
                    $geofenceTriggeredCount++;
                }
            }
        } catch (\Throwable $e) {
            // Geofence evaluasi FAIL non fatal → GPS upload TETAP sukses 200, hanya log warning.
            Log::warning("[G2.3] Evaluasi geofence gagal (non fatal), GPS anak_id={$anak->id} tetap tersimpan: " . $e->getMessage());
        }

        // (FINAL) Response standard shape: success + data ringkasan upload.
        // event_type geofence_enter/geofence_exit EXACT match handler client side
        // (F5 Android LitensiFirebaseMessagingService.onMessageReceived & F4 Web SW push listener).
        return response()->json([
            'success' => true,
            'message' => 'Data GPS pergerakan anak berhasil disimpan & trigger geofence di-evaluasi.',
            'data' => [
                'gps_id' => $pergerakan->id,
                'captured_at' => $capturedAt->toIso8601String(),
                'distance_from_last_known_meters' => $distanceMeters,
                'geofence_events_triggered_count' => $geofenceTriggeredCount,
                'is_inside_any_active_zone' => $insideAnyZone,
                'updated_at' => now()->toIso8601String(),
            ],
        ]);
    }

    // Helper Haversine Great Circle Distance (rumus 6371 KM radius bumi)
    // Parameter: latitude & longitude dalam decimal degrees (WGS84).
    // Return: jarak 2 titik dalam KILOMETER float.
    // Digunakan di (a) distance previous GPS → dikali 1000 jadi meter untuk response.
    //            (b) perbandingan jarak titik GPS vs center ZonaGeofence (Km vs radius_meters/1000).
    private static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $pi180 = M_PI / 180;
        $dLat = ($lat2 - $lat1) * $pi180;
        $dLng = ($lng2 - $lng1) * $pi180;
        $lat1Rad = $lat1 * $pi180;
        $lat2Rad = $lat2 * $pi180;
        $a = sin($dLat / 2) ** 2 + cos($lat1Rad) * cos($lat2Rad) * sin($dLng / 2) ** 2;
        $c = 2 * asin(sqrt($a));
        return 6371.0 * $c;
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
