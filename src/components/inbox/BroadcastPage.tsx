import React, { useState } from 'react';
import { Megaphone, Send, Smartphone, Sparkles, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { User as UserType } from '../../types';

interface BroadcastPageProps {
  user?: UserType;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const BroadcastPage: React.FC<BroadcastPageProps> = ({ user, showToast }) => {
  const [targetGroup, setTargetGroup] = useState('all');
  const [urgency, setUrgency] = useState<'normal' | 'penting' | 'kunci_layar'>('normal');
  const [message, setMessage] = useState('');

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Mohon tuliskan isi pesan broadcast', 'error');
      return;
    }

    showToast('Pesan broadcast berhasil dikirim ke seluruh perangkat anak!', 'success');
    setMessage('');
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
              >
                <option value="all">Semua Perangkat Anak (2 Gadget Aktif)</option>
                <option value="nadia">Tablet Nadia (Samsung Tab A8)</option>
                <option value="rayhan">Ponsel Rayhan (Xiaomi Redmi 10)</option>
              </select>
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
