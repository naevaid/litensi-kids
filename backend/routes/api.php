<?php

use App\Http\Controllers\API\AnakController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\GeofenceController;
use App\Http\Controllers\API\MasterPendapatanController;
use App\Http\Controllers\API\MasterSistemController;
use App\Http\Controllers\API\MasterUserController;
use App\Http\Controllers\API\NotifikasiController;
use App\Http\Controllers\API\PaketController;
use App\Http\Controllers\API\PengumumanController;
use Illuminate\Support\Facades\Route;

// === PREFIX /api/v1 ===
Route::prefix('v1')->group(function () {

    // === Endpoint Publik (tidak butuh auth) ===
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    Route::get('/system/health', [MasterSistemController::class, 'healthCheck']);

    // === Pengumuman dapat diakses publik ===
    Route::get('/pengumuman', [PengumumanController::class, 'index']);
    Route::get('/pengumuman/{id}', [PengumumanController::class, 'show']);

    // === Paket Langganan dapat diakses publik ===
    Route::get('/paket', [PaketController::class, 'index']);
    // PENTING URUTAN: Route spesifik /mine & /upgrade DIDEKLARASIKAN SEBELUM WILDCARD {id}
    // Kalau terbalik: /paket/mine match ke {id} → call show("mine") → TypeError PHP 8 typed arg (HTTP 500!)
    Route::get('/paket/mine', [PaketController::class, 'mine']); // Status paket aktif user per user_id
    Route::post('/paket/upgrade', [PaketController::class, 'upgrade']);
    Route::get('/paket/{id}', [PaketController::class, 'show'])->whereNumber('id'); // HANYA numeric ID!

    // === Dashboard ===
    Route::prefix('dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/weekly-stats', [DashboardController::class, 'weeklyStats']);
        Route::get('/paket-options', [DashboardController::class, 'paketOptions']);
    });

    // === Modul Kelola Anak (ProfilAnak) ===
    Route::prefix('anak')->group(function () {
        // Endpoint Pairing Step 1, Step 2 Confirm (Android), & Realtime Status (harus sebelum {id} wildcard!)
        Route::post('/pairing/generate', [AnakController::class, 'generatePairing']);
        Route::post('/pairing/confirm', [AnakController::class, 'confirmPairing']);
        Route::get('/pairing/status', [AnakController::class, 'pairingStatus']);

        Route::get('/', [AnakController::class, 'index']);
        Route::get('/{id}', [AnakController::class, 'show']);
        Route::post('/', [AnakController::class, 'store']);
        Route::put('/{id}', [AnakController::class, 'update']);
        Route::patch('/{id}', [AnakController::class, 'update']);
        Route::delete('/{id}', [AnakController::class, 'destroy']);
    });

    // === Modul Geofence ===
    Route::prefix('geofence')->group(function () {
        Route::get('/', [GeofenceController::class, 'index']);
        Route::get('/logs', [GeofenceController::class, 'logs']);
        Route::post('/logs', [GeofenceController::class, 'addLog']);
        Route::get('/{id}', [GeofenceController::class, 'show']);
        Route::post('/', [GeofenceController::class, 'store']);
        Route::put('/{id}', [GeofenceController::class, 'update']);
        Route::patch('/{id}', [GeofenceController::class, 'update']);
        Route::delete('/{id}', [GeofenceController::class, 'destroy']);
    });

    // === Modul Notifikasi Diteruskan ===
    Route::prefix('notifikasi')->group(function () {
        Route::get('/', [NotifikasiController::class, 'index']);
        Route::post('/mark-all-read', [NotifikasiController::class, 'markAllRead']);
        Route::get('/{id}', [NotifikasiController::class, 'show']);
        Route::post('/', [NotifikasiController::class, 'store']);
        Route::put('/{id}', [NotifikasiController::class, 'update']);
        Route::patch('/{id}', [NotifikasiController::class, 'update']);
        Route::delete('/{id}', [NotifikasiController::class, 'destroy']);
    });

    // === CRUD Pengumuman (Admin) ===
    Route::prefix('pengumuman')->group(function () {
        Route::post('/', [PengumumanController::class, 'store']);
        Route::put('/{id}', [PengumumanController::class, 'update']);
        Route::patch('/{id}', [PengumumanController::class, 'update']);
        Route::delete('/{id}', [PengumumanController::class, 'destroy']);
    });

    // === CRUD Paket Langganan (Admin) ===
    Route::prefix('paket')->group(function () {
        Route::post('/', [PaketController::class, 'store']);
        Route::put('/{id}', [PaketController::class, 'update']);
        Route::patch('/{id}', [PaketController::class, 'update']);
        Route::delete('/{id}', [PaketController::class, 'destroy']);
    });

    // === MASTER: Kelola Pengguna ===
    Route::prefix('master-users')->group(function () {
        Route::get('/', [MasterUserController::class, 'index']);
        Route::get('/{id}', [MasterUserController::class, 'show']);
        Route::post('/', [MasterUserController::class, 'store']);
        Route::put('/{id}', [MasterUserController::class, 'update']);
        Route::patch('/{id}', [MasterUserController::class, 'update']);
        Route::delete('/{id}', [MasterUserController::class, 'destroy']);
    });

    // === MASTER: Kelola Pendapatan ===
    Route::prefix('master-pendapatan')->group(function () {
        Route::get('/', [MasterPendapatanController::class, 'index']);
        Route::get('/{id}', [MasterPendapatanController::class, 'show']);
        Route::post('/', [MasterPendapatanController::class, 'store']);
        Route::put('/{id}', [MasterPendapatanController::class, 'update']);
        Route::patch('/{id}', [MasterPendapatanController::class, 'update']);
        Route::delete('/{id}', [MasterPendapatanController::class, 'destroy']);
    });

    // === MASTER: Konfigurasi Sistem & Stats ===
    Route::prefix('master-sistem')->group(function () {
        Route::get('/', [MasterSistemController::class, 'index']);
        Route::get('/stats', [MasterSistemController::class, 'systemStats']);
        Route::put('/', [MasterSistemController::class, 'update']);
        Route::patch('/', [MasterSistemController::class, 'update']);
    });
});
