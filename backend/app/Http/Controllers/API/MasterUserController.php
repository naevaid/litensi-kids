<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ProfilAnak;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class MasterUserController extends Controller
{
    // Daftar semua user (filter by role, status, plan)
    public function index(Request $request): JsonResponse
    {
        $role = $request->input('role', 'all');
        $status = $request->input('status', 'all');
        $plan = $request->input('plan', 'all');
        $cari = $request->input('search');
        $limit = $request->input('limit', 100);

        $query = User::withCount(['profilAnak as total_anak']);

        if ($role !== 'all') {
            $query->where('role', $role);
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($plan !== 'all') {
            $query->where('active_plan', $plan);
        }

        if ($cari) {
            $query->where(function ($q) use ($cari) {
                $q->where('name', 'like', "%{$cari}%")
                    ->orWhere('email', 'like', "%{$cari}%")
                    ->orWhere('phone', 'like', "%{$cari}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->makeHidden(['password', 'remember_token']);

        return response()->json([
            'success' => true,
            'data' => [
                'list' => $users,
                'summary' => [
                    'total' => User::count(),
                    'orang_tua' => User::where('role', 'Orang Tua')->count(),
                    'aktif' => User::where('status', 'active')->count(),
                    'premium' => User::where('active_plan', 'premium')->count(),
                    'family_pro' => User::where('active_plan', 'family_pro')->count(),
                ],
            ],
        ]);
    }

    // Detail user beserta data anak
    public function show(int $id): JsonResponse
    {
        $user = User::with('profilAnak')
            ->findOrFail($id)
            ->makeHidden(['password', 'remember_token']);

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    // Tambah user baru (master admin)
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'role' => 'in:Orang Tua,Master,Owner',
            'password' => 'required|string|min:6',
            'active_plan' => 'in:free,premium,family_pro',
            'status' => 'in:active,suspended,trial',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'role' => $request->role ?? 'Orang Tua',
            'password' => Hash::make($request->password),
            'active_plan' => $request->active_plan ?? 'free',
            'active_plan_label' => $request->active_plan_label ?? 'Free (Dasar)',
            'status' => $request->status ?? 'trial',
            'expires_at' => $request->expires_at ?? now()->addDays(7),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil ditambahkan',
            'data' => $user->makeHidden(['password', 'remember_token']),
        ], 201);
    }

    // Update user
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,'.$id,
            'role' => 'sometimes|in:Orang Tua,Master,Owner',
            'active_plan' => 'sometimes|in:free,premium,family_pro',
            'status' => 'sometimes|in:active,suspended,trial',
        ]);

        $data = $request->except(['password']);

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil diperbarui',
            'data' => $user->makeHidden(['password', 'remember_token']),
        ]);
    }

    // Hapus user beserta semua data terkait (cascade)
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $nama = $user->name;
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => "User '{$nama}' berhasil dihapus beserta data terkait",
        ]);
    }
}
