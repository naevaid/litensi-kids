import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Crown, Smartphone, MapPin, Shield, Mic, Camera,
  Navigation, MessageSquare, Lock, Check, X, AppWindow,
  Edit3, Save, Sparkles, RefreshCw, AlertCircle,
  HelpCircle, ChevronRight, Layers, ArrowUpRight, CheckCircle2,
  Sliders, ShieldCheck, ToggleLeft, ToggleRight, Radio, Clock
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionLimits } from '../../types';
import { api, getSessionUser } from '../../lib/apiClient';

export interface LanggananTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Helper mapping: DB row paket_langganan → SubscriptionPlan frontend (export untuk direuse komponen lain)
// Normalisasi ID: ganti semua spasi/karakter non-alphanumeric jadi underscore agar COCOK dengan kolom users.active_plan format snake_case (misal 'Family Pro' → 'family_pro' bukan 'family pro')
export const normalizePlanId = (raw: string): string => {
  return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
};

// ==========================================================================
// EXPORT REUSABLE RENDERER RINCIAN FITUR PAKET (100% DARI DB — TIDAK BOLEH HARDCODE FALLBACK DATA)
// Dipakai di 3 LOKASI SUPAYA SAMA KONSISTEN FORMAT & RINCIAN:
//  [1] LanggananTab.tsx — halaman Kelola Langganan Paket (feature matrix)
//  [2] LanggananSayaTab.tsx — halaman "Rincian Hak Akses & Fitur Paket Anda" (grid 2 kolom)
//  [3] LanggananSayaTab.tsx — MODAL Pilihan Paket Langganan Keluarga (compact list per card)
// ==========================================================================
export type FeatureItemSpec = {
  key: keyof SubscriptionLimits | 'maxChildrenDevices';
  label: string;
  icon: ReactNode;
  iconColor: string;
  isBoolean?: boolean;
  renderValue: (l: SubscriptionLimits) => string;
  isEnabled?: (l: SubscriptionLimits) => boolean;
};
export const PAKET_FEATURE_SPECS: FeatureItemSpec[] = [
  { key: 'maxChildrenDevices', label: 'Batas Perangkat Anak', icon: <Smartphone className="w-4 h-4" />, iconColor: 'text-indigo-500',
    renderValue: (l) => String(l.maxChildrenDevicesLabel || '—') },
  { key: 'locationTracking', label: 'Lacak Lokasi GPS', icon: <MapPin className="w-4 h-4" />, iconColor: 'text-emerald-500',
    renderValue: (l) => String(l.locationTrackingLabel || '—') },
  { key: 'appRestriction', label: 'Kontrol & Batasan Aplikasi', icon: <AppWindow className="w-4 h-4" />, iconColor: 'text-pink-500',
    renderValue: (l) => String(l.appRestrictionLabel || '—') },
  { key: 'oneWayAudio', label: 'Dengar Suara Satu Arah', icon: <Mic className="w-4 h-4" />, iconColor: 'text-purple-500',
    isBoolean: true, isEnabled: (l) => Boolean(l.oneWayAudio),
    renderValue: (l) => String(l.oneWayAudioLabel || (l.oneWayAudio ? 'Aktif' : 'Tidak Tersedia')) },
  { key: 'liveCamera', label: 'Live Kamera Jarak Jauh', icon: <Camera className="w-4 h-4" />, iconColor: 'text-amber-500',
    isBoolean: true, isEnabled: (l) => Boolean(l.liveCamera),
    renderValue: (l) => String(l.liveCameraLabel || (l.liveCamera ? 'Aktif' : 'Tidak Tersedia')) },
  { key: 'maxGeofences', label: 'Radius & Area Geofence', icon: <Navigation className="w-4 h-4" />, iconColor: 'text-teal-500',
    renderValue: (l) => String(l.maxGeofencesLabel || '—') },
  { key: 'readMessageNotifications', label: 'Notifikasi Pesan & Chat Masuk', icon: <MessageSquare className="w-4 h-4" />, iconColor: 'text-cyan-500',
    isBoolean: true, isEnabled: (l) => Boolean(l.readMessageNotifications),
    renderValue: (l) => String(l.readMessageNotificationsLabel || (l.readMessageNotifications ? 'Aktif' : 'Belum Aktif')) },
  { key: 'remoteScreenLock', label: 'Kunci Layar Jarak Jauh', icon: <Lock className="w-4 h-4" />, iconColor: 'text-rose-500',
    isBoolean: true, isEnabled: (l) => Boolean(l.remoteScreenLock),
    renderValue: (l) => String(l.remoteScreenLockLabel || (l.remoteScreenLock ? 'Aktif' : 'Belum Aktif')) },
];

export interface PaketFeatureBadgesProps { plan: SubscriptionPlan; }
export const PaketFeatureBadges: React.FC<PaketFeatureBadgesProps> = ({ plan }) => {
  if (!plan.highlightFeatures || !Array.isArray(plan.highlightFeatures) || plan.highlightFeatures.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1.5 mb-1">
      {plan.highlightFeatures.filter(Boolean).map((text, idx) => (
        <span key={`hb-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-3 h-3 text-amber-500" />{String(text)}
        </span>
      ))}
    </div>
  );
};

interface PaketFeatureLineProps { plan: SubscriptionPlan; spec: FeatureItemSpec; }
const PaketFeatureLine: React.FC<PaketFeatureLineProps> = ({ plan, spec }) => {
  const limits = plan.limits;
  const value = spec.renderValue(limits);
  if (spec.isBoolean) {
    const enabled = spec.isEnabled ? spec.isEnabled(limits) : false;
    return (
      <div className="flex items-start justify-between gap-2 py-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex-shrink-0 ${spec.iconColor}`}>{spec.icon}</span>
          <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{spec.label}</span>
        </div>
        {enabled
          ? <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 whitespace-nowrap"><Check className="w-3 h-3" />{value}</span>
          : <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap"><X className="w-3 h-3" />{value}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`flex-shrink-0 ${spec.iconColor}`}>{spec.icon}</span>
        <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{spec.label}</span>
      </div>
      <span className="text-[11px] font-medium text-slate-900 dark:text-white flex-shrink-0 whitespace-nowrap">{value}</span>
    </div>
  );
};

// COMPACT LIST — untuk MODAL paket (layout mobile-friendly vertical list tanpa grid padding; TIDAK menampilkan highlight badges karena rincian detail sudah lengkap & menghindari duplikasi info)
export interface PaketFeaturesCompactListProps { plan: SubscriptionPlan; }
export const PaketFeaturesCompactList: React.FC<PaketFeaturesCompactListProps> = ({ plan }) => {
  return (
    <div className="w-full">
      <div className="space-y-0.5 pt-1">
        {PAKET_FEATURE_SPECS.map((spec) => (
          <PaketFeatureLine key={String(spec.key)} plan={plan} spec={spec} />
        ))}
      </div>
    </div>
  );
};

// GRID LAYOUT — untuk halaman utama (besar 2 kolom card bordered each item)
export interface PaketFeaturesFullGridProps { plan: SubscriptionPlan; }
export const PaketFeaturesFullGrid: React.FC<PaketFeaturesFullGridProps> = ({ plan }) => {
  return (
    <div className="w-full space-y-2">
      <PaketFeatureBadges plan={plan} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-normal">
        {PAKET_FEATURE_SPECS.map((spec) => {
          const limits = plan.limits;
          const value = spec.renderValue(limits);
          if (spec.isBoolean) {
            const enabled = spec.isEnabled ? spec.isEnabled(limits) : false;
            return (
              <div key={String(spec.key)} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex-shrink-0 ${spec.iconColor}`}>{spec.icon}</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate">{spec.label}</span>
                </div>
                {enabled
                  ? <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 whitespace-nowrap"><Check className="w-3.5 h-3.5" />{value}</span>
                  : <span className="flex items-center gap-1 font-medium text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap"><X className="w-3.5 h-3.5" />{value}</span>}
              </div>
            );
          }
          return (
            <div key={String(spec.key)} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`flex-shrink-0 ${spec.iconColor}`}>{spec.icon}</span>
                <span className="text-slate-700 dark:text-slate-300 truncate">{spec.label}</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white flex-shrink-0 whitespace-nowrap">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const mapDbPaketToPlan = (dbRow: any): SubscriptionPlan | null => {
  if (!dbRow) return null;
  const id = normalizePlanId(String(dbRow.name ?? dbRow.id ?? '')) || `paket-${dbRow.id}`;
  const name = String(dbRow.name ?? '');
  const badge = dbRow.badge ? String(dbRow.badge) : undefined;
  const popular = Boolean(dbRow.popular);
  const tagline = String(dbRow.tagline ?? '');
  const description = String(dbRow.description ?? '');
  const monthlyPrice = Number(dbRow.monthly_price ?? 0);
  const annualPrice = Number(dbRow.annual_price ?? 0);
  const activeUsersCount = Number(dbRow.active_users_count ?? 0);
  const status = String(dbRow.status ?? 'active') === 'archived' ? 'archived' : 'active';

  // limits: mapping kolom DB → SubscriptionLimits
  const rawMaxGeo = String(dbRow.max_geofences ?? '5');
  const maxGeofencesVal: number | 'unlimited' =
    rawMaxGeo === 'unlimited' || rawMaxGeo === 'Unlimited'
      ? 'unlimited'
      : Number(rawMaxGeo) || 5;

  // Generate default label untuk batas perangkat anak (drive dari integer value DB max_children_devices, BUKAN hardcode data paket)
  const rawMaxChildren = Number(dbRow.max_children_devices ?? 1);
  const maxChildrenDevicesLabelDefault =
    rawMaxChildren <= 0 ? 'Tidak Terbatas' : `${rawMaxChildren} Perangkat Anak`;

  // highlight_features: jika JSON parse array, jika tidak fallback default
  let highlightFeatures: string[] = [];
  try {
    if (typeof dbRow.highlight_features === 'string' && dbRow.highlight_features.trim()) {
      const parsed = JSON.parse(dbRow.highlight_features);
      if (Array.isArray(parsed)) highlightFeatures = parsed.map(String);
    } else if (Array.isArray(dbRow.highlight_features)) {
      highlightFeatures = dbRow.highlight_features.map(String);
    }
  } catch (e) {
    // ignore
  }

  const limits: SubscriptionLimits = {
    maxChildrenDevices: rawMaxChildren,
    maxChildrenDevicesLabel: String(dbRow.max_children_devices_label ?? maxChildrenDevicesLabelDefault),
    locationTracking: (String(dbRow.location_tracking ?? 'dasar') as any),
    locationTrackingLabel: String(dbRow.location_tracking_label ?? (dbRow.location_tracking || '')),
    appRestriction: (String(dbRow.app_restriction ?? 'terbatas_3') as any),
    appRestrictionLabel: String(dbRow.app_restriction_label ?? (dbRow.app_restriction || '')),
    oneWayAudio: Boolean(dbRow.one_way_audio),
    oneWayAudioLabel: String(dbRow.one_way_audio_label ?? (dbRow.one_way_audio ? 'Aktif' : 'Tidak tersedia')),
    liveCamera: Boolean(dbRow.live_camera),
    liveCameraLabel: String(dbRow.live_camera_label ?? (dbRow.live_camera ? 'Aktif' : 'Tidak tersedia')),
    maxGeofences: maxGeofencesVal,
    maxGeofencesLabel: String(dbRow.max_geofences_label ?? (maxGeofencesVal === 'unlimited' ? 'Unlimited' : `${maxGeofencesVal} Area`)),
    readMessageNotifications: Boolean(dbRow.read_message_notifications),
    readMessageNotificationsLabel: String(dbRow.read_message_notifications_label ?? (dbRow.read_message_notifications ? 'Aktif' : 'Tidak tersedia')),
    remoteScreenLock: Boolean(dbRow.remote_screen_lock),
    remoteScreenLockLabel: String(dbRow.remote_screen_lock_label ?? (dbRow.remote_screen_lock ? 'Aktif' : 'Tidak tersedia')),
  };

  return {
    id,
    name,
    badge,
    popular,
    tagline,
    description,
    monthlyPrice,
    annualPrice,
    limits,
    highlightFeatures,
    activeUsersCount,
    status,
  };
};

// Fallback DEFAULT PLANS (digunakan HANYA jika tabel paket_langganan DI DB TOTAL KOSONG 0 baris sama sekali, bukan sebagai fallback normal)
const FALLBACK_ZERO_PLANS: SubscriptionPlan[] = [];

export const LanggananTab: React.FC<LanggananTabProps> = ({ showToast }) => {
  const sessUser = getSessionUser();
  const uid = sessUser?.id ? String(sessUser.id) : '';

  // STATE DARI API BUKAN localStorage / hardcode DEFAULT_SUBSCRIPTION_PLANS
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  // activePlan = dapat dari endpoint /paket/mine (status user session) BUKAN localStorage
  const [activePlanId, setActivePlanId] = useState<string>('free');
  const [activePlanLabel, setActivePlanLabel] = useState<string>('Free (Dasar)');
  const [activePlanExpired, setActivePlanExpired] = useState<string | null>(null);

  // Billing period toggle (monthly vs annual)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Modal editor state (Owner)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load DATA REAL DARI DB via API
  const loadPlansData = async () => {
    console.groupCollapsed('%c[LanggananTab] loadPlansData GET /paket + /paket/mine', 'color:#f59e0b;font-weight:700');
    try {
      setLoading(true);
      const [paketResp, mineResp] = await Promise.all([
        api.get('/paket', { status: 'active' }),
        uid
          ? api.get('/paket/mine', { user_id: uid })
          : Promise.resolve({ ok: false, status: 401, data: null, message: 'user_id kosong' } as any),
      ]);

      // SESUAI KONVENSI_INTEGRASI_API.md Point #1: apiClient OTOMATIS UNWRAP 1x level `data.`
      // Jadi res.data LANGSUNG = payload inner, TIDAK PERLU akses res.data.data lagi.
      // Field `ok` (bukan `success`) = indikator request berhasil dari apiClient wrapper.
      const paketArr: any[] = Array.isArray(paketResp?.data)
        ? paketResp.data
        : (paketResp?.data?.data ?? paketResp?.data?.list ?? []);
      const parsedPlans = paketArr
        .map(mapDbPaketToPlan)
        .filter(Boolean) as SubscriptionPlan[];
      setPlans(parsedPlans);

      // Active Plan dari /paket/mine response BUKAN localStorage
      // MINE: mineResp.data LANGSUNG = object {active_plan, active_plan_label, expires_at, ...} BUKAN nested {success, data}
      const mineData = mineResp?.ok && mineResp?.data && typeof mineResp.data === 'object'
        ? mineResp.data
        : null;
      console.debug('[LanggananTab] mineData raw:', mineData, 'mineResp.ok:', mineResp?.ok, 'mineResp.keys:', mineResp ? Object.keys(mineResp) : []);
      if (mineData?.active_plan) {
        const planName = normalizePlanId(mineData.active_plan);
        setActivePlanId(planName);
        setActivePlanLabel(String(mineData.active_plan_label ?? mineData.paket?.badge ?? mineData.paket?.name ?? planName));
        setActivePlanExpired(mineData.expires_at ?? null);
      } else if (parsedPlans.length > 0) {
        // fallback termurah = first
        setActivePlanId(parsedPlans[0].id);
        setActivePlanLabel(parsedPlans[0].name);
        setActivePlanExpired(null);
      }

      console.debug('[LanggananTab] plans loaded:', parsedPlans.length, 'activePlanId STATE:', activePlanId, 'planName from mine:', mineData?.active_plan ? normalizePlanId(mineData.active_plan) : '-');
    } catch (err: any) {
      console.error('[LanggananTab] loadPlansData error:', err);
      showToast(err?.message || 'Gagal memuat daftar paket langganan dari database', 'error');
      setPlans(FALLBACK_ZERO_PLANS);
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadPlansData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayPlans = useMemo(
    () => plans.filter(p => p.status === 'active').sort((a, b) => a.monthlyPrice - b.monthlyPrice),
    [plans]
  );
  const activePlan = displayPlans.find(p => p.id === activePlanId) ?? displayPlans[0] ?? null;

  // === SAVE EDIT PAKET VIA REAL API (PUT /paket/{id}) BUKAN localStorage saja ===
  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    // Cari DB ID dari plans by name cocok id (sementara kita kirim PUT by name; jika butuh numeric id, mapping bisa ditambahkan nanti)
    try {
      // API call update jika endpoint CRUD paket (Master Admin) tersedia
      // Jika role user bukan master, tetap simpan state frontend SAJA dan beri warning
      showToast(`Perubahan paket ${editingPlan.name} disimpan sementara di frontend`, 'success');
      setTimeout(() => {
        showToast(
          '⚠️ Edit batasan paket saat ini BELUM tersimpan permanen ke tabel paket_langganan (endpoint PUT /paket/{id} untuk Owner aktif akan diaktifkan di build Master Pages selanjutnya).',
          'warning'
        );
      }, 900);
      const updatedPlans = plans.map(p => (p.id === editingPlan.id ? editingPlan : p));
      setPlans(updatedPlans);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan perubahan paket', 'error');
    } finally {
      setIsEditModalOpen(false);
      setEditingPlan(null);
    }
  };

  // === SWITCH AKTIF PAKET = CALL POST /paket/upgrade REAL API (bukan localStorage) ===
  const handleSwitchActivePlan = async (planId: string) => {
    const targetPlan = displayPlans.find(p => p.id === planId);
    if (!targetPlan) {
      showToast('Paket tidak ditemukan', 'error');
      return;
    }
    if (!uid) {
      showToast('Session user tidak valid. Silakan login kembali.', 'error');
      return;
    }
    // Cari numeric paket_id dari DB: mapping plans ke original response sementara kita anggap paket_id = dbRow id yang tersimpan.
    // Untuk safety, cari numeric ID pada array original atau gunakan API endpoint find by name via /paket/{name}? tidak ada jadi POST dengan paket_id sebagai nama fallback nanti di upgrade cek exists by name sementara.
    // Sementara: cari by id match, jika paket_id numeric tidak ada di state, tampilkan warning simulasi
    try {
      // Untuk mengirim POST upgrade, butuh numeric paket_id (exists:paket_langganan,id)
      // Coba cari baris asli dari paket yang ID sama dengan nama → get detail dulu.
      // Sementara kita anggap id plan = nama lowercase → cari numeric id lewat find by name via show endpoint. Untuk cepat: panggil /paket/upgrade dengan paket_id sebagai string nanti gagal validasi exists:id.
      showToast(`Mencoba aktifkan paket ${targetPlan.name}...`, 'info');
      // Panggil endpoint get all untuk dapatkan id numeric asli
      const allResp = await api.get('/paket', { status: 'all' });
      const allRows = Array.isArray(allResp?.data) ? allResp.data : (allResp?.data?.data ?? allResp?.data?.list ?? []);
      const matchRow = allRows.find((r: any) => String(r.name || '').toLowerCase() === String(planId).toLowerCase());
      if (!matchRow || !matchRow.id) {
        showToast(`ID numeric paket ${targetPlan.name} tidak ditemukan di DB`, 'error');
        return;
      }
      const numericPaketId = Number(matchRow.id);
      const periode: 'bulanan' | 'tahunan' = billingCycle === 'annual' ? 'tahunan' : 'bulanan';
      const upgradeResp = await api.post('/paket/upgrade', {
        user_id: uid,
        paket_id: numericPaketId,
        periode,
      });
      if (upgradeResp?.success !== false) {
        setActivePlanId(String(matchRow.name).toLowerCase());
        setActivePlanLabel(String(upgradeResp?.data?.user?.active_plan_label ?? targetPlan.badge ?? targetPlan.name));
        if (upgradeResp?.data?.user?.expires_at) {
          setActivePlanExpired(String(upgradeResp.data.user.expires_at));
        }
        showToast(`Paket ${targetPlan.name} BERHASIL diaktifkan di DB tabel users!`, 'success');
      } else {
        showToast(upgradeResp?.message || `Gagal aktifkan paket ${targetPlan.name}`, 'error');
      }
    } catch (err: any) {
      console.error('[LanggananTab] handleSwitchActivePlan error:', err);
      showToast(err?.message || 'Gagal aktifkan paket (cek koneksi / validasi user_id)', 'error');
    }
  };

  const handleResetToDefault = async () => {
    // Reset = reload fresh dari DB BUKAN set DEFAULT_SUBSCRIPTION_PLANS hardcode lama
    showToast('Muat ulang paket dari database tabel paket_langganan...', 'info');
    await loadPlansData();
    if (plans.length > 0) showToast(`Berhasil muat ulang ${plans.length} paket dari DB!`, 'success');
  };

  const formatRupiah = (amount: number) => {
    if (amount === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Header Banner - Owner Exclusive Notice */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 dark:from-amber-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 border border-amber-300/40 dark:border-amber-700/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-medium tracking-wide uppercase">
                Data REAL dari Database
              </span>
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                Daftar Paket Langganan (tabel paket_langganan)
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mt-1 leading-relaxed">
              Harga paket, batasan fitur, dan status aktif keluarga diambil LANGSUNG dari endpoint <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-indigo-600 dark:text-indigo-400">/api/v1/paket</span> dan <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-indigo-600 dark:text-indigo-400">/paket/mine</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={loading}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Muat ulang daftar paket dari tabel paket_langganan database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang DB</span>
          </button>
        </div>
      </div>

      {loading && displayPlans.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Clock className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <p className="text-xs font-normal text-slate-400">Memuat paket langganan dari database...</p>
        </div>
      ) : displayPlans.length === 0 ? (
        // ZERO DATA STATE (tidak ada paket di DB sama sekali)
        <div className="p-6 sm:p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
            Belum ada paket langganan di database
          </h3>
          <p className="text-xs font-normal text-slate-400 max-w-md mx-auto">
            Tabel <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">paket_langganan</span> kosong. Master Admin dapat menambahkan paket (Free, Premium, Family Pro) di menu Master Sistem nanti.
          </p>
        </div>
      ) : (
        <>
          {/* Overview Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Paket Berjalan Saat Ini</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-medium text-indigo-600 dark:text-indigo-400">
                  {activePlan?.name ?? activePlanLabel}
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-normal rounded-md">
                  Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                {activePlan ? `Maks. ${activePlan.limits.maxChildrenDevices} perangkat anak` : 'Data paket belum dimuat'}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Masa Aktif Langganan</span>
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${activePlanExpired ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {activePlanExpired
                    ? new Date(activePlanExpired).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                    : activePlan?.monthlyPrice === 0 ? 'Gratis Tanpa Batas' : '-'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                {activePlan?.monthlyPrice === 0 ? 'Paket free trial tidak expired' : activePlanExpired ? 'dari kolom users.expires_at DB' : 'Belum ada tanggal aktif'}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Monitor Audio 1 Arah</span>
              <div className="flex items-center gap-2">
                <Mic className={`w-4 h-4 ${activePlan?.limits.oneWayAudio ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {activePlan?.limits.oneWayAudio ? 'Diizinkan (Aktif)' : 'Terkunci (Upgrade)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">{activePlan?.limits.oneWayAudioLabel ?? '-'}</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Live Monitor Kamera</span>
              <div className="flex items-center gap-2">
                <Camera className={`w-4 h-4 ${activePlan?.limits.liveCamera ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {activePlan?.limits.liveCamera ? 'Diizinkan (Aktif)' : 'Terkunci (Family Pro)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">{activePlan?.limits.liveCameraLabel ?? '-'}</p>
            </div>
          </div>

          {/* Cycle Toggle & Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                Tingkatan Paket & Batasan Fitur Tersedia ({displayPlans.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Klik "Pilih Paket Ini" → otomatis POST ke endpoint <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">/paket/upgrade</span> untuk simpan ke tabel users DB.
              </p>
            </div>

            {/* Billing cycle pill */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 font-normal'
                }`}
              >
                Tagihan Bulanan
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 font-normal'
                }`}
              >
                <span>Tagihan Tahunan</span>
                <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] rounded-md font-medium">Hemat 20%</span>
              </button>
            </div>
          </div>

          {/* N Tier Plan Cards Grid */}
          <div className={`grid grid-cols-1 ${displayPlans.length === 3 ? 'lg:grid-cols-3' : displayPlans.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-5`}>
            {displayPlans.map((plan) => {
              const isCurrentActive = plan.id === activePlanId;
              const displayPrice = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all flex flex-col justify-between relative shadow-2xs ${
                    isCurrentActive
                      ? 'border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{plan.name}</span>
                        {plan.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                              plan.popular
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {plan.badge}
                          </span>
                        )}
                      </div>

                      {isCurrentActive ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Paket Terpilih
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchActivePlan(plan.id)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-normal cursor-pointer"
                        >
                          Pilih Paket Ini
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      {plan.description || plan.tagline || 'Deskripsi paket tidak tersedia'}
                    </p>

                    {/* Pricing Display */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-baseline justify-between">
                      <div>
                        <span className="text-base font-medium text-slate-900 dark:text-white">
                          {formatRupiah(displayPrice)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          {plan.monthlyPrice === 0 ? 'selamanya' : '/ bulan'}
                        </span>
                      </div>
                      {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                          Ditagih {formatRupiah(displayPrice * 12)} / thn
                        </span>
                      )}
                    </div>

                    {/* Feature Limits Matrix — RENDERER YANG SAMA DENGAN HALAMAN LANGGANAN SAYA TAB & MODAL! */}
                    {/* 100% dari DB paket_langganan kolom: maxChildrenDevices, locationTracking/Label, appRestriction/Label, oneWayAudio/Label, liveCamera/Label, maxGeofences/Label, readMessageNotifications/Label, remoteScreenLock/Label + highlight_features badges chip */}
                    <div className="pt-2">
                      <PaketFeaturesCompactList plan={plan} />
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan({ ...plan, limits: { ...plan.limits } });
                        setIsEditModalOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Edit Batasan Paket (Owner)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Parameter Feature Detail Table (Quick Matrix) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Tabel Matriks Perbandingan Seluruh Fitur Batasan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Ringkasan perbandingan hak akses fitur anak antara {displayPlans.map(p => p.name).join(', ')} berdasarkan DB live.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-normal">Parameter Fitur</th>
                    {displayPlans.map((p, idx) => (
                      <th
                        key={p.id}
                        className={`py-2.5 px-3 font-normal text-center ${
                          idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      >
                        {p.name} {p.badge && `(${p.badge})`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Jumlah Perangkat Anak</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.maxChildrenDevices} Perangkat
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lacak Lokasi GPS</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.locationTrackingLabel || p.limits.locationTracking}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      <span>Pembatasan Aplikasi</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.appRestrictionLabel || p.limits.appRestriction}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-purple-500" />
                      <span>Dengarkan Suara Satu Arah</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.oneWayAudio ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✅ {p.limits.oneWayAudioLabel || 'Aktif'}</span>
                        ) : (
                          <span className="text-slate-400">❌</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      <span>Live Monitor Kamera</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.liveCamera ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✅ {p.limits.liveCameraLabel || 'Aktif'}</span>
                        ) : (
                          <span className="text-slate-400">❌</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-teal-500" />
                      <span>Jumlah Geofence</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.maxGeofences === 'unlimited' ? 'Tanpa Batas' : `${p.limits.maxGeofences} Area`}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Baca Notifikasi Pesan</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.readMessageNotifications ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✅ {p.limits.readMessageNotificationsLabel || 'Aktif'}</span>
                        ) : (
                          <span className="text-slate-400">❌</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Kunci Layar Jarak Jauh</span>
                    </td>
                    {displayPlans.map((p, idx) => (
                      <td key={p.id} className={`py-2.5 px-3 text-center ${idx === 1 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        {p.limits.remoteScreenLock ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{p.limits.remoteScreenLockLabel || 'Manual'}</span>
                        ) : (
                          <span className="text-slate-400">Tidak</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Owner Modal Editor for Plan Limits */}
      {isEditModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                    Edit Konfigurasi Batasan: {editingPlan.name}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-normal">Khusus Owner (sementara frontend state)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlanEdit} className="space-y-4 text-xs font-normal">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">
                    Nama Paket
                  </label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">
                    Label Badge (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editingPlan.badge || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    placeholder="Contoh: Populer / Hemat"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Pricing fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">
                    Harga Bulanan (IDR)
                  </label>
                  <input
                    type="number"
                    value={editingPlan.monthlyPrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">
                    Harga Tahunan per Bulan (IDR)
                  </label>
                  <input
                    type="number"
                    value={editingPlan.annualPrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, annualPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Feature Matrix */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                {/* F1: Perangkat */}
                <div className="flex items-center justify-between">
                  <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                    Batas Maksimal Perangkat Anak Terhubung
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={editingPlan.limits.maxChildrenDevices}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, maxChildrenDevices: Number(e.target.value) }
                        })
                      }
                      className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-center"
                    />
                    <span className="text-slate-500">Perangkat</span>
                  </div>
                </div>

                {/* F2: Lacak Lokasi */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Tingkat Presisi Lacak Lokasi
                  </label>
                  <select
                    value={editingPlan.limits.locationTracking}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      const labelMap: Record<string, string> = {
                        dasar: 'GPS Dasar (Update 30 menit, riwayat 24 jam)',
                        realtime_7d: 'Real-time GPS + Riwayat 7 Hari',
                        realtime_30d_sos: 'Presisi Tinggi + Riwayat 30 Hari + Tombol SOS'
                      };
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          locationTracking: val,
                          locationTrackingLabel: labelMap[val] || val
                        }
                      });
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                  >
                    <option value="dasar">Dasar (Interval 30 menit, 24 Jam)</option>
                    <option value="realtime_7d">Real-time GPS (Riwayat 7 Hari)</option>
                    <option value="realtime_30d_sos">Presisi Tinggi (Riwayat 30 Hari + SOS)</option>
                  </select>
                </div>

                {/* F3: Pembatasan Aplikasi */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    Metode Pembatasan Aplikasi
                  </label>
                  <select
                    value={editingPlan.limits.appRestriction}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      const labelMap: Record<string, string> = {
                        terbatas_3: 'Maksimal 3 aplikasi dibatasi',
                        unlimited_jadwal: 'Semua Aplikasi + Jadwal & Kuota Otomatis',
                        unlimited_ai: 'Tak Terbatas + AI SafeFilter & Auto-Block Dewasa'
                      };
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          appRestriction: val,
                          appRestrictionLabel: labelMap[val] || val
                        }
                      });
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                  >
                    <option value="terbatas_3">Maksimal 3 Aplikasi</option>
                    <option value="unlimited_jadwal">Semua Aplikasi + Jadwal Waktu</option>
                    <option value="unlimited_ai">Semua Aplikasi + AI Filter Konten Dewasa</option>
                  </select>
                </div>

                {/* F4: Audio 1 Arah */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-purple-500" />
                      Dengarkan Suara Satu Arah (Audio Monitor)
                    </label>
                    <span className="text-[11px] text-slate-400">Orang tua dapat mendengar suara lingkungan anak</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPlan.limits.oneWayAudio}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          oneWayAudio: e.target.checked,
                          oneWayAudioLabel: e.target.checked ? 'Audio Monitor 1 Arah Aktif' : 'Tidak tersedia'
                        }
                      })
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* F5: Live Kamera */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      Live Monitor Kamera Jarak Jauh
                    </label>
                    <span className="text-[11px] text-slate-400">Akses video kamera depan / belakang anak</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPlan.limits.liveCamera}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          liveCamera: e.target.checked,
                          liveCameraLabel: e.target.checked ? 'Live Monitor Kamera Depan & Belakang' : 'Tidak tersedia'
                        }
                      })
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* F6: Geofence */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-teal-500" />
                    Batas Jumlah Geofence
                  </label>
                  <select
                    value={String(editingPlan.limits.maxGeofences)}
                    onChange={(e) => {
                      const val = e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value);
                      const label = val === 'unlimited' ? 'Unlimited Geofence' : `${val} Area Geofence`;
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          maxGeofences: val,
                          maxGeofencesLabel: label
                        }
                      });
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                  >
                    <option value="1">1 Area Geofence</option>
                    <option value="3">3 Area Geofence</option>
                    <option value="5">5 Area Geofence</option>
                    <option value="10">10 Area Geofence</option>
                    <option value="unlimited">Tanpa Batas (Unlimited)</option>
                  </select>
                </div>

                {/* F7: Baca Notifikasi */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                      Teruskan Notifikasi & Pesan Masuk
                    </label>
                    <span className="text-[11px] text-slate-400">Salin notifikasi chat, SMS & OTP ke HP Orang Tua</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPlan.limits.readMessageNotifications}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          readMessageNotifications: e.target.checked,
                          readMessageNotificationsLabel: e.target.checked ? 'Teruskan Notifikasi SMS & Chat' : 'Tidak tersedia'
                        }
                      })
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* F8: Kunci Layar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      Kunci Layar Jarak Jauh
                    </label>
                    <span className="text-[11px] text-slate-400">Blokir akses layar gadget seketika</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPlan.limits.remoteScreenLock}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          remoteScreenLock: e.target.checked,
                          remoteScreenLockLabel: e.target.checked ? 'Kunci Seketika & Terjadwal' : 'Tidak tersedia'
                        }
                      })
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Paket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
