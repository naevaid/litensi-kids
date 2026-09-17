<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\LogGeofence;
use App\Models\ZonaGeofence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeofenceController extends Controller
{
    // Daftar zona geofence berdasarkan user
    public function index(Request $request): JsonResponse
    {
        $userId = $request->input('user_id', 1);

        $zona = ZonaGeofence::where('user_id', $userId)
            ->with('user')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $zona,
        ]);
    }

    // Detail zona geofence
    public function show(int $id): JsonResponse
    {
        $zona = ZonaGeofence::with('user', 'logGeofence')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $zona,
        ]);
    }

    // Tambah zona geofence baru
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'name' => 'required|string|max:255',
            'category' => 'required|in:safe,danger,warning,school,home',
            'address' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius_meters' => 'required|integer|min:10',
        ]);

        $zona = ZonaGeofence::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Zona geofence berhasil ditambahkan',
            'data' => $zona->load('user'),
        ], 201);
    }

    // Update zona geofence
    public function update(Request $request, int $id): JsonResponse
    {
        $zona = ZonaGeofence::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|in:safe,danger,warning,school,home',
            'latitude' => 'sometimes|required|numeric',
            'longitude' => 'sometimes|required|numeric',
            'radius_meters' => 'sometimes|required|integer|min:10',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $zona->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Zona geofence berhasil diperbarui',
            'data' => $zona->load('user'),
        ]);
    }

    // Hapus zona geofence
    public function destroy(int $id): JsonResponse
    {
        $zona = ZonaGeofence::findOrFail($id);
        $zona->delete();

        return response()->json([
            'success' => true,
            'message' => 'Zona geofence berhasil dihapus',
        ]);
    }

    // Daftar log geofence
    public function logs(Request $request): JsonResponse
    {
        $zonaId = $request->input('zona_id');
        $limit = $request->input('limit', 50);

        $logs = LogGeofence::when($zonaId, function ($q) use ($zonaId) {
            $q->where('zona_geofence_id', $zonaId);
        })
            ->with('zonaGeofence')
            ->orderBy('timestamp', 'desc')
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    // Tambah log geofence baru (trigger dari device)
    public function addLog(Request $request): JsonResponse
    {
        $request->validate([
            'zona_geofence_id' => 'nullable|exists:zona_geofence,id',
            'child_name' => 'required|string|max:255',
            'device_name' => 'required|string|max:255',
            'zone_name' => 'required|string|max:255',
            'zone_type' => 'required|in:safe,danger,warning,school,home',
            'event_type' => 'required|in:enter,exit,dwell',
            'timestamp' => 'required|date',
        ]);

        $log = LogGeofence::create($request->all());

        // Update last_triggered di zona jika ada
        if ($log->zona_geofence_id) {
            ZonaGeofence::where('id', $log->zona_geofence_id)
                ->update(['last_triggered' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Log geofence berhasil dicatat',
            'data' => $log,
        ], 201);
    }
}
