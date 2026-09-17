<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\NotifikasiDiteruskan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotifikasiController extends Controller
{
    // Daftar notifikasi berdasarkan user
    public function index(Request $request): JsonResponse
    {
        $userId = $request->input('user_id', 1);
        $kategori = $request->input('kategori'); // app_category filter
        $bintang = $request->boolean('starred_only', false);
        $belumDibaca = $request->boolean('unread_only', false);
        $limit = $request->input('limit', 50);

        $query = NotifikasiDiteruskan::where('user_id', $userId)
            ->with(['user', 'profilAnak']);

        if ($kategori) {
            $query->where('app_category', $kategori);
        }

        if ($bintang) {
            $query->where('is_starred', true);
        }

        if ($belumDibaca) {
            $query->where('is_read', false);
        }

        $notifikasi = $query->orderBy('timestamp', 'desc')
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'list' => $notifikasi,
                'summary' => [
                    'total' => $notifikasi->count(),
                    'unread' => NotifikasiDiteruskan::where('user_id', $userId)
                        ->where('is_read', false)->count(),
                    'starred' => NotifikasiDiteruskan::where('user_id', $userId)
                        ->where('is_starred', true)->count(),
                    'flagged' => NotifikasiDiteruskan::where('user_id', $userId)
                        ->where('is_flagged', true)->count(),
                ],
            ],
        ]);
    }

    // Detail notifikasi
    public function show(int $id): JsonResponse
    {
        $notif = NotifikasiDiteruskan::with(['user', 'profilAnak'])->findOrFail($id);

        // Otomatis tandai sebagai terbaca
        if (! $notif->is_read) {
            $notif->update(['is_read' => true]);
            $notif->refresh();
        }

        return response()->json([
            'success' => true,
            'data' => $notif,
        ]);
    }

    // Kirim notifikasi baru (dari device anak)
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'profil_anak_id' => 'nullable|exists:profil_anak,id',
            'child_name' => 'required|string|max:255',
            'device_name' => 'required|string|max:255',
            'app_name' => 'required|string|max:255',
            'content' => 'required|string',
            'timestamp' => 'required|date',
        ]);

        $notif = NotifikasiDiteruskan::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi berhasil dikirim',
            'data' => $notif->load(['user', 'profilAnak']),
        ], 201);
    }

    // Update status baca / bintang / flag
    public function update(Request $request, int $id): JsonResponse
    {
        $notif = NotifikasiDiteruskan::findOrFail($id);

        $fields = $request->only([
            'is_read', 'is_starred', 'is_flagged', 'flag_reason',
        ]);

        $notif->update($fields);

        return response()->json([
            'success' => true,
            'message' => 'Status notifikasi diperbarui',
            'data' => $notif,
        ]);
    }

    // Tandai semua notifikasi sebagai terbaca
    public function markAllRead(Request $request): JsonResponse
    {
        $userId = $request->input('user_id', 1);

        $affected = NotifikasiDiteruskan::where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => "Berhasil menandai {$affected} notifikasi sebagai terbaca",
            'data' => ['marked_count' => $affected],
        ]);
    }

    // Hapus notifikasi
    public function destroy(int $id): JsonResponse
    {
        $notif = NotifikasiDiteruskan::findOrFail($id);
        $notif->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi berhasil dihapus',
        ]);
    }
}
