<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Proses login user (email + password)
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        // Update last_active
        $user->update(['last_active' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data' => [
                'user' => $user->makeHidden(['password', 'remember_token']),
            ],
        ]);
    }

    // Proses registrasi user baru
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => 'Orang Tua',
            'active_plan' => 'free',
            'active_plan_label' => 'Free (Dasar)',
            'status' => 'trial',
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil',
            'data' => [
                'user' => $user->makeHidden(['password', 'remember_token']),
            ],
        ], 201);
    }

    // Ambil data user yang sedang login (berdasarkan user_id untuk simulasi)
    public function me(Request $request): JsonResponse
    {
        $userId = $request->input('user_id', 1);
        $user = User::findOrFail($userId);

        // Update last_active
        $user->update(['last_active' => now()]);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user->makeHidden(['password', 'remember_token']),
            ],
        ]);
    }

    // Logout (simulasi untuk stateless)
    public function logout(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil',
        ]);
    }
}
