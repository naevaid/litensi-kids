import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sparkles } from 'lucide-react';
import { KonfigurasiTab, SystemConfig } from './KonfigurasiTab';
import { HakAksesTab } from './HakAksesTab';
import { LanggananSayaTab } from './LanggananSayaTab';

export type PengaturanSubTab = 'konfigurasi' | 'hak_akses' | 'langganan_saya';

export interface KelolaPengaturanPageProps {
  initialSubTab?: PengaturanSubTab;
  onSubTabChange?: (tab: PengaturanSubTab) => void;
  konfigurasiProps?: {
    config?: Partial<SystemConfig>;
    onSaveConfig?: (cfg: SystemConfig) => void;
  };
  hakAksesProps?: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const KelolaPengaturanPage: React.FC<KelolaPengaturanPageProps> = ({
  initialSubTab = 'konfigurasi',
  onSubTabChange,
  konfigurasiProps,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PengaturanSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSubTabClick = (tab: PengaturanSubTab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full text-left">
      {/* Subtab Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => handleSubTabClick('konfigurasi')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-normal transition-all cursor-pointer ${
            activeSubTab === 'konfigurasi'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-medium shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Konfigurasi Proteksi Anak</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubTabClick('hak_akses')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-normal transition-all cursor-pointer ${
            activeSubTab === 'hak_akses'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-medium shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Hak Akses & Wali</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubTabClick('langganan_saya')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-normal transition-all cursor-pointer ${
            activeSubTab === 'langganan_saya'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-medium shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Langganan Keluarga Saya</span>
        </button>
      </div>

      {/* Render Active SubTab */}
      {activeSubTab === 'konfigurasi' && (
        <KonfigurasiTab
          config={konfigurasiProps?.config}
          onSaveConfig={konfigurasiProps?.onSaveConfig}
          showToast={showToast}
        />
      )}

      {activeSubTab === 'hak_akses' && (
        <HakAksesTab showToast={showToast} />
      )}

      {activeSubTab === 'langganan_saya' && (
        <LanggananSayaTab showToast={showToast} />
      )}
    </div>
  );
};
