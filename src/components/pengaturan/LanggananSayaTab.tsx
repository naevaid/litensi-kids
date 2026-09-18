import React, { useState, useEffect } from 'react';
import {
  Crown, Shield,
  Sparkles, CheckCircle2, Clock, X
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import {
  mapDbPaketToPlan,
  normalizePlanId,
  PaketFeaturesFullGrid,
  PaketFeaturesCompactList,
} from './LanggananTab';
import { api, getSessionUser } from '../../lib/apiClient';

export interface LanggananSayaTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const formatExpiredLabel = (planId: string, expiresAt: string | null): string => {
  if (planId === 'free') return 'Gratis Tanpa Batas Waktu';
  if (!expiresAt) return 'Belum ada data tagihan (cek secara berkala)';
  try {
    const d = new Date(expiresAt);
    if (!isNaN(d.getTime())) {
      return `Berlangganan Aktif hingga ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
  } catch (e) {
    // ignore
  }
  return 'Belum ada data tagihan (cek secara berkala)';
};

export const LanggananSayaTab: React.FC<LanggananSayaTabProps> = ({ showToast }) => {
  const sessUser = getSessionUser();
  const uid = sessUser?.id ? String(sessUser.id) : '';

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>('free');
  const [activePlanLabel, setActivePlanLabel] = useState<string>('Free (Dasar)');
  const [activePlanExpired, setActivePlanExpired] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [totalAnakTerpakai, setTotalAnakTerpakai] = useState<number>(0);
  const [totalGeofenceAktif, setTotalGeofenceAktif] = useState<number>(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const displayPlans = plans.filter(p => p.status === 'active').sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  const currentPlan = displayPlans.find(p => p.id === activePlanId) ?? displayPlans[0];
  const expiredLabel = formatExpiredLabel(activePlanId, activePlanExpired);

  const loadAllData = async () => {
    console.groupCollapsed('%c[LanggananSaya] parallel load /paket + /paket/mine + /anak + /geofence', 'color:#0ea5e9;font-weight:700');
    try {
      setLoading(true);
      const [paketResp, mineResp, anakResp, geoResp] = await Promise.all([
        api.get('/paket', { status: 'active' }),
        uid
          ? api.get('/paket/mine', { user_id: uid })
          : Promise.resolve({ ok: false, status: 401, data: null, message: 'user_id kosong' } as any),
        uid
          ? api.get('/anak', { user_id: uid })
          : Promise.resolve({ data: [] } as any),
        uid
          ? api.get('/geofence', { user_id: uid })
          : Promise.resolve({ data: [] } as any),
      ]);

      // SESUAI KONVENSI_INTEGRASI_API.md Point #1: apiClient OTOMATIS UNWRAP 1x level `data.`
      // Jadi res.data LANGSUNG = payload inner, TIDAK ADA field `.success` di wrapper. Pakai `.ok` cek status.
      const paketArr: any[] = Array.isArray(paketResp?.data)
        ? paketResp.data
        : (paketResp?.data?.data ?? paketResp?.data?.list ?? []);
      const parsedPlans = paketArr
        .map(mapDbPaketToPlan)
        .filter(Boolean) as SubscriptionPlan[];
      setPlans(parsedPlans);

      // (2) Status paket aktif user dari tabel users via /paket/mine
      // mineResp.data LANGSUNG = payload {active_plan, active_plan_label, expires_at} BUKAN nested {success, data}
      const mineData = mineResp?.ok && mineResp?.data && typeof mineResp.data === 'object'
        ? mineResp.data
        : null;
      console.debug('[LanggananSaya] mineData raw:', mineData, 'mineResp.ok:', mineResp?.ok, 'mineResp.keys:', mineResp ? Object.keys(mineResp) : []);
      if (mineData?.active_plan) {
        const planName = normalizePlanId(mineData.active_plan);
        setActivePlanId(planName);
        setActivePlanLabel(String(mineData.active_plan_label ?? mineData.paket?.badge ?? mineData.paket?.name ?? planName));
        setActivePlanExpired(mineData.expires_at ?? null);
      } else if (parsedPlans.length > 0) {
        setActivePlanId(parsedPlans[0].id);
        setActivePlanLabel(parsedPlans[0].name);
        setActivePlanExpired(null);
      }

      // (3) Counter usage dinamis dari API per user session
      const anakArr = Array.isArray(anakResp?.data)
        ? anakResp.data
        : (anakResp?.data?.list ?? anakResp?.data?.data ?? []);
      const geoArr = Array.isArray(geoResp?.data)
        ? geoResp.data
        : (geoResp?.data?.list ?? geoResp?.data?.data ?? []);
      setTotalAnakTerpakai(anakArr.length);
      setTotalGeofenceAktif(geoArr.length);

      const normalizedFromMine = mineData?.active_plan ? normalizePlanId(mineData.active_plan) : '-';
      console.debug('[LanggananSaya] parsedPlans:', parsedPlans.length, 'activePlanId STATE:', activePlanId, 'normalized mine:', normalizedFromMine, 'anak:', anakArr.length, 'geofence:', geoArr.length);
    } catch (err: any) {
      console.error('[LanggananSaya] loadAllData error:', err);
      showToast(err?.message || 'Gagal memuat data langganan dari database', 'error');
      setPlans([]);
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestUpgrade = async (planNameOrId: string) => {
    const targetPlan = displayPlans.find(p => p.id === planNameOrId) ?? displayPlans.find(p => p.name === planNameOrId);
    if (!targetPlan) {
      showToast('Paket tidak ditemukan', 'error');
      return;
    }
    if (!uid) {
      showToast('Session user tidak valid. Silakan login kembali.', 'error');
      return;
    }
    try {
      showToast(`Mencoba aktifkan paket ${targetPlan.name}...`, 'info');
      const allResp = await api.get('/paket', { status: 'all' });
      const allRows = Array.isArray(allResp?.data) ? allResp.data : (allResp?.data?.data ?? allResp?.data?.list ?? []);
      const matchRow = allRows.find((r: any) =>
        String(r.name || '').toLowerCase() === String(targetPlan.id).toLowerCase()
      );
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
      if (upgradeResp?.ok !== false) {
        const newActiveId = String(matchRow.name).toLowerCase();
        setActivePlanId(newActiveId);
        setActivePlanLabel(String(upgradeResp?.data?.user?.active_plan_label ?? targetPlan.badge ?? targetPlan.name));
        if (upgradeResp?.data?.user?.expires_at) {
          setActivePlanExpired(String(upgradeResp.data.user.expires_at));
        }
        showToast(`Paket ${targetPlan.name} BERHASIL diaktifkan di DB tabel users!`, 'success');
        setTimeout(() => loadAllData(), 500);
      } else {
        showToast(upgradeResp?.message || `Gagal aktifkan paket ${targetPlan.name}`, 'error');
      }
    } catch (err: any) {
      console.error('[LanggananSaya] handleRequestUpgrade error:', err);
      showToast(err?.message || 'Gagal aktifkan paket (cek koneksi / validasi user_id)', 'error');
    } finally {
      setIsUpgradeModalOpen(false);
    }
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
            <span className={`text-[11px] font-medium flex items-center gap-1 ${
              activePlanId === 'free' ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {activePlanId === 'free' ? (
                <>
                  <Clock className="w-3.5 h-3.5" /> {loading && !currentPlan ? '—' : expiredLabel}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {loading && !currentPlan ? '—' : expiredLabel}
                </>
              )}
            </span>
          </div>

          <h2 className="text-base sm:text-base font-medium text-slate-900 dark:text-white">
            {loading && !currentPlan ? 'Memuat paket...' : (currentPlan?.name ?? activePlanLabel) + ' (Akses Lengkap Seluruh Fitur)'}
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-xl">
            {loading && !currentPlan
              ? 'Menarik data status langganan dari tabel users database...'
              : currentPlan
              ? `Keluarga Anda sedang menikmati paket proteksi maksimal dengan kuota hingga ${currentPlan.limits.maxChildrenDevices} perangkat anak, fitur live kamera depan/belakang, serta pemantauan audio satu arah hening.`
              : 'Belum ada paket langganan yang aktif.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            disabled={loading || displayPlans.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilihan Paket & Perpanjang</span>
          </button>
        </div>
      </div>

      {/* Quota Usage Overview - DINAMIS dari API parallel (BUKAN hardcode) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Kuota Perangkat Anak</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-slate-900 dark:text-white">
              {loading
                ? '—'
                : currentPlan
                ? `${totalAnakTerpakai} / ${currentPlan.limits.maxChildrenDevices} Terpakai`
                : '—'}
            </span>
            {!loading && currentPlan && (
              totalAnakTerpakai < currentPlan.limits.maxChildrenDevices ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Tersedia {currentPlan.limits.maxChildrenDevices - totalAnakTerpakai} Slot
                </span>
              ) : (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Kuota Penuh</span>
              )
            )}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{
                width: !loading && currentPlan
                  ? `${Math.min(100, (totalAnakTerpakai / Math.max(1, currentPlan.limits.maxChildrenDevices)) * 100)}%`
                  : '0%',
              }}
            />
          </div>
          {!loading && totalAnakTerpakai === 0 && (
            <p className="text-[11px] text-slate-400 font-normal">Belum ada perangkat yang dipairing</p>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Fitur Live Kamera & Audio</span>
          <div className="flex items-center gap-2">
            {!loading && currentPlan && currentPlan.limits.liveCamera && currentPlan.limits.oneWayAudio ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-base font-medium text-slate-900 dark:text-white">100% Aktif</span>
              </>
            ) : loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-base font-medium text-slate-500 dark:text-slate-400">Memuat...</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                <span className="text-base font-medium text-slate-500 dark:text-slate-400">
                  {activePlanId === 'free' || !currentPlan ? 'Upgrade untuk Aktifkan' : 'Sebagian Aktif'}
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-normal">
            {!currentPlan
              ? 'Data paket belum dimuat dari database'
              : currentPlan.limits.liveCamera
              ? 'Live Kamera & Audio 1 Arah'
              : currentPlan.limits.oneWayAudio
              ? 'Audio 1 Arah saja'
              : 'Pantauan hening perlu paket Premium atau Family Pro'}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Area Geofence Terpasang</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-slate-900 dark:text-white">
              {loading ? '—' : `${totalGeofenceAktif} Area Aktif`}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              {currentPlan
                ? currentPlan.limits.maxGeofences === 'unlimited'
                  ? 'Tanpa Batas'
                  : `Maks. ${currentPlan.limits.maxGeofences}`
                : '—'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">
            {loading
              ? 'Memuat data zona...'
              : totalGeofenceAktif === 0
              ? 'Belum ada zona radius yang dipasang'
              : `${totalGeofenceAktif} zona aman/bahaya disimpan`}
          </p>
        </div>
      </div>

      {/* Feature Breakdown Table for Parent */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          Rincian Hak Akses & Fitur Paket Anda
        </h3>

        {loading && !currentPlan ? (
          <div className="p-6 text-center">
            <Clock className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-xs font-normal text-slate-400">Menarik rincian batasan paket dari database...</p>
          </div>
        ) : !currentPlan ? (
          <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <p className="text-xs font-normal text-slate-400">Belum ada data paket. Klik "Pilihan Paket" untuk memulai.</p>
          </div>
        ) : (
          <PaketFeaturesFullGrid plan={currentPlan} />
        )}
      </div>

      {/* Upgrade / Comparison Modal - DATA REAL DARI DB tabel paket_langganan */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-7xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Pilihan Paket Langganan Keluarga</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Paket diambil langsung dari tabel <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px] text-indigo-600 dark:text-indigo-400">paket_langganan</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading && displayPlans.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                <p className="text-xs font-normal text-slate-400">Memuat paket dari database...</p>
              </div>
            ) : displayPlans.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-xs font-normal text-slate-400 mb-1">Belum ada paket langganan di database</p>
                <p className="text-[11px] text-slate-400">Hubungi Master Admin untuk menambahkan daftar paket (Free, Premium, Family Pro).</p>
              </div>
            ) : (
              <>
                {/* Billing cycle toggle */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-normal transition-colors cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-normal transition-colors cursor-pointer ${
                      billingCycle === 'annual'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Tahunan <span className="text-[9px] ml-1 opacity-80">Hemat 2 bln</span>
                  </button>
                </div>

                <div
                  className="grid gap-3.5 text-xs font-normal"
                  style={{ gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))` }}
                >
                  {displayPlans.map((p) => {
                    const priceShow = billingCycle === 'annual'
                      ? (p.annualPrice === 0 ? 'Gratis' : `Rp ${p.annualPrice.toLocaleString('id-ID')} /thn`)
                      : (p.monthlyPrice === 0 ? 'Gratis' : `Rp ${p.monthlyPrice.toLocaleString('id-ID')} /bln`);
                    const isActive = p.id === activePlanId;
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 relative ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        {p.popular && !isActive && (
                          <span className="absolute -top-2 right-3 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-medium rounded-full">
                            POPULER
                          </span>
                        )}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900 dark:text-white text-xs">{p.name}</span>
                            {isActive && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-indigo-600 text-white rounded font-medium">Aktif</span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 block">
                            {priceShow}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{p.tagline || p.description}</p>
                          {/* RINCIAN FITUR SAMA DENGAN HALAMAN UTAMA — dari DB, bukan hardcode 3 bullet lama */}
                          <div className="pt-2">
                            <PaketFeaturesCompactList plan={p} />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRequestUpgrade(p.id)}
                          className={`w-full py-1.5 px-2 rounded-lg text-xs font-normal transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {isActive ? 'Perpanjang Masa Aktif' : 'Pilih Paket Ini'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
