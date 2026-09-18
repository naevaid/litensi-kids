import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, MessageSquare, Megaphone,
  FileText, Settings, ChevronRight, ChevronLeft, Check, X,
  Smartphone, ShieldCheck, AppWindow, MapPin, Bell, Radio,
  Crown, Users, Server, Sliders, Shield, Receipt, DollarSign
} from 'lucide-react';

export interface SidebarSubMenuItem {
  id: string;
  label: string;
  badge?: string;
}

export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  hasChildren?: boolean;
  isAction?: boolean;
  section?: 'user' | 'master' | 'other';
}

export interface SidebarMenuProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isMobileOrTablet: boolean;
  activeTab: string;
  activeSubTab?: string;
  activeInboxSubTab?: string;
  activePengaturanSubTab?: string;
  userRole?: 'master' | 'orangtua';
  onSelectMenu: (menuId: string, subId?: string) => void;
  onNavigate: (page: string) => void;
}

// Submenu helper map for structured navigation
export const SUB_MENU_MAP: Record<string, SidebarSubMenuItem[]> = {
  inbox: [
    { id: 'chat', label: 'Chat & Permintaan Waktu' },
    { id: 'broadcast', label: 'Pesan Broadcast' }
  ],
  // Submenu Pengaturan Orang Tua: URUTAN BARU sesuai user request:
  // 0 = Langganan Keluarga Saya (item pertama) → 1 = Hak Akses & Wali
  // Submenu Proteksi Anak (id: konfigurasi) DIHAPUS PERMANEN sesuai permintaan user
  pengaturan: [
    { id: 'langganan_saya', label: 'Langganan Keluarga Saya' },
    { id: 'hak_akses', label: 'Hak Akses & Wali' }
  ]
};

// Menu items for Orang Tua (Parents)
export const PARENT_MENU_ITEMS: SidebarMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, section: 'user' },
  { id: 'anak', label: 'Perangkat Anak', icon: <Smartphone className="w-[18px] h-[18px]" />, section: 'user' },
  { id: 'monitor', label: 'Audio & Video Monitor', icon: <Radio className="w-[18px] h-[18px]" />, section: 'user' },
  { id: 'aplikasi', label: 'Kontrol Aplikasi', icon: <AppWindow className="w-[18px] h-[18px]" />, section: 'user' },
  { id: 'geofence', label: 'Geofences', icon: <MapPin className="w-[18px] h-[18px]" />, section: 'user' },
  { id: 'notifikasi', label: 'Riwayat Notifikasi', icon: <Bell className="w-[18px] h-[18px]" />, section: 'user' },
  { id: 'inbox', label: 'Pesan & Inbox', icon: <MessageSquare className="w-[18px] h-[18px]" />, hasChildren: true, section: 'user' },
  { id: 'pengaturan', label: 'Pengaturan Orang Tua', icon: <Settings className="w-[18px] h-[18px]" />, hasChildren: true, section: 'user' }
];

// Menu items for Master (Pemilik Web App / Super Admin)
export const MASTER_MENU_ITEMS: SidebarMenuItem[] = [
  { id: 'master_paket', label: 'Paket & Batasan Fitur', icon: <Crown className="w-[18px] h-[18px] text-amber-400" />, section: 'master' },
  { id: 'master_pengguna', label: 'Pengguna & Lisensi', icon: <Users className="w-[18px] h-[18px] text-blue-400" />, section: 'master' },
  { id: 'master_pendapatan', label: 'Laporan Pendapatan', icon: <Receipt className="w-[18px] h-[18px] text-emerald-400" />, section: 'master' },
  { id: 'pengumuman', label: 'Pengumuman & Edukasi', icon: <Megaphone className="w-[18px] h-[18px] text-sky-400" />, section: 'master' },
  { id: 'master_sistem', label: 'Konfigurasi Server', icon: <Server className="w-[18px] h-[18px] text-purple-400" />, section: 'master' }
];

export const OTHER_MENU_ITEMS: SidebarMenuItem[] = [
  { id: 'landing', label: 'Landing Page', icon: <FileText className="w-[18px] h-[18px]" />, isAction: true, section: 'other' }
];

export const ALL_SIDEBAR_ITEMS: SidebarMenuItem[] = [
  ...PARENT_MENU_ITEMS,
  ...MASTER_MENU_ITEMS,
  ...OTHER_MENU_ITEMS
];

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isMobileOrTablet,
  activeTab,
  activeInboxSubTab = 'chat',
  activePengaturanSubTab = 'konfigurasi',
  userRole = 'master',
  onSelectMenu,
  onNavigate
}) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const isSubActive = (menuId: string, subId: string) => {
    if (menuId === 'inbox') return activeTab === 'inbox' && activeInboxSubTab === subId;
    if (menuId === 'pengaturan') return activeTab === 'pengaturan' && activePengaturanSubTab === subId;
    return false;
  };

  const getDefaultSubTab = (menuId: string): string | undefined => {
    if (menuId === 'inbox') return activeInboxSubTab || 'chat';
    if (menuId === 'pengaturan') return activePengaturanSubTab || 'konfigurasi';
    return undefined;
  };

  const handleMainMenuClick = (item: SidebarMenuItem) => {
    if (item.isAction) {
      if (item.id === 'landing') {
        if (isMobileOrTablet) setIsSidebarOpen(false);
        onNavigate('landing');
      }
      return;
    }

    const defaultSub = getDefaultSubTab(item.id);
    onSelectMenu(item.id, defaultSub);

    if (item.hasChildren) {
      setOpenAccordion(prev => (prev === item.id ? null : item.id));
    }
    if (isMobileOrTablet && !item.hasChildren) {
      setIsSidebarOpen(false);
    }
  };

  const handleSubMenuClick = (menuId: string, subId: string) => {
    onSelectMenu(menuId, subId);
    if (isMobileOrTablet) {
      setIsSidebarOpen(false);
    }
  };

  const renderMenuItem = (item: SidebarMenuItem) => {
    const isActive = activeTab === item.id;
    const subItems = SUB_MENU_MAP[item.id] || [];
    const isAccordionOpen = openAccordion === item.id || isActive;

    return (
      <div key={item.id} className="relative group">
        <button
          type="button"
          onClick={() => handleMainMenuClick(item)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-normal text-xs sm:text-sm transition-all cursor-pointer ${
            isActive
              ? item.section === 'master'
                ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white font-medium shadow-xs'
                : 'bg-indigo-600 text-white font-medium shadow-xs'
              : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
          } ${!isSidebarOpen && !isMobileOrTablet ? 'justify-center px-2 py-3' : ''}`}
        >
          <div className="flex items-center gap-3">
            <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}>
              {item.icon}
            </span>
            {(isSidebarOpen || isMobileOrTablet) && (
              <span className="truncate text-xs sm:text-sm font-normal tracking-wide">{item.label}</span>
            )}
          </div>

          {(isSidebarOpen || isMobileOrTablet) && item.hasChildren && (
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isAccordionOpen ? 'rotate-90 text-slate-200' : 'text-slate-500'
              }`}
            />
          )}
        </button>

        {/* Hover Flyout Popup for Collapsed Sidebar */}
        {!isSidebarOpen && !isMobileOrTablet && (
          <div className="absolute left-full top-0 ml-3 hidden group-hover:flex flex-col z-50 min-w-[220px] bg-[#111a2e] dark:bg-[#0c1322] border border-slate-700/80 rounded-xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-4 before:content-['']">
            {/* Header item in popover */}
            <div
              onClick={() => handleMainMenuClick(item)}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-indigo-400">{item.icon}</span>
                <span className="text-xs font-medium text-white">{item.label}</span>
              </div>
            </div>

            {/* Submenu items list in popover */}
            {item.hasChildren && subItems.length > 0 && (
              <div className="mt-1 pt-1.5 border-t border-slate-800/80 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-normal text-slate-400 tracking-wider uppercase">
                  Pilihan Menu
                </div>
                {subItems.map(sub => {
                  const active = isSubActive(item.id, sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubMenuClick(item.id, sub.id);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submenu Accordion for Expanded Sidebar */}
        {(isSidebarOpen || isMobileOrTablet) && item.hasChildren && isAccordionOpen && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-8 pr-2 py-1 space-y-1 overflow-hidden"
            >
              {subItems.map(sub => {
                const active = isSubActive(item.id, sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubMenuClick(item.id, sub.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile & Tablet Drawer Backdrop */}
      {isMobileOrTablet && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 flex flex-col bg-[#0e1626] dark:bg-[#0a0f1d] text-slate-300 transition-all duration-300 ease-in-out ${
          isMobileOrTablet
            ? isSidebarOpen
              ? 'translate-x-0 w-72 shadow-2xl'
              : '-translate-x-full w-72'
            : isSidebarOpen
            ? 'w-64 sm:w-72'
            : 'w-20'
        }`}
      >
        {/* Mobile Sidebar Header with Close Button */}
        {isMobileOrTablet && (
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo/litensilogo.png"
                alt="Litensi Kids Logo"
                className="w-7 h-7 object-contain rounded-lg shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('mobile-sidebar-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="mobile-sidebar-logo-fallback"
                style={{ display: 'none' }}
                className="p-1.5 bg-gradient-to-tr from-amber-500 to-emerald-400 rounded-lg text-white"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-white">Menu Navigasi</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Desktop Edge Toggle Button */}
        {!isMobileOrTablet && (
          <button
            id="sidebar-edge-toggle-btn"
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Ciutkan Sidebar' : 'Bentangkan Sidebar'}
            className="absolute -right-3.5 top-8 z-50 w-7 h-7 bg-[#0e1626] dark:bg-[#0a0f1d] hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-300 hover:text-white rounded-full shadow-md border border-slate-700/60 flex items-center justify-center transition-all cursor-pointer"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Navigation Items List */}
        <nav
          className={`flex-1 py-3 space-y-4 px-3 custom-scrollbar ${
            !isSidebarOpen && !isMobileOrTablet ? 'overflow-visible' : 'overflow-y-auto'
          }`}
        >
          {/* SECTION 1: MENU ORANG TUA / PENGGUNA */}
          <div className="space-y-1">
            {(isSidebarOpen || isMobileOrTablet) && (
              <div className="px-3 py-1 text-[10px] font-medium tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <span>Menu Orang Tua</span>
              </div>
            )}
            {PARENT_MENU_ITEMS.map(renderMenuItem)}
          </div>

          {/* SECTION 2: MASTER MENU (KHUSUS PEMILIK WEB APP / ROLE MASTER SAJA) */}
          {userRole === 'master' && (
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              {(isSidebarOpen || isMobileOrTablet) && (
                <div className="px-3 py-1 text-[10px] font-medium tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Master Menu</span>
                </div>
              )}
              {MASTER_MENU_ITEMS.map(renderMenuItem)}
            </div>
          )}

          {/* SECTION 3: LAINNYA */}
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            {OTHER_MENU_ITEMS.map(renderMenuItem)}
          </div>
        </nav>
      </aside>
    </>
  );
};
