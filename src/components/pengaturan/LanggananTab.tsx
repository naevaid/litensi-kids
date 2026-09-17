import React, { useState, useEffect } from 'react';
import {
  Crown, Smartphone, MapPin, Shield, Mic, Camera,
  Navigation, MessageSquare, Lock, Check, X,
  Edit3, Save, Sparkles, RefreshCw, AlertCircle,
  HelpCircle, ChevronRight, Layers, ArrowUpRight, CheckCircle2,
  Sliders, ShieldCheck, ToggleLeft, ToggleRight, Radio
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionLimits } from '../../types';

export interface LanggananTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free (Dasar)',
    tagline: 'Perlindungan esensial untuk 1 anak / perangkat',
    description: 'Cocok untuk orang tua yang baru memulai pengawasan dasar aktivitas perangkat anak.',
    monthlyPrice: 0,
    annualPrice: 0,
    badge: 'Gratis',
    popular: false,
    status: 'active',
    activeUsersCount: 342,
    limits: {
      maxChildrenDevices: 1,
      locationTracking: 'dasar',
      locationTrackingLabel: 'GPS Dasar (Update 30 menit, riwayat 24 jam)',
      appRestriction: 'terbatas_3',
      appRestrictionLabel: 'Maksimal 3 aplikasi dibatasi',
      oneWayAudio: false,
      oneWayAudioLabel: 'Tidak tersedia',
      liveCamera: false,
      liveCameraLabel: 'Tidak tersedia',
      maxGeofences: 1,
      maxGeofencesLabel: '1 Area Geofence',
      readMessageNotifications: false,
      readMessageNotificationsLabel: 'Tidak tersedia',
      remoteScreenLock: true,
      remoteScreenLockLabel: 'Kunci Layar Manual'
    },
    highlightFeatures: [
      '1 Perangkat Anak Terhubung',
      'Lacak Lokasi Dasar 24 Jam',
      'Kunci Layar Seketika (Manual)',
      '1 Area Geofence Aman/Bahaya',
      'Pembatasan Maksimal 3 Aplikasi'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Pengawasan terarah & audio monitor untuk 1-3 anak',
    description: 'Paling diminati untuk perlindungan harian keluarga dengan pantauan audio 1 arah dan geofence lebih luas.',
    monthlyPrice: 49000,
    annualPrice: 39000,
    badge: 'Populer',
    popular: true,
    status: 'active',
    activeUsersCount: 1250,
    limits: {
      maxChildrenDevices: 3,
      locationTracking: 'realtime_7d',
      locationTrackingLabel: 'Real-time GPS + Riwayat 7 Hari',
      appRestriction: 'unlimited_jadwal',
      appRestrictionLabel: 'Semua Aplikasi + Jadwal & Kuota Otomatis',
      oneWayAudio: true,
      oneWayAudioLabel: 'Audio Monitor 1 Arah Aktif',
      liveCamera: false,
      liveCameraLabel: 'Tidak tersedia',
      maxGeofences: 5,
      maxGeofencesLabel: '5 Area Geofence Aman & Bahaya',
      readMessageNotifications: true,
      readMessageNotificationsLabel: 'Teruskan Notifikasi SMS & Chat Dasar',
      remoteScreenLock: true,
      remoteScreenLockLabel: 'Kunci Seketika & Terjadwal (Jam Tidur/Belajar)'
    },
    highlightFeatures: [
      'Hingga 3 Perangkat Anak',
      'Lacak Lokasi Real-time & Riwayat 7 Hari',
      'Dengarkan Suara Sekitar 1 Arah',
      '5 Area Geofence Notifikasi Otomatis',
      'Pembatasan Aplikasi Tanpa Batas & Terjadwal',
      'Baca Notifikasi Masuk SMS & Chat',
      'Kunci Layar Seketika & Otomatis Jam Belajar'
    ]
  },
  {
    id: 'family_pro',
    name: 'Family Pro',
    tagline: 'Proteksi terlengkap tanpa batas dengan live kamera & AI filter',
    description: 'Solusi keamanan total untuk seluruh anggota keluarga dengan live kamera 360°, audio HD, dan deteksi kata sensitif.',
    monthlyPrice: 99000,
    annualPrice: 79000,
    badge: 'Terlengkap',
    popular: false,
    status: 'active',
    activeUsersCount: 890,
    limits: {
      maxChildrenDevices: 10,
      locationTracking: 'realtime_30d_sos',
      locationTrackingLabel: 'Presisi Tinggi + Riwayat 30 Hari + Tombol SOS',
      appRestriction: 'unlimited_ai',
      appRestrictionLabel: 'Tak Terbatas + AI SafeFilter & Auto-Block Konten Dewasa',
      oneWayAudio: true,
      oneWayAudioLabel: 'Audio Monitor 1 Arah HD Unlimited',
      liveCamera: true,
      liveCameraLabel: 'Live Monitor Kamera Depan & Belakang',
      maxGeofences: 'unlimited',
      maxGeofencesLabel: 'Unlimited Geofence + Alert Seketika',
      readMessageNotifications: true,
      readMessageNotificationsLabel: 'Lengkap (WhatsApp, SMS, OTP & Peringatan Kata Sensitif)',
      remoteScreenLock: true,
      remoteScreenLockLabel: 'Kunci Seketika, Modus Darurat SOS & Jam Terjadwal'
    },
    highlightFeatures: [
      'Hingga 10 Perangkat Anak Terhubung',
      'Lacak Lokasi Presisi Tinggi + Riwayat 30 Hari',
      'Live Monitor Kamera Depan & Belakang Anak',
      'Dengarkan Suara 1 Arah Kualitas HD',
      'Geofence Tak Terbatas (Unlimited Areas)',
      'Baca Notifikasi Lengkap (WA, SMS, Game, OTP)',
      'Filter AI Konten Dewasa & Pembatasan Aplikasi',
      'Kunci Layar Jarak Jauh + Modus Darurat SOS'
    ]
  }
];

export const LanggananTab: React.FC<LanggananTabProps> = ({ showToast }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => {
    const saved = localStorage.getItem('litensi_subscription_plans');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SUBSCRIPTION_PLANS;
      }
    }
    return DEFAULT_SUBSCRIPTION_PLANS;
  });

  // Current active subscription tier for this family account
  const [activePlanId, setActivePlanId] = useState<string>(() => {
    return localStorage.getItem('litensi_active_plan') || 'family_pro';
  });

  // Billing period toggle (monthly vs annual)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Modal editor state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Quick stats
  const activePlan = plans.find(p => p.id === activePlanId) || plans[1];

  const handleSavePlanEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const updatedPlans = plans.map(p => (p.id === editingPlan.id ? editingPlan : p));
    setPlans(updatedPlans);
    localStorage.setItem('litensi_subscription_plans', JSON.stringify(updatedPlans));
    setIsEditModalOpen(false);
    setEditingPlan(null);
    showToast(`Perubahan paket ${editingPlan.name} berhasil disimpan oleh Owner!`, 'success');
  };

  const handleSwitchActivePlan = (planId: string) => {
    setActivePlanId(planId);
    localStorage.setItem('litensi_active_plan', planId);
    const targetPlan = plans.find(p => p.id === planId);
    showToast(`Paket aktif keluarga berhasil disesuaikan ke ${targetPlan?.name || planId}`, 'info');
  };

  const handleResetToDefault = () => {
    setPlans(DEFAULT_SUBSCRIPTION_PLANS);
    localStorage.setItem('litensi_subscription_plans', JSON.stringify(DEFAULT_SUBSCRIPTION_PLANS));
    showToast('Seluruh batasan paket berhasil di-reset ke nilai bawaan standar', 'info');
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
                Khusus Owner / Super Admin
              </span>
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                Kelola Paket Langganan & Konfigurasi Batasan Fitur
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mt-1 leading-relaxed">
              Atur kuota perangkat anak, aktivasi monitor suara 1 arah, live kamera, batas geofence, baca notifikasi pesan, dan kunci layar jarak jauh untuk setiap tingkatan paket (Free, Premium, Family Pro).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Kembalikan semua batasan fitur ke bawaan sistem"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>
        </div>
      </div>

      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Paket Berjalan Saat Ini</span>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-medium text-indigo-600 dark:text-indigo-400">{activePlan.name}</span>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-normal rounded-md">
              Aktif
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Maks. {activePlan.limits.maxChildrenDevices} perangkat anak</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Monitor Audio 1 Arah</span>
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${activePlan.limits.oneWayAudio ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {activePlan.limits.oneWayAudio ? 'Diizinkan (Aktif)' : 'Terkunci (Upgrade)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">{activePlan.limits.oneWayAudioLabel}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Live Monitor Kamera</span>
          <div className="flex items-center gap-2">
            <Camera className={`w-4 h-4 ${activePlan.limits.liveCamera ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {activePlan.limits.liveCamera ? 'Diizinkan (Aktif)' : 'Terkunci (Family Pro)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">{activePlan.limits.liveCameraLabel}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Kapasitas Geofences</span>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {activePlan.limits.maxGeofences === 'unlimited' ? 'Tanpa Batas' : `${activePlan.limits.maxGeofences} Area`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Notifikasi masuk & keluar area</p>
        </div>
      </div>

      {/* Cycle Toggle & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Tingkatan Paket & Batasan Fitur Tersedia
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Klik tombol "Edit Batasan" untuk menyesuaikan kuota parameter dan harga pada masing-masing paket.
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
              Ringkasan perbandingan hak akses fitur anak antara paket Free, Premium, dan Family Pro.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-normal">Parameter Fitur</th>
                <th className="py-2.5 px-3 font-normal text-center">Free (Dasar)</th>
                <th className="py-2.5 px-3 font-normal text-center bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                  Premium (Populer)
                </th>
                <th className="py-2.5 px-3 font-normal text-center">Family Pro (Terlengkap)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Jumlah Perangkat Anak</span>
                </td>
                <td className="py-2.5 px-3 text-center">1 Perangkat</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20 font-medium text-slate-900 dark:text-white">
                  3 Perangkat
                </td>
                <td className="py-2.5 px-3 text-center font-medium text-indigo-600 dark:text-indigo-400">
                  10 Perangkat
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Lacak Lokasi GPS</span>
                </td>
                <td className="py-2.5 px-3 text-center text-slate-500">Dasar (30 Menit)</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20">Real-time (7 Hari)</td>
                <td className="py-2.5 px-3 text-center font-medium text-emerald-600 dark:text-emerald-400">
                  Real-time Presisi (30 Hari + SOS)
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span>Pembatasan Aplikasi</span>
                </td>
                <td className="py-2.5 px-3 text-center text-slate-500">Maks. 3 Aplikasi</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20">Bebas + Jadwal Otomatis</td>
                <td className="py-2.5 px-3 text-center font-medium text-indigo-600 dark:text-indigo-400">
                  AI SafeFilter + Auto-Block Dewasa
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-purple-500" />
                  <span>Dengarkan Suara Satu Arah</span>
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400">❌</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20 text-emerald-600 dark:text-emerald-400">
                  ✅ Audio Monitor Aktif
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                  ✅ Audio Monitor HD Unlimited
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span>Live Monitor Kamera</span>
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400">❌</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20 text-slate-400">❌</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                  ✅ Kamera Depan & Belakang
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-teal-500" />
                  <span>Jumlah Geofence</span>
                </td>
                <td className="py-2.5 px-3 text-center">1 Area</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20">5 Area</td>
                <td className="py-2.5 px-3 text-center text-indigo-600 dark:text-indigo-400 font-medium">
                  Tanpa Batas (Unlimited)
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Baca Notifikasi Pesan</span>
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400">❌</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20 text-emerald-600 dark:text-emerald-400">
                  ✅ SMS & Chat Masuk
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                  ✅ WhatsApp, SMS, Game, & Alert OTP
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Kunci Layar Jarak Jauh</span>
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">Manual</td>
                <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20 text-emerald-600 dark:text-emerald-400">
                  Manual & Terjadwal
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                  Manual, Jadwal & Modus SOS
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
                  <span className="text-[11px] text-slate-400 font-normal">Khusus Owner</span>
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
                      className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-center"
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
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
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
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
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

                {/* Feature 6: Batas Jumlah Geofence */}
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

                {/* Feature 7: Baca Notifikasi Pesan */}
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

                {/* Feature 8: Kunci Layar Jarak Jauh */}
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
