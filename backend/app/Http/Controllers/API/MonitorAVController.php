<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\KuotaAvMonitorHarian;
use App\Models\ProfilAnak;
use App\Models\SesiStreamAvMonitor;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MonitorAVController extends Controller
{
    // Helper ZERO HARDCODE NO FALLBACK DEFAULT user_id=1 — JUJUR return empty / 404 jika null!
    private function getSafeUserId(Request $request): ?int
    {
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) return null;
        return (int) $userId;
    }

    /**
     * AV1 — GET /monitor/kuota-hari-ini
     * List kuota semua anak milik user untuk tanggal HARI INI.
     * Jika kuota row belum exist untuk (anak, today) → auto-create row default (upsert on-the-fly) supaya UI selalu ada progress bar (bukan null JUJUR tapi dengan nilai default paket_kuota dari profil_anak av_minutes_daily).
     */
    public function getKuotaHariIni(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $tanggalToday = Carbon::now()->toDateString();

        // Query semua profil anak milik user ini (relasi user_id = $userId)
        $anakList = ProfilAnak::with('user:id,name')
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get();

        if ($anakList->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Filter jika user hanya mau anak tertentu
        $profilAnakIdFilter = $request->input('profil_anak_id');
        if (!empty($profilAnakIdFilter) && is_numeric($profilAnakIdFilter)) {
            $anakList = $anakList->where('id', (int)$profilAnakIdFilter)->values();
        }

        $result = [];
        foreach ($anakList as $anak) {
            // Default kuota (ambil dari aturan daily_limit app = 0 unlimited. Nanti bisa disesuaikan kolom av_minutes_daily per profil_anak jika ditambahkan nanti)
            $defaultPaketKuota = 0; // 0 = unlimited

            // Upsert otomatis jika row kuota hari ini untuk anak ini belum ada
            $kuota = KuotaAvMonitorHarian::firstOrCreate(
                ['profil_anak_id' => $anak->id, 'tanggal' => $tanggalToday],
                [
                    'paket_kuota_menit_harian' => $defaultPaketKuota,
                    'digunakan_audio_menit' => 0,
                    'digunakan_video_menit' => 0,
                    'total_digunakan_menit' => 0,
                    'sisa_kuota_menit' => ($defaultPaketKuota > 0 ? $defaultPaketKuota : -1), // -1 = unlimited, 0 = tidak ada sisa
                    'last_mode' => 'idle',
                ]
            );

            // Hitung sisa realtime tiap request (jika paket unlimited = -1 else paket - total = max 0)
            $sisaReal = $kuota->paket_kuota_menit_harian === 0
                ? -1
                : max(0, (int)$kuota->paket_kuota_menit_harian - (int)$kuota->total_digunakan_menit);

            // Jaga agar DB sinkron, simpan sisa denormalized supaya query lain cepat
            if ($kuota->sisa_kuota_menit !== $sisaReal) {
                $kuota->sisa_kuota_menit = $sisaReal;
                $kuota->save();
            }

            $result[] = [
                'profil_anak_id' => $anak->id,
                'nama_anak' => $anak->name,
                'device_model' => $anak->device_model ?? null,
                'tanggal' => $kuota->tanggal,
                'paket_kuota_menit_harian' => $kuota->paket_kuota_menit_harian,
                'digunakan_audio_menit' => $kuota->digunakan_audio_menit,
                'digunakan_video_menit' => $kuota->digunakan_video_menit,
                'total_digunakan_menit' => $kuota->total_digunakan_menit,
                'sisa_kuota_menit' => $sisaReal, // -1 = unlimited (tanpa batas)
                'persentase_terpakai' => $kuota->paket_kuota_menit_harian > 0
                    ? min(100, (int) round(($kuota->total_digunakan_menit / $kuota->paket_kuota_menit_harian) * 100))
                    : 0, // 0% untuk unlimited
                'last_mode' => $kuota->last_mode,
                'last_started_at' => $kuota->last_started_at,
                'last_stopped_at' => $kuota->last_stopped_at,
                'last_sesi_id' => $kuota->last_sesi_id,
                'status_kuota' => $this->computeStatusKuota($kuota),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $result,
            'meta' => [
                'tanggal_hari_ini' => $tanggalToday,
                'total_anak' => count($result),
                'total_digunakan_semua_anak_menit' => collect($result)->sum('total_digunakan_menit'),
            ],
        ]);
    }

    // Helper hitung label status kuota (untuk UI badge)
    private function computeStatusKuota(KuotaAvMonitorHarian $k): string
    {
        if ($k->paket_kuota_menit_harian === 0) return 'unlimited';
        if ($k->total_digunakan_menit >= $k->paket_kuota_menit_harian) return 'habis';
        $persen = ($k->total_digunakan_menit / $k->paket_kuota_menit_harian) * 100;
        if ($persen >= 80) return 'hampir_habis';
        return 'normal';
    }

    /**
     * AV2 — POST /monitor/stream/start-sesi
     * Mulai sesi streaming (Listen / Camera). Atomic transaction:
     *   (1) Jika masih ada sesi AKTIF untuk user+anak ini → auto force-disconnect sesi lama (supaya tidak double count menit!)
     *   (2) Insert row sesi BARU status=active
     *   (3) Upsert kuota hari ini → update last_mode, last_started_at, last_sesi_id
     */
    public function startSesiStream(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json([
                'success' => false,
                'message' => 'user_id tidak valid (ZERO HARDCODE — tidak ada default user).',
            ], 400);
        }

        $valid = $request->validate([
            'profil_anak_id' => 'required|exists:profil_anak,id',
            'mode' => 'required|in:audio_listen,camera_live',
            'kualitas' => 'sometimes|in:HD,Standard',
        ]);

        // === GATE OWNERSHIP: Pastikan profil_anak_id BENAR MILIK user_id ini (tidak user lain coba start sesi anak orang!) ===
        $anak = ProfilAnak::where('id', $valid['profil_anak_id'])
            ->when(true, fn($q) => $q->whereHas('user', fn($sub) => $sub->where('id', $userId)))
            ->when(false, fn($q) => $q->whereRaw('1 = 0'))
            ->first();
        if (!$anak) {
            return response()->json([
                'success' => false,
                'message' => 'Profil Anak tidak ditemukan atau bukan milik user ini.',
            ], 404);
        }

        $tanggalToday = Carbon::now()->toDateString();

        DB::beginTransaction();
        try {
            // STEP 1: Auto force-disconnect SEMUA sesi aktif user+anak ini sebelum start sesi baru (antisipasi lupa stop / refresh page)
            $sesiAktifLama = SesiStreamAvMonitor::where('profil_anak_id', $anak->id)
                ->where('user_id_yg_memantau', $userId)
                ->where('status', 'active')
                ->get();
            foreach ($sesiAktifLama as $sesiLama) {
                $this->finalizeSesiInternal($sesiLama, 'force_disconnect');
            }

            // STEP 2: Insert sesi BARU
            $sesi = SesiStreamAvMonitor::create([
                'profil_anak_id' => $anak->id,
                'user_id_yg_memantau' => $userId,
                'mode' => $valid['mode'],
                'kualitas' => $valid['kualitas'] ?? 'Standard',
                'started_at' => Carbon::now(),
                'status' => 'active',
            ]);

            // STEP 3: Upsert kuota hari ini → set last_mode & last_started_at
            $kuota = KuotaAvMonitorHarian::firstOrCreate(
                ['profil_anak_id' => $anak->id, 'tanggal' => $tanggalToday],
                [
                    'paket_kuota_menit_harian' => 0,
                    'digunakan_audio_menit' => 0,
                    'digunakan_video_menit' => 0,
                    'total_digunakan_menit' => 0,
                    'sisa_kuota_menit' => -1,
                ]
            );
            $kuota->last_mode = $valid['mode'];
            $kuota->last_started_at = Carbon::now();
            $kuota->last_stopped_at = null;
            $kuota->last_sesi_id = $sesi->id;
            $kuota->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Sesi stream mode {$valid['mode']} dimulai.",
                'data' => [
                    'sesi_id' => $sesi->id,
                    'started_at' => $sesi->started_at,
                    'mode' => $sesi->mode,
                    'kualitas' => $sesi->kualitas,
                    'status' => $sesi->status,
                    'profil_anak_id' => $anak->id,
                    'nama_anak' => $anak->name,
                    'kuota_snapshot' => [
                        'total_digunakan_sebelum' => $kuota->total_digunakan_menit,
                        'sisa_kuota_menit' => $kuota->sisa_kuota_menit,
                    ],
                ],
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal memulai sesi stream.',
                'error_detail' => env('APP_DEBUG') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * AV3 — POST /monitor/stream/stop-sesi
     * Stop sesi yang aktif → hitung durasi menit (min 1 menit ceiling), tambahkan ke kuota kolom audio/video sesuai mode.
     * Atomic transaction supaya sesi dan kuota TIDAK ADA yang cuma setengah terupdate.
     */
    public function stopSesiStream(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json([
                'success' => false,
                'message' => 'user_id tidak valid.',
            ], 400);
        }

        $valid = $request->validate([
            'sesi_id' => 'required|integer|min:1|exists:sesi_stream_av_monitor,id',
        ]);
        $sesiId = (int)$valid['sesi_id'];

        // Gate ownership: Cari sesi berdasarkan sesi_id YANG MILIK user_id ini + status=active (tidak bisa stop user lain / sudah stopped)
        $sesi = SesiStreamAvMonitor::with('profilAnak')
            ->where('id', $sesiId)
            ->where('user_id_yg_memantau', $userId)
            ->where('status', 'active')
            ->whereHas('profilAnak', fn($q) => $q->where('user_id', $userId)) // double gate pastikan anak juga milik user
            ->first();
        if (!$sesi) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi tidak ditemukan, bukan milik Anda, atau sudah dihentikan sebelumnya.',
            ], 404);
        }

        DB::beginTransaction();
        try {
            $finalisasi = $this->finalizeSesiInternal($sesi, 'completed');
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Sesi stream {$sesi->mode} dihentikan. " . $finalisasi['durasi_menit_aktual'] . " menit ditambahkan ke kuota.",
                'data' => [
                    'sesi_id' => $sesi->id,
                    'mode' => $sesi->mode,
                    'durasi_menit_aktual' => $finalisasi['durasi_menit_aktual'],
                    'started_at' => $sesi->started_at,
                    'stopped_at' => $sesi->stopped_at,
                    'total_digunakan_menit_setelah_update' => $finalisasi['kuota']->total_digunakan_menit,
                    'sisa_kuota_menit' => $finalisasi['kuota']->sisa_kuota_menit,
                    'status_kuota' => $this->computeStatusKuota($finalisasi['kuota']),
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghentikan sesi stream.',
                'error_detail' => env('APP_DEBUG') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // Internal reusable: finalisasi sesi (dipanggil oleh force_disconnect AV2 start & stop AV3)
    // Return array [durasi_menit_aktual, kuota (updated object KuotaAvMonitorHarian)]
    private function finalizeSesiInternal(SesiStreamAvMonitor $sesi, string $statusFinal): array
    {
        // Hitung durasi detik (stop-start) → ceiling menit minimal 1 menit (0 detik = 1 menit).
        $started = Carbon::parse($sesi->started_at);
        $stoppedAt = Carbon::now();
        $durasiDetik = max(0, $stoppedAt->timestamp - $started->timestamp);
        // Ceiling ke menit: 1-59 detik → 1 menit; 60-119 → 2 menit, dst. Min 1 (tidak boleh 0 agar akuntansi konsisten)
        $durasiMenit = max(1, (int) ceil($durasiDetik / 60.0));

        // Update row sesi
        $sesi->status = in_array($statusFinal, ['completed','force_disconnect','error'], true) ? $statusFinal : 'completed';
        $sesi->stopped_at = $stoppedAt;
        $sesi->durasi_menit_aktual = $durasiMenit;
        $sesi->save();

        // Tambahkan durasi ke kuota sesuai mode
        $tanggalSesi = $started->toDateString();
        $kuota = KuotaAvMonitorHarian::firstOrCreate(
            ['profil_anak_id' => $sesi->profil_anak_id, 'tanggal' => $tanggalSesi],
            [
                'paket_kuota_menit_harian' => 0,
                'digunakan_audio_menit' => 0,
                'digunakan_video_menit' => 0,
                'total_digunakan_menit' => 0,
                'sisa_kuota_menit' => -1,
            ]
        );

        if ($sesi->mode === 'audio_listen') {
            $kuota->digunakan_audio_menit += $durasiMenit;
        } else {
            $kuota->digunakan_video_menit += $durasiMenit;
        }
        $kuota->total_digunakan_menit = $kuota->digunakan_audio_menit + $kuota->digunakan_video_menit;
        $kuota->sisa_kuota_menit = $kuota->paket_kuota_menit_harian === 0
            ? -1
            : max(0, (int)$kuota->paket_kuota_menit_harian - (int)$kuota->total_digunakan_menit);
        if ($statusFinal !== 'force_disconnect') {
            $kuota->last_mode = 'idle'; // force disconnect jangan set idle (karena di startSesi akan dioverride lagi)
        }
        $kuota->last_stopped_at = $stoppedAt;
        $kuota->save();

        return [
            'durasi_menit_aktual' => $durasiMenit,
            'kuota' => $kuota,
        ];
    }

    /**
     * AV4 — POST /monitor/kuota/tambah-kuota-manual
     * Orang tua tambahkan kuota hari ini untuk anak tertentu (override per hari).
     */
    public function tambahKuotaManual(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json(['success' => false, 'message' => 'user_id tidak valid.'], 400);
        }

        $valid = $request->validate([
            'profil_anak_id' => 'required|exists:profil_anak,id',
            'tambah_kuota_menit' => 'required|integer|min:1',
        ]);

        $anak = ProfilAnak::where('id', $valid['profil_anak_id'])
            ->whereHas('user', fn($q) => $q->where('id', $userId))
            ->first();
        if (!$anak) {
            return response()->json([
                'success' => false,
                'message' => 'Profil Anak tidak ditemukan atau bukan milik user ini.',
            ], 404);
        }

        $tanggalToday = Carbon::now()->toDateString();
        $kuota = KuotaAvMonitorHarian::firstOrCreate(
            ['profil_anak_id' => $anak->id, 'tanggal' => $tanggalToday],
            [
                'paket_kuota_menit_harian' => 0,
                'digunakan_audio_menit' => 0,
                'digunakan_video_menit' => 0,
                'total_digunakan_menit' => 0,
                'sisa_kuota_menit' => -1,
            ]
        );

        $sebelum = [
            'paket_kuota_menit_harian' => $kuota->paket_kuota_menit_harian,
            'sisa_kuota_menit' => $kuota->sisa_kuota_menit,
        ];

        $tambah = (int)$valid['tambah_kuota_menit'];
        $kuota->paket_kuota_menit_harian += $tambah;
        $kuota->sisa_kuota_menit = max(0, (int)$kuota->paket_kuota_menit_harian - (int)$kuota->total_digunakan_menit);
        $kuota->save();

        return response()->json([
            'success' => true,
            'message' => "Kuota Audio+Video hari ini ditambah {$tambah} menit untuk {$anak->name}.",
            'data' => [
                'profil_anak_id' => $anak->id,
                'nama_anak' => $anak->name,
                'sebelum' => $sebelum,
                'ditambahkan' => $tambah,
                'sesudah' => [
                    'paket_kuota_menit_harian' => $kuota->paket_kuota_menit_harian,
                    'sisa_kuota_menit' => $kuota->sisa_kuota_menit,
                    'status_kuota' => $this->computeStatusKuota($kuota),
                ],
            ],
        ]);
    }

    /**
     * AV5 — GET /monitor/riwayat-sesi
     * Riwayat sesi streaming dengan pagination + summary hari ini (history panel AudioVideoMonitor).
     */
    public function riwayatSesi(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json([
                'success' => true,
                'data' => ['list' => [], 'summary' => ['total_sesi_hari_ini' => 0, 'total_durasi_menit_hari_ini' => 0, 'total_snapshot' => 0]],
            ]);
        }

        $query = SesiStreamAvMonitor::with([
            'profilAnak:id,name,device_model',
            'userPemantau:id,name,email',
        ])
            ->where('user_id_yg_memantau', $userId)
            ->whereHas('profilAnak', fn($sub) => $sub->where('user_id', $userId))
            ->orderBy('started_at', 'desc');

        // Filter opsional
        if (!empty($request->input('profil_anak_id')) && is_numeric($request->input('profil_anak_id'))) {
            $query->where('profil_anak_id', (int)$request->input('profil_anak_id'));
        }
        if (!empty($request->input('tanggal_start'))) {
            $query->whereDate('started_at', '>=', Carbon::parse($request->input('tanggal_start'))->toDateString());
        }
        if (!empty($request->input('tanggal_end'))) {
            $query->whereDate('started_at', '<=', Carbon::parse($request->input('tanggal_end'))->toDateString());
        }
        if (!empty($request->input('mode')) && in_array($request->input('mode'), ['audio_listen','camera_live'], true)) {
            $query->where('mode', $request->input('mode'));
        }

        $perPage = is_numeric($request->input('limit')) ? (int)$request->input('limit') : 30;
        $listPaginate = $query->paginate(min(100, $perPage));

        // Summary HARI INI
        $tanggalToday = Carbon::now()->toDateString();
        $summaryHariIni = SesiStreamAvMonitor::where('user_id_yg_memantau', $userId)
            ->whereDate('started_at', $tanggalToday)
            ->whereHas('profilAnak', fn($sub) => $sub->where('user_id', $userId))
            ->selectRaw('
                COUNT(*) as total_sesi_hari_ini,
                COALESCE(SUM(durasi_menit_aktual),0) as total_durasi_menit_hari_ini,
                COALESCE(SUM(jumlah_snapshot_ambil),0) as total_snapshot
            ')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'list' => $listPaginate->items(),
                'summary' => [
                    'total_sesi_hari_ini' => (int) ($summaryHariIni->total_sesi_hari_ini ?? 0),
                    'total_durasi_menit_hari_ini' => (int) ($summaryHariIni->total_durasi_menit_hari_ini ?? 0),
                    'total_snapshot' => (int) ($summaryHariIni->total_snapshot ?? 0),
                    'tanggal_hari_ini' => $tanggalToday,
                ],
                'pagination' => [
                    'current_page' => $listPaginate->currentPage(),
                    'per_page' => $listPaginate->perPage(),
                    'total_pages' => $listPaginate->lastPage(),
                    'total_items' => $listPaginate->total(),
                ],
            ],
        ]);
    }
}
