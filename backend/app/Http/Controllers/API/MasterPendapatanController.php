<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CatatanPendapatan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MasterPendapatanController extends Controller
{
    // Daftar semua catatan pendapatan
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status', 'all');
        $provider = $request->input('provider', 'all');
        $tanggalMulai = $request->input('date_from');
        $tanggalSelesai = $request->input('date_to');
        $cari = $request->input('search');
        $limit = $request->input('limit', 100);

        $query = CatatanPendapatan::with('user');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($provider !== 'all') {
            $query->where('provider', $provider);
        }

        if ($tanggalMulai) {
            $query->whereDate('transaction_date', '>=', $tanggalMulai);
        }

        if ($tanggalSelesai) {
            $query->whereDate('transaction_date', '<=', $tanggalSelesai);
        }

        if ($cari) {
            $query->where(function ($q) use ($cari) {
                $q->where('user_name', 'like', "%{$cari}%")
                    ->orWhere('user_email', 'like', "%{$cari}%")
                    ->orWhere('item', 'like', "%{$cari}%")
                    ->orWhere('invoice_no', 'like', "%{$cari}%");
            });
        }

        $pendapatan = $query->orderBy('transaction_date', 'desc')
            ->limit($limit)
            ->get();

        // Ringkasan total
        $totalSukses = CatatanPendapatan::where('status', 'sukses')->sum('amount');
        $totalMenunggu = CatatanPendapatan::where('status', 'menunggu')->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'list' => $pendapatan,
                'summary' => [
                    'total_transaksi' => $pendapatan->count(),
                    'total_nominal_sukses' => $totalSukses,
                    'total_nominal_menunggu' => $totalMenunggu,
                    'average_transaksi' => $pendapatan->count() > 0
                        ? (int) ($totalSukses / CatatanPendapatan::where('status', 'sukses')->count())
                        : 0,
                ],
            ],
        ]);
    }

    // Detail transaksi pendapatan
    public function show(int $id): JsonResponse
    {
        $transaksi = CatatanPendapatan::with('user')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $transaksi,
        ]);
    }

    // Tambah catatan pendapatan manual
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_name' => 'required|string|max:255',
            'user_email' => 'required|string|email|max:255',
            'item' => 'required|string|max:255',
            'amount' => 'required|integer|min:0',
            'provider' => 'required|string|max:50',
            'status' => 'in:sukses,menunggu,kadaluwarsa,gagal,refund',
            'transaction_date' => 'required|date',
        ]);

        $transaksi = CatatanPendapatan::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Catatan pendapatan berhasil ditambahkan',
            'data' => $transaksi,
        ], 201);
    }

    // Update status / detail transaksi
    public function update(Request $request, int $id): JsonResponse
    {
        $transaksi = CatatanPendapatan::findOrFail($id);

        $request->validate([
            'status' => 'sometimes|required|in:sukses,menunggu,kadaluwarsa,gagal,refund',
            'amount' => 'sometimes|required|integer|min:0',
        ]);

        $transaksi->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Catatan pendapatan berhasil diperbarui',
            'data' => $transaksi,
        ]);
    }

    // Hapus catatan pendapatan
    public function destroy(int $id): JsonResponse
    {
        $transaksi = CatatanPendapatan::findOrFail($id);
        $invoice = $transaksi->invoice_no ?? $transaksi->id;
        $transaksi->delete();

        return response()->json([
            'success' => true,
            'message' => "Catatan pendapatan #{$invoice} berhasil dihapus",
        ]);
    }
}
