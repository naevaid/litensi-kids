import React, { useState, useEffect } from 'react';
import {
  Bell, MessageSquare, Shield, ShieldAlert, Smartphone,
  Search, Filter, Check, CheckCheck, Trash2, Star,
  AlertTriangle, RefreshCw, Eye, Lock, Globe, MessageCircle,
  Clock, Calendar, User, Sliders, ExternalLink, Sparkles, X, Plus
} from 'lucide-react';
import { ForwardedNotification } from '../../types';
import { Pagination } from '../common/Pagination';
import { api } from '../../lib/apiClient';

interface RiwayatNotifikasiPageProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const INITIAL_KEYWORDS = [
  { id: 'kw-1', word: 'OTP / Kode Rahasia', level: 'danger', category: 'Keuangan' },
  { id: 'kw-2', word: 'Robux / Diamond Gratis', level: 'warning', category: 'Game & Phishing' },
  { id: 'kw-3', word: 'Kirim Foto / Video', level: 'danger', category: 'Privasi & Keselamatan' },
  { id: 'kw-4', word: 'Ketemuan di Luar', level: 'danger', category: 'Keselamatan Fisik' },
  { id: 'kw-5', word: 'Nomor Rekening / Transfer', level: 'warning', category: 'Finansial' }
];

// Helper format timestamp relatif Indonesia dari string datetime
const formatTimestampRelatif = (isoStr: string): string => {
  try {
    const d = new Date(isoStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return isoStr;
    const now = new Date();
    const jam = String(d.getHours()).padStart(2, '0');
    const menit = String(d.getMinutes()).padStart(2, '0');
    const waktuJam = `${jam}:${menit}`;
    const diffMs = now.getTime() - d.getTime();
    const diffHari = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHari === 0) return `Hari ini • ${waktuJam}`;
    if (diffHari === 1) return `Kemarin • ${waktuJam}`;
    if (diffHari < 7) return `${diffHari} hari lalu • ${waktuJam}`;
    const tgl = String(d.getDate()).padStart(2, '0');
    const bln = String(d.getMonth() + 1).padStart(2, '0');
    return `${tgl}/${bln} • ${waktuJam}`;
  } catch {
    return isoStr;
  }
};

// Ambil nama pertama (contoh: "Nadia Putri" → "Nadia") untuk UI filter
const getFirstName = (fullName: string): string => {
  return fullName.trim().split(' ')[0] ?? fullName;
};

// Mapper: snake_case DB → camelCase interface ForwardedNotification
const mapDbNotifikasiToInterface = (dbRow: any): ForwardedNotification => {
  const childNameFull = dbRow.child_name ?? '';
  const firstName = getFirstName(childNameFull);
  return {
    id: String(dbRow.id ?? `notif-${Date.now()}`),
    childName: firstName,
    deviceName: dbRow.device_name ?? '',
    appName: dbRow.app_name ?? 'Aplikasi',
    appPackage: dbRow.app_package ?? '',
    appCategory: (dbRow.app_category === 'games' ? 'game' : dbRow.app_category) ?? 'other',
    senderOrTitle: dbRow.sender_or_title ?? 'Notifikasi',
    content: dbRow.content ?? '',
    timestamp: formatTimestampRelatif(dbRow.timestamp ?? ''),
    isRead: !!dbRow.is_read,
    starred: !!dbRow.is_starred,
    isFlagged: !!dbRow.is_flagged,
    flagReason: dbRow.flag_reason ?? undefined,
    isSensitive: !!dbRow.is_sensitive,
    sensitiveCategory: dbRow.sensitive_category ?? undefined,
  };
};

export const RiwayatNotifikasiPage: React.FC<RiwayatNotifikasiPageProps> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState<ForwardedNotification[]>([]);
  const [keywords, setKeywords] = useState(INITIAL_KEYWORDS);
  const [activeSubTab, setActiveSubTab] = useState<'semua' | 'kata_kunci'>('semua');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<'all' | 'Rayhan' | 'Nadia'>('all');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unread' | 'flagged' | 'starred'>('all');

  // Pagination for Notifications Feed
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Detail Modal
  const [viewingNotif, setViewingNotif] = useState<ForwardedNotification | null>(null);

  // Add Keyword Modal
  const [isAddKeywordModalOpen, setIsAddKeywordModalOpen] = useState(false);
  const [newKeywordWord, setNewKeywordWord] = useState('');
  const [newKeywordLevel, setNewKeywordLevel] = useState<'warning' | 'danger'>('danger');
  const [newKeywordCategory, setNewKeywordCategory] = useState('Privasi & Keamanan');

  // Load data notifikasi real dari API
  const loadData = async () => {
    console.groupCollapsed('%c[Notifikasi] loadData GET /notifikasi', 'color:#ec4899;font-weight:700');
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/notifikasi');
      console.debug('[Notifikasi] raw response (res.data SUDAH di-unwrap apiClient 1x):', res);
      // apiClient line 201 otomatis unwrap data → res.data = {list, summary} BUKAN {success, data:{list, summary}}
      const payload = res.data ?? {};
      const list: any[] = payload?.list ?? [];
      const summary: any = payload?.summary ?? {};
      console.debug('[Notifikasi] DB rows (payload.list):', list.length, 'summary:', summary);
      const mapped = list.map(mapDbNotifikasiToInterface);
      console.debug('[Notifikasi] mapped interface:', mapped);
      setNotifications(mapped);
    } catch (err: any) {
      const msg = err?.message || 'Gagal memuat data notifikasi';
      console.error('[Notifikasi] loadData error:', err);
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = notifications.find(n => n.id === id);
    if (!target) return;
    const nextState = !target.starred;
    console.groupCollapsed(`%c[Notifikasi] handleToggleStar PUT /notifikasi/${id}`, 'color:#ec4899;font-weight:700');
    console.debug('starred nextState:', nextState);
    try {
      setIsSaving(true);
      await api.put(`/notifikasi/${id}`, { is_starred: nextState });
      showToast(nextState ? 'Notifikasi ditandai bintang' : 'Tanda bintang dihapus', 'info');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Gagal perbarui bintang notifikasi';
      console.error('[Notifikasi] toggleStar error:', err);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.groupCollapsed(`%c[Notifikasi] handleMarkAsRead PUT /notifikasi/${id}`, 'color:#ec4899;font-weight:700');
    try {
      setIsSaving(true);
      await api.put(`/notifikasi/${id}`, { is_read: true });
      showToast('Notifikasi ditandai sudah dibaca', 'success');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Gagal tandai sudah dibaca';
      console.error('[Notifikasi] markAsRead error:', err);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  const handleMarkAllAsRead = async () => {
    console.groupCollapsed('%c[Notifikasi] handleMarkAllAsRead POST /notifikasi/mark-all-read', 'color:#ec4899;font-weight:700');
    try {
      setIsSaving(true);
      const res = await api.post('/notifikasi/mark-all-read', {});
      // res.data SUDAH di-unwrap apiClient → res.data = {marked_count} BUKAN {data:{marked_count}}
      const markedCount = res?.data?.marked_count ?? 0;
      console.debug('[Notifikasi] markedCount:', markedCount, 'raw res.data:', res?.data);
      showToast(`Berhasil menandai ${markedCount} notifikasi sebagai dibaca`, 'success');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Gagal tandai semua dibaca';
      console.error('[Notifikasi] markAllAsRead error:', err);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  const handleDeleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.groupCollapsed(`%c[Notifikasi] handleDeleteNotif DELETE /notifikasi/${id}`, 'color:#ec4899;font-weight:700');
    try {
      setIsSaving(true);
      await api.delete(`/notifikasi/${id}`);
      if (viewingNotif?.id === id) setViewingNotif(null);
      showToast('Notifikasi dihapus dari riwayat', 'info');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Gagal hapus notifikasi';
      console.error('[Notifikasi] deleteNotif error:', err);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordWord.trim()) return;

    const newKw = {
      id: `kw-${Date.now()}`,
      word: newKeywordWord.trim(),
      level: newKeywordLevel,
      category: newKeywordCategory
    };

    setKeywords(prev => [newKw, ...prev]);
    showToast(`Kata kunci sensitif "${newKeywordWord}" berhasil ditambahkan ke pengawasan`, 'success');
    setNewKeywordWord('');
    setIsAddKeywordModalOpen(false);
  };

  const handleDeleteKeyword = (id: string, word: string) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
    showToast(`Kata kunci "${word}" dihapus dari pengawasan`, 'info');
  };

  // Filtered Notifications
  const filteredNotifs = notifications.filter(notif => {
    const matchSearch = notif.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        notif.senderOrTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        notif.appName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchChild = selectedChild === 'all' || notif.childName === selectedChild;
    const matchApp = selectedApp === 'all' || notif.appName === selectedApp;

    let matchStatus = true;
    if (selectedStatus === 'unread') matchStatus = !notif.isRead;
    if (selectedStatus === 'flagged') matchStatus = notif.isFlagged;
    if (selectedStatus === 'starred') matchStatus = !!notif.starred;

    return matchSearch && matchChild && matchApp && matchStatus;
  });

  // Calculate Pagination for notifications
  const totalNotifPages = Math.ceil(filteredNotifs.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalNotifPages);
  const paginatedNotifs = filteredNotifs.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const flaggedCount = notifications.filter(n => n.isFlagged).length;
  const waCount = notifications.filter(n => n.appName.toLowerCase().includes('whatsapp')).length;

  const getAppBadge = (appName: string) => {
    const lower = appName.toLowerCase();
    if (lower.includes('whatsapp')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
          <MessageCircle className="w-3 h-3 text-emerald-600" /> WhatsApp
        </span>
      );
    }
    if (lower.includes('sms')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
          <MessageSquare className="w-3 h-3 text-blue-600" /> SMS
        </span>
      );
    }
    if (lower.includes('instagram')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50">
          <Globe className="w-3 h-3 text-pink-600" /> Instagram
        </span>
      );
    }
    if (lower.includes('youtube')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50">
          <Bell className="w-3 h-3 text-red-600" /> YouTube Kids
        </span>
      );
    }
    if (lower.includes('free fire') || lower.includes('game') || lower.includes('roblox')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
          <Shield className="w-3 h-3 text-amber-600" /> {appName}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        <Bell className="w-3 h-3" /> {appName}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Banner Error ROSE */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-rose-900 dark:text-rose-200 mb-1">Gagal memuat data notifikasi</p>
            <p className="text-[11px] font-normal text-rose-800/90 dark:text-rose-300/90 mb-2">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={loadData}
              className="text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/50 px-3 py-1.5 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Banner Loading PINK saat initial load */}
      {loading && !errorMsg && (
        <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/50 p-3 rounded-2xl flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-pink-600 dark:text-pink-400 animate-spin shrink-0" />
          <p className="text-xs font-normal text-pink-800/90 dark:text-pink-300/90">
            Memuat riwayat notifikasi perangkat anak dari server...
          </p>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
              Riwayat Notifikasi Perangkat Anak
            </h1>
          </div>
          <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
            Penerusan notifikasi real-time dari HP/Tablet anak (WhatsApp, SMS, Medsos, Game, & Peringatan Kata Kunci Sensitif).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading || isSaving}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Muat ulang data notifikasi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={loading || isSaving}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddKeywordModalOpen(true)}
            disabled={loading || isSaving}
            className="px-3 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Pantau Kata Kunci</span>
          </button>
        </div>
      </div>

      {/* Forwarding Engine Explanation Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <span className="font-medium text-blue-900 dark:text-blue-200 block">
            Fitur Litensi Notification Forwarder Aktif
          </span>
          <p className="font-normal text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
            Setiap notifikasi masuk pada perangkat anak yang dipilih akan langsung disinkronkan ke panel ini secara terenkripsi. Anda dapat memantau pesan mencurigakan atau ajakan asing tanpa perlu menyita perangkat anak.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Total Notifikasi Masuk</span>
            <Bell className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-base font-medium text-slate-900 dark:text-white">
            {loading ? '...' : `${notifications.length} Pesan`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Hari ini & kemarin</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Pesan WhatsApp</span>
            <MessageCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-medium text-emerald-600 dark:text-emerald-400">
            {loading ? '...' : `${waCount} Pesan`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Chat & grup kelas</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Peringatan Sensitif</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base font-medium text-rose-600 dark:text-rose-400">
            {loading ? '...' : `${flaggedCount} Peringatan`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Kata kunci terdeteksi</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Belum Dibaca</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-medium text-indigo-600 dark:text-indigo-400">
            {loading ? '...' : `${unreadCount} Belum Dibaca`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Perlu ditinjau</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('semua')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeSubTab === 'semua'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Riwayat Notifikasi Masuk ({notifications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('kata_kunci')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeSubTab === 'kata_kunci'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Kata Kunci Pengawasan & Filter ({keywords.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: STREAM NOTIFIKASI MASUK */}
      {activeSubTab === 'semua' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari kata kunci pesan, pengirim, atau aplikasi..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedChild}
                onChange={(e) => {
                  setSelectedChild(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Anak</option>
                <option value="Rayhan">Rayhan (Xiaomi Redmi 10)</option>
                <option value="Nadia">Nadia (Tablet Samsung Tab A8)</option>
              </select>

              <select
                value={selectedApp}
                onChange={(e) => {
                  setSelectedApp(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Aplikasi</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Pesan SMS">Pesan SMS</option>
                <option value="Instagram">Instagram</option>
                <option value="YouTube Kids">YouTube Kids</option>
                <option value="Free Fire MAX">Free Fire MAX</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Status</option>
                <option value="unread">Belum Dibaca</option>
                <option value="flagged">Peringatan Sensitif</option>
                <option value="starred">Berbintang</option>
              </select>
            </div>
          </div>

          {/* Notification List Feed */}
          {loading ? (
            <div className="bg-white dark:bg-slate-800/80 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-xs font-normal text-slate-400">Memuat riwayat notifikasi anak...</p>
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/80 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <Bell className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Tidak ada notifikasi yang cocok dengan filter pencarian.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2.5">
                {paginatedNotifs.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      setViewingNotif(notif);
                      if (!notif.isRead) handleMarkAsRead(notif.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      !notif.isRead
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Star Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(notif.id, e)}
                          className="mt-0.5 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          <Star className={`w-4 h-4 ${notif.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>

                        {/* Content details */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getAppBadge(notif.appName)}

                            <span className="text-xs font-medium text-slate-900 dark:text-white">
                              {notif.senderOrTitle}
                            </span>

                            <span className="text-[11px] text-slate-400 font-normal">
                              untuk <span className="font-medium text-slate-700 dark:text-slate-300">{notif.childName}</span> ({notif.deviceName})
                            </span>

                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Belum dibaca"></span>
                            )}
                          </div>

                          {/* Message body */}
                          <p className="text-xs font-normal text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {notif.content}
                          </p>

                          {/* Sensitive Flag Warning Badge if any */}
                          {notif.isFlagged && (
                            <div className="pt-1 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{notif.flagReason}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp & Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 font-normal whitespace-nowrap">
                          {notif.timestamp}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotif(notif.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Hapus notifikasi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Responsive Pagination for Notifications */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalNotifPages}
                  totalItems={filteredNotifs.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  pageSizeOptions={[5, 10, 15, 20]}
                  itemLabel="notifikasi"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: KATA KUNCI PENGAWASAN */}
      {activeSubTab === 'kata_kunci' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                  Daftar Kata Kunci Pengawasan Sensitif
                </h3>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  Jika notifikasi pesan di HP anak memuat frasa ini, sistem akan langsung menandainya dan mengirimkan peringatan darurat orang tua.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddKeywordModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kata Kunci</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {keywords.map(kw => (
                <div
                  key={kw.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-900 dark:text-white">
                        "{kw.word}"
                      </span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-medium ${
                        kw.level === 'danger'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}>
                        {kw.level === 'danger' ? 'Bahaya Tinggi' : 'Waspada'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Kategori: {kw.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteKeyword(kw.id, kw.word)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                    title="Hapus kata kunci"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL DETAIL NOTIFIKASI */}
      {/* =============================================================== */}
      {viewingNotif && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    Detail Notifikasi Diteruskan
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Penerusan riil dari aplikasi anak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingNotif(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info header */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 block font-normal">Perangkat Anak</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {viewingNotif.childName} ({viewingNotif.deviceName})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-normal">Aplikasi Asal</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {viewingNotif.appName} ({viewingNotif.appPackage})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-normal">Pengirim / Judul</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {viewingNotif.senderOrTitle}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-normal">Waktu Diterima</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {viewingNotif.timestamp}
                </span>
              </div>
            </div>

            {/* Flag warning if any */}
            {viewingNotif.isFlagged && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-medium text-rose-900 dark:text-rose-200 block">
                    Peringatan Terdeteksi
                  </span>
                  <p className="text-rose-700 dark:text-rose-300 font-normal mt-0.5">
                    {viewingNotif.flagReason}
                  </p>
                </div>
              </div>
            )}

            {/* Message Body */}
            <div>
              <label className="block text-[11px] font-normal text-slate-400 mb-1">
                Isi Pesan Notifikasi Lengkap:
              </label>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-800 dark:text-slate-200 leading-relaxed">
                {viewingNotif.content}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-normal">
                Status: Sudah dibaca
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingNotif(null)}
                  className="px-4 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL TAMBAH KATA KUNCI PENGAWASAN */}
      {/* =============================================================== */}
      {isAddKeywordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    Tambah Kata Kunci Pengawasan
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Peringatkan orang tua jika ada pesan mengandung kata ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddKeywordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddKeyword} className="space-y-3">
              <div>
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1">
                  Kata Kunci / Frasa Sensitif
                </label>
                <input
                  type="text"
                  value={newKeywordWord}
                  onChange={(e) => setNewKeywordWord(e.target.value)}
                  placeholder="Contoh: transfer pulsa, kirim foto, pin rahasia..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Peringatan
                  </label>
                  <select
                    value={newKeywordLevel}
                    onChange={(e) => setNewKeywordLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="danger">Bahaya Tinggi (Darurat)</option>
                    <option value="warning">Waspada (Peringatan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={newKeywordCategory}
                    onChange={(e) => setNewKeywordCategory(e.target.value)}
                    placeholder="Contoh: Finansial, Privasi"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-white focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddKeywordModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Kata Kunci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
