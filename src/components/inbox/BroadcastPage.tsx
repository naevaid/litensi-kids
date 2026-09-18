import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Smartphone, Sparkles, Clock, ShieldCheck, AlertCircle, Users } from 'lucide-react';
import { User as UserType } from '../../types';
import { api, getSessionUser } from '../../lib/apiClient';

interface BroadcastPageProps {
  user?: UserType;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Interface + helper mapping daftar anak dari API /anak
interface ChildOptionItem {
  id: string;
  nama_lengkap: string;
  nama_panggilan: string;
  device_model: string | null;
  os_version: string | null;
  label: string;
}
const mapApiAnakToChildOption = (db: any): ChildOptionItem | null => {
  if (!db) return null;
  const id = String(db.id ?? '');
  const namaLengkap = String(db.nama_lengkap ?? '').trim();
  const namaPanggilan = String(db.nama_panggilan ?? '').trim();
  const deviceModel = db.device_model ? String(db.device_model) : null;
  const osVersion = db.os_version ? String(db.os_version) : null;
  const displayName = namaPanggilan || namaLengkap || `Anak #${id}`;
  const deviceStr = deviceModel ? deviceModel : (osVersion ? `Android ${osVersion}` : 'Perangkat');
  return {
    id,
    nama_lengkap: namaLengkap,
    nama_panggilan: namaPanggilan,
    device_model: deviceModel,
    os_version: osVersion,
    label: `${displayName} (${deviceStr})`,
  };
};

export const BroadcastPage: React.FC<BroadcastPageProps> = ({ user, showToast }) => {
  const sessUser = getSessionUser();
  const uid = sessUser?.id ? String(sessUser.id) : '';

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildOptionItem[]>([]);
  const [targetGroup, setTargetGroup] = useState('all');
  const [urgency, setUrgency] = useState<'normal' | 'penting' | 'kunci_layar'>('normal');
  const [message, setMessage] = useState('');

  // Load daftar anak untuk dropdown target perangkat
  const loadData = async () => {
    console.groupCollapsed('%c[Broadcast] loadData GET /anak', 'color:#6366f1;font-weight:700');
    try {
      setLoading(true);
      const resAnak = uid
        ? await api.get('/anak', { params: { user_id: uid } })
        : ({ ok: true, data: [] } as any);

      const anakRawArray: any[] = Array.isArray(resAnak?.data)
        ? resAnak.data
        : (resAnak?.data?.list ?? resAnak?.data?.data ?? []);
      const listAnak = anakRawArray
        .map(mapApiAnakToChildOption)
        .filter(Boolean) as ChildOptionItem[];
      setChildren(listAnak);
      console.debug('[Broadcast] daftar anak:', listAnak.length);
    } catch (err: any) {
      console.error('[Broadcast] loadData error:', err);
      showToast(err?.message || 'Gagal memuat daftar perangkat anak', 'error');
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Mohon tuliskan isi pesan broadcast', 'error');
      return;
    }
    if (targetGroup !== 'all' && !children.find(c => c.id === targetGroup)) {
      showToast('Target perangkat tidak valid. Pilih perangkat yang tersedia atau pilih Semua.', 'error');
      return;
    }
    if (children.length === 0) {
      showToast('Tidak ada perangkat anak yang terdaftar. Lakukan pairing terlebih dahulu.', 'warning');
      return;
    }

    showToast('Pesan broadcast berhasil dikirim ke perangkat anak!', 'success');
    setMessage('');
    // PERINGATAN: Broadcast saat ini hanya state lokal (belum ada API endpoint broadcast real ke perangkat)
    setTimeout(() => {
      showToast(
        '⚠️ Pengiriman broadcast HANYA simulasi di browser saat ini. Belum terkirim riil ke perangkat anak (butuh endpoint API backend untuk push notifikasi FCM/OneSignal ke companion app).',
        'warning'
      );
    }, 900);
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-indigo-600" />
            Broadcast & Pengumuman Keluarga
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Kirim pesan instan atau pengingat yang akan tampil pop-up di layar semua perangkat anak.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs">
        <form onSubmit={handleSendBroadcast} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Target Perangkat
              </label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500"
                disabled={loading || children.length === 0}
              >
                {children.length === 0 ? (
                  loading ? (
                    <option value="all">Memuat daftar perangkat...</option>
                  ) : (
                    <option value="all" disabled>Belum ada perangkat anak terdaftar</option>
                  )
                ) : (
                  <>
                    <option value="all">
                      Semua Perangkat Anak ({children.length} Gadget Aktif)
                    </option>
                    {children.map(anak => (
                      <option key={anak.id} value={anak.id}>
                        {anak.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {!loading && children.length === 0 && (
                <div className="flex items-start gap-1.5 mt-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-normal">
                  <Users className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Lakukan pairing perangkat di menu <span className="font-semibold">Kelola Anak</span> terlebih dahulu.</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Jenis Pemberitahuan
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500"
              >
                <option value="normal">Notifikasi Standar (Banner)</option>
                <option value="penting">Pengingat Penting (Pop-up Suara)</option>
                <option value="kunci_layar">Kunci Layar Sesaat (Waktu Makan / Sholat / Tidur)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Isi Pesan / Pengingat</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </label>
            </div>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: Waktunya makan malam dan belajar bersama. Harap simpan gadget kalian ya!"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500"
            />
          </div>

          {/* Quick preset chips */}
          <div className="space-y-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-normal">Pilihan Pesan Cepat:</span>
            <div className="flex flex-wrap gap-2">
              {[
                'Waktunya Istirahat & Tidur 🌙',
                'Waktunya Belajar dan Kerjakan PR 📚',
                'Makan Bersama Keluarga 🍽️',
                'Batas waktu layar hampir habis (10 menit lagi) ⏳'
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(preset)}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer font-normal border border-slate-200/80 dark:border-slate-700"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Broadcast Sekarang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
