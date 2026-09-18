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
4. **Reference Semua Model & Kolom Utama (12 TABEL REAL + 5 TABEL REKOMENDASI KURANG = TOTAL 17 TABEL AKHIR: fillable + cast + relasi)**
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

### 2.12 MODUL PROFIL (Update Data + Foto Profil + PIN Master)
> **Catatan Penting Security**: Kolom `pin_master` users **SELALU disembunyikan dari JSON response** via `User.php $hidden` (line hidden: password, pin_master, remember_token). Frontend HANYA menerima flag boolean `pin_master_exists` — JANGAN PERNAH mengandalkan / mengirim actual pin digit dari API (read protection).
>
> **Double Compress Workflow (Client + Server)**: Foto di-compress 2x agar hemat bandwidth + storage: (1) Client Canvas API `compressImageClient()` 1280px q88 sebelum upload (info size ratio ditampilkan di badge emerald UI), (2) Server Intervention Image `scaleDown(800,800)` encode JPEG q85 final sebelum disimpan ke `storage/app/public/profil/`.
>
> **Auto-Delete Old Photo Safe Logic**: Hanya hapus file storage lokal jika URL pattern `storage/profil/` atau `profil/`. **JANGAN hapus external URL (Unsplash default avatar)** — dicek via `Storage::disk('public')->exists($cleanPath)` terlebih dahulu.
>
> **Flag `pin_master_exists` Inject di Auth `/me`**: Setiap login (POST /auth/login + GET /auth/me) response sudah otomatis menambahkan field boolean ini (tanpa nilai actual pin!). Lihat [AuthController L86-L102](file:///d:/litensi-kids/backend/app/Http/Controllers/API/AuthController.php#L86-L102).

| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source |
|---|---|---|---|---|---|---|
| P1 | POST | `/profil/update` (JSON Body) | ✅ | `user_id (int)`, `name (required string max 255)`, `email (required email, UNIQUE:users,email,user_id — tidak bisa pakai email user lain)`, `phone (nullable string max 20)`, `pin_master (nullable, MIN 4 digit MAX 6 digit HANYA ANGKA regex /^[0-9]+$/)`. **Update pin_master HANYA jika field dikirim DAN TIDAK KOSONG** (kalau user mau hapus PIN? fitur belum ada, untuk clear kirim string kosong maka update di-skip). | `{ user: (hidden password/pin_master/remember_token, auto-inject field pin_master_exists:bool), pin_master_exists (top-level juga ada) }` + HTTP 400/401/404 dengan `{ success, message }` untuk error validasi / user not found. | [ProfilController L19-L72](file:///d:/litensi-kids/backend/app/Http/Controllers/API/ProfilController.php#L19-L72) |
| P2 | POST | `/profil/foto` (**Content-Type: multipart/form-data**) | ✅ | `user_id (int)`, `photo (required FILE, mime: jpeg/jpg/png/webp, MAX 10MB = 10240 KB — karena akan di-compress server, user bisa upload foto HD sampai batas ini). **Frontend REKOMENDASI pre-compress client-side dulu 1280px q88 via `compressImageClient()` agar bandwidth upload hemat**! | `{ avatar_url: string (full public asset URL → simpan ke session state user.avatarUrl), file_size_kb: float (ukuran final setelah server compress q85 800px → bandingkan original size client untuk info compress panel UI), old_photo_deleted: bool (true jika foto lama storage profil/ berhasil dihapus, false jika foto Unsplash default / tidak ada lama), user: {... updated, pin_master_exists} }` | [ProfilController L78-L188](file:///d:/litensi-kids/backend/app/Http/Controllers/API/ProfilController.php#L78-L188) |
| P3 | POST | `/profil/foto/hapus` (hapus avatar → reset default) | ✅ | `user_id (int)` — TIDAK ADA body lain, tanpa file. | `{ old_photo_deleted: bool (true = file lokal berhasil dihapus, false = tidak ada / default Unsplash), user: { avatar_url:null, name, email,... pin_master_exists:bool } }` — Frontend harus set currentUser.avatarUrl = undefined / kosongkan bukan placeholder hardcode. | [ProfilController L194-L232](file:///d:/litensi-kids/backend/app/Http/Controllers/API/ProfilController.php#L194-L232) |

---

### 2.13 MODUL KONTROL APLIKASI (Aturan Aplikasi + Jadwal Blokir + Permintaan Akses)
> **Urutan Route KRITIS**: Group `prefix('aplikasi')` **DIDETEK SEBELUM** group `prefix('anak')` (yang memiliki wildcard `/anak/{id}`)! Jika terbalik → `/aplikasi/aturan` URL match ke wildcard `anak/{id}` → `AnakController@show("aturan")` dengan typed arg int → TypeError HTTP 500! Source rute: [routes/api.php L57-L82](file:///d:/litensi-kids/backend/routes/api.php#L57-L82).
>
> **Gatekeeping ZERO HARDCODE PRIVASI (WAJIB BACA!)**: SEMUA endpoint pada modul ini **MEMILIKI filter ownership via `whereHas('profilAnak', fn($q) => $q->where('user_id', $userId))`**. **TIDAK BOLEH ADA default user_id = 1 atau apapun!** Jika user_id kosong / tidak valid → return list kosong `[]` JUJUR atau HTTP 404 Not Found untuk detail row milik user lain (data orang tua TIDAK BOLEH bocor!).

| # | HTTP Method | Endpoint | Auth | Param | Response res.data | Source Controller |
|---|---|---|---|---|---|---|
| **A. ATRIBUT APLIKASI (6 Endpoint)** | | | | | | |
| KA1 | GET | `/aplikasi/aturan` (List Semua Aturan per User) | ✅ | `user_id (wajib int; kosong → [])` <br> Opsional filter: `profil_anak_id? (hanya anak tertentu)` | `AturanAplikasiObject[]` (with `profilAnak` + `jadwalBlokir[]` relation, order updated_at desc) | [KontrolAplikasi L56-L70](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L56-L70) |
| KA2 | GET | `/aplikasi/aturan/{id}` (Detail Aturan + Jadwal Terkait) | ✅ | `user_id (wajib)`, `id (numeric whereNumber)` — **GATE CHECK**: jika aturan ini milik `profil_anak.user_id != user_id` → **HTTP 404** (privasi!) | `AturanAplikasiObject single (with profilAnak + jadwalBlokir relation)` | [KontrolAplikasi L72-L89](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L72-L89) |
| KA3 | POST | `/aplikasi/aturan` (CREATE Aturan Baru) | ✅ | **Wajib**: `profil_anak_id (exists:profil_anak.id)`, `app_name`, `package_name`, `category (enum: game/social/video/education/chat/utility)` <br> Opsional (with default): `status (allowed|limited|blocked → allowed)`, `daily_limit_minutes: int ≥0`, `used_today_minutes: int ≥0`, `schedule_mode (all_day|study_time_blocked|bedtime_blocked|custom → all_day)`, `allow_weekend_extra: bool`, `weekend_extra_minutes: int ≥0` | **HTTP 201 Created**. `AturanAplikasiObject (with profilAnak + jadwalBlokir relation)` — **Unique Constraint**: composite `(profil_anak_id, package_name)` → tidak bisa double rule buat app yang sama per anak. | [KontrolAplikasi L91-L117](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L91-L117) |
| KA4 | PUT/PATCH | `/aplikasi/aturan/{id}` (UPDATE Aturan) | ✅ | `user_id (wajib, gate ownership)`, semua field fillable aturan (all sometimes). `status` hanya boleh: allowed/limited/blocked. `schedule_mode` hanya boleh enum 4 nilai di atas. `last_used_time` bisa di-set manual dari Android jika perlu (date format). | `AturanAplikasiObject updated (load relation)` | [KontrolAplikasi L119-L150](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L119-L150) |
| KA5 | DELETE | `/aplikasi/aturan/{id}` (HAPUS Aturan) | ✅ | `user_id (gate)` | Empty object + message sukses. **Cascade DB**: jika aturan dihapus, semua `jadwal_blokir` milik aturan ini OTOMATIS dihapus via `cascadeOnDelete` migration FK. | [KontrolAplikasi L152-L177](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L152-L177) |
| KA6 | POST | `/aplikasi/aturan/bulk-kategori` (Shortcut Bulk Action per Kategori App) | ✅ | `user_id (wajib)`, `category: (game|social|video|education|chat|utility|all — 'all' = semua kategori)`, `set_status: required (allowed|limited|blocked)`, `set_daily_limit_minutes? (nullable int ≥0)`, opsional filter `profil_anak_id?` (hanya apply ke anak tertentu). | `{ updated_count: integer (berapa row aturan berhasil diupdate) }` + message info jumlah. Cocok untuk UI button "Blokir SEMUA Game untuk Semua Anak". | [KontrolAplikasi L179-L213](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L179-L213) |
| **B. JADWAL BLOKIR (6 Endpoint)** | | | | | | |
| KB1 | GET | `/aplikasi/jadwal` (List Jadwal per User) | ✅ | `user_id (wajib; kosong → [])` | `JadwalBlokirObject[]` (with `profilAnak` + `aturanAplikasi nullable` relation; sort: `is_active DESC` dulu baru `created_at DESC`) | [KontrolAplikasi L219-L235](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L219-L235) |
| KB2 | GET | `/aplikasi/jadwal/{id}` (Detail Single Jadwal) | ✅ | `user_id (gate ownership)`, `id numeric` | `JadwalBlokirObject single (relation loaded)` | [KontrolAplikasi L237-L254](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L237-L254) |
| KB3 | POST | `/aplikasi/jadwal` (CREATE Jadwal Baru) | ✅ | **Wajib**: `profil_anak_id (exists)`, `nama_jadwal (string max 255)`, `days_active: array integer 0-6 MIN 1 ITEM (0=Minggu,6=Sabtu)`, `jam_mulai: H:i format`, `jam_selesai: H:i format (HARUS SETELAH jam_mulai → after:jam_mulai validation)` <br> Opsional: `aturan_aplikasi_id? (nullable exists aturan_aplikasi.id → NULL = berlaku ke SEMUA aplikasi milik anak!)`, `action_when_match (block|limit|unblock → block default)`, `durasi_jadwal_minutes? (int ≥0 nullable — DULU durasi_override_menit, DIRENAME SESUAI MIGRATION!)`, `is_active: boolean (default true)`, `keterangan? (string)` | **HTTP 201**, `JadwalBlokirObject (with relation loaded)` — `days_active` otomatis di-json_encode sebelum store ke kolom JSON DB. | [KontrolAplikasi L256-L287](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L256-L287) |
| KB4 | PUT/PATCH | `/aplikasi/jadwal/{id}` (UPDATE Jadwal) | ✅ | `user_id (gate)`, semua field fillable jadwal (all sometimes). `days_active array` validasi MIN 1 item (jika dikirim). `jam_selesai after:jam_mulai` berlaku jika keduanya ada di body. | `JadwalBlokirObject updated` | [KontrolAplikasi L289-L322](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L289-L322) |
| KB5 | DELETE | `/aplikasi/jadwal/{id}` (HAPUS Jadwal) | ✅ | `user_id (gate)` | Empty message sukses. | [KontrolAplikasi L324-L348](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L324-L348) |
| KB6 | POST | `/aplikasi/jadwal/{id}/toggle` (Quick Action Flip Aktif/Nonaktif) | ✅ | `user_id (gate)`, NO BODY lain needed. | `{ id, is_active: boolean (nilai BARU setelah toggle) }` + message "Jadwal diaktifkan / dinonaktifkan" sesuai result flip. Cocok untuk UI Switch toggle single click tanpa buka modal edit. | [KontrolAplikasi L350-L376](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L350-L376) |
| **C. PERMINTAAN AKSES APLIKASI (3 Endpoint)** | | | | | | |
| KP1 | GET | `/aplikasi/permintaan` (List Permintaan Akses Anak) | ✅ | `user_id (wajib; kosong → [])` <br> Opsional: `status (pending|approved|rejected|all → default 'all' tampil semua, tapi di-sort PENDING DULU!)`, `limit (default: 100 row)` | `PermintaanAksesAplikasiObject[]` (with `profilAnak` + `handledByUser:id,name,email (SENSITIF — HANYA select 3 kolom, JANGAN load password/pin_master/hidden!)` relation. **Sort Logic**: `FIELD(status,'pending','approved','rejected')` (pending selalu tampil paling atas) + `requested_at DESC` (terbaru dulu). | [KontrolAplikasi L382-L411](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L382-L411) |
| KP2 | POST | `/aplikasi/permintaan/{id}/approve` (Setujui Permintaan Akses) | ✅ | `user_id (wajib gate + handled_by_user_id di-set otomatis = user_id INI!)`, `id = permintaan ID (HANYA status PENDING yang bisa di-approve, selain pending → 404)` <br> Opsional: `durasi_menit_approve? (int ≥1 menit → default ambil dari $permintaan->durasi_menit atau 30 jika keduanya null)`, `catatan_approve? (string)`, `auto_buat_aturan: boolean (default TRUE — OTOMATIS buat AturanAplikasi dengan mode LIMITED daily_limit=durasi_approve, atau UPDATE existing jika package_name+anak sudah punya aturan)` | DB Transaction 2 step: (1) Update permintaan ke status=approved, set handled_by_user_id + handled_at=now, (2) auto create/update aturan_aplikasi sesuai durasi (jika auto_buat_aturan=true). Response: `PermintaanAksesObject updated load relation` + message "Permintaan akses disetujui". **Rollback otomatis jika step 2 gagal!** | [KontrolAplikasi L413-L475](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L413-L475) |
| KP3 | POST | `/aplikasi/permintaan/{id}/reject` (Tolak Permintaan Akses) | ✅ | `user_id (gate + jadi handled_by_user_id otomatis)`, `id (HANYA PENDING yang bisa direject, else 404)`, Opsional: `alasan_reject? (string → disimpan ke kolom catatan_handle)` | `PermintaanAksesObject updated (status=rejected, handled_at=now, handled_by_user_id di-set)` + message "Permintaan akses ditolak". | [KontrolAplikasi L477-L516](file:///d:/litensi-kids/backend/app/Http/Controllers/API/KontrolAplikasiController.php#L477-L516) |

---

### 2.14 MODUL AUDIO & VIDEO MONITOR (Kuota Menit Listen + Camera BERSAMA → sesuai user "kedua ini jadi 1 kuota")
> **✅ SUDAH ADA CONTROLLER / MIGRATION / MODEL (Prod Sudah Migrate Batch 4 verified HTTP 200. PRIORITAS 1 ATURAN PAKET BARU — Migration R6 add column verified smoke test 7/7 PASS!)**
> **Migration:** `000005_buat_tabel_kuota_av_monitor_harian` (R1) + `000006_buat_tabel_sesi_stream_av_monitor` (R2) + **`000007_tambah_kolom_batas_kuota_av_harian_r6` (R6 NEW: add 2 column DB batas paket)** — [KuotaAvMonitorHarian Model](file:///d:/litensi-kids/backend/app/Models/KuotaAvMonitorHarian.php) + [SesiStreamAvMonitor Model](file:///d:/litensi-kids/backend/app/Models/SesiStreamAvMonitor.php).
> **Controller:** [MonitorAVController.php](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MonitorAVController.php)
> **Aturan Kuota 1 Kolam (USER CONFIRMED):** `total_digunakan_menit = digunakan_audio_menit + digunakan_video_menit` → jika total melebihi `paket_kuota_menit_harian` → auto force stop mode apapun yang aktif. Mode LISTEN dan CAMERA tidak punya kuota terpisah!
> **Gatekeeping:** Sama dengan modul lain: semua endpoint wajib filter `whereHas('profilAnak' fn($q) => $q->where('user_id', $userId))`. JIKA user_id null → return data empty JUJUR (tanpa error).
> **Transaction Atomic:** startSesi & stopSesi DB::beginTransaction() supaya tidak ada setengah terupdate (sesi ditulis tapi kuota tidak bertambah).
> **⚠️ PRIORITAS 1 BARU: 3 LAYER VALIDASI PAKET SEBELUM SESI DIBUAT (AV2 start-sesi):**
> ① **Feature Gate** (Cek paket punya fitur): `one_way_audio = false` (Free) → block mode audio_listen HTTP 403 `PAKET_TIDAK_SUPPORT_AUDIO`. `live_camera = false` (Free/Premium) → block mode camera_live HTTP 403 `PAKET_TIDAK_SUPPORT_CAMERA`.
> ② **Kuota Sisa** (Cek paketan batas menit): Jika `batas_menit_av_harian > 0` DAN `sisa_kuota_menit === 0` → HTTP 403 `KUOTA_AV_HARIAN_HABIS` (rekomendasi: gunakan AV4 tambah kuota manual / upgrade paket / besok reset).
> ③ **Priority Batas Kuota** (Mana yang dipakai untuk `paket_kuota_menit_harian`): (Tertinggi) `profil_anak.av_minutes_daily_override > 0` → pakai override per anak. (Menengah) Tidak ada override → query `users.active_plan` → `paket_langganan.batas_menit_av_harian`. (Terendah) Tidak ada paket / null → `0 = unlimited` (JUJUR fallback zero hardcode).

| # | HTTP Method | Endpoint | Auth | Param Wajib / Opsional | Response res.data | Status Implementasi | Source Code |
|---|---|---|---|---|---|---|---|
| AV1 | GET | `/monitor/kuota-hari-ini` (List kuota hari ini semua anak milik user) | ✅ | `user_id (wajib)` + opsional `profil_anak_id?` (hanya anak tertentu) | Array object per anak: `{ profil_anak_id, nama_anak, device_model, tanggal, paket_kuota_menit_harian, digunakan_audio_menit, digunakan_video_menit, total_digunakan_menit, sisa_kuota_menit (-1 = unlimited), persentase_terpakai 0-100, last_mode idle/audio_listen/camera_live, last_started_at, last_stopped_at, last_sesi_id, status_kuota unlimited/normal/hampir_habis/habis }` → UI Monitor render progress bar kuota Listen+Camera gabung. Metadata: `meta.total_anak, meta.total_digunakan_semua_anak_menit` | ✅ SUDAH ADA + firstOrCreate auto upsert row jika hari ini belum ada + **SYNC OTOMATIS paket berubah (row baru dibuat nilainya sesuai helper getBatasPaketKuotaAnak)** | [MonitorAV L77-L160](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MonitorAVController.php#L77-L160) |
| AV2 | POST | `/monitor/stream/start-sesi` | ✅ | `user_id (gate jadi user_id_yg_memantau OTOMATIS)`, `profil_anak_id (wajib exists profil_anak.id + MILIK user ini gate ownership!)`, `mode ENUM('audio_listen','camera_live') wajib`, `kualitas? ('HD'/'Standard' → default Standard)` | **SUCCESS HTTP 201**: `{ sesi_id, started_at, mode, kualitas, status: 'active', nama_anak, kuota_snapshot { total_digunakan_sebelum, sisa_kuota_menit } }` + Auto force-disconnect semua sesi aktif user+anak ini ANTI-DOUBLE COUNT sebelum insert sesi baru. Upsert kuota R1 last_mode & last_started_at. <br><br> **BLOCKED HTTP 403**: (a) `error_code=PAKET_TIDAK_SUPPORT_AUDIO` → Premium/Free tidak bisa audio listen, (b) `error_code=PAKET_TIDAK_SUPPORT_CAMERA` → Free/Premium tidak bisa live camera, (c) `error_code=KUOTA_AV_HARIAN_HABIS` → sisa kuota 0 total tercapai sesuai batas paket harian | ✅ SUDAH ADA (Transaction atomic AV2 + **LAYER 3 VALIDASI PRIORITAS 1 SEBELUM DB BEGIN**) | [MonitorAV L190-L320](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MonitorAVController.php#L190-L320) |
| AV3 | POST | `/monitor/stream/stop-sesi` | ✅ | `user_id (gate)`, `sesi_id (wajib numeric exists sesi_stream + status active + MILIK user ini)` | `{ sesi_id, mode, durasi_menit_aktual (CEILING stop-start MINIMAL 1 MENIT AKUNTANSI KONSISTEN), started_at, stopped_at, total_digunakan_menit_setelah_update, sisa_kuota_menit, status_kuota }` + Tambahkan durasi ke kolom audio / video R1 sesuai mode → recompute total & sisa. | ✅ SUDAH ADA (Transaction atomic AV3 + reusable finalizeSesiInternal) | [MonitorAV L326-L389](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MonitorAVController.php#L326-L389) |
| AV4 | POST | `/monitor/kuota/tambah-kuota-manual` (overide user untuk anak tertentu hari ini) | ✅ | `user_id (wajib gate)`, `profil_anak_id (exists + milik user)`, `tambah_kuota_menit: integer ≥1` | `{ profil_anak_id, nama_anak, sebelum { paket_kuota, sisa }, ditambahkan, sesudah { paket_kuota, sisa, status_kuota } }` → toast UI "Kuota Audio+Video ditambah 30 menit untuk hari ini". Penambahan kuota manual TIDAK dipengaruhi batas paket (kuota bisa melebihi paket original jika admin mau). | ✅ SUDAH ADA (nanti UI button tambah kuota) | [MonitorAV L445-L505](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MonitorAVController.php#L445-L505) |
| AV5 | GET | `/monitor/riwayat-sesi?limit=30` | ✅ | `user_id (wajib)` + opsional `profil_anak_id?` + `tanggal_start?` + `tanggal_end?` + `mode? (audio_listen/camera_live)` | `{ list: SesiStreamObject[] (with profilAnak + userPemantau relation select), summary { total_sesi_hari_ini, total_durasi_menit_hari_ini, total_snapshot, tanggal_hari_ini }, pagination { current_page, total_pages, total_items } }` untuk History Button Monitor | ✅ SUDAH ADA | [MonitorAV L510-L598](file:///d:/litensi-kids/backend/app/Http/Controllers/API/MonitorAVController.php#L510-L598) |

---

### 2.15 MODUL PESAN & INBOX (Chat Orang Tua↔Anak + Permintaan Waktu Layar + Broadcast Keluarga)
> **⚠️ PLAN MODUL (BELUM ADA CONTROLLER / MIGRATION — TABEL R3 pesan_chat_orangtua_anak & permintaan_tambah_waktu_layar + R4 pesan_broadcast_keluarga di Section 4.13)**
> Saat ini source [ChatInboxPage.tsx L156 L185](file:///d:/litensi-kids/src/components/inbox/ChatInboxPage.tsx#L156-L191) dan [BroadcastPage.tsx L80-L104](file:///d:/litensi-kids/src/components/inbox/BroadcastPage.tsx#L80-L104) keduanya sudah ada WARNING TOAST sendiri mengakui data cuma tersimpan state lokal hilang F5.

| # | HTTP Method | Endpoint (Plan NANTI) | Auth | Param | Response res.data | Status |
|---|---|---|---|---|---|---|
| CH1 | GET | `/chat/threads` (List thread per anak) | ✅ | `user_id (wajib)` | Thread array sesuai `interface DeviceThread L20-33 ChatInboxPage.tsx`: `{ thread_id, anak_id, nama_anak, device_model, status_online, battery, last_message_text, last_time, unread_count }` — **JANGAN HARDCODE battery 84%!**. Baterai diambil realtime dari `profil_anak.battery_level`. | ❌ BELUM (R3 tabel gabungan) |
| CH2 | GET | `/chat/{anakId}/messages?page=1&perPage=50` | ✅ | `user_id (gate ownership via anak.user_id)`, `{anakId} numeric whereNumber` | `{ list: ChatMessage[] (L10-L18 sender:child/parent/system), next_cursor? }` | ❌ BELUM |
| CH3 | POST | `/chat/{anakId}/send` | ✅ | `user_id (gate jadi sender_user_id auto)`, `text (string wajib max 1000)`, `attachments? JSON file id` | `ChatMessage object baru (id, timestamp, saved_to_db=true)` — hilangkan warning toast state lokal! | ❌ BELUM |
| CH4 | POST | `/chat/{anakId}/grant-waktu-layar` (Quick Grant 5/15/30 menit button) | ✅ | `user_id (gate)`, `durasi_menit: integer (5,15,30 atau custom >0)`, `catatan? (string misal "selesai PR dulu ya")` | (a) Tambah row `permintaan_tambah_waktu_layar` approved, (b) Auto update `aturan_aplikasi` daily limit menit sesuai paket untuk app tertentu / semua? / atau (c) auto update `profil_anak.used_today`. Response: `{ granted_menit, berlaku_sampai_jam }` + kirim system message CH2 di thread | ❌ BELUM |
| BR1 | POST | `/broadcast/kirim` (Kirim broadcast keluarga / kunci layar massal) | ✅ | `user_id (pengirim gate)`, `target: 'all' | profil_anak_id (jika spesifik)`, `urgensi ENUM normal/penting/kunci_layar`, `message TEXT wajib max 2000` | `{ broadcast_id, waktu_kirim, jumlah_target_perangkat, status_kirim: 'queued'/'sent' }` + insert row ke R4 | ❌ BELUM (Tabel R4) |
| BR2 | GET | `/broadcast/riwayat?page=1` | ✅ | `user_id (wajib — hanya tampilkan broadcast yg dikirim user sendiri)` | `{ list: BroadcastHistory[] }` list lama untuk UI "Broadcast Terkirim" | ❌ BELUM |

---

### 2.16 MODUL HAK AKSES & WALI (Pendamping Co-Parent)
> **⚠️ PLAN MODUL (BELUM ADA CONTROLLER / MIGRATION — TABEL R5 undangan_hak_akses_pendamping + role_permission_per_pendamping Section 4.13)**
> Saat ini [HakAksesTab.tsx L26-L73](file:///d:/litensi-kids/src/components/pengaturan/HakAksesTab.tsx#L26-L96) menggunakan ParentRole state useState (JUJUR totalUsers Pendamping/Wali = 0 karena belum DB). Modal invite L96 cuma show toast tanpa kirim email / simpan row!

| # | HTTP Method | Endpoint (Plan NANTI) | Auth | Param | Response res.data | Status |
|---|---|---|---|---|---|---|
| W1 | GET | `/hak-akses/roles` (Daftar template role + jumlah user per role — untuk UI 3 card Orang Tua Utama / Pendamping / Guru Les) | ✅ | `user_id (wajib)` | `{ roles: [ { role_id, role_name, deskripsi, permissions_json, total_users_aktif: integer (JUJUR dari DB count R5 relasi!), is_default } ] }` → sekarang masih hardcode L30-73 useState! | ❌ BELUM |
| W2 | POST | `/hak-akses/undang-kirim` (Kirim email undangan pendamping) | ✅ | `user_id (PEMILIK KELUARGA, tidak boleh pendamping mengundang!)`, `email_wali (email format wajib unique)`, `role_id (wajib 1 template)`, `permission_override_json? (jika mau beda dari template default)` | `{ undangan_id, kode_undang_unique, status: 'pending_invited', email_terkirim: boolean, expires_at: '+7 hari' }` + (nanti integrasi Mailgun/SMTP kirim email undangan) | ❌ BELUM |
| W3 | POST | `/hak-akses/undangan-terima` (Public endpoint / tapi butuh token kode_invite) | ❓ nanti Sanctum | `kode_invite (string UNIQUE dari W2, tidak expired)`, `user_id_baru (jika belum register → auto create user via email invite) OR user_id_sudah_ada (jika email dia sudah punya akun Litensi Kids) ` | `{ status: 'accepted', pendamping_id, menjadi_wali_untuk_family_user_id: integer, permissions_json }` | ❌ BELUM |
| W4 | PUT/PATCH | `/hak-akses/pendamping/{pendampingRelasiId}` | ✅ | `user_id (PEMILIK KELUARGA SAJA)`, `permission_json (5 boolean canX)`, `nonaktifkan? boolean` | `{ updated: true, permissions_sebelum, permissions_sesudah }` | ❌ BELUM |
| W5 | GET | `/hak-akses/daftar-pendamping` | ✅ | `user_id (pemilik keluarga)` | `{ list: [{ pendamping_user_id: int, nama: String, email, phone, avatar_url, permissions, tanggal_jadi_awal, status_aktif } ] }` untuk UI list daftar wali aktif | ❌ BELUM |

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
| **8 Fitur Batasan + Label** | Semua ada **2 kolom (value enum/bool/int + label display string)** untuk frontend `*_label`! (Semakin DRY — tinggal show label saja di UI tanpa fallback hardcode): <br><br> ① Perangkat Anak: `max_children_devices (integer ≥0=unlimited)` + **`max_children_devices_label (string, baru ditambahkan 2026-09-18)`** <br> ② Lokasi GPS: `location_tracking (enum string: 'dasar'/'realtime_7d'/'realtime_30d_sos')` + `location_tracking_label` <br> ③ Kontrol Aplikasi: `app_restriction (enum 'terbatas_3'/'unlimited_jadwal'/'unlimited_ai')` + `app_restriction_label` <br> ④ Audio 1 Arah: `one_way_audio (boolean)` + `one_way_audio_label` <br> ⑤ Live Kamera: `live_camera (boolean)` + `live_camera_label` <br> ⑥ Area Geofence: `max_geofences (integer / string unlimited)` + `max_geofences_label` <br> ⑦ Notif Chat: `read_message_notifications (boolean)` + `read_message_notifications_label` <br> ⑧ Kunci Layar: `remote_screen_lock (boolean)` + `remote_screen_lock_label` <br><br> ⑨ **PRIORITAS 1 (NEW R6): Batas Kuota AV Harian 1 KOLAM**: **`batas_menit_av_harian integer unsigned default 0`** (0 = unlimited JIKA feature boolean one_way_audio/live_camera = true, TAPI jika feature false → user TIDAK BISA PAKAI FITUR INI sekalipun unlimited)! | `boolean/integer` + `string` | **Pola Renderer UI:** di frontend `LanggananTab.tsx PAKET_FEATURE_SPECS[]` L38-L59, SEMUA 8 item: `renderValue: (l) => String(l.fieldLabel || '—')`. BADGE HIGHLIGHT: kolom `highlight_features (array cast = JSON)`. Dipakai Cuma di FullGrid halaman utama, CompactList (card modal/admin) HAPUS karena duplikat. <br><br> **⭐ DEFAULT MAPPING (verified via Migration R6 SQL UPDATE & Seeder):** id=1 Free → batas=0 (OFF TOTAL, audio false + camera false); id=2 Premium → batas=60 menit/hari (audio true, camera false); id=3 Family Pro → batas=240 menit/hari = 4 jam (audio true + camera true gabung 1 kuota kolam). |
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
| **⭐ PRIORITAS 1 (NEW R6): Override Kuota AV Harian per Anak** | **`av_minutes_daily_override: integer unsigned default 0 → int cast`** | **0 = gunakan batas kuota dari paket langganan user (paket_langganan.batas_menit_av_harian)**. <br> **>0 = nilai batas khusus untuk ANAK INI SAJA, melebihi / mengabaikan paket user (bisa lebih tinggi atau lebih rendah dari paket).** <br> Contoh: user Premium paket 60 menit, untuk anak 1 set override 120 → anak ini punya kuota 120 menit/hari melebihi paket kakak/adiknya yang 60. Priority TERTINGGI di helper `getBatasPaketKuotaAnak()`. |
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

### 4.10 `aturan_aplikasi` → [AturanAplikasi.php](file:///d:/litensi-kids/backend/app/Models/AturanAplikasi.php)
(1 aturan = 1 anak + 1 aplikasi per anak; **Unique Constraint composite `(profil_anak_id, package_name)`** — tidak bisa double rule untuk app yang sama per anak! Lihat migration L28 Migration L24-L28)

| Fillable | Tipe Cast | Catatan Penting |
|---|---|---|
| **PK FK** | `profil_anak_id (bigint FK → profil_anak.id cascadeOnDelete)` | Wajib; Kalau anak dihapus → semua aturan anak ini OTOMATIS hilang (cascade DB) |
| **Identitas Aplikasi** | `app_name, package_name (string max 255), icon (nullable string)` | package_name = Android package ID (misal `com.google.android.youtube) |
| **Kategori** | `category: ENUM — `game`/`social`/`video`/`education`/`chat`/`utility`` (string enum) | SESUAI frontend AppRuleItem.category L17 |
| **Status** | `status ENUM: `allowed` (diizinkan) / `limited` (dibatasi durasi) / `blocked` (diblokir total) default: allowed` | Index DB untuk performa filter |
| **Durasi Batasan (menit)** | `daily_limit_minutes: integer unsigned (default 0 = unlimited), `used_today_minutes`: integer unsigned (default 0) — keduanya cast `integer` | Dipantau dari Android companion app |
| **Mode Jadwal** | `schedule_mode ENUM — all_day (tanpa jadwal, batas 24jam), study_time_blocked, bedtime_blocked, custom (default all_day) | SESUAI AppRuleItem.scheduleMode L25 frontend |
| **Weekend Extra** | `allow_weekend_extra: boolean cast (default FALSE), `weekend_extra_minutes: integer unsigned default 0 | Sabtu-Minggu dapat extra kuota jika enable |
| **Tracking** | `last_used_time → `datetime` cast nullable | Tracking terakhir app dibuka, sync dari Android |
| **Relasi** | **`profilAnak` → BelongsTo(ProfilAnak::class)` + **`jadwalBlokir` → hasMany(JadwalBlokir::class, 'aturan_aplikasi_id'** | Detail row jadwal bisa spesifik per aturan / null (nullable aturan_aplikasi_id di table jadwal_blokir |

---

### 4.11 `jadwal_blokir` → [JadwalBlokir.php](file:///d:/litensi-kids/backend/app/Models/JadwalBlokir.php)
(Rutin jadwal harian / per aturan aplikasi. Jika `aturan_aplikasi_id = NULL` → berlaku ke **SEMUA APLIKASI milik anak! (global blocker belajar / tidur mode)

| Fillable | Tipe Cast | Catatan |
|---|---|---|
| **PK FK** | `profil_anak_id (FK cascadeOnDelete), `aturan_aplikasi_id` (nullable bigint FK → cascadeOnDelete) | NULL = berlaku SEMUA app anak (global); tidak spesifik app) |
| **Identitas Jadwal** | `nama_jadwal: string max 255`, `keterangan: string nullable` | Label UI: "Jam Belajar", "Waktu Tidur Malam" |
| **Hari Aktif** | `days_active → **JSON cast array of array (disimpan JSON di DB sebagai TEXT JSON** (cast array** | Accept array integer 0-6** | `0=Minggu, 1=Senin, ... 5=Jumat, 6=Sabtu**. Wajib MIN 1 item (Laravel validation min:1 rule validasi KB3) |
| **Waktu** | `jam_mulai → time cast H:i format (00:00` — 23:59)`, **`jam_selesai → time cast H:i (HARUS SETELAH jam_mulai → validated using after: validation** | Validasi built-in Laravel rule untuk memastikan logika |
| **Aksi** | **`action_when_match ENUM: block / limit (override durasi) / unblock (izinkan default block` default | Blockir permanen / override dengan duration menonaktif mode |
| **Durasi Override** | `durasi_jadwal_minutes: integer unsigned nullable` — DULU `durasi_override_menit`, DIRENAME SESUAI MIGRATION KOLOM JADWAL! | Hanya berlaku ketika aksi=limit, selain null = mengesampingkan daily_limit aturan (optional |
| **Aktif / Nonaktif** | `is_active → boolean cast default true` | Index DB, toggle cepat is_active DESC |
| **Relasi** | `profilAnak → BelongsTo ProfilAnak` + `aturanAplikasi nullable` | |

---

### 4.12 `permintaan_akses_aplikasi` → [PermintaanAksesAplikasi.php](file:///d:/litensi-kids/backend/app/Models/PermintaanAksesAplikasi.php)
(Request buka blokir dari Android app anak (jika app diblokir total → anak bisa kirim request izin ke orang tua)

| Fillable | Tipe Cast | Catatan |
|---|---|---|
| **PK FK** | `profil_anak_id (FK → cascadeOnDelete. Anak dihapus → semua permintaan anak ini hilang otomatis | Wajib |
| **App Info** | `app_name: string`, `package_name: string`, `category: string` (category nullable untuk keperluan enum jika butuh filter label kategori app | |
| **Durasi & Alasan** | `durasi_menit_diminta: integer unsigned nullable` — DULU `durasi_menit`, DIRENAME SESUAI MIGRATION KOLOS PERMINTAAN! (akses field `$permintaan->durasi_menit_diminta` di Controller approvePermintaan L419-451, JANGAN typo!), `alasan: text nullable` | Anak kirim alasan kenapa minta buka blokir & berapa lama (menit |
| **Status** | `status ENUM: pending (default) | Index DB pending/approved/rejected (index untuk sort PENDING selalu paling pertama tampil di UI) — SESUAI AppAccessRequest.status L50 KontrolAplikasiPage |
| **Audit Trail Handle** | `handled_by_user_id (nullable bigint FK users.id NULL_ON_DELETE** → nullOnDelete. Kalau user master dihapus → nilai kolom ini set NULL bukan row tidak hilang)`, `handled_at → datetime cast nullable `, catatan_handle: text nullable (alasan reject / catatan approve` | handled_by_user_id di-set OTOMATIS = user_id approve endpoint /reject (gate ownership yang sedang login (ZERO PRIVASI! Data ID user ID |
| **Timestamp Request** | `requested_at datetime cast default CURRENT_TIMESTAMP via `useCurrent()` di migration) | Waktu Android mengirim permintaan |
| **Relasi** | `profilAnak → BelongsTo ProfilAnak. Anak siapa yang request` + **`handledByUser → BelongsTo User::class 'handled_by_user_id' Siapa orang tua yang kasih approve/decline` | Load relation handledByUser HANYA select id,name,email (3 kolom, SENSITIF: hidden password/pin_master TIDAK PERNAH BOLEH bocor via JSON!! |

---

### 4.14 `kuota_av_monitor_harian` → [KuotaAvMonitorHarian.php](file:///d:/litensi-kids/backend/app/Models/KuotaAvMonitorHarian.php)
(R1 BARU DIBUAT PRIORITAS 1. **JAWABAN USER EXPLICIT: Kuota Listen Suara + Camera Video DIGABUNG JADI 1 KOLAM!** Tidak ada kuota terpisah.)
- Unique composite `(profil_anak_id, tanggal)`: 1 anak TIDAK BISA 2 row kuota tanggal sama.
- AV1 auto `firstOrCreate` row hari ini kalau belum ada — UI selalu dapat progress bar (tidak pernah null JUJUR tapi buat default row baru).

| Fillable | Tipe Cast | Catatan |
|---|---|---|
| **PK FK** | `profil_anak_id (FK cascadeOnDelete → profil_anak.id)` | Wajib, anak dihapus → kuota history otomatis hilang. |
| **Identitas Tanggal** | `tanggal → date cast (UNIQUE composite dengan profil_anak_id) | Hanya 1 row per anak per hari. |
| **KUOTA UTAMA 1 KOLAM** | `paket_kuota_menit_harian: integer unsigned default 0` (0 = unlimited) | **⚠️ R6 SUDAH DITERAPKAN PRIORITAS 1! Nilai kolom ini di-set otomatis oleh 3 level priority helper `getBatasPaketKuotaAnak()` di MonitorAVController:** <br> ① (Tertinggi) Jika `profil_anak.av_minutes_daily_override > 0` → override per anak menang. <br> ② (Menengah) Kalau tidak ada override → ambil dari `users.active_plan` → match via `normalizePlanId` → `paket_langganan.batas_menit_av_harian`. <br> ③ (Terendah fallback JUJUR) Kalau user TIDAK punya paket → `0 = unlimited` (tanpa asumsi user paket apa, ZERO HARDCODE!). <br><br> Bisa di-override via AV4 `tambah-kuota-manual` (tambah menit untuk hari ini saja untuk kasus khusus). |
| **Digunakan (Gabung)** | `digunakan_audio_menit (integer unsigned default 0 — mode Listen)`, `digunakan_video_menit (integer unsigned default 0 — mode Camera)`. **`total_digunakan_menit: integer unsigned index` = SUM audio+video (denormalized agar UI cepat filter paling boros) | Mode audio/video hanya catat masing-masing, total tetap satu kolam! **Ini yang dicek apakah melebihi paket.** |
| **Sisa** | `sisa_kuota_menit: integer (-1 = unlimited, 0 = habis, >0 = sisa menit)` | Selalu recompute di setiap read AV1 & write AV2/AV3/AV4 agar konsisten. |
| **Status Sesi Terakhir** | `last_mode ENUM idle/audio_listen/camera_live (default idle → index)`, `last_started_at datetime nullable`, `last_stopped_at datetime nullable`, `last_sesi_id integer unsigned nullable → FK ke R2 sesi_stream` | UI render badge "Sedang LIVE Listen/Camera" jika last_sesi_id ada & sesi_stream.status = active. |
| **Relasi** | `profilAnak → BelongsTo ProfilAnak` | |

---

### 4.15 `sesi_stream_av_monitor` → [SesiStreamAvMonitor.php](file:///d:/litensi-kids/backend/app/Models/SesiStreamAvMonitor.php)
(R2 BARU DIBUAT PRIORITAS 1. Audit trail setiap Start→Stop stream. 1 Row = 1 Sesi. Dipakai AV2 start, AV3 stop, AV5 riwayat history.)

| Fillable | Tipe Cast | Catatan |
|---|---|---|
| **FK 2 Relasi** | `profil_anak_id: FK cascadeOnDelete` (Siapa anak yang dimonitor). **`user_id_yg_memantau: nullable BIGINT FK users.id → nullOnDelete!` (Siapa orang tua yang start sesi). KOLOM INI WAJIB nullable (karena SET NULL on delete → kalau user master dihapus, audit trail TETAP ADA tapi user_id_yg_memantau diset NULL).** | Unique Composite Index `(user_id_yg_memantau, status)` untuk cepat "dapatkan semua sesi aktif user X". |
| **Mode & Waktu** | `mode ENUM audio_listen/camera_live → index`. `started_at datetime cast useCurrent`. `stopped_at datetime nullable`. `durasi_menit_aktual integer unsigned (CEILING menit, MIN 1 MENIT — akuntansi tidak boleh 0 menit!) | Hitung otomatis saat AV3 stop / finalizeSesiInternal CEILING((stop-start)/60). |
| **Audit Aksi Selama Sesi** | `kualitas ENUM HD/Standard default Standard`. `jumlah_snapshot_ambil tinyint unsigned default 0` (tombol Camera Snap nanti increment). `alarm_dibunyikan boolean cast default false` (tombol Alarm di Monitor). `kunci_layar_dieksekusi boolean cast default false` (tombol Lock Screen). | Semua tombol fitur Monitor nanti harus increment kolom ini audit. |
| **Status Sesi** | `status ENUM active/completed/force_disconnect/error default active index`. `catatan_error: text nullable (jika error disconnect timeout 4G)` | force_disconnect = auto mark ketika AV2 start-sesi menemukan ada sesi aktif lama user+anak → finalisasi paksa tanpa double count. |
| **Relasi** | `profilAnak → BelongsTo ProfilAnak`, `userPemantau → BelongsTo User::class 'user_id_yg_memantau'`. | Load relation userPemantau HANYA select `id,name,email` (JANGAN bocorkan password/pin_master). |

---

### 🔔 4.13 DAFTAR REKOMENDASI TABEL DATABASE KURANG (Berdasarkan Audit 0-Asumsi Halaman Web)
> **Source Audit halaman yang di-check:**
> DashboardOverviewPage (Dashboard), AudioVideoMonitorPage `/monitor` (Listen/Camera kuota), ChatInboxPage `/inbox` (Permintaan Waktu & Chat), BroadcastPage `inbox broadcast`, HakAksesTab (Hak Akses & Wali), MasterPenggunaPage (Pengguna & Lisensi).
> **Hasil Audit Updated (Setelah Prioritas 1 R1 R2 Dibuat):** 
>   - ✅ **TABEL REAL SUDAH ADA di LOKAL DB (23 TABEL = 21 ORIGINAL + 2 BARU R1 R2). Production VPS MASIH 21 TABEL (Belum migrate force prod!)**
>   - ⚠️ **DIBUTUHKAN +3 TABEL BARU LAGI (R3,R4,R5) = TOTAL 26 TABEL FINAL** untuk persistence data yang saat ini masih state useState lokal (hilang F5 refresh).

| # | Nama Tabel BarU (Rekomendasi) | Tujuan Utama & Relasi | Halaman yang membutuhkan (Daftar Isi User) | Status (saat ini data disimpan di) | Prioritas Buat Migration |
|---|---|---|---|---|---|
| R1 ✅ | `kuota_av_monitor_harian` (Kuota Audio & Video Monitor HARIAN per Anak) | **[✅ PRIORITAS 1 SUDAH DIBUAT LOKAL!]** Menyimpan BERAPA MENIT sudah terpakai hari ini untuk **Listen (Audio) & Camera (Video)** — KEDUA MODUS DITAMBAHKAN KE 1 KUOTA BERSAMA (sesuai user: "boleh jadi 1 karena kuota menit kedua ini akan jadi satu nantinya") <br><br> **Relasi FK:** `profil_anak_id (FK cascadeOnDelete)` <br> **Kolom utama:** `tanggal DATE (UNIQUE composite per anak+tanggal)`, `paket_kuota_menit_harian: int (dari paket_langganan atau override per user)`, `digunakan_audio_menit: int unsigned default 0` (listen mode), `digunakan_video_menit: int unsigned default 0` (camera mode), `total_digunakan_menit: int (sum audio+video — biar cepat hitung sisa kuota tanpa sum query)`, `sisa_kuota_menit: int computed`, `last_mode ENUM('idle','audio_listen','camera_live')`, `last_started_at datetime`, `last_stopped_at datetime`, `last_sesi_id` <br> **Cara dipakai UI AudioVideoMonitorPage:** klik **Listen/Camera** → POST AV2 start-sesi, klik stop → POST AV3 stop-sesi, controller otomatis CEILING 1 menit minimal hitung durasi dan UPDATE kuota kolom total_digunakan! | **Audio & Video Monitor (/monitor)** | ✅ **SELESAI! (Lokal MIGRATE DONE, Prod belum!)** | ✅ **DONE Lokal ✓** |
| R2 ✅ | `sesi_stream_av_monitor` (Log History Setiap Sesi Streaming Listen/Video — 1 row per sesi start/stop) | ✅ **[PRIORITAS 1 SUDAH DIBUAT LOKAL!]** Audit trail & billing hitung menit akurat. <br> FK: `profil_anak_id cascade`, `user_id_yg_memantau: FK users.id NULLABLE → nullOnDelete` (siapa orang tua yang aktif listen/camera?) <br> Kolom: `mode ENUM('audio_listen','camera_live')`, `started_at useCurrent`, `stopped_at nullable`, `durasi_menit_aktual unsigned int stop-start CEILING MIN 1 MENIT!`, `kualitas ENUM HD/Standard`, `jumlah_snapshot_ambil tinyint default 0`, `alarm_dibunyikan bool`, `kunci_layar_dieksekusi bool`, `status ENUM active/completed/force_disconnect/error default active index` | **Audio & Video Monitor (/monitor)** — history panel riwayat sesi (tombol History di grid button). | ✅ **SELESAI! (Lokal MIGRATE DONE, Prod belum!)** | ✅ **DONE Lokal ✓** |
| R3 | `pesan_chat_orangtua_anak` + `permintaan_tambah_waktu_layar` (Bisa 2 tabel atau 1 gabung karena dari page yang sama: ChatInboxPage) | a) **Pesan Chat Orang Tua ↔ Anak** (1 thread per anak, sender: parent/child/system) — mirip interface `ChatMessage L10-L18` yang sekarang cuma `useState` dan toast warning L185 "Pesan tersimpan HANYA di session browser saat ini" <br> b) **Permintaan Tambah Waktu Layar (Grant Duration 5/15/30 menit)** — sekarang cuma `handleQuickGrant (minutes)` di `ChatInboxPage L193` yang tambah ChatMessage sender system tanpa DB. <br> FK: `profil_anak_id cascade`, `sender_user_id (nullable FK users.id — null=anak initiate grant request dari HP)`. | **Pesan & Inbox > Chat & Permintaan Waktu (/inbox ChatInboxPage.tsx)** — 100% state lokal sekarang, toast sendiri ngakuin "belum ada backend API endpoint chat realtime". | 🟡 TINGGI (Fitur user-requested "Chat & Permintaan Waktu" di sidebar) |
| R4 | `pesan_broadcast_keluarga` (Broadcast history — 1 row per kirim) | Menyimpan riwayat kirim Broadcast & status pengiriman per target perangkat. <br> FK: `user_id_pengirim: FK users.id`, `profil_anak_target_ids JSON array (atau NULL = all perangkat anak user)` <br> Kolom: `tipe_urgensi ENUM('normal','penting','kunci_layar') sesuai BroadcastPage L46 urgency select`, `isi_pesan TEXT wajib`, `waktu_kirim datetime useCurrent`, `jumlah_target_perangkat int`, `status_kirim ENUM('draft','queued','sent_partial','sent_all','failed')`, `catatan_log TEXT` (riwayat FCM/OneSignal push ID). <br> Saat ini **BroadcastPage handleSendBroadcast (L80)** cuma toast success (L95) tidak kirim apapun & tidak disimpan. | **Pesan & Inbox > Pesan Broadcast (BroadcastPage.tsx L80-104)** | 🟠 SEDANG (riwayat broadcast penting untuk audit) |
| R5 | `undangan_hak_akses_pendamping` + `role_permission_per_pendamping` (1-2 tabel relasi) | Implementasikan fitur **Undang Pendamping/Wali** di HakAksesTab yang **saat ini cuma state L30-73 useState roles ParentRole** (default OrangTuaUtama totalUsers=1 JUJUR, Pendamping/Wali=0 karena belum DB!) + modal invite L75-96 handleInviteCoParent cuma toast (L86) tanpa kirim email / simpan row. <br> **Tabel Undangan:** email undangan, kode_invite unique, role_id yang diminta, status ENUM('pending_invited','accepted','declined','expired'), invited_at, expires_at. <br> **Tabel Relasi Wali (Pendamping + Akses Anak):** `parent_user_id (FK users.id — Orang Tua Utama pemilik akun keluarga)`, `pendamping_user_id (FK users.id — Wali / CoParent yang ACC invite)`, `role_permission_json (5 boolean L17-23 HakAksesTab: canLockScreen/canGrantTime/canViewLocation/canEditPin/canBlockApps)`, `tanggal_jadi_awal datetime`, `tanggal_nonaktif datetime nullable`, `dibuat_oleh_user_id FK users`. | **Pengaturan Orang Tua > Hak Akses & Wali (HakAksesTab.tsx)** — saat ini invite tidak tersimpan / tidak ada permission gate real di API! (Semua endpoint cuma filter user_id sendiri → nanti Wali butuh extra OR clause where user_id IN (pemilik keluarga OR pendamping yang terdaftar)). | 🟠 SEDANG (User visible di sidebar menu "Hak Akses & Wali", tapi fitur ini masih 100% state simulasi) |

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

_**Last updated**: 2026-09-18 (update: Section 2.13 MODUL KONTROL APLIKASI 15 endpoint AturanAplikasi/JadwalBlokir/PermintaanAkses + Section 4.10-4.12 3 Model Baru, total 12 tabel DB. KontrolAplikasiController.php gate ownership whereHas profil_anak.user_id + group prefix aplikasi di routes sebelum wildcard anak/{id}. Verified from source code REAL, NO ASSUMPTION.)_
