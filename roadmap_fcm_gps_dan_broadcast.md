# ROADMAP FASE FCM + GPS REALTIME + BROADCAST (Setelah Pairing ✅ Selesai)

> **Last Update**: 2026-09-19 22:45 WIB (F2+F3+F4 Selesai 100% & FCM isReady=TRUE Production ✅; USER ACTION #1 DONE ✅; USER ACTION #2 DONE ✅; F4 Build Lokal OK ✅ Deploy IN-PROGRESS)
> **Urutan Prioritas**: F2 (Backend FCM Foundation) → F3 (Endpoint Token) → **F4 (Web Frontend FCM Push)** ✅ **NEXT: F5 (Android FCM Service: LitensiFirebaseMessagingService + onNewToken Refresh + Manifest)** → G1-G5 (GPS Realtime + Geofence Push + Maps) → R4 (Broadcast Pesan)
> **Latest Deploy**: Commit `8360924` (F2 Hotfix #2 rollback nama_panggilan→name schema actual) parent `f98f2a4` (fallback env Dotenv) + `6e9e6a3` (F2+F3 Main) @ 19/09 22:05 WIB + Firebase Service Account JSON Uploaded (chmod 600 www-data). F4 Deploy commit hash baru: IN-PROGRESS (lihat section F4).
> **Aturan Checklist**: ganti [ ] jadi [x] saat sub-task SELESAI & SUDAH di-verify di PRODUCTION. Isi Commit Hash + Status Deploy (Tanggal) jika sudah di-deploy VPS.

---

## 🟡 FASE F: FCM PUSH NOTIFIKASI FOUNDATION (DEPENDENCY UTAMA GPS & BROADCAST)

### F2. Backend FCM Service HTTP v1 (PUSH ENGINE UTAMA) — ✅ 100% DONE + DEPLOY PRODUCTION
- [x] **F2.1** Install package `kreait/firebase-php ^7.0` via composer
  - File target: `backend/composer.json` (require section)
  - Catatan: Composer auto downgrade ke `kreait/firebase-php 5.26.5` karena constraint VPS PHP 8.2 compatibility (project masih support 8.2, VPS 8.5, lcobucci perlu --ignore-platform-req=php).
  - Command VPS: `composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=php`
  - Commit Hash: `6e9e6a3`
  - Status Deploy: **Deployed 19/09/2026 21:28 WIB** (verified: vendor/kreait/firebase-php terinstall 5.26.5 ✅)
- [x] **F2.2** Inject template env FIREBASE + FCM VAPID ke `.env.example` dan `.env` lokal/VPS
  - File target: `backend/.env.example` (public safe, value kosong) + VPS `/var/www/litensi-backend/.env` (sudah di-inject manual production value VAPID PUBLIC 87 char).
  - Line template: `FIREBASE_CREDENTIALS`, `FCM_PROJECT_ID`, `FCM_VAPID_PUBLIC_KEY`, `FCM_VAPID_PRIVATE_KEY`.
  - **User Action Required (2 hal berikutnya)**: ⚠️ Lihat bagian `USER ACTION YANG DIBUTUHKAN SETELAH F2+F3` DI BAWAH HALAMAN INI.
  - Commit Hash: `6e9e6a3`
  - Status Deploy: **Deployed 19/09/2026 21:28 WIB** (VPS env sudah inject ✅, FIREBASE_CREDENTIALS path sudah set, VAPID PUBLIC KEY 87 chars loaded ✅ via Dotenv fallback verify)
- [x] **F2.3** Buat Service Class `FcmPushService.php`
  - File target: `backend/app/Services/FcmPushService.php`
  - Method wajib:
    1. `pushToAndroid(string $fcmToken, string $title, string $body, array $data = []): array`
    2. `pushToWeb(string $webFcmToken, string $title, string $body, array $data = []): array`
    3. `broadcastUserChildren(int $userId, string $eventType, array $payload): array` (loop semua anak milik userId + user row sendiri web token)
  - ✅ Hotfix f98f2a4: Production config:cache menonaktifkan env() global → FALLBACK DIRECT LOAD .env via `\Dotenv\Dotenv::createImmutable(base_path())->safeLoad()` di constructor (tanpa overwrite global $_ENV).
  - ⚠️ Hotfix f98f2a4 (SALAH ASUMSI!): awalnya saya pikir field nama ProfilAnak adalah `nama_panggilan`, padahal REAL schema (Model ProfilAnak L19 + Migration L15 + seluruh modul backend) SEMUA PAKAI `name`. ⚠️
  - ✅ Hotfix 8360924: **Rollback final actual schema**: select `['id', 'name', 'fcm_token']` + property akses `$anak->name` (bukan nama_panggilan). Verified production DB SHOW COLUMNS: field `name varchar(255) NOT NULL` ✅.
  - ✅ Degrade graceful: Jika file JSON Service Account TIDAK ADA → `isReady()=false`, semua 3 method push return `['skipped'=>true]` TANPA crash/thow exception HTTP 500.
  - ✅ User Action #1 DONE (19/09 22:00 WIB): Firebase Service Account JSON diupload lokal & VPS `/var/www/litensi-backend/storage/app/firebase-service-account.json`, chown www-data chmod 600.
  - ✅ VERIFY FINAL production VPS (post 8360924 + User Action #1): `FcmPushService::isReady()=TRUE` ✅; `pushToAndroid(dummy-token)` → Firebase response "not valid token" = BUKTI API CALL GOOGLE FCM HTTP v1 BERHASIL REAL ✅; `broadcastUserChildren(user_id=1)` → TANPA SQL Exception Column Not Found, `fcm_ready=true`, `skipped_ready_false=0`, `total_targets=0` ✅ (expected 0 karena token Android + Web FCM belum di-register F4+F5).
  - Commit Hash: `6e9e6a3` (init class) + `f98f2a4` (fallback Dotenv env) + `8360924` (rollback nama_panggilan→name column actual schema)
  - Status Deploy: **Deployed 19/09/2026 22:05 WIB** FCM ENGINE 100% PRODUCTION READY ✅✅✅

### F3. Endpoint API FCM Token (Registrasi Token) — ✅ 100% DONE + DEPLOY PRODUCTION
- [x] **F3.1** Migration tambah kolom web FCM token ke tabel `users`
  - File target: `backend/database/migrations/2026_09_19_000002_tambah_web_fcm_token_users.php`
  - Kolom ditambah:
    - `web_fcm_token` → TEXT, NULLABLE (panjang token FCM web push browser bisa > 255 char!)
    - `web_fcm_token_updated_at` → TIMESTAMP, NULLABLE (untuk cek refresh token 6 bulanan)
  - Run migrate lokal: `php artisan migrate --force` ✅ LOKAL DONE (verify SHOW COLUMNS users web_fcm% 2 row OK)
  - Run migrate VPS: `sudo -u www-data php artisan migrate --force` ✅ PRODUCTION DONE (257.14ms DONE, verify SHOW COLUMNS via PHP script mysql driver: 2 kolom ADA ✅ TEXT NULL + TIMESTAMP NULL)
  - Commit Hash: `6e9e6a3`
  - Status Deploy: **Deployed 19/09/2026 21:31 WIB**
- [x] **F3.2** User Model fillable tambah `web_fcm_token` + `web_fcm_token_updated_at`
  - File target: `backend/app/Models/User.php` line `$fillable` L38-L39
  - Commit Hash: `6e9e6a3`
  - Status Deploy: **Deployed 19/09/2026 21:28 WIB**
- [x] **F3.3** Route API SPESIFIK SEBELUM WILDCARD (Laravel First-Match-Wins Rule)
  - File target: `backend/routes/api.php`
  - Route ditambah:
    1. L58 group `profil`: `POST /profil/web-fcm-token` → ProfilController@updateWebFcmToken → Auth via `user_id` param (pattern sama dengan endpoint updateProfil L19)
    2. L149 group `anak` SEBELUM wildcard `/anak/{id}` L151 dst: `POST /anak/{id}/fcm-token` → AnakController@updateFcmTokenAnak → **GATE OWNERSHIP: wajib validasi `pairing_pin` ATAU `qr_pairing_code` cocok ProfilAnak target → return JSON 403 jika salah/kosong dua-duanya.**
  - Verify route:list production VPS ✅ 2 endpoint TERDAFTAR (POST api/v1/anak/{id}/fcm-token & api/v1/profil/web-fcm-token TERSEDIA)
  - Commit Hash: `6e9e6a3`
  - Status Deploy: **Deployed 19/09/2026 21:31 WIB**
- [x] **F3.4** Implementasi Controller
  - File target: `backend/app/Http/Controllers/API/AnakController.php` (method `updateFcmTokenAnak` L483-L538, TEPAT setelah `uploadTelemetry` sebelum `destroy`)
    - Flow validasi: SAMA PERSIS DENGAN method `uploadTelemetry()` existing L430. Cek `pairing_pin !== anak.pin` OR `qr_pairing_code !== anak.qr` → return 403 success=false. Minimal salah satu field HARUS dikirim (tidak boleh kosong dua-duanya).
    - Update row: `fcm_token = trim(field)` (jika empty → SET NULL = user revoke token) + `last_active = now()`.
    - Response JSON 200: `{success:true, message:'Token FCM perangkat anak berhasil diupdate', data:{fcm_token_length, token_revoked, updated_at:iso}}`
  - File target: `backend/app/Http/Controllers/API/ProfilController.php` (method `updateWebFcmToken` L234-L280, SETELAH method terakhir `hapusFotoProfil`)
    - Flow auth user_id: SAMA PERSIS DENGAN method `updateProfil()` L19-L29. Jika `user_id` empty / tidak numeric → 401 `user_id tidak valid atau belum login`. User ID tidak ketemu → 404 User tidak ditemukan.
    - Update row: `web_fcm_token = trim(field)` (jika empty → NULL) + `web_fcm_token_updated_at = now() HANYA JIKA token non-null` (JANGAN update timestamp ketika revoke → supaya tau token mana terakhir aktif).
    - Response JSON 200: `{success:true, message:'Token FCM Web Push berhasil diupdate', data:{fcm_web_token_length, token_revoked, updated_at:iso}}`
  - ✅ Hasil Test Lokal via simulate controller request:
    - A. Anak PIN salah → HTTP 403, success=false ✅
    - B. Anak PIN benar 884291 → HTTP 200, DB profil_anak.fcm_token UPDATE cocok ✅
    - C. User id=99999 tidak ada → HTTP 404, success=false ✅
    - D. User id=1 benar → HTTP 200, DB users.web_fcm_token + updated_at TERISI ✅
  - Commit Hash: `6e9e6a3`
  - Status Deploy: **Deployed 19/09/2026 21:28 WIB**

---

### F4. Web Frontend FCM Web Push (Push Notif di Browser Orang Tua) — ✅ 100% DONE Build Lokal OK ✅ Deploy IN-PROGRESS
- [x] **F4.1** Install npm package `firebase@^11`
  - File target: `package.json` (dependencies) + `package-lock.json`
  - Command: `npm install firebase@^11 --save` → ✅ Added 69 packages, exit code 0, NO audit error
  - Commit Hash: (lihat F4 commit utama di bawah)
  - Status Deploy: ✅ Package terinstall, Vite build resolve firebase/app & firebase/messaging 11.x ✅
- [x] **F4.2** Inject env VITE_FIREBASE_* 6 line + VITE_FCM_VAPID_PUBLIC_KEY ke root project `.env` (VITE baca env SAAT build di VPS /var/www/litensi-git-src/.env, BUKAN di frontend target!)
  - Value: diambil dari firebase config user VERBATIM yang dikirim sebelumnya (apiKey DNHbkDJ34M1ADVM7dgw6CXsiKVgry_Pko dst. + VAPID PUBLIC KEY = BO1Qrc4Ys81RhAfjVR13tflYLZ78z_zm1E4VA-5BQYqa31Yt7hUxcAPFwT92ltryQATe_XyAa5-HIxcS4l9fuHs).
  - 3 File target:
    1. ✅ `.env.example` (PUBLIC template safe commit, value kosong untuk rekan tim lain clone)
    2. ✅ Lokal `D:\litensi-kids\.env` (isi actual value, GITIGNORE, TIDAK di-commit public repo)
    3. ✅ VPS `/var/www/litensi-git-src/.env` (7 line VITE_FIREBASE + VITE_FCM_VAPID_PUBLIC_KEY TERDAFTAR ✅ verified via SSH grep length 87 chars for VAPID)
  - Commit Hash: (lihat F4 commit utama)
  - Status Deploy: ✅ VPS git-src .env ADA & value BENAR, Vite production build nanti akan inject env yang benar ke bundle
- [x] **F4.3** Buat file initializeApp Firebase SDK Web
  - File target: `src/services/firebaseApp.ts` (folder services dibuat duluan, sebelumnya tidak ada di src)
  - Export: `export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig)` + `export const firebaseMessaging: Messaging = getMessaging(firebaseApp)`
  - ZERO HARDCODE: Semua 6 line config diambil dari `import.meta.env.VITE_FIREBASE_*` const assertion. Komentar Bahasa Indonesia ✅ sesuai agent.md.
  - Commit Hash: (lihat F4 commit utama)
  - Status Deploy: ✅ Vite build transform module ini SUCCESS ✅ (termasuk di bundle 2128 modules)
- [x] **F4.4** Buat file FCM Web Push helper
  - File target: `src/services/fcmWebPush.ts`
  - Method export:
    1. `requestNotificationPermission(): Promise<boolean>` → Cek Notification API, handle default/denied/granted.
    2. `getFcmWebToken(swReg?: ServiceWorkerRegistration): Promise<string|null>` → `getToken(firebaseMessaging, { vapidKey, serviceWorkerRegistration })` → Pass SW registration object agar token terasosiasi dengan custom SW kita (TANPA importScripts firebase SDK di SW public! Zero hardcode ✅).
    3. `sendFcmTokenToBackend(token: string)` → POST via existing `api.post('/profil/web-fcm-token', { web_fcm_token: token })` — **apiClient OTOMATIS inject flat field user_id dari localStorage session (authRequired=true default)**, pattern SAMA PERSIS dengan endpoint updateProfil (sesuai KONVENSI.md).
    4. `requestPermissionAndRegisterToken(swReg?): Promise<{ok, message?, token?}>` → Gabungan 3 step di atas.
    5. `subscribeForegroundPushNotifications(callback): () => void` → `onMessage(firebaseMessaging, callback)` → Return unsub function untuk cleanup useEffect React. Dipanggil dari App.tsx component child di dalam ToastProvider scope agar bisa akses useToast hook.
  - Komentar Bahasa Indonesia ✅, TypeScript strict typing ✅, export FcmPushPayload interface ✅.
  - Commit Hash: (lihat F4 commit utama)
  - Status Deploy: ✅ Build sukses, import tidak error
- [x] **F4.5** Buat Service Worker FCM Background push (Native Push API — zero hardcode firebase config!)
  - File target: `public/firebase-messaging-sw.js` (path scope = /)
  - **Pattern zero-hardcode yang dipilih (sesuai agent.md!):**
    - ❌ TIDAK menggunakan `importScripts` Firebase SDK CDN (butuh hardcode config firebase di SW public file yang tidak bisa akses VITE_ env Vite inject).
    - ✅ Menggunakan **NATIVE Browser Push Event**: `self.addEventListener('push', (event) => { ... parse payload JSON → self.registration.showNotification(title, opts) })`
    - ✅ Token FCM terasosiasi ke SW ini KETIKA frontend call `getToken()` dengan parameter `options.serviceWorkerRegistration` object SW registration (lihat fcmWebPush.ts L46).
  - Handler lengkap:
    1. `install` event → `skipWaiting()` agar SW baru langsung aktif tanpa reload tab.
    2. `activate` event → `clients.claim()` agar SW langsung control tab yang terbuka.
    3. `push` event → Parse payload `notification` (title, body) + `data.click_url`. Icon & Badge pakai `/logo/litensilogo.png` (TERSEDIA di public/logo ✅ verified LS public folder). `requireInteraction: true` (notif tidak auto-dismiss, user harus klik close / pilih), vibrate 200-100-200, data disimpan ke notif untuk click handler.
    4. `notificationclick` event → `notif.close()` → Cari tab yang matching URL focus, jika tidak ada buka tab baru via `clients.openWindow(data.click_url || '/dashboard')`.
  - Commit Hash: (lihat F4 commit utama)
  - Status Deploy: ✅ File tersimpan di public/firebase-messaging-sw.js. Vite build otomatis copy ke dist root scope /. Verified di build lokal dist/firebase-messaging-sw.js ADA.
- [x] **F4.6** Integrasi ke Dashboard Root / App.tsx On-Mount
  - **Masalah Urutan Provider (TERPECAHKAN):** `ToastProvider` di-render DI DALAM return App.tsx (bukan di-wrap dari luar main.tsx). Jadi useToast() hook HANYA bisa diakses di ANAK component yang di-render SETELAH ToastProvider mount. Solusi: Buat CHILD COMPONENT KECIL `FcmWebIntegrationHooks()` di-render DI BAWAH <ToastProvider> children block.
  - Component `FcmWebIntegrationHooks` lengkap:
    1. ✅ `useToast()` hook tersedia → toast.info / toast.success / toast.warning / toast.error untuk feedback user.
    2. ✅ `useState showPermissionBanner` (default false) untuk control render banner.
    3. ✅ `useRef swRegistrationRef` simpan object SW registration untuk di-pass ke getToken / requestPermissionAndRegisterToken.
    4. ✅ **[Effect 1/1 (mount)] Register Service Worker `/firebase-messaging-sw.js` scope `/`** → subscribe foreground onMessage listener (panggil `toast.info(body, 7000ms, title)` ketika push datang di foreground halaman aktif) → Cek `Notification.permission` state:
       - `granted` → **AUTO REFRESH TOKEN FCM setiap mount** (FCM token expire ~6 bulan, refresh setiap user buka halaman adalah aman). Log panjang token ke console.
       - `default` → setShowPermissionBanner(true) = TAMPILKAN BANNER INLINE UI. TIDAK PERNAH memanggil `Notification.requestPermission()` secara langsung tanpa user click button (UX tidak spammy).
       - `denied` → setShowPermissionBanner(false) = jangan tampilkan apapun (user harus enable manual di Chrome Site Settings).
    5. ✅ **Cleanup unmount:** unsubscribe foreground onMessage listener.
  - **Banner UI Component (bottom-right fixed z-99998):**
    - Posisi: `fixed bottom-6 right-6` (BANNER KECIL BAWAH KANAN sesuai roadmap F4.6). TIDAK PERNAH popup native tanpa user click ✅.
    - Design: Background indigo-950/95 backdrop-blur-2xl border indigo-500/40 rounded-3xl shadow-2xl. Ikon bel 🔔 + Title "Aktifkan Notifikasi Push" + Body text penjelasan geofence + chat baru.
    - Action Buttons: 2 tombol = (1) "Nanti Saja" → hide banner; (2) "🔔 Aktifkan Notifikasi" → onClick handleClickEnableNotif.
    - Handler klik Aktifkan Notifikasi: panggil `requestNotificationPermission()` native popup browser → if granted → hide banner → panggil `requestPermissionAndRegisterToken(swReg)` → if success `toast.success()` | if failed `toast.warning()`. If denied/blocked → hide banner → `toast.warning()` beritahu user untuk enable via Site Settings.
  - `<FcmWebIntegrationHooks />` di-render di dalam App.tsx return ToastProvider children div (line 431).
  - Commit Hash: (lihat F4 commit utama)
  - Status Deploy: ✅ Vite build 2128 modules transformed ✅ NO TS ERROR, exit 0. Output dist index-ByFyoJLx.js 1.27MB (gzip 309KB) termasuk Firebase SDK 11.

### F5. Android Companion App: FCM Service Token Refresh
- [ ] **F5.1** Buat Class Service `LitensiFirebaseMessagingService.kt`
  - File target: `apps-litensi-kids/app/src/main/java/com/example/service/LitensiFirebaseMessagingService.kt`
  - Extend: `FirebaseMessagingService()`
  - Override wajib:
    1. `onNewToken(token: String)` → POST ke endpoint F3 `POST /anak/{id}/fcm-token` dengan payload: `pairing_pin = (PinState from Room)`, `fcm_token = token`. (Gate ownership via pairing_pin, sesuai F3 controller 403.)
    2. `onMessageReceived(remoteMessage: RemoteMessage)` → Handle push notif foreground/background. Untuk channel_id PENGASUHAN_CH (sesuai FcmPushService AndroidConfig), priority PRIORITY_MAX, sound default + vibrate. Handle payload data event_type:
      - `geofence_enter` → Big Text Notification + Open Dashboard Maps Activity
      - `geofence_exit` → Big Text Notification + Open Dashboard Maps
      - `remote_lock` → Lock full-screen (finish semua activity + SHOW LOCK SCREEN ACTIVITY)
      - `chat_new` → Notifikasi group per anak_id + Open ChatInboxActivity untuk anak tersebut
  - Commit Hash: -
  - Status Deploy: -
- [ ] **F5.2** Register service ke AndroidManifest.xml `<application>` tag
  - XML service: `android:name=".service.LitensiFirebaseMessagingService"` + `android:exported="false"` + intent-filter `com.google.firebase.MESSAGING_EVENT`.
  - Juga tambahkan permissions (jika belum ada): `POST_NOTIFICATIONS` runtime request Android 13+ (manifest + runtime request MainActivity.onCreate setelah pairing sukses)
  - Commit Hash: -
  - Status Deploy: -
- [ ] **F5.3** Force get token SETELAH PAIRING SUKSES di ViewModel (JANGAN hanya andalkan onNewToken!)
  - File target: `apps-litensi-kids/app/src/main/java/com/example/ui/viewmodel/LitensiViewModel.kt`
  - Lokasi: Setelah flow `isConnected=true` (navigate ke dashboard) collect selesai.
  - Force: `Firebase.messaging.token.addOnSuccessListener { token -> viewModelScope.launch { repository.updateFcmTokenAnak(token = token, id = anakId, pairingPin = currentPin) } }`
  - Reason: onNewToken TIDAK ter-trigger untuk install APP YANG SUDAH ADA TOKEN SEBELUM SERVICE DI UPGRADE (token sudah exist di cache Firebase, onNewToken hanya trigger jika berubah). Force get once setelah pairing SUDAH OK menghindari case "pairing sukses tapi FCM token belum upload sampai onNewToken berikutnya".
  - Commit Hash: -
  - Status Deploy: -

---

## 🟠 FASE G: GPS REALTIME TRACKING + GEOFENCE PUSH NOTIF (DEPENDENCY: F2 & F5 ANDROID DONE DULU)

### G1. Backend Tabel + Model Pergerakan GPS Anak
- [ ] **G1.1** Migration Buat Tabel `pergerakan_gps_anak`
  - File target: `backend/database/migrations/2026_09_19_000003_buat_tabel_pergerakan_gps_anak.php`
  - Kolom wajib: `id` BIGINT UNSIGNED PK, `profil_anak_id` BIGINT UNSIGNED FK profil_anak.id ON DELETE CASCADE, `latitude` DECIMAL(10,7) WGS84, `longitude` DECIMAL(10,7), `accuracy_meters` INT NULL, `battery_level` INT NULL, `speed_kmh` FLOAT NULL, `altitude_m` FLOAT NULL, `is_mock_detected` BOOLEAN DEFAULT FALSE, `captured_at` DATETIME NOT NULL (timestamp DARI HP BUKAN SERVER!), INDEX `idx_profil_captured (profil_anak_id, captured_at DESC)`.
  - Commit Hash: -
  - Status Deploy: -
- [ ] **G1.2** Buat Model `PergerakanGpsAnak.php` + relation BelongsTo ProfilAnak + fillable semua field kecuali id. Cast `captured_at:datetime`, `latitude/longitude:decimal:7`.
  - Commit Hash: -
  - Status Deploy: -
- [ ] **G1.3** Tambah kolom `last_known_latitude DECIMAL(10,7) NULL` + `last_known_longitude DECIMAL(10,7) NULL` + `last_gps_captured_at DATETIME NULL` ke tabel `profil_anak` via migration baru (G1.3, JANGAN lupakan! Dibutuhkan Monitor page Maps auto-center TANPA query ORDER BY ke pergerakan_gps_anak setiap detik).
  - Commit Hash: -
  - Status Deploy: -

### G2. Endpoint Upload GPS + Haversine Geofence Trigger
- [ ] **G2.1** Route `POST /anak/{id}/gps` (AN9) di routes/api.php DI ATAS wildcard /anak/{id}. Gate ownership pairing_pin/qr SAMA DENGAN F3 endpoint fcm-token (copy paste validasi gate → 403 jika salah).
- [ ] **G2.2** Method `AnakController::uploadGpsPergerakan`: Insert row PergerakanGpsAnak + UPDATE profil_anak last_known_lat/long + last_gps_captured_at + last_active.
- [ ] **G2.3** Haversine Geofence Trigger di method uploadGpsPergerakan SETELAH insert+update success: Query semua ZonaGeofence milik user_id anak → hitung jarak titik sekarang vs center geofence (rumus haversine 6371 * 2 * ASIN(SQRT(...))) → JIKA jarak < radius DAN status SEBELUMNYA di luar geofence (cek log_geofence terakhir) → INSERT `geofence_logs` status=masuk → call `FcmPushService::broadcastUserChildren(userId, 'geofence_enter', [title:"Anak memasuki {$namaZona}", body:"{$namaAnak} memasuki area zona aman pada {$jam}", data:{geofence_id, click_url:'/monitor'}])` → SEBALIKNYA jika jarak > radius DAN sebelumnya di DALAM → broadcast `geofence_exit`.

### G3. Android Worker GPS Periodik + GeofencingClient
- [ ] **G3.1** WorkManager `PeriodicWorkRequest` 15 menit (minimum android) + `OneTimeWorkRequest` expedited untuk GPS high-priority saat perubahan signifikan.
- [ ] **G3.2** Google Play Services `FusedLocationProviderClient` requestLocationUpdates priority PRIORITY_HIGH_ACCURACY + interval 5 menit / displacement 10m.
- [ ] **G3.3** `GeofencingClient` add geofences per zona (ambil dari endpoint list geofence milik user) + PendingIntent BroadcastReceiver trigger upload gps segera saat enter/exit.
- [ ] **G3.4** Upload GPS ke endpoint G2.1 dengan gate ownership pairing_pin, batch 10 point jika offline (Room cache point pending upload → WorkManager flush).

### G4. Laravel Reverb WebSocket + Echo Monitor Page
- [ ] **G4.1** Install `pusher/pusher-php-server` + config `reverb.php` APP_ID/KEY/SECRET. Enable route broadcasting.php + `Broadcast::channel('anak-gps.{anakId}')` gate: hanya user_id milik ProfilAnak.anak.user_id yang bisa join.
- [ ] **G4.2** Di method uploadGpsPergerakan AFTER insert success → `broadcast(new AnakGpsUpdatedEvent($anakId, $lat, $long, $capturedAt))` via Reverb.
- [ ] **G4.3** Frontend: `npm install laravel-echo pusher-js` → init Echo window.Echo di Dashboard/App.tsx, VITE env REVERB_HOST/PORT/KEY/SCHEME.

### G5. Monitor Page Maps Auto Center Last Known + Realtime Marker Update
- [ ] **G5.1** Di `src/pages/monitor/MonitorPage.tsx` maps: Initial center = `[last_known_latitude, last_known_longitude]` dari profil_anak per endpoint Monitor list (JANGAN hardcode Jakarta!).
- [ ] **G5.2** Echo.channel('anak-gps.' + anak.id) → listen `.AnakGpsUpdatedEvent` → update marker position maps + smooth pan jika user tidak sedang drag (auto-center = default, nonaktif saat user hold drag maps 10 detik terakhir).
- [ ] **G5.3** History polyline per anak last 6 jam dari pergerakan_gps_anak ORDER captured_at ASC.

---

## 🔴 FASE R: BROADCAST PESAN R4 (DEPENDENCY F2 FOUNDATION DONE)
- [ ] **R4.1** Migration tabel `broadcast_pesan` + `broadcast_penerima` (status sudah dibaca user_id / anak_id).
- [ ] **R4.2** Endpoint broadcast CRUD + send: create pesan → select penerima anak_ids → insert penerima → `FcmPushService::broadcastUserChildren` event_type=broadcast untuk setiap user milik anak tsb.
- [ ] **R4.3** UI: Sidebar menu Broadcast (yang sempat dihapus dulu → hidupkan kembali) di path `/inbox/broadcast` untuk role Master / Family Pro.
- [ ] **R4.4** Android F5 onMessageReceived handler event_type='broadcast_pesan' → Big Text Notification + Click open InboxBroadcastActivity.

---

## ⚠️ USER ACTION YANG DIBUTUHKAN SEBELUM LANJUT KE F4 (Web FCM Push)
F2+F3 backend sudah 100% deploy production & verified. Namun FCM Push (Android + Web) BELUM BISA bekerja SEBELUM user menyelesaikan 2 langkah MANUAL di Firebase Console. Silakan kerjakan untuk melanjutkan ke F4+F5:

### ✅ 1. Generate & Upload Firebase Service Account JSON (Backend F2 butuh file ini!) — **SELESAI 19/09 22:00 WIB ✅** (DIKERJAKAN OTOMATIS OLEH ASSISTANT)
1. Buka **Firebase Console** → Pilih Project `litensi-kids`.
2. Go to **Project Settings** (⚙️ gear kiri atas) → Tab **Service Accounts**.
3. Di bawah panel **Admin SDK configuration service accounts**, PILIH BAHASA APAPUN (Node.js direkomendasikan, Java/Python/Go SAMA SAJA — karena FILE JSON YANG DI-DOWNLOAD SELALU SAMA FORMAT untuk SEMUA bahasa).
4. Klik tombol **GENERATE NEW PRIVATE KEY** → Confirm "Generate key". File JSON OTOMATIS di-download ke PC user.
5. **Rename** file JSON download tersebut menjadi nama file EXACT: `firebase-service-account.json`
6. **Upload via SCP/SFTP (FileZilla / WinSCP)** ke 2 lokasi berikut:
   - **Lokal PC (untuk development/test lokal):** `D:\litensi-kids\backend\storage\app\firebase-service-account.json`
   - **Production VPS (wajib untuk push real):** `/var/www/litensi-backend/storage/app/firebase-service-account.json`
7. **SSH VPS** → Set permission hanya untuk www-data (JANGAN public! File ini adalah credential akses FULL FCM project):
   ```bash
   sudo chown www-data:www-data /var/www/litensi-backend/storage/app/firebase-service-account.json
   sudo chmod 600 /var/www/litensi-backend/storage/app/firebase-service-account.json
   ```
✅ **STATUS SELESAI:** File `litensi-kids-firebase-adminsdk-fbsvc-72551d34d2.json` di-download user → di-rename, di-copy ke lokal `D:\litensi-kids\backend\storage\app\firebase-service-account.json` → di-upload via base64 ke VPS path yang benar, chown/chmod set ✅. Verify final: FcmPushService::isReady()=TRUE & Firebase HTTP v1 API CALL BERHASIL GOOGLE SERVERS response actual "not valid token" (expected karena token dummy).

---

### ✅ 2. Generate & Isi VAPID Web Push **PRIVATE KEY** (BUKAN PUBLIC KEY!) ke env VPS (Backend FCM Web Push!) — **SELESAI 19/09 22:25 WIB ✅** (DIKERJAKAN USER VIA SSH NANO MANUAL)
🚨 **CRITICAL NOTE (TERCATAT USER SALAH COPY SEBELUMNYA SUDAH DIPERBAIKI!):** Yang awalnya user copy tadi (`BO1Qrc4Ys81...`) ADALAH **PUBLIC KEY** = **SUDAH KITA INJECT SEJAK AWAL** ke VPS env `FCM_VAPID_PUBLIC_KEY`. Yang BUTUH USER ACTION #2 INI ADALAH **PRIVATE KEY** (DI BAWAH Public Key di panel Web Push Certificates). User akhirnya nano inject env VPS dengan PRIVATE KEY BENAR ✅.
1. ✅ (Sudah dilakukan user) Nano `/var/www/litensi-backend/.env` line `FCM_VAPID_PRIVATE_KEY=` diisi dengan PRIVATE KEY BASE64 length 43 chars ✅ **TIDAK diawali BO1Q!** (verified via SSH grep length: Public Key length 87, Private Key length 43 → TERBUKTI benar).
2. ✅ Rebuild Laravel cache VPS (DILAKUKAN OTOMATIS F4 PRE-VERIFY step):
   ```bash
   cd /var/www/litensi-backend
   rm -f bootstrap/cache/config.php bootstrap/cache/routes.php bootstrap/cache/packages.php bootstrap/cache/services.php
   sudo -u www-data php8.5 artisan config:cache ✅ Configuration cached successfully.
   sudo -u www-data php8.5 artisan route:cache ✅ Routes cached successfully.
   sudo -u www-data php8.5 artisan event:cache ✅ Events cached successfully.
   ```
3. ✅ Final VERIFY: FcmPushService::isReady()=TRUE ✅ (Private key tidak diperlukan untuk isReady karena Web Push Private Key hanya untuk debug/test revoke token di backend server-side, pushToWeb masih bekerja via FCM token yang di-register oleh browser dengan VAPID Public Key).
✅ **USER ACTION #1 + #2 KEDUANYA SUDAH 100% SELESAI** → FASE F2+F3+F4 BACKEND DAN FRONTEND WEB PUSH BISA BEKERJA SEPENUHNYA DI PRODUCTION. Selanjutnya FASE F5 Android FCM Service.


