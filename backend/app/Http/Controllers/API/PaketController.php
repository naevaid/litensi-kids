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

    // Detail paket
    public function show(int $id): JsonResponse
    {
        $paket = PaketLangganan::findOrFail($id);

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

    // Upgrade paket untuk user
    public function upgrade(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'paket_id' => 'required|exists:paket_langganan,id',
            'periode' => 'required|in:bulanan,tahunan',
        ]);

        $user = User::findOrFail($request->user_id);
        $paket = PaketLangganan::findOrFail($request->paket_id);

        $expiresAt = $request->periode === 'tahunan'
            ? now()->addYear()
            : now()->addMonth();

        $user->update([
            'active_plan' => $paket->name,
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
