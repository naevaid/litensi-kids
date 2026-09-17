import React, { useState } from 'react';
import {
  Crown, Smartphone, MapPin, Shield, Mic, Camera,
  Navigation, MessageSquare, Lock, Check, X,
  Sparkles, CheckCircle2, ChevronRight, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import { DEFAULT_SUBSCRIPTION_PLANS } from './LanggananTab';

export interface LanggananSayaTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LanggananSayaTab: React.FC<LanggananSayaTabProps> = ({ showToast }) => {
  const [plans] = useState<SubscriptionPlan[]>(() => {
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

  // Current user's plan is Family Pro or Premium
  const [myPlanId, setMyPlanId] = useState<string>('family_pro');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const currentPlan = plans.find(p => p.id === myPlanId) || plans[2];

  const handleRequestUpgrade = (planName: string) => {
    showToast(`Permintaan upgrade / perpanjangan paket ${planName} telah diteruskan ke pembayaran!`, 'success');
    setIsUpgradeModalOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Current Active Plan Card for Parent */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/40 border border-indigo-200/80 dark:border-indigo-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-medium rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" /> Paket Keluarga Aktif
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Berlangganan Aktif hingga 12 Jan 2027
            </span>
          </div>

          <h2 className="text-base sm:text-base font-medium text-slate-900 dark:text-white">
            {currentPlan.name} (Akses Lengkap Seluruh Fitur)
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-xl">
            Keluarga Anda sedang menikmati paket proteksi maksimal dengan kuota hingga {currentPlan.limits.maxChildrenDevices} perangkat anak, fitur live kamera depan/belakang, serta pemantauan audio satu arah hening.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilihan Paket & Perpanjang</span>
          </button>
        </div>
      </div>

      {/* Quota Usage Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Kuota Perangkat Anak</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-slate-900 dark:text-white">2 / {currentPlan.limits.maxChildrenDevices} Terpakai</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Tersedia {currentPlan.limits.maxChildrenDevices - 2} Slot</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '20%' }} />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Fitur Live Kamera & Audio</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-base font-medium text-slate-900 dark:text-white">100% Aktif</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Pemantauan hening tanpa batasan</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Area Geofence Terpasang</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-slate-900 dark:text-white">2 Area Aktif</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Tanpa Batas</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Rumah & Sekolah Dasar</p>
        </div>
      </div>

      {/* Feature Breakdown Table for Parent */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          Rincian Hak Akses & Fitur Paket Anda
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-normal">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-indigo-500" />
              <span className="text-slate-700 dark:text-slate-300">Batas Perangkat Anak</span>
            </div>
            <span className="text-slate-900 dark:text-white font-medium">{currentPlan.limits.maxChildrenDevices} HP Anak</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-700 dark:text-slate-300">Lacak Lokasi GPS</span>
            </div>
            <span className="text-slate-900 dark:text-white font-medium">{currentPlan.limits.locationTrackingLabel}</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-purple-500" />
              <span className="text-slate-700 dark:text-slate-300">Dengar Suara Satu Arah</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Termasuk
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-amber-500" />
              <span className="text-slate-700 dark:text-slate-300">Live Kamera Jarak Jauh</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Termasuk
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-teal-500" />
              <span className="text-slate-700 dark:text-slate-300">Radius & Area Geofence</span>
            </div>
            <span className="text-slate-900 dark:text-white font-medium">{currentPlan.limits.maxGeofencesLabel}</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              <span className="text-slate-700 dark:text-slate-300">Notifikasi Pesan & Chat Masuk</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Lengkap
            </span>
          </div>
        </div>
      </div>

      {/* Upgrade / Comparison Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Pilihan Paket Langganan Keluarga</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Tingkatkan atau perpanjang perlindungan keluarga Anda</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-normal">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                    p.id === myPlanId
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-white text-xs">{p.name}</span>
                      {p.id === myPlanId && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-indigo-600 text-white rounded font-medium">Aktif</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 block">
                      {p.monthlyPrice === 0 ? 'Gratis' : `Rp ${p.monthlyPrice.toLocaleString('id-ID')} /bln`}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{p.tagline}</p>
                    <div className="pt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>• Hingga {p.limits.maxChildrenDevices} Anak</div>
                      <div>• {p.limits.oneWayAudio ? 'Audio 1-Arah Tersedia' : 'Tanpa Audio Monitor'}</div>
                      <div>• {p.limits.liveCamera ? 'Live Kamera Tersedia' : 'Tanpa Live Kamera'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRequestUpgrade(p.name)}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-normal transition-colors cursor-pointer ${
                      p.id === myPlanId
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p.id === myPlanId ? 'Perpanjang Masa Aktif' : 'Pilih Paket Ini'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
