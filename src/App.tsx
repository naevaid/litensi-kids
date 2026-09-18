import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider } from './components/ToastContext';
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
      session.role === 'Maste' || session.role?.toLowerCase().includes('master')
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
    const loginNow = Boolean(activeUser && (activeUser.id ?? 0) > 0);
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

          {/* Dashboard + child pages wrapper */}
          {DASHBOARD_CHILD_PAGES.includes(currentPage) && isLoggedIn && (
            <AdminDashboard
              key="admin-dashboard-root"
              user={activeUser || defaultUser}
              onLogout={handleLogout}
              onNavigate={(p, opts) => navigateToPage(p as Page, opts as any)}
              initialPage={currentPage}
              onSyncSubHash={syncDashboardSubHash}
            />
          )}

          {/* Safety fallback: Jika user BELUM LOGIN tapi path dashboard → redirect login */}
          {DASHBOARD_CHILD_PAGES.includes(currentPage) && !isLoggedIn && (
            <LoginPage onNavigate={(p) => navigateToPage(p)} onLoginSuccess={handleLoginSuccess} />
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
