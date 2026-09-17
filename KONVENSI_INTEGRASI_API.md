# KONVENSI INTEGRASI DATA HALAMAN FRONTEND ↔ BACKEND
> 🚨 **WAJIB DIBACA SEBELUM EDIT HALAMAN BARU / TAMBAH ENDPOINT**
>
> Penyebab bug tersering Tahap 7b RiwayatNotifikasiPage: **lupa bahwa `apiClient` otomatis UNWRAP 1x level `data.` dari response Laravel.**

---

## 1. 🎯 KONVENSI API CLIENT RESPONSE UNWRAP (PALING PENTING)

### Source code acuan: [apiClient.ts](file:///d:/litensi-kids/src/lib/apiClient.ts#L175-L207)
```ts
// apiClient line 201:
return {
  ok: !!ok,
  status: raw.status,
  data: (data?.data ?? data ?? {}) as T,  // ← AUTO UNWRAP 1X LEVEL `data.`
  raw,
  message: ...
};
```

### Format response Laravel STANDARD:
```php
// Semua Controller backend:
return response()->json([
    'success' => true / false,
    'message' => 'Pesan opsional',
    'data' => [...], // ← payload utama
]);
```

### ⚠️ IMPLIKASI DI FRONTEND (JANGAN SALAH!):
```ts
const res = await api.get('/contoh-endpoint');

// ❌ SALAH (double unwrap → hasilnya undefined / kosong):
const salah = res.data.data;
const salahList = res.data.data.list;

// ✅ BENAR (cuma akses res.data = payload raw):
const benar = res.data;
const list = res.data.list;   // JIKA nested object punya field list
const summary = res.data.summary;
```

---

### 📋 CONTOH SEMUA BENTUK RESPONSE YANG PERNAH ADA:

| Endpoint | Response Laravel | Hasil res.data di frontend |
|---|---|---|
| `GET /master-users` | `{success, data:[...] array}` | ✅ `res.data` → array of objects |
| `GET /master-sistem` (single row) | `{success, data:{...} object}` | ✅ `res.data` → {app_name, version, ...} |
| `GET /geofence` | `{success, data:[...] array}` | ✅ `res.data` → array 4 zona |
| `GET /notifikasi` (NESTED wrapper) | `{success, data:{list:[6], summary:{total,unread,starred,flagged}}}` | ✅ **AKSES:** `res.data.list` + `res.data.summary` |
| `POST /notifikasi/mark-all-read` | `{success, message, data:{marked_count:4}}` | ✅ **AKSES:** `res.data.marked_count` |
| `PUT /notifikasi/{id}` update | `{success, message, data:{row terbaru}}` | ✅ `res.data` → {id, is_starred, is_read, ...} |

---

## 2. 🎨 KONVENSI WARNA DEBUG CONSOLE PER DOMAIN HALAMAN

**SETIAP PANGGILAN API WAJIB `console.groupCollapsed('%c[Domain] pesan', 'color:#<KODE>;font-weight:700')** agar user bisa filter di DevTools Console:

| Domain Halaman | Kode Warna | Contoh |
|---|---|---|
| **API Client umum** | `#3b82f6` biru | `[API] GET /endpoint` |
| **Auth / Login / Role Gatekeeping** | `#dc2626` merah tua | `[AdminDashboard] Init Role Gatekeeping` |
| **Dashboard Overview** | `#6366f1` indigo terang | `[DashboardOverviewPage] fetchData()` |
| **Master Pengguna** | `#4f46e5` indigo | `[MasterPengguna] loadData` |
| **Master Pendapatan** | `#059669` hijau tua | `[MasterPendapatan] loadData` |
| **Master Paket Langganan** | `#b45309` amber coklat | `[MasterPaket] loadData` |
| **Master Sistem / Konfigurasi** | `#7c3aed` ungu | `[MasterSistem] loadData PUT /master-sistem` |
| **Geofence & Zona** | `#0d9488` teal tosca | `[Geofence] loadData GET /geofence + logs` |
| **🔴 Riwayat Notifikasi** (baru) | `#ec4899` PINK | `[Notifikasi] loadData GET /notifikasi` |
| **🟦 PENGUMUMAN** (selanjutnya) | `#0ea5e9` SKY / BIRU MUDA | `[Pengumuman] loadData GET /pengumuman` |
| **Kelola Anak / Perangkat** | `#6366f1` indigo | `[Anak] Load daftar profil anak` |

---

## 3. 🧬 KONVENSI MAPPER FIELD (snake_case DB ↔ camelCase TS)

**PATTERN WAJIB setiap halaman buat 1 mapper function (setiap 1 interface TS ada 1 mapper)**

### Contoh pola standard:
```ts
// Lokasi: DI ATAS sebelum export const NamaPage
const mapDbNamaTabelToInterface = (dbRow: any): TargetTsInterface => {
  return {
    id: String(dbRow.id ?? Date.now()),
    // snake → camel:
    childName: dbRow.child_name ?? '',
    deviceName: dbRow.device_name ?? '',
    isRead: !!dbRow.is_read,               // cast tinyint → boolean
    starred: !!dbRow.is_starred,            // field name beda
    flagReason: dbRow.flag_reason ?? undefined,
    // Cast type jika perlu:
    latitude: Number(dbRow.latitude ?? 0),  // STRING decimal → Number
    longitude: Number(dbRow.longitude ?? 0),
    // Enum map:
    appCategory: dbRow.app_category === 'games' ? 'game' : dbRow.app_category,
    // Format timestamp:
    timestamp: formatTimestampRelatif(dbRow.timestamp ?? ''),
  };
};
```

---

## 4. 🚩 KONVENSI BANNER UI ERROR & LOADING

**PATTERN WAJIB (copy paste konsisten dari halaman GeofencePage / NotifikasiPage):**

```tsx
// Lokasi: FIRST CHILD di return `<div className="space-y-5">` BARU PERTAMA KALI

// 1. Banner Error (WARNA ROSE tetap, semua halaman sama)
{errorMsg && (
  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 rounded-2xl flex items-start gap-3">
    <AlertTriangle className="w-4 h-4 ..." />
    <div>
      <p>Gagal memuat data: {errorMsg}</p>
      <button onClick={loadData}> ↻ Coba Lagi</button>
    </div>
  </div>
)}

// 2. Banner Loading (WARNA SESUAI DOMAIN HALAMAN!)
//   Master Pengguna = INDIGO bg-indigo-50
//   Notifikasi      = PINK bg-pink-50
//   Pengumuman      = SKY bg-sky-50
{loading && !errorMsg && (
  <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 p-3 rounded-2xl flex items-center gap-3">
    <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
    <p className="text-xs">Memuat data Pengumuman dari server...</p>
  </div>
)}
```

---

## 5. ✅ TOMBOL HEADER STANDARD

Di header sebelah kanan (tombol CRUD / Tandai Semua Dibaca / dll), **SELALU TAMBAHKAN TOMBOL REFRESH SEBELAH KIRI** dengan urutan:
```
[ Refresh (animate) ] [ Aksi 1 ] [ Aksi 2 (+ Add Baru) ]
```

Semua tombol disabled saat `loading || isSaving` (state tersendiri untuk action POST/PUT/DELETE).

---

## 6. 📝 CHECKLIST INTEGRASI HALAMAN BARU (STEP BY STEP)

Sebelum start edit → wajib jalankan 6 langkah ini:

- [ ] **Langkah 0 (Zero Assumption!):** `php artisan route:list --path=<nama-endpoint>` → audit nama endpoint BENAR & HTTP method yang tersedia (JANGAN ASUMSI nama!)
- [ ] Baca file Controller backend → lihat bentuk response JSON (nested? flat? array? object?)
- [ ] Baca Seeder → lihat data actual berapa row & nama field di kolom DB (untuk filter options select)
- [ ] Baca interface di `src/types.ts` → pastikan field target ada
- [ ] Smoke test endpoint via PowerShell / evaluate_script fetch → cek shape response JSON actual
- [ ] **HANYA SETELAH 5 LANGKAH DI ATAS:** Edit code halaman frontend

Jika data tidak muncul di UI (0 record / kosong):
1. 🔴 **CEK DULU KONVENSI POINT 1!** → apakah akses `res.data.data` (salah)? Atau `res.data` (benar)?
2. Lihat console.debug → expand groupCollapsed warna domain → lihat raw response
3. GetDiagnostics → 0 TS error baru E2E test

---

## 7. 📂 LOKASI FILE HALAMAN & DOMAIN WARNA TERKAIT

| Halaman | Path File | Domain Warna | Status Integrasi |
|---|---|---|---|
| LoginPage | `src/components/LoginPage.tsx` | - | ✅ Selesai |
| AdminDashboard (RoleGatekeep) | `src/components/AdminDashboard.tsx` | Merah #dc2626 | ✅ Selesai 2 skenario |
| Dashboard Overview | `src/components/dashboard/DashboardOverviewPage.tsx` | Indigo #6366f1 | ✅ Selesai |
| Kelola Anak | `src/components/anak/KelolaAnakPage.tsx` | Indigo | ✅ Selesai |
| Master Pengguna | `src/components/master/MasterPenggunaPage.tsx` | Indigo tua #4f46e5 | ✅ Selesai |
| Master Pendapatan | `src/components/master/MasterPendapatanPage.tsx` | Hijau #059669 | ✅ Selesai |
| Master Paket | `src/components/master/MasterPaketPage.tsx` | Amber #b45309 | ✅ Selesai |
| Master Sistem | `src/components/master/MasterSistemPage.tsx` | Ungu #7c3aed | ✅ Selesai |
| Geofence | `src/components/geofence/GeofencePage.tsx` | Teal #0d9488 | ✅ Selesai |
| **Riwayat Notifikasi** | `src/components/notifikasi/RiwayatNotifikasiPage.tsx` | **Pink #ec4899** | ✅ Selesai (source of bug konvensi unwrap) |
| **Pengumuman (NEXT)** | `src/components/pengumuman/PengumumanPage.tsx` | **Sky #0ea5e9** | 🔜 Tahap 7c |

---
_Last updated: 2026-09-16 (setelah bug fix RiwayatNotifikasiPage unwrap 2x level)_
