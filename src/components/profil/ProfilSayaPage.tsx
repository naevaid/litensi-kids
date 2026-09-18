import React, { useState, useRef, useMemo } from 'react';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Save,
  ArrowLeft, ShieldCheck, Camera, CheckCircle2, KeyRound,
  UploadCloud, X, Trash2
} from 'lucide-react';
import { User as UserType } from '../../types';
import { api, compressImageClient, mapDbUserToTsUser, setSessionUser } from '../../lib/apiClient';

export interface ProfilSayaPageProps {
  user: UserType;
  onBack?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onUpdateUser?: (updated: UserType) => void;
}

// Default avatar fallback jika user tidak punya avatar_url
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';

export const ProfilSayaPage: React.FC<ProfilSayaPageProps> = ({
  user,
  onBack,
  showToast,
  onUpdateUser
}) => {
  // ---- STATE UTAMA di-init DARI user props (bukan hardcode fallback) ----
  const [name, setName] = useState<string>(user?.name ?? '');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [phone, setPhone] = useState<string>(user?.phone ?? '');
  const [role, setRole] = useState<string>(user?.role ?? 'Orang Tua / Administrator');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl ?? DEFAULT_AVATAR);
  const [pinMasterExists, setPinMasterExists] = useState<boolean>(!!user?.pinMasterExists);

  // PIN Master form state (TIDAK PERNAH di-populate dari actual DB value!)
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Loading state UI
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [isDeletingFoto, setIsDeletingFoto] = useState(false);

  // Info compress (tampilkan ke user berapa KB berkurang)
  const [lastCompressInfo, setLastCompressInfo] = useState<{
    beforeKB: number; afterKB: number; pct: number; serverKB: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- SINKRONISASI USER STATE jika props user berubah (parent refresh) ----
  const pinBadgeColor = useMemo(() => pinMasterExists ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400', [pinMasterExists]);
  const pinBadgeText = useMemo(() => pinMasterExists ? 'PIN Sudah Aktif' : 'PIN Belum Diset', [pinMasterExists]);
  const pinBadgeIcon = useMemo(() => pinMasterExists ? CheckCircle2 : Lock, [pinMasterExists]);

  /**
   * Helper simpan updated user ke parent callback + localStorage session
   */
  const persistUser = (dbUser: Record<string, any>) => {
    const updated: UserType = {
      ...user,
      ...mapDbUserToTsUser(dbUser),
    };
    // Update local state
    setName(updated.name);
    setEmail(updated.email);
    setPhone(updated.phone ?? '');
    setRole(updated.role);
    setAvatarUrl(updated.avatarUrl ?? DEFAULT_AVATAR);
    setPinMasterExists(!!updated.pinMasterExists);
    // Simpan session
    const { pinMaster, ...rest } = updated;
    void pinMaster;
    const sess: any = { ...rest, id: rest.id, name: rest.name, email: rest.email, role: rest.role };
    sess.avatar_url = updated.avatarUrl;
    sess.active_plan = updated.activePlan;
    sess.active_plan_label = updated.activePlanLabel;
    sess.children_count = updated.childrenCount;
    sess.devices_count = updated.devicesCount;
    sess.expires_at = updated.expiresAt;
    sess.status = updated.status;
    sess.pin_master_exists = !!updated.pinMasterExists;
    setSessionUser(sess);
    if (onUpdateUser) onUpdateUser(updated);
  };

  /**
   * [1/3] Handler: Upload Foto Profil
   * - Kompress client-side (Canvas 1280px q85) → hemat bandwidth
   * - Upload ke server via API
   * - Server: kompres ULANG (Intervention 800px q85 JPG) → hapus foto LAMA
   */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input value agar user bisa pilih file YANG SAMA lagi kalau cancel
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 10MB', 'warning');
      return;
    }
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      showToast('Format foto hanya boleh JPG, PNG, WEBP', 'warning');
      return;
    }
    setIsUploadingFoto(true);
    setLastCompressInfo(null);
    try {
      // --- [CLIENT SIDE COMPRESS #1] via Canvas (hemat bandwidth) ---
      const compress = await compressImageClient(file, {
        maxWidth: 1280, maxHeight: 1280, quality: 0.88, mime: 'image/jpeg'
      });
      const pct = Math.max(0, Math.round(100 - (compress.compressedSizeKB / Math.max(1, compress.originalSizeKB)) * 100));
      showToast(
        `Compress client: ${compress.originalSizeKB}KB → ${compress.compressedSizeKB}KB (hemat ${pct}%). Uploading...`,
        'info'
      );
      // Preview DULU sebelum upload (agar user lihat perubahan realtime)
      const previewReader = new FileReader();
      previewReader.onload = (ev) => {
        if (ev.target?.result) setAvatarUrl(ev.target.result as string);
      };
      previewReader.readAsDataURL(file);

      // --- [UPLOAD SERVER + SERVER SIDE COMPRESS #2 Intervention] ---
      const res = await api.profile.uploadPhoto(compress.blob, `profil-u${user?.id ?? 0}.jpg`);
      if (!res.ok || !res.data) throw new Error(res.message || 'Gagal upload foto ke server');
      const dbUser = (res.data as any).user ?? (res.data as any);
      const serverKB = Number((res.data as any).file_size_kb ?? 0);
      const oldDeleted = !!(res.data as any).old_photo_deleted;
      setLastCompressInfo({
        beforeKB: compress.originalSizeKB,
        afterKB: compress.compressedSizeKB,
        pct,
        serverKB,
      });
      // Update URL avatar final (bukan blob preview, URL storage server public)
      if ((res.data as any).avatar_url) setAvatarUrl((res.data as any).avatar_url);
      persistUser(dbUser);
      showToast(
        `✅ Foto profil diperbarui! (Final server: ${serverKB}KB${oldDeleted ? ', foto lama dihapus' : ''})`,
        'success'
      );
    } catch (err: any) {
      // Kembalikan avatar dari props (bukan preview yang mungkin broken)
      setAvatarUrl(user?.avatarUrl ?? DEFAULT_AVATAR);
      showToast(err?.message || 'Gagal upload foto profil', 'error');
    } finally {
      setIsUploadingFoto(false);
    }
  };

  /**
   * [2/3] Handler: Simpan Perubahan Data Pribadi (Nama, Email, Nomor HP)
   */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) { showToast('Nama lengkap minimal 2 karakter', 'warning'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Format email tidak valid', 'warning'); return; }
    if (phone && phone.replace(/\D/g, '').length < 8) { showToast('Nomor HP minimal 8 digit', 'warning'); return; }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
      };
      const res = await api.profile.update(payload);
      if (!res.ok || !res.data) throw new Error(res.message || 'Gagal simpan data profil');
      const dbUser = (res.data as any).user ?? (res.data as any);
      persistUser(dbUser);
      showToast('Data profil berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal simpan data profil', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * [3/3] Handler: Update PIN Master Parental Control
   * - Tidak pernah tampilkan PIN current actual (security)
   * - Validasi: 4-6 digit numeric + confirm match
   * - Update via endpoint /profil/update (field pin_master)
   */
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin) { showToast('Masukkan PIN baru 4-6 digit', 'warning'); return; }
    if (!/^[0-9]{4,6}$/.test(newPin)) { showToast('PIN Master harus 4-6 digit ANGKA (tanpa huruf/spasi)', 'warning'); return; }
    if (newPin !== confirmPin) { showToast('Konfirmasi PIN baru tidak sesuai', 'error'); return; }
    setIsUpdatingPin(true);
    try {
      // Kirim SEMUA fields current state (agar tidak overwrite name/email/phone dengan stale)
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        pin_master: newPin,
      };
      const res = await api.profile.update(payload);
      if (!res.ok || !res.data) throw new Error(res.message || 'Gagal update PIN Master');
      const dbUser = (res.data as any).user ?? (res.data as any);
      persistUser(dbUser);
      setNewPin('');
      setConfirmPin('');
      setShowPin(false);
      showToast('PIN Master Parental Control berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal update PIN Master', 'error');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  /**
   * [Bonus] Handler: Reset foto profil → kembali ke default (hapus file foto lokal server)
   */
  const handleHapusFoto = async () => {
    if (avatarUrl === DEFAULT_AVATAR && !user?.avatarUrl) {
      showToast('Foto profil sudah default', 'info');
      return;
    }
    setIsDeletingFoto(true);
    try {
      const res = await api.profile.deletePhoto();
      if (!res.ok || !res.data) throw new Error(res.message || 'Gagal hapus foto profil');
      const dbUser = (res.data as any).user ?? (res.data as any);
      setAvatarUrl(DEFAULT_AVATAR);
      persistUser(dbUser);
      showToast('Foto profil dihapus, kembali ke avatar default', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal hapus foto profil', 'error');
    } finally {
      setIsDeletingFoto(false);
    }
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
              Profil Orang Tua &amp; Keamanan Akun
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
            {/* Loading overlay ketika uploading / deleting foto */}
            {(isUploadingFoto || isDeletingFoto) && (
              <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-[2px] rounded-full flex items-center justify-center">
                <UploadCloud className="w-6 h-6 text-white animate-bounce" />
              </div>
            )}
            <img
              src={avatarUrl}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-2 ring-indigo-500 mx-auto shadow-md"
            />
            <div className="absolute bottom-0 right-0 flex gap-1">
              <button
                type="button"
                disabled={isUploadingFoto || isDeletingFoto}
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-full shadow-lg transition-colors cursor-pointer"
                title="Ganti Foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isUploadingFoto || isDeletingFoto}
                onClick={handleHapusFoto}
                className="p-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 disabled:cursor-not-allowed text-white rounded-full shadow-lg transition-colors cursor-pointer"
                title="Hapus Foto (kembali default)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
            />
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">{name}</h2>
            <p className="text-xs text-slate-400 font-normal">{role}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-normal">
                <ShieldCheck className="w-3 h-3" /> Akun Terverifikasi
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-normal ${pinBadgeColor}`}>
                {React.createElement(pinBadgeIcon, { className: 'w-3 h-3' })}
                {pinBadgeText}
              </span>
            </div>
          </div>

          {lastCompressInfo && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-[11px] text-left space-y-1">
              <div className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Info Kompres Otomatis
              </div>
              <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                <div>Client (Canvas): <b>{lastCompressInfo.beforeKB}KB → {lastCompressInfo.afterKB}KB</b> <span className="text-emerald-600">(hemat {lastCompressInfo.pct}%)</span></div>
                <div>Server (Intervention 800px): <b>Final {lastCompressInfo.serverKB}KB</b> disimpan DB</div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 space-y-1 text-left font-normal">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{phone || '— Belum diisi'}</span>
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
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
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
              {pinMasterExists ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                  <CheckCircle2 className="w-3 h-3" /> Sudah Aktif &middot; Ganti kapan saja
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                  <Lock className="w-3 h-3" /> Belum Diset &middot; Disarankan buat PIN
                </span>
              )}
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
                      onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={pinMasterExists ? 'Masukkan PIN baru untuk ganti' : 'Contoh: 123456'}
                      inputMode="numeric"
                      className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                    onChange={e => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ulangi PIN baru"
                    inputMode="numeric"
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 tracking-wider"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPin}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isUpdatingPin ? 'Memperbarui PIN...' : 'Update PIN Master'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
