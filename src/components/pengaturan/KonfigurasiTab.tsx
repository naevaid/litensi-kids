import React, { useState } from 'react';
import {
  Settings, Shield, Clock, MapPin, Eye, Bell,
  Save, CheckCircle2, Lock
} from 'lucide-react';

export interface SystemConfig {
  systemName: string;
  adminEmail: string;
  timezone: string;
  language: string;
  autoLock: boolean;
  safeSearch: boolean;
  locationTracking: boolean;
}

export interface KonfigurasiTabProps {
  config?: Partial<SystemConfig>;
  onSaveConfig?: (config: SystemConfig) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const KonfigurasiTab: React.FC<KonfigurasiTabProps> = ({
  config,
  onSaveConfig,
  showToast
}) => {
  const [systemName, setSystemName] = useState(config?.systemName || 'Litensi Kids Parental Control');
  const [adminEmail, setAdminEmail] = useState(config?.adminEmail || 'orangtua@litensikids.id');
  const [timezone, setTimezone] = useState(config?.timezone || 'Asia/Jakarta (WIB)');
  const [language, setLanguage] = useState(config?.language || 'id');
  const [autoLock, setAutoLock] = useState(config?.autoLock ?? true);
  const [safeSearch, setSafeSearch] = useState(config?.safeSearch ?? true);
  const [locationTracking, setLocationTracking] = useState(config?.locationTracking ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updated: SystemConfig = {
      systemName,
      adminEmail,
      timezone,
      language,
      autoLock,
      safeSearch,
      locationTracking
    };

    setTimeout(() => {
      if (onSaveConfig) {
        onSaveConfig(updated);
      }
      setIsSaving(false);
      showToast('Konfigurasi sistem perlindungan berhasil disimpan!', 'success');
    }, 400);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-2xs text-left">
      <div>
        <h2 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600" />
          Konfigurasi Proteksi & Sistem
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
          Atur parameter umum aplikasi kontrol orang tua, zona waktu, dan proteksi filter otomatis.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Nama Aplikasi / Keluarga
            </label>
            <input
              type="text"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal focus:border-indigo-500 outline-none transition-all text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Email Notifikasi Laporan Mingguan
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal focus:border-indigo-500 outline-none transition-all text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Zona Waktu
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal focus:border-indigo-500 outline-none transition-all text-slate-800 dark:text-slate-100"
            >
              <option value="Asia/Jakarta (WIB)">Asia/Jakarta (WIB - UTC+7)</option>
              <option value="Asia/Makassar (WITA)">Asia/Makassar (WITA - UTC+8)</option>
              <option value="Asia/Jayapura (WIT)">Asia/Jayapura (WIT - UTC+9)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Bahasa Antarmuka
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal focus:border-indigo-500 outline-none transition-all text-slate-800 dark:text-slate-100"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Protection Toggles */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h3 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">
            Pengaturan Proteksi Otomatis
          </h3>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white block">SafeSearch & Filter Konten Dewasa</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Otomatis blokir konten tidak layak di Google, YouTube, dan browser anak.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={safeSearch}
                onChange={(e) => setSafeSearch(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white block">Kunci Layar Otomatis saat Waktu Habis</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Blokir akses aplikasi saat batas durasi layar harian telah tercapai.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoLock}
                onChange={(e) => setAutoLock(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white block">Pelacakan Lokasi GPS Real-Time</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Sinkronkan posisi perangkat anak untuk memantau keamanan di luar rumah.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={locationTracking}
                onChange={(e) => setLocationTracking(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0 ml-2"
              />
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal shadow-2xs transition-all cursor-pointer flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
