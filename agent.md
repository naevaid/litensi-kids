# AGENT.md — Konvensi Teknis Litensi Kids Web

> **File permanen: pedoman ALL agent saat menulis/merubah code di project ini.**
> **Wajib dibaca sebelum eksekusi apapun. Hapus point yang tidak relevan = DILARANG.**

---

## 0. PRINSIP UTAMA (ZERO-ASSUMPTION) ⚠️
- **TIDAK BOLEH ASUMSI.** Sebelum tulis code → BACA existing code, tabel DB, API endpoint.
- **TIDAK BOLEH DUPLIKASI.** Kalau function/service/endpoint sudah ada → pakai atau ubah, JANGAN bikin baru lagi.
- **TIDAK BOLEH HARDCODE.** Semua data UI (text, count, dropdown option, timestamp) harus dari API, kecuali fallback untuk empty state.
- **Komentar code WAJIB BAHASA INDONESIA** (camelCase/snake_case variable boleh English standard).
- **Nama file WAJIB BAHASA INDONESIA** (contoh: `layanan_pengguna.js`, `model_transaksi.py`, *kecuali nama komponen React existing yang sudah terlanjur English*).

---

## 1. STANDAR API RESPONSE LARAVEL (SHAPE WAJIB)
SEMUA endpoint `api/v1/*` WAJIB return format JSON berikut:

```json
{
  "success": true,
  "message": "Deskripsi singkat (opsional)",
  "data": { /* payload hasil di sini */ }
}
```

**PENTING: apiClient frontend OTOMATIS UNWRAP SATU LEVEL `data`** (lihat C1).
→ Jangan pernah akses `res.data.data` di frontend (undefined!).
→ Shape di frontend = `{ ok, message, data: payload }`.

---

## 2. STANDAR HTTP STATUS CODE (REST API)
| Code | Kegunaan |
|---|---|
| 200 | Sukses umum GET/PUT/DELETE |
| 201 | Created (POST register berhasil, dll) |
| 400 | Client error umum (bad request) |
| 401 | Unauthorized (belum login / token invalid) |
| 403 | Forbidden (role tidak cukup) |
| 404 | Not Found (data tidak ada / kode expired) |
| 409 | Conflict (data sudah dipakai / duplikasi) |
| 422 | Validation Exception (form salah isi, PIN mismatch, format email salah) |
| 500 | Server error (jangan tampilkan detail ke user di production) |

---

## 3. STANDAR BANNER UI (PATTERN C4) 🎨
Setiap halaman domain tertentu, 2 tipe banner WAJIB ada:
### 3.1 Banner Loading (Warna DOMAIN halaman)
- Dashboard / parental control → INDIGO `#6366f1`
- Master Sistem / Config → PURPLE `#7c3aed`
- Pendapatan / Keuangan → EMERALD `#059669`
- Notifikasi → BLUE `#2563eb`
- Geofence → AMBER `#d97706`
- Error / Gagal global → ROSE `#e11d48` (selalu, apapun domainnya)
- Class Tailwind pattern:
  ```
  bg-<warna>-50 dark:bg-<warna>-950/30
  border border-<warna>-200 dark:border-<warna>-800/50
  rounded-2xl text-xs p-3 flex items-center gap-3
  ```

### 3.2 Banner Error (ROSE SELALU)
- `bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300`
- Message format: `"Gagal memuat data <halaman>: {err.message || 'Coba refresh kembali.'}"`

---

## 4. STANDAR DEBUG CONSOLE (PATTERN C2)
Setiap halaman fetch API WAJIB ada `console.groupCollapsed` dengan warna domain:
```ts
console.groupCollapsed('%c[<NamaHalaman>] fetchData()', 'color:#<hex_domain>;font-weight:bold')
console.log('req:', reqData)
console.log('resp:', response)
console.groupEnd()
```
- Dashboard → `#6366f1` (indigo)
- Master Sistem → `#7c3aed` (purple)
- Keuangan → `#059669` (emerald)
- Notifikasi → `#2563eb` (blue)
- Geofence → `#d97706` (amber)
- Login/Auth → `#0ea5e9` (sky)

---

## 5. STANDAR RESPONSE UNWRAP 1x (PATTERN C1)
Di `apiClient.ts`, `axiosInstance.interceptors.response.use` WAJIB:
- Jika backend return `{success, message, data: X}` → frontend dapat `{ok: success, message, data: X}`
- **SATU KALI SAJA unwrap.** Jadi response payload (X) tidak perlu `.data` lagi.
- Jangan melakukan unwrap 2x (akan baca property `data` dari X, biasanya undefined).
- Jangan menghapus interceptor ini.

---

## 6. STANDAR KONVENSI NAMA DAN KOMENTAR
### 6.1 Komentar Code
- Wajib **Bahasa Indonesia**, singkat padat (contoh: `// Hitung persentase penggunaan kuota video dari plan active`).
- Jangan tulis comment verbose seperti "Ini adalah function untuk melakukan perhitungan X".
- Dilarang menulis komentar SARA/kebencian/yang tidak relevan.

### 6.2 File Baru
- Gunakan nama **Bahasa Indonesia**, kecuali Komponen React yang mengikuti pattern PascalCase existing (misal `DashboardOverviewPage` sudah ada, boleh lanjutkan).
- Contoh benar: `LayananAutentikasi.ts`, `ModelTransaksi.php`.
- Contoh salah: `AuthService.ts` (ingin buat baru, padahal AuthController.php sudah ada → pakai saja).

---

## 7. STANDAR SECURITY & ENVIRONMENT
- **JANGAN HARDCODE PASSWORD / API KEY / TOKEN.** Gunakan `import.meta.env.*` (frontend) atau `env('NAMA_ENV')` (Laravel).
- Production Login Page: **DILARANG** menampilkan section "Akun Demo Cepat". Gunakan guard `{!import.meta.env.PROD && <Section/>}` (Vite dead-code elimination otomatis hapus di build).
- Base URL Frontend: production `BASE_URL` = empty string → request ke same origin (`/api/...`). Jangan `http://127.0.0.1:8000` (fix session lalu — error ERR_CONNECTION_REFUSED!).
- Gunakan operator `??` (nullish coalescing) untuk env Vite, bukan `||`. Jika env empty string → dianggep production origin, bukan falsy.

---

## 8. LARAVEL CACHE & MIGRATION
- Setelah ganti route / config di VPS → jalankan `php artisan route:clear && php artisan config:clear && php artisan cache:clear`. Jangan skip step ini.
- Pairing kode 10 menit TTL disimpan di **Cache** (`cache('pairing:<code>')`), BUKAN DB. Jangan insert ke DB sebelum user confirm (hindari data sampah).
- Urutan route Laravel: route static (generate, confirm, status) HARUS sebelum `{id}` wildcard. Route order = first-match wins.

---

## 9. UI/UX CONSISTENCY
- **JANGAN bikin komponen baru kalau existing mirip.** Lihat dulu folder `src/components/dashboard/` atau `src/components/` sebelum tulis baru.
- Konsistensi warna, spacing, typo: pakai default Tailwind design tokens (text-xs, text-sm, text-base max, p-2 p-3, rounded-2xl default).
- Loading state selalu ada spinner + teks penjelasan (jangan cuma skeleton kosong, user bingung stuck).
- Error state selalu ada tombol "Coba Lagi" untuk retry fetch.

---

## 10. DASHBOARD SCREEN TIME (MAPPING BENAR)
**INI YANG PERNAH SALAH FATAL:** weeklyStats JANGAN menggunakan count transaksi pendapatan sebagai skala jam!
- `weeklyStats` per hari = array object: `{ belajar_minutes, hiburan_minutes, total_minutes }`.
- Baseline: Weekday (Senin-Jumat) = 60 menit, Weekend = 120 menit.
- Boost activity: `log_geofence × 12` + `notifikasi_count × 3`.
- Belajar ratio: Weekday 60%, Weekend 45%.
- Return meta: `avg_daily_hours`, `total_minutes_7d`, `period_start`, `period_end`.

---

## 11. PENGUJIAN SEBELUM SELESAI
WAJIB 3 checklist sebelum lapor selesai:
1. **PHP Lint (untuk file .php backend):** `php -l <namafile>.php` → No syntax errors.
2. **GetDiagnostics (TypeScript React):** 0 TS errors.
3. **Route Check (jika tambah route baru):** `php artisan route:list --path=api/v1/<kategori>` → endpoint muncul, urutan benar.
4. **(Backend Baru) API HTTP Test:** Via curl / Invoke-RestMethod POST/GET → response code expected (bukan 500).
5. **(Frontend Baru) Build Production OK:** `npm run build` → exit 0, tidak ada fatal error.

---

## 12. DEPLOY VPS (CATATAN TETAP)
- Domain Production: `https://parental.naeva.id`
- VPS IP: `145.79.11.52`, SSH Port `22022`, user `root`.
- Path Backend VPS: `/var/www/litensi-backend`
- Path Frontend VPS: `/var/www/litensi-frontend`
- DB Production VPS: `127.0.0.1:3306` nama `litensi_kids` user `litensi_kids`, password di `.env` line 21-25.
- PHP-FPM Socket: `/var/run/php/php8.5-fpm.sock`
- Nginx Config: `/etc/nginx/sites-enabled/parental.naeva.id`
- Master Login Production Valid: `admin@litensikids.id` / `admin123`

---
**END OF FILE AGENT.md. JANGAN MODIF BAGIAN ATAS INI TANPA KONFIRMASI USER.**
