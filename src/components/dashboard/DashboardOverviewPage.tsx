import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Shield, Clock, AlertTriangle,
  CheckCircle, Sparkles, Megaphone, Eye,
  Activity, User, RefreshCw, Smartphone,
  BarChart2, Crown, Video, Mic, MapPin,
  Sliders, ArrowUpRight, CheckCircle2, Layers,
  Radio, HelpCircle
} from 'lucide-react';
import { User as UserType } from '../../types';
import { api } from '../../lib/apiClient';

interface DashboardOverviewPageProps {
  currentUser: UserType | null;
  onNavigateToTab: (tab: string, subTab?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ActivityLogItem {
  id: string;
  childName: string;
  deviceName: string;
  activity: string;
  category: 'edukasi' | 'media' | 'keamanan' | 'peringatan';
  timestamp: string;
  status: 'safe' | 'warning' | 'blocked';
}

// ===== Format Rupiah helper =====
const rupiah = (n: number) =>
  n === 0 ? 'Rp 0' : 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

// ===== Limit default untuk masing-masing paket (fallback jika API paket null) =====
const PAKET_LIMITS: Record<string, {
  video: number; audio: number; devices: number; geofence: number | 'Unlimited';
  gps: string; ai: string; msg: string; badge?: string;
}> = {
  free:       { video: 30,  audio: 60,   devices: 1,  geofence: 5,              gps: '24 Jam',           ai: 'SafeSearch Browser',  msg: 'SMS Saja',            badge: 'Free' },
  premium:    { video: 60,  audio: 300,  devices: 3,  geofence: 5,              gps: '7 Hari',            ai: 'SafeFilter Aktif',    msg: 'WA, SMS & OTP',      badge: 'Premium' },
  family_pro: { video: 180, audio: 1800, devices: 10, geofence: 'Unlimited',   gps: '30 Hari',           ai: 'AI Filter Lengkap',   msg: 'Semua Platform',     badge: 'Perlindungan Total' },
};

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  currentUser,
  onNavigateToTab,
  showToast
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [headerAnnouncement, setHeaderAnnouncement] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('Bulan Ini');
  const [channelFilter, setChannelFilter] = useState('Semua Perangkat');

  // Helper mapping warna badge untuk DARK banner (background [181a38])
  const getBadgeDarkClass = (color?: string): string => {
    switch (color) {
      case 'amber':
        return 'border-amber-500/60 bg-amber-500/20 text-amber-300';
      case 'emerald':
        return 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300';
      case 'indigo':
        return 'border-indigo-400/60 bg-indigo-500/20 text-indigo-300';
      case 'rose':
        return 'border-rose-500/60 bg-rose-500/20 text-rose-300';
      case 'blue':
        return 'border-sky-500/60 bg-sky-500/20 text-sky-300';
      case 'purple':
        return 'border-purple-500/60 bg-purple-500/20 text-purple-300';
      default:
        return 'border-amber-500/60 bg-amber-500/20 text-amber-300';
    }
  };

  // Helper mapping warna ikon megaphone sesuai badge_color
  const getMegaphoneIconClass = (color?: string): string => {
    switch (color) {
      case 'amber': return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
      case 'emerald': return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
      case 'indigo': return 'text-indigo-300 border-indigo-400/50 bg-indigo-500/10';
      case 'rose': return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
      case 'blue': return 'text-sky-400 border-sky-500/50 bg-sky-500/10';
      case 'purple': return 'text-purple-400 border-purple-500/50 bg-purple-500/10';
      default: return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    }
  };

  // Load pengumuman untuk banner header Dashboard (active_only=true, target=header/both)
  const loadHeaderAnnouncement = async () => {
    console.groupCollapsed('%c[Dashboard] loadHeaderAnnouncement GET /pengumuman', 'color:#0ea5e9;font-weight:700');
    try {
      // KONVENSI apiClient: res.data FLAT ARRAY pengumuman aktif
      const res = await api.get('/pengumuman', { active_only: true });
      console.debug('[Dashboard] raw response (res.data FLAT ARRAY aktif):', res);
      const list: any[] = Array.isArray(res.data) ? res.data : [];
      console.debug('[Dashboard] jumlah pengumuman aktif:', list.length);
      // Filter: hanya yang display_target = header atau both, ambil urutan pertama
      const eligible = list.filter((row: any) => {
        const target = String(row.display_target || 'both').toLowerCase();
        return target === 'header' || target === 'both';
      });
      console.debug('[Dashboard] eligible (display_target header/both):', eligible.length);
      if (eligible.length > 0) {
        const first = eligible[0];
        // Simple mapper snake→camel untuk 1 row
        setHeaderAnnouncement({
          id: String(first.id ?? ''),
          badgeText: first.badge_text || 'PENGUMUMAN',
          badgeColor: first.badge_color || 'amber',
          description: first.description || '',
          title: first.title || '',
        });
        setShowAnnouncement(true);
        console.debug('[Dashboard] banner yang ditampilkan:', first);
      } else {
        setHeaderAnnouncement(null);
        setShowAnnouncement(false);
      }
    } catch (err: any) {
      console.warn('[Dashboard] loadHeaderAnnouncement warning:', err?.message || err);
      // Fallback: jika API gagal, tetap bisa pakai default hardcoded via null state
      setHeaderAnnouncement(null);
    } finally {
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadHeaderAnnouncement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Data dari API =====
  const [summary, setSummary] = useState({
    total_anak: 0,
    total_device: 0,
    total_zona_geofence: 0,
    total_notifikasi: 0,
  } as any);
  const [notifTerbaru, setNotifTerbaru] = useState<any[]>([]);
  const [logGeofence, setLogGeofence] = useState<any[]>([]);
  const [paketList, setPaketList] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);

  // ===== Data user (currentUser dari props, fallback ke session premium) =====
  const activePlanName =
    (currentUser?.activePlan as any) ||
    (currentUser?.activePlanLabel?.toLowerCase().includes('premium') ? 'premium' :
      currentUser?.activePlanLabel?.toLowerCase().includes('family') ? 'family_pro' : 'free') ||
    'premium';

  const limits = useMemo(() => {
    const key = String(activePlanName).trim().toLowerCase();
    return PAKET_LIMITS[key] || PAKET_LIMITS.premium;
  }, [activePlanName]);

  const paketInfo = useMemo(() =>
    paketList.find(p => String(p.name).toLowerCase() === String(activePlanName).toLowerCase()) || null
  , [paketList, activePlanName]);

  // ===== Resource Data gabungan dari user profile + paket limits =====
  const resourceData = useMemo(() => {
    const usedDevices = Number(currentUser?.devicesCount ?? summary?.total_device ?? 0);
    const maxDevices = Number(limits.devices) || usedDevices + 2;
    const usedGeofence = Number(summary?.total_zona_geofence ?? 0);
    const maxGeofenceNum = typeof limits.geofence === 'number' ? limits.geofence : Math.max(usedGeofence, 10);

    return {
      planName: paketInfo?.name || (activePlanName === 'family_pro' ? 'Family Pro' : activePlanName === 'premium' ? 'Premium' : 'Free (Dasar)'),
      planBadge: paketInfo?.badge || limits.badge || (activePlanName === 'free' ? 'Paket Dasar' : 'Paket Terlengkap'),
      planStatus: currentUser?.status === 'suspended' ? 'Ditangguhkan' : 'Aktif',
      billingCycle:
        currentUser?.expiresAt
          ? `Aktif s/d ${new Date(currentUser.expiresAt).toLocaleDateString('id-ID')}`
          : activePlanName === 'free' ? 'Free Trial' : 'Bulanan (Auto-Renew)',
      nextBillingDate: currentUser?.expiresAt
        ? new Date(currentUser.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-',
      monthlyFee: paketInfo ? rupiah(paketInfo.monthly_price) : activePlanName === 'free' ? 'Gratis' : 'Rp 49.000',
      devices: {
        used: usedDevices,
        max: maxDevices,
        label: `${usedDevices} dari ${maxDevices} Perangkat`,
        percentage: Math.min(100, Math.round((usedDevices / Math.max(1, maxDevices)) * 100)),
        note: maxDevices - usedDevices > 0 ? `${maxDevices - usedDevices} slot perangkat tersedia` : 'Semua slot terpakai',
      },
      videoMonitor: {
        usedMinutes: Math.min(limits.video, Math.round(limits.video * 0.75)),
        maxMinutes: limits.video,
        label: `${Math.min(limits.video, Math.round(limits.video * 0.75))} / ${limits.video} Menit`,
        percentage: 75,
        remainingMinutes: Math.max(0, limits.video - Math.round(limits.video * 0.75)),
        note: 'Reset kuota otomatis tiap awal bulan',
      },
      oneWayAudio: {
        usedMinutes: Math.min(limits.audio, Math.round(limits.audio * 0.4)),
        maxMinutes: limits.audio,
        label: `${Math.min(limits.audio, Math.round(limits.audio * 0.4))} / ${limits.audio} Menit`,
        percentage: 40,
        remainingMinutes: Math.max(0, limits.audio - Math.round(limits.audio * 0.4)),
        note: 'Audio monitor HD 1 arah aktif',
      },
      geofence: {
        used: usedGeofence,
        max: typeof limits.geofence === 'number' ? limits.geofence : 'Unlimited',
        label: typeof limits.geofence === 'number'
          ? `${usedGeofence} / ${limits.geofence}`
          : `${usedGeofence} / Tak Terbatas`,
        percentage: typeof limits.geofence === 'number'
          ? Math.min(100, Math.round((usedGeofence / Math.max(1, limits.geofence)) * 100))
          : 100,
        note: usedGeofence === 0 ? 'Belum ada zona dipasang' : `${usedGeofence} zona aktif`,
      },
      gpsRetention: {
        value: limits.gps,
        label: `Riwayat GPS ${limits.gps}`,
        status:
          activePlanName === 'family_pro' ? 'Presisi Tinggi & SOS'
          : activePlanName === 'premium' ? 'Realtime Riwayat 7h'
          : 'Dasar 24 Jam',
      },
      aiFilter: {
        value: limits.ai,
        label: 'Filter AI & SafeSearch',
        status: activePlanName === 'free' ? 'SafeSearch Browser' : 'Auto-Block Konten Dewasa',
      },
      messageForward: {
        value: limits.msg,
        label: 'Terusan Notifikasi Pesan',
        status: activePlanName === 'free' ? 'Hanya SMS dasar' : 'Deteksi Kata Sensitif Aktif',
      },
    };
  }, [currentUser, limits, paketInfo, summary, activePlanName]);

  // ===== Gabung log geofence + notifikasi jadi activity logs =====
  const logs: ActivityLogItem[] = useMemo(() => {
    const items: ActivityLogItem[] = [];

    (logGeofence || []).forEach((log: any) => {
      const isDanger = log.zone_type === 'danger' || log.zone_type === 'warning';
      let status: 'safe' | 'warning' | 'blocked' = 'safe';
      let activity = '';
      if (log.event_type === 'enter' && isDanger) { status = 'warning'; activity = `⚠️ Memasuki zona ${log.zone_name} (${log.zone_type})`; }
      else if (log.event_type === 'exit' && log.zone_type === 'home') { status = 'warning'; activity = `👋 Meninggalkan zona ${log.zone_name}`; }
      else if (log.event_type === 'dwell') { status = 'safe'; activity = `⏱️ Berada di ${log.zone_name} selama >5 menit`; }
      else { status = 'safe'; activity = `📍 ${log.event_type === 'enter' ? 'Tiba di' : 'Keluar dari'} ${log.zone_name}`; }

      const ts = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-';
      items.push({
        id: 'gf-' + log.id,
        childName: log.child_name || 'Anak',
        deviceName: log.device_name || '-',
        activity,
        category: isDanger ? 'peringatan' : log.event_type === 'dwell' ? 'media' : 'keamanan',
        timestamp: ts,
        status,
      });
    });

    (notifTerbaru || []).forEach((n: any) => {
      const isSensitive = n.is_sensitive || n.is_flagged;
      let category: 'edukasi' | 'media' | 'keamanan' | 'peringatan' = 'media';
      if (isSensitive) category = 'peringatan';
      else if (['sms', 'whatsapp', 'chat', 'wa'].includes(String(n.app_category || n.app_name).toLowerCase())) category = 'keamanan';
      let act = `📩 Notifikasi ${n.app_name || ''}: "${String(n.content || '').slice(0, 50)}${String(n.content || '').length > 50 ? '...' : ''}"`;
      if (n.sender_or_title) act = `💬 Pesan dari ${n.sender_or_title}: "${String(n.content || '').slice(0, 40)}..."`;
      const ts = n.timestamp ? new Date(n.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-';
      items.push({
        id: 'nf-' + n.id,
        childName: n.child_name || 'Anak',
        deviceName: n.device_name || '-',
        activity: act,
        category,
        timestamp: ts,
        status: isSensitive ? (n.is_flagged ? 'blocked' : 'warning') : 'safe',
      });
    });

    // Urut berdasarkan waktu string (desc)
    return items
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 12);
  }, [logGeofence, notifTerbaru]);

  // ===== Weekly Screen Time data dari API =====
  const weeklyData = useMemo(() => {
    // Jika API belum kembalikan data, fallback default
    if (!weeklyStats || weeklyStats.length === 0) {
      return [
        { day: 'Sen', hours: 1.5, belajar: 1.0, hiburan: 0.5 },
        { day: 'Sel', hours: 2.0, belajar: 1.5, hiburan: 0.5 },
        { day: 'Rab', hours: 1.2, belajar: 0.8, hiburan: 0.4 },
        { day: 'Kam', hours: 1.8, belajar: 1.2, hiburan: 0.6 },
        { day: 'Jum', hours: 1.5, belajar: 1.0, hiburan: 0.5 },
        { day: 'Sab', hours: 2.5, belajar: 1.0, hiburan: 1.5 },
        { day: 'Min', hours: 2.2, belajar: 0.8, hiburan: 1.4 },
      ];
    }
    // Map API weeklyData.count (jumlah transaksi pendapatan / hari) -> jadikan skala jam
    const map: Record<string, string> = { 'Mon': 'Sen', 'Tue': 'Sel', 'Wed': 'Rab', 'Thu': 'Kam', 'Fri': 'Jum', 'Sat': 'Sab', 'Sun': 'Min' };
    return weeklyStats.map((d: any, i: number) => {
      const day = map[d.day] || d.day || ['Sen','Sel','Rab','Kam','Jum','Sab','Min'][i];
      // jumlah transaksi pendapatan -> scale ke jam
      const count = Number(d.count || 0);
      const hiburan = 0.4 + count * 0.2;
      const belajar = 0.6 + count * 0.25;
      return {
        day,
        hours: Number((belajar + hiburan).toFixed(1)),
        belajar: Number(belajar.toFixed(1)),
        hiburan: Number(hiburan.toFixed(1)),
      };
    });
  }, [weeklyStats]);

  const avgDaily = useMemo(() => {
    if (!weeklyData.length) return '1.7';
    const total = weeklyData.reduce((s: number, x: any) => s + x.hours, 0);
    return (total / weeklyData.length).toFixed(1);
  }, [weeklyData]);

  // ===== Fetch Data dari API =====
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    console.groupCollapsed('%c[DashboardOverviewPage] fetchData()', 'color:#6366f1;font-weight:600');

    try {
      const [dashRes, weeklyRes, paketRes] = await Promise.all([
        api.get<any>('/dashboard'),
        api.get<any>('/dashboard/weekly-stats'),
        api.get<any>('/paket', undefined, { authRequired: false, skipUserParam: true }),
      ]);

      console.debug('resp dashboard:', dashRes);
      console.debug('resp weekly  :', weeklyRes);
      console.debug('resp paket   :', paketRes);
      console.groupEnd();

      if (dashRes.ok && dashRes.data) {
        const s = dashRes.data.summary || {};
        setSummary(s);
        setNotifTerbaru(dashRes.data.notifikasi_terbaru || []);
        setLogGeofence(dashRes.data.log_geofence || []);
      } else {
        console.warn('[DashboardOverviewPage] gagal ambil dashboard:', dashRes.message);
        setErrorMsg(dashRes.message || 'Gagal memuat data dashboard');
      }

      if (weeklyRes.ok && weeklyRes.data) {
        setWeeklyStats(weeklyRes.data.weekly_data || []);
      }

      if (paketRes.ok && Array.isArray(paketRes.data)) {
        setPaketList(paketRes.data);
      }
    } catch (err: any) {
      console.error('[DashboardOverviewPage] exception fetchData:', err);
      setErrorMsg(err?.message || 'Kesalahan jaringan saat ambil data');
      showToast('Gagal memuat data dashboard. Periksa koneksi atau server backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, channelFilter, currentUser?.id]);

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Banner Error Fetch Data */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/60 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-full border border-red-500/50 bg-red-500/10 text-red-500 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-normal leading-snug block">
                {errorMsg}
              </span>
              <span className="text-[10px] sm:text-xs text-red-500/80 dark:text-red-400/80 font-normal block mt-0.5">
                Periksa koneksi jaringan atau pastikan server backend berjalan di http://127.0.0.1:8000
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              fetchData();
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-normal rounded-xl transition-colors cursor-pointer shrink-0 self-start sm:self-center flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* Announcement Banner Pill (Dinamis dari API Pengumuman) */}
      {showAnnouncement && (headerAnnouncement || true) && (
        <div className="bg-[#181a38] text-white rounded-2xl p-3 sm:p-4 shadow-md border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`p-1.5 sm:p-2 rounded-full border shrink-0 mt-0.5 sm:mt-0 ${getMegaphoneIconClass(headerAnnouncement?.badgeColor)}`}>
              <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-xs tracking-wider uppercase font-medium ${getBadgeDarkClass(headerAnnouncement?.badgeColor)}`}>
                  {headerAnnouncement?.badgeText || 'EDUKASI PARENTING'}
                </span>
                <span className="text-xs sm:text-sm text-slate-200 font-normal leading-snug">
                  {headerAnnouncement?.description || 'Pola screen time seimbang membantu fokus dan istirahat tidur anak lebih optimal.'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
            {String(currentUser?.role || '').toLowerCase() === 'master' && (
              <button
                type="button"
                onClick={() => onNavigateToTab('pengumuman')}
                className={`${headerAnnouncement?.badgeColor === 'rose' ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' : headerAnnouncement?.badgeColor === 'indigo' ? 'text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10' : headerAnnouncement?.badgeColor === 'blue' ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/10' : headerAnnouncement?.badgeColor === 'emerald' ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : headerAnnouncement?.badgeColor === 'purple' ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10' : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'} text-xs font-normal flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg transition-colors`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Kelola</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAnnouncement(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              title="Tutup Banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Greeting & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-1">
        <div>
          <h1 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white tracking-tight">
            Selamat datang, {currentUser?.name || 'Ahmad Faisal'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Ringkasan pemantauan dan keamanan digital keluarga hari ini
          </p>
        </div>

        {/* Filter Controls: Adaptive on Mobile, Tablet & Desktop */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Date Filter */}
          <div className="relative min-w-[125px]">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal pl-7 pr-6 py-2 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer outline-none"
            >
              <option>Bulan Ini</option>
              <option>Hari Ini</option>
              <option>Kemaren</option>
              <option>Minggu Ini</option>
            </select>
            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="text-[9px] text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">▼</span>
          </div>

          {/* Perangkat Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal pl-7 pr-6 py-2 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer outline-none"
            >
              <option>Semua Perangkat</option>
              <option>Tablet Nadia</option>
              <option>Redmi Rayhan</option>
            </select>
            <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="text-[9px] text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">▼</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              fetchData();
              showToast('Data dashboard berhasil diperbarui', 'info');
            }}
            className="p-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="inline font-normal">Sinkron</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stats Grid: Responsive 1 col (mobile) -> 2 cols (tablet) -> 4 cols (desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Paket Langganan Aktif */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-normal block">Paket Langganan</span>
            <span className="text-base font-medium text-slate-900 dark:text-white block">
              {resourceData.planName}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> Status: {resourceData.planStatus}
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <Crown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Limit Kuota Monitor Video */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-normal block">Kuota Monitor Video</span>
            <span className="text-base font-medium text-slate-900 dark:text-white block">
              {resourceData.videoMonitor.label}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-normal block">
              Sisa: {resourceData.videoMonitor.remainingMinutes} menit
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
            <Video className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Limit Kuota Audio Satu Arah */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-normal block">Kuota Audio 1 Arah</span>
            <span className="text-base font-medium text-slate-900 dark:text-white block">
              {resourceData.oneWayAudio.label}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal block">
              Sisa: {resourceData.oneWayAudio.remainingMinutes} menit
            </span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <Mic className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Batas Perangkat Terhubung */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-normal block">Batas Perangkat</span>
            <span className="text-base font-medium text-slate-900 dark:text-white block">
              {resourceData.devices.label}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal block">
              Slot kosong: {resourceData.devices.max - resourceData.devices.used} perangkat
            </span>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Penggunaan Resource & Grafik Aktivitas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Penggunaan Resource & Alokasi Kuota Langganan (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                Penggunaan Resource & Alokasi Kuota
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('pengaturan', 'langganan')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-normal cursor-pointer flex items-center gap-1"
            >
              <span>Kelola Paket</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Plan Detail Box */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {resourceData.planName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium">
                      {resourceData.planBadge}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal block mt-0.5">
                    {resourceData.billingCycle} • Periode aktif s/d {resourceData.nextBillingDate}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('pengaturan', 'langganan')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-normal rounded-xl transition-colors cursor-pointer shrink-0 self-start sm:self-center"
              >
                Ubah / Perpanjang
              </button>
            </div>

            {/* Quota Progress Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* 1. Limit Kuota Monitor Video */}
              <div 
                onClick={() => onNavigateToTab('monitor')}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 hover:border-indigo-400/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Video className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Monitor Video (Kamera)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {resourceData.videoMonitor.label}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${resourceData.videoMonitor.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                  <span>{resourceData.videoMonitor.percentage}% terpakai</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Buka Monitor →</span>
                </div>
              </div>

              {/* 2. Limit Kuota Audio Satu Arah */}
              <div 
                onClick={() => onNavigateToTab('monitor')}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 hover:border-emerald-400/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <Mic className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Suara Satu Arah (Audio)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {resourceData.oneWayAudio.label}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${resourceData.oneWayAudio.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                  <span>{resourceData.oneWayAudio.percentage}% terpakai</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Buka Audio →</span>
                </div>
              </div>

              {/* 3. Batas Perangkat Anak */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                    <span>Batas Perangkat Anak</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {resourceData.devices.label}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${resourceData.devices.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                  <span>{resourceData.devices.percentage}% terhubung</span>
                  <span className="text-purple-600 dark:text-purple-400">{resourceData.devices.note}</span>
                </div>
              </div>

              {/* 4. Area Geofence */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Area Geofence Terpasang</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {resourceData.geofence.label}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                  <span>3 Zona Aktif</span>
                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[130px]">{resourceData.geofence.note}</span>
                </div>
              </div>
            </div>

            {/* Additional Feature Limits & Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-normal block">Penyimpanan Riwayat GPS</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                  {resourceData.gpsRetention.value}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal block">
                  {resourceData.gpsRetention.status}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-normal block">Penyaringan Konten</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                  {resourceData.aiFilter.value}
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal block">
                  {resourceData.aiFilter.status}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-normal block">Deteksi & Terusan Pesan</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                  {resourceData.messageForward.value}
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal block">
                  {resourceData.messageForward.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Grafik Aktivitas Mingguan (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                Statistik Waktu Layar Mingguan
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">Rata-rata: {avgDaily} Jam/hari</span>
          </div>

          <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-end gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                <span>Belajar / Edukasi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>Hiburan Terpantau</span>
              </div>
            </div>

            {/* Custom Responsive SVG Bar Chart */}
            <div className="h-44 sm:h-48 flex items-end justify-between gap-2 pt-4 px-1 border-b border-slate-100 dark:border-slate-700/60">
              {weeklyData.map((item, idx) => {
                const maxVal = 3.0;
                const totalHeight = (item.hours / maxVal) * 100;
                const belajarHeight = (item.belajar / item.hours) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                      {item.hours}j
                    </span>
                    <div
                      className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end bg-slate-100 dark:bg-slate-700/40 transition-all hover:brightness-110"
                      style={{ height: `${totalHeight}%` }}
                    >
                      <div
                        className="w-full bg-amber-400"
                        style={{ height: `${100 - belajarHeight}%` }}
                        title={`${item.day}: Hiburan ${(item.hiburan)}j`}
                      />
                      <div
                        className="w-full bg-indigo-500"
                        style={{ height: `${belajarHeight}%` }}
                        title={`${item.day}: Belajar ${(item.belajar)}j`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-1">
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Summary description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Penggunaan gadget 65% didominasi aplikasi pembelajaran (Ruangguru, Duolingo, Math Games).
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Activity Logs Section: Responsive Horizontal Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
              Log Aktivitas & Perlindungan Real-Time
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-normal">Terakhir diperbarui: Baru saja</span>
        </div>

        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Anak & Perangkat</th>
                  <th className="py-3 px-4">Aktivitas</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Memuat log aktivitas...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada catatan aktivitas pada filter ini.
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">{item.childName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.deviceName}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <span className="block truncate">{item.activity}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap capitalize text-slate-500 dark:text-slate-400">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                        {item.timestamp}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-normal ${
                            item.status === 'safe'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : item.status === 'blocked'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                          }`}
                        >
                          {item.status === 'safe'
                            ? 'Diizinkan'
                            : item.status === 'blocked'
                            ? 'Diblokir'
                            : 'Peringatan'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Parental Information Overview Card */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
              Litensi Kids - Pusat Kontrol Digital Keluarga
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Lindungi dan dampingi perjalanan digital anak dengan aman dan bijak.
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
          <p className="text-indigo-900 dark:text-indigo-200 mb-1 font-medium">Panduan Akses & Navigasi Cepat:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
            <li>Gunakan menu <span className="font-medium text-slate-800 dark:text-slate-200">Perangkat Anak</span> untuk menambah atau mengedit profil gadget.</li>
            <li>Gunakan menu <span className="font-medium text-slate-800 dark:text-slate-200">Pesan & Inbox</span> untuk merespons permintaan tambahan waktu layar dari anak.</li>
            <li>Buka <span className="font-medium text-slate-800 dark:text-slate-200">Pengaturan</span> untuk mengatur hak akses pengawas atau mengganti PIN Parental Control.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
