<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Exception\FirebaseException;
use Kreait\Firebase\Exception\InvalidArgumentException;
use Kreait\Firebase\Exception\MessagingException;
use Kreait\Firebase\Messaging\AndroidConfig;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Kreait\Firebase\Messaging\WebPushConfig;
use App\Models\ProfilAnak;
use App\Models\User;

// Layanan push notifikasi FCM (Firebase Cloud Messaging HTTP v1) via Service Account JSON
// DIPAKAI UNTUK: push Geofence enter/exit, Broadcast pesan, remote lock device, notifikasi chat baru
class FcmPushService
{
    protected ?Messaging $messaging = null;
    protected bool $ready = false;
    protected ?string $lastError = null;

    public function __construct()
    {
        $credPath = env('FIREBASE_CREDENTIALS');
        if (empty($credPath) || !file_exists($credPath)) {
            $this->ready = false;
            $this->lastError = 'File Service Account Firebase tidak ditemukan: ' . ($credPath ?? '(null)');
            Log::warning('[FcmPushService] ' . $this->lastError . '. FCM push notifikasi DITONDA sampai file JSON di-upload.');
            return;
        }

        try {
            $projectId = env('FCM_PROJECT_ID');
            $factory = (new Factory())->withServiceAccount($credPath);
            if (!empty($projectId)) {
                $factory = $factory->withProjectId($projectId);
            }
            $this->messaging = $factory->createMessaging();
            $this->ready = true;
            $this->lastError = null;
        } catch (\Throwable $e) {
            $this->ready = false;
            $this->lastError = 'Init Factory Gagal: ' . $e->getMessage();
            Log::error('[FcmPushService] Init Gagal: ' . $e->getMessage() . ' | file=' . $credPath);
        }
    }

    // Mengecek apakah layanan siap dipakai (credential valid & messaging instance created)
    public function isReady(): bool
    {
        return $this->ready && $this->messaging !== null;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    // Push notifikasi ke 1 perangkat Android Companion Anak (token fcm_token ProfilAnak)
    // Return: ['success' => bool, 'message_id' => string|null, 'error' => string|null, 'target' => 'android']
    public function pushToAndroid(string $fcmToken, string $title, string $body, array $data = []): array
    {
        if (!$this->isReady() || empty(trim($fcmToken))) {
            return [
                'success' => false,
                'message_id' => null,
                'error' => $this->lastError ?? 'FCM tidak siap / token kosong',
                'target' => 'android',
                'skipped' => true,
            ];
        }

        try {
            $msg = CloudMessage::withTarget('token', trim($fcmToken))
                ->withNotification(Notification::create($title, $body))
                ->withAndroidConfig(AndroidConfig::fromArray([
                    'priority' => 'high',
                    'ttl' => '3600s',
                    'notification' => [
                        'channel_id' => 'PENGASUHAN_CH',
                        'click_action' => 'OPEN_DASHBOARD',
                        'sound' => 'default',
                        'default_vibrate_timings' => true,
                        'default_light_settings' => true,
                        'visibility' => 1,
                        'notification_priority' => 'PRIORITY_MAX',
                    ],
                ]))
                ->withData(array_merge([
                    'event_type' => $data['event_type'] ?? 'general',
                    'received_at' => now()->toIso8601String(),
                    'title' => $title,
                    'body' => $body,
                ], $data));

            $result = $this->messaging->send($msg);
            $messageId = $result['name'] ?? null;
            Log::debug('[FcmPushService] Android Push OK: token_prefix=' . substr($fcmToken, 0, 6) . '... message_id=' . ($messageId ?? 'N/A'));
            return [
                'success' => true,
                'message_id' => $messageId,
                'error' => null,
                'target' => 'android',
            ];
        } catch (MessagingException | FirebaseException | InvalidArgumentException $e) {
            Log::error('[FcmPushService] Android Push GAGAL: ' . get_class($e) . ' | ' . $e->getMessage() . ' | token_prefix=' . substr($fcmToken, 0, 6) . '...');
            return [
                'success' => false,
                'message_id' => null,
                'error' => $e->getMessage(),
                'target' => 'android',
            ];
        } catch (\Throwable $e) {
            Log::critical('[FcmPushService] Android Push UNEXPECTED ERROR: ' . get_class($e) . ' | ' . $e->getMessage());
            return [
                'success' => false,
                'message_id' => null,
                'error' => $e->getMessage(),
                'target' => 'android',
            ];
        }
    }

    // Push notifikasi ke Web Browser Orang Tua (token web_fcm_token User row)
    // Catatan: VAPID public/private key pair di Firebase Console di-inject otomatis dari Service Account JSON,
    // tidak perlu set manual di header WebPushConfig (cukup set fcm_options.link untuk deep link ke halaman terkait)
    // Return format sama dengan pushToAndroid, target = 'web'
    public function pushToWeb(string $webFcmToken, string $title, string $body, array $data = []): array
    {
        if (!$this->isReady() || empty(trim($webFcmToken))) {
            return [
                'success' => false,
                'message_id' => null,
                'error' => $this->lastError ?? 'FCM tidak siap / token kosong',
                'target' => 'web',
                'skipped' => true,
            ];
        }

        try {
            $clickUrl = $data['click_url'] ?? '/dashboard';
            // Pastikan click_url absolute mulai dari domain (jika user input path mulai dengan /, biarkan; Firebase FCM Web Push fcm_options.link support path)
            $msg = CloudMessage::withTarget('token', trim($webFcmToken))
                ->withNotification(Notification::create($title, $body))
                ->withWebPushConfig(WebPushConfig::fromArray([
                    'headers' => [
                        'Urgency' => 'high',
                        'TTL' => '3600',
                    ],
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                        'icon' => '/logo/litensilogo.png',
                        'badge' => '/logo/litensilogo.png',
                        'requireInteraction' => true,
                        'silent' => false,
                        'vibrate' => [200, 100, 200, 100, 200],
                    ],
                    'fcm_options' => [
                        'link' => $clickUrl,
                        'analytics_label' => $data['event_type'] ?? 'web_notif',
                    ],
                ]))
                ->withData(array_merge([
                    'event_type' => $data['event_type'] ?? 'general',
                    'received_at' => now()->toIso8601String(),
                    'click_url' => $clickUrl,
                ], $data));

            $result = $this->messaging->send($msg);
            $messageId = $result['name'] ?? null;
            Log::debug('[FcmPushService] Web Push OK: token_prefix=' . substr($webFcmToken, 0, 8) . '... message_id=' . ($messageId ?? 'N/A'));
            return [
                'success' => true,
                'message_id' => $messageId,
                'error' => null,
                'target' => 'web',
            ];
        } catch (MessagingException | FirebaseException | InvalidArgumentException $e) {
            Log::error('[FcmPushService] Web Push GAGAL: ' . get_class($e) . ' | ' . $e->getMessage() . ' | token_prefix=' . substr($webFcmToken, 0, 8) . '...');
            return [
                'success' => false,
                'message_id' => null,
                'error' => $e->getMessage(),
                'target' => 'web',
            ];
        } catch (\Throwable $e) {
            Log::critical('[FcmPushService] Web Push UNEXPECTED ERROR: ' . get_class($e) . ' | ' . $e->getMessage());
            return [
                'success' => false,
                'message_id' => null,
                'error' => $e->getMessage(),
                'target' => 'web',
            ];
        }
    }

    // Broadcast notifikasi ke SEMUA perangkat milik user tertentu:
    //   → SEMUA ProfilAnak milik $userId yang punya fcm_token tidak kosong (Android Companion Anak)
    //   → User row milik $userId sendiri yang punya web_fcm_token tidak kosong (Browser Orang Tua Web)
    // Digunakan untuk: Geofence enter/exit alert, Remote Lock response, Broadcast pesan R4, dll.
    // Return summary: ['total_targets', 'android_sent', 'android_failed', 'web_sent', 'web_failed', 'errors' => array(...), 'event_type']
    public function broadcastUserChildren(int $userId, string $eventType, array $payload): array
    {
        $summary = [
            'user_id' => $userId,
            'event_type' => $eventType,
            'total_targets' => 0,
            'android_sent' => 0,
            'android_failed' => 0,
            'web_sent' => 0,
            'web_failed' => 0,
            'skipped_ready_false' => 0,
            'errors' => [],
            'fcm_ready' => $this->isReady(),
        ];

        if (!$this->isReady()) {
            Log::warning('[FcmPushService] broadcastUserChildren DILEWATI (FCM belum ready). userId=' . $userId . ' event=' . $eventType);
            $summary['skipped_ready_false'] = 1;
            return $summary;
        }

        $title = $payload['title'] ?? 'Notifikasi Litensi Kids';
        $body = $payload['body'] ?? 'Ada notifikasi baru untuk Anda.';
        $extraData = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : [];
        $extraData['event_type'] = $eventType;

        // ==== ANDROID: Dapatkan semua fcm_token ProfilAnak milik userId ====
        $anakRows = ProfilAnak::where('user_id', $userId)
            ->whereNotNull('fcm_token')
            ->where('fcm_token', '!=', '')
            ->select(['id', 'name', 'fcm_token'])
            ->get();

        foreach ($anakRows as $anak) {
            $summary['total_targets']++;
            // Tambah meta anak ke payload data untuk client side filter
            $perAnakData = array_merge($extraData, [
                'profil_anak_id' => $anak->id,
                'child_name' => $anak->name,
            ]);
            $res = $this->pushToAndroid($anak->fcm_token, $title, $body, $perAnakData);
            if ($res['success']) {
                $summary['android_sent']++;
            } else {
                $summary['android_failed']++;
                if (!empty($res['error'])) {
                    $summary['errors'][] = '[android ' . ($anak->name ?? 'anak#' . $anak->id) . '] ' . $res['error'];
                }
            }
        }

        // ==== WEB: Dapatkan User row milik userId ====
        $userRow = User::find($userId);
        if ($userRow && !empty($userRow->web_fcm_token) && trim($userRow->web_fcm_token) !== '') {
            $summary['total_targets']++;
            $res = $this->pushToWeb($userRow->web_fcm_token, $title, $body, $extraData);
            if ($res['success']) {
                $summary['web_sent']++;
            } else {
                $summary['web_failed']++;
                if (!empty($res['error'])) {
                    $summary['errors'][] = '[web user#' . $userId . '] ' . $res['error'];
                }
            }
        }

        if ($summary['total_targets'] === 0) {
            Log::info('[FcmPushService] broadcastUserChildren TIDAK ADA TARGET TERDAFTAR (tidak ada token) untuk userId=' . $userId . ' event=' . $eventType);
        } else {
            $totalSent = $summary['android_sent'] + $summary['web_sent'];
            $totalFailed = $summary['android_failed'] + $summary['web_failed'];
            Log::info('[FcmPushService] broadcastUserChildren DONE: userId=' . $userId . ' event=' . $eventType . ' targets=' . $summary['total_targets'] . ' sent=' . $totalSent . ' failed=' . $totalFailed);
        }
        return $summary;
    }
}
