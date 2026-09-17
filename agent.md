# AGENT.md

## Prinsip Utama
- Dilarang berasumsi. Jika ada hal yang tidak jelas, cek langsung ke kode, database, atau dokumentasi sebelum bertindak.
- Wajib memahami struktur project, skema database, nama tabel, kolom, relasi, dan endpoint API yang tersedia sebelum menulis kode baru.
- Sebelum membuat fungsi/API baru, cek dulu apakah sudah ada fungsi, helper, service, atau endpoint yang bisa dipakai ulang (reuse).
- Hindari duplikasi logika. Jika fungsi serupa sudah ada, gunakan atau modifikasi, jangan buat baru.

## Aturan Penulisan Kode
- Utamakan kode singkat dan efisien (idealnya di bawah 100 karakter per baris/perintah).
- Jangan menulis kode panjang (500+ karakter) jika solusi ringkas sudah cukup.
- Tulis kode sederhana, mudah dibaca, tidak bertele-tele.
- Jika menambah fungsi/API baru, beri komentar singkat (Bahasa Indonesia) yang menjelaskan tujuannya.

## Bahasa & Penamaan
- Semua nama file menggunakan Bahasa Indonesia (contoh: `layanan_pengguna.js`, `model_transaksi.py`).
- Semua komentar kode ditulis dalam Bahasa Indonesia.
- Nama variabel/fungsi boleh tetap mengikuti konvensi teknis (camelCase/snake_case), tapi penjelasan/komentar tetap Bahasa Indonesia.

## Alur Kerja Sebelum Eksekusi
1. Baca struktur project (folder, file, arsitektur).
2. Periksa skema database: nama tabel, kolom, tipe data, relasi.
3. Periksa API yang sudah ada: endpoint, parameter, response.
4. Cek apakah fungsi/API yang dibutuhkan sudah tersedia.
5. Jika sudah ada → gunakan/reuse.
6. Jika belum ada → baru buat, dengan kode seminimal mungkin.
7. Cek semua bagian lain yang memanggil/menggunakan fungsi terkait sebelum mengubah atau menghapusnya (pastikan tidak merusak fitur lain).

## File Debug & Uji Coba
- Jika perlu membuat file/script sementara untuk debug atau uji coba, beri nama jelas (contoh: `debug_cek_koneksi.js`).
- Setelah pengujian selesai dan tidak lagi dibutuhkan, file tersebut WAJIB dihapus.
- Jangan meninggalkan file debug, log sementara, atau kode uji coba di dalam project akhir.
- Pastikan project tetap bersih (clean) sebelum dianggap selesai.

## Testing & Verifikasi
- Sebelum melaporkan tugas selesai, uji perubahan (jalankan/simulasikan) untuk memastikan berfungsi sesuai harapan.
- Jangan mengasumsikan kode "pasti berhasil" tanpa verifikasi nyata.
- Jika terjadi error, tangani dengan jelas, jangan menyembunyikan/menelan error secara diam-diam.

## Keamanan
- Dilarang hardcode kredensial, API key, token, atau data sensitif lainnya di dalam kode.
- Gunakan environment variable atau file konfigurasi yang sudah ada di project.

## Perubahan Bertahap
- Perubahan besar dipecah menjadi langkah-langkah kecil agar mudah ditelusuri dan direview.
- Hindari mengubah banyak file sekaligus tanpa alasan yang jelas.

## Aksi Destruktif
- Tindakan yang berisiko merusak data (hapus tabel, migrasi database, hapus file penting, overwrite besar) harus diberi peringatan/konfirmasi terlebih dahulu sebelum dieksekusi.

## Konsistensi UI/UX
- Selalu ikuti pola desain, komponen, dan gaya yang sudah ada di frontend.
- Jangan membuat komponen baru jika komponen serupa sudah tersedia.
- Jaga konsistensi warna, spacing, tipografi, dan interaksi (state hover, loading, error) sesuai standar project.
- Perubahan UI harus selaras dengan desain yang sudah berjalan, bukan menciptakan gaya baru sendiri.

## Larangan
- Dilarang menebak nama tabel/kolom/endpoint tanpa verifikasi.
- Dilarang menulis ulang fungsi yang sudah ada.
- Dilarang mengubah UI/UX tanpa mengacu pada pola desain yang sudah ada.
- Dilarang menulis kode berlebihan jika versi ringkas sudah menyelesaikan masalah.
- Dilarang meninggalkan file debug/sementara di dalam project setelah selesai digunakan.

# Architectural Guidelines & Refactoring Rules - Litensi Kids

## 1. Modular File Architecture & Separation of Concerns
- **Mandatory Modular File Separation**: Every page, sub-page, and feature module MUST reside in its own separate file inside `/src/components/` (never combine multiple pages/subtabs into a single file):
  - **Dashboard / Overview**: `/src/components/dashboard/DashboardOverviewPage.tsx`
  - **Manajemen Anak & Gadget**: `/src/components/anak/KelolaAnakPage.tsx`, `/src/components/anak/DetailAnakPage.tsx`
  - **Inbox & Komunikasi**: `/src/components/inbox/ChatInboxPage.tsx`, `/src/components/inbox/BroadcastPage.tsx`
  - **Pengumuman**: `/src/components/pengumuman/PengumumanPage.tsx`
  - **Pengaturan**: `/src/components/pengaturan/KelolaPengaturanPage.tsx`, `/src/components/pengaturan/KonfigurasiSistemPage.tsx`
  - **Profil**: `/src/components/profil/ProfilSayaPage.tsx`
- `AdminDashboard.tsx` acts purely as a lightweight layout wrapper for the header, sidebar, theme context, and modular page routing.

## 2. Asynchronous / AJAX Data Loading
- All dynamic data, logs, charts, and record collections must use asynchronous / AJAX-style fetching or state loading simulation with clean loading and empty states.
- Avoid hardcoded static monolithic blocks inside layout components; load data modularly per subcomponent.

## 3. Responsive Design Rules
- Every page and subcomponent MUST be 100% responsive across all viewport sizes (`sm:`, `md:`, `lg:`, `xl:`).
- Controls and tables must be scrollable horizontally on mobile/tablet without breaking layout containers.
- Form inputs, buttons, and card grids must adapt gracefully from single-column on mobile to multi-column on desktop.

## 4. Typography & Styling Constraints (Strict)
- **No Bold Text**: DO NOT use bold styling (`font-bold`, `font-black`, `font-extrabold`, `font-semibold`, `<b>`, `<strong>`). Use clean `font-normal` (400) or `font-medium` (500) for a light, modern, readable interface.
- **Maximum Text Size 16px**: Text font size MUST NOT exceed 16px (`text-base`). Use `text-xs` (12px), `text-sm` (14px), or `text-base` (16px) for all headings, titles, labels, numbers, and body text. Large typography classes (such as `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, etc.) are strictly forbidden.

## 5. Types & State Synchronization
- Global TypeScript interfaces and enums MUST be defined in `/src/types.ts`.
- Navigation state and sub-tab mapping in `/src/components/common/SidebarMenu.tsx` must remain synchronized with `AdminDashboard.tsx`.
