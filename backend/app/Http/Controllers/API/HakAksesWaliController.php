<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Mail\UndanganWaliMail;
use App\Models\PermissionWaliPerModul;
use App\Models\UndanganWaliAkses;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

// Modul R5: Hak Akses & Wali (Pendamping Co-Parent)
// Endpoint: W1 GET roles, W2 POST undang-kirim, W3 POST undangan-terima,
//           W4 PUT pendamping/{id}, W5 GET daftar-pendamping
// Aturan: Zero Hardcode, gate ownership parent_user_id di-filter ketat.
class HakAksesWaliController extends Controller
{
    // Helper: user_id safe dari request (null jika tidak valid)
    private function getSafeUserId(Request $request): ?int
    {
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) return null;
        return (int)$userId;
    }

    // 5 permission boolean default shape (sesuai HakAksesTab.tsx L17-L23)
    private function getDefaultPermissionShape(): array
    {
        return [
            'canLockScreen'   => false,
            'canGrantTime'    => false,
            'canViewLocation' => false,
            'canEditPin'      => false,
            'canBlockApps'    => false,
        ];
    }

    // 3 Template role fixed (JUJUR sesuai frontend HakAksesTab L30-73)
    private function getRoleTemplates(): array
    {
        return [
            [
                'role_id'     => 'role-1',
                'role_name'   => 'Orang Tua Utama (Super Admin)',
                'deskripsi'   => 'Akses penuh kontrol perangkat anak, ubah PIN master, batasi aplikasi, dan kelola akun.',
                'permissions' => [
                    'canLockScreen'   => true,
                    'canGrantTime'    => true,
                    'canViewLocation' => true,
                    'canEditPin'      => true,
                    'canBlockApps'    => true,
                ],
                'is_default'  => true,
            ],
            [
                'role_id'     => 'role-2',
                'role_name'   => 'Pendamping / Wali (Co-Parent)',
                'deskripsi'   => 'Dapat memantau lokasi, menambah waktu layar, dan mengirim pesan tanpa wewenang ubah PIN master.',
                'permissions' => [
                    'canLockScreen'   => true,
                    'canGrantTime'    => true,
                    'canViewLocation' => true,
                    'canEditPin'      => false,
                    'canBlockApps'    => true,
                ],
                'is_default'  => false,
            ],
            [
                'role_id'     => 'role-3',
                'role_name'   => 'Guru Les / Pengawas Belajar',
                'deskripsi'   => 'Hanya dapat melihat mode belajar dan mengaktifkan aplikasi edukasi tertentu.',
                'permissions' => [
                    'canLockScreen'   => false,
                    'canGrantTime'    => false,
                    'canViewLocation' => false,
                    'canEditPin'      => false,
                    'canBlockApps'    => false,
                ],
                'is_default'  => false,
            ],
        ];
    }

    // Cari role template by ID, return null jika tidak ada
    private function findRoleTemplate(string $roleId): ?array
    {
        foreach ($this->getRoleTemplates() as $tpl) {
            if ($tpl['role_id'] === $roleId) return $tpl;
        }
        return null;
    }

    /**
     * W1 — GET /hak-akses/roles
     * List 3 template role + COUNT total_users_aktif dari DB R5 relasi (bukan hardcode!)
     * Orang Tua Utama total_users_aktif selalu 1 (JUJUR itu user sendiri yang login)
     */
    public function getRoles(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json([
                'success' => true,
                'data'    => ['roles' => []],
            ]);
        }
        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan',
            ], 404);
        }

        $templates = $this->getRoleTemplates();
        $countAktifPerRole = [];
        $listRelasi = PermissionWaliPerModul::where('parent_user_id', $userId)
            ->where('status_aktif', 'aktif')
            ->get();
        foreach ($listRelasi as $rel) {
            $rid = $rel->role_id_awal ?? 'role-2';
            if (!isset($countAktifPerRole[$rid])) $countAktifPerRole[$rid] = 0;
            $countAktifPerRole[$rid]++;
        }

        $roles = [];
        foreach ($templates as $tpl) {
            if ($tpl['is_default']) {
                $total = 1; // JUJUR: Orang Tua Utama = user sendiri yang login (selalu 1)
            } else {
                $total = (int)($countAktifPerRole[$tpl['role_id']] ?? 0);
            }
            $roles[] = [
                'role_id'           => $tpl['role_id'],
                'role_name'         => $tpl['role_name'],
                'deskripsi'         => $tpl['deskripsi'],
                'permissions_json'  => (object)$tpl['permissions'],
                'total_users_aktif' => $total,
                'is_default'        => (bool)$tpl['is_default'],
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => ['roles' => $roles],
        ]);
    }

    /**
     * W2 — POST /hak-akses/undang-kirim
     * Kirim undangan pendamping (PEMILIK KELUARGA SAJA — bukan pendamping yang mengundang!)
     * email_wali harus format email. role_id wajib di 3 template.
     */
    public function kirimUndangan(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json([
                'success' => false,
                'message' => 'user_id wajib dan valid',
            ], 401);
        }
        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan',
            ], 404);
        }
        $pendampingRelasi = PermissionWaliPerModul::where('pendamping_user_id', $userId)
            ->where('status_aktif', 'aktif')->first();
        if ($pendampingRelasi) {
            return response()->json([
                'success' => false,
                'message' => 'Pendamping tidak diizinkan mengirim undangan (hanya pemilik keluarga)',
            ], 403);
        }

        $emailWali = trim((string)$request->input('email_wali', ''));
        $roleId    = trim((string)$request->input('role_id', ''));
        if (!filter_var($emailWali, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'success' => false,
                'message' => 'Format email wali tidak valid',
            ], 422);
        }
        $roleTpl = $this->findRoleTemplate($roleId);
        if (!$roleTpl || $roleTpl['is_default']) {
            return response()->json([
                'success' => false,
                'message' => 'role_id tidak valid (pilih Pendamping / Guru Les)',
            ], 422);
        }
        if (strcasecmp($emailWali, (string)$user->email) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat mengundang email diri sendiri',
            ], 422);
        }

        $existPending = UndanganWaliAkses::where('parent_user_id', $userId)
            ->where('email_wali', $emailWali)
            ->whereIn('status', ['pending_invited', 'accepted'])
            ->first();
        if ($existPending) {
            return response()->json([
                'success' => false,
                'message' => 'Email ini sudah pernah diundang (status: ' . $existPending->status . ')',
                'data'    => ['undangan_id' => $existPending->id],
            ], 409);
        }

        $permissionOverride = null;
        $reqOverride = $request->input('permission_override_json');
        if ($reqOverride !== null && is_array($reqOverride)) {
            $def = $this->getDefaultPermissionShape();
            $safe = [];
            foreach ($def as $k => $v) {
                $safe[$k] = isset($reqOverride[$k]) ? (bool)$reqOverride[$k] : $roleTpl['permissions'][$k];
            }
            $permissionOverride = $safe;
        }

        $kodeUnik = 'inv-' . Str::lower(Str::random(12)) . '-' . dechex($userId) . '-' . dechex(time());
        $expires  = Carbon::now()->addDays(7);

        DB::beginTransaction();
        try {
            $undangan = UndanganWaliAkses::create([
                'parent_user_id'           => $userId,
                'pendamping_user_id'       => null,
                'role_id'                  => $roleTpl['role_id'],
                'role_name'                => $roleTpl['role_name'],
                'email_wali'               => $emailWali,
                'kode_undang_unique'       => $kodeUnik,
                'permission_override_json' => $permissionOverride,
                'status'                   => 'pending_invited',
                'expires_at'               => $expires,
            ]);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan undangan: ' . $e->getMessage(),
            ], 500);
        }

        $calonPendamping = User::where('email', $emailWali)->first();
        $emailTerkirim = false;
        $errorMail = null;

        // Kirim email via SMTP Hostinger (.env MAIL_ L50-57)
        // Try/catch: jika SMTP gagal (535 auth / timeout), undangan TETAP tersimpan di DB.
        // Return response tetap sukses 201 dengan email_terkirim=false + catatan error_mail (jika ada)
        try {
            Mail::to($emailWali)->send(new UndanganWaliMail($undangan, $user, $calonPendamping));
            $emailTerkirim = true;
            // Simpan audit email_sent_at + reset error sebelumnya (jika ada)
            $undangan->update([
                'invited_at'      => Carbon::now(),
                'email_sent_at'   => Carbon::now(),
                'email_last_error'=> null,
            ]);
        } catch (\Throwable $e) {
            $emailTerkirim = false;
            $errorMail = $e->getMessage();
            // Simpan error ke kolom table untuk audit cepat tanpa buka log
            $undangan->update([
                'email_last_error' => mb_substr((string)$e->getMessage(), 0, 500),
            ]);
            // Log untuk debug tapi tidak crash endpoint
            \Illuminate\Support\Facades\Log::warning('Gagal kirim undangan wali email: ' . $e->getMessage(), [
                'undangan_id' => $undangan->id,
                'email_to'    => $emailWali,
                'mailer'      => config('mail.default'),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => $emailTerkirim
                ? 'Undangan berhasil dibuat & email terkirim'
                : 'Undangan berhasil dibuat (gagal kirim email — simpan kode undangan untuk dibagikan manual)',
            'data'    => [
                'undangan_id'        => $undangan->id,
                'kode_undang_unique' => $undangan->kode_undang_unique,
                'status'             => $undangan->status,
                'email_terkirim'     => $emailTerkirim,
                'error_mail'         => $errorMail,
                'expires_at'         => $undangan->expires_at?->toIso8601String(),
                'user_sudah_ada'     => $calonPendamping?->id,
                'link_terima'        => url('/terima-undangan') . '?kode=' . urlencode($undangan->kode_undang_unique),
                'link_register'      => url('/register') . '?kode=' . urlencode($undangan->kode_undang_unique) . '&email=' . urlencode($emailWali),
                'permissions_final'  => (object)($permissionOverride ?? $roleTpl['permissions']),
            ],
        ], 201);
    }

    /**
     * W3 — POST /hak-akses/undangan-terima
     * Public-ish: menerima undangan via kode_undang_unique (tidak expired, status pending).
     * Buat row permission_wali_per_modul permanen + update status undangan = accepted.
     */
    public function terimaUndangan(Request $request): JsonResponse
    {
        $kodeUndang = trim((string)$request->input('kode_invite', ''));
        if (empty($kodeUndang)) {
            return response()->json([
                'success' => false,
                'message' => 'kode_invite wajib',
            ], 422);
        }
        $undangan = UndanganWaliAkses::where('kode_undang_unique', $kodeUndang)->first();
        if (!$undangan) {
            return response()->json([
                'success' => false,
                'message' => 'Kode undangan tidak ditemukan',
            ], 404);
        }
        if ($undangan->status !== 'pending_invited') {
            return response()->json([
                'success' => false,
                'message' => 'Status undangan sudah: ' . $undangan->status . ' (harus pending_invited)',
            ], 409);
        }
        if ($undangan->expires_at && Carbon::parse($undangan->expires_at)->isPast()) {
            $undangan->status = 'expired';
            $undangan->save();
            return response()->json([
                'success' => false,
                'message' => 'Kode undangan sudah EXPIRED (lebih dari 7 hari)',
            ], 410);
        }

        $userIdBaru     = (int)$request->input('user_id_baru', 0);
        $userIdSudahAda = (int)$request->input('user_id_sudah_ada', 0);
        $pendampingId   = $userIdSudahAda > 0 ? $userIdSudahAda : $userIdBaru;

        if ($pendampingId <= 0) {
            $calonUser = User::where('email', $undangan->email_wali)->first();
            if ($calonUser) $pendampingId = $calonUser->id;
        }
        if ($pendampingId <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'user_id_sudah_ada / user_id_baru wajib (pendamping harus punya akun Litensi Kids)',
            ], 422);
        }
        $pendampingUser = User::find($pendampingId);
        if (!$pendampingUser) {
            return response()->json([
                'success' => false,
                'message' => 'User pendamping tidak ditemukan di DB',
            ], 404);
        }

        $roleTpl = $this->findRoleTemplate((string)($undangan->role_id ?? 'role-2')) ?? $this->getRoleTemplates()[1];
        $permissionFinal = $roleTpl['permissions'];
        if (is_array($undangan->permission_override_json)) {
            foreach ($permissionFinal as $k => $v) {
                if (array_key_exists($k, $undangan->permission_override_json)) {
                    $permissionFinal[$k] = (bool)$undangan->permission_override_json[$k];
                }
            }
        }

        DB::beginTransaction();
        try {
            $undangan->status              = 'accepted';
            $undangan->accepted_at         = Carbon::now();
            $undangan->pendamping_user_id  = $pendampingId;
            $undangan->save();

            // ⭐ DEFENSIF: cek apakah relasi parent+pendamping sudah ada (sudah pernah invite lalu di-nonaktifkan)?
            // Kalau SUDAH ADA → update status AKTIF (JANGAN create baru = error 1062 unique constraint!)
            $relasi = PermissionWaliPerModul::where('parent_user_id', $undangan->parent_user_id)
                ->where('pendamping_user_id', $pendampingId)
                ->first();
            if ($relasi) {
                $relasi->status_aktif       = 'aktif';
                $relasi->tanggal_nonaktif   = null;
                $relasi->permission_json    = $permissionFinal;
                $relasi->undangan_asal_id   = $undangan->id;
                $relasi->role_id_awal       = $roleTpl['role_id'];
                $relasi->save();
            } else {
                $relasi = PermissionWaliPerModul::create([
                    'parent_user_id'      => $undangan->parent_user_id,
                    'pendamping_user_id'  => $pendampingId,
                    'undangan_asal_id'    => $undangan->id,
                    'role_id_awal'        => $roleTpl['role_id'],
                    'permission_json'     => $permissionFinal,
                    'status_aktif'        => 'aktif',
                    'dibuat_oleh_user_id' => $pendampingId,
                ]);
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menerima undangan: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Undangan diterima — pendamping terhubung',
            'data'    => [
                'status'                          => 'accepted',
                'pendamping_id'                   => $pendampingId,
                'menjadi_wali_untuk_family_user_id' => $undangan->parent_user_id,
                'permissions_json'                => (object)$permissionFinal,
                'permission_relasi_id'            => $relasi->id,
            ],
        ]);
    }

    /**
     * W4 — PUT /hak-akses/pendamping/{pendampingRelasiId}
     * (PEMILIK KELUARGA SAJA) Ubah permission 5 boolean / nonaktifkan pendamping
     * Defensive: parameter untyped + validasi numeric di dalam method (bukan strict int!)
     */
    public function updatePendamping(Request $request, $pendampingRelasiId): JsonResponse
    {
        if (!is_numeric($pendampingRelasiId) || (int)$pendampingRelasiId <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'ID relasi pendamping tidak valid (harus numeric positif)',
            ], 404);
        }
        $relId = (int)$pendampingRelasiId;

        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json([
                'success' => false,
                'message' => 'user_id wajib',
            ], 401);
        }

        $relasi = PermissionWaliPerModul::find($relId);
        if (!$relasi) {
            return response()->json([
                'success' => false,
                'message' => 'Relasi pendamping tidak ditemukan',
            ], 404);
        }
        if ((int)$relasi->parent_user_id !== $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya pemilik keluarga yang boleh mengedit pendamping ini',
            ], 403);
        }

        $permissionSebelum = is_array($relasi->permission_json) ? $relasi->permission_json : $this->getDefaultPermissionShape();

        $reqPerm = $request->input('permission_json');
        if ($reqPerm !== null) {
            if (!is_array($reqPerm)) {
                return response()->json([
                    'success' => false,
                    'message' => 'permission_json harus object 5 boolean canX',
                ], 422);
            }
            $def = $this->getDefaultPermissionShape();
            $permissionSesudah = [];
            foreach ($def as $k => $v) {
                $permissionSesudah[$k] = array_key_exists($k, $reqPerm)
                    ? (bool)$reqPerm[$k]
                    : ($permissionSebelum[$k] ?? $v);
            }
            $relasi->permission_json = $permissionSesudah;
        } else {
            $permissionSesudah = $permissionSebelum;
        }

        $nonaktifkan = $request->has('nonaktifkan') ? (bool)$request->input('nonaktifkan') : null;
        if ($nonaktifkan === true) {
            $relasi->status_aktif     = 'nonaktif';
            $relasi->tanggal_nonaktif = Carbon::now();
        } elseif ($nonaktifkan === false) {
            $relasi->status_aktif     = 'aktif';
            $relasi->tanggal_nonaktif = null;
        }

        $relasi->save();

        return response()->json([
            'success' => true,
            'message' => 'Data pendamping diperbarui',
            'data'    => [
                'updated'             => true,
                'permissions_sebelum' => (object)$permissionSebelum,
                'permissions_sesudah' => (object)$permissionSesudah,
                'status_aktif'        => $relasi->status_aktif,
            ],
        ]);
    }

    /**
     * W5 — GET /hak-akses/daftar-pendamping
     * List semua pendamping AKTIF milik user (PEMILIK KELUARGA)
     * Zero hardcode: info pendamping join ke users table asli, tidak ada fallback dummy.
     */
    public function getDaftarPendamping(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json([
                'success' => true,
                'data'    => ['list' => []],
            ]);
        }
        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan',
            ], 404);
        }

        $list = PermissionWaliPerModul::with('pendampingUser')
            ->where('parent_user_id', $userId)
            ->orderBy('status_aktif', 'desc')
            ->orderBy('tanggal_jadi_awal', 'desc')
            ->get();

        $out = [];
        foreach ($list as $rel) {
            $u = $rel->pendampingUser;
            if (!$u) continue; // (seharusnya tidak terjadi karena FK cascade)
            $out[] = [
                'relasi_id'             => $rel->id,
                'pendamping_user_id'    => (int)$u->id,
                'nama'                  => (string)$u->name,
                'email'                 => (string)$u->email,
                'phone'                 => (string)($u->phone ?? ''),
                'avatar_url'            => (string)($u->avatar_url ?? ''),
                'permissions'           => (object)(is_array($rel->permission_json)
                    ? $rel->permission_json
                    : $this->getDefaultPermissionShape()),
                'role_id_awal'          => (string)($rel->role_id_awal ?? 'role-2'),
                'tanggal_jadi_awal'     => $rel->tanggal_jadi_awal?->toIso8601String(),
                'tanggal_nonaktif'      => $rel->tanggal_nonaktif?->toIso8601String(),
                'status_aktif'          => (string)$rel->status_aktif,
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => ['list' => $out],
        ]);
    }
}
