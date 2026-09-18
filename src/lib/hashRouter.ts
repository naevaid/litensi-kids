// ==========================================================================
// src/lib/hashRouter.ts — Utility SPA BROWSER HISTORY MODE (TANPA # di URL)
// Format URL BERSIH: /notifikasi /profil-saya /pengaturan/hak-akses
// --------------------------------------------------------------------------
// WORKFLOW BARU (History API Mode):
//   User klik sidebar → setActiveTab('pengaturan')
//     → useEffect sync URL via history.replaceState → /pengaturan/langganan-saya
//   User F5 reload → window onMount parse window.location.pathname
//     → setCurrentPage('pengaturan') di App.tsx
//     → setActiveTab('pengaturan') + setPengaturanSubTab('langganan_saya')
//       di AdminDashboard.tsx
//   User tombol back/forward browser → window event 'popstate' dipanggil
//     → parse pathname → update state page + subtab aktif
//
// FORMAT URL BERSIH (TANPA #):
//   Publik:
//     /            → landing (root path)
//     /login       → login page
//     /register    → register
//     /forgot      → lupa password
//     /privacy     → kebijakan privasi
//     /terms       → syarat & ketentuan
//   Dashboard (setelah login):
//     /dashboard                  → ringkasan utama
//     /anak                       → profil & perangkat anak
//     /monitor                    → audio/video monitor
//     /aplikasi                   → kontrol pembatasan aplikasi
//     /geofence                   → geofences & lokasi
//     /notifikasi                 → riwayat notifikasi anak
//     /inbox/chat                 → pesan & inbox chat
//     /inbox/broadcast            → pesan broadcast grup
//     /pengumuman                 → pengumuman & edukasi (master only)
//     /profil-saya                → profil saya & PIN master
//     /pengaturan/langganan-saya  → pengaturan: langganan keluarga (default)
//     /pengaturan/hak-akses      → pengaturan: hak akses akun anak
//     /master-paket              → (master) daftar paket langganan
//     /master-pengguna           → (master) kelola pengguna & lisensi
//     /master-pendapatan         → (master) laporan pendapatan
//     /master-sistem             → (master) konfigurasi server
// ==========================================================================
import type { Page, PengaturanSubTab } from '../types';

// --------------------------------------------------------------------------
// Mapping: Page Type → URL Slug (kebab-case human readable)
// --------------------------------------------------------------------------
export const PAGE_TO_SLUG: Record<Exclude<Page, never>, string> = {
  // Publik
  landing: '',
  login: 'login',
  register: 'register',
  forgot: 'forgot',
  privacy: 'privacy',
  terms: 'terms',
  // Dashboard tabs
  dashboard: 'dashboard',
  anak: 'anak',
  monitor: 'monitor',
  aplikasi: 'aplikasi',
  geofence: 'geofence',
  notifikasi: 'notifikasi',
  inbox: 'inbox',
  pengumuman: 'pengumuman',
  profil_saya: 'profil-saya',
  pengaturan: 'pengaturan',
  // Master
  master_paket: 'master-paket',
  master_pengguna: 'master-pengguna',
  master_pendapatan: 'master-pendapatan',
  master_sistem: 'master-sistem',
};

// Reverse mapping: slug → Page Type
export const SLUG_TO_PAGE: Record<string, Page> = Object.fromEntries(
  Object.entries(PAGE_TO_SLUG).map(([page, slug]) => [slug, page as Page])
) as Record<string, Page>;

// --------------------------------------------------------------------------
// Mapping: PengaturanSubTab → URL slug
// --------------------------------------------------------------------------
export const PENGATURAN_SUB_TO_SLUG: Record<PengaturanSubTab, string> = {
  langganan_saya: 'langganan-saya',
  hak_akses: 'hak-akses',
};
export const SLUG_TO_PENGATURAN_SUB: Record<string, PengaturanSubTab> = Object.fromEntries(
  Object.entries(PENGATURAN_SUB_TO_SLUG).map(([sub, slug]) => [slug, sub as PengaturanSubTab])
) as Record<string, PengaturanSubTab>;

// --------------------------------------------------------------------------
// Mapping: Inbox subtab → URL slug
// --------------------------------------------------------------------------
export const INBOX_SUB_TO_SLUG: Record<'chat' | 'broadcast', string> = {
  chat: 'chat',
  broadcast: 'broadcast',
};
export const SLUG_TO_INBOX_SUB: Record<string, 'chat' | 'broadcast'> = {
  chat: 'chat',
  broadcast: 'broadcast',
};

// --------------------------------------------------------------------------
// Hasil parse pathname URL (semua field optional: undefined = tidak ada / default)
// --------------------------------------------------------------------------
export interface ParsedHashRoute {
  page: Page;
  pengaturanSub?: PengaturanSubTab;
  inboxSub?: 'chat' | 'broadcast';
  raw: string;
}

// Alias backward compatible (nama import tidak berubah)
export type ParsedBrowserRoute = ParsedHashRoute;

/**
 * Bersihkan & split pathname browser (bukan hash).
 * Contoh input: '/profil-saya' | '/pengaturan/hak-akses' | '/'
 * Keluarkan array segmen (tanpa leading/trailing slash, tanpa empty).
 */
function splitHash(pathOrHash: string): string[] {
  let clean = (pathOrHash || '').trim();
  // Strip hash prefix jika masih ada (backward compatible)
  if (clean.startsWith('#')) clean = clean.slice(1);
  if (clean.startsWith('/')) clean = clean.slice(1);
  if (clean.endsWith('/')) clean = clean.slice(0, -1);
  if (!clean) return [];
  return clean.split('/').filter(Boolean);
}

/**
 * Parse window.location.pathname (bisa juga di-call dengan hash untuk backward compat)
 * menjadi object ParsedHashRoute terstruktur.
 * Jika path kosong / tidak dikenal → default landing (jika publik) / dashboard (jika login).
 */
export function parseHashRoute(
  pathnameOrHash: string,
  opts: { isLoggedIn: boolean; fallbackAuthPage?: Page; fallbackGuestPage?: Page }
): ParsedHashRoute {
  const {
    isLoggedIn,
    fallbackAuthPage = 'dashboard',
    fallbackGuestPage = 'landing',
  } = opts;
  const seg = splitHash(pathnameOrHash);
  const raw = pathnameOrHash || '';

  // Path kosong (root /) → fallback sesuai login state
  if (seg.length === 0) {
    return { page: isLoggedIn ? fallbackAuthPage : fallbackGuestPage, raw };
  }

  const pageSlug = seg[0];
  let page: Page | undefined = SLUG_TO_PAGE[pageSlug];

  // --- VALIDASI GATE LOGIN ---
  const PUBLIC_PAGES: Page[] = ['landing', 'login', 'register', 'forgot', 'privacy', 'terms'];
  if (!isLoggedIn && page && !PUBLIC_PAGES.includes(page)) {
    return { page: 'login', raw };
  }
  if (isLoggedIn && page === 'login') {
    page = fallbackAuthPage;
  }
  if (!page) {
    return { page: isLoggedIn ? fallbackAuthPage : fallbackGuestPage, raw };
  }

  // --- SUB-SEGMEN (halaman yang punya subtab: inbox, pengaturan) ---
  let pengaturanSub: PengaturanSubTab | undefined;
  let inboxSub: 'chat' | 'broadcast' | undefined;

  if (page === 'pengaturan' && seg.length >= 2) {
    pengaturanSub = SLUG_TO_PENGATURAN_SUB[seg[1]] ?? 'langganan_saya';
  } else if (page === 'inbox' && seg.length >= 2) {
    inboxSub = SLUG_TO_INBOX_SUB[seg[1]] ?? 'chat';
  }

  return { page, pengaturanSub, inboxSub, raw };
}

/**
 * Alias nama function yang lebih jelas untuk BROWSER MODE (nama import tidak usah diubah).
 */
export const parseBrowserRoute = parseHashRoute;

/**
 * Generate PATH URL (bukan hash) string dari params yang dikasih.
 * Contoh:
 *   buildHashUrl('profil_saya') → '/profil-saya'
 *   buildHashUrl('landing') → '/'
 *   buildHashUrl('pengaturan', { pengaturanSub: 'langganan_saya' }) → '/pengaturan/langganan-saya'
 */
export function buildHashUrl(
  page: Page,
  opts?: { pengaturanSub?: PengaturanSubTab; inboxSub?: 'chat' | 'broadcast' }
): string {
  const slug = PAGE_TO_SLUG[page];
  if (!slug) return '/'; // landing
  let path = `/${slug}`;
  if (page === 'pengaturan' && opts?.pengaturanSub) {
    path += '/' + PENGATURAN_SUB_TO_SLUG[opts.pengaturanSub];
  } else if (page === 'inbox' && opts?.inboxSub) {
    path += '/' + INBOX_SUB_TO_SLUG[opts.inboxSub];
  }
  return path;
}

export const buildBrowserUrl = buildHashUrl;

/**
 * [BROWSER MODE] SINKRONKAN URL window.history dengan state
 * Pakai REPLACE STATE (history.replaceState) → TIDAK menambah entry history berlebih
 * (tidak spam back button ketika user klik tab cepat).
 */
export function syncHashToUrl(
  page: Page,
  opts?: { pengaturanSub?: PengaturanSubTab; inboxSub?: 'chat' | 'broadcast' }
): void {
  if (typeof window === 'undefined') return;
  const targetPath = buildHashUrl(page, opts);
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== targetPath) {
    window.history.replaceState(null, '', targetPath);
  }
}

export const syncBrowserUrl = syncHashToUrl;

/**
 * [BROWSER MODE] Navigasi ke page BARU dengan PUSH STATE (menambah entry history).
 * Ini digunakan ketika user KLIK menu navigasi (bukan ganti tab internal).
 * Bedanya: replaceState = overwrite current entry, pushState = tambah entry baru.
 */
export function pushBrowserUrl(
  page: Page,
  opts?: { pengaturanSub?: PengaturanSubTab; inboxSub?: 'chat' | 'broadcast' }
): void {
  if (typeof window === 'undefined') return;
  const targetPath = buildHashUrl(page, opts);
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== targetPath) {
    window.history.pushState(null, '', targetPath);
  }
}
