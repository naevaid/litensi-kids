import React, { useState, useEffect } from 'react';
import {
  Crown, Smartphone, MapPin, Shield, Mic, Camera,
  Navigation, MessageSquare, Lock, Check, X,
  Edit3, Sparkles, RefreshCw, Layers, CheckCircle2,
  Sliders, ShieldCheck, ToggleLeft, ToggleRight, Radio,
  Users, BarChart3, TrendingUp
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionLimits } from '../../types';
import { api } from '../../lib/apiClient';

export interface MasterPaketPageProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Mapping ID PK numeric DB → slug SubscriptionPlan (stabil untuk .find(p.id === 'free'))
const DB_ID_TO_SLUG: Record<number, 'free' | 'premium' | 'family_pro'> = {
  1: 'free',
  2: 'premium',
  3: 'family_pro',
};

// Mapper snake_case DB flat fields → camelCase TS nested SubscriptionPlan + SubscriptionLimits
const mapDbPaketToSubscriptionPlan = (db: any): SubscriptionPlan => {
  const rawMaxGeofences = db.max_geofences;
  let maxGeofences: number | 'unlimited';
  if (typeof rawMaxGeofences === 'string' && rawMaxGeofences.toLowerCase() === 'unlimited') {
    maxGeofences = 'unlimited';
  } else if (rawMaxGeofences === null || rawMaxGeofences === undefined) {
    maxGeofences = 1;
  } else {
    maxGeofences = Number(rawMaxGeofences);
  }

  const limits: SubscriptionLimits = {
    maxChildrenDevices: Number(db.max_children_devices ?? 1),
    locationTracking: (db.location_tracking ?? 'dasar') as SubscriptionLimits['locationTracking'],
    locationTrackingLabel: String(db.location_tracking_label ?? db.location_tracking ?? ''),
    appRestriction: (db.app_restriction ?? 'terbatas_3') as SubscriptionLimits['appRestriction'],
    appRestrictionLabel: String(db.app_restriction_label ?? db.app_restriction ?? ''),
    oneWayAudio: Boolean(db.one_way_audio ?? false),
    oneWayAudioLabel: String(db.one_way_audio_label ?? (db.one_way_audio ? 'Aktif' : 'Tidak tersedia')),
    liveCamera: Boolean(db.live_camera ?? false),
    liveCameraLabel: String(db.live_camera_label ?? (db.live_camera ? 'Aktif' : 'Tidak tersedia')),
    maxGeofences,
    maxGeofencesLabel: String(db.max_geofences_label ?? `${maxGeofences} Area`),
    readMessageNotifications: Boolean(db.read_message_notifications ?? false),
    readMessageNotificationsLabel: String(db.read_message_notifications_label ?? (db.read_message_notifications ? 'Aktif' : 'Tidak tersedia')),
    remoteScreenLock: Boolean(db.remote_screen_lock ?? false),
    remoteScreenLockLabel: String(db.remote_screen_lock_label ?? (db.remote_screen_lock ? 'Aktif' : 'Tidak tersedia')),
  };

  const idNumeric = Number(db.id ?? 0);
  const planSlug = DB_ID_TO_SLUG[idNumeric] ?? String(db.id ?? 'paket_baru');
  const monthlyPrice = Number(db.monthly_price ?? 0);
  const annualPriceTotal = Number(db.annual_price ?? 0);
  const annualPricePerMonth = annualPriceTotal > 0 ? Math.round(annualPriceTotal / 12) : 0;

  let highlightFeatures: string[] = [];
  try {
    if (Array.isArray(db.highlight_features)) {
      highlightFeatures = db.highlight_features.map((f: any) => String(f));
    } else if (typeof db.highlight_features === 'string') {
      highlightFeatures = JSON.parse(db.highlight_features);
      if (!Array.isArray(highlightFeatures)) highlightFeatures = [];
    }
  } catch (e) {
    highlightFeatures = [];
  }

  return {
    id: planSlug,
    name: String(db.name ?? planSlug),
    badge: db.badge ? String(db.badge) : undefined,
    popular: Boolean(db.popular ?? false),
    tagline: String(db.tagline ?? ''),
    description: String(db.description ?? ''),
    monthlyPrice,
    annualPrice: annualPricePerMonth,
    limits,
    highlightFeatures,
    activeUsersCount: Number(db.active_users_count ?? 0),
    status: (db.status === 'archived' ? 'archived' : 'active') as SubscriptionPlan['status'],
  };
};

export const MasterPaketPage: React.FC<MasterPaketPageProps> = ({ showToast }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load data paket dari GET /api/v1/paket
  const loadData = async () => {
    console.groupCollapsed('%c[MasterPaket] Load Daftar Paket Langganan', 'color:#b45309;font-weight:bold');
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get<any>('/paket', {});
      console.debug('Response raw:', res);
      if (res?.ok) {
        // apiClient unwrap: res.data = payload data array of PaketLangganan
        const listData = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.list) ? res.data.list : []);
        console.debug(`Ditemukan ${listData.length} paket dari API`);
        const mapped = listData.map(mapDbPaketToSubscriptionPlan);
        console.debug('Hasil mapping snake→camel (id slug + nested limits):', mapped);
        setPlans(mapped);
      } else {
        console.warn('Response tidak OK:', res?.status, res?.message);
        setErrorMsg(res?.message || 'Gagal memuat daftar paket langganan dari server.');
      }
    } catch (err: any) {
      console.error('Exception fetch /paket:', err);
      setErrorMsg(err?.message || 'Terjadi kesalahan jaringan saat memuat data paket.');
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePlanEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const updatedPlans = plans.map(p => (p.id === editingPlan.id ? editingPlan : p));
    setPlans(updatedPlans);
    setIsEditModalOpen(false);
    setEditingPlan(null);
    console.debug('[MasterPaket] Save edit plan state local:', editingPlan.name);
    showToast(`Master: Batasan paket ${editingPlan.name} berhasil diperbarui! (sync ke DB via API belum diterapkan)`, 'success');
  };

  const handleResetToDefault = () => {
    console.debug('[MasterPaket] Reset to API data');
    loadData();
    showToast('Konfigurasi paket dikembalikan ke data server database.', 'info');
  };

  const formatRupiah = (amount: number) => {
    if (amount === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalRegisteredUsers = plans.reduce((acc, curr) => acc + (curr.activeUsersCount || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Loading / Error Banner */}
      {(errorMsg || loading) && (
        <div className={`p-3.5 rounded-2xl border flex items-start sm:items-center gap-3 text-xs font-normal shadow-2xs ${
          errorMsg ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                   : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
        }`}>
          <RefreshCw className={`w-4 h-4 mt-0.5 sm:mt-0 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          <div className="flex-1">
            <span className="font-medium block">{loading ? 'Memuat daftar paket & batasan fitur dari server...' : 'Terjadi kesalahan saat memuat data paket langganan'}</span>
            {errorMsg && <span className="mt-0.5 block opacity-90">{errorMsg}</span>}
          </div>
          {errorMsg && (
            <button type="button" onClick={loadData} className="px-3 py-1.5 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-300 rounded-xl text-[11px] font-medium border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors shrink-0 cursor-pointer">Coba Lagi</button>
          )}
        </div>
      )}

      {/* Header Banner - Master Exclusive */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/15 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-indigo-950/30 border border-amber-300/50 dark:border-amber-700/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-600 text-white rounded-md text-[10px] font-medium tracking-wide uppercase">
                MASTER MENU / PEMILIK WEB APP
              </span>
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                Master Kelola Paket Langganan & Batasan Fitur
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mt-1 leading-relaxed">
              Halaman khusus pemilik web app untuk menetapkan tarif harga, kuota perangkat anak, aktivasi audio monitor 1 arah, live kamera, batas geofence, dan izin notifikasi pada tiap tier langganan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            title="Muat ulang data paket dari database server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Kembalikan semua batasan fitur ke data server database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Total Pengguna Terdaftar</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-indigo-600 dark:text-indigo-400">{totalRegisteredUsers.toLocaleString('id-ID')}</span>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-normal rounded-md">
              Keluarga
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Di seluruh paket layanan</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Pelanggan Family Pro</span>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-base font-medium text-slate-900 dark:text-white">
              {plans.find(p => p.id === 'family_pro')?.activeUsersCount || 890}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">+18% bln ini</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Paket terlengkap (Live Kamera)</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Pelanggan Premium</span>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-base font-medium text-slate-900 dark:text-white">
              {plans.find(p => p.id === 'premium')?.activeUsersCount || 1250}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">Paling Populer</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Paket 1-3 anak & audio monitor</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Pengguna Free (Gratis)</span>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-base font-medium text-slate-900 dark:text-white">
              {plans.find(p => p.id === 'free')?.activeUsersCount || 342}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Freemium</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">1 Perangkat anak dasar</p>
        </div>
      </div>

      {/* Cycle Toggle & Master Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Konfigurasi Tingkatan Paket & Parameter Pembatasan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Pilih "Edit Batasan Paket" untuk merubah kuota fitur atau harga yang berlaku ke pengguna.
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

      {/* 3 Tier Plan Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const displayPrice = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between relative shadow-2xs"
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

                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    {plan.activeUsersCount} Pengguna
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                  {plan.description}
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

                {/* Feature Limits Matrix */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-normal">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">
                    Batasan Fitur Proteksi:
                  </span>

                  {/* 1. Jumlah Perangkat Anak */}
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Jumlah Perangkat Anak
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 font-medium text-right">
                      {plan.limits.maxChildrenDevices} Perangkat
                    </span>
                  </div>

                  {/* 2. Lacak Lokasi */}
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      Lacak Lokasi
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 font-medium text-right text-[11px] max-w-[140px]">
                      {plan.limits.locationTrackingLabel}
                    </span>
                  </div>

                  {/* 3. Pembatasan Aplikasi */}
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Pembatasan Aplikasi
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 font-medium text-right text-[11px] max-w-[140px]">
                      {plan.limits.appRestrictionLabel}
                    </span>
                  </div>

                  {/* 4. Dengarkan Suara Satu Arah */}
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      Suara Satu Arah
                    </span>
                    <span className="text-right">
                      {plan.limits.oneWayAudio ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end">
                          <Check className="w-3.5 h-3.5" /> Tersedia
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal flex items-center gap-1 justify-end">
                          <X className="w-3.5 h-3.5" /> Tidak ada
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 5. Live Monitor Kamera */}
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Live Monitor Kamera
                    </span>
                    <span className="text-right">
                      {plan.limits.liveCamera ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end">
                          <Check className="w-3.5 h-3.5" /> Tersedia
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal flex items-center gap-1 justify-end">
                          <X className="w-3.5 h-3.5" /> Tidak ada
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 6. Jumlah Geofence */}
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      Jumlah Geofence
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 font-medium text-right">
                      {plan.limits.maxGeofencesLabel}
                    </span>
                  </div>

                  {/* 7. Baca Notifikasi Pesan */}
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      Notifikasi Pesan
                    </span>
                    <span className="text-right">
                      {plan.limits.readMessageNotifications ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end">
                          <Check className="w-3.5 h-3.5" /> Tersedia
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal flex items-center gap-1 justify-end">
                          <X className="w-3.5 h-3.5" /> Tidak ada
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 8. Kunci Layar Jarak Jauh */}
                  <div className="flex items-start justify-between py-1 gap-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Kunci Layar Jarak Jauh
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end">
                      <Check className="w-3.5 h-3.5" /> {plan.limits.remoteScreenLockLabel}
                    </span>
                  </div>
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
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Batasan Paket & Harga</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Master Modal Editor for Plan Limits */}
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
                    Master Konfigurasi Batasan: {editingPlan.name}
                  </h3>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">Wewenang Master / Super Admin</span>
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
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
                    placeholder="Contoh: Populer / Terlengkap"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                    min="0"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">
                  Deskripsi Singkat Paket
                </label>
                <textarea
                  rows={2}
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Feature 1: Jumlah Perangkat Anak */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
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
                      className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-center text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-500">Perangkat</span>
                  </div>
                </div>

                {/* Feature 2: Lacak Lokasi */}
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
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white"
                  >
                    <option value="dasar">Dasar (Interval 30 menit, 24 Jam)</option>
                    <option value="realtime_7d">Real-time GPS (Riwayat 7 Hari)</option>
                    <option value="realtime_30d_sos">Presisi Tinggi (Riwayat 30 Hari + SOS)</option>
                  </select>
                </div>

                {/* Feature 3: Pembatasan Aplikasi */}
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
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white"
                  >
                    <option value="terbatas_3">Maksimal 3 Aplikasi</option>
                    <option value="unlimited_jadwal">Semua Aplikasi + Jadwal Waktu</option>
                    <option value="unlimited_ai">Semua Aplikasi + AI Filter Konten Dewasa</option>
                  </select>
                </div>

                {/* Feature 4: Dengarkan Suara Satu Arah Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-purple-500" />
                      Dengarkan Suara Satu Arah (Audio Monitor)
                    </label>
                    <span className="text-[11px] text-slate-400">Izinkan orang tua mendengarkan audio sekitar anak</span>
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

                {/* Feature 5: Live Monitor Kamera Toggle */}
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

                {/* Feature 6: Geofences */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-teal-500" />
                    Kapasitas Area Geofence
                  </label>
                  <select
                    value={String(editingPlan.limits.maxGeofences)}
                    onChange={(e) => {
                      const val = e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value);
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          maxGeofences: val,
                          maxGeofencesLabel: val === 'unlimited' ? 'Unlimited Geofence + Alert Seketika' : `${val} Area Geofence`
                        }
                      });
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white"
                  >
                    <option value="1">1 Area</option>
                    <option value="3">3 Area</option>
                    <option value="5">5 Area</option>
                    <option value="10">10 Area</option>
                    <option value="unlimited">Tanpa Batas (Unlimited)</option>
                  </select>
                </div>

                {/* Feature 7: Baca Notifikasi Pesan */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <label className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                      Teruskan Notifikasi Pesan (SMS & Chat)
                    </label>
                    <span className="text-[11px] text-slate-400">Sinkronisasi pesan masuk perangkat anak</span>
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
                          readMessageNotificationsLabel: e.target.checked
                            ? 'Lengkap (WhatsApp, SMS, OTP & Peringatan Kata Sensitif)'
                            : 'Tidak tersedia'
                        }
                      })
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-normal cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
