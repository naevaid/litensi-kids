<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\KuotaAvMonitorHarian;
use App\Models\PaketLangganan;
use App\Models\PermintaanWaktuLayar;
use App\Models\ProfilAnak;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Modul R3: Chat Inbox Orang Tua ↔ Anak + Permintaan Tambah Waktu Layar (Tab 1 /inbox)
// Endpoint: CH1 (list threads), CH2 (list messages), CH3 (send message), CH4 (grant waktu layar atomic)
class ChatInboxController extends Controller
{
    // Helper ZERO HARDCODE — copy pattern MonitorAVController agar konsisten
    private function getSafeUserId(Request $request): ?int
    {
        $userId = $request->input('user_id');
        if (empty($userId) || !is_numeric($userId)) return null;
        return (int) $userId;
    }

    // Helper normalisasi paket: Title Case ↔ snake_case (sama pattern PaketController/MonitorAV)
    private function normalizePlanId(string $raw): string
    {
        $norm = trim((string)$raw);
        $norm = preg_replace('/[^a-zA-Z0-9]+/', '_', $norm);
        $norm = preg_replace('/_+/', '_', $norm);
        return strtolower(trim($norm, '_'));
    }

    // Helper ambil paket user berdasarkan active_plan string match (TANPA foreign key)
    private function getPaketUser(int $userId): ?PaketLangganan
    {
        $user = User::find($userId);
        if (!$user || empty($user->active_plan)) return null;
        $userPlanNorm = $this->normalizePlanId((string)$user->active_plan);
        $allPaket = PaketLangganan::where('status', 'active')->get();
        foreach ($allPaket as $paket) {
            if ($this->normalizePlanId((string)$paket->name) === $userPlanNorm) {
                return $paket;
            }
        }
        return null;
    }

    // Helper 3 level priority batas kuota AV: override anak > paket user > fallback 0 unlimited
    private function getBatasPaketKuotaAnak(int $userId, ProfilAnak $anak): int
    {
        if (!empty($anak->av_minutes_daily_override) && (int)$anak->av_minutes_daily_override > 0) {
            return (int)$anak->av_minutes_daily_override;
        }
        $paket = $this->getPaketUser($userId);
        if ($paket !== null) {
            return (int)($paket->batas_menit_av_harian ?? 0);
        }
        return 0;
    }

    /**
     * CH1 — GET /chat/threads
     * List semua thread per anak milik user: latest message, unread count, battery/device info real.
     * ZERO HARDCODE: battery_level diambil langsung dari profil_anak (bukan hardcode 84%!).
     */
    public function getThreads(Request $request): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $anakList = ProfilAnak::where('user_id', $userId)
            ->orderBy('last_active', 'desc')
            ->orderBy('name')
            ->get();

        if ($anakList->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $threads = [];
        foreach ($anakList as $anak) {
            // Ambil pesan TERAKHIR di thread ini (apapun sendernya)
            $latestMsg = ChatMessage::where('profil_anak_id', $anak->id)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->first();

            // Hitung unread: pesan dari anak/system yang BELUM dibaca oleh orang tua
            $unreadCount = ChatMessage::where('profil_anak_id', $anak->id)
                ->whereIn('sender', ['child', 'system'])
                ->where('is_read', false)
                ->count();

            $threads[] = [
                'thread_id' => 'anak_' . $anak->id,
                'anak_id' => $anak->id,
                'nama_anak' => $anak->name,
                'device_model' => $anak->device_model,
                'status_online' => (bool)$anak->is_online,
                'battery' => (int)$anak->battery_level,
                'avatar' => $anak->avatar,
                'last_message_text' => $latestMsg?->text,
                'last_message_sender' => $latestMsg?->sender,
                'last_time' => $latestMsg?->created_at?->toISOString(),
                'unread_count' => (int)$unreadCount,
                'permintaan_pending_count' => PermintaanWaktuLayar::where('profil_anak_id', $anak->id)
                    ->where('status', 'pending')
                    ->count(),
            ];
        }

        return response()->json(['success' => true, 'data' => $threads]);
    }

    /**
     * CH2 — GET /chat/{anakId}/messages?page=1&perPage=50
     * List pesan pagination di thread anak tertentu (gate ownership: hanya user milik anak).
     * Urut DESC (terbaru paling atas, frontend bisa reverse sendiri jika perlu).
     */
    public function getMessages(Request $request, $anakId): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null || !is_numeric($anakId) || (int)$anakId <= 0) {
            return response()->json(['success' => false, 'message' => 'Parameter tidak valid.'], 400);
        }
        $anakIdInt = (int)$anakId;

        $anak = ProfilAnak::where('id', $anakIdInt)
            ->whereHas('user', fn($q) => $q->where('id', $userId))
            ->first();
        if (!$anak) {
            return response()->json(['success' => false, 'message' => 'Profil Anak tidak ditemukan atau bukan milik user ini.'], 404);
        }

        $page = max(1, (int)$request->input('page', 1));
        $perPage = max(1, min(200, (int)$request->input('perPage', 50)));
        $offset = ($page - 1) * $perPage;

        $total = ChatMessage::where('profil_anak_id', $anakIdInt)->count();
        $messages = ChatMessage::where('profil_anak_id', $anakIdInt)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->offset($offset)
            ->limit($perPage)
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'sender' => $msg->sender,
                    'text' => $msg->text,
                    'attachments' => $msg->attachments,
                    'is_read' => (bool)$msg->is_read,
                    'permintaan_waktu_id' => $msg->permintaan_waktu_id,
                    'timestamp' => $msg->created_at->toISOString(),
                ];
            })
            ->values();

        $hasNext = ($offset + $perPage) < $total;

        // Auto tandai SEMUA pesan di thread ini sebagai "sudah dibaca" (karena user buka threadnya)
        ChatMessage::where('profil_anak_id', $anakIdInt)
            ->whereIn('sender', ['child', 'system'])
            ->where('is_read', false)
            ->update(['is_read' => true, 'updated_at' => Carbon::now()]);

        return response()->json([
            'success' => true,
            'data' => [
                'list' => $messages,
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'has_next' => $hasNext,
                'next_cursor' => $hasNext ? ($page + 1) : null,
                'anak' => [
                    'id' => $anak->id,
                    'name' => $anak->name,
                    'avatar' => $anak->avatar,
                    'device_model' => $anak->device_model,
                    'battery' => (int)$anak->battery_level,
                ],
            ],
        ]);
    }

    /**
     * CH3 — POST /chat/{anakId}/send
     * Orang tua kirim pesan teks ke anak (insert row sender=parent).
     * Return message object yang baru disimpan (bukan state lokal!).
     */
    public function sendMessage(Request $request, $anakId): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null || !is_numeric($anakId) || (int)$anakId <= 0) {
            return response()->json(['success' => false, 'message' => 'Parameter tidak valid.'], 400);
        }
        $anakIdInt = (int)$anakId;

        $valid = $request->validate([
            'text' => 'required|string|min:1|max:2000',
            'attachments' => 'nullable|array',
        ]);

        $anak = ProfilAnak::where('id', $anakIdInt)
            ->whereHas('user', fn($q) => $q->where('id', $userId))
            ->first();
        if (!$anak) {
            return response()->json(['success' => false, 'message' => 'Profil Anak tidak ditemukan atau bukan milik user ini.'], 404);
        }

        $msg = ChatMessage::create([
            'profil_anak_id' => $anakIdInt,
            'user_id_orangtua' => $userId,
            'sender' => 'parent',
            'text' => $valid['text'],
            'attachments' => $valid['attachments'] ?? null,
            'is_read' => false,
            'permintaan_waktu_id' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil dikirim.',
            'data' => [
                'id' => $msg->id,
                'sender' => $msg->sender,
                'text' => $msg->text,
                'attachments' => $msg->attachments,
                'is_read' => (bool)$msg->is_read,
                'timestamp' => $msg->created_at->toISOString(),
                'saved_to_db' => true,
            ],
        ], 201);
    }

    /**
     * CH4 — POST /chat/{anakId}/grant-waktu-layar
     * Orang tua GRANT TAMBAH WAKTU LAYAR ke anak (Quick Button 5/15/30 menit).
     * ATOMIC TRANSACTION 3 STEP:
     *   (1) Update permintaan_waktu_layar status → approved (jika permintaan_id diberikan)
     *   (2) TAMBAH KUOTA AV HARIAN untuk anak (sama logic AV4 /monitor/kuota/tambah-kuota-manual)
     *   (3) INSERT system message "Orang tua memberikan tambahan waktu X menit" ke thread
     * Jika salah 1 step gagal → ROLLBACK SEMUA (tidak ada kuota bertambah tanpa pesan / sebaliknya).
     */
    public function grantWaktuLayar(Request $request, $anakId): JsonResponse
    {
        $userId = $this->getSafeUserId($request);
        if ($userId === null || !is_numeric($anakId) || (int)$anakId <= 0) {
            return response()->json(['success' => false, 'message' => 'Parameter tidak valid.'], 400);
        }
        $anakIdInt = (int)$anakId;

        $valid = $request->validate([
            'durasi_menit' => 'required|integer|min:1|max:1440', // Maks 24 jam
            'catatan' => 'nullable|string|max:500',
            'permintaan_waktu_id' => 'nullable|exists:permintaan_tambah_waktu_layar,id',
            'catatan_orangtua' => 'nullable|string|max:500',
        ]);

        $anak = ProfilAnak::where('id', $anakIdInt)
            ->whereHas('user', fn($q) => $q->where('id', $userId))
            ->first();
        if (!$anak) {
            return response()->json(['success' => false, 'message' => 'Profil Anak tidak ditemukan atau bukan milik user ini.'], 404);
        }

        $durasi = (int)$valid['durasi_menit'];
        $catatan = trim($valid['catatan'] ?? '');
        $permintaanId = !empty($valid['permintaan_waktu_id']) ? (int)$valid['permintaan_waktu_id'] : null;
        $catatanOrtu = trim($valid['catatan_orangtua'] ?? '');

        DB::beginTransaction();
        try {
            // ───────── STEP 1: Update status permintaan (jika ada ID) ─────────
            $permintaanObj = null;
            if ($permintaanId !== null) {
                $permintaanObj = PermintaanWaktuLayar::where('id', $permintaanId)
                    ->where('profil_anak_id', $anakIdInt)
                    ->lockForUpdate()
                    ->first();
                if (!$permintaanObj) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'ID Permintaan Waktu tidak ditemukan atau bukan milik anak ini.'], 404);
                }
                $permintaanObj->status = 'approved';
                $permintaanObj->approved_by_user_id = $userId;
                $permintaanObj->approved_at = Carbon::now();
                if (!empty($catatanOrtu)) {
                    $permintaanObj->catatan_orangtua = $catatanOrtu;
                }
                $permintaanObj->save();
            }

            // ───────── STEP 2: Tambah Kuota AV Harian (SAMA LOGIC AV4) ─────────
            $tanggalToday = Carbon::now()->toDateString();
            $defaultBatas = $this->getBatasPaketKuotaAnak($userId, $anak);
            $kuota = KuotaAvMonitorHarian::firstOrCreate(
                ['profil_anak_id' => $anakIdInt, 'tanggal' => $tanggalToday],
                [
                    'paket_kuota_menit_harian' => $defaultBatas,
                    'digunakan_audio_menit' => 0,
                    'digunakan_video_menit' => 0,
                    'total_digunakan_menit' => 0,
                    'sisa_kuota_menit' => ($defaultBatas > 0 ? $defaultBatas : -1),
                ]
            );

            $sebelumKuota = [
                'paket_kuota_menit_harian' => $kuota->paket_kuota_menit_harian,
                'total_digunakan_menit' => $kuota->total_digunakan_menit,
                'sisa_kuota_menit' => $kuota->sisa_kuota_menit,
            ];
            $kuota->paket_kuota_menit_harian += $durasi;
            // Update sisa: jika batas 0 (unlimited) → tetap -1, jika batas >0 → compute ulang (sisa bertambah)
            if ($kuota->paket_kuota_menit_harian === 0) {
                $kuota->sisa_kuota_menit = -1;
            } else {
                $kuota->sisa_kuota_menit = max(0, (int)$kuota->paket_kuota_menit_harian - (int)$kuota->total_digunakan_menit);
            }
            $kuota->save();

            // ───────── STEP 3: Kirim System Message ke thread ─────────
            $textSystem = "Orang tua memberikan tambahan waktu layar {$durasi} menit.";
            if (!empty($catatan)) {
                $textSystem .= " Catatan: {$catatan}";
            } elseif (!empty($catatanOrtu)) {
                $textSystem .= " Catatan: {$catatanOrtu}";
            }
            $sysMsg = ChatMessage::create([
                'profil_anak_id' => $anakIdInt,
                'user_id_orangtua' => $userId,
                'sender' => 'system',
                'text' => $textSystem,
                'attachments' => null,
                'is_read' => false,
                'permintaan_waktu_id' => $permintaanId,
            ]);

            // Hitung waktu berlaku sampai
            $berlakuSampai = Carbon::now()->addMinutes($durasi);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Berhasil menambah {$durasi} menit waktu layar untuk {$anak->name}.",
                'data' => [
                    'granted_menit' => $durasi,
                    'berlaku_sampai_jam' => $berlakuSampai->toISOString(),
                    'anak_id' => $anak->id,
                    'nama_anak' => $anak->name,
                    'permintaan_waktu_id' => $permintaanId,
                    'permintaan_status_sebelum' => $permintaanObj?->getOriginal('status'),
                    'permintaan_status_sesudah' => $permintaanObj?->status,
                    'kuota_sebelum' => $sebelumKuota,
                    'kuota_sesudah' => [
                        'paket_kuota_menit_harian' => $kuota->paket_kuota_menit_harian,
                        'total_digunakan_menit' => $kuota->total_digunakan_menit,
                        'sisa_kuota_menit' => $kuota->sisa_kuota_menit,
                    ],
                    'system_message_id' => $sysMsg->id,
                    'system_message_text' => $sysMsg->text,
                ],
            ], 200);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal Grant Waktu Layar. Rollback otomatis.',
                'error_detail' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
