<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AturanAplikasi;
use App\Models\JadwalBlokir;
use App\Models\PermintaanAksesAplikasi;
use App\Models\ProfilAnak;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KontrolAplikasiController extends Controller
{
    // Helper: parsing user_id dengan aman (ZERO HARDCODE, TIDAK BOLEH default id=1!)
    private function getSafeUserId(Request $request): ?int
    {
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) {
            return null;
        }
        return (int) $userId;
    }

    // ============================================================
    // A. MODUL ATRIBUT APLIKASI (6 endpoint)
    // ============================================================

    // List aturan aplikasi milik user tertentu (filter via profil_anak.user_id)
    public function indexAturan(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $aturan = AturanAplikasi::whereHas('profilAnak', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->with(['profilAnak', 'jadwalBlokir'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $aturan]);
    }

    // Detail aturan aplikasi beserta jadwal terkait (GATE OWNERSHIP)
    public function showAturan(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $aturan = AturanAplikasi::with(['profilAnak', 'jadwalBlokir'])
            ->where('id', $id)
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $aturan]);
    }

    // Tambah aturan aplikasi baru
    public function storeAturan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'profil_anak_id' => 'required|exists:profil_anak,id',
            'app_name' => 'required|string|max:255',
            'package_name' => 'required|string|max:255',
            'category' => 'required|in:game,social,video,education,chat,utility',
            'icon' => 'nullable|string|max:255',
            'status' => 'sometimes|in:allowed,limited,blocked|default:allowed',
            'daily_limit_minutes' => 'sometimes|integer|min:0|default:0',
            'used_today_minutes' => 'sometimes|integer|min:0|default:0',
            'schedule_mode' => 'sometimes|in:all_day,study_time_blocked,bedtime_blocked,custom|default:all_day',
            'allow_weekend_extra' => 'sometimes|boolean|default:false',
            'weekend_extra_minutes' => 'sometimes|integer|min:0|default:0',
        ]);

        $userId = $this->getSafeUserId($request);
        $anak = ProfilAnak::findOrFail($validated['profil_anak_id']);
        if ($userId !== null && (int)$anak->user_id !== $userId) {
            abort(404, 'Data anak tidak ditemukan');
        }

        $aturan = AturanAplikasi::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Aturan aplikasi berhasil ditambahkan',
            'data' => $aturan->load(['profilAnak', 'jadwalBlokir']),
        ], 201);
    }

    // Update aturan aplikasi (GATE OWNERSHIP)
    public function updateAturan(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $aturan = AturanAplikasi::where('id', $id)
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        $validated = $request->validate([
            'app_name' => 'sometimes|required|string|max:255',
            'package_name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|in:game,social,video,education,chat,utility',
            'icon' => 'sometimes|nullable|string|max:255',
            'status' => 'sometimes|required|in:allowed,limited,blocked',
            'daily_limit_minutes' => 'sometimes|integer|min:0',
            'used_today_minutes' => 'sometimes|integer|min:0',
            'schedule_mode' => 'sometimes|required|in:all_day,study_time_blocked,bedtime_blocked,custom',
            'allow_weekend_extra' => 'sometimes|boolean',
            'weekend_extra_minutes' => 'sometimes|integer|min:0',
            'last_used_time' => 'sometimes|date',
        ]);

        $aturan->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Aturan aplikasi berhasil diperbarui',
            'data' => $aturan->load(['profilAnak', 'jadwalBlokir']),
        ]);
    }

    // Hapus aturan aplikasi (GATE OWNERSHIP)
    public function destroyAturan(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $aturan = AturanAplikasi::where('id', $id)
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        $aturan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Aturan aplikasi berhasil dihapus',
        ]);
    }

    // Bulk set status per kategori (shortcut: blokir semua aplikasi game dll)
    public function bulkKategoriAturan(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json(['success' => true, 'data' => [], 'updated_count' => 0]);
        }

        $validated = $request->validate([
            'category' => 'required|in:game,social,video,education,chat,utility,all',
            'profil_anak_id' => 'nullable|exists:profil_anak,id',
            'set_status' => 'required|in:allowed,limited,blocked',
            'set_daily_limit_minutes' => 'nullable|integer|min:0',
        ]);

        $count = AturanAplikasi::whereHas('profilAnak', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->when($validated['category'] !== 'all', function ($q) use ($validated) {
                $q->where('category', $validated['category']);
            })
            ->when(!empty($validated['profil_anak_id']), function ($q) use ($validated) {
                $q->where('profil_anak_id', $validated['profil_anak_id']);
            })
            ->update(array_filter([
                'status' => $validated['set_status'],
                'daily_limit_minutes' => $validated['set_daily_limit_minutes'] ?? null,
            ]));

        return response()->json([
            'success' => true,
            'message' => "Berhasil update $count aturan aplikasi kategori {$validated['category']}",
            'updated_count' => $count,
        ]);
    }

    // ============================================================
    // B. MODUL JADWAL BLOKIR (6 endpoint)
    // ============================================================

    // List jadwal blokir milik user
    public function indexJadwal(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $jadwal = JadwalBlokir::whereHas('profilAnak', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->with(['profilAnak', 'aturanAplikasi'])
            ->orderBy('is_active', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $jadwal]);
    }

    // Detail jadwal blokir (GATE OWNERSHIP)
    public function showJadwal(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $jadwal = JadwalBlokir::with(['profilAnak', 'aturanAplikasi'])
            ->where('id', $id)
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $jadwal]);
    }

    // Tambah jadwal blokir baru
    public function storeJadwal(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'profil_anak_id' => 'required|exists:profil_anak,id',
            'aturan_aplikasi_id' => 'nullable|exists:aturan_aplikasi,id',
            'nama_jadwal' => 'required|string|max:255',
            'days_active' => 'required|array|min:1',
            'days_active.*' => 'integer|between:0,6',
            'jam_mulai' => 'required|date_format:H:i',
            'jam_selesai' => 'required|date_format:H:i|after:jam_mulai',
            'action_when_match' => 'sometimes|in:block,limit,unblock|default:block',
            'durasi_jadwal_minutes' => 'nullable|integer|min:0',
            'is_active' => 'sometimes|boolean|default:true',
        ]);

        $userId = $this->getSafeUserId($request);
        $anak = ProfilAnak::findOrFail($validated['profil_anak_id']);
        if ($userId !== null && (int)$anak->user_id !== $userId) {
            abort(404, 'Data anak tidak ditemukan');
        }

        $validated['days_active'] = json_encode($validated['days_active']);
        $jadwal = JadwalBlokir::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Jadwal blokir berhasil ditambahkan',
            'data' => $jadwal->load(['profilAnak', 'aturanAplikasi']),
        ], 201);
    }

    // Update jadwal blokir (GATE OWNERSHIP)
    public function updateJadwal(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $jadwal = JadwalBlokir::where('id', $id)
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        $validated = $request->validate([
            'aturan_aplikasi_id' => 'sometimes|nullable|exists:aturan_aplikasi,id',
            'nama_jadwal' => 'sometimes|required|string|max:255',
            'days_active' => 'sometimes|required|array|min:1',
            'days_active.*' => 'integer|between:0,6',
            'jam_mulai' => 'sometimes|required|date_format:H:i',
            'jam_selesai' => 'sometimes|required|date_format:H:i|after:jam_mulai',
            'action_when_match' => 'sometimes|required|in:block,limit,unblock',
            'durasi_jadwal_minutes' => 'sometimes|nullable|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['days_active']) && is_array($validated['days_active'])) {
            $validated['days_active'] = json_encode($validated['days_active']);
        }

        $jadwal->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Jadwal blokir berhasil diperbarui',
            'data' => $jadwal->load(['profilAnak', 'aturanAplikasi']),
        ]);
    }

    // Hapus jadwal blokir (GATE OWNERSHIP)
    public function destroyJadwal(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $jadwal = JadwalBlokir::where('id', $id)
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        $jadwal->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jadwal blokir berhasil dihapus',
        ]);
    }

    // Toggle aktif/nonaktif jadwal blokir (quick action)
    public function toggleJadwal(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $jadwal = JadwalBlokir::where('id', $id)
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        $jadwal->is_active = !$jadwal->is_active;
        $jadwal->save();

        return response()->json([
            'success' => true,
            'message' => $jadwal->is_active ? 'Jadwal diaktifkan' : 'Jadwal dinonaktifkan',
            'data' => ['id' => $jadwal->id, 'is_active' => $jadwal->is_active],
        ]);
    }

    // ============================================================
    // C. MODUL PERMINTAAN AKSES APLIKASI (3 endpoint)
    // ============================================================

    // List permintaan akses (sort by status pending dulu, lalu requested_at desc)
    public function indexPermintaan(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $statusFilter = $request->input('status'); // optional: pending/approved/rejected/all

        $permintaan = PermintaanAksesAplikasi::whereHas('profilAnak', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->with(['profilAnak', 'handledByUser:id,name,email'])
            ->when(!empty($statusFilter) && $statusFilter !== 'all', function ($q) use ($statusFilter) {
                $q->where('status', $statusFilter);
            })
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->orderBy('requested_at', 'desc')
            ->limit((int) $request->input('limit', 100))
            ->get();

        return response()->json(['success' => true, 'data' => $permintaan]);
    }

    // Approve permintaan akses (user ID dari request)
    public function approvePermintaan(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $permintaan = PermintaanAksesAplikasi::where('id', $id)
            ->where('status', 'pending')
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        $validated = $request->validate([
            'durasi_menit_approve' => 'nullable|integer|min:1',
            'catatan_approve' => 'nullable|string',
            'auto_buat_aturan' => 'sometimes|boolean|default:true',
        ]);

        $durasiFinal = $validated['durasi_menit_approve'] ?? $permintaan->durasi_menit_diminta ?? 30;

        DB::beginTransaction();
        try {
            $permintaan->update([
                'status' => 'approved',
                'durasi_menit_diminta' => $durasiFinal,
                'handled_by_user_id' => $userId,
                'handled_at' => now(),
                'catatan_handle' => $validated['catatan_approve'] ?? null,
            ]);

            // Opsional: otomatis buat aturan_aplikasi tipe LIMITED dengan durasi approve
            if (!empty($validated['auto_buat_aturan']) && $validated['auto_buat_aturan']) {
                AturanAplikasi::updateOrCreate(
                    [
                        'profil_anak_id' => $permintaan->profil_anak_id,
                        'package_name' => $permintaan->package_name,
                    ],
                    [
                        'app_name' => $permintaan->app_name,
                        'category' => in_array($permintaan->category, ['game','social','video','education','chat','utility'])
                            ? $permintaan->category : 'utility',
                        'status' => 'limited',
                        'daily_limit_minutes' => $durasiFinal,
                        'schedule_mode' => 'all_day',
                    ]
                );
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'Permintaan akses disetujui',
            'data' => $permintaan->load(['profilAnak', 'handledByUser:id,name,email']),
        ]);
    }

    // Reject permintaan akses
    public function rejectPermintaan(Request $request, int $id): JsonResponse
    {
        $userId = $this->getSafeUserId($request);

        $permintaan = PermintaanAksesAplikasi::where('id', $id)
            ->where('status', 'pending')
            ->when($userId !== null, function ($q) use ($userId) {
                $q->whereHas('profilAnak', function ($sub) use ($userId) {
                    $sub->where('user_id', $userId);
                });
            })
            ->when($userId === null, function ($q) {
                $q->whereRaw('1 = 0');
            })
            ->firstOrFail();

        $validated = $request->validate([
            'alasan_reject' => 'nullable|string',
        ]);

        $permintaan->update([
            'status' => 'rejected',
            'handled_by_user_id' => $userId,
            'handled_at' => now(),
            'catatan_handle' => $validated['alasan_reject'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permintaan akses ditolak',
            'data' => $permintaan->load(['profilAnak', 'handledByUser:id,name,email']),
        ]);
    }
}
