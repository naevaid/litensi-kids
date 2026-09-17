<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Pengumuman;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PengumumanController extends Controller
{
    // Daftar pengumuman yang aktif (untuk user)
    public function index(Request $request): JsonResponse
    {
        $aktifOnly = $request->boolean('active_only', true);
        $target = $request->input('target'); // modal / header / both

        $query = Pengumuman::query();

        if ($aktifOnly) {
            $query->where('is_active', true)
                ->whereDate('start_date', '<=', now())
                ->whereDate('end_date', '>=', now());
        }

        if ($target) {
            $query->where(function ($q) use ($target) {
                $q->where('display_target', $target)
                    ->orWhere('display_target', 'both');
            });
        }

        $pengumuman = $query->orderBy('start_date', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $pengumuman,
        ]);
    }

    // Detail pengumuman
    public function show(int $id): JsonResponse
    {
        $pengumuman = Pengumuman::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $pengumuman,
        ]);
    }

    // Tambah pengumuman baru (master admin)
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'content_type' => 'in:text,image,video,combined',
            'display_target' => 'in:modal,header,both',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $pengumuman = Pengumuman::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil ditambahkan',
            'data' => $pengumuman,
        ], 201);
    }

    // Update pengumuman
    public function update(Request $request, int $id): JsonResponse
    {
        $pengumuman = Pengumuman::findOrFail($id);

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
        ]);

        $pengumuman->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil diperbarui',
            'data' => $pengumuman,
        ]);
    }

    // Hapus pengumuman
    public function destroy(int $id): JsonResponse
    {
        $pengumuman = Pengumuman::findOrFail($id);
        $pengumuman->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil dihapus',
        ]);
    }
}
