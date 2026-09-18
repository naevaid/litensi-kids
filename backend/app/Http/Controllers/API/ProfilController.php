<?php
// app/Http/Controllers/API/ProfilController.php
// Endpoint untuk edit Profil Orang Tua + Upload foto profil (compress otomatis)
namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image;

class ProfilController extends Controller
{
    /**
     * POST /api/v1/profil/update
     * Update data profil (nama, email, phone, pin_master parental control)
     */
    public function updateProfil(Request $request): JsonResponse
    {
        // Zero Assumption auth: inject user_id dari request param
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => false,
                'message' => 'user_id tidak valid atau belum login',
            ], 401);
        }
        $userId = (int) $userId;

        $validasi = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $userId,
            'phone' => 'nullable|string|max:20',
            'pin_master' => 'nullable|string|min:4|max:6|regex:/^[0-9]+$/',
        ], [
            'pin_master.regex' => 'PIN Master hanya boleh angka 4-6 digit',
            'pin_master.min' => 'PIN Master minimal 4 digit',
            'pin_master.max' => 'PIN Master maksimal 6 digit',
            'email.unique' => 'Email ini sudah dipakai akun lain',
        ]);

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User tidak ditemukan'], 404);
        }

        $updateData = [
            'name' => $validasi['name'],
            'email' => $validasi['email'],
            'phone' => $validasi['phone'] ?? null,
        ];

        // HANYA update pin_master JIKA user mengirim field pin_master dan TIDAK KOSONG
        if (array_key_exists('pin_master', $validasi) && !empty($validasi['pin_master'])) {
            $updateData['pin_master'] = $validasi['pin_master'];
        }

        $user->update($updateData);

        // Info tambahan untuk frontend (TANPA actual pin_master value, sudah hidden via Model!)
        $userData = $user->makeHidden(['password', 'pin_master', 'remember_token'])->toArray();
        $userData['pin_master_exists'] = !empty($user->pin_master);

        return response()->json([
            'success' => true,
            'message' => 'Data profil berhasil diperbarui',
            'data' => [
                'user' => $userData,
            ],
        ]);
    }

    /**
     * POST /api/v1/profil/foto
     * Upload foto profil → compress 800x800 quality 85% → hapus foto lama jika ada (hanya lokal storage!)
     */
    public function uploadFotoProfil(Request $request): JsonResponse
    {
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => false,
                'message' => 'user_id tidak valid atau belum login',
            ], 401);
        }
        $userId = (int) $userId;

        $validasi = $request->validate([
            'photo' => 'required|file|mimes:jpeg,jpg,png,webp|max:10240',
        ], [
            'photo.mimes' => 'Format foto hanya boleh JPG, JPEG, PNG, WEBP',
            'photo.max' => 'Ukuran foto maksimal 10MB (server akan otomatis kompres)',
        ]);

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User tidak ditemukan'], 404);
        }

        $file = $request->file('photo');
        if (!$file || !$file->isValid()) {
            return response()->json(['success' => false, 'message' => 'File foto tidak valid'], 400);
        }

        // ---- KOMPRES GAMBAR OTOMATIS via Intervention Image ----
        try {
            $img = Image::read($file->getRealPath());
            // Scale down max 800x800 (preserve aspect ratio, NO UPSCALE)
            $img->scaleDown(800, 800);
            $img->encodeByMediaType('image/jpeg', 85);

            // Nama file unique: profil/{userId}_{unixTime}_{random6char}.jpg
            $timestamp = time();
            $rand = substr(bin2hex(random_bytes(3)), 0, 6);
            $relativePath = "profil/{$userId}_{$timestamp}_{$rand}.jpg";
            $fullPath = storage_path("app/public/{$relativePath}");

            // Pastikan folder profil/ ada
            if (!is_dir(dirname($fullPath))) {
                @mkdir(dirname($fullPath), 0755, true);
            }
            $img->save($fullPath, 85, 'jpg');
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses gambar: ' . $e->getMessage(),
            ], 500);
        }

        // ---- HAPUS FOTO PROFIL LAMA (HANYA jika URL lokal, jangan hapus Unsplash/external!) ----
        $oldAvatar = $user->avatar_url ?? '';
        if (!empty($oldAvatar)) {
            $isLocalFile = false;
            $localPathToDelete = null;
            // Pattern 1: relative path mulai dari 'profil/'
            if (str_starts_with($oldAvatar, 'profil/') || str_starts_with($oldAvatar, '/storage/profil/')) {
                $cleanPath = ltrim(parse_url($oldAvatar, PHP_URL_PATH) ?? $oldAvatar, '/');
                if (str_starts_with($cleanPath, 'storage/profil/')) {
                    $cleanPath = substr($cleanPath, strlen('storage/'));
                }
                if (Storage::disk('public')->exists($cleanPath)) {
                    $isLocalFile = true;
                    $localPathToDelete = $cleanPath;
                }
            }
            // Pattern 2: base URL current host + /storage/profil/xxx
            if (!$isLocalFile) {
                $parsed = parse_url($oldAvatar);
                if (!empty($parsed['path'])) {
                    $cleanPath = ltrim($parsed['path'], '/');
                    if (str_starts_with($cleanPath, 'storage/profil/')) {
                        $cleanPath = substr($cleanPath, strlen('storage/'));
                        if (Storage::disk('public')->exists($cleanPath)) {
                            $isLocalFile = true;
                            $localPathToDelete = $cleanPath;
                        }
                    }
                }
            }
            if ($isLocalFile && $localPathToDelete) {
                try {
                    Storage::disk('public')->delete($localPathToDelete);
                } catch (\Throwable $e) {
                    // Ignore error hapus file lama (mungkin sudah tidak ada / permission)
                }
            }
        }

        // ---- SIMPAN URL baru ke DB user ----
        $publicUrl = asset('storage/' . $relativePath);
        $user->update(['avatar_url' => $publicUrl]);

        // Response user (hidden pin_master)
        $userData = $user->makeHidden(['password', 'pin_master', 'remember_token'])->toArray();
        $userData['pin_master_exists'] = !empty($user->pin_master);

        return response()->json([
            'success' => true,
            'message' => 'Foto profil berhasil diunggah & dikompres',
            'data' => [
                'avatar_url' => $publicUrl,
                'file_size_kb' => round(@filesize($fullPath) / 1024, 1),
                'old_photo_deleted' => $isLocalFile ?? false,
                'user' => $userData,
            ],
        ]);
    }

    /**
     * POST /api/v1/profil/foto/hapus
     * Reset avatar ke default (hapus foto lokal user)
     */
    public function hapusFotoProfil(Request $request): JsonResponse
    {
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
            return response()->json(['success' => false, 'message' => 'User tidak ditemukan'], 404);
        }
        $oldAvatar = $user->avatar_url ?? '';
        $deleted = false;
        if (!empty($oldAvatar)) {
            $parsed = parse_url($oldAvatar);
            $cleanPath = ltrim($parsed['path'] ?? $oldAvatar, '/');
            if (str_starts_with($cleanPath, 'storage/profil/')) {
                $cleanPath = substr($cleanPath, strlen('storage/'));
                if (Storage::disk('public')->exists($cleanPath)) {
                    $deleted = Storage::disk('public')->delete($cleanPath);
                }
            }
        }
        $user->update(['avatar_url' => null]);
        $userData = $user->makeHidden(['password', 'pin_master', 'remember_token'])->toArray();
        $userData['pin_master_exists'] = !empty($user->pin_master);

        return response()->json([
            'success' => true,
            'message' => 'Foto profil dihapus, kembali ke avatar default',
            'data' => [
                'old_photo_deleted' => $deleted,
                'user' => $userData,
            ],
        ]);
    }

    /**
     * F3.WEB — Update token FCM Web Push (Browser Orang Tua)
     * Dipanggil oleh frontend setelah user izinkan notifikasi browser via firebase messaging.
     * Endpoint: POST /api/v1/profil/web-fcm-token
     * Auth: user_id param (pattern sama dengan updateProfil / uploadFotoProfil)
     */
    public function updateWebFcmToken(Request $request): JsonResponse
    {
        // Zero Assumption auth: inject user_id dari request param
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) {
            return response()->json([
                'success' => false,
                'message' => 'user_id tidak valid atau belum login',
            ], 401);
        }
        $userId = (int) $userId;

        $validasi = $request->validate([
            // Token FCM Web Push: boleh null/string kosong = user revoke notifikasi browser
            'web_fcm_token' => 'nullable|string',
        ]);

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User tidak ditemukan'], 404);
        }

        // Normalisasi token: jika string kosong / hanya spasi → set NULL (revoke)
        $newToken = filled($validasi['web_fcm_token']) ? trim($validasi['web_fcm_token']) : null;

        $user->update([
            'web_fcm_token' => $newToken,
            // Timestamp HANYA di-update JIKA token baru non-null
            'web_fcm_token_updated_at' => $newToken ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Token FCM Web Push berhasil diupdate',
            'data' => [
                'fcm_web_token_length' => strlen($newToken ?? ''),
                'token_revoked' => $newToken === null,
                'updated_at' => $user->web_fcm_token_updated_at?->toISOString(),
            ],
        ]);
    }
}
