import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Shield, Clock, AlertTriangle,
  CheckCircle, Sparkles, Megaphone, Eye,
  Activity, User, RefreshCw, Smartphone,
  BarChart2, Crown, Video, Mic, MapPin,
  Sliders, ArrowUpRight, CheckCircle2, Layers,
  Radio, HelpCircle, Camera, Navigation
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

// ⚠️ ZERO TOLERANCE HARDCODE FALLBACK — SUDAH DIHAPUS SESUAI ATURAN PERMANEN!
// Dihapus: PAKET_LIMITS yang sebelumnya hardcode free video30/audio60 dst.
// SEKARANG BATAS PAKET 100% diambil DARI DB SERVER via paketInfo.batas_menit_av_harian (1 kolam AV gabungan).
// Jika paket = null / batas undefined → fallback JUJUR 0 (bukan hardcode Premium 60 / FP 240).

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
    total_perangkat_online: 0,
    total_zona_geofence: 0,
    total_notifikasi: 0,
    total_notifikasi_unread: 0,
    video_used_minutes: 0,
    audio_used_minutes: 0,
    video_max_minutes: 0,
    audio_max_minutes: 0,
    fetched_at: '',
  } as any);
  const [notifTerbaru, setNotifTerbaru] = useState<any[]>([]);
  const [logGeofence, setLogGeofence] = useState<any[]>([]);
  const [paketList, setPaketList] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [weeklyMeta, setWeeklyMeta] = useState<any>(null);
  const [daftarPerangkat, setDaftarPerangkat] = useState<any[]>([]);

  // ===== Data user (currentUser dari props) =====
  const activePlanName =
    (currentUser?.activePlan as any) ||
    (currentUser?.activePlanLabel?.toLowerCase().includes('premium') ? 'premium' :
      currentUser?.activePlanLabel?.toLowerCase().includes('family') ? 'family_pro' : 'free') ||
    'free';

  // ⚠️ ZERO HARDCODE ID: Cari paket berdasarkan nama/slug cocok dengan activePlanName.
  // TIDAK ADA hardcode ID = 1/2/3. Jika tidak ketemu → null (fallback jujur paket = {}).
  const paketInfo = useMemo(() => {
    if (!Array.isArray(paketList) || paketList.length === 0) return null;
    const norm = (s: any) => String(s ?? '').toLowerCase().trim();
    const target = norm(activePlanName);
    const targetAlt = target.split('_')[0]; // family_pro → 'family'
    // Prioritas pencocokan: 1) slug exact 2) name contains 3) slug contains
    const exactSlug = paketList.find(p => norm(p.slug) === target);
    if (exactSlug) return exactSlug;
    const nameMatch = paketList.find(p =>
      norm(p.name).includes(target) || norm(p.name).includes(targetAlt));
    if (nameMatch) return nameMatch;
    const slugMatch = paketList.find(p =>
      norm(p.slug).includes(target) || norm(p.slug).includes(targetAlt));
    if (slugMatch) return slugMatch;
    return null;
  }, [paketList, activePlanName]);

  // ⚠️ ZERO HARDCODE FALLBACK: Ambil LIMIT 100% dari paketInfo (DB server flat fields).
  // TIDAK ADA default hardcode lagi. Jika field tidak ada di paket → JUJUR nilai 0 / string kosong.
  const paketLimits = useMemo(() => {
    const pi = paketInfo || ({} as any);
    // Fields flat dari DB paket_langganan kolom yang ada
    const maxDevices = Number(pi.max_children_devices ?? pi.max_children ?? 0);
    const geofenceMaxRaw = pi.max_geofences ?? 0;
    const maxGeofences: number | 'Unlimited' =
      String(geofenceMaxRaw).toLowerCase() === 'unlimited'
        ? 'Unlimited'
        : Number(geofenceMaxRaw) > 0
          ? Number(geofenceMaxRaw)
          : 0;
    // GPS retention label dari kolom location_tracking_label atau location_tracking
    const gpsRetention =
      String(pi.location_tracking_label ?? pi.location_tracking ?? '');
    // AI Filter = app_restriction_label atau app_restriction
    const aiFilter =
      String(pi.app_restriction_label ?? pi.app_restriction ?? '');
    // Message forward = read_message_notifications_label atau (true/false string)
    const msgForward =
      String(pi.read_message_notifications_label ?? (pi.read_message_notifications ? 'Aktif (SMS+Chat)' : 'Tidak Aktif'));
    // BADGE paket dari kolom badge DB
    const badgePaket = String(pi.badge ?? (activePlanName === 'family_pro' ? 'Perlindungan Total' : activePlanName === 'premium' ? 'Premium' : 'Paket Dasar'));

    // PRIORITAS 1 R6: BATAS MENIT AV 1 KOLAM (DIGABUNG = audio + video SAMA KOLAM, TIDAK DIPISAH!)
    // Dari DB kolom paket_langganan.batas_menit_av_harian
    const batasAvMenit = Number(pi.batas_menit_av_harian ?? 0);

    return {
      devices: maxDevices,
      geofence: maxGeofences,
      gps: gpsRetention,
      ai: aiFilter,
      msg: msgForward,
      badge: badgePaket,
      batasMenitAvGabungan: batasAvMenit,
    };
  }, [paketInfo, activePlanName]);

  // Tidak ada state `limits` lagi (sebelumnya pakai PAKET_LIMITS HARDCODE — SUDAH DIHAPUS SESUAI ATURAN ZERO TOLERANCE!)

  // ===== Resource Data gabungan dari user profile + paket DB server + summary API =====
  const resourceData = useMemo(() => {
    // ⚠️ PRIORITAS SOURCE DATA (STALE COUNTER PREVENTION):
    // ① UTAMAKAN summary.total_device (fresh dari DB profil_anak COUNT realtime + auto-sync counter users mismatch)
    // ② Fallback ke currentUser.devicesCount (dari session localStorage — BISA STALE 0 jika manual DB insert)
    // ③ Akhir fallback ke 0 (jika keduanya tidak ada).
    // JANGAN DIBALIK! Dulu: currentUser dulu (nilai 0 stale) → summary.total_device (nilai 1 benar) TIDAK TERPAKAI karena 0??1=0.
    const usedDevices = Number(summary?.total_device ?? currentUser?.devicesCount ?? 0);
    // max devices = BATAS DARI DB (paketLimits.devices). Jika 0 → fallback JUJUR usedDevices (tanpa tambah +2 hardcode!)
    const maxDevices =
      paketLimits.devices > 0 ? paketLimits.devices : Math.max(usedDevices, 1);
    const usedGeofence = Number(summary?.total_zona_geofence ?? 0);
    const maxGeofenceNum =
      typeof paketLimits.geofence === 'number'
        ? paketLimits.geofence
        : Math.max(usedGeofence, 1);

    // ⚠️ PRIORITAS 1 R6: Audio + Video DIGABUNG JADI 1 KOLAM (TIDAK DIPISAH LAGI SESUAI USER KEPUTUSAN!)
    const usedAudio = Number(summary?.audio_used_minutes ?? 0);
    const usedVideo = Number(summary?.video_used_minutes ?? 0);
    const totalDigunakanAv = usedAudio + usedVideo; // 1 kolam gabung!
    // Batas max dari DB paket.batas_menit_av_harian. Jika 0 → unlimited (tampil sebagai -1).
    // ⚠️ R7 FIX SUMMARY MAX GANDA: API summary SEKARANG video_max_minutes & audio_max_minutes KEDUANYA = 1 KOLAM SAMA NILAI (batasGabunganAllAnak).
    // JANGAN di-SUM keduanya (dulu 240+240=480 salah)! Cukup ambil SALAH SATU (karena identik) atau pilih yang lebih besar).
    const batasDariPaket = Number(paketLimits.batasMenitAvGabungan ?? 0);
    const apiBatasGabungan = Math.max(
      Number(summary?.video_max_minutes ?? 0),
      Number(summary?.audio_max_minutes ?? 0),
      Number((summary as any)?._batas_gabungan_all_anak_menit ?? 0)
    );
    const maxGabungan = batasDariPaket > 0 ? batasDariPaket : apiBatasGabungan > 0 ? apiBatasGabungan : 0;
    const avDigunakanMin = maxGabungan > 0 ? Math.min(totalDigunakanAv, maxGabungan) : totalDigunakanAv;
    const avMaxMin = maxGabungan;

    return {
      planName: paketInfo?.name || (activePlanName === 'family_pro' ? 'Family Pro' : activePlanName === 'premium' ? 'Premium' : 'Free (Dasar)'),
      planBadge: paketLimits.badge,
      planStatus: currentUser?.status === 'suspended' ? 'Ditangguhkan' : 'Aktif',
      billingCycle:
        currentUser?.expiresAt
          ? `Aktif s/d ${new Date(currentUser.expiresAt).toLocaleDateString('id-ID')}`
          : activePlanName === 'free' ? 'Free Trial' : 'Bulanan (Auto-Renew)',
      nextBillingDate: currentUser?.expiresAt
        ? new Date(currentUser.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-',
      monthlyFee: paketInfo
        ? rupiah(paketInfo.monthly_price)
        : activePlanName === 'free'
          ? 'Gratis'
          : activePlanName === 'premium'
            ? rupiah(99000)
            : rupiah(199000),
      devices: {
        used: usedDevices,
        max: maxDevices,
        label: `${usedDevices} dari ${maxDevices} Perangkat`,
        percentage: maxDevices > 0 ? Math.min(100, Math.round((usedDevices / maxDevices) * 100)) : 0,
        note: maxDevices - usedDevices > 0
          ? `${maxDevices - usedDevices} slot perangkat tersedia`
          : usedDevices > 0
            ? 'Semua slot perangkat terpakai'
            : 'Belum ada perangkat terdaftar',
      },
      audioVideoGabungan: {
        usedMinutes: avDigunakanMin,
        maxMinutes: avMaxMin, // 0 = unlimited (paket Free = 0 jika paket TIDAK support fitur AV)
        label: avMaxMin > 0
          ? `${avDigunakanMin} / ${avMaxMin} Menit`
          : totalDigunakanAv > 0
            ? `${totalDigunakanAv} Menit (Unlimited)`
            : `0 Menit (Fitur Monitor AV Nonaktif)`,
        percentage: avMaxMin > 0
          ? Math.min(100, Math.round((avDigunakanMin / Math.max(1, avMaxMin)) * 100))
          : 0,
        remainingMinutes: avMaxMin > 0
          ? Math.max(0, avMaxMin - avDigunakanMin)
          : -1, // -1 = unlimited
        breakdownAudio: usedAudio, // Informasi saja (breakdown tidak dipakai perhitungan)
        breakdownVideo: usedVideo,
        note: avMaxMin === 0
          ? (paketInfo?.one_way_audio || paketInfo?.live_camera)
            ? 'Fitur Monitor tersedia (Unlimited kuota / Belum diset batas)'
            : 'Paket saat ini TIDAK MEMILIKI akses Audio & Video Monitor. Upgrade paket.'
          : avDigunakanMin >= avMaxMin
            ? '⚠️ Kuota Monitor Audio+Video HABIS — tidak bisa start sesi baru. Upgrade atau Grant Tambah Waktu.'
            : `Sisa kuota gabungan (Audio+Video 1 kolam): ${Math.max(0, avMaxMin - avDigunakanMin)} menit lagi.`,
      },
      // HAPUS 2 objek terpisah (videoMonitor & oneWayAudio) — sudah digabung jadi audioVideoGabungan!
      geofence: {
        used: usedGeofence,
        max: typeof paketLimits.geofence === 'number' ? paketLimits.geofence : 'Unlimited',
        label: typeof paketLimits.geofence === 'number'
          ? `${usedGeofence} / ${paketLimits.geofence} Area`
          : `${usedGeofence} / Tak Terbatas`,
        percentage: typeof paketLimits.geofence === 'number' && paketLimits.geofence > 0
          ? Math.min(100, Math.round((usedGeofence / paketLimits.geofence) * 100))
          : 100,
        note: usedGeofence === 0
          ? 'Belum ada zona dipasang'
          : `${usedGeofence} zona aktif`,
      },
      gpsRetention: {
        value: paketLimits.gps || '-',
        label: paketLimits.gps ? `Riwayat GPS ${paketLimits.gps}` : 'Riwayat GPS',
        status:
          paketLimits.gps && String(paketLimits.gps).toLowerCase().includes('30')
            ? 'Presisi Tinggi & SOS 30 Hari'
            : paketLimits.gps && String(paketLimits.gps).toLowerCase().includes('7')
              ? 'Realtime Riwayat 7 Hari'
              : paketLimits.gps
                ? paketLimits.gps
                : 'Dasar 24 Jam',
      },
      aiFilter: {
        value: paketLimits.ai || '-',
        label: 'Filter AI & SafeSearch',
        status: paketLimits.ai ? String(paketLimits.ai) : 'SafeSearch Browser Dasar',
      },
      messageForward: {
        value: paketLimits.msg || '-',
        label: 'Terusan Notifikasi Pesan',
        status: paketLimits.msg ? String(paketLimits.msg) : 'Hanya SMS dasar',
      },
    };
  }, [currentUser, paketLimits, paketInfo, summary, activePlanName]);

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

  // ===== Weekly Screen Time data dari API (weeklyStats = weekly_data[].belajar_minutes + hiburan_minutes) =====
  // TIDAK ADA FALLBACK DUMMY HARDCODE — jika weeklyStats KOSONG return array KOSONG (tampilkan empty state nanti di UI)
  const weeklyData = useMemo(() => {
    if (!weeklyStats || weeklyStats.length === 0) {
      return [];
    }

    const map: Record<string, string> = { 'Mon': 'Sen', 'Tue': 'Sel', 'Wed': 'Rab', 'Thu': 'Kam', 'Fri': 'Jum', 'Sat': 'Sab', 'Sun': 'Min' };

    return weeklyStats.map((d: any) => {
      const day = map[d.day] || d.day;
      const belajarJam = Number(d.belajar_minutes ?? 0) / 60;
      const hiburanJam = Number(d.hiburan_minutes ?? 0) / 60;
      const totalJam = belajarJam + hiburanJam;
      return {
        day,
        hours: Number(totalJam.toFixed(1)),
        belajar: Number(belajarJam.toFixed(1)),
        hiburan: Number(hiburanJam.toFixed(1)),
      };
    });
  }, [weeklyStats]);

  const avgDaily = useMemo(() => {
    if (weeklyMeta && Number(weeklyMeta.avg_daily_hours) > 0) {
      return String(weeklyMeta.avg_daily_hours);
    }
    if (!weeklyData.length) return '-';
    const total = weeklyData.reduce((s: number, x: any) => s + x.hours, 0);
    return (total / weeklyData.length).toFixed(1);
  }, [weeklyMeta, weeklyData]);

  // ===== Fetch Data dari API =====
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    console.groupCollapsed('%c[DashboardOverviewPage] fetchData()', 'color:#6366f1;font-weight:700');

    try {
      const [dashRes, weeklyRes, paketRes] = await Promise.all([
        api.get<any>('/dashboard'),
        api.get<any>('/dashboard/weekly-stats'),
        api.get<any>('/paket', undefined, { authRequired: false, skipUserParam: true }),
      ]);

      console.debug('resp dashboard (unwrap 1x level):', dashRes);
      console.debug('resp weekly (unwrap 1x level):', weeklyRes);
      console.debug('resp paket (unwrap 1x level):', paketRes);

      if (dashRes.ok && dashRes.data) {
        const s = dashRes.data.summary || {};
        setSummary(s);
        setNotifTerbaru(dashRes.data.notifikasi_terbaru || []);
        setLogGeofence(dashRes.data.log_geofence || []);
        setDaftarPerangkat(Array.isArray(dashRes.data.daftar_perangkat) ? dashRes.data.daftar_perangkat : []);
        console.debug('[DashboardOverviewPage] summary terbaru:', s, 'daftar_perangkat:', dashRes.data.daftar_perangkat?.length ?? 0);
      } else {
        console.warn('[DashboardOverviewPage] gagal ambil dashboard:', dashRes.message);
        setErrorMsg(dashRes.message || 'Gagal memuat data dashboard');
      }

      if (weeklyRes.ok && weeklyRes.data) {
        setWeeklyStats(weeklyRes.data.weekly_data || []);
        setWeeklyMeta({
          avg_daily_hours: weeklyRes.data.avg_daily_hours ?? 0,
          total_minutes_7d: weeklyRes.data.total_minutes_7d ?? 0,
          period_start: weeklyRes.data.period_start ?? '',
          period_end: weeklyRes.data.period_end ?? '',
        });
        console.debug('[DashboardOverviewPage] weekly meta avg_hours:', weeklyRes.data.avg_daily_hours);
      }

      if (paketRes.ok && Array.isArray(paketRes.data)) {
        setPaketList(paketRes.data);
      }
    } catch (err: any) {
      console.error('[DashboardOverviewPage] exception fetchData:', err);
      setErrorMsg(err?.message || 'Kesalahan jaringan saat ambil data');
      showToast('Gagal memuat data dashboard. Periksa koneksi atau server backend.', 'error');
    } finally {
      console.groupEnd();
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, channelFilter, currentUser?.id]);

  // ===== Format timestamp terakhir fetch =====
  const formatFetchedAt = (iso: string): string => {
    if (!iso) return 'Baru saja';
    try {
      const d = new Date(iso);
      return d.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Banner Error Fetch Data — Warna ROSE tetap standard pattern C4 */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-normal">
              Gagal memuat data dashboard: {errorMsg}
            </p>
            <p className="text-[10px] sm:text-xs text-rose-500/80 dark:text-rose-400/80 font-normal mt-1">
              Periksa koneksi jaringan atau pastikan server backend berjalan
            </p>
            <button
              type="button"
              onClick={() => { setErrorMsg(''); fetchData(); }}
              className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-normal rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>↻ Coba Lagi</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner Loading — Warna INDIGO (#6366f1) = DOMAIN DASHBOARD sesuai konvensi C2 */}
      {loading && !errorMsg && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 p-3 rounded-2xl flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-normal">
            Memuat ringkasan dashboard, statistik screen time, dan daftar perangkat dari server...
          </p>
        </div>
      )}

      {/* Announcement Banner Pill (DINAMIS dari API Pengumuman — TIDAK ADA DEFAULT jika data kosong) */}
      {showAnnouncement && headerAnnouncement && (
        <div className="bg-[#181a38] text-white rounded-2xl p-3 sm:p-4 shadow-md border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`p-1.5 sm:p-2 rounded-full border shrink-0 mt-0.5 sm:mt-0 ${getMegaphoneIconClass(headerAnnouncement.badgeColor)}`}>
              <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-xs tracking-wider uppercase font-medium ${getBadgeDarkClass(headerAnnouncement.badgeColor)}`}>
                  {headerAnnouncement.badgeText || 'PENGUMUMAN'}
                </span>
                <span className="text-xs sm:text-sm text-slate-200 font-normal leading-snug">
                  {headerAnnouncement.description || headerAnnouncement.title || ''}
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
            Selamat datang, {currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Pengguna')}
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

          {/* Perangkat Filter — DINAMIS dari API daftar_perangkat, fallback hardcode jika kosong */}
          <div className="relative min-w-[140px]">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal pl-7 pr-6 py-2 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer outline-none"
            >
              <option>Semua Perangkat</option>
              {daftarPerangkat && daftarPerangkat.length > 0 ? (
                daftarPerangkat.map((p: any) => {
                  const label = `${p.device_name || `Perangkat ${p.anak_name || ''}`}${p.is_online ? ' • Online' : ''}${p.battery_level ? ` ${p.battery_level}%` : ''}`;
                  return <option key={'dev-' + p.id} value={label}>{label.trim()}</option>;
                })
              ) : (
                currentUser?.role?.toLowerCase() === 'master' ? null : null
              )}
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

      {/* 4 Summary Stats Grid: Responsive 1 col (mobile) -> 2 cols (tablet) -> 3 cols (desktop - 3 karena AV gabungan, video+audio digabung 1 card) */}
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

        {/* Card 2: BATAS KUOTA MONITOR AUDIO+VIDEO 1 KOLAM (PRIORITAS 1 R6) — gabung Video dan Audio TIDAK DIPISAH LAGI! */}
        <div
          onClick={() => onNavigateToTab('monitor')}
          className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between group cursor-pointer hover:border-indigo-400/50 hover:shadow-sm transition-all">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-normal block">Kuota Monitor Streaming</span>
            <span className="text-base font-medium text-slate-900 dark:text-white block">
              {resourceData.audioVideoGabungan.label}
            </span>
            <span className={`text-xs font-normal block ${
              resourceData.audioVideoGabungan.remainingMinutes === 0
                ? 'text-rose-600 dark:text-rose-400'
                : resourceData.audioVideoGabungan.maxMinutes === 0
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-indigo-600 dark:text-indigo-400'
            }`}>
              {resourceData.audioVideoGabungan.maxMinutes > 0
                ? resourceData.audioVideoGabungan.remainingMinutes === 0
                  ? 'Kuota habis'
                  : `Sisa ${resourceData.audioVideoGabungan.remainingMinutes} menit`
                : resourceData.audioVideoGabungan.remainingMinutes === -1
                  ? 'Unlimited'
                  : 'Butuh upgrade paket'
              }
            </span>
          </div>
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-emerald-50 dark:from-indigo-950/60 dark:to-emerald-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
            <Camera className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Batas Perangkat Terhubung */}
        <div
          onClick={() => onNavigateToTab('anak')}
          className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover:border-purple-400/50 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-all cursor-pointer group"
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-normal block">Batas Perangkat</span>
            <span className="text-base font-medium text-slate-900 dark:text-white block group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
              {resourceData.devices.label}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal block flex items-center gap-1">
              Slot kosong: {Math.max(0, resourceData.devices.max - resourceData.devices.used)} perangkat
              <span className="text-purple-600 dark:text-purple-400 font-medium ml-1">Buka →</span>
            </span>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Batasan Geofence */}
        <div
          onClick={() => onNavigateToTab('geofence')}
          className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover:border-rose-400/50 hover:bg-rose-50/40 dark:hover:bg-rose-950/30 transition-all cursor-pointer group"
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-normal block">Batas Area Geofence</span>
            <span className="text-base font-medium text-slate-900 dark:text-white block group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
              {resourceData.geofence.label}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-normal flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" /> {resourceData.geofence.note}
              <span className="font-medium ml-1">Buka →</span>
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
            <Navigation className="w-5 h-5" />
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

            {/* Quota Progress Cards Grid — 3 cards (AV GABUNGAN, Perangkat, Geofence) — SESUAI PRIORITAS 1 R6: AUDIO+VIDEO 1 KOLAM! */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* 1. KUOTA MONITOR SUARA + LIVE VIDEO 1 KOLAM (Gabung, TIDAK DIPISAH) */}
              <div
                onClick={() => onNavigateToTab('monitor')}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 hover:border-indigo-400/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Live Audio & Camera</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {resourceData.audioVideoGabungan.label}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      resourceData.audioVideoGabungan.maxMinutes === 0
                        ? 'bg-slate-300 dark:bg-slate-600'
                        : resourceData.audioVideoGabungan.percentage >= 100
                          ? 'bg-gradient-to-r from-rose-500 to-red-500'
                          : resourceData.audioVideoGabungan.percentage >= 75
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                    }`}
                    style={{
                      width: `${resourceData.audioVideoGabungan.maxMinutes > 0
                        ? resourceData.audioVideoGabungan.percentage
                        : 0}%`
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                  <span>
                    {resourceData.audioVideoGabungan.maxMinutes > 0
                      ? `${resourceData.audioVideoGabungan.percentage}% terpakai`
                      : 'Belum diset batas'}
                    {' · '}
                    <span className="text-slate-600 dark:text-slate-300">
                      {resourceData.audioVideoGabungan.breakdownAudio + resourceData.audioVideoGabungan.breakdownVideo}m total
                    </span>
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Buka →</span>
                </div>
              </div>

              {/* 2. Batas Perangkat Anak */}
              <div
                onClick={() => onNavigateToTab('anak')}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 hover:border-purple-400/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
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
                  <span className="text-purple-600 dark:text-purple-400 font-medium">Buka →</span>
                </div>
              </div>

              {/* 3. Area Geofence Terpasang */}
              <div
                onClick={() => onNavigateToTab('geofence')}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 hover:border-rose-400/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
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
                    style={{ width: `${resourceData.geofence.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                  <span>{Number(summary.total_zona_geofence ?? 0)} Zona Aktif</span>
                  <span className="text-rose-600 dark:text-rose-400 font-medium">Buka →</span>
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
            {avgDaily !== '-' && (
              <span className="text-[11px] text-slate-400 font-normal">Rata-rata: {avgDaily} Jam/hari</span>
            )}
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

            {/* Custom Responsive SVG Bar Chart — Skala maxVal DINAMIS berdasarkan weekly data, BUKAN fixed 3.0 jam. JIKA TIDAK ADA DATA, tampilkan empty state. */}
            {weeklyData.length === 0 ? (
              <div className="h-44 sm:h-48 flex items-center justify-center px-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 mb-2">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Belum ada data aktivitas mingguan
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal leading-relaxed max-w-sm">
                    Statistik waktu layar akan muncul secara otomatis setelah perangkat anak terhubung dan mengirimkan aktivitas penggunaan selama 7 hari terakhir.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-44 sm:h-48 flex items-end justify-between gap-2 pt-4 px-1 border-b border-slate-100 dark:border-slate-700/60">
                {(() => {
                  const maxRawHours = Math.max(1.0, ...weeklyData.map((x: any) => Number(x.hours ?? 0)));
                  const niceCeil = Math.ceil(maxRawHours * 10) / 10;
                  const buffer = niceCeil * 0.25;
                  const maxVal = Number((Math.max(1.0, niceCeil + buffer)).toFixed(1));
                  return weeklyData.map((item, idx) => {
                    const totalHeight = (Number(item.hours) / maxVal) * 100;
                    const belajarHeight = Number(item.hours) > 0 ? (Number(item.belajar) / Number(item.hours)) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                          {item.hours}j
                        </span>
                        <div
                          className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end bg-slate-100 dark:bg-slate-700/40 transition-all hover:brightness-110"
                          style={{ height: `${Math.min(100, totalHeight)}%` }}
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
                  });
                })()}
              </div>
            )}

            {/* Summary description — DINAMIS berdasarkan weeklyMeta, JIKA NULL hitung langsung dari weeklyData fallback (bukan kalimat generic hardcode) */}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              {(() => {
                if (weeklyMeta && Number(weeklyMeta.total_minutes_7d) > 0) {
                  const totalJam = Math.round(Number(weeklyMeta.total_minutes_7d) / 60);
                  const targetAnak = activePlanName === 'family_pro' ? 14 : activePlanName === 'premium' ? 10 : 5;
                  const ratioTarget = totalJam / Math.max(1, targetAnak * 7);
                  const catatan =
                    ratioTarget <= 0.8 ? 'Di bawah target aman — pola screen time sangat terkontrol.' :
                    ratioTarget <= 1.1 ? 'Seimbang sesuai target pola parenting digital sehat.' :
                    'Melebihi target mingguan — pertimbangkan atur jadwal penggunaan.';
                  return `Total screen time ${totalJam} jam selama 7 hari terakhir (rata-rata ${String(avgDaily)} jam/hari). ${catatan}`;
                }
                const totalFallbackJam = weeklyData.reduce((s: number, x: any) => s + Number(x.hours ?? 0), 0);
                if (totalFallbackJam > 0) {
                  const totalRata2 = (totalFallbackJam / weeklyData.length).toFixed(1);
                  return `Rekap aktivitas 7 hari menunjukkan total ${Number(totalFallbackJam.toFixed(1))} jam penggunaan, rata-rata ${totalRata2} jam setiap hari.`;
                }
                return 'Belum ada data aktivitas mingguan untuk ditampilkan.';
              })()}
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
          <span className="text-xs text-slate-400 font-normal">
            Terakhir diperbarui: {formatFetchedAt(summary.fetched_at || '')}
          </span>
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
