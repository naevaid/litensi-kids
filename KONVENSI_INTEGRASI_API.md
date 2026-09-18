# KONVENSI INTEGRASI DATA HALAMAN FRONTEND ↔ BACKEND
> 🚨 **WAJIB DIBACA SEBELUM EDIT HALAMAN BARU / TAMBAH ENDPOINT**
>
> Penyebab bug tersering: **lupa bahwa `apiClient` otomatis UNWRAP 1x level `data.` dari response Laravel.**
> **ZERO ASSUMPTION PRINCIPLE**: Semua endpoint, parameter, response shape WAJIB diverifikasi dari source code real di bawah ini, JANGAN TEBAK-TEBAK!

---

## 📑 DAFTAR ISI
1. **Konvensi Dasar (Response Unwrap, Parameter, Session Auth)**
2. **Daftar Semua Endpoint API (`/api/v1/*`) Per Modul — DETAIL (Parameter + Response Shape)**
3. **Konvensi Router Laravel (Urutan Route + Regex Wildcard + Defensif Typed Arg)**
4. **Reference Semua Model & Kolom Utama (9 Tabel: fillable + cast + relasi)**
5. **Standard Controller Response Template (Gagal / Sukses / Error 401/404/422)**
6. **Konvensi Frontend (Debug Color, Mapper snake→camel, Banner UI Error & Loading, dll)**
7. **Checklist Integrasi Halaman Baru Step-by-Step**

---

## 1. 🎯 KONVENSI DASAR (PALING PENTING — BACA DULU!)

### 1.1 apiClient Response Unwrap (1x Level `.data` otomatis!)
**Source code acuan**: [apiClient.ts](file:///d:/litensi-kids/src/lib/apiClient.ts#L89-L253) line 217:
```ts
// frontend apiClient line 214-222 (RETURN OBJECT):
return {
  ok: !!ok,                                // Boolean: apakah request sukses (raw.ok && data.success)
  status: raw.status,                      // Number: HTTP status (200, 201, 401, 404, 500, ...)
  data: (data?.data ?? data ?? {}) as T,   // ← AUTO UNWRAP 1X LEVEL `data.`
  raw,                                     // Response object asli
  message: ...                             // String? : error message / success message
};
```

**Format response Laravel STANDARD (semua controller):**
```php
// SEMUA Controller backend RETURN:
return response()->json([
    'success' => true / false,    // Wajib (untuk perhitungan res.ok frontend)
    'message' => 'Pesan opsional',// Optional (untuk toast)
    'data' => [...],              // ← PAYLOAD UTAMA (yang otomatis di-unwrap apiClient)
], 200);
```

### ⚠️ IMPLIKASI DI FRONTEND (JANGAN SALAH AKSES `res.data.data`!)
```ts
const res = await api.get('/contoh-endpoint');

// ❌ SALAH (double unwrap → hasilnya undefined / kosong):
const salah = res.data.data;
const salahList = res.data.data.list;

// ✅ BENAR (cuma akses res.data = payload raw payload.data Laravel):
const benar = res.data;
const list = res.data.list;     // JIKA nested object punya field list (misal notifikasi, master-users)
const summary = res.data.summary;
```

---

### 1.2 BASE URL & Prefix API
| Env | `VITE_API_BASE_URL` | Hasil URL Full per Endpoint |
|---|---|---|
| **Development (Lokal)** | `http://127.0.0.1:8000` | `http://127.0.0.1:8000/api/v1/{endpoint}` |
| **Production (parental.naeva.id)** | `""` (string kosong = same-origin relative) | `/api/v1/{endpoint}` |

**Konstanta source**: [apiClient.ts L8-L28](file:///d:/litensi-kids/src/lib/apiClient.ts#L8-L28)
- `API_PREFIX` = `/api/v1` (dipasang otomatis untuk SEMUA panggilan)

---

### 1.3 Authentication (Simulasi Session via `user_id`)
MVP **belum pakai Sanctum**, ganti nya via **flat query param `user_id`** yang di-inject OTOMATIS oleh apiClient **HANYA JIKA `authRequired=true` (DEFAULT)** dan user sudah login (tersimpan di localStorage key `litensi_session_user`).

**Shortcut api (frontend) — semua args flat (JANGAN DOUBLE NEST `{params: {...}}`!)**:
```ts
import { api } from '../../lib/apiClient';

// ✅ BENAR — parameter object flat (dikirim ke url query string / body)
const paketResp = await api.get('/paket/mine', { user_id: 13 });        // authRequired default true
const listAnak  = await api.get('/anak', { status: 'active' });          // user_id auto inject dari session
const resp1     = await api.post('/anak', { user_id: 13, name: '...' }); // body JSON stringify otomatis
const resp2     = await api.put('/geofence/5', { name: 'Zona Baru' });
const resp3     = await api.del('/notifikasi/12');

// ❌ JANGAN PERNAH DOUBLE NESTED PARAMS (URL SAMPAH: params=%5Bobject%20Object%5D)
const GAGAL = await api.get('/paket/mine', { params: { user_id: 13 } }); // HARAM!
```

**Inject logic source**: [apiClient.ts L109-L131](file:///d:/litensi-kids/src/lib/apiClient.ts#L109-L131)
| HTTP Method | Inject `user_id` | Lokasi Inject |
|---|---|---|
| `GET` | Ya (jika authRequired=true & session ada) | Ditambahkan ke URL `?user_id=13&...` |
| `POST/PUT/PATCH` | Ya | Dimasukkan ke JSON body / FormData field `user_id` |
| `DELETE` | Ya (default authRequired=true) | body (jika ada) |

---

### 1.4 Object Hasil Panggilan api.get/post/put/del di Frontend
```ts
interface ApiResponse<T> {
  ok: boolean;          // true = HTTP 2xx + data.success = true
  status: number;       // 200, 201, 401, 404, 422, 500, ...
  data: T;              // Hasil unwrap data.data Laravel (payload utama)
  raw: Response;        // Response Fetch API asli
  message?: string;     // Message dari Laravel field `data.message` / HTTP statusText (jika gagal)
}
```

---

## 2. 🧾 DAFTAR SEMUA ENDPOINT API (DETAIL — `/api/v1/*`)
> **Source of Truth Route Declaration**: [routes/api.php](file:///d:/litensi-kids/backend/routes/api.php#L1-L128)
> **Aturan ROUTE ORDER**: Semua route **SPESIFIK** (misal `/paket/mine`, `/anak/pairing/*`) DITULIS DULU sebelum **WILDCARD** (`/paket/{id}`, `/anak/{id}`) agar tidak match salah (Laravel router first-match top-down). Wildcard WAJIB tambah `->whereNumber('id')` regex!

---

### 2.1 MODUL AUTH (Publik — `/auth/*`)
| # | HTTP Method | Endpoint | Controller@Method | Auth Req | Query / Body Param Wajib | Response Shape (res.data frontend) | Source Controller |
|---|---|---|---|---|---|---|---|
| A1 | **POST** | `/auth/login` | `AuthController@login` | ❌ Publik | `email: string (email valid)` <br> `password: string` | `{ user: UserObject (hide password/remember_token) }` | [AuthController L14-L40](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AuthController.php#L14-L40) |
| A2 | **POST** | `/auth/register` | `AuthController@register` | ❌ Publik | `name, email (unique), phone (nullable), password (min 6)` | `{ user: UserObject (role=Orang Tua, active_plan=free default) }` <br> HTTP code **201 Created** | [AuthController L42-L71](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AuthController.php#L42-L71) |
| A3 | **POST** | `/auth/logout` | `AuthController@logout` | ❌ Publik | - | `{}` (empty object, success message saja) | [AuthController L99-L106](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AuthController.php#L99-L106) |
| A4 | **GET** | `/auth/me` | `AuthController@me` | ✅ | `user_id: int (wajib, TIDAK BOLEH ADA FALLBACK DEFAULT!)` | Berhasil: `{ user: UserObject }` <br> Gagal/No user_id: **HTTP 401** `{ success=false, message="user_id tidak valid atau belum login" }` (EMPTY DATA, tidak unwrap) | [AuthController L73-L97](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AuthController.php#L73-L97) |

> ⚠️ **ZERO TOLERANCE PRIVASI RULE**: Controller untuk endpoint berbasis user (`/auth/me`, `/dashboard/`, `/paket/mine`, `/anak`, dll) **DILARANG KERAS** menyertakan default `user_id = 1` atau apapun! Jika kosong → return 401 / empty list JUJUR.

---

### 2.2 MODUL SISTEM PUBLIK (Health + Pengumuman)
| # | HTTP Method | Endpoint | Controller@Method | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|---|
| S1 | GET | `/system/health` | `MasterSistemController@healthCheck` | ❌ | - | `{ app_name, app_version, maintenance_mode, server_status, fcm_push_status, database_status, registration_open, timestamp (ISO) }` | [MasterSistem L99-L117](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterSistemController.php#L99-L117) |
| P1 | GET | `/pengumuman` (READ Publik) | `PengumumanController@index` | ❌ | `active_only: boolean (default true)` <br> `target: 'modal'\|'header'\|'both' (opsional)` | `PengumumanObject[]` (array list semua pengumuman aktif + sesuai target filter) | [Pengumuman L12-L39](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PengumumanController.php#L12-L39) |
| P2 | GET | `/pengumuman/{id}` (READ Publik) | `PengumumanController@show` | ❌ | `id (numeric)` | `PengumumanObject` single row | [Pengumuman L41-L50](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PengumumanController.php#L41-L50) |

---

### 2.3 MODUL PAKET LANGGANAN (Public + Protected)
> ⚠️ **KONVENSI KRITIS**: Route `/paket/mine` dan `/paket/upgrade` **DIDETEK SEBELUM** `/paket/{id}` + wildcard memiliki `->whereNumber('id')`! Jika terbalik → `/paket/mine` match ke `{id}` → `show("mine")` call dengan typed arg int → **TypeError HTTP 500!** Source rute: [routes/api.php L32-L38](file:///d:/litensi-kids/backend/routes/api.php#L32-L38)

| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| PK1 | GET | `/paket` (READ Publik list) | ❌ | `status: 'active' \| 'archived' \| 'all'` (default 'active') | `PaketLanggananObject[]` (array all paket urut by monthly_price ASC) | [PaketController L13-L28](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L13-L28) |
| PK2 | **GET** | `/paket/mine` (STATUS PAKET USER AKTIF) | ✅ | `user_id (wajib int, NO FALLBACK → 401 jika kosong)` | Object nested: <br> `{ active_plan (raw), active_plan_normalized (snake), active_plan_label, expires_at (ISO 8601 / null), status, children_count, devices_count, paket: PaketLanggananObject }` | [PaketController L90-L148](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L90-L148) |
| PK3 | **POST** | `/paket/upgrade` (Ganti Paket User) | ✅ | `user_id (wajib int)` <br> `paket_id (exists paket_langganan.id)` <br> `periode: 'bulanan' \| 'tahunan'` | `{ user: UserObject (updated), paket: PaketLanggananObject }` <br> **Catatan**: `users.active_plan` SELALU disimpan SNAKE_CASE normalized, label dari badge/name. | [PaketController L183-L224](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L183-L224) |
| PK4 | GET | `/paket/{id}` (READ Publik single) | ❌ | `id (numeric ONLY via whereNumber)` | `PaketLanggananObject` single (404 jika bukan numeric / tidak ada) | [PaketController L30-L46](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L30-L46) |
| PK5 | POST | `/paket` (CREATE Admin) | ✅ | `name (unique), tagline, description, monthly_price (int >=0), annual_price (int >=0), status (active/archived, opsional)` | HTTP **201**, `{ paket }` | [PaketController L48-L67](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L48-L67) |
| PK6 | PUT/PATCH | `/paket/{id}` (UPDATE Admin) | ✅ | name / monthly_price / annual_price / status (all sometimes) | `{ paket }` updated | [PaketController L69-L88](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L69-L88) |
| PK7 | DELETE | `/paket/{id}` (DELETE Admin) | ✅ | - | Empty data + message success | [PaketController L226-L236](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L226-L236) |

---

### 2.4 MODUL DASHBOARD (Protected per user_id)
| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| D1 | GET | `/dashboard` (Ringkasan Utama) | ✅ | `user_id (wajib int; jika kosong → return summary 0 JUJUR tanpa fallback)` | Nested object: <br> `{ summary: { total_anak, total_device, total_perangkat_online, total_zona_geofence, total_notifikasi, total_notifikasi_unread, video/audio_used_minutes, video/audio_max_minutes, fetched_at, has_valid_user? }, daftar_perangkat: [{id, anak_name, device_name, is_online, battery_level}], master_summary {total_user, total_paket_aktif, total_pendapatan_7hari, total_profil_anak}, notifikasi_terbaru [], log_geofence [] }` | [Dashboard L18-L136](file:///d:/litensi-kids/backend/app/Http/Controllers/API/DashboardController.php#L18-L136) |
| D2 | GET | `/dashboard/weekly-stats` (Waktu Layar 7 Hari — ZERO HARDCODE BASELINE!) | ✅ | `user_id (wajib; jika kosong → weekly_data[] kosong JUJUR)` | `{ weekly_data: [{day, date, total_minutes, belajar_minutes, hiburan_minutes, log_geofence_count, notifikasi_count, is_weekend, has_activity}][] , total_minutes_7d, avg_daily_hours, period_start, period_end, has_any_activity }` | [Dashboard L140-L221](file:///d:/litensi-kids/backend/app/Http/Controllers/API/DashboardController.php#L140-L221) |
| D3 | GET | `/dashboard/paket-options` (Dropdown paket) | ❌ | - | `PaketLanggananObject[]` (hanya status active) | [Dashboard L223-L232](file:///d:/litensi-kids/backend/app/Http/Controllers/API/DashboardController.php#L223-L232) |

---

### 2.5 MODUL ANAK & PAIRING (Protected / Pairing First Pattern)
> **Aturan Urutan Route**: `/anak/pairing/generate`, `/anak/pairing/confirm`, `/anak/pairing/status` **DITULIS DULU** sebelum wildcard `/anak/{id}`! [routes/api.php L48-L60](file:///d:/litensi-kids/backend/routes/api.php#L48-L60)

| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| AN1 | POST | `/anak/pairing/generate` (Step 1: Tambah Anak) | ✅ | `user_id (dari session auto-inject)` | `{ code, pin, qr_payload (JSON string t=litensi-pair v=1), expires_at (ISO +10menit), paired (false) }` | [AnakController L49-L91](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L49-L91) |
| AN2 | GET | `/anak/pairing/status` (Poll status realtime) | ✅ | `code (wajib)` <br> `simulate_paired: boolean (opsional testing)` | `{ code, paired (boolean), device_info?: {...}, paired_at?: ISO, expired: boolean }` (404 jika kode expire) | [AnakController L93-L143](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L93-L143) |
| AN3 | POST | `/anak/pairing/confirm` (Step 2: Confirm dari Android Companion App) | ❌ Publik | `code, pin (wajib)` <br> `device_id, nama_perangkat, model, os_version, app_version, battery (0-100), fcm_token` (semua opsional) | `{ code, paired:true, paired_at, device_info, user_id, profil_anak?: ProfilAnakObject (jika sudah disimpan), expires_at }` <br> Error 409 (conflict) jika sudah dipakai, 422 jika PIN salah | [AnakController L145-L240](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L145-L240) |
| AN4 | GET | `/anak` (List Profil Anak per User) | ✅ | `user_id (wajib; kosong → [])` | `ProfilAnakObject[]` (with user relation, urut name ASC) | [AnakController L14-L36](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L14-L36) |
| AN5 | GET | `/anak/{id}` (Detail Single) | ✅ | - | `ProfilAnakObject (with user)` | [AnakController L38-L47](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L38-L47) |
| AN6 | POST | `/anak` (CREATE Simpan Profil Anak Setelah Pairing) | ✅ | `user_id, name, age (int), gender (laki-laki/perempuan), device_name` (wajib) <br> `status (active/restricted/locked), qr_pairing_code, pairing_pin` (opsional) | HTTP 201. `{ ProfilAnakObject (with user) }`. **Auto update** `users.children_count` + `devices_count`. Clear cache pairing jika `qr_pairing_code` disertakan. | [AnakController L242-L275](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L242-L275) |
| AN7 | PUT/PATCH | `/anak/{id}` (UPDATE) | ✅ | name/age/gender/device_name/status (sometimes) | `{ ProfilAnakObject (updated with user) }` | [AnakController L277-L297](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L277-L297) |
| AN8 | DELETE | `/anak/{id}` (HAPUS + cascade update jumlah anak user) | ✅ | - | Empty data message | [AnakController L299-L319](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AnakController.php#L299-L319) |

---

### 2.6 MODUL GEOFENCE
| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| GF1 | GET | `/geofence` (List Zona) | ✅ | `user_id (wajib; kosong → [])` | `ZonaGeofenceObject[]` (with user relation) | [Geofence L13-L35](file:///d:/litensi-kids/backend/app/Http/Controllers/API/GeofenceController.php#L13-L35) |
| GF2 | GET | `/geofence/logs` (List Riwayat Trigger) | ✅ | `zona_id?` <br> `limit (default 50)` <br> `user_id (opsional TAPI WAJIB FILTER PRIVASI via zonaGeofence.user_id!)` | `LogGeofenceObject[]` (with zonaGeofence relation, order timestamp desc LIMIT 50) | [Geofence L105-L134](file:///d:/litensi-kids/backend/app/Http/Controllers/API/GeofenceController.php#L105-L134) |
| GF3 | POST | `/geofence/logs` (Tambah Log dari Perangkat Anak) | ❌ Publik | `zona_geofence_id? (nullable exists)` <br> `child_name, device_name, zone_name, zone_type (safe/danger/warning/school/home), event_type (enter/exit/dwell), timestamp (date)` (wajib) | HTTP 201, `LogGeofenceObject`. Auto `zonaGeofence.last_triggered = now()` jika ada zona_id. | [Geofence L136-L162](file:///d:/litensi-kids/backend/app/Http/Controllers/API/GeofenceController.php#L136-L162) |
| GF4 | GET | `/geofence/{id}` (Detail Zona + Log) | ✅ | - | `ZonaGeofenceObject (with user + logGeofence)` | [Geofence L37-L46](file:///d:/litensi-kids/backend/app/Http/Controllers/API/GeofenceController.php#L37-L46) |
| GF5 | POST | `/geofence` (CREATE Zona) | ✅ | `user_id, name, category (safe/danger/warning/school/home), address, latitude (decimal), longitude (decimal), radius_meters (int >=10)` | HTTP 201, `ZonaGeofenceObject (with user)` | [Geofence L48-L68](file:///d:/litensi-kids/backend/app/Http/Controllers/API/GeofenceController.php#L48-L68) |
| GF6 | PUT/PATCH | `/geofence/{id}` (UPDATE Zona) | ✅ | name/category/latitude/longitude/radius_meters/status (active/inactive) → all sometimes | `ZonaGeofenceObject (updated)` | [Geofence L70-L91](file:///d:/litensi-kids/backend/app/Http/Controllers/API/GeofenceController.php#L70-L91) |
| GF7 | DELETE | `/geofence/{id}` (DELETE Zona) | ✅ | - | Empty data message | [Geofence L93-L103](file:///d:/litensi-kids/backend/app/Http/Controllers/API/GeofenceController.php#L93-L103) |

---

### 2.7 MODUL NOTIFIKASI DITERUSKAN
| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| NT1 | GET | `/notifikasi` (List + Summary) | ✅ | `user_id (wajib; kosong → list[] summary{0,0,0,0})` <br> Opsional filter: `kategori (app_category), starred_only (boolean), unread_only (boolean), limit (default:50)` | Nested: `{ list: NotifikasiDiteruskanObject[] (with user + profilAnak relation), summary: { total (jumlah hasil filter), unread (total seluruh user not read), starred, flagged } }` | [Notifikasi L12-L72](file:///d:/litensi-kids/backend/app/Http/Controllers/API/NotifikasiController.php#L12-L72) |
| NT2 | POST | `/notifikasi/mark-all-read` (Tandai Semua Dibaca) | ✅ | `user_id (wajib; kosong → marked_count 0)` | `{ marked_count (int) }` | [Notifikasi L131-L154](file:///d:/litensi-kids/backend/app/Http/Controllers/API/NotifikasiController.php#L131-L154) |
| NT3 | GET | `/notifikasi/{id}` (Detail Single) | ✅ | - | `NotifikasiDiteruskanObject`. **SIDE EFFECT**: jika belum is_read → otomatis update `is_read=true` lalu refresh. | [Notifikasi L74-L89](file:///d:/litensi-kids/backend/app/Http/Controllers/API/NotifikasiController.php#L74-L89) |
| NT4 | POST | `/notifikasi` (CREATE Notifikasi dari Perangkat) | ❌ Publik | `user_id (exists), profil_anak_id? (exists), child_name, device_name, app_name, content, timestamp (date)` | HTTP 201, `NotifikasiDiteruskanObject (load user + profilAnak)` | [Notifikasi L91-L111](file:///d:/litensi-kids/backend/app/Http/Controllers/API/NotifikasiController.php#L91-L111) |
| NT5 | PUT/PATCH | `/notifikasi/{id}` (UPDATE Status: Read / Star / Flag) | ✅ | HANYA terima 5 field: `is_read, is_starred, is_flagged, flag_reason` (via `$request->only([...])`) | `NotifikasiDiteruskanObject (updated)` | [Notifikasi L113-L129](file:///d:/litensi-kids/backend/app/Http/Controllers/API/NotifikasiController.php#L113-L129) |
| NT6 | DELETE | `/notifikasi/{id}` (HAPUS) | ✅ | - | Empty data message | [Notifikasi L156-L166](file:///d:/litensi-kids/backend/app/Http/Controllers/API/NotifikasiController.php#L156-L166) |

---

### 2.8 CRUD PENGUMUMAN ADMIN (selain public L2.2)
| # | HTTP Method | Endpoint | Auth | Param | Response | Source |
|---|---|---|---|---|---|---|
| PA1 | POST | `/pengumuman` | ✅ Admin | `title, description (wajib)` <br> `content_type (text/image/video/combined), display_target (modal/header/both), start_date, end_date (>= start_date)` | HTTP 201, `PengumumanObject` | [Pengumuman L52-L71](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PengumumanController.php#L52-L71) |
| PA2 | PUT/PATCH | `/pengumuman/{id}` | ✅ Admin | title/description/start_date/end_date (all sometimes) | `PengumumanObject updated` | [Pengumuman L73-L92](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PengumumanController.php#L73-L92) |
| PA3 | DELETE | `/pengumuman/{id}` | ✅ Admin | - | Message empty data | [Pengumuman L94-L104](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PengumumanController.php#L94-L104) |

---

### 2.9 MASTER: Kelola Pengguna (Admin)
| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| MU1 | GET | `/master-users` | ✅ | Filter opsional: `role (all/Orang Tua/Master/Owner), status (all/active/suspended/trial), plan (all/free/premium/family_pro), search (name/email/phone LIKE), limit (default 100)` | Nested: `{ list: UserObject[] (with total_anak via withCount, hide password/remember), summary: { total, orang_tua, aktif, premium, family_pro } }` | [MasterUser L14-L63](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterUserController.php#L14-L63) |
| MU2 | GET | `/master-users/{id}` | ✅ | - | `UserObject (with profilAnak[] relation; hide password/remember)` | [MasterUser L65-L76](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterUserController.php#L65-L76) |
| MU3 | POST | `/master-users` (CREATE User Admin) | ✅ | `name, email (unique), password (min 6)` (wajib) <br> opsional: `phone, role, active_plan (free/premium/family_pro), status (active/suspended/trial)` (default: role=Orang Tua, plan=free, status=trial expires+7hari) | HTTP 201, `UserObject (hide password)` | [MasterUser L78-L108](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterUserController.php#L78-L108) |
| MU4 | PUT/PATCH | `/master-users/{id}` (UPDATE) | ✅ | `name, email (unique kecuali dirinya), role, active_plan, status` (sometimes) + opsional update password | `UserObject (updated, hide password)` | [MasterUser L110-L136](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterUserController.php#L110-L136) |
| MU5 | DELETE | `/master-users/{id}` (DELETE CASCADE) | ✅ | - | Message sukses (user.name) | [MasterUser L138-L149](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterUserController.php#L138-L149) |

---

### 2.10 MASTER: Kelola Pendapatan
| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| MP1 | GET | `/master-pendapatan` | ✅ | Filter: `status (all/sukses/menunggu/kadaluwarsa/gagal/refund), provider, date_from, date_to, search (user_name/user_email/item/invoice_no), limit (100)` | Nested: `{ list: CatatanPendapatanObject[] (with user rel), summary: { total_transaksi (count list), total_nominal_sukses (SUM semua status=sukses seluruh), total_nominal_menunggu, average_transaksi } }` | [MasterPendapatan L13-L71](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterPendapatanController.php#L13-L71) |
| MP2 | GET | `/master-pendapatan/{id}` | ✅ | - | `CatatanPendapatanObject (with user)` | [MasterPendapatan L73-L82](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterPendapatanController.php#L73-L82) |
| MP3 | POST | `/master-pendapatan` (CREATE Manual) | ✅ | `user_name, user_email, item, amount (int >=0), provider, status (enum), transaction_date (date)` | HTTP 201, `{ transaksi }` | [MasterPendapatan L84-L104](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterPendapatanController.php#L84-L104) |
| MP4 | PUT/PATCH | `/master-pendapatan/{id}` (UPDATE Status/Amount) | ✅ | `status? (sometimes enum), amount? (int)` | `{ transaksi }` | [MasterPendapatan L106-L123](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterPendapatanController.php#L106-L123) |
| MP5 | DELETE | `/master-pendapatan/{id}` | ✅ | - | Message invoice_no | [MasterPendapatan L125-L136](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterPendapatanController.php#L125-L136) |

---

### 2.11 MASTER: Konfigurasi Sistem & Stats
| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| MS1 | GET | `/master-sistem` (Single Row Konfigurasi) | ✅ | - | `KonfigurasiSistemObject` (jika row belum ada di DB → auto create default `app_name=Litensi Kids`) | [MasterSistem L16-L31](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterSistemController.php#L16-L31) |
| MS2 | GET | `/master-sistem/stats` (Statistik Global untuk Dashboard Master) | ✅ | - | `{ total: { user_orang_tua, profil_anak, pendapatan_sukses, pengumuman_aktif }, per_plan: { free: N, premium:N, family_pro:N } (pluck), per_status: { active:N, trial:N, suspended:N } (pluck), per_provider: [{provider, total, amount}][] (GROUP BY provider) }` | [MasterSistem L57-L97](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterSistemController.php#L57-L97) |
| MS3 | PUT/PATCH | `/master-sistem` (UPDATE Single Row) | ✅ | semua field fillable KonfigurasiSistem (sometimes). Jika row kosong → auto CREATE (201) | `{ konfigurasi }` updated / created | [MasterSistem L33-L55](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MasterSistemController.php#L33-L55) |

---

## 3. 🚦 KONVENSI ROUTER LARAVEL (MENGHINDARI HTTP 500 TYPEERROR)
> **Root Cause Bug Terdahulu**: Route wildcard `/paket/{id}` dideklarasikan DULU sebelum `/paket/mine` → `/paket/mine` URL cuma match WILDCARD DULU (top-down first-match) → call `show("mine")` dengan typed arg `show(int $id)` → **PHP 8 TypeError HTTP 500**. TIDAK TERDETEKSI via CLI App::make controller (karena lewat router!).

### ✅ POLA YANG WAJIB DITERAPKAN SEMUA MODUL:
```php
// routes/api.php — BENAR URUTAN
Route::prefix('modul')->group(function () {
    // ① TULIS DULU SEMUA ROUTE SPESIFIK (non-wildcard path / prefix berbeda):
    Route::post('/action/generate', [C::class, 'generate']);
    Route::post('/action/confirm',  [C::class, 'confirm']);
    Route::get ('/action/status',   [C::class, 'status']);
    Route::get ('/mine',            [C::class, 'mine']);
    Route::post('/upgrade',         [C::class, 'upgrade']);

    // ② BARU TERAKHIR: ROUTE CRUD WILDCARD {id}
    Route::get   ('/',              [C::class, 'index']);
    Route::post  ('/',              [C::class, 'store']);
    Route::get   ('/{id}',          [C::class, 'show'])    ->whereNumber('id'); // ← WAJIB REGEX!
    Route::put   ('/{id}',          [C::class, 'update'])  ->whereNumber('id');
    Route::patch ('/{id}',          [C::class, 'update'])  ->whereNumber('id');
    Route::delete('/{id}',          [C::class, 'destroy']) ->whereNumber('id');
});
```

### ✅ POLA DEFENSIF DI CONTROLLER (BLOCK HUMAN ERROR ROUTE URUTAN):
JANGAN pakai **strict type-hint int di parameter URL wildcard method controller**! (Jika route regex terlewat, string "mine" masuk → TypeError fatal). Ganti dengan untyped + validasi manual:
```php
// ❌ JANGAN (bahaya TypeError jika route order salah regex gagal):
public function show(int $id): JsonResponse { ... }

// ✅ SELALU GUNAKAN (DEFENSIF):
public function show($id): JsonResponse
{
    if (!is_numeric($id) || (int)$id <= 0) {
        return response()->json([
            'success' => false,
            'message' => 'ID tidak valid (harus numeric positif)',
        ], 404);
    }
    $row = ModelName::findOrFail((int)$id);
    // ...
}
```
**Sudah diterapkan di:** `PaketController@show($id)` L30-L46 (source contoh acuan).

---

## 4. 🗃️ REFERENSI SEMUA MODEL UTAMA (9 TABEL DATABASE)
> **Source of Truth**: `D:\litensi-kids\backend\app\Models\*.php` — semua isi fillable + casts + relasi DIBACA LANGSUNG dari file model, JANGAN ASUMSI!

### 4.1 `users` (Orang Tua / Master / Owner) → [User.php](file:///d:/litensi-kids/backend/app/Models/User.php)
| Kolom | Tipe Data Cast | Fillable? | Catatan Penting |
|---|---|---|---|
| `id` | bigint (auto) | ❌ | PK |
| `name, email, phone, avatar_url` | string | ✅ | `email (unique)` |
| `role` | string | ✅ | Enum: `'Orang Tua'` (default register) / `'Master'` / `'Owner'` |
| `password` | `'hashed'` cast | ✅ | `Hash::make()` sebelum save |
| `active_plan` | **STRING SNAKE_CASE** | ✅ | **KONSISTENSI KRITIS**: Selalu simpan snake_case (`free`, `premium`, `family_pro`). Bandingkan dengan `paket_langganan.name` (Title Case) → WAJIB NORMALISASI KEDUA SISI dulu dengan preg_replace `/[^a-zA-Z0-9]+/g, '_'` (helper `normalizePlanId` PHP & TS). |
| `active_plan_label` | string | ✅ | Label badge/name dari paket (misal "Family Pro") |
| `children_count, devices_count` | `integer` cast | ✅ | Auto sync saat create/delete ProfilAnak |
| `expires_at` | **`date`** cast (STRING tanggal `Y-m-d`, BUKAN datetime Carbon object!) | ✅ | **CRITICAL BUG PREVENTION**: Jangan langsung call `$user->expires_at->toISOString()` → TypeError! Pakai helper `formatExpiresAtSafe(mixed $value)` (try/catch + Carbon::parse untuk string). Source: [PaketController L151-L175](file:///d:/litensi-kids/backend/app/Http/Controllers/API/PaketController.php#L151-L175). |
| `status` | string | ✅ | Enum: `active` / `suspended` / `trial` (default trial expires+7days) |
| `last_active` | `datetime` cast | ✅ | Update setiap login / me() |
| `password, remember_token` | ❌ `hidden` di array | ❌ | Auto tersembunyi → `$user->makeHidden(['password','remember_token'])` selalu dilakukan sebelum return |
| **Relasi** | | | `profilAnak: HasMany`, `zonaGeofence: HasMany`, `catatanPendapatan: HasMany`, `notifikasiDiteruskan: HasMany` |

---

### 4.2 `paket_langganan` (3 Row Default: Free, Premium, Family Pro) → [PaketLangganan.php](file:///d:/litensi-kids/backend/app/Models/PaketLangganan.php)
| Kelompok | Kolom | Tipe Cast | Catatan |
|---|---|---|---|
| **Identitas** | `name (unique Title Case), badge, tagline, description` | string | `badge` = misal "POPULER", label gratis, "Paling Laris" |
| **Harga** | `monthly_price, annual_price` | `integer` | Rp (misal 39000, 99000, 0 untuk Free) |
| **Popular & Status** | `popular, status, active_users_count` | `boolean` / `string` / `integer` | status: `active` / `archived` |
| **8 Fitur Batasan + Label** | Semua ada **2 kolom (value enum/bool/int + label display string)** untuk frontend `*_label`! (Semakin DRY — tinggal show label saja di UI tanpa fallback hardcode): <br><br> ① Perangkat Anak: `max_children_devices (integer ≥0=unlimited)` + **`max_children_devices_label (string, baru ditambahkan 2026-09-18)`** <br> ② Lokasi GPS: `location_tracking (enum string: 'dasar'/'realtime_7d'/'realtime_30d_sos')` + `location_tracking_label` <br> ③ Kontrol Aplikasi: `app_restriction (enum 'terbatas_3'/'unlimited_jadwal'/'unlimited_ai')` + `app_restriction_label` <br> ④ Audio 1 Arah: `one_way_audio (boolean)` + `one_way_audio_label` <br> ⑤ Live Kamera: `live_camera (boolean)` + `live_camera_label` <br> ⑥ Area Geofence: `max_geofences (integer / string unlimited)` + `max_geofences_label` <br> ⑦ Notif Chat: `read_message_notifications (boolean)` + `read_message_notifications_label` <br> ⑧ Kunci Layar: `remote_screen_lock (boolean)` + `remote_screen_lock_label` | `boolean/integer` + `string` | **Pola Renderer UI:** di frontend `LanggananTab.tsx PAKET_FEATURE_SPECS[]` L38-L59, SEMUA 8 item: `renderValue: (l) => String(l.fieldLabel || '—')`. BADGE HIGHLIGHT: kolom `highlight_features (array cast = JSON)`. Dipakai Cuma di FullGrid halaman utama, CompactList (card modal/admin) HAPUS karena duplikat. |
| **Highlight** | `highlight_features` | `array` cast (JSON di DB) | Array string fitur unggulan (untuk chip badge Sparkles). Default: `[]` |

---

### 4.3 `profil_anak` → [ProfilAnak.php](file:///d:/litensi-kids/backend/app/Models/ProfilAnak.php)
| Fillable | Tipe Cast | Catatan |
|---|---|---|
| `user_id (FK users.id), name, age (int), gender (enum laki-laki/perempuan)` | - | Wajib saat POST CREATE |
| `device_name, device_model, os_version, battery_level (int 0-100), is_online (bool)` | `battery_level:int`, `is_online:bool` | Device info dari Android setelah pairing |
| `status (enum active/restricted/locked), avatar, notes` | string | Status kontrol Orang Tua |
| `qr_pairing_code, pairing_pin, paired_at (datetime), last_active (datetime)` | `paired_at:datetime, last_active:datetime` | Flow Pairing-First Pattern |
| `used_today` | - | Proxy usage time |
| **Relasi** | BelongsTo `User:belongsTo` | FK user_id cascade |

---

### 4.4 `zona_geofence` → [ZonaGeofence.php](file:///d:/litensi-kids/backend/app/Models/ZonaGeofence.php)
| Fillable | Tipe Cast | Catatan |
|---|---|---|
| `user_id (FK users), name, category (enum safe/danger/warning/school/home), address` | string | Wajib POST |
| `latitude, longitude (decimal:7 presisi 7 digit), radius_meters (int >= 10 minimum)` | `latitude/longitude: 'decimal:7'`; `radius_meters: int` | WGS84 Koordinat + Radius meter |
| `assigned_children (array JSON int ID anak), notify_on_enter (bool), notify_on_exit (bool)` | `assigned_children: array`; 2 boolean | Notifikasi trigger event enter/exit |
| `status (enum active/inactive), color, last_triggered (datetime)` | `last_triggered: datetime` | Update saat LogGeofence ditambahkan |
| **Relasi** | `BelongsTo User`, `HasMany LogGeofence (zona_geofence_id)` | |

---

### 4.5 `log_geofence` → [LogGeofence.php](file:///d:/litensi-kids/backend/app/Models/LogGeofence.php)
| Fillable | Tipe Cast | Catatan |
|---|---|---|
| `zona_geofence_id (nullable FK zonageofence.id, bisa null zona dihapus)` | bigint | Bisa null (cascade soft) |
| `child_name, device_name, zone_name, zone_type (enum), event_type (enum enter/exit/dwell), timestamp (datetime!)` | `timestamp: datetime` | Wajib create dari Perangkat Anak |
| `location_coordinates, battery_status, accuracy` | string | Opsional debug GPS |
| **Relasi** | `BelongsTo zonaGeofence (nullable)` | |

---

### 4.6 `notifikasi_diteruskan` → [NotifikasiDiteruskan.php](file:///d:/litensi-kids/backend/app/Http/Controllers/API/NotifikasiDiteruskan.php)
| Fillable | Tipe Cast | Catatan |
|---|---|---|
| `user_id (FK), profil_anak_id? (nullable FK profil_anak.id), child_name, device_name, app_name, app_package, app_category (enum social/game/education/...), sender_or_title, content` | string | Wajib dari perangkat |
| `timestamp (datetime)` | `datetime` cast | Waktu notifikasi asli dari perangkat |
| `is_read, is_starred, is_flagged, is_sensitive` | **4 kolom boolean cast** | Status kontrol oleh Orang Tua di frontend |
| `flag_reason, sensitive_category` | string | Alasan flag, Klasifikasi konten sensitif (kekerasan, dewasa, dll) |
| **Relasi** | `BelongsTo: User + ProfilAnak` | |

---

### 4.7 `pengumuman` → [Pengumuman.php](file:///d:/litensi-kids/backend/app/Models/Pengumuman.php)
| Fillable | Tipe Cast | Catatan |
|---|---|---|
| `title, badge_text, badge_color, description` | string | Display header + CTA |
| `content_type (enum text/image/video/combined), image_url, video_url` | string | Media body |
| `display_target (modal/header/both), start_date (date), end_date (date >= start_date), is_active (bool)` | 2x `date` cast + `boolean` | Filter index() otomatis |
| `cta_label, cta_url, author` | string | Call To Action |

---

### 4.8 `catatan_pendapatan` → [CatatanPendapatan.php](file:///d:/litensi-kids/backend/app/Models/CatatanPendapatan.php)
| Fillable | Tipe Cast | Catatan |
|---|---|---|
| `user_id? (FK nullable), user_name, user_email, user_phone, item, amount (integer rupiah)` | `amount: integer cast` | Transaksi (upgrade paket, dll) |
| `provider (Midtrans/Xendit/Manual/Bank Transfer dll)` | string | Payment Provider |
| `status (enum sukses/menunggu/kadaluwarsa/gagal/refund), transaction_date` | `transaction_date: datetime` | Status workflow |
| `invoice_no` | string | Opsional, unik untuk laporan |
| **Relasi** | `BelongsTo User (nullable)` | |

---

### 4.9 `konfigurasi_sistem` → [KonfigurasiSistem.php](file:///d:/litensi-kids/backend/app/Models/KonfigurasiSistem.php)
(1 SINGLE ROW SELURUH APLIKASI — PK id=1 selalu; MasterSistemController@index auto-create default jika kosong!)

| Kelompok | Fillable + Cast | Catatan |
|---|---|---|
| **Identitas App** | `app_name, app_version (string)` | |
| **Maintenance & Registrasi** | `maintenance_mode (bool), maintenance_notice, registration_open (bool), max_trial_days (integer)` | |
| **Server & Infra** | `server_region, server_status (optimal/degraded/down), fcm_push_status, database_status, sms_gateway_active (bool), whatsapp_gateway_active (bool)` | Untuk `/system/health` |
| **Support** | `support_email, support_phone (string)` | |

---

## 5. 📋 STANDARD CONTROLLER RESPONSE TEMPLATE (KONSISTEN — COPY PASTE AJA)

### 5.1 SUKSES (READ/UPDATE)
```php
return response()->json([
    'success' => true,
    'message' => 'Data berhasil diperbarui',  // Opsional
    'data'    => $modelInstance / $collection / ['list' => [...], 'summary' => [...]],
]);
```

### 5.2 SUKSES CREATE (POST)
```php
return response()->json([
    'success' => true,
    'message' => 'Data baru berhasil disimpan',
    'data'    => $modelInstance->load('relationName'),
], 201); // HTTP 201 Created WAJIB!
```

### 5.3 SUKSES DELETE
```php
return response()->json([
    'success' => true,
    'message' => 'Data berhasil dihapus',
    // 'data' tidak perlu / empty
]);
```

### 5.4 UNAUTHORIZED (user_id tidak valid / belum login)
```php
// TIDAK BOLEH ADA FALLBACK DEFAULT USER ID = 1 ATAU APAPUN!
if (empty($userId) || !is_numeric($userId)) {
    return response()->json([
        'success' => false,
        'message' => 'user_id tidak valid atau belum login',
    ], 401);
}
```

### 5.5 NOT FOUND 404
```php
if (!is_numeric($id) || (int)$id <= 0) {
    return response()->json([
        'success' => false,
        'message' => 'ID tidak valid (harus angka positif)',
    ], 404);
}
// ATAU (Eloquent findOrFail → auto ModelNotFoundException; tapi untuk defensif → handle manual juga bagus):
if (!$row = Model::find($id)) {
    return response()->json(['success'=>false,'message'=>'Data tidak ditemukan'],404);
}
```

### 5.6 UNPROCESSABLE ENTITY 422
```php
// Otomatis jika Laravel validator $request->validate() throws ValidationException
// (akan return JSON { message: "The field ... required", errors: { field: [array pesan] } })
```

---

## 6. 🎨 KONVENSI FRONTEND STANDAR (copy dari sebelumnya + update terbaru)

### 6.1 Warna Debug Console per Domain Halaman
**SETIAP PANGGILAN API WAJIB `console.groupCollapsed('%c[Domain] pesan', 'color:#<KODE>;font-weight:700')** agar user mudah filter di DevTools Console:

| Domain Halaman | Kode Warna | Contoh Log |
|---|---|---|
| **API Client umum** | `#3b82f6` Biru | `[API] GET /paket/mine` |
| **Auth / Role Gatekeeping** | `#dc2626` Merah Tua | `[AdminDashboard] Init Role Gatekeeping` |
| **Dashboard Overview** | `#6366f1` Indigo Terang | `[DashboardOverviewPage] fetchData()` |
| **🔴 Paket Langganan (Konsistensi Family Pro / Modal)** | `#b45309` Amber Coklat | `[LanggananTab] loadPaket mineResp.ok=true` |
| **Master Pengguna** | `#4f46e5` Indigo Tua | `[MasterPengguna] loadData` |
| **Master Pendapatan** | `#059669` Hijau Tua | `[MasterPendapatan] loadData` |
| **Master Sistem / Konfigurasi** | `#7c3aed` Ungu | `[MasterSistem] PUT /master-sistem` |
| **Geofence & Zona** | `#0d9488` Teal Tosca | `[Geofence] loadData GET /geofence + logs` |
| **🔴 Riwayat Notifikasi** | `#ec4899` PINK | `[Notifikasi] loadData GET /notifikasi` |
| **🟦 Pengumuman** | `#0ea5e9` SKY Biru Muda | `[Pengumuman] loadData GET /pengumuman` |
| **Kelola Anak / Pairing** | `#6366f1` Indigo | `[Anak] Load daftar profil anak → GET /anak` |

---

### 6.2 Konvensi Mapper (snake_case DB → camelCase TS + Value Cast JUJUR)
**1 Interface TS = 1 Mapper Function**. Lokasi: **DI ATAS SEBELUM EXPORT COMPONENT PAGE**
```ts
const mapDbNamaTabelToInterface = (dbRow: any): TargetTsInterface => {
  return {
    id: String(dbRow.id ?? Date.now()),
    // snake → camel:
    childName: dbRow.child_name ?? '',
    isRead: !!dbRow.is_read,               // tinyint(1) → boolean cast JUJUR
    starred: !!dbRow.is_starred,
    flagReason: dbRow.flag_reason ?? undefined,
    // Cast type jika perlu:
    latitude: Number(dbRow.latitude ?? 0),  // STRING decimal → Number
    longitude: Number(dbRow.longitude ?? 0),
    // Enum map / format:
    appCategory: dbRow.app_category === 'games' ? 'game' : dbRow.app_category,
    // Format timestamp (RELATIF / ISO sesuai kebutuhan UI)
    timestamp: formatTimestampRelatif(dbRow.timestamp ?? ''),
  };
};
```

**Khusus Subscription Plan ↔ DB Mapping (Sudah Ada di LTab):** [LanggananTab.tsx L16-L225](file:///d:/litensi-kids/src/components/pengaturan/LanggananTab.tsx#L16-L225) export `normalizePlanId (string → snake_case)`, `mapDbPaketToPlan (dbRow → SubscriptionPlan with limits 8 item)` dan reusable renderer `PAKET_FEATURE_SPECS[]` + `PaketFeaturesCompactList` + `PaketFeaturesFullGrid`. **JANGAN BUAT DUPLIKAT BARU!** Cukup import dari LanggananTab untuk semua halaman perlu menampilkan fitur paket.

---

### 6.3 Banner UI Error & Loading Pattern Wajib
**Pertama setelah return `<div>...` sebelum konten apapun:**
```tsx
// 1. Banner Error (WARNA ROSE TETAP SEMUA HALAMAN KONSISTEN)
{errorMsg && (
  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 rounded-2xl flex items-start gap-3">
    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-rose-800 dark:text-rose-200">Gagal memuat data: {errorMsg}</p>
      <button onClick={loadData} className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-300 underline underline-offset-2">↻ Coba Lagi</button>
    </div>
  </div>
)}

// 2. Banner Loading (WARNA SESUAI DOMAIN HALAMAN di tabel 6.1!)
{loading && !errorMsg && (
  <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 p-3 rounded-2xl flex items-center gap-3">
    <RefreshCw className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />
    <p className="text-xs font-normal text-slate-600 dark:text-slate-300">Memuat data Pengumuman dari server...</p>
  </div>
)}
```

### 6.4 Tombol Header Standard (URUTAN KONSISTEN!)
Di sebelah kanan header (tombol CRUD / Tandai Semua Dibaca):
```
[ Refresh (animate-spin) ] [ Aksi 1: Export / Mark all ] [ Aksi 2 (PRIMARY): + Add / Create Baru ]
```
**Semua tombol disabled** saat `loading || isSaving` (state tersendiri untuk POST/PUT/DELETE).

---

## 7. ✅ CHECKLIST INTEGRASI HALAMAN BARU STEP-BY-STEP (TANPA ASUMSI!)
Sebelum **SATU BARIS PUN** code frontend ditulis → jalankan 7 langkah **WAJIB** ini:

- [ ] **Langkah 0 (ZERO ASSUMPTION)**: Jalankan `php artisan route:list --path=<ENDPOINT_PREFIX>` di Terminal backend → audit nama endpoint BENAR, HTTP method yang tersedia, dan **URUTAN ROUTE (spec route ditulis SEBELUM wildcard)!** Jangan pernah tebak nama endpoint dari module name saja.
- [ ] **Langkah 1**: BACA file Controller terkait di `app/Http/Controllers/API/*.php` → periksa: (a) Parameter request apa saja yang diterima (required / sometimes / enum validasi), (b) Bentuk response JSON `data` Laravel: flat object? nested `{list, summary}`? array object? single row?
- [ ] **Langkah 2**: BACA Model terkait `app/Models/*.php` → daftar fillable + casts (boolean/date/integer cast → ketahuan boolean apa string, integer apa float) + relasi apa saja yang di-load (with / withCount).
- [ ] **Langkah 3**: Cek interface di `src/types.ts` → pastikan target field **SAMA** dengan nama hasil unwrap res.data (snake / camel sesuai mapping). Jika field belum ada di interface → TAMBAHKAN, JANGAN pakai ts-ignore.
- [ ] **Langkah 4**: Smoke test endpoint via browser DevTools Network (setelah login user ID=13) → capture raw response shape actual di tab Network / Console debug berwarna (pastikan tidak ada undefined karena `res.data.data` alias double unwrap).
- [ ] **Langkah 5**: Buat mapper function Satu Interface Satu Mapper (konvensi 6.2) → semua cast explicit JANGAN biarkan type any masuk ke state.
- [ ] **Langkah 6**: Terapkan Banner UI pattern (konvensi 6.3) + urutan tombol header (6.4) **FIRST THING** sebelum konten data di-render.
- [ ] **Langkah 7**: GetDiagnostics 0 error, E2E test: loading → sukses / error → retry button → save state disabled saat submit.

### Jika Data Tidak Muncul (UI Kosong / 0 Record) — 3 Step Urgent Check:
1. 🔴 **CEK KONVENSI POINT 1 DULU!** → Apakah akses `res.data.data` (double unwrap, salah)? Atau `res.data` (benar)?
2. Expand `console.groupCollapsed` warna domain di DevTools Console → inspect `full url` parameter & `response payload` raw.
3. Jika backend error HTTP 500 TypeError: cek **urutan route** (spec route sebelum wildcard?) dan **typed arg method controller** (harus untyped `show($id)` + `is_numeric()` defensive).

---

_**Last updated**: 2026-09-18 (menambahkan: endpoint `/paket/mine` normalized plan compare, konvensi route order + whereNumber + typed arg defensif, all 9 models fillable/casts, 8 item fitur paket mapping `*_label` DRY, 4 endpoint CRUD Pengumuman Admin, 11 Controllers 100% response shape verified from source code real, NO ASSUMPTION.)_
