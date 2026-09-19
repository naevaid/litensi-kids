import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider, useToast } from './components/ToastContext';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { AdminDashboard } from './components/AdminDashboard';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsPage } from './components/TermsPage';
import { Page, User, PengaturanSubTab } from './types';
import { getSessionUser, setSessionUser, SessionUser, api } from './lib/apiClient';
import {
  requestNotificationPermission,
  requestPermissionAndRegisterToken,
  subscribeForegroundPushNotifications,
  type FcmPushPayload,
} from './services/fcmWebPush';
import {
  parseHashRoute,
  syncHashToUrl,
  buildHashUrl,
  pushBrowserUrl,
} from './lib/hashRouter';

// Konversi SessionUser (backend) -> User (types.ts UI)
function sessionToUser(session: SessionUser | null): User | null {
  if (!session) return null;
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role:
      session.role === 'Master' || session.role?.toLowerCase().includes('master')
        ? 'Master / Pemilik Web App'
        : 'Orang Tua / Administrator',
    avatarUrl: session.avatar_url || undefined,
    activePlan: session.active_plan,
    activePlanLabel: session.active_plan_label,
    childrenCount: session.children_count,
    devicesCount: session.devices_count,
    expiresAt: session.expires_at,
    status: session.status,
    pinMasterExists: (session as any).pin_master_exists ?? false,
  };
}

// Daftar halaman PUBLIC (bisa diakses TANPA login)
const PUBLIC_PAGES: Page[] = ['landing', 'login', 'register', 'forgot', 'privacy', 'terms'];
// Daftar halaman DASHBOARD (setelah login — di-wrap AdminDashboard)
const DASHBOARD_CHILD_PAGES: Page[] = [
  'dashboard', 'anak', 'monitor', 'aplikasi', 'geofence', 'notifikasi',
  'inbox', 'pengumuman', 'profil_saya', 'pengaturan',
  'master_paket', 'master_pengguna', 'master_pendapatan', 'master_sistem',
];

// --------------------------------------------------------------------------
// Component: FcmWebIntegrationHooks
// Fungsi: Mount hooks FCM Web Push DI DALAM ToastProvider (agar useToast tersedia)
// Posisi: Diletakkan DI BAWAH <ToastProvider> children di return App()
// Isi: Register Service Worker, Check Notification permission, Auto refresh token
//      jika granted, Banner kecil enable notif jika default, onMessage foreground toast
// --------------------------------------------------------------------------
function FcmWebIntegrationHooks() {
  const { toast } = useToast();
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // --- [Effect 1/2] Register Service Worker + Setup Foreground Push Listener ---
  useEffect(() => {
    let unsubForeground: (() => void) | null = null;
    let cancelled = false;

    const asyncInit = async () => {
      if (typeof window === 'undefined') return;
      const hasSW = 'serviceWorker' in navigator;
      const hasNotif = typeof (window as any).Notification !== 'undefined';

      // Step 1: Register Service Worker public/firebase-messaging-sw.js scope /
      if (hasSW) {
        try {
          const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
            updateViaCache: 'none',
          });
          swRegistrationRef.current = reg;
          console.log('[FCM App] Service Worker BERHASIL didaftarkan, scope =', reg.scope);
          if (reg.installing) console.log('[FCM App] SW state: installing');
          if (reg.waiting) console.log('[FCM App] SW state: waiting');
          if (reg.active) console.log('[FCM App] SW state: active & running');
        } catch (e: any) {
          console.warn('[FCM App] GAGAL register Service Worker:', e?.message || e);
        }
      } else {
        console.warn('[FCM App] Browser tidak mendukung Service Worker → Push background tidak aktif');
      }

      // Step 2: Subscribe onMessage Foreground Push (jika halaman aktif/focus)
      try {
        unsubForeground = subscribeForegroundPushNotifications((payload: FcmPushPayload) => {
          const notif = payload.notification ?? {};
          const title = (notif.title || 'Notifikasi Litensi Kids').trim();
          const body = (notif.body || 'Ada pesan baru untuk Anda.').trim();
          console.log('[FCM App] Foreground push → tampilkan Toast:', { title, body });
          toast.info(body, 7000, title);
        });
      } catch (e: any) {
        console.warn('[FCM App] Gagal subscribe foreground push listener:', e);
      }

      // Step 3: Handle Permission state
      if (!hasNotif) {
        console.warn('[FCM App] Browser tidak mendukung Notification API');
        return;
      }
      const perm = (window as any).Notification.permission as 'granted' | 'denied' | 'default';
      console.log('[FCM App] Notification permission state =', perm);

      if (cancelled) return;

      if (perm === 'granted') {
        // Permission sudah diizinkan → AUTO refresh token FCM setiap mount
        // (FCM token bisa expired tiap 6 bulan, refresh ketika user buka halaman = aman)
        // (G11 GUARD) HANYA AUTO REFRESH JIKA USER SUDAH LOGIN (session user id valid).
        //   JIKA BELUM LOGIN (landing/login guest page): TIDAK PERLU KIRIM TOKEN ke server,
        //   lakukan register token SETELAH user login sukses via LoginPage redirect ke dashboard.
        //   Ini MENGHINDARI 401 Unauthorized merah flooding console user.
        let sessLogin = null as SessionUser | null;
        try { sessLogin = getSessionUser(); } catch (_) { sessLogin = null; }
        if (!sessLogin || !sessLogin.id) {
          console.debug('[FCM App] Auto refresh token FCM DITUNDA (user BELUM LOGIN). Register otomatis SETELAH login berhasil.');
        } else {
          try {
            const swReg = swRegistrationRef.current ?? undefined;
            const result = await requestPermissionAndRegisterToken(swReg);
            if (result.ok) {
              console.log('[FCM App] Auto refresh token FCM BERHASIL. Panjang token =', (result.token || '').length);
            } else {
              // (G11 SUPPRESS) BUKAN error fatal. Hanya warn preview, tidak stack trace.
              const isNotLoggedInMsg = (result.message || '').toLowerCase().includes('belum login') || (result.message || '').toLowerCase().includes('401');
              if (isNotLoggedInMsg) {
                console.debug('[FCM App] Auto refresh token FCM ditunda (session invalid):', result.message);
              } else {
                console.warn('[FCM App] Auto refresh token FCM PERINGATAN:', result.message);
              }
            }
          } catch (e: any) {
            console.warn('[FCM App] Auto refresh token FCM exception:', e);
          }
        }
      } else if (perm === 'default') {
        // User belum pilih allow/deny → tampilkan BANNER INLINE (JANGAN native popup paksa!)
        setShowPermissionBanner(true);
      } else if (perm === 'denied') {
        // User sudah block notifikasi → jangan tampilkan apapun
        setShowPermissionBanner(false);
      }
    };

    asyncInit();

    // Cleanup unmount: unsubscribe listener
    return () => {
      cancelled = true;
      if (unsubForeground) {
        try { unsubForeground(); } catch (_) { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // --- Handler klik tombol "Aktifkan Notifikasi" di banner ---
  const handleClickEnableNotif = async () => {
    try {
      const ok = await requestNotificationPermission();
      if (ok) {
        setShowPermissionBanner(false);
        const swReg = swRegistrationRef.current ?? undefined;
        const result = await requestPermissionAndRegisterToken(swReg);
        if (result.ok) {
          toast.success(
            'Notifikasi push berhasil diaktifkan! Anda akan menerima notifikasi realtime geofence, chat baru, dan info penting lainnya.',
            6000,
            'Notifikasi Aktif ✅'
          );
        } else {
          toast.warning(
            result.message || 'Gagal menyimpan token notifikasi ke server. Coba refresh halaman.',
            7000,
            'Perhatian'
          );
        }
      } else {
        // User klik block / cancel di native popup
        setShowPermissionBanner(false);
        toast.warning(
          'Izin notifikasi ditolak. Anda bisa mengaktifkannya kapan saja di menu Setelan Situs / Site Settings browser Chrome Anda.',
          9000,
          'Izin Ditolak'
        );
      }
    } catch (e: any) {
      toast.error(
        'Terjadi kesalahan saat meminta izin notifikasi: ' + (e?.message || String(e)),
        7000,
        'Gagal Aktifkan'
      );
    }
  };

  // --- Render nothing if banner disabled ---
  if (!showPermissionBanner) return null;

  // --- Render BANNER KECIL BAWAH KANAN (inline UI, bukan native popup) ---
  return (
    <div
      className="fixed bottom-6 right-6 z-[99998] max-w-sm w-[calc(100%-3rem)] sm:w-[28rem] pointer-events-auto"
      role="dialog"
      aria-live="polite"
      aria-label="Aktifkan notifikasi push Litensi Kids"
    >
      <div className="bg-indigo-950/95 dark:bg-indigo-950/95 backdrop-blur-2xl border border-indigo-500/40 rounded-3xl shadow-2xl shadow-indigo-950/70 overflow-hidden">
        <div className="flex flex-col p-4 sm:p-5 gap-4">
          {/* Header: Ikon + Title + Close Button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-200 border border-indigo-500/30 shadow-inner">
                🔔
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-indigo-100 leading-snug tracking-wide mb-1">
                  Aktifkan Notifikasi Push
                </h3>
                <p className="text-xs text-indigo-300/90 leading-relaxed break-words">
                  Dapatkan pemberitahuan <span className="font-semibold text-indigo-200">realtime</span> ketika anak masuk/keluar zona aman geofence, chat baru dari perangkat anak, dan notifikasi penting lainnya — kapan saja.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPermissionBanner(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-indigo-300 hover:text-indigo-100 transition-colors shrink-0"
              aria-label="Tutup banner notifikasi"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Footer: Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowPermissionBanner(false)}
              className="px-4 py-2.5 text-xs font-semibold rounded-2xl text-indigo-300 hover:text-indigo-100 hover:bg-white/10 active:bg-white/15 transition-all whitespace-nowrap order-2 sm:order-1"
            >
              Nanti Saja
            </button>
            <button
              type="button"
              onClick={handleClickEnableNotif}
              className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 transition-all whitespace-nowrap order-1 sm:order-2 flex items-center justify-center gap-2"
            >
              <span>🔔</span>
              <span>Aktifkan Notifikasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // --- STATE UTAMA ---
  const [activeUser, setActiveUser] = useState<User | null>(() => sessionToUser(getSessionUser()));
  const isLoggedIn = Boolean(activeUser && (activeUser.id ?? 0) > 0);

  // --- [1/3] INIT PAGE: Parse PATHNAME URL SAAT PERTAMA KALI BUKA (F5 reload tetap di halaman!) ---
  // BROWSER HISTORY MODE: URL BERSIH TANPA #. Contoh: /notifikasi /profil-saya /pengaturan/hak-akses
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const initialLogin = Boolean(getSessionUser() && getSessionUser()!.id > 0);
    const parsed = parseHashRoute(window.location.pathname, { isLoggedIn: initialLogin });
    console.debug('[App] INIT parseBrowserRoute. pathname=%s → page=%s login=%s',
      window.location.pathname || '/', parsed.page, initialLogin);
    return parsed.page;
  });

  // --- [2/3] EFFECT: SINKRONKAN currentPage KE URL (setiap user navigasi) ---
  useEffect(() => {
    // Landing tanpa path → URL bersih /
    syncHashToUrl(currentPage);
  }, [currentPage]);

  // --- [3/3] EVENT: POPSTATE (user klik Back / Forward browser / ketik URL manual) ---
  useEffect(() => {
    const onPopState = () => {
      const loginNow = Boolean(activeUser && (activeUser.id ?? 0) > 0);
      const parsed = parseHashRoute(window.location.pathname, { isLoggedIn: loginNow });
      console.debug('[App] onPopState → page=%s (loginNow=%s, pathname=%s)',
        parsed.page, loginNow, window.location.pathname || '/');
      setCurrentPage((prev) => (prev === parsed.page ? prev : parsed.page));
    };
    window.addEventListener('popstate', onPopState, { passive: true });
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeUser]);

  // --- NAVIGATE HELPER (single source of truth untuk semua child pages) ---
  const navigateToPage = useCallback((page: Page, opts?: { pengaturanSub?: PengaturanSubTab; inboxSub?: 'chat' | 'broadcast' }) => {
    // FIX RACE CONDITION LOGIN: LoginPage L70 setSessionUser(u) SUDAH menyimpan ke localStorage
    // SEBELUM onNavigate('dashboard') dipanggil L92. ActiveUser state masih async batched NULL.
    // Fallback ke getSessionUser() agar user yang BARU login TIDAK di-redirect balik ke login.
    const sessUser = getSessionUser();
    const loginNow = Boolean((activeUser && (activeUser.id ?? 0) > 0) || ((sessUser?.id ?? 0) > 0));
    // Gatekeeping: user TIDAK login mencoba akses dashboard page → redirect login
    if (!loginNow && PUBLIC_PAGES.includes(page) === false) {
      console.warn('[App] navigateToPage ditolak (belum login): %s → redirect ke /login', page);
      pushBrowserUrl('login');
      setCurrentPage('login');
      return;
    }
    // Sudah login mau ke landing → arahkan dashboard (lebih berguna)
    if (loginNow && page === 'landing') {
      pushBrowserUrl('dashboard');
      setCurrentPage('dashboard');
      return;
    }
    // Update URL duluan (pushState = tambah history entry back button work)
    if (page === currentPage && !opts) {
      return;
    }
    if (opts) {
      const target = buildHashUrl(page, opts);
      if (window.location.pathname !== target) {
        window.history.replaceState(null, '', target);
      }
    } else {
      pushBrowserUrl(page);
    }
    if (page !== currentPage) {
      setCurrentPage(page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeUser, currentPage]);

  // --- HANDLERS LOGIN / LOGOUT ---
  const handleLoginSuccess = (user: User) => {
    console.log('[App] handleLoginSuccess, simpan user:', user.email, user.id);
    setActiveUser(user);
    const session: SessionUser = {
      id: user.id || 1,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatarUrl,
      active_plan: user.activePlan,
      active_plan_label: user.activePlanLabel,
      children_count: user.childrenCount,
      devices_count: user.devicesCount,
      expires_at: user.expiresAt,
      status: user.status,
    };
    (session as any).pin_master_exists = !!user.pinMasterExists;
    setSessionUser(session);
    // Setelah login sukses → parse PATHNAME SAAT INI (jika user bookmark /profil-saya → langsung ke sana)
    const parsed = parseHashRoute(window.location.pathname, { isLoggedIn: true, fallbackAuthPage: 'dashboard' });
    console.debug('[App] afterLogin parsed pathname fallback → page=%s', parsed.page);
    setCurrentPage(parsed.page);
    syncHashToUrl(parsed.page, { pengaturanSub: parsed.pengaturanSub, inboxSub: parsed.inboxSub });
  };

  const handleLogout = async () => {
    console.log('[App] handleLogout dipanggil');
    try {
      await api.post('/auth/logout', {}, { authRequired: false, skipUserParam: true });
    } catch (e) {
      console.warn('[App] logout API error, lanjut clear local:', e);
    }
    setActiveUser(null);
    setSessionUser(null);
    setCurrentPage('landing');
    // URL bersih ke landing (/)
    window.history.replaceState(null, '', '/');
  };

  // Helper pass ke AdminDashboard: sync URL path dari tab/subtab yang aktif di sidebar
  const syncDashboardSubHash = useCallback((tab: string, sub?: PengaturanSubTab | 'chat' | 'broadcast') => {
    const slugToPageMap: Record<string, Page> = {
      dashboard: 'dashboard', anak: 'anak', monitor: 'monitor', aplikasi: 'aplikasi',
      geofence: 'geofence', notifikasi: 'notifikasi', inbox: 'inbox',
      pengumuman: 'pengumuman', 'profil-saya': 'profil_saya', pengaturan: 'pengaturan',
      'master-paket': 'master_paket', 'master-pengguna': 'master_pengguna',
      'master-pendapatan': 'master_pendapatan', 'master-sistem': 'master_sistem',
    };
    const page = slugToPageMap[tab] || (DASHBOARD_CHILD_PAGES.includes(tab as Page) ? (tab as Page) : 'dashboard');
    if (page === 'pengaturan' && sub && typeof sub === 'string' && (sub === 'langganan_saya' || sub === 'hak_akses')) {
      syncHashToUrl(page, { pengaturanSub: sub as PengaturanSubTab });
    } else if (page === 'inbox' && sub && (sub === 'chat' || sub === 'broadcast')) {
      syncHashToUrl(page, { inboxSub: sub });
    } else {
      syncHashToUrl(page);
    }
  }, []);

  // Default fallback user in case none is active
  const defaultUser: User = {
    name: 'Ahmad Faisal',
    email: 'orangtua@litensikids.id',
    role: 'Orang Tua / Administrator',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'
  };

  // --- RENDER HALAMAN SESUAI currentPage ---
  const renderPublicPage = () => {
    switch (currentPage) {
      case 'landing':   return <LandingPage onNavigate={(p) => navigateToPage(p)} />;
      case 'login':     return <LoginPage onNavigate={(p) => navigateToPage(p)} onLoginSuccess={handleLoginSuccess} />;
      case 'register':  return <RegisterPage onNavigate={(p) => navigateToPage(p)} onLoginSuccess={handleLoginSuccess} />;
      case 'forgot':    return <ForgotPasswordPage onNavigate={(p) => navigateToPage(p)} />;
      case 'privacy':   return <PrivacyPolicyPage onNavigate={(p) => navigateToPage(p)} />;
      case 'terms':     return <TermsPage onNavigate={(p) => navigateToPage(p)} />;
      default: return null;
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="w-full min-h-screen font-sans antialiased text-slate-800 bg-slate-50 transition-colors duration-300">
          {/* Public Pages render langsung (bukan dalam dashboard) */}
          {PUBLIC_PAGES.includes(currentPage) && renderPublicPage()}

          {/* Dashboard + child pages wrapper — FIX RACE CONDITION: fallback ke localStorage session
              agar setActiveUser async batched TIDAK menyebabkan fallback LoginPage ter-render dulu */}
          {DASHBOARD_CHILD_PAGES.includes(currentPage) && (isLoggedIn || Boolean(getSessionUser()?.id)) && (
            <AdminDashboard
              key="admin-dashboard-root"
              user={activeUser || defaultUser}
              onLogout={handleLogout}
              onNavigate={(p, opts) => navigateToPage(p as Page, opts as any)}
              initialPage={currentPage}
              onSyncSubHash={syncDashboardSubHash}
            />
          )}

          {/* Safety fallback: Jika user BENAR-BENAR BELUM LOGIN (state + localStorage SAMA-SAMA NULL)
              tapi path dashboard → redirect login */}
          {DASHBOARD_CHILD_PAGES.includes(currentPage) && !isLoggedIn && !Boolean(getSessionUser()?.id) && (
            <LoginPage onNavigate={(p) => navigateToPage(p)} onLoginSuccess={handleLoginSuccess} />
          )}

          {/* FCM Web Push Integration: Hooks + Banner permission (render inside ToastProvider scope) */}
          <FcmWebIntegrationHooks />
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
