import React, { useState, useRef } from 'react';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Save,
  ArrowLeft, ShieldCheck, Camera, CheckCircle2, KeyRound
} from 'lucide-react';
import { User as UserType } from '../../types';

export interface ProfilSayaPageProps {
  user: UserType;
  onBack?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onUpdateUser?: (updated: UserType) => void;
}

export const ProfilSayaPage: React.FC<ProfilSayaPageProps> = ({
  user,
  onBack,
  showToast,
  onUpdateUser
}) => {
  const [name, setName] = useState(user?.name || 'Ahmad Faisal');
  const [email, setEmail] = useState(user?.email || 'orangtua@litensikids.id');
  const [phone, setPhone] = useState(user?.phone || '081234567890');
  const [role, setRole] = useState(user?.role || 'Orang Tua / Administrator');
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'
  );

  // Security & PIN states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran foto maksimal 5MB', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
          showToast('Foto profil berhasil diunggah', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      const updatedUser: UserType = {
        ...user,
        name,
        email,
        phone,
        role,
        avatarUrl
      };

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
      
      try {
        localStorage.setItem('active_user_session', JSON.stringify(updatedUser));
      } catch (err) {
        // ignore
      }

      setIsSaving(false);
      showToast('Profil orang tua berhasil diperbarui!', 'success');
    }, 400);
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      showToast('PIN Parental Control minimal 4-6 digit angka', 'warning');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('Konfirmasi PIN baru tidak sesuai', 'error');
      return;
    }

    showToast('PIN Master Parental Control berhasil diperbarui!', 'success');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-medium text-slate-900 dark:text-white">
              Profil Orang Tua & Keamanan Akun
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              Kelola informasi kontak akun utama dan PIN Master Parental Control.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 text-center space-y-4 shadow-2xs">
          <div className="relative inline-block">
            <img
              src={avatarUrl}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-2 ring-indigo-500 mx-auto shadow-md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-colors cursor-pointer"
              title="Ganti Foto"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">{name}</h2>
            <p className="text-xs text-slate-400 font-normal">{role}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-normal">
              <ShieldCheck className="w-3 h-3" /> Akun Terverifikasi
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 space-y-1 text-left font-normal">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{phone}</span>
            </div>
          </div>
        </div>

        {/* Profile Edit Forms */}
        <div className="md:col-span-2 space-y-4">
          {/* Personal Info Form */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/50 pb-2">
              Informasi Pribadi
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Email Utama</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Master PIN Parental Form */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                <span>PIN Master Parental Control</span>
              </h3>
            </div>

            <form onSubmit={handleUpdatePin} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">PIN Baru (4-6 Angka)</label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      value={newPin}
                      onChange={e => setNewPin(e.target.value)}
                      placeholder="Contoh: 123456"
                      className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Konfirmasi PIN Baru</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value)}
                    placeholder="Ulangi PIN baru"
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 tracking-wider"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Update PIN Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
