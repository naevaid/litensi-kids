<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\KuotaAvMonitorHarian;
use App\Models\PaketLangganan;
use App\Models\ProfilAnak;
use App\Models\SesiStreamAvMonitor;
use App\Models\User;
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

    // Helper normalisasi nama paket ke snake_case — copy pattern dari PaketController agar match antara paket_langganan.name (title case) vs users.active_plan (snake_case)
    private function normalizePlanId(string $raw): string
    {
        $norm = trim((string)$raw);
        $norm = preg_replace('/[^a-zA-Z0-9]+/', '_', $norm);
        $norm = preg_replace('/_+/', '_', $norm);
        return strtolower(trim($norm, '_'));
    }

    // Helper: Ambil detail Paket Langganan milik user berdasarkan users.active_plan
    // Return null JUJUR jika user tidak ketemu / active_plan tidak match ke paket_langganan mana pun (ZERO HARDCODE, TIDAK ADA default paket)
    private function getPaketUser(int $userId): ?PaketLangganan
    {
        $user = User::find($userId);
        if (!$user || empty($user->active_plan)) return null;
        $userPlanNorm = $this->normalizePlanId((string)$user->active_plan);
        // Cari ke semua paket active, lalu compare normalized name
        $allPaket = PaketLangganan::where('status', 'active')->get();
        foreach ($allPaket as $paket) {
            if ($this->normalizePlanId((string)$paket->name) === $userPlanNorm) {
                return $paket;
            }
        }
        return null;
    }

    // Helper PRIORITAS 1: Hitung batas kuota menit AV HARIAN untuk anak tertentu.
    // PRIORITAS (dari tertinggi ke rendah):
    //   1. Jika profil_anak.av_minutes_daily_override > 0 → pakai nilai ini (admin override khusus per anak)
    //   2. Jika paketan user ada → paket.batas_menit_av_harian
    //   3. Jika tidak ada data paket apapun → default 0 (unlimited TAPI ini JUJUR — karena user memang tidak punya paket terasosiasi)
    private function getBatasPaketKuotaAnak(int $userId, ProfilAnak $anak): int
    {
        // Override per anak: selalu menang paling tinggi
        if (!empty($anak->av_minutes_daily_override) && (int)$anak->av_minutes_daily_override > 0) {
            return (int)$anak->av_minutes_daily_override;
        }
        // Ambil dari paket user
        $paket = $this->getPaketUser($userId);
        if ($paket !== null) {
            return (int)($paket->batas_menit_av_harian ?? 0);
        }
        // JUJUR fallback: tanpa asumsi (ZERO HARDCODE), return 0 (unlimited)
        return 0;
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
            // PRIORITAS 1: Ambil batas menit KUOTA HARIAN SESUAI PAKET LANGGANAN user + override per anak (bukan hardcode 0 unlimited!)
            $defaultPaketKuota = $this->getBatasPaketKuotaAnak($userId, $anak);

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

            // SELALU sinkronisasi paket_kuota_menit_harian ke nilai TERBARU dari helper 3-layer priority
            // (override anak > paket user sekarang > 0 jujur). Sebelumnya hanya sync jika total=0 — SALAH!
            // Contoh kasus user edit Family Pro batas 240 → 3 menit via halaman Master Paket ketika anak
            // sudah pakai 4 menit audio hari ini → row kuota NADIA tetep 240 STALE, beda dengan Dashboard.
            // AKIBAT: Monitor AV menampilkan batas 240 PALSU, Dashboard benar 3 — TIDAK KONSISTEN!
            // Kita BOLEH update batas kapanpun (tidak hilang akuntansi total_digunakan_menit), lalu recompute
            // otomatis sisa + persen + status dibawah.
            if ((int)$kuota->paket_kuota_menit_harian !== (int)$defaultPaketKuota) {
                $kuota->paket_kuota_menit_harian = $defaultPaketKuota;
                $mismatch_before_compute = true;
            } else {
                $mismatch_before_compute = false;
            }

            // ========== AUTO-SYNC INTEGRITAS KUOTA (PENTING!): SELALU RECOMPUTE & JIKA MISMATCH SAVE ==========
            $realAudio = (int)$kuota->digunakan_audio_menit;
            $realVideo = (int)$kuota->digunakan_video_menit;
            $realTotal = $realAudio + $realVideo;
            // PENTING: pakai defaultPaketKuota (NILAI ASLI DARI HELPER, SUMBER SAMA DENGAN DASHBOARD!)
            // BUKAN lagi $kuota->paket_kuota_menit_harian (karena bisa saja berbarengan ini kita update diatas & nilai tersimpan tapi variable local tidak reflect)
            $realBatas = (int)$defaultPaketKuota;
            $realSisa = $realBatas === 0 ? -1 : max(0, $realBatas - $realTotal);
            $realPersen = $realBatas > 0 ? min(100, (int)round(($realTotal / $realBatas) * 100)) : 0;

            // Cek mismatch dan auto-save agar DB kembali sinkron kedepannya
            // PENTING: HANYA simpan field yang BENAR-BENAR ADA di real tabel (cek migration 000005).
            // Field `persentase_terpakai` TIDAK PERNAH ada di schema (bukan kolom DB asli), jadi
            // kita JANGAN assign ke model (SQLSTATE 42S22 1054 Unknown column). Cukup compute saja
            // untuk response endpoint.
            $mismatch = $mismatch_before_compute;
            if ((int)$kuota->total_digunakan_menit !== $realTotal) {
                $kuota->total_digunakan_menit = $realTotal;
                $mismatch = true;
            }
            if ((int)$kuota->sisa_kuota_menit !== $realSisa) {
                $kuota->sisa_kuota_menit = $realSisa;
                $mismatch = true;
            }
            if ($mismatch) {
                $kuota->save();
            }

            $result[] = [
                'profil_anak_id' => $anak->id,
                'nama_anak' => $anak->name,
                'device_model' => $anak->device_model ?? null,
                'tanggal' => $kuota->tanggal,
                'paket_kuota_menit_harian' => $realBatas,
                'digunakan_audio_menit' => $realAudio,
                'digunakan_video_menit' => $realVideo,
                // PENTING: Pakai $realTotal (hasil penjumlahan audio+video), BUKAN $kuota->total_digunakan_menit (bisa stale mismatch)!
                'total_digunakan_menit' => $realTotal,
                'sisa_kuota_menit' => $realSisa,
                'persentase_terpakai' => $realPersen,
                'last_mode' => $kuota->last_mode,
                'last_started_at' => $kuota->last_started_at,
                'last_stopped_at' => $kuota->last_stopped_at,
                'last_sesi_id' => $kuota->last_sesi_id,
                // Status badge juga dihitung berdasarkan nilai computed (bukan row DB mentah)
                'status_kuota' => $this->computeStatusKuotaFromValues($realBatas, $realTotal),
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

    // Helper hitung label status kuota (untuk UI badge) — dari Model
    private function computeStatusKuota(KuotaAvMonitorHarian $k): string
    {
        return $this->computeStatusKuotaFromValues(
            (int)$k->paket_kuota_menit_harian,
            (int)($k->total_digunakan_menit ?? ((int)$k->digunakan_audio_menit + (int)$k->digunakan_video_menit))
        );
    }

    // Helper hitung label status kuota (versi RAW VALUES — tidak perlu instance Model)
    // Dipakai setelah recompute realBatas & realTotal dari audio+video
    private function computeStatusKuotaFromValues(int $batasMenit, int $totalDigunakanMenit): string
    {
        // Rule 1: Batas = 0 → Unlimited (tanpa batas harian)
        if ($batasMenit <= 0) return 'unlimited';
        // Rule 2: Total sudah menyentuh atau melebihi batas → HABIS
        if ($totalDigunakanMenit >= $batasMenit) return 'habis';
        // Rule 3: Persentase >= 80% → Hampir Habis (warning amber)
        $persen = ($totalDigunakanMenit / $batasMenit) * 100;
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

        // ========= PRIORITAS 1: PRE-VALIDASI PAKET SEBELUM INSERT SESION (STOP USER BYPASS UI DI CLIENT) =========
        // STEP A: Cek paket user memiliki fitur untuk mode yang diminta
        $paket = $this->getPaketUser($userId);
        $mode = $valid['mode'];
        if ($paket !== null) {
            // Premium: one_way_audio=true, live_camera=false → jika user request camera_live → 403 upgrade ke Family Pro
            if ($mode === 'audio_listen' && !(bool)$paket->one_way_audio) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paket langganan Anda TIDAK mendukung fitur Audio Listen (One-Way Audio). Silakan upgrade paket Premium atau Family Pro.',
                    'error_code' => 'PAKET_TIDAK_SUPPORT_AUDIO',
                    'paket_aktif' => $paket->name,
                ], 403);
            }
            if ($mode === 'camera_live' && !(bool)$paket->live_camera) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paket langganan Anda TIDAK mendukung fitur Live Camera. Silakan upgrade ke Family Pro.',
                    'error_code' => 'PAKET_TIDAK_SUPPORT_CAMERA',
                    'paket_aktif' => $paket->name,
                ], 403);
            }
        }
        // Jika paket user tidak ada (paket = null) atau batas_menit_av_harian = 0 tapi feature diizinkan? Cek sisa kuota dibawah.

        // STEP B: Cek kuota HARI INI untuk anak ini. Jika SISA KUOTA === 0 (habis total dipakai) → BLOCK total.
        $paketKuotaTerpakai = $this->getBatasPaketKuotaAnak($userId, $anak);
        // Ambil row kuota hari ini (tanpa create dulu untuk cek)
        $kuotaForQuotaCheck = KuotaAvMonitorHarian::where('profil_anak_id', $anak->id)
            ->where('tanggal', $tanggalToday)
            ->first();
        $totalDigunakanSaatIni = (int)($kuotaForQuotaCheck?->total_digunakan_menit ?? 0);
        $sisaKuotaSaatIni = $paketKuotaTerpakai === 0
            ? -1 // unlimited
            : max(0, $paketKuotaTerpakai - $totalDigunakanSaatIni);

        // Blok HANYA jika memang BUKAN unlimited ($paketKuotaTerpakai > 0) DAN sisa = 0
        // Jika $paketKuotaTerpakai = 0 (unlimited / belum diatur) → TIDAK diblokir disini (sudah dicek paket feature flag di STEP A)
        if ($paketKuotaTerpakai > 0 && $sisaKuotaSaatIni === 0) {
            return response()->json([
                'success' => false,
                'message' => "Kuota Audio & Video hari ini HABIS! Anda sudah memakai {$totalDigunakanSaatIni} menit dari batas paket {$paketKuotaTerpakai} menit/hari. Silakan gunakan Tambah Kuota Manual, Upgrade paket, atau tunggu besok kuota reset otomatis.",
                'error_code' => 'KUOTA_AV_HARIAN_HABIS',
                'paket_kuota_menit_harian' => $paketKuotaTerpakai,
                'total_digunakan_menit' => $totalDigunakanSaatIni,
                'sisa_kuota_menit' => 0,
                'mode' => $mode,
            ], 403);
        }
        // ========= END OF PRE-VALIDASI PAKET + KUOTA HABIS =========

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
                    'paket_kuota_menit_harian' => $paketKuotaTerpakai, // sesuai paket user + override per anak (bukan hardcode 0!)
                    'digunakan_audio_menit' => 0,
                    'digunakan_video_menit' => 0,
                    'total_digunakan_menit' => 0,
                    'sisa_kuota_menit' => ($paketKuotaTerpakai > 0 ? $paketKuotaTerpakai : -1),
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

        // Untuk kebutuhan ambil batas paket default: kita butuh user_id & object anak.
        // Bisa dari relasi $sesi->profilAnak, dan user_id = profilAnak.user_id
        $anakForFinalize = $sesi->profilAnak;
        if (!$anakForFinalize) {
            $anakForFinalize = ProfilAnak::find((int)$sesi->profil_anak_id);
        }
        $userIdFinalize = $anakForFinalize?->user_id ?? (int)$sesi->user_id_yg_memantau;
        $defaultBatas = 0;
        if ($anakForFinalize && $userIdFinalize > 0) {
            $defaultBatas = $this->getBatasPaketKuotaAnak($userIdFinalize, $anakForFinalize);
        }

        // Tambahkan durasi ke kuota sesuai mode
        $tanggalSesi = $started->toDateString();
        $kuota = KuotaAvMonitorHarian::firstOrCreate(
            ['profil_anak_id' => $sesi->profil_anak_id, 'tanggal' => $tanggalSesi],
            [
                'paket_kuota_menit_harian' => $defaultBatas, // BUKAN hardcode 0, ambil dari paket user sesuai helper
                'digunakan_audio_menit' => 0,
                'digunakan_video_menit' => 0,
                'total_digunakan_menit' => 0,
                'sisa_kuota_menit' => ($defaultBatas > 0 ? $defaultBatas : -1),
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
        $defaultBatasAv4 = $this->getBatasPaketKuotaAnak($userId, $anak);
        $kuota = KuotaAvMonitorHarian::firstOrCreate(
            ['profil_anak_id' => $anak->id, 'tanggal' => $tanggalToday],
            [
                'paket_kuota_menit_harian' => $defaultBatasAv4,
                'digunakan_audio_menit' => 0,
                'digunakan_video_menit' => 0,
                'total_digunakan_menit' => 0,
                'sisa_kuota_menit' => ($defaultBatasAv4 > 0 ? $defaultBatasAv4 : -1),
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
