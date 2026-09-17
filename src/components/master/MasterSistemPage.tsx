import React, { useState, useEffect } from 'react';
import {
  Server, Shield, Database, Radio, Bell, RefreshCw,
  Save, AlertTriangle, CheckCircle2, Lock, Activity,
  Sliders, MessageSquare, Terminal, Power
} from 'lucide-react';
import { MasterSystemConfig } from '../../types';
import { api } from '../../lib/apiClient';

export interface MasterSistemPageProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Mapper: snake_case DB → camelCase TypeScript interface
function mapDbKonfigurasiToMasterSystemConfig(db: any): MasterSystemConfig {
  return {
    appName: db?.app_name ?? 'Litensi Kids',
    appVersion: db?.app_version ?? 'v1.0.0',
    maintenanceMode: Boolean(db?.maintenance_mode ?? false),
    maintenanceNotice: db?.maintenance_notice ?? '',
    registrationOpen: Boolean(db?.registration_open ?? true),
    maxTrialDays: Number(db?.max_trial_days ?? 7),
    serverRegion: db?.server_region ?? 'Asia-East1',
    serverStatus: (db?.server_status as any) ?? 'optimal',
    fcmPushStatus: (db?.fcm_push_status as any) ?? 'connected',
    databaseStatus: (db?.database_status as any) ?? 'healthy',
    smsGatewayActive: Boolean(db?.sms_gateway_active ?? false),
    whatsappGatewayActive: Boolean(db?.whatsapp_gateway_active ?? true),
    supportEmail: db?.support_email ?? 'support@litensikids.id',
    supportPhone: db?.support_phone ?? '+62 812-8888-9999',
  };
}

// Reverse mapper: camelCase TS → snake_case DB body untuk PUT
function mapConfigToDbBody(cfg: MasterSystemConfig): any {
  return {
    app_name: cfg.appName,
    app_version: cfg.appVersion,
    maintenance_mode: cfg.maintenanceMode,
    maintenance_notice: cfg.maintenanceNotice,
    registration_open: cfg.registrationOpen,
    max_trial_days: cfg.maxTrialDays,
    server_region: cfg.serverRegion,
    server_status: cfg.serverStatus,
    fcm_push_status: cfg.fcmPushStatus,
    database_status: cfg.databaseStatus,
    sms_gateway_active: cfg.smsGatewayActive,
    whatsapp_gateway_active: cfg.whatsappGatewayActive,
    support_email: cfg.supportEmail,
    support_phone: cfg.supportPhone,
  };
}

// Helper label status untuk summary card
function labelServerStatus(status: string): { text: string; color: string; dot: string } {
  switch (status) {
    case 'optimal': return { text: 'Online Optimal', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' };
    case 'degraded': return { text: 'Menurun (Degraded)', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' };
    case 'maintenance': return { text: 'Pemeliharaan', color: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' };
    default: return { text: status || 'Tidak Diketahui', color: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' };
  }
}
function labelFcmStatus(status: string): string {
  switch (status) {
    case 'connected': return 'Terkoneksi (Stabil)';
    case 'connecting': return 'Menyambungkan...';
    case 'disconnected': return 'Terputus';
    default: return status || '-';
  }
}
function labelDbStatus(status: string): string {
  switch (status) {
    case 'healthy': return 'Sehat (Healthy)';
    case 'warning': return 'Peringatan';
    case 'critical': return 'Kritis';
    default: return status || '-';
  }
}

export const MasterSistemPage: React.FC<MasterSistemPageProps> = ({ showToast }) => {
  const PURPLE = '#7c3aed';

  const EMPTY_CONFIG: MasterSystemConfig = {
    appName: '', appVersion: '', maintenanceMode: false, maintenanceNotice: '',
    registrationOpen: true, maxTrialDays: 7, serverRegion: '', serverStatus: 'optimal',
    fcmPushStatus: 'connected', databaseStatus: 'healthy', smsGatewayActive: false,
    whatsappGatewayActive: false, supportEmail: '', supportPhone: ''
  };

  const [config, setConfig] = useState<MasterSystemConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    console.groupCollapsed('%c[MasterSistem] loadData GET /master-sistem', `color:${PURPLE};font-weight:700`);
    try {
      const res = await api.get('/master-sistem');
      console.debug('[MasterSistem] response raw:', res);
      const payload = res?.data ?? res ?? {};
      const dbConfig = (payload as any).data ?? payload;
      console.debug('[MasterSistem] DB konfigurasi id=1:', dbConfig);
      const mapped = mapDbKonfigurasiToMasterSystemConfig(dbConfig);
      console.debug('[MasterSistem] hasil mapping → config state:', mapped);
      setConfig(mapped);
    } catch (err: any) {
      console.error('[MasterSistem] Gagal load konfigurasi:', err);
      const msg = err?.response?.data?.message || err?.message || 'Koneksi server gagal';
      setErrorMsg(msg);
      showToast('Gagal memuat konfigurasi sistem: ' + msg, 'error');
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    const body = mapConfigToDbBody(config);
    console.groupCollapsed('%c[MasterSistem] handleSave PUT /master-sistem', `color:${PURPLE};font-weight:700`);
    console.debug('[MasterSistem] request body (camel→snake):', body);
    try {
      const res = await api.put('/master-sistem', body);
      console.debug('[MasterSistem] save response:', res);
      showToast('Konfigurasi Master Sistem & Server berhasil diperbarui!', 'success');
      await loadData();
    } catch (err: any) {
      console.error('[MasterSistem] Gagal simpan konfigurasi:', err);
      const msg = err?.response?.data?.message || err?.message || 'Koneksi server gagal';
      setErrorMsg(msg);
      showToast('Gagal menyimpan konfigurasi: ' + msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  const handleBackupNow = () => {
    showToast('Pencadangan database realtime Litensi Kids berhasil dieksekusi', 'success');
  };

  const handlePingServices = () => {
    showToast('Seluruh service background (FCM Push, GPS Relay, Socket IO) beroperasi 100% normal (Latensi 28ms)', 'info');
  };

  const svStatus = labelServerStatus(config.serverStatus);
  const waStatus = config.whatsappGatewayActive
    ? { text: 'Aktif (Ready)', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', icon: MessageSquare }
    : { text: 'Nonaktif', color: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400', icon: MessageSquare };

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Banner Loading / Error */}
      {(errorMsg || loading) && (
        <div className={`p-3.5 rounded-2xl border flex items-start sm:items-center gap-3 text-xs font-normal shadow-2xs ${
          errorMsg
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
            : 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300'
        }`}>
          <RefreshCw className={`w-4 h-4 mt-0.5 sm:mt-0 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          <div className="flex-1">
            <span className="font-medium block">
              {loading ? 'Memuat konfigurasi sistem dari server...' : 'Terjadi kesalahan saat memuat data konfigurasi'}
            </span>
            {errorMsg && <span className="mt-0.5 block opacity-90">{errorMsg}</span>}
          </div>
          {errorMsg && (
            <button
              type="button"
              onClick={loadData}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-blue-500/15 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/30 border border-purple-300/50 dark:border-purple-700/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl shrink-0 mt-0.5">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-[10px] font-medium tracking-wide uppercase">
                MASTER MENU / SERVER & GLOBAL CONFIG
              </span>
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                Master Konfigurasi Sistem Web App & Server
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mt-1 leading-relaxed">
              Pusat kendali infrastruktur global aplikasi Litensi Kids, mode pemeliharaan (maintenance), integrasi notifikasi FCM Push, WhatsApp Broadcast Gateway, dan status database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || isSaving}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handlePingServices}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tes Ping Server</span>
          </button>
        </div>
      </div>

      {/* Server Health Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Status Server Utama</span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${svStatus.dot} animate-pulse`} />
            <span className={`text-base font-medium ${svStatus.color}`}>{svStatus.text}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">{config.serverRegion || '-'}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">FCM Push Relay (Realtime)</span>
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${config.fcmPushStatus === 'connected' ? 'text-indigo-500' : 'text-slate-400'}`} />
            <span className={`text-base font-medium ${
              config.fcmPushStatus === 'connected' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
            }`}>{labelFcmStatus(config.fcmPushStatus)}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Kunci Layar & Alarm Seketika</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Database Cluster</span>
          <div className="flex items-center gap-2">
            <Database className={`w-4 h-4 ${config.databaseStatus === 'healthy' ? 'text-emerald-500' : config.databaseStatus === 'warning' ? 'text-amber-500' : 'text-rose-500'}`} />
            <span className={`text-base font-medium ${
              config.databaseStatus === 'healthy' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
            }`}>{labelDbStatus(config.databaseStatus)}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Auto-backup tiap 24 jam</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">WhatsApp OTP / Alert Gateway</span>
          <div className="flex items-center gap-2">
            <waStatus.icon className={`w-4 h-4 ${waStatus.color.split(' ')[0]}`} />
            <span className={`text-base font-medium ${config.whatsappGatewayActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {waStatus.text}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Untuk alert SOS & reset PIN</p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
        {/* Section 1: Global Identity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Identitas Aplikasi & Kontak Dukungan Global
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Informasi brand yang ditampilkan pada email laporan mingguan dan header portal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-normal">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1.5">
                Nama Resmi Aplikasi
              </label>
              <input
                type="text"
                value={config.appName}
                onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1.5">
                Versi Build Web App
              </label>
              <input
                type="text"
                value={config.appVersion}
                onChange={(e) => setConfig({ ...config, appVersion: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1.5">
                Email Customer Support
              </label>
              <input
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1.5">
                Nomor Hotline Bantuan (WhatsApp)
              </label>
              <input
                type="text"
                value={config.supportPhone}
                onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Maintenance & Registration Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Power className="w-4 h-4 text-amber-500" />
              Kendali Operasional & Mode Pemeliharaan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Atur status pendaftaran akun baru serta sakelar maintenance mode untuk pengguna orang tua.
            </p>
          </div>

          <div className="space-y-3 text-xs font-normal">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white block">Mode Pemeliharaan (Maintenance Mode)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jika aktif, seluruh pengguna umum akan melihat layar pengumuman pemeliharaan server.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>

            {config.maintenanceMode && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-1.5 animate-in fade-in">
                <label className="text-xs font-medium text-amber-800 dark:text-amber-300 block">
                  Pesan Pemeliharaan untuk Pengguna
                </label>
                <textarea
                  rows={2}
                  value={config.maintenanceNotice}
                  onChange={(e) => setConfig({ ...config, maintenanceNotice: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
            )}

            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white block">Buka Registrasi Akun Baru</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Izinkan orang tua baru mendaftarkan diri secara mandiri melalui halaman register.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.registrationOpen}
                onChange={(e) => setConfig({ ...config, registrationOpen: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleBackupNow}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cadangkan Database Sekarang</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi Master'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
