// ==========================================================================
// HakAksesTab.tsx — 100% INTEGRASI BACKEND R5 (TIDAK ADA SIMULASI LOKAL LAGI)
// --------------------------------------------------------------------------
// Endpoint yang dipakai:
//   W1 GET  /hak-akses/roles              → 3 template role + count total_users AKTIF dari DB real
//   W2 POST /hak-akses/undang-kirim       → create undangan + kirim email via SMTP Hostinger
//   W4 PUT  /hak-akses/pendamping/{id}    → update permission boolean / nonaktifkan relasi
//   W5 GET  /hak-akses/daftar-pendamping  → list pendamping (aktif/nonaktif) EAGER LOAD users asli
// ==========================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, CheckCircle2,
  Users, Check, X, ShieldAlert, HeartHandshake,
  Copy, ExternalLink, RefreshCw, AlertTriangle, Ban,
  Loader2, ShieldCheck
} from 'lucide-react';
import { api, getSessionUser } from '../../lib/apiClient';

export interface HakAksesTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// --------------------------------------------------------------------------
// TypeShape SAMA PERSIS dengan response backend W1 & W5 (1:1 tanpa transformasi)
// --------------------------------------------------------------------------
interface PermissionShape {
  canLockScreen: boolean;
  canGrantTime: boolean;
  canViewLocation: boolean;
  canEditPin: boolean;
  canBlockApps: boolean;
}

interface ParentRole {
  id: string;
  roleName: string;
  description: string;
  isDefault: boolean;
  totalUsers: number;
  permissions: PermissionShape;
}

interface PendampingRelasi {
  id: number;
  parent_user_id: number;
  pendamping_user_id: number;
  undangan_asal_id: number | null;
  role_id_awal: string;
  permission_json: PermissionShape;
  status_aktif: 'aktif' | 'nonaktif' | 'diblokir';
  tanggal_jadi_awal: string;
  tanggal_nonaktif: string | null;
  pendamping_user: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

// Label permission untuk UX render
const PERM_LABELS: Array<{ key: keyof PermissionShape; label: string }> = [
  { key: 'canLockScreen',   label: 'Kunci Layar' },
  { key: 'canGrantTime',    label: 'Tambah Waktu Layar' },
  { key: 'canViewLocation', label: 'Pantau Lokasi GPS' },
  { key: 'canEditPin',      label: 'Ubah PIN Master' },
  { key: 'canBlockApps',    label: 'Blokir Aplikasi' },
];

export const HakAksesTab: React.FC<HakAksesTabProps> = ({ showToast }) => {
  // ---- STATE REAL DARI API ----
  const [roles, setRoles] = useState<ParentRole[]>([]);
  const [daftarPendamping, setDaftarPendamping] = useState<PendampingRelasi[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(true);
  const [loadingPendamping, setLoadingPendamping] = useState<boolean>(true);
  const [submittingInvite, setSubmittingInvite] = useState<boolean>(false);
  const [updatingRelasiId, setUpdatingRelasiId] = useState<number | null>(null);

  // ---- STATE UI MODAL ----
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('role-2');
  const [lastInviteResult, setLastInviteResult] = useState<{
    linkTerima: string;
    linkRegister: string;
    emailTerkirim: boolean;
    email: string;
  } | null>(null);

  // ==========================================================================
  // FETCHER: W1 Roles + W5 Pendamping List (dipanggil onMount + refetch)
  // ==========================================================================
  const fetchRoles = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoadingRoles(true);
    const res = await api.get('/hak-akses/roles');
    const payload: any = res.data ?? {};
    if (res.ok && Array.isArray(payload?.roles)) {
      setRoles(payload.roles as ParentRole[]);
    } else {
      if (!silent) {
        showToast(res.message || 'Gagal memuat data peran hak akses', 'error');
      }
    }
    if (!silent) setLoadingRoles(false);
  }, [showToast]);

  const fetchDaftarPendamping = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoadingPendamping(true);
    const res = await api.get('/hak-akses/daftar-pendamping');
    const payload: any = res.data ?? {};
    if (res.ok && Array.isArray(payload?.list)) {
      setDaftarPendamping(payload.list as PendampingRelasi[]);
    } else {
      if (!silent) showToast(res.message || 'Gagal memuat daftar pendamping', 'error');
    }
    if (!silent) setLoadingPendamping(false);
  }, [showToast]);

  const refetchAll = useCallback(() => {
    fetchRoles(true);
    fetchDaftarPendamping(true);
  }, [fetchRoles, fetchDaftarPendamping]);

  useEffect(() => {
    fetchRoles();
    fetchDaftarPendamping();
  }, [fetchRoles, fetchDaftarPendamping]);

  // ==========================================================================
  // ACTION W2: KIRIM UNDANGAN VIA BACKEND (EMAIL SMTP HOSTINGER)
  // ==========================================================================
  const handleInviteCoParent = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      showToast('Mohon masukkan email wali / pendamping', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Format email tidak valid', 'error');
      return;
    }
    if (selectedRole === 'role-1') {
      showToast('Tidak dapat memilih Orang Tua Utama sebagai peran undangan', 'error');
      return;
    }
    if (!getSessionUser()) {
      showToast('Silakan login ulang terlebih dahulu', 'error');
      return;
    }

    setSubmittingInvite(true);
    try {
      const res = await api.post('/hak-akses/undang-kirim', {
        email_wali: email,
        role_id: selectedRole,
      });

      if (!res.ok) {
        // 409 duplicate, 403 bukan pemilik keluarga, 422 invalid
        showToast(res.message || 'Gagal mengirim undangan', res.status === 409 ? 'warning' : 'error');
        return;
      }

      const data: any = res.data ?? {};
      const emailOk = Boolean(data?.email_terkirim ?? false);
      setLastInviteResult({
        linkTerima: String(data?.link_terima || ''),
        linkRegister: String(data?.link_register || ''),
        emailTerkirim: emailOk,
        email,
      });

      // Toast sesuai status SMTP
      if (emailOk) {
        showToast(`✅ Email undangan terkirim ke ${email}. Silakan cek Inbox / Spam folder.`, 'success');
      } else {
        showToast(
          '⚠️ Undangan tersimpan tapi gagal kirim email. Gunakan tombol Salin Link untuk dibagikan manual.' +
          (data?.error_mail ? ` (${String(data.error_mail).substring(0, 70)})` : ''),
          'warning'
        );
      }

      // Refresh roles (count total_users berubah)
      fetchRoles(true);
      // Form reset
      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch (err: any) {
      console.error('[HakAksesTab] W2 invite error:', err);
      showToast(err?.message || 'Gagal terhubung ke server saat kirim undangan', 'error');
    } finally {
      setSubmittingInvite(false);
    }
  };

  // ==========================================================================
  // ACTION W4: TOGGLE 1 PERMISSION PADA RELASI PENDAMPING ATAU NONAKTIFKAN
  // ==========================================================================
  const handleTogglePermission = async (relId: number, key: keyof PermissionShape, newVal: boolean) => {
    setUpdatingRelasiId(relId);
    try {
      const payload: Partial<PermissionShape> & { nonaktifkan?: false } = { [key]: newVal };
      const res = await api.put(`/hak-akses/pendamping/${relId}`, { permissions: payload });
      if (!res.ok) {
        showToast(res.message || 'Gagal mengubah izin pendamping', 'error');
        return;
      }
      showToast(`✅ Izin ${PERM_LABELS.find(p => p.key === key)?.label || key} berhasil di-${newVal ? 'aktifkan' : 'nonaktifkan'}`, 'success');
      fetchDaftarPendamping(true);
    } catch (err: any) {
      showToast(err?.message || 'Gagal ubah izin pendamping', 'error');
    } finally {
      setUpdatingRelasiId(null);
    }
  };

  const handleNonaktifkanPendamping = async (item: PendampingRelasi) => {
    const ya = window.confirm(
      `YAKIN NONAKTIFKAN ${item.pendamping_user?.name || 'Pendamping'} (${item.pendamping_user?.email || ''})?\n` +
      `Semua izin akses akan dicabut sampai Anda mengaktifkan kembali via undang ulang.`
    );
    if (!ya) return;
    setUpdatingRelasiId(item.id);
    try {
      const res = await api.put(`/hak-akses/pendamping/${item.id}`, { nonaktifkan: true });
      if (!res.ok) {
        showToast(res.message || 'Gagal nonaktifkan pendamping', 'error');
        return;
      }
      showToast('✅ Relasi pendamping berhasil dinonaktifkan', 'success');
      refetchAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal nonaktifkan pendamping', 'error');
    } finally {
      setUpdatingRelasiId(null);
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`🔗 Link ${label} berhasil disalin ke clipboard`, 'success');
    } catch {
      showToast('Gagal menyalin (browser menolak akses clipboard). Copy manual.', 'warning');
    }
  };

  // ==========================================================================
  // RENDER BANTUAN
  // ==========================================================================
  const statusBadgeClass = (s: PendampingRelasi['status_aktif']) => {
    if (s === 'aktif') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200';
    if (s === 'diblokir') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
  };

  const StatusBadge = ({ s }: { s: PendampingRelasi['status_aktif'] }) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-normal border ${statusBadgeClass(s)}`}>
      {s === 'aktif' ? 'Aktif' : s === 'diblokir' ? 'Diblokir' : 'Nonaktif'}
    </span>
  );

  // ==========================================================================
  // RENDER UTAMA
  // ==========================================================================
  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* HEADER + BUTTON */}
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
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={refetchAll}
            title="Refresh data"
            className="px-2.5 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRoles || loadingPendamping ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setLastInviteResult(null);
              setSelectedRole('role-2');
              setInviteEmail('');
              setIsInviteModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Undang Pendamping</span>
          </button>
        </div>
      </div>

      {/* ROLE CARDS GRID — SUMBER DARI W1 /roles BUKAN HARDCODE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Template Peran & Batasan Akses
          </h3>
          {loadingRoles && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Memuat peran…</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(loadingRoles ? Array.from({ length: 3 }) : roles).map((roleOrEmpty, i) => {
            const role = loadingRoles ? null : (roleOrEmpty as ParentRole);
            return (
              <div
                key={role?.id || `skeleton-${i}`}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-normal ${
                      role?.isDefault
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {loadingRoles
                        ? <span className="inline-block w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></span>
                        : `${role?.totalUsers ?? 0} Pengguna Aktif`}
                    </span>
                    {role?.isDefault && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Akun Utama
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white leading-snug min-h-[40px]">
                      {loadingRoles
                        ? (<><span className="inline-block w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1 animate-pulse" /></>)
                        : role?.roleName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1 leading-relaxed min-h-[48px]">
                      {loadingRoles
                        ? (<><span className="inline-block w-full h-3 bg-slate-200/70 dark:bg-slate-700/70 rounded mb-1 animate-pulse" /><span className="inline-block w-5/6 h-3 bg-slate-200/50 dark:bg-slate-700/50 rounded animate-pulse" /></>)
                        : role?.description}
                    </p>
                  </div>

                  {/* PERMISSION LIST DARI W1 BUKAN HARDCODE */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-normal">
                    {PERM_LABELS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span>{label}</span>
                        {loadingRoles
                          ? <span className="inline-block w-6 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></span>
                          : (role?.permissions?.[key]
                              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                              : <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NOTIFIKASI UNDANGAN TERAKHIR + TOMBOL COPY LINK (jika W2 berhasil) */}
      {lastInviteResult && (
        <div className={`p-4 rounded-2xl border ${
          lastInviteResult.emailTerkirim
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/80'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/80'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {lastInviteResult.emailTerkirim
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-medium mb-1 ${
                  lastInviteResult.emailTerkirim ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'
                }`}>
                  {lastInviteResult.emailTerkirim
                    ? `✅ Email undangan ke ${lastInviteResult.email} SUKSES TERKIRIM. Cek inbox / spam folder tujuan!`
                    : `⚠️ Undangan tersimpan ke DB tapi email GAGAL terkirim ke ${lastInviteResult.email}. Salin link untuk share via WhatsApp/chat.`}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(lastInviteResult.linkRegister, 'Register (untuk akun baru)')}
                    className="text-[10px] px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                    title={lastInviteResult.linkRegister}
                  >
                    <Copy className="w-3 h-3" /> Salin Link Register Akun Baru
                    <ExternalLink className="w-3 h-3 ml-0.5 text-indigo-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(lastInviteResult.linkTerima, 'Terima (untuk akun sudah ada)')}
                    className="text-[10px] px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                    title={lastInviteResult.linkTerima}
                  >
                    <Copy className="w-3 h-3" /> Salin Link Login & Terima
                    <ExternalLink className="w-3 h-3 ml-0.5 text-indigo-500" />
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastInviteResult(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 p-1 rounded-md hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION LIST DAFTAR PENDAMPING — DARI API W5 BUKAN STATE LOKAL */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-500" /> Daftar Pendamping / Wali Aktif
          </h3>
          {loadingPendamping && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Memuat pendamping…</span>
          )}
          {!loadingPendamping && (
            <span className="text-[10px] text-slate-500 font-normal">
              Total: <span className="font-semibold">{daftarPendamping.length}</span> relasi ·
              Aktif <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {daftarPendamping.filter(p => p.status_aktif === 'aktif').length}
              </span> · Nonaktif <span className="font-semibold text-slate-500">
                {daftarPendamping.filter(p => p.status_aktif === 'nonaktif').length}
              </span>
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {loadingPendamping ? (
            <div className="p-4 space-y-3">
              {[0, 1].map(i => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : daftarPendamping.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-11 h-11 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <HeartHandshake className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Belum ada pendamping / wali</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Klik tombol <span className="font-medium">"Undang Pendamping"</span> di atas untuk mulai berbagi akses.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {daftarPendamping.map(item => {
                const u = item.pendamping_user;
                const nama = u?.name?.trim() || '—';
                const email = u?.email?.trim() || '(user akun tidak ditemukan)';
                const relDisabled = updatingRelasiId === item.id || item.status_aktif !== 'aktif';
                return (
                  <li key={item.id} className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Avatar + Basic Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {u?.avatar_url ? (
                            <img src={u.avatar_url} alt={nama} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{nama}</h4>
                            <StatusBadge s={item.status_aktif} />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate mb-1">{email}</p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            Bergabung sejak {new Date(item.tanggal_jadi_awal).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                            {item.tanggal_nonaktif && ` · Nonaktif tgl ${new Date(item.tanggal_nonaktif).toLocaleDateString('id-ID', { dateStyle: 'short' })}`}
                          </p>
                        </div>
                      </div>

                      {/* 5 Permission Toggle */}
                      <div className="sm:w-[58%] md:w-[62%] lg:w-2/3 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                        {PERM_LABELS.map(({ key, label }) => {
                          const val = Boolean(item.permission_json?.[key] ?? false);
                          const canEdit = item.status_aktif === 'aktif';
                          const isBusy = updatingRelasiId === item.id;
                          return (
                            <label
                              key={key}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[11px] transition-colors cursor-pointer border ${
                                canEdit
                                  ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                  : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <span className={`font-normal ${val ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
                              <button
                                type="button"
                                disabled={!canEdit || isBusy}
                                onClick={() => handleTogglePermission(item.id, key, !val)}
                                className={`flex-shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer border ${
                                  val
                                    ? 'bg-emerald-500 border-emerald-400'
                                    : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                                } ${(!canEdit || isBusy) ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${val ? 'translate-x-4' : 'translate-x-0.5'}`}
                                />
                                {isBusy && (
                                  <Loader2 className="absolute -right-5 w-3 h-3 animate-spin text-indigo-500" />
                                )}
                              </button>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* ACTION ROW: NONAKTIFKAN */}
                    <div className="flex items-center justify-end mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      {item.status_aktif === 'aktif' && (
                        <button
                          type="button"
                          onClick={() => handleNonaktifkanPendamping(item)}
                          disabled={updatingRelasiId === item.id}
                          className="text-[10.5px] px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {updatingRelasiId === item.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Ban className="w-3 h-3" />}
                          Nonaktifkan Akses
                        </button>
                      )}
                      {item.status_aktif !== 'aktif' && (
                        <span className="text-[10.5px] px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl font-medium flex items-center gap-1.5">
                          <ShieldAlert className="w-3 h-3" /> Akses tidak aktif (undang ulang untuk aktifkan kembali)
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* INVITE MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Undang Pendamping / Wali</h3>
              <button
                type="button"
                onClick={() => {
                  if (submittingInvite) return;
                  setIsInviteModalOpen(false);
                }}
                disabled={submittingInvite}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1 leading-relaxed">
              Email undangan akan dikirim via SMTP <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">business@naeva.id</code> (Hostinger SSL 465).
              Jika penerima sudah punya akun → link Login & Terima. Jika belum → link Register Prefill email.
            </p>

            <form onSubmit={handleInviteCoParent} className="space-y-3">
              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Email Pendamping</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="contoh: bunda@gmail.com"
                  disabled={submittingInvite}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Pilih Peran</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  disabled={submittingInvite}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {(() => {
                    // FIX DROPDOWN KOSONG: Selalu tampilkan 2 pilihan enum FIXED untuk undangan (TIDAK BOLEH pilih Ortu Utama).
                    // Label dari state roles jika W1 sudah load, jika tidak pakai default hardcoded (tidak pernah kosong race condition).
                    const rolePendamping = roles.find(r => String(r.id) === 'role-2');
                    const roleGuru = roles.find(r => String(r.id) === 'role-3');
                    return (
                      <>
                        <option value="role-2">
                          {rolePendamping?.roleName?.trim() || 'Pendamping / Wali (Co-Parent)'}
                        </option>
                        <option value="role-3">
                          {roleGuru?.roleName?.trim() || 'Guru Les / Pengawas Belajar'}
                        </option>
                      </>
                    );
                  })()}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={submittingInvite}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-normal cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium cursor-pointer shadow-2xs disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submittingInvite ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Mengirim Email…</>
                  ) : (
                    <><HeartHandshake className="w-3 h-3" /> Kirim Undangan</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
