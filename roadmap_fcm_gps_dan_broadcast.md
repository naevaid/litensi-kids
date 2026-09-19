# ROADMAP FASE FCM + GPS REALTIME + BROADCAST (Setelah Pairing ✅ Selesai)

> **Last Update**: 2026-09-19 20:00 WIB (F2+F3+F4+F5 Selesai 100% END-TO-END VERIFIED PRODUCTION ✅ Notif Android MUNCUL ✅; GPS G1-G2.3 CODING 100% VERIFIED LOKAL 4/4 Testcase PASS, Next DEPLOY VPS Production)
> **Urutan Prioritas**: F2 (Backend FCM Foundation) → F3 (Endpoint Token) → F4 (Web Frontend FCM Push) → F5 (Android FCM Service) ✅ SEMUA FASE F 100% PRODUCTION READY → **NEXT IN-PROGRESS: G1-G5 (GPS Realtime + Geofence Push + Maps)** (G1-G2.3 Lokal Pass 4/4 Testcase ✅ Deploy in progress) → R4 (Broadcast Pesan)
> **Latest Deploy**: Commit `70f108c` (F4 Frontend FCM Web Push 100% Deployed HTTPS 200 ✅). + G1-G2.3 Backend GPS Coding Complete Lokal Verified 4/4 (menunggu commit push & deploy VPS).
> **Aturan Checklist**: ganti [ ] jadi [x] saat sub-task SELESAI & SUDAH di-verify di PRODUCTION / LOKAL. Isi Commit Hash + Status Deploy (Tanggal) jika sudah di-deploy VPS.

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

### F4. Web Frontend FCM Web Push (Push Notif di Browser Orang Tua) — ✅ 100% DONE ✅ DEPLOYED PRODUCTION ✅ HEALTH HTTPS 200
- [x] **F4.1** Install npm package `firebase@^11`
  - File target: `package.json` (dependencies) + `package-lock.json`
  - Command: `npm install firebase@^11 --save` → ✅ Added 69 packages, exit code 0, NO audit error
  - Commit Hash: `70f108c`
  - Status Deploy: ✅ Package terinstall 329 packages (npm ci --omit-dev 0 vulnerabilities ✅), Vite build resolve firebase/app & firebase/messaging 11.x ✅
- [x] **F4.2** Inject env VITE_FIREBASE_* 6 line + VITE_FCM_VAPID_PUBLIC_KEY ke root project `.env` (VITE baca env SAAT build di VPS /var/www/litensi-git-src/.env, BUKAN di frontend target!)
  - Value: diambil dari firebase config user VERBATIM yang dikirim sebelumnya (apiKey DNHbkDJ34M1ADVM7dgw6CXsiKVgry_Pko dst. + VAPID PUBLIC KEY = BO1Qrc4Ys81RhAfjVR13tflYLZ78z_zm1E4VA-5BQYqa31Yt7hUxcAPFwT92ltryQATe_XyAa5-HIxcS4l9fuHs).
  - 3 File target:
    1. ✅ `.env.example` (PUBLIC template safe commit, value kosong untuk rekan tim lain clone)
    2. ✅ Lokal `D:\litensi-kids\.env` (isi actual value, GITIGNORE, TIDAK di-commit public repo)
    3. ✅ VPS `/var/www/litensi-git-src/.env` (7 line VITE_FIREBASE + VITE_FCM_VAPID_PUBLIC_KEY TERDAFTAR ✅ verified via SSH grep count=1 each line)
  - Commit Hash: `70f108c`
  - Status Deploy: ✅ VPS git-src .env ADA & value BENAR → Vite production build SUCCESS inject env ke bundle tanpa undefined ✅
- [x] **F4.3** Buat file initializeApp Firebase SDK Web
  - File target: `src/services/firebaseApp.ts` (folder services dibuat duluan, sebelumnya tidak ada di src)
  - Export: `export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig)` + `export const firebaseMessaging: Messaging = getMessaging(firebaseApp)`
  - ZERO HARDCODE: Semua 6 line config diambil dari `import.meta.env.VITE_FIREBASE_*` const assertion. Komentar Bahasa Indonesia ✅ sesuai agent.md.
  - Commit Hash: `70f108c`
  - Status Deploy: ✅ Vite build transform module ini SUCCESS ✅ (2128 modules transformed VPS build = sama dengan lokal)
- [x] **F4.4** Buat file FCM Web Push helper
  - File target: `src/services/fcmWebPush.ts`
  - Method export:
    1. `requestNotificationPermission(): Promise<boolean>` → Cek Notification API, handle default/denied/granted.
    2. `getFcmWebToken(swReg?: ServiceWorkerRegistration): Promise<string|null>` → `getToken(firebaseMessaging, { vapidKey, serviceWorkerRegistration })` → Pass SW registration object agar token terasosiasi dengan custom SW kita (TANPA importScripts firebase SDK di SW public! Zero hardcode ✅).
    3. `sendFcmTokenToBackend(token: string)` → POST via existing `api.post('/profil/web-fcm-token', { web_fcm_token: token })` — **apiClient OTOMATIS inject flat field user_id dari localStorage session (authRequired=true default)**, pattern SAMA PERSIS dengan endpoint updateProfil (sesuai KONVENSI.md).
    4. `requestPermissionAndRegisterToken(swReg?): Promise<{ok, message?, token?}>` → Gabungan 3 step di atas.
    5. `subscribeForegroundPushNotifications(callback): () => void` → `onMessage(firebaseMessaging, callback)` → Return unsub function untuk cleanup useEffect React. Dipanggil dari App.tsx component child di dalam ToastProvider scope agar bisa akses useToast hook.
  - Komentar Bahasa Indonesia ✅, TypeScript strict typing ✅, export FcmPushPayload interface ✅.
  - Commit Hash: `70f108c`
  - Status Deploy: ✅ Build VPS sukses 2128 modules ✅, import firebase/messaging OK, POST endpoint F3 TERDAFTAR route:list ✅
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
  - Commit Hash: `70f108c`
  - Status Deploy: ✅ RSYNC berhasil copy `firebase-messaging-sw.js` ke /var/www/litensi-frontend/ ✅ Scope / terdaftar di SW DevTools Application tab.
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
  - Commit Hash: `70f108c`
  - Status Deploy: ✅ Vite build VPS 2128 modules transformed ✅ NO TS ERROR, exit 0. RSYNC dist success, HTTPS health check **HTTP/2 200** ✅ parental.naeva.id serving F4 code.

✅ **FINAL DEPLOY STATUS F4**: Deployed Production 19/09/2026 22:40 WIB, Commit `70f108c`, Health Check HTTPS 200 OK via Cloudflare ✅. Files served: firebase-messaging-sw.js scope / + assets index-CcR7Ddlt.js 1.27MB (gzip 309KB) + index-2BhqEAhe.css 186KB.

### F5. Android Companion App: FCM Service Token Refresh
- [x] **F5.1** Buat Class Service `LitensiFirebaseMessagingService.kt`
  - File target: `apps-litensi-kids/app/src/main/java/com/example/service/LitensiFirebaseMessagingService.kt` (FOLDER service BARU dibuat)
  - Extend: `FirebaseMessagingService()`
  - Override wajib:
    1. `onNewToken(token: String)` → Baca state Room PairingState via `repository.pairingState.firstOrNull()`. Jika isConnected=true & gate ownership pin/qr minimal satu NON NULL → serviceScope.launch `repository.updateFcmTokenAnak()` upload ke endpoint F3. Gate ownership sesuai F3 AnakController (403 jika salah / keduanya kosong). Semua block di-wrap runCatching Log error non-fatal (tidak crash app).
    2. `onMessageReceived(remoteMessage: RemoteMessage)` → Handle push notif foreground/background. Extract event_type = data["event_type"]. Default fallback title/body per event_type (geofence_enter/exit, remote_lock, chat_new, broadcast_pesan, default). **Runtime check Android 13+ (SDK ≥ 33):** Jika permission POST_NOTIFICATIONS BELUM di-granted user → skip show notification (graceful degradation TANPA crash). `ensureNotificationChannelExists()` untuk Android O+ (API ≥ 26) channel_id **PENGASUHAN_CH** (SESUI dengan FcmPushService.php AndroidConfig.channel_id), priority IMPORTANCE_HIGH, enable lights+vibration+badge. NotificationCompat.Builder: smallIcon R.mipmap.ic_launcher, BigTextStyle, priority PRIORITY_MAX/HIGH per event_type, vibrate 200-100-200, sound DEFAULT_NOTIFICATION_URI, autoCancel=true, setContentIntent PendingIntent getActivity open MainActivity (FLAG_ACTIVITY_NEW_TASK | CLEAR_TOP), VISIBILITY_PRIVATE (hide sensitive di lockscreen). NotificationManagerCompat.notify(notifId).
  - Service Lifecycle: `private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)`. `override onDestroy() { super.onDestroy(); serviceScope.cancel() }` (hindari memory leak coroutine).
  - Komentar Bahasa Indonesia ✅ agent.md L16. Zero hardcode: channel id, permission names, pending intent flags SEMUA dari constant Android SDK.
  - Commit Hash: -
  - Status Deploy: **Local Code Ready (menunggu user build di Android Studio)** ✅ File path VERIFIED ADA.
- [x] **F5.2** Register service ke AndroidManifest.xml `<application>` tag
  - XML service: `<service android:name="com.example.service.LitensiFirebaseMessagingService" android:exported="false">` (pakai FQN FULL com.example.* karena manifest namespace = com.parental.litensikids TAPI actual source package = com.example; pattern SAMA dengan MainActivity L25 yang juga menggunakan FQN com.example.MainActivity). `<intent-filter>` = `<action android:name="com.google.firebase.MESSAGING_EVENT" />`.
  - Permissions: ✅ `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` SUDAH ADA L12. ✅ `VIBRATE` SUDAH ADA L9. Tidak perlu di-duplicate.
  - Runtime Permission (Android 13+ **API 33 TIRAMISU**): Di [MainActivity.kt](file:///d:/litensi-kids/apps-litensi-kids/app/src/main/java/com/example/MainActivity.kt#L42-L63) onCreate SETELAH super.onCreate SEBELUM enableEdgeToEdge: Jika `Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU` → ContextCompat.checkSelfPermission POST_NOTIFICATIONS != GRANTED → ActivityCompat.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), RC_POST_NOTIF_PERM=1001). **TIDAK PERLU handle callback onRequestPermissionsResult** — jika user DENY, notifikasi TIDAK muncul = graceful TANPA crash app.
  - Commit Hash: -
  - Status Deploy: **Local Code Ready** ✅ Manifest service TERDAFTAR di <application> sebelum activity.
- [x] **F5.3** Force get token SETELAH PAIRING SUKSES di ViewModel (JANGAN hanya andalkan onNewToken!)
  - File target: [LitensiViewModel.kt](file:///d:/litensi-kids/apps-litensi-kids/app/src/main/java/com/example/ui/viewmodel/LitensiViewModel.kt#L186-L242) init block pairingState.collect L169 isConnected=true. SETELAH `refreshPermissionsState(application)` L184 TAMBAHKAN block force get Firebase.messaging.token.
  - Force: `Firebase.messaging.token.addOnSuccessListener { freshToken -> if (freshToken.isNotBlank()) viewModelScope.launch { repository.updateFcmTokenAnak(token=freshToken, id=state.profilAnakId, pairingPin=state.pinPairing, qrPairingCode=state.qrPairingCode) } }` + `addOnFailureListener { Log.w }`.
  - Gate ownership check SEBELUM call Firebase: `if (anakId != null && (!pin.isNullOrBlank() || !qr.isNullOrBlank()))` (SAMA dengan repository wrapper require). Jika gagal gate → Log.w skip upload.
  - Reason: onNewToken TIDAK ter-trigger untuk install APP YANG SUDAH ADA TOKEN SEBELUM SERVICE DI UPGRADE (token sudah exist di cache Firebase, onNewToken hanya trigger jika berubah). Force get once setelah pairing SUDAH OK menghindari case "pairing sukses tapi FCM token belum upload sampai onNewToken berikutnya". **SATU TEMPAT init.collect cover DUA KASUS:** (a) re-open app restart after paired (Room state sudah exist → collect trigger langsung); (b) fresh pairing BARU (setelah repository.connectWithCode save PairingState ke Room L189, pairingState.collect akan TER-TRIGGER ULANG dengan state baru isConnected=true → force token otomatis jalan TANPA perlu code tambahan di flow connectDevice onSuccess).
  - Logging detail SEMUA step dengan TAG "LitensiViewModel-FCM" (prefix token, success len, gate skip, failure message) untuk debug production via logcat.
  - Komentar Bahasa Indonesia ✅.
  - Commit Hash: -
  - Status Deploy: **Local Code Ready** ✅ Firebase import com.google.firebase.ktx.Firebase + com.google.firebase.messaging.ktx.messaging BENAR.

### F5.4 (Supporting Dependency) Retrofit + Repository + DTO Endpoint F3
- [x] **F5.4** Retrofit Interface + Repository Wrapper + Response DTO untuk `POST /anak/{id}/fcm-token`
  - [LitensiApiService.kt](file:///d:/litensi-kids/apps-litensi-kids/app/src/main/java/com/example/data/remote/LitensiApiService.kt#L77-L87) TAMBAH method suspend: `@FormUrlEncoded @POST("api/v1/anak/{id}/fcm-token") updateFcmTokenAnak(@Path id, @Field pairing_pin?, @Field qr_pairing_code?, @Field fcm_token?)` → Pattern SAMA PERSIS dengan `uploadTelemetry` L43 gate ownership. Return type `ApiResponse<FcmTokenResponseDto>`.
  - [RemoteDtos.kt](file:///d:/litensi-kids/apps-litensi-kids/app/src/main/java/com/example/data/remote/RemoteDtos.kt#L148-L156) TAMBAH `@JsonClass(generateAdapter = true) data class FcmTokenResponseDto(@Json(name="fcm_token_length") val fcmTokenLength: Int, @Json(name="token_revoked") val tokenRevoked: Boolean, @Json(name="updated_at") val updatedAt: String?)` → 1:1 mapping dengan AnakController response shape L520.
  - [LitensiRepository.kt](file:///d:/litensi-kids/apps-litensi-kids/app/src/main/java/com/example/data/repository/LitensiRepository.kt#L340-L367) TAMBAH `suspend fun updateFcmTokenAnak(token:String?, id:Int, pairingPin:String?, qrPairingCode:String?): FcmTokenResponseDto` → `require(!pairingPin.isNullOrBlank() || !qrPairingCode.isNullOrBlank())` (gate ownership minimal salah satu NON EMPTY → throw IllegalArgumentException dengan pesan Bahasa Indonesia). Wrap `apiCall` + `if (!resp.success) error(resp.message)`. Support token NULL = case revoke token saat unpair.
  - Verified 1:1 signature dengan backend F3 endpoint AnakController@updateFcmTokenAnak L483-L538: minimal salah satu field (pairing_pin/qr_pairing_code) NON EMPTY → return 403 jika keduanya kosong / salah value.
  - Commit Hash: -
  - Status Deploy: **Local Code Ready** ✅ Semua pattern import & signature SAMA dengan existing endpoint lain (AN8 uploadTelemetry, CH5 kirimPesanDariAnak) = TIDAK ada breaking change.

✅ **OVERALL STATUS F5**: SEMUA 4 sub-task (F5.1 Service, F5.2 Manifest + Runtime Perm, F5.3 ViewModel force token, F5.4 API + Repository + DTO) **CODING 100% SELESAI ✅ Local Code Ready**. **VERIFIED PRODUCTION 100% END-TO-END PASS** via user manual SSH OPSI A test push 3 event_type (default, geofence_enter, chat_new) → User VERBATIM report "notifikasi sudah muncul di aplikasi perangkat anak" ✅. Logcat Force Token UPLOAD SUCCESS: tokenLen=142 chars (normal FCM), updatedAt=2026-09-19T00:54:17Z (07:54 WIB sama jam device).

---

## 🟠 FASE G: GPS REALTIME TRACKING + GEOFENCE PUSH NOTIF (DEPENDENCY: F2 & F5 ANDROID DONE DULU)

### G1. Backend Tabel + Model Pergerakan GPS Anak
- [x] **G1.1** Migration Buat Tabel `pergerakan_gps_anak`
  - File target: `backend/database/migrations/2026_09_19_000003_buat_tabel_pergerakan_gps_anak.php`
  - Kolom wajib: `id` BIGINT UNSIGNED PK, `profil_anak_id` BIGINT UNSIGNED FK profil_anak.id ON DELETE CASCADE, `latitude` DECIMAL(10,7) WGS84, `longitude` DECIMAL(10,7), `accuracy_meters` INT NULL, `battery_level` INT NULL, `speed_kmh` FLOAT NULL, `altitude_m` FLOAT NULL, `is_mock_detected` BOOLEAN DEFAULT FALSE, `captured_at` DATETIME NOT NULL (timestamp DARI HP BUKAN SERVER!), INDEX `idx_profil_captured (profil_anak_id, captured_at DESC)`.
  - Verify Lokal: `php artisan migrate --force` XAMPP → 754.98ms DONE ✅, SHOW COLUMNS: 10 kolom ADA, captured_at datetime ADA ✅ (TIDAK ADA created_at/updated_at sesuai timestamps=false model).
  - Commit Hash: -
  - Status Deploy: **Lokal Verified ✅ (menunggu deploy VPS + migrate --force production)**
- [x] **G1.2** Buat Model `PergerakanGpsAnak.php` + relation BelongsTo ProfilAnak + fillable semua field kecuali id. Cast `captured_at:datetime`, `latitude/longitude:decimal:7`.
  - **CRITICAL RULE:** `public $timestamps = false;` → WAJIB karena tabel TIDAK ADA kolom created_at/updated_at! Jika lupa = Mass Assignment SQL error Unknown column.
  - Verify Lokal: `php -l` = No syntax errors ✅; Mass Assignment Insert via simulate TestCase C = row pergerakan_gps_anak.created (gps_id>0) ✅.
  - Commit Hash: -
  - Status Deploy: **Lokal Verified ✅**
- [x] **G1.3** Tambah kolom `last_known_latitude DECIMAL(10,7) NULL` + `last_known_longitude DECIMAL(10,7) NULL` + `last_gps_captured_at DATETIME NULL` ke tabel `profil_anak` via migration baru (G1.3, JANGAN lupakan! Dibutuhkan Monitor page Maps auto-center TANPA query ORDER BY ke pergerakan_gps_anak setiap detik).
  - **ZERO HARDCODE RULE (PATUH ATURAN PERMANEN USER):** Initial camera Monitor Page Google Maps WAJIB ambil dari 3 kolom ini JIKA ADA, JANGAN PERNAH hardcode Jakarta = -6.2088 106.8456 sebagai fallback apapun! (Jika kolom ini NULL = tampilkan text UI: "Belum ada data GPS terbaru dari perangkat anak" tanpa marker.)
  - Migration: `2026_09_19_000004_tambah_last_known_gps_profil_anak.php` + Index composite `idx_user_last_gps_captured (user_id, last_gps_captured_at)` untuk Monitor page query cepat.
  - Model ProfilAnak Fillable L38-L40 ditambah 3 kolom + Casts function L52-L55 cast latitude/longitude decimal:7, captured_at datetime → verified via Read Back EditWrite success save ✅.
  - Verify Lokal: Migrate 160.05ms DONE ✅, SHOW COLUMNS profil_anak last_% 3 kolom ADA DECIMAL(10,7) nullable + timestamp datetime OK ✅. Simulate TestCase C: ProfilAnak snapshot last_known = GPS terbaru update ✅ (value persis sama dengan yang diupload).
  - Commit Hash: -
  - Status Deploy: **Lokal Verified ✅**

### G2. Endpoint Upload GPS + Haversine Geofence Trigger
- [x] **G2.1** Route `POST /anak/{id}/gps` (AN9) di routes/api.php DI ATAS wildcard /anak/{id}. Gate ownership pairing_pin/qr SAMA DENGAN F3 endpoint fcm-token (copy paste validasi gate → 403 jika salah).
  - **Route Order Rule (KONVENSI.md L114 First-Match-Wins):** Urutan di routes/api.php (line number ASC): L145 `POST /{id}/telemetry` (AN8) → L149 `POST /{id}/fcm-token` (F3 Android) → **L154 `POST /{id}/gps` (AN9/G2.1)** → L157 wildcard `GET /{id}` (show). ✅ Verified urutan line number via Read Back file routes/api.php. Laravel akan match GPS route DULU sebelum wildcard = ❌ tidak terjadi 405 MethodNotAllowed (route wildcard GET method tidak cocok POST request GPS).
  - artisan route:list verified registered: `POST api/v1/anak/{id}/gps | AnakController@uploadGpsPergerakan` ✅ TERDAFTAR.
  - Commit Hash: -
  - Status Deploy: **Lokal Verified ✅**
- [x] **G2.2** Method `AnakController::uploadGpsPergerakan`: Insert row PergerakanGpsAnak + UPDATE profil_anak last_known_lat/long + last_gps_captured_at + last_active.
  - Pattern Gate Ownership EXACT COPY method `updateFcmTokenAnak` F3: Cek qr_pairing_code cocok / pairing_pin cocok / minimal salah satu NON EMPTY dua kosong=403. ✅ Simulate Testcase A PIN salah=403 PASS, Testcase B empty pin/qr=403 PASS.
  - Insert PergerakanGpsAnak via Mass Assignment fillable: array_merge($validated, ['profil_anak_id'=>$id, 'latitude'=>$newLat, 'longitude'=>$newLng, 'captured_at'=>$capturedAt Carbon parsed]) ✅ (jangan pakai value latitude/longitude string dari request, cast ke float agar presisi decimal DB sesuai).
  - **PENTING Snapshot last_gps_captured_at = VALUE CAPTURED_AT DARI REQUEST HP (Carbon parsed) BUKAN now() server!** Agar waktu snapshot sesuai dengan waktu penangkapan sinyal GPS di perangkat anak (bukan waktu server terima request yang bisa delay karena koneksi). last_active = server now() untuk status "terakhir terhubung".
  - Haversine distance from previous GPS (kilometer * 1000 = round integer meters). Jika first upload prev null → distance 0. ✅ Simulate Testcase D: prev point inside → point outside distance=776m AKURAT (verifikasi via reflection haversineKm approx sama dengan calculate independent ✅ 0 error).
  - Commit Hash: -
  - Status Deploy: **Lokal Verified ✅ 4/4 Testcase PASS**
- [x] **G2.3** Haversine Geofence Trigger di method uploadGpsPergerakan SETELAH insert+update success: Query semua ZonaGeofence milik user_id anak → hitung jarak titik sekarang vs center geofence (rumus haversine 6371 * 2 * ASIN(SQRT(...))) → JIKA jarak < radius DAN status SEBELUMNYA di luar geofence (cek log_geofence terakhir) → INSERT `geofence_logs` status=masuk → call `FcmPushService::broadcastUserChildren(userId, 'geofence_enter', [title:"Anak memasuki {$namaZona}", body:"{$namaAnak} memasuki area zona aman pada {$jam}", data:{geofence_id, click_url:'/monitor'}])` → SEBALIKNYA jika jarak > radius DAN sebelumnya di DALAM → broadcast `geofence_exit`.
  - **Helper Haversine:** `private static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float` inline di class AnakController sebelum penutup `}` ✅. Rumus exact: 6371.0 * 2 * asin(sqrt(sin²(dLat/2) + cos(lat1_rad)cos(lat2_rad)sin²(dLng/2))). ✅ Verified akurasi 776m = distance 0.7761...km hasil formula persis.
  - **Hotfix G2.3a Assigned Children Compare Type Mismatch:** DB JSON assigned_children sering menyimpan ID sebagai STRING `["1"]` (karena json_encode array numeric di PHP sering di-convert ke string saat manual insert / UI). Solusi: array_map('strval', $assigned) + compare dengan (string)$anak->id → strict in_array TRUE tetap jalan, tidak ada false negative zona di-skip. ✅ Verified Zona id=6 dengan assigned_children=["1"] SEBELUM FIX di SKIP ❌ → SETELAH FIX TIDAK di-SKIP ✅ geofence trigger ENTER jalan.
  - **PRE-AUDIT G0 Existing Table LogGeofence SHAPE:** Tabel log_geofence TIDAK ADA kolom profil_anak_id FK (migration 2026_09_15_000006 L14-L24 confirmed via Grep read). Insert LogGeofence WAJIB menggunakan field STRING child_name = $anak->name (Nadia Putri) BUKAN integer id. Shape fillable LogGeofence L14-L36 confirmed: zona_geofence_id FK, child_name string, device_name string, zone_name, zone_type enum, event_type enum enter/exit/dwell, timestamp datetime, location_coordinates "lat,lng" string, battery_status "58%" string, accuracy "15m" string → EXACT 1:1 mapping payload insert ✅.
  - Query Previous Status: `LogGeofence::where(zona_geofence_id=X)->where(child_name=Y)->latest(timestamp)->first()` → extract $lastEventType. State Machine: (inside && last != enter) → ENTER event; (outside && last === enter) → EXIT event. Tidak ada dwell (masih dalam zona, tidak usah trigger notif spam tiap upload). ✅ Test Case C (first upload inside) → ENTER trigger count=1 ✅; Test Case D (outside from inside) → EXIT trigger count=1 ✅.
  - **Graceful Degradation Non Fatal:** Seluruh block geofence foreach DIBUNGKUS `try { ... } catch (\Throwable $e) { Log::warning }` JIKA FcmPushService::broadcastUserChildren throw (misal Service Account TIDAK ADA / DB tabel corrupt / MySQL gone away) → GPS upload TETAP RETURN 200 sukses, user tetap bisa track history, hanya push notif geofence yang tidak jalan (di-log warning level). Juga per broadcast call dibungkus try/catch sendiri untuk one broadcast gagal tidak mengganggu zona lain ✅.
  - **event_type EXACT MATCH Client Handler:** `geofence_enter` & `geofence_exit` (lowercase snake_case, case sensitive) → 100% SAMA dengan handler (a) F5 Android `LitensiFirebaseMessagingService.onMessageReceived` when() switch case event_type (sudah siap handle geofence_enter/exit geofence category BigText Notif); (b) F4 Web Push `public/firebase-messaging-sw.js` native push listener showNotification click_url /monitor.
  - **Zona last_triggered:** Setiap kali zona trigger ENTER / EXIT → update $zona->last_triggered = now(); save() untuk audit kapan zona terakhir kali trigger (untuk UI dashboard card geofence show "Last Triggered 5 menit lalu").
  - Commit Hash: -
  - Status Deploy: **Lokal Verified ✅ PASS 4/4 Simulate Testcase.**

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


