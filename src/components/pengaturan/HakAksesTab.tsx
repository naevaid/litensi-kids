import React, { useState } from 'react';
import {
  Shield, Plus, Lock, KeyRound, CheckCircle2,
  Users, Check, X, ShieldAlert, HeartHandshake
} from 'lucide-react';

export interface HakAksesTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ParentRole {
  id: string;
  roleName: string;
  description: string;
  isDefault: boolean;
  totalUsers: number;
  permissions: {
    canLockScreen: boolean;
    canGrantTime: boolean;
    canViewLocation: boolean;
    canEditPin: boolean;
    canBlockApps: boolean;
  };
}

export const HakAksesTab: React.FC<HakAksesTabProps> = ({ showToast }) => {
  const [roles, setRoles] = useState<ParentRole[]>([
    {
      id: 'role-1',
      roleName: 'Orang Tua Utama (Super Admin)',
      description: 'Akses penuh kontrol perangkat anak, ubah PIN master, batasi aplikasi, dan kelola akun.',
      isDefault: true,
      totalUsers: 1,
      permissions: {
        canLockScreen: true,
        canGrantTime: true,
        canViewLocation: true,
        canEditPin: true,
        canBlockApps: true
      }
    },
    {
      id: 'role-2',
      roleName: 'Pendamping / Wali (Co-Parent)',
      description: 'Dapat memantau lokasi, menambah waktu layar, dan mengirim pesan tanpa wewenang ubah PIN master.',
      isDefault: false,
      totalUsers: 1,
      permissions: {
        canLockScreen: true,
        canGrantTime: true,
        canViewLocation: true,
        canEditPin: false,
        canBlockApps: true
      }
    },
    {
      id: 'role-3',
      roleName: 'Guru Les / Pengawas Belajar',
      description: 'Hanya dapat melihat mode belajar dan mengaktifkan aplikasi edukasi tertentu.',
      isDefault: false,
      totalUsers: 0,
      permissions: {
        canLockScreen: false,
        canGrantTime: false,
        canViewLocation: false,
        canEditPin: false,
        canBlockApps: false
      }
    }
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('role-2');

  const handleInviteCoParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      showToast('Mohon masukkan email wali / pendamping', 'error');
      return;
    }

    showToast(`Undangan akses telah dikirim ke ${inviteEmail}`, 'success');
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            Hak Akses & Pengawas Pendamping
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Atur peran dan wewenang pengawasan perangkat anak bagi Ayah, Bunda, atau Pengasuh.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Undang Pendamping</span>
        </button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map(role => (
          <div
            key={role.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-normal ${
                    role.isDefault
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {role.totalUsers} Pengguna Aktif
                </span>
                {role.isDefault && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Akun Utama
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                  {role.roleName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1 leading-relaxed">
                  {role.description}
                </p>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-normal">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Kunci Layar Seketika</span>
                  {role.permissions.canLockScreen ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Tambah Kuota Waktu Layar</span>
                  {role.permissions.canGrantTime ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Pantau Lokasi GPS</span>
                  {role.permissions.canViewLocation ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Ubah PIN Master Parental</span>
                  {role.permissions.canEditPin ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Undang Pendamping / Wali</h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteCoParent} className="space-y-3">
              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Email Pendamping</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="contoh: bunda@gmail.com"
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Pilih Peran</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                >
                  <option value="role-2">Pendamping / Wali (Co-Parent)</option>
                  <option value="role-3">Guru Les / Pengawas Belajar</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-normal cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-normal cursor-pointer shadow-2xs"
                >
                  Kirim Undangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
