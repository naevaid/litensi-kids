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
        $userId = $request->input('user_id', 1);

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

        if (!$pairing) {
            return response()->json([
                'success' => false,
                'message' => 'Kode pairing tidak ditemukan atau sudah kedaluwarsa',
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
