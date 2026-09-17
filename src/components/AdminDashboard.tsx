import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, User, LogOut, Settings, Sun, Moon,
  ShieldCheck, Check, Menu, X, Smartphone,
  Crown, ShieldAlert, Sparkles, Users, Server,
  Receipt, Megaphone
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useToast } from './ToastContext';
import { Page, User as UserType } from '../types';
import { SidebarMenu } from './common/SidebarMenu';
import { NotificationDropdown } from './common/NotificationDropdown';
import { DashboardOverviewPage } from './dashboard/DashboardOverviewPage';
import { KelolaAnakPage } from './anak/KelolaAnakPage';
import { AudioVideoMonitorPage } from './monitor/AudioVideoMonitorPage';
import { KontrolAplikasiPage } from './aplikasi/KontrolAplikasiPage';
import { GeofencePage } from './geofence/GeofencePage';
import { RiwayatNotifikasiPage } from './notifikasi/RiwayatNotifikasiPage';
import { ChatInboxPage } from './inbox/ChatInboxPage';
import { BroadcastPage } from './inbox/BroadcastPage';
import { PengumumanPage } from './pengumuman/PengumumanPage';
import { ProfilSayaPage } from './profil/ProfilSayaPage';
import { KelolaPengaturanPage, PengaturanSubTab } from './pengaturan/KelolaPengaturanPage';
import { MasterPaketPage } from './master/MasterPaketPage';
import { MasterPenggunaPage } from './master/MasterPenggunaPage';
import { MasterPendapatanPage } from './master/MasterPendapatanPage';
import { MasterSistemPage } from './master/MasterSistemPage';

import { getSessionUser } from '../lib/apiClient';

interface AdminDashboardProps {
  user?: UserType;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
}

const defaultParentUser: UserType = (() => {
  const session = getSessionUser();
  if (session && session.id > 0) {
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
      phone: (session as any).phone,
    };
  }
  return {
    id: 1,
    name: 'Ahmad Faisal',
    email: 'orangtua@litensikids.id',
    role: 'Orang Tua / Administrator',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
    activePlan: 'premium',
    activePlanLabel: 'Premium (Aktif)',
    childrenCount: 2,
    devicesCount: 2,
    status: 'active',
  };
})();

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user = defaultParentUser,
  onLogout,
  onNavigate
}) => {
  const currentUser: UserType = user || defaultParentUser;
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  // Cek role ASLI user dari session DB (bukan cuma toggle UI mode)
  const rawSession = getSessionUser();
  const isRealMasterAccount: boolean = Boolean(
    rawSession &&
      (rawSession.role === 'Maste' ||
        rawSession.role === 'Master' ||
        rawSession.role === 'Owner' ||
        rawSession.role?.toLowerCase().includes('master') ||
        rawSession.role?.toLowerCase().includes('owner'))
  );
  console.groupCollapsed('%c[AdminDashboard] Init Role Gatekeeping', 'color:#dc2626;font-weight:700');
  console.debug('[AdminDashboard] rawSession.role:', rawSession?.role ?? null);
  console.debug('[AdminDashboard] isRealMasterAccount (dari DB session):', isRealMasterAccount);
  console.debug('[AdminDashboard] currentUser.role label display:', currentUser.role);
  console.groupEnd();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeInboxSubTab, setActiveInboxSubTab] = useState<'chat' | 'broadcast'>('chat');
  const [activePengaturanSubTab, setActivePengaturanSubTab] = useState<PengaturanSubTab>('konfigurasi');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Active Role Mode: HANYA user Master asli yang boleh memilih 'master'. User Orang Tua LOCKED 'orangtua'.
  const [activeRoleMode, setActiveRoleMode] = useState<'master' | 'orangtua'>(() => {
    if (!isRealMasterAccount) {
      console.debug('[AdminDashboard] User BUKAN Master → Lock activeRoleMode = orangtua (abaikan localStorage)');
      return 'orangtua';
    }
    const savedRole = localStorage.getItem('litensi_active_role_mode');
    return savedRole === 'orangtua' ? 'orangtua' : 'master';
  });

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLDivElement>(null);

  const handleRoleToggle = (role: 'master' | 'orangtua') => {
    if (role === 'master' && !isRealMasterAccount) {
      console.warn('[AdminDashboard] ATTENTION: User biasa mencoba paksa Mode Master → DIBLOKIR.');
      showToast('Akses ditolak: Mode Master hanya untuk Pemilik Web App (role Master).', 'warning');
      return;
    }
    setActiveRoleMode(role);
    localStorage.setItem('litensi_active_role_mode', role);
    showToast(
      role === 'master'
        ? 'Beralih ke Mode Master (Pemilik Web App) - Akses Penuh Sistem'
        : 'Beralih ke Mode Orang Tua (Pengguna Biasa) - Akses Terbatas',
      'info'
    );
  };

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!showUserDropdown) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserDropdown]);

  // Auto-responsive listener for mobile, tablet, and desktop
  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth < 1024;
      setIsMobileOrTablet(isSmall);
      if (isSmall) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectMenu = (menuId: string, subId?: string) => {
    if (!isRealMasterAccount && (menuId.startsWith('master_') || menuId === 'pengumuman')) {
      console.warn('[AdminDashboard] Akses ditolak: User biasa mencoba akses menu Master →', menuId);
      showToast('Akses ditolak: Menu Master (termasuk Pengumuman & Edukasi) hanya untuk Pemilik Web App (role Master/Owner).', 'warning');
      setActiveTab('dashboard');
      if (isMobileOrTablet) setIsSidebarOpen(false);
      return;
    }
    setActiveTab(menuId);
    if (menuId === 'inbox' && subId) {
      setActiveInboxSubTab(subId as 'chat' | 'broadcast');
    }
    if (menuId === 'pengaturan' && subId) {
      setActivePengaturanSubTab(subId as PengaturanSubTab);
    }
    if (isMobileOrTablet) {
      setIsSidebarOpen(false);
    }
  };

  // Initial configuration state
  const [configValues, setConfigValues] = useState({
    systemName: 'Litensi Kids Parental Control',
    adminEmail: currentUser.email || 'orangtua@litensikids.id',
    timezone: 'Asia/Jakarta (WIB)',
    language: 'id',
    autoLock: true,
    safeSearch: true,
    locationTracking: true
  });

  return (
    <div className="min-h-screen bg-[#0e1626] dark:bg-[#0a0f1d] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 h-16 bg-[#0e1626] dark:bg-[#0a0f1d] px-3 sm:px-6 flex items-center justify-between text-white border-b border-slate-800/80">
        {/* Left Side: Hamburger button + Branding + Active Page Title */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          {/* Hamburger / Sidebar Toggle Button (Only on Mobile & Tablet) */}
          <button
            id="header-hamburger-toggle"
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isSidebarOpen ? 'Tutup Menu' : 'Buka Menu'}
          >
            {isSidebarOpen && isMobileOrTablet ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Logo Branding */}
          <div className="flex items-center gap-2.5 lg:w-56 xl:w-60 shrink-0">
            <div className="flex items-center justify-center">
              <img
                src="/logo/litensilogo.png"
                alt="Litensi Kids Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('header-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
                onLoad={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'block';
                  const fallback = document.getElementById('header-logo-fallback');
                  if (fallback) fallback.style.display = 'none';
                }}
              />
              <div
                id="header-logo-fallback"
                style={{ display: 'none' }}
                className="items-center justify-center p-1.5 sm:p-2 bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 rounded-xl text-white shadow-md shadow-orange-500/20"
              >
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="brand-text-shine text-xs sm:text-sm font-medium tracking-wider block drop-shadow-xs leading-none">
                LITENSI KIDS
              </span>
              <span className="text-[9.5px] sm:text-[10.5px] text-slate-400 font-normal block tracking-wide mt-0.5 leading-none">
                Bimbingan Digital Anak
              </span>
            </div>
          </div>

          {/* Active Tab Name (Desktop / Tablet view) */}
          <div className="hidden md:flex items-center pl-4 lg:pl-6 text-slate-200 text-xs sm:text-sm font-normal tracking-wide">
            {activeTab === 'dashboard'
              ? 'Dashboard Ringkasan'
              : activeTab === 'anak'
              ? 'Perangkat & Profil Anak'
              : activeTab === 'monitor'
              ? 'Audio & Video Monitor'
              : activeTab === 'aplikasi'
              ? 'Kontrol Pembatasan Aplikasi'
              : activeTab === 'geofence'
              ? 'Geofences & Pemantauan Lokasi'
              : activeTab === 'notifikasi'
              ? 'Riwayat Notifikasi Perangkat Anak'
              : activeTab === 'inbox'
              ? 'Pesan & Inbox'
              : activeTab === 'pengumuman'
              ? 'Pengumuman & Edukasi'
              : activeTab === 'pengaturan'
              ? 'Pengaturan Orang Tua'
              : activeTab === 'master_paket'
              ? 'Master Paket & Batasan Fitur'
              : activeTab === 'master_pengguna'
              ? 'Master Pengguna & Lisensi'
              : activeTab === 'master_pendapatan'
              ? 'Master Laporan Pendapatan'
              : activeTab === 'master_sistem'
              ? 'Master Konfigurasi Server'
              : 'Profil Saya'}
          </div>
        </div>

        {/* Right Side: Role Indicator Pill, Theme Toggle, Notifications, User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick Role Switcher Pill — HANYA Master asli bisa toggle, Orang Tua lock badge statis */}
          {isRealMasterAccount ? (
            <div className="hidden sm:flex items-center p-0.5 bg-slate-800/80 border border-slate-700/80 rounded-xl">
              <button
                type="button"
                onClick={() => handleRoleToggle('orangtua')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-normal transition-all cursor-pointer ${
                  activeRoleMode === 'orangtua'
                    ? 'bg-indigo-600 text-white font-medium shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mode Orang Tua
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('master')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-normal transition-all cursor-pointer flex items-center gap-1 ${
                  activeRoleMode === 'master'
                    ? 'bg-amber-600 text-white font-medium shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Mode Master</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center px-2.5 py-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-[11px] font-medium gap-1.5">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>Mode Orang Tua</span>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Notifications Dropdown Container */}
          <div className="relative" ref={notificationButtonRef}>
            <button
              id="header-notification-btn"
              type="button"
              onClick={() => {
                setShowNotificationDropdown(prev => !prev);
                setShowUserDropdown(false);
              }}
              className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
                showNotificationDropdown
                  ? 'text-white bg-slate-800 ring-1 ring-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Notifikasi & Permintaan"
              aria-expanded={showNotificationDropdown}
              aria-label="Buka notifikasi"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 flex items-center justify-center w-3.5 h-3.5 text-[9px] font-medium text-white bg-rose-600 rounded-full ring-2 ring-[#0e1626]">
                2
              </span>
            </button>

            {/* Notification Dropdown Component */}
            <NotificationDropdown
              isOpen={showNotificationDropdown}
              onClose={() => setShowNotificationDropdown(false)}
              onNavigateTab={(tab, sub) => handleSelectMenu(tab, sub)}
              showToast={showToast}
            />
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userDropdownRef}>
            <button
              id="header-profile-btn"
              type="button"
              onClick={() => {
                setShowUserDropdown(prev => !prev);
                setShowNotificationDropdown(false);
              }}
              className="flex items-center gap-2 sm:gap-3 p-1 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-white leading-tight truncate max-w-[120px] sm:max-w-none">
                  {currentUser?.name || 'Ahmad Faisal'}
                </div>
                <div className="text-[10px] text-slate-400 font-normal leading-tight">
                  {activeRoleMode === 'master' ? 'Master / Pemilik Web' : 'Orang Tua'}
                </div>
              </div>
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'}
                alt={currentUser?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shadow-xs"
              />
            </button>

            {/* Profile Dropdown Menu */}
            {showUserDropdown && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setShowUserDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                    {currentUser?.name || 'Ahmad Faisal'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal truncate">
                    {currentUser?.email || 'orangtua@litensikids.id'}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    <Crown className="w-3 h-3" />
                    <span>Role: {activeRoleMode === 'master' ? 'Master (Pemilik Web)' : 'Orang Tua'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('profil')}
                  className="w-full px-3 py-2 text-left text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>Profil Saya</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pengaturan')}
                  className="w-full px-3 py-2 text-left text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Pengaturan Orang Tua</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Master quick links inside dropdown - KHUSUS MASTER SAJA */}
                {isRealMasterAccount && (
                  <>
                    <div className="px-3 py-1 text-[10px] uppercase font-medium text-amber-600 dark:text-amber-400 tracking-wider">
                      Master Menu
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectMenu('master_paket');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>Paket & Batasan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectMenu('master_pengguna');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>Pengguna & Akun</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectMenu('master_pendapatan');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Laporan Pendapatan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectMenu('pengumuman');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Megaphone className="w-3.5 h-3.5 text-sky-500" />
                      <span>Pengumuman & Edukasi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectMenu('master_sistem');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Server className="w-3.5 h-3.5 text-purple-500" />
                      <span>Konfigurasi Server</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  </>
                )}

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-3 py-2 text-left text-xs font-normal text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Area: Sidebar (Left) + Curved Content Area (Right) */}
      <div className="flex flex-1 relative bg-[#0e1626] dark:bg-[#0a0f1d] overflow-x-hidden">
        {/* Sidebar Navigation */}
        <SidebarMenu
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isMobileOrTablet={isMobileOrTablet}
          activeTab={activeTab}
          activeInboxSubTab={activeInboxSubTab}
          activePengaturanSubTab={activePengaturanSubTab}
          userRole={activeRoleMode}
          onSelectMenu={handleSelectMenu}
          onNavigate={(p) => onNavigate(p as Page)}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 w-full bg-[#f8fafc] dark:bg-slate-900 rounded-tl-2xl sm:rounded-tl-[32px] md:rounded-tl-[40px] shadow-2xl ${
            activeTab === 'monitor' ? 'p-3 sm:p-4 md:p-5' : 'p-3.5 sm:p-5 md:p-6 lg:p-8'
          } min-h-[calc(100vh-4rem)] transition-all duration-300 overflow-x-hidden ${
            isMobileOrTablet ? 'ml-0' : isSidebarOpen ? 'ml-64 sm:ml-72' : 'ml-20'
          }`}
        >
          <div className={`w-full ${activeTab === 'monitor' ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <DashboardOverviewPage
                currentUser={currentUser}
                onNavigateToTab={(tab, sub) => handleSelectMenu(tab, sub)}
                showToast={showToast}
              />
            )}

            {/* TAB: KELOLA ANAK & PERANGKAT */}
            {activeTab === 'anak' && (
              <KelolaAnakPage showToast={showToast} />
            )}

            {/* TAB: AUDIO & VIDEO MONITOR */}
            {activeTab === 'monitor' && (
              <AudioVideoMonitorPage showToast={showToast} />
            )}

            {/* TAB: KONTROL APLIKASI */}
            {activeTab === 'aplikasi' && (
              <KontrolAplikasiPage showToast={showToast} />
            )}

            {/* TAB: GEOFENCES */}
            {activeTab === 'geofence' && (
              <GeofencePage showToast={showToast} />
            )}

            {/* TAB: RIWAYAT NOTIFIKASI */}
            {activeTab === 'notifikasi' && (
              <RiwayatNotifikasiPage showToast={showToast} />
            )}

            {/* TAB: INBOX & CHAT */}
            {activeTab === 'inbox' && (
              <div className="space-y-6">
                {activeInboxSubTab === 'chat' ? (
                  <ChatInboxPage user={currentUser} showToast={showToast} />
                ) : (
                  <BroadcastPage user={currentUser} showToast={showToast} />
                )}
              </div>
            )}

            {/* TAB: PENGUMUMAN */}
            {activeTab === 'pengumuman' && (
              <PengumumanPage showToast={showToast} />
            )}

            {/* TAB: PROFIL SAYA */}
            {activeTab === 'profil' && (
              <ProfilSayaPage
                user={currentUser}
                onBack={() => setActiveTab('dashboard')}
                showToast={showToast}
              />
            )}

            {/* TAB: PENGATURAN ORANG TUA */}
            {activeTab === 'pengaturan' && (
              <KelolaPengaturanPage
                initialSubTab={activePengaturanSubTab}
                onSubTabChange={(tab) => setActivePengaturanSubTab(tab)}
                konfigurasiProps={{
                  config: configValues,
                  onSaveConfig: (newCfg) => {
                    setConfigValues(newCfg);
                    showToast('Konfigurasi sistem berhasil diperbarui', 'success');
                  }
                }}
                showToast={showToast}
              />
            )}

            {/* TAB: MASTER MENU 1 - PAKET & BATASAN FITUR */}
            {activeTab === 'master_paket' && (
              <MasterPaketPage showToast={showToast} />
            )}

            {/* TAB: MASTER MENU 2 - PENGGUNA & LISENSI */}
            {activeTab === 'master_pengguna' && (
              <MasterPenggunaPage showToast={showToast} />
            )}

            {/* TAB: MASTER MENU 3 - LAPORAN PENDAPATAN */}
            {activeTab === 'master_pendapatan' && (
              <MasterPendapatanPage showToast={showToast} />
            )}

            {/* TAB: MASTER MENU 4 - SISTEM & SERVER */}
            {activeTab === 'master_sistem' && (
              <MasterSistemPage showToast={showToast} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
