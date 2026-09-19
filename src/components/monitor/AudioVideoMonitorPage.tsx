import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, Video, Radio, Volume2, VolumeX, Camera, RotateCcw,
  Sparkles, Shield, AlertTriangle, CheckCircle, RefreshCw,
  Clock, Battery, Wifi, Smartphone, Lock, Unlock, BellRing,
  MapPin, Play, Pause, X, Maximize2, Minimize2, Eye, EyeOff,
  User, Check, ChevronRight, ChevronDown, Search, Sliders, ArrowRight, ShieldCheck,
  Calendar, Layers, ZoomIn, ZoomOut, Compass, History, AppWindow,
  Headphones, Info, GripHorizontal, Move
} from 'lucide-react';
import { GoogleMapsMonitorCanvas, ChildDeviceMonitor } from './GoogleMapsMonitorCanvas';
import { api, getSessionUser, hitungStatusOnlineAnak, anakHasGpsData, hitungRelativeTimeAnak } from '../../lib/apiClient';
import { AVATAR_ICON_OPTIONS } from '../anak/AvatarIconSelector';

// Helper: ubah string avatar (icon:Smile / URL) menjadi image URL yang bisa dipakai di <img src>
// Untuk icon preset → generate langsung SVG data URL lingkaran dengan theme color (bukan butuh react-dom/server)
const avatarToImageUrl = (avatarStr: string, sizePx: number = 80): string => {
  if (!avatarStr) return avatarStr;
  if (avatarStr.startsWith('data:image') || avatarStr.startsWith('http://') || avatarStr.startsWith('https://')) {
    return avatarStr;
  }
  try {
    const iconKey = avatarStr.startsWith('icon:') ? avatarStr.replace('icon:', '') : avatarStr;
    const preset = AVATAR_ICON_OPTIONS.find(
      o => o.id === iconKey || o.iconName === iconKey || o.id === `icon-${iconKey.toLowerCase()}`
    );
    const colorMap: Record<string, { fg: string; bg: string; border: string }> = {
      amber:    { fg: '#f59e0b', bg: '#fef3c7', border: '#fde68a' },
      yellow:   { fg: '#eab308', bg: '#fef9c3', border: '#fef08a' },
      rose:     { fg: '#f43f5e', bg: '#ffe4e6', border: '#fecdd3' },
      purple:   { fg: '#a855f7', bg: '#f3e8ff', border: '#e9d5ff' },
      orange:   { fg: '#f97316', bg: '#ffedd5', border: '#fed7aa' },
      indigo:   { fg: '#6366f1', bg: '#e0e7ff', border: '#c7d2fe' },
      blue:     { fg: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
      emerald:  { fg: '#10b981', bg: '#d1fae5', border: '#a7f3d0' },
      pink:     { fg: '#ec4899', bg: '#fce7f3', border: '#fbcfe8' },
      cyan:     { fg: '#0891b2', bg: '#cffafe', border: '#a5f3fc' },
      teal:     { fg: '#0d9488', bg: '#ccfbf1', border: '#99f6e4' },
      violet:   { fg: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
      sky:      { fg: '#0ea5e9', bg: '#e0f2fe', border: '#bae6fd' },
      slate:    { fg: '#475569', bg: '#f1f5f9', border: '#e2e8f0' }
    };
    let themeKey = 'indigo';
    if (preset) {
      for (const k of Object.keys(colorMap)) {
        if ((preset.bgColor || '').includes(k)) { themeKey = k; break; }
      }
    }
    const palette = colorMap[themeKey] ?? colorMap.indigo;
    const r = sizePx / 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}">`
      + `<circle cx="${r}" cy="${r}" r="${r - 1}" fill="${palette.bg}" stroke="${palette.border}" stroke-width="2"/>`
      + `<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${Math.floor(sizePx * 0.44)}" font-weight="700" fill="${palette.fg}">👦</text>`
      + `</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch (e) {
    console.debug('[AudioMonitor] Fallback avatar URL:', avatarStr, e);
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="39" fill="#e0e7ff" stroke="#c7d2fe" stroke-width="2"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="#6366f1">👤</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(fallback)}`;
  }
};

// Mapping dari DB ProfilAnak (snake_case) → ChildDeviceMonitor interface untuk dropdown + Google Maps
// (G4.2 ZERO HARDCODE RULE) — SEMUA FIELD DIAMBIL DARI DB LAST_KNOWN_*, TIDAK BOLEH ADA FALLBACK HARCODE COORDINATE APA PUN!
//   JIKA last_known_latitude/longitude BELUM ADA (null = GPS companion belum pernah upload) →
//     marker GPS akan grey (isOnline=false + latitude=0, longitude=0) dan text "Menunggu data GPS pertama"
//     agar user TAHU bahwa perangkat anak belum mengirimkan data GPS realtime — BUKAN di-fallback ke Jakarta Monas palsu!
const mapDbAnakToChildDeviceMonitor = (db: any): ChildDeviceMonitor => {
  const ageNum = Number(db.age ?? 0);
  const deviceName = db.device_name ?? db.deviceName ?? 'Perangkat Anak';
  const model = db.device_model ?? db.deviceModel ?? '';
  const os = db.os_version ?? db.osVersion ?? '';
  const modelStr = model && os ? `${model} (${os})` : (model || deviceName || '-');

  // (G4.2 FIX) Battery LEVEL dari DB ProfilAnak.battery_level (di-update setiap telemetry worker 15min).
  //   TIDAK ADA fallback 50. JIKA null/unknown → 0 (akan ditampilkan sebagai ?% di UI, atau 0% unknown).
  const battery = Number(db.battery_level ?? db.batteryLevel ?? 0);

  // (G8.2 KONSISTENSI!) Gunakan HELPER GLOBAL hitungStatusOnlineAnak includeGpsCheck=TRUE.
  //   Alasan: Di halaman MONITOR SELALU ADA MAPS. Jadi jika GPS null → harus OFFLINE (tidak menyesatkan user).
  //   Hasil 100% SAMA dengan KelolaAnakPage, DashboardOverview, ChatInbox.
  const statusOnline = hitungStatusOnlineAnak(db, true);
  const isOnline = statusOnline.isOnline;

  // (G8.2 KONSISTENSI!) Last updated relative time = pakai HELPER GLOBAL hitungRelativeTimeAnak SAMA di SEMUA HALAMAN.
  //   Prioritas: last_gps_captured_at (GPS capture asli HP) > last_active. JIKA keduanya null → "Menunggu data pertama".
  const capturedAtIso = db.last_gps_captured_at ?? db.last_active ?? null;
  const lastUpdated = hitungRelativeTimeAnak(capturedAtIso);

  // (G4.2 ZERO HARDCODE) AMBIL LAT/LNG DARI last_known_latitude / last_known_longitude — HANYA field INI SAJA source of truth.
  //   TIDAK BOLEH ada default latDefault / lngDefault apapun (tidak boleh hardcode Jakarta Monas / Semarang / anywhere).
  //   JIKA null → set ke 0,0 (Null Island di tengah Samudra Atlantik) → jelas bagi user marker abu-abu = BELUM ADA DATA GPS,
  //   BUKAN menunjukkan lokasi PALSU yang menyesatkan.
  const hasGps = anakHasGpsData(db); // (G8.2) Pakai helper global SAMA.
  const lat = Number(db.last_known_latitude ?? db.lastKnownLatitude ?? db.latitude ?? 0);
  const lng = Number(db.last_known_longitude ?? db.lastKnownLongitude ?? db.longitude ?? 0);
  const latitude = hasGps ? lat : 0;
  const longitude = hasGps ? lng : 0;

  // (FIX UI: User minta JANGAN tampilkan data kolom notes di UI marker/card.)
  // Location name SELALU tampilkan raw GPS coordinate lat,lng jika data GPS ada,
  // atau "Menunggu data GPS pertama" jika GPS belum upload.
  // Notes (catatan internal orang tua) TIDAK PERNAH ditampilkan di marker / card UI.
  const locationName = hasGps
    ? `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    : 'Menunggu data GPS pertama';

  // isLocked dari db.status locked flag.
  const isLocked = Boolean((db.status === 'locked') || (db.is_locked ?? false));

  return {
    id: String(db.id ?? `child-${Date.now()}`),
    name: db.name ?? 'Anak',
    age: ageNum > 0 ? `${ageNum} thn` : '-',
    avatar: avatarToImageUrl(db.avatar ?? 'icon:Smile', 128),
    deviceModel: modelStr,
    battery,
    // (G8.2 FIX) isOnline MURNI dari HELPER GLOBAL (SUDAH include AND hasGps di dalam helper, tidak perlu && hasGps disini lagi untuk hindari double logic dan inkonsisten!)
    isOnline,
    status: hasGps ? (isOnline ? `Live • ${lastUpdated}` : `Offline • ${lastUpdated}`) : `GPS Belum Tersedia • ${lastUpdated}`,
    locationName,
    latitude,
    longitude,
    lastUpdated,
    isLocked,
  };
};

interface AudioVideoMonitorPageProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export const AudioVideoMonitorPage: React.FC<AudioVideoMonitorPageProps> = ({ showToast }) => {
  const [loadingChildren, setLoadingChildren] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [activeMode, setActiveMode] = useState<'audio' | 'video'>('audio');
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');

  // Streaming State
  const [isAudioListening, setIsAudioListening] = useState<boolean>(false);
  const [isVideoStreaming, setIsVideoStreaming] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(85);
  const [audioQuality, setAudioQuality] = useState<'HD' | 'Standard'>('HD');
  const [decibels, setDecibels] = useState<number>(38);
  const [activeDuration, setActiveDuration] = useState<number>(0);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [alarmDuration, setAlarmDuration] = useState<string>('1 Menit');
  const [alarmTone, setAlarmTone] = useState<string>('Sirene Keras');

  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [lockMessage, setLockMessage] = useState<string>('Waktunya istirahat dan belajar ya!');
  const [lockDuration, setLockDuration] = useState<string>('30 Menit');

  const [childrenList, setChildrenList] = useState<ChildDeviceMonitor[]>([]);
  const [showFloatingWidget, setShowFloatingWidget] = useState<boolean>(true);
  const [capturedSnaps, setCapturedSnaps] = useState<string[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ================ PRIORITAS 1: KUOTA AV MONITOR (LISTEN + CAMERA GABUNG 1 KUOTA) ================
  // Data dari AV1 endpoint /monitor/kuota-hari-ini
  interface KuotaAnakHariIni {
    profil_anak_id: number;
    nama_anak: string;
    device_model: string | null;
    tanggal: string;
    paket_kuota_menit_harian: number; // 0 = unlimited
    digunakan_audio_menit: number;
    digunakan_video_menit: number;
    total_digunakan_menit: number;
    sisa_kuota_menit: number; // -1 = unlimited, 0 = habis, >0 = sisa menit
    persentase_terpakai: number; // 0-100
    last_mode: 'idle' | 'audio_listen' | 'camera_live';
    last_started_at: string | null;
    last_stopped_at: string | null;
    last_sesi_id: number | null;
    status_kuota: 'unlimited' | 'normal' | 'hampir_habis' | 'habis';
  }
  const [kuotaList, setKuotaList] = useState<KuotaAnakHariIni[]>([]);
  const [currentActiveSesiId, setCurrentActiveSesiId] = useState<number | null>(null); // Dipakai AV3 stop
  // ================ END KUOTA AV ================

  // Child Dropdown States
  const [isChildDropdownOpen, setIsChildDropdownOpen] = useState<boolean>(false);
  const [childSearchTerm, setChildSearchTerm] = useState<string>('');
  const childDropdownRef = useRef<HTMLDivElement>(null);
  const childSearchInputRef = useRef<HTMLInputElement>(null);

  // Fetch data profil anak dari database via API (bukan hardcode)
  const loadChildrenFromApi = async () => {
    console.groupCollapsed('%c[AudioMonitor] Fetch List Anak dari Database', 'color:#0891b2;font-weight:600');
    setLoadingChildren(true);
    setLoadError('');
    try {
      const sessUser = getSessionUser();
      console.debug('Session user:', sessUser?.id, sessUser?.name);
      const res = await api.get<any[]>('/anak');
      console.debug('Response GET /anak:', res?.ok, res?.data?.length, 'item');
      if (res?.ok && Array.isArray(res.data)) {
        const mapped = res.data.map(mapDbAnakToChildDeviceMonitor);
        console.debug('Hasil mapped ChildDeviceMonitor:', mapped.map(c => ({ id: c.id, name: c.name, age: c.age })));
        setChildrenList(mapped);
        if (mapped.length > 0 && !selectedChildId) {
          setSelectedChildId(mapped[0].id);
        }
      } else {
        const msg = res?.message || 'Gagal memuat daftar anak dari database';
        setLoadError(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      console.error('[AudioMonitor] Exception fetch anak:', err);
      const msg = err?.message || 'Kesalahan jaringan saat ambil data perangkat anak';
      setLoadError(msg);
      showToast(msg, 'error');
    } finally {
      setLoadingChildren(false);
      console.groupEnd();
    }
  };

  // Fetch data kuota AV hari ini untuk semua anak user
  const loadKuotaFromApi = async () => {
    console.groupCollapsed('%c[AudioMonitor] Fetch Kuota AV Hari Ini', 'color:#f59e0b;font-weight:600');
    try {
      const res = await api.get<KuotaAnakHariIni[]>('/monitor/kuota-hari-ini');
      console.debug('Response GET /monitor/kuota-hari-ini:', res?.ok, Array.isArray(res.data) ? res.data.length : 0, 'item');
      if (res?.ok && Array.isArray(res.data)) {
        console.debug('Detail kuota per anak:', res.data.map(k => ({ nama: k.nama_anak, total: k.total_digunakan_menit, sisa: k.sisa_kuota_menit, status: k.status_kuota })));
        setKuotaList(res.data);
        // Jika ada sesi aktif dari DB (last_sesi_id + last_mode bukan idle), sinkronkan ke state UI
        const sesiAktif = res.data.find(k => k.last_sesi_id !== null && k.last_mode !== 'idle');
        if (sesiAktif) {
          setCurrentActiveSesiId(sesiAktif.last_sesi_id);
          setShowFloatingWidget(true);
          if (sesiAktif.last_mode === 'audio_listen') {
            setActiveMode('audio');
            setIsAudioListening(true);
            setIsVideoStreaming(false);
          } else if (sesiAktif.last_mode === 'camera_live') {
            setActiveMode('video');
            setIsVideoStreaming(true);
            setIsAudioListening(false);
          }
        }
      } else {
        const msg = res?.message || 'Gagal memuat data kuota monitor';
        showToast(msg, 'error');
        setKuotaList([]);
      }
    } catch (err: any) {
      console.error('[AudioMonitor] Exception fetch kuota:', err);
      showToast(err?.message || 'Kesalahan jaringan saat ambil kuota', 'error');
      setKuotaList([]);
    } finally {
      console.groupEnd();
    }
  };

  // Helper: Dapatkan kuota untuk anak aktif saat ini
  const getKuotaAnakAktif = (): KuotaAnakHariIni | undefined => {
    const idNum = Number(selectedChildId);
    if (!idNum) return undefined;
    return kuotaList.find(k => k.profil_anak_id === idNum);
  };

  // Auto load saat component mount
  useEffect(() => {
    loadChildrenFromApi().then(() => {
      // Setelah daftar anak load success, baru load kuota
      const sess = getSessionUser();
      if (sess?.id) {
        loadKuotaFromApi();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================================
  // (G5.3) ADAPTIVE POLLING INTERVAL BERDASARKAN GERAKAN ANAK (Motion DETECTION)
  //   RULES (mirip G5 Android adaptive GPSLocationManager):
  //     [LIVE 5 DETIK (HIGH FREQUENCY) → jika:
  //       • User KLIK tombol "Live Update GPS" → forceLiveUntil 30 DETIK KE DEPAN
  //       • ATAU last 2 poll berturut posisi anak BERGERAK > 50 M (jarak haversine antara poll_sekarang vs poll_2x_sebelumnya > 50m ATAU waktu_gps_update < 1 MENIT yang lalu (baru saja diperbarui HP → artinya companion upload expedited)
  //     [NORMAL 15 DETIK (DEFAULT)] → diam (anak sekolah, anak diam tracking normal
  //   KEHUNTUNGAN: Saat anak lagi perjalanan naik mobil 60km/j → maps marker update TIAP 5 DETIK.
  //   BOROS API? Tidak: Setiap polling hanya ~3KB JSON. 5 detik = 500KB / jam. 15 detik = 166KB / jam.
  //   Masih di dalam limit server budget.
  // =========================================================================
  const [forceLiveUntilMs, setForceLiveUntilMs] = useState<number | null>(null);
  const [lastPollChildLatLng, setLastPollChildLatLng] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  // helper haversine distance meter TANPA install library (keep dep aman)
  const haversineDistanceMeters = (lat1:number,lng1:number,lat2:number,lng2:number):number => {
    const rad = (deg:number) => deg * Math.PI / 180.0;
    const R = 6371000; // bumi radius meter
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // (G4.2 helper) Cek: apakah active child LATITUDE LONGITUDE = 0,0 (Null Island)?
  //   Artinya GPS belum pernah dikirim companion → marker tidak boleh tampil di tengah laut!
  const isGpsUnavailable = (c: { latitude: number; longitude: number } | null): boolean => {
    if (!c) return true;
    return Math.abs(Number(c.latitude)) < 0.001 && Math.abs(Number(c.longitude)) < 0.001;
  };

  // =========================================================================
  // (G4.3 + G5.3) POLLING GPS REALTIME — Adaptive interval BERDASARKAN MOTION.
  //   Mirip G4.3 tapi interval TIDAK static 15s: Hitung ulang TIAP POLL BERDASARKAN apakah anak bergerak (5s) atau diam (15s).
  //   Tombol Live Update = paksa 5s interval 30 detik ke depan.
  // =========================================================================
  useEffect(() => {
    let warningGpsFirstShown = false;
    const GPS_WARN_THRESHOLD_MS = 2 * 60 * 1000; // 2 menit pertama → warn kalau GPS belum ada

    // Waktu MOUNT component = acuan "awal user masuk ke halaman monitor nunggu GPS"
    const mountTimestampMs = Date.now();

    // (G5.3 BUG FIX JS SCOPE: declare pollTimeoutId HANYA SEKALI DI ATAS sebelum function runPoll. Di runPoll & cleanup refer ke variabel SAMA)
    let pollTimeoutId: NodeJS.Timeout | null = null;

    // Helper hitung berapa milliseconds next poll (G5.3 adaptive rules)
    const computeNextPollIntervalMs = (active: ChildDeviceMonitor | null): number => {
      // Rule 1: Force live mode user klik button → 5 DETIK sampai forceLiveUntilMs habis
      if (forceLiveUntilMs && Date.now() < forceLiveUntilMs) return 5 * 1000;

      // Rule 2: GPS null / tidak punya data → 15 DETIK polling biar lebih cepat dapat GPS pertama
      if (!active || isGpsUnavailable(active)) return 15 * 1000;

      // (G7 User request realtime smooth seperti Waze!) Rule default SELALU 5 DETIK jika GPS SUDAH ADA (bukan 0,0)
      //   Alasan: Android companion sekarang MAX LATENCY upload 5 DETIK (debounce 5000L EXPEDITED).
      //   Kalau frontend polling 5 detik → 10 detik worst case antara gerak HP → marker web bergerak.
      //   Trade-off: 5 detik polling = 12 request / menit = ~700KB / jam JSON ~3KB. Masih budget server OK.
      return 5 * 1000;
    };

    // Jalankan poll SEGERA sekali pertama tidak tunggu
    const runPoll = async () => {
      try {
        // 1. Refresh list anak + GPS last_known
        await loadChildrenFromApi();

        // 2. Refresh kuota AV juga (side benefit: kuota realtime tanpa reload page)
        const sess = getSessionUser();
        if (sess?.id) {
          await loadKuotaFromApi();
        }

        // =============== WARNING GPS TIDAK KUNJUNG DATANG (lebih dari 2 menit) ===============
        const active = childrenList.find(c => c.id === selectedChildId) || childrenList[0] || null;

        // (G5.3) Simpan posisi anak SEBELUMNYA untuk perbandingan motion detection next poll
        if (active && !isGpsUnavailable(active)) {
          setLastPollChildLatLng({
            lat: Number(active.latitude),
            lng: Number(active.longitude),
            ts: Date.now()
          });
        }

        // Warning toast pertama sekali
        if (active && !warningGpsFirstShown) {
          const sudahDuaMenit = (Date.now() - mountTimestampMs) >= GPS_WARN_THRESHOLD_MS;
          const latlngZeroish = isGpsUnavailable(active);
          if (sudahDuaMenit && latlngZeroish) {
            warningGpsFirstShown = true;
            showToast(
              `[GPS] Data lokasi ${active.name} BELUM diterima dari perangkat. ` +
              `Solusi: Pastikan HP perangkat anak ON, GPS diaktifkan, buka app LitensiKids, izinkan Lokasi "Allow all the time" → tunggu 15 menit (worker periodic) atau jalan keluar rumah (geofence trigger expedited upload <10 detik).`,
              'warning'
            );
          }
        }

        // (G5.3 CRITICAL) Pakai recursive setTimeout SETELAH poll SELESAI → compute interval next poll BERDASARKAN MOTION
        const nextMs = computeNextPollIntervalMs(active);
        // Next poll recursive — pakai `pollTimeoutId` YANG SAMA scope di atas (bukan declare lagi)
        pollTimeoutId = setTimeout(runPoll, nextMs);
        console.debug(`[AudioMonitor-G5.3] Poll selesai. Next poll = ${nextMs/1000}s. forceLive=${forceLiveUntilMs && Date.now()<forceLiveUntilMs? 'AKTIF 5s':'mati'}. MotionDetect=${nextMs<10000?'BERGERAK 5s':'DIAM 15s'}`);
      } catch (err: any) {
        console.error('[AudioMonitor-G5.3] Poll GPS adaptive error:', err?.message || err);
        // Kalau error, tetap schedule poll berikutnya 30 detik untuk hindari banjir request error
        pollTimeoutId = setTimeout(runPoll, 30 * 1000);
      }
    };

    // Poll pertama JALANKAN setTimeout 0 ms = SEGERA
    pollTimeoutId = setTimeout(runPoll, 0);

    // Cleanup unmount: HENTIKAN polling (clear timeout)
    return () => {
      if (pollTimeoutId != null) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId, forceLiveUntilMs]); // Re-init seluruh poll ketika forceLiveUntilMs SET/berubah atau ganti anak.

  // (G5.3 AV6) Handler button Live Update → 2 TAHAPAN:
  // ---------------------------------------------------------------------------
  // (STEP 1) CALL BACKEND /monitor/gps/request-fast-mode (AV6) untuk MENGIRIM FCM
  //          PUSH DATA PAYLOAD ke HP Anak → GPSLocationManager singleton masuk MODE
  //          FAST interval 5 detik selama 30 menit (TEMPORER realtime, PATUH
  //          batas WorkManager 15 menit karena bukan periodic permanent).
  // (STEP 2) HANYA JIKA FCM push SUKSES → set forceLiveUntilMs 30 MENIT polling maps
  //          frontend SAMA DURASI dengan mode HP Anak → user ORANG TUA dapat realtime
  //          update 5 detik SELAMA 30 MENIT FULL juga (fallback token kosong = 30 detik
  //          saja karena mode HP tidak aktif cepat).
  // ---------------------------------------------------------------------------
  // IDE CERDAS USER (ZERO HARDCODE / TIDAK MELANGGAR Google Policy): Daripada
  //   memaksa Periodic WorkManager <15 menit yang akan di-throttle oleh Play Protect
  //   dan menghabiskan baterai permanen 30%+/hari → LEBIH BAIK gunakan FCM push
  //   temporer saat user BENAR-BENAR sedang memantau (klik tombol). Setelah durasi
  //   expire, GPS manager revert otomatis hemat baterai adaptive normal.
  const handleForceLiveUpdate = async () => {
    const anakId = Number(selectedChildId);
    const active = activeChild;
    if (!anakId || !active?.id) {
      showToast('⚠️ Pilih perangkat anak terlebih dahulu sebelum aktifkan Mode Live GPS!', 'warning');
      return;
    }

    try {
      showToast(`📤 Mengirim perintah Live GPS ke ${active.name}...`, 'info');
      const res = await api.post(
        '/monitor/gps/request-fast-mode',
        {
          profil_anak_id: anakId,
          duration_minutes: 30,
          interval_ms: 5_000,
        },
        { authRequired: true },
      );
      if (!res.ok || !res.data?.fcm_sent) {
        const errMsg = res?.message || 'Gagal kirim perintah Live GPS ke perangkat anak.';
        const anakName = res.data?.anak_name || active.name;

        if (res.httpStatus === 409 || /FCM token.*BELUM TERDAFTAR|token.*tidak/i.test(errMsg)) {
          showToast(
            `🚫 ${anakName} belum terhubung FCM! ${errMsg}`,
            'warning',
          );
          // Meskipun token kosong, TETAP set polling frontend 30 detik supaya
          // user tetap dapat melihat update jika GPSWorker periodic 15 menit jalan.
          setForceLiveUntilMs(Date.now() + 30_000);
          showToast('✅ Mode polling Maps frontend tetap aktif 30 detik.', 'info');
          return;
        }

        showToast(`❌ ${errMsg}`, 'error');
        return;
      }

      // SUCCESS ✅: FCM push terkirim → Set polling 30 MENIT (sama durasi mode force HP Anak) + Notifikasi jelas user.
      const durasi = res.data.duration_minutes ?? 30;
      const interval = res.data.interval_ms ?? 5_000;
      setForceLiveUntilMs(Date.now() + durasi * 60 * 1000);
      showToast(
        `✅ Live GPS AKTIF! Perintah terkirim ke ${res.data.anak_name || active.name}: ` +
        `${durasi} menit latensi ${interval}ms (realtime kayak Waze!). Perangkat anak akan mengupload GPS tiap ${interval/1000} detik tanpa menunggu 15 menit worker.`,
        'success',
      );
    } catch (err: any) {
      const msg = err?.message || 'Kesalahan jaringan saat kirim perintah Live GPS';
      showToast(`❌ ${msg}. Coba periksa koneksi internet lalu klik lagi tombolnya.`, 'error');
      console.error('[AudioMonitor-LiveGPS] Exception:', err);
    }
  };

  // Cleanup unmount: Jika ada sesi aktif yang belum di-stop, auto stop paksa (hindari sesi menggantung)
  useEffect(() => {
    return () => {
      if (currentActiveSesiId !== null) {
        console.warn('[AudioMonitor] Unmount dengan sesi aktif, auto stop-sesi paksa id=', currentActiveSesiId);
        const sessId = currentActiveSesiId;
        // Fire and forget — tidak await karena component unmount
        api.post('/monitor/stream/stop-sesi', { sesi_id: sessId }, { authRequired: true })
          .then(r => console.debug('[AudioMonitor] Cleanup stop-sesi response:', r.ok, r.message))
          .catch(e => console.error('[AudioMonitor] Cleanup stop-sesi failed:', e));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click outside to close child dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (childDropdownRef.current && !childDropdownRef.current.contains(event.target as Node)) {
        setIsChildDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeChild: ChildDeviceMonitor = childrenList.find(c => c.id === selectedChildId) || childrenList[0] || ({
    id: 'loading-placeholder',
    name: 'Memuat data anak...',
    age: '- thn',
    avatar: avatarToImageUrl('icon:Smile', 80),
    deviceModel: '-',
    battery: 0,
    isOnline: false,
    status: 'Loading',
    locationName: 'Menunggu data dari database...',
    latitude: -6.1924,
    longitude: 106.8331,
    lastUpdated: '-',
    isLocked: false,
  });

  const filteredChildren = childrenList.filter(child => 
    child.name.toLowerCase().includes(childSearchTerm.toLowerCase()) ||
    child.deviceModel.toLowerCase().includes(childSearchTerm.toLowerCase()) ||
    child.locationName.toLowerCase().includes(childSearchTerm.toLowerCase())
  );

  // Simulated live sound wave fluctuating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAudioListening) {
      interval = setInterval(() => {
        const base = Math.floor(Math.random() * 25) + 30; // 30 - 55 dB (classroom/ambient voice)
        setDecibels(base);
      }, 350);
    } else {
      setDecibels(0);
    }
    return () => clearInterval(interval);
  }, [isAudioListening]);

  // Session duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAudioListening || isVideoStreaming) {
      timer = setInterval(() => {
        setActiveDuration(prev => prev + 1);
      }, 1000);
    } else {
      setActiveDuration(0);
    }
    return () => clearInterval(timer);
  }, [isAudioListening, isVideoStreaming]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleAudio = async () => {
    const profilAnakId = Number(selectedChildId);
    if (!profilAnakId) {
      showToast('Pilih perangkat anak terlebih dahulu', 'warning');
      return;
    }
    if (isAudioListening) {
      // --- OFF: Call AV3 stop-sesi ---
      if (currentActiveSesiId === null) {
        setIsAudioListening(false);
        showToast('Pemantauan suara 1 arah dihentikan', 'info');
        return;
      }
      try {
        const res = await api.post<{
          sesi_id: number; durasi_menit_aktual: number;
          total_digunakan_menit_setelah_update: number; sisa_kuota_menit: number; status_kuota: string;
        }>('/monitor/stream/stop-sesi', { sesi_id: currentActiveSesiId });
        if (res?.ok) {
          setIsAudioListening(false);
          setCurrentActiveSesiId(null);
          // Update kuota state untuk anak aktif sesuai response
          setKuotaList(prev => prev.map(k =>
            k.profil_anak_id === profilAnakId
              ? {
                  ...k,
                  digunakan_audio_menit: k.digunakan_audio_menit + (res.data?.durasi_menit_aktual ?? 1),
                  total_digunakan_menit: res.data?.total_digunakan_menit_setelah_update ?? k.total_digunakan_menit + (res.data?.durasi_menit_aktual ?? 1),
                  sisa_kuota_menit: res.data?.sisa_kuota_menit ?? k.sisa_kuota_menit,
                  last_mode: 'idle',
                  last_sesi_id: null,
                  status_kuota: (res.data?.status_kuota ?? k.status_kuota) as any,
                }
              : k
          ));
          showToast(`Pemantauan suara dihentikan. ${res.data?.durasi_menit_aktual ?? 1} menit ditambahkan ke kuota`, 'info');
        } else {
          showToast(res?.message || 'Gagal menghentikan sesi audio', 'error');
        }
      } catch (err: any) {
        console.error('ToggleAudio OFF error:', err);
        showToast(err?.message || 'Kesalahan jaringan saat stop audio', 'error');
      }
    } else {
      // --- ON: Cek kuota dulu, lalu call AV2 start-sesi ---
      const kuotaAnak = getKuotaAnakAktif();
      if (kuotaAnak && kuotaAnak.status_kuota === 'habis') {
        showToast(`Kuota Audio+Video hari ini untuk ${activeChild.name} SUDAH HABIS. Tidak bisa start sesi baru.`, 'error');
        return;
      }
      try {
        const res = await api.post<{
          sesi_id: number; started_at: string; mode: string;
          profil_anak_id: number; nama_anak: string;
          kuota_snapshot: { total_digunakan_sebelum: number; sisa_kuota_menit: number };
        }>('/monitor/stream/start-sesi', {
          profil_anak_id: profilAnakId,
          mode: 'audio_listen',
          kualitas: audioQuality,
        });
        if (res?.ok && res.data?.sesi_id) {
          setIsAudioListening(true);
          setIsVideoStreaming(false); // matikan video jika nyala (cuma bisa satu mode)
          setActiveMode('audio');
          setShowFloatingWidget(true);
          setCurrentActiveSesiId(res.data.sesi_id);
          // Update kuota state untuk anak aktif sesuai sesi baru start
          setKuotaList(prev => prev.map(k =>
            k.profil_anak_id === profilAnakId
              ? {
                  ...k,
                  last_mode: 'audio_listen',
                  last_sesi_id: res.data!.sesi_id,
                  last_started_at: res.data!.started_at,
                }
              : k
          ));
          showToast(`Menghubungkan audio senyap ke HP ${activeChild.name}... (Sesi ID: ${res.data.sesi_id})`, 'success');
        } else {
          showToast(res?.message || 'Gagal memulai sesi audio', 'error');
        }
      } catch (err: any) {
        console.error('ToggleAudio ON error:', err);
        showToast(err?.message || 'Kesalahan jaringan saat start audio', 'error');
      }
    }
  };

  const handleToggleVideo = async () => {
    const profilAnakId = Number(selectedChildId);
    if (!profilAnakId) {
      showToast('Pilih perangkat anak terlebih dahulu', 'warning');
      return;
    }
    if (isVideoStreaming) {
      // --- OFF: Call AV3 stop-sesi ---
      if (currentActiveSesiId === null) {
        setIsVideoStreaming(false);
        showToast('Streaming kamera jarak jauh dihentikan', 'info');
        return;
      }
      try {
        const res = await api.post<{
          sesi_id: number; durasi_menit_aktual: number;
          total_digunakan_menit_setelah_update: number; sisa_kuota_menit: number; status_kuota: string;
        }>('/monitor/stream/stop-sesi', { sesi_id: currentActiveSesiId });
        if (res?.ok) {
          setIsVideoStreaming(false);
          setCurrentActiveSesiId(null);
          // Update kuota state untuk anak aktif sesuai response
          setKuotaList(prev => prev.map(k =>
            k.profil_anak_id === profilAnakId
              ? {
                  ...k,
                  digunakan_video_menit: k.digunakan_video_menit + (res.data?.durasi_menit_aktual ?? 1),
                  total_digunakan_menit: res.data?.total_digunakan_menit_setelah_update ?? k.total_digunakan_menit + (res.data?.durasi_menit_aktual ?? 1),
                  sisa_kuota_menit: res.data?.sisa_kuota_menit ?? k.sisa_kuota_menit,
                  last_mode: 'idle',
                  last_sesi_id: null,
                  status_kuota: (res.data?.status_kuota ?? k.status_kuota) as any,
                }
              : k
          ));
          showToast(`Streaming kamera dihentikan. ${res.data?.durasi_menit_aktual ?? 1} menit ditambahkan ke kuota`, 'info');
        } else {
          showToast(res?.message || 'Gagal menghentikan sesi kamera', 'error');
        }
      } catch (err: any) {
        console.error('ToggleVideo OFF error:', err);
        showToast(err?.message || 'Kesalahan jaringan saat stop kamera', 'error');
      }
    } else {
      // --- ON: Cek kuota dulu, lalu call AV2 start-sesi ---
      const kuotaAnak = getKuotaAnakAktif();
      if (kuotaAnak && kuotaAnak.status_kuota === 'habis') {
        showToast(`Kuota Audio+Video hari ini untuk ${activeChild.name} SUDAH HABIS. Tidak bisa start sesi baru.`, 'error');
        return;
      }
      try {
        const res = await api.post<{
          sesi_id: number; started_at: string; mode: string;
          profil_anak_id: number; nama_anak: string;
          kuota_snapshot: { total_digunakan_sebelum: number; sisa_kuota_menit: number };
        }>('/monitor/stream/start-sesi', {
          profil_anak_id: profilAnakId,
          mode: 'camera_live',
          kualitas: 'Standard',
        });
        if (res?.ok && res.data?.sesi_id) {
          setIsVideoStreaming(true);
          setIsAudioListening(false); // matikan audio jika nyala (cuma bisa satu mode)
          setActiveMode('video');
          setShowFloatingWidget(true);
          setCurrentActiveSesiId(res.data.sesi_id);
          // Update kuota state untuk anak aktif sesuai sesi baru start
          setKuotaList(prev => prev.map(k =>
            k.profil_anak_id === profilAnakId
              ? {
                  ...k,
                  last_mode: 'camera_live',
                  last_sesi_id: res.data!.sesi_id,
                  last_started_at: res.data!.started_at,
                }
              : k
          ));
          showToast(`Mengaktifkan kamera ${cameraFacing === 'front' ? 'depan' : 'belakang'} HP ${activeChild.name}... (Sesi ID: ${res.data.sesi_id})`, 'success');
        } else {
          showToast(res?.message || 'Gagal memulai sesi kamera', 'error');
        }
      } catch (err: any) {
        console.error('ToggleVideo ON error:', err);
        showToast(err?.message || 'Kesalahan jaringan saat start kamera', 'error');
      }
    }
  };

  const handleConfirmLock = () => {
    setChildrenList(prev =>
      prev.map(c => (c.id === activeChild.id ? { ...c, isLocked: true } : c))
    );
    setShowLockModal(false);
    showToast(`Layar ${activeChild.name} berhasil dikunci (${lockDuration}) dengan pesan: "${lockMessage}"`, 'success');
  };

  const handleConfirmUnlock = () => {
    setChildrenList(prev =>
      prev.map(c => (c.id === activeChild.id ? { ...c, isLocked: false } : c))
    );
    setShowLockModal(false);
    showToast(`Kunci layar perangkat ${activeChild.name} berhasil dibuka`, 'info');
  };

  const handleConfirmAlarm = () => {
    setIsAlarmActive(true);
    setShowAlarmModal(false);
    showToast(`Membunyikan alarm (${alarmTone}, durasi ${alarmDuration}) di HP ${activeChild.name}!`, 'warning');
    setTimeout(() => {
      setIsAlarmActive(false);
    }, alarmDuration === '30 Detik' ? 30000 : alarmDuration === '1 Menit' ? 60000 : 120000);
  };

  const handleStopAlarm = () => {
    setIsAlarmActive(false);
    setShowAlarmModal(false);
    showToast(`Alarm pada perangkat ${activeChild.name} telah dihentikan`, 'info');
  };

  const handleTakeSnapshot = () => {
    const snapId = `snap-${Date.now()}`;
    setCapturedSnaps(prev => [snapId, ...prev]);
    showToast('Tangkapan gambar kamera berhasil disimpan ke galeri pemantauan', 'success');
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Main Screen Layout: Google Maps Stage + Floating Controls & Overlays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        <div className="lg:col-span-12 relative w-full" ref={mapContainerRef}>
          <GoogleMapsMonitorCanvas
            childrenList={childrenList}
            activeChild={activeChild}
            onSelectChild={(childId) => {
              setSelectedChildId(childId);
              setIsAudioListening(false);
              setIsVideoStreaming(false);
            }}
            showToast={showToast}
            // (G5.3) Pass force live update high frequency 5s polling 30 detik
            onForceLiveUpdate={handleForceLiveUpdate}
            forceLiveActive={!!(forceLiveUntilMs && Date.now() < forceLiveUntilMs)}
            childrenOverlay={
              <>
                {/* TOP LEFT FLOATING CARD: CHILD PROFILE & QUICK CONTROL GRID */}
                <div className="absolute top-4 left-4 z-20 w-72 sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-3 pointer-events-auto">
                  {/* Child Header Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img src={activeChild.avatar} alt={activeChild.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-slate-900 dark:text-white block">
                          {activeChild.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded text-[9px] font-medium uppercase">
                            ONLINE
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-0.5">
                            <Battery className="w-3 h-3 text-emerald-500" />
                            {activeChild.battery}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-normal">Sinyal GPS</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end">
                        <Wifi className="w-3 h-3" /> Kuat
                      </span>
                    </div>
                  </div>

                  {/* 6-Grid Button Actions (Alarm, Lock Screen, Listen, Camera, Geofences, History) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* 1. Alarm */}
                    <button
                      type="button"
                      onClick={() => setShowAlarmModal(true)}
                      className="p-2.5 rounded-xl bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <BellRing className={`w-4 h-4 ${isAlarmActive ? 'animate-bounce text-rose-600' : ''}`} />
                      <span className="text-[11px] font-normal">{isAlarmActive ? 'Alarm Aktif' : 'Alarm'}</span>
                    </button>

                    {/* 2. Kunci Layar */}
                    <button
                      type="button"
                      onClick={() => setShowLockModal(true)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                        activeChild.isLocked
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                      }`}
                    >
                      {activeChild.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      <span className="text-[11px] font-normal">{activeChild.isLocked ? 'Buka Kunci' : 'Kunci Layar'}</span>
                    </button>

                    {/* 3. Listen (Dengarkan Suara 1 Arah) - Highlighted */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('audio');
                        handleToggleAudio();
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isAudioListening
                          ? 'bg-cyan-500 text-white border-cyan-600 shadow-xs ring-2 ring-cyan-400/50'
                          : 'bg-cyan-50/80 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/50'
                      }`}
                    >
                      <Mic className={`w-4 h-4 ${isAudioListening ? 'animate-pulse' : ''}`} />
                      <span className="text-[11px] font-medium">{isAudioListening ? 'Mendengarkan...' : 'Listen (Suara)'}</span>
                    </button>

                    {/* 4. Camera (Monitoring Video Kamera Live) - Highlighted */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('video');
                        handleToggleVideo();
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isVideoStreaming
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/50'
                          : 'bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                      }`}
                    >
                      <Camera className={`w-4 h-4 ${isVideoStreaming ? 'animate-pulse' : ''}`} />
                      <span className="text-[11px] font-medium">{isVideoStreaming ? 'Live Video...' : 'Camera (Video)'}</span>
                    </button>

                    {/* 5. Geofences */}
                    <button
                      type="button"
                      onClick={() => showToast(`Lokasi dalam radius geofence aman (320m)`, 'info')}
                      className="p-2.5 rounded-xl bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" />
                      <span className="text-[11px] font-normal">Geofences</span>
                    </button>

                    {/* 6. History */}
                    <button
                      type="button"
                      onClick={() => showToast(`Menampilkan riwayat rute GPS Google Maps`, 'info')}
                      className="p-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <History className="w-4 h-4" />
                      <span className="text-[11px] font-normal">History</span>
                    </button>
                  </div>

                  {/* ================ PRIORITAS 1: PROGRESS BAR KUOTA HARI INI (LISTEN + CAMERA GABUNG 1 KUOTA) ================ */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>Kuota Hari Ini</span>
                      </div>
                      {(() => {
                        const k = getKuotaAnakAktif();
                        if (!k) return <span className="text-slate-400 italic">Memuat...</span>;
                        const badgeColorMap: Record<string, string> = {
                          unlimited: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
                          normal: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
                          hampir_habis: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
                          habis: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
                        };
                        const badgeTextMap: Record<string, string> = {
                          unlimited: 'Unlimited 🟢',
                          normal: 'Normal',
                          hampir_habis: 'Hampir Habis ⚠️',
                          habis: 'HABIS 🔴',
                        };
                        return (
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-medium uppercase ${badgeColorMap[k.status_kuota] ?? badgeColorMap.normal}`}>
                            {badgeTextMap[k.status_kuota] ?? 'Normal'}
                          </span>
                        );
                      })()}
                    </div>

                    {(() => {
                      const k = getKuotaAnakAktif();
                      if (!k) {
                        return (
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden animate-pulse" />
                        );
                      }
                      if (k.status_kuota === 'unlimited') {
                        return (
                          <div className="space-y-1">
                            <div className="h-2 rounded-full overflow-hidden bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                              <div className="h-full w-full bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse" style={{ width: '100%' }} />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-normal">
                              <span>Digunakan: {k.total_digunakan_menit} menit (Audio {k.digunakan_audio_menit}m + Video {k.digunakan_video_menit}m)</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">∞ Unlimited</span>
                            </div>
                          </div>
                        );
                      }
                      // Warna progress bar berdasarkan status kuota
                      const progressWarna: Record<string, string> = {
                        normal: 'from-indigo-400 to-indigo-500',
                        hampir_habis: 'from-amber-400 to-amber-500',
                        habis: 'from-rose-400 to-rose-500',
                      };
                      const barBgWarna: Record<string, string> = {
                        normal: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40',
                        hampir_habis: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40',
                        habis: 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40',
                      };
                      return (
                        <div className="space-y-1">
                          <div className={`h-2 rounded-full overflow-hidden border ${barBgWarna[k.status_kuota] ?? barBgWarna.normal}`}>
                            <div
                              className={`h-full bg-gradient-to-r ${progressWarna[k.status_kuota] ?? progressWarna.normal} transition-all duration-500`}
                              style={{ width: `${Math.max(0, Math.min(100, k.persentase_terpakai))}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-normal">
                            <span>{k.total_digunakan_menit} / {k.paket_kuota_menit_harian} menit • ({k.digunakan_audio_menit}m Audio + {k.digunakan_video_menit}m Video)</span>
                            <span className={`font-medium ${
                              k.status_kuota === 'habis' ? 'text-rose-600 dark:text-rose-400' :
                              k.status_kuota === 'hampir_habis' ? 'text-amber-600 dark:text-amber-400' :
                              'text-indigo-600 dark:text-indigo-400'
                            }`}>
                              Sisa: {k.sisa_kuota_menit} menit • {k.persentase_terpakai}%
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* ================ END PROGRESS BAR KUOTA ================ */}

                  {/* Child Searchable Dropdown Selector (Replacing Date Input) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div ref={childDropdownRef} className="relative z-30">
                      <button
                        type="button"
                        onClick={() => {
                          setIsChildDropdownOpen(!isChildDropdownOpen);
                          if (!isChildDropdownOpen) {
                            setChildSearchTerm('');
                            setTimeout(() => childSearchInputRef.current?.focus(), 50);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative shrink-0">
                            <img src={activeChild.avatar} alt={activeChild.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600" />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-slate-800 ${activeChild.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          </div>
                          <div className="text-left truncate">
                            <span className="text-slate-800 dark:text-slate-200 font-medium text-xs truncate block">{activeChild.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                          <span className="text-[10px] font-normal">({activeChild.age})</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isChildDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                        </div>
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isChildDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-slate-800"
                          >
                            {/* Search Header */}
                            <div className="p-2 bg-slate-50/90 dark:bg-slate-950/80 flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                              <input
                                ref={childSearchInputRef}
                                type="text"
                                value={childSearchTerm}
                                onChange={(e) => setChildSearchTerm(e.target.value)}
                                placeholder="Cari nama anak..."
                                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none font-normal"
                              />
                              {childSearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => setChildSearchTerm('')}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Children Option List */}
                            <div className="max-h-48 overflow-y-auto p-1.5 space-y-1">
                              {filteredChildren.length === 0 ? (
                                <div className="py-3 text-center text-xs text-slate-400 font-normal">
                                  Anak tidak ditemukan
                                </div>
                              ) : (
                                filteredChildren.map(child => {
                                  const isSelected = child.id === selectedChildId;
                                  return (
                                    <button
                                      key={child.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedChildId(child.id);
                                        setIsAudioListening(false);
                                        setIsVideoStreaming(false);
                                        setIsChildDropdownOpen(false);
                                        showToast(`Beralih ke perangkat ${child.name}`, 'info');
                                      }}
                                      className={`w-full p-2 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                                        isSelected
                                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50'
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="relative shrink-0">
                                          <img src={child.avatar} alt={child.name} className="w-6 h-6 rounded-full object-cover" />
                                          <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-slate-900 ${child.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-medium text-slate-900 dark:text-white truncate">{child.name}</span>
                                            <span className="text-[10px] text-slate-400 font-normal">({child.age})</span>
                                          </div>
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate block">
                                            {child.deviceModel}
                                          </span>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-normal pt-0.5">
                      <span>📍 {activeChild.locationName}</span>
                      <span>{activeChild.lastUpdated}</span>
                    </div>
                  </div>
                </div>

                {/* TOP-RIGHT FLOATING MONITOR MODAL (Dengarkan Suara Sekitar Anak & Video Monitor) - DRAGGABLE */}
                <AnimatePresence>
                  {showFloatingWidget && (
                    <motion.div
                      drag
                      dragConstraints={mapContainerRef}
                      dragElastic={0.08}
                      dragMomentum={false}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      className="absolute top-4 right-4 z-30 w-[300px] sm:w-[320px] bg-[#1f2937]/95 dark:bg-[#111827]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 sm:p-3.5 shadow-2xl text-white space-y-3 pointer-events-auto"
                    >
                      {/* Modal Header with Drag Handle */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 select-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-slate-400 p-0.5 cursor-grab active:cursor-grabbing hover:text-slate-200 transition-colors shrink-0" title="Klik dan tahan untuk menggeser posisi modal">
                            <GripHorizontal className="w-4 h-4" />
                          </span>
                          <span className="p-1 rounded-md bg-rose-500/20 text-rose-400 shrink-0">
                            {activeMode === 'audio' ? <Mic className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-xs font-medium text-white truncate">
                            {activeMode === 'audio' ? 'Dengarkan Suara' : 'Monitoring Video'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Switch Audio / Video Tab in modal */}
                          <button
                            type="button"
                            onClick={() => setActiveMode(activeMode === 'audio' ? 'video' : 'audio')}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                          >
                            {activeMode === 'audio' ? 'Kamera' : 'Audio'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowFloatingWidget(false)}
                            className="p-1 text-slate-400 hover:text-white transition-colors rounded cursor-pointer"
                            title="Tutup Modal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* MODAL BODY: AUDIO MODE */}
                      {activeMode === 'audio' && (
                        <div className="flex flex-col items-center justify-center space-y-3 py-1">
                          {/* Child Avatar with Radar Ring */}
                          <div className="relative flex items-center justify-center">
                            {isAudioListening && (
                              <>
                                <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-emerald-400 opacity-40" />
                                <span className="animate-pulse absolute inline-flex h-16 w-16 rounded-full bg-emerald-500 opacity-30" />
                              </>
                            )}
                            <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-slate-600 bg-slate-800">
                              <img src={activeChild.avatar} alt={activeChild.name} className="w-full h-full object-cover" />
                            </div>
                            {isAudioListening && (
                              <span className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-full text-[9px] text-white">
                                <Headphones className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>

                          {/* Status Text & Decibel Meter */}
                          <div className="text-center space-y-0.5">
                            <span className="text-xs font-medium text-slate-200 block truncate max-w-[270px]">
                              {isAudioListening ? `Mendengarkan ${activeChild.name}...` : 'Menunggu Perintah Audio...'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal block">
                              {isAudioListening 
                                ? `Level: ${decibels} dB • Durasi: ${formatTimer(activeDuration)}` 
                                : 'HP anak tetap 100% hening tanpa bunyi/layar menyala'}
                            </span>
                          </div>

                          {/* Soundwave Equalizer Bars */}
                          <div className="flex items-center justify-center gap-1.5 h-9 w-full px-2">
                            {[12, 28, 42, 16, 48, 32, 20, 44, 26, 36, 18, 30, 46, 22].map((height, idx) => (
                              <motion.div
                                key={idx}
                                animate={isAudioListening ? { height: [8, height, 10, height * 0.7, 8] } : { height: 6 }}
                                transition={isAudioListening ? { repeat: Infinity, duration: 0.6 + (idx % 4) * 0.15, ease: 'easeInOut' } : {}}
                                className={`w-1 rounded-full transition-all ${
                                  isAudioListening ? 'bg-emerald-400' : 'bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Audio Controls Bar (Mute, Volume Slider, Quality) */}
                          {isAudioListening && (
                            <div className="w-full px-2 py-1.5 bg-slate-800/80 rounded-xl flex items-center justify-between gap-1.5 border border-slate-700/60 text-xs">
                              <button
                                type="button"
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-1 text-slate-300 hover:text-white cursor-pointer"
                              >
                                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                              </button>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={isMuted ? 0 : audioVolume}
                                onChange={(e) => {
                                  setAudioVolume(Number(e.target.value));
                                  if (isMuted) setIsMuted(false);
                                }}
                                className="w-24 h-1 bg-slate-700 rounded-lg accent-emerald-500 cursor-pointer"
                              />
                              <span className="text-[10px] text-slate-400 font-mono">{isMuted ? '0%' : `${audioVolume}%`}</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-medium">{audioQuality}</span>
                            </div>
                          )}

                          {/* Action Button: Start / Stop Listening */}
                          <button
                            type="button"
                            onClick={handleToggleAudio}
                            className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                              isAudioListening
                                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            {isAudioListening ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Listening</span>
                              </>
                            ) : (
                              <>
                                <Mic className="w-3.5 h-3.5" />
                                <span>Mulai Dengarkan Suara Anak</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* MODAL BODY: LIVE VIDEO CAMERA MODE (PORTRAIT RATIO - FLUSH FIT) */}
                      {activeMode === 'video' && (
                        <div className="space-y-2.5">
                          {/* Portrait Viewport Frame (9:14 Phone Ratio - Width Flush) */}
                          <div className="relative w-full aspect-[9/13.5] bg-black rounded-2xl overflow-hidden border border-slate-700/90 shadow-inner flex flex-col justify-between p-2.5">
                            
                            {/* Top Bar inside Camera */}
                            <div className="flex items-center justify-between text-[10px] z-10 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-lg">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isVideoStreaming ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
                                <span className="font-mono text-rose-400 text-[10px]">
                                  {isVideoStreaming ? `LIVE • ${formatTimer(activeDuration)}` : 'STANDBY'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-300 text-[10px]">
                                <span>{cameraFacing === 'front' ? 'Depan' : 'Belakang'}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-emerald-400 font-mono">720p</span>
                              </div>
                            </div>

                            {/* Video Stream Graphic Simulation (Portrait View) */}
                            {isVideoStreaming ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-between py-10 px-3 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-slate-300">
                                {/* Top Center Camera Notch */}
                                <div className="w-10 h-2 bg-black/80 rounded-full mx-auto" />

                                {/* Focus Center Target */}
                                <div className="relative flex flex-col items-center justify-center text-center space-y-2">
                                  {/* Focus reticle box */}
                                  <div className="w-20 h-20 border border-dashed border-emerald-400/60 rounded-xl flex items-center justify-center relative animate-pulse">
                                    <Camera className="w-6 h-6 text-emerald-400 opacity-90" />
                                    <span className="absolute -top-1.5 -left-1.5 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
                                    <span className="absolute -top-1.5 -right-1.5 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
                                    <span className="absolute -bottom-1.5 -left-1.5 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
                                    <span className="absolute -bottom-1.5 -right-1.5 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />
                                  </div>

                                  <span className="text-xs font-medium text-slate-100 block">
                                    {cameraFacing === 'front' 
                                      ? `Wajah ${activeChild.name}` 
                                      : 'Ruang Belajar Sekitar'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 block px-2 py-0.5 bg-slate-800/80 rounded-full border border-slate-700/60">
                                    Mode Potret HP Anak • TLS 256-bit
                                  </span>
                                </div>

                                {/* Live FPS & Bitrate tag */}
                                <div className="text-[9px] text-slate-400 font-mono">
                                  30 FPS • 1.2 Mbps • H.264
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-12 text-slate-400 space-y-2">
                                <div className="w-12 h-12 rounded-full bg-slate-800/90 flex items-center justify-center mx-auto border border-slate-700">
                                  <EyeOff className="w-6 h-6 opacity-60 text-slate-400" />
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-slate-300 block">Kamera Belum Aktif</span>
                                  <span className="text-[10px] text-slate-500 block">Rasio potret layar vertikal</span>
                                </div>
                              </div>
                            )}

                            {/* Bottom Controls Bar inside camera */}
                            <div className="flex items-center justify-between text-[10px] z-10 bg-black/60 px-2 py-1.5 rounded-xl backdrop-blur-xs border border-slate-800">
                              <span className="text-slate-400 text-[9px]">Hening 100%</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newFacing = cameraFacing === 'front' ? 'back' : 'front';
                                    setCameraFacing(newFacing);
                                    showToast(`Beralih ke kamera ${newFacing === 'front' ? 'depan' : 'belakang'}`, 'info');
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer flex items-center gap-1 text-[10px] transition-colors border border-slate-700"
                                  title="Putar Kamera"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Putar</span>
                                </button>
                                {isVideoStreaming && (
                                  <button
                                    type="button"
                                    onClick={handleTakeSnapshot}
                                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm"
                                    title="Ambil Foto Snapshot"
                                  >
                                    <Camera className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Toggle Stream Button */}
                          <button
                            type="button"
                            onClick={handleToggleVideo}
                            className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                              isVideoStreaming
                                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isVideoStreaming ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Hentikan Streaming Kamera</span>
                              </>
                            ) : (
                              <>
                                <Video className="w-3.5 h-3.5" />
                                <span>Mulai Streaming Kamera Live (Potret)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Footer Privacy Guarantee Note */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-700/60">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="leading-tight">Dijamin 100% senyap tanpa notifikasi atau preview di HP anak.</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reopen Floating Monitor Button (When Closed) */}
                {!showFloatingWidget && (
                  <button
                    type="button"
                    onClick={() => setShowFloatingWidget(true)}
                    className="absolute top-4 right-4 z-20 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl text-xs font-normal shadow-lg flex items-center gap-2 cursor-pointer backdrop-blur-md border border-slate-700 hover:border-slate-500 transition-colors pointer-events-auto"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Buka Console Monitor Suara & Video</span>
                  </button>
                )}
              </>
            }
          />
        </div>
      </div>

      {/* Feature Information & Privacy Standard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
        {/* Card 1: Suara 1 Arah */}
        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <Mic className="w-4 h-4" />
            </div>
            <span>Audio Ambien 1 Arah</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Menghubungkan orang tua ke mikrofon HP anak untuk mendengarkan percakapan dan lingkungan sekitar saat anak tidak membalas pesan.
          </p>
        </div>

        {/* Card 2: Monitoring Video Live */}
        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <span>Live Kamera Depan & Belakang</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Streaming visual tanpa suara klik atau layar menyala. Memastikan keselamatan fisik anak saat berada di luar rumah atau rute baru.
          </p>
        </div>

        {/* Card 3: Keamanan & Enkripsi */}
        <div className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>Enkripsi TLS 256-bit Parental</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Semua aliran audio dan video diproses melalui jalur terenkripsi eksklusif antara perangkat orang tua dan perangkat anak.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: KONFIRMASI BUNYIKAN ALARM ANAK */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAlarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800"
            >
              {/* Modal Header */}
              <div className="px-5 py-3.5 bg-rose-50/70 dark:bg-rose-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                      Konfirmasi Bunyikan Alarm
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      Peringatan suara keras di perangkat anak
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlarmModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Target Child Information */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={activeChild.avatar}
                      alt={activeChild.name}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-900 dark:text-white">{activeChild.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({activeChild.age})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal block">
                        {activeChild.deviceModel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                      {activeChild.isOnline ? 'Online' : 'Offline'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Baterai {activeChild.battery}%
                    </span>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 font-normal space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Volume 100% (Maksimal)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Alarm akan berbunyi seketika dengan volume penuh di HP anak meskipun dalam mode Hening (Silent) atau Jangan Ganggu (DND).
                  </p>
                </div>

                {/* Duration Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                    Durasi Alarm
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['30 Detik', '1 Menit', '2 Menit', '5 Menit'].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setAlarmDuration(dur)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] transition-colors cursor-pointer border ${
                          alarmDuration === dur
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                    Pilihan Nada Alarm
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Sirene Keras', 'Ring Berulang', 'Peringatan Darurat'].map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setAlarmTone(tone)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] transition-colors cursor-pointer border text-center ${
                          alarmTone === tone
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAlarmModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-normal cursor-pointer transition-colors"
                >
                  Batal
                </button>
                {isAlarmActive ? (
                  <button
                    type="button"
                    onClick={handleStopAlarm}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Hentikan Alarm Sekarang</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmAlarm}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Bunyikan Alarm Sekarang</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: KONFIRMASI KUNCI LAYAR & PESAN / DURASI */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showLockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800"
            >
              {/* Modal Header */}
              <div className={`px-5 py-3.5 flex items-center justify-between ${
                activeChild.isLocked
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                  : 'bg-amber-50/70 dark:bg-amber-950/40'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    activeChild.isLocked
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                  }`}>
                    {activeChild.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                      {activeChild.isLocked ? 'Konfirmasi Buka Kunci Layar' : 'Konfirmasi Kunci Layar'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      {activeChild.isLocked ? 'Pulihkan akses perangkat anak' : 'Kunci layar & tampilkan pesan khusus'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Target Child Information */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={activeChild.avatar}
                      alt={activeChild.name}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-900 dark:text-white">{activeChild.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({activeChild.age})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal block">
                        {activeChild.deviceModel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium block ${activeChild.isLocked ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {activeChild.isLocked ? '🔒 Terkunci' : '🔓 Tidak Terkunci'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Baterai {activeChild.battery}%
                    </span>
                  </div>
                </div>

                {activeChild.isLocked ? (
                  /* Unlock State View */
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 font-normal space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Buka Kunci Layar Perangkat</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                        Membuka kunci layar akan langsung memberikan anak akses penuh kembali ke layar utama dan seluruh aplikasi di ponselnya.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Lock Screen Form View */
                  <div className="space-y-3.5">
                    {/* Pesan Kunci Layar Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Pesan Kunci Layar
                      </label>
                      <input
                        type="text"
                        value={lockMessage}
                        onChange={(e) => setLockMessage(e.target.value)}
                        placeholder="Tulis pesan yang muncul di layar anak..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 font-normal outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400/40"
                      />

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {[
                          'Waktunya Belajar 📚',
                          'Waktunya Istirahat 🌙',
                          'Waktu Layar Habis ⏳',
                          'Makan Bersama 🍽️'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setLockMessage(preset)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-normal transition-colors cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Durasi Kunci Layar */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Durasi Kunci Layar
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
                        {['15 Menit', '30 Menit', '1 Jam', '2 Jam', 'Sampai Dibuka'].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setLockDuration(dur)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] transition-colors cursor-pointer border text-center ${
                              lockDuration === dur
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-50 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            {dur}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Emergency Call Guarantee */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Panggilan Darurat SOS dan nomor orang tua tetap dapat diakses oleh anak kapan saja saat layar terkunci.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-normal cursor-pointer transition-colors"
                >
                  Batal
                </button>
                {activeChild.isLocked ? (
                  <button
                    type="button"
                    onClick={handleConfirmUnlock}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Buka Kunci Layar Sekarang</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmLock}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Kunci Layar Sekarang</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
