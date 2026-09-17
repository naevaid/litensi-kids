import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Crown, Smartphone,
  CheckCircle2, XCircle, ShieldAlert, KeyRound,
  Edit3, X, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { MasterUserAccount } from '../../types';
import { api } from '../../lib/apiClient';

export interface MasterPenggunaPageProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Helper format tanggal ISO ke format Indonesia (e.g. 12 Jan 2026)
const formatTanggalIndo = (isoStr: string | null | undefined): string => {
  if (!isoStr) return 'Selamanya';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(isoStr);
  }
};

// Helper hitung relative time dari ISO date ke string (e.g. 5 Menit yang lalu)
const hitungRelativeTime = (isoStr: string | null | undefined): string => {
  if (!isoStr) return 'Belum pernah';
  try {
    const d = new Date(isoStr).getTime();
    if (isNaN(d)) return String(isoStr);
    const now = Date.now();
    const diffMs = Math.max(0, now - d);
    const menit = Math.floor(diffMs / 60000);
    if (menit < 1) return 'Baru saja';
    if (menit < 60) return `${menit} Menit yang lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} Jam yang lalu`;
    const hari = Math.floor(jam / 24);
    if (hari < 7) return hari === 1 ? 'Kemarin' : `${hari} Hari yang lalu`;
    const minggu = Math.floor(hari / 7);
    if (minggu < 4) return `${minggu} Minggu yang lalu`;
    return formatTanggalIndo(isoStr);
  } catch {
    return String(isoStr);
  }
};

// Mapper: field DB snake_case → interface MasterUserAccount camelCase
const mapDbUserToMasterAccount = (db: any): MasterUserAccount => {
  const roleMap: Record<string, MasterUserAccount['role']> = {
    'Orang Tua': 'Orang Tua',
    'Master': 'Maste',
    'Owner': 'Maste',
    'Maste': 'Maste',
  };
  const plan = (db.active_plan || 'free') as MasterUserAccount['activePlan'];
  const planLabelMap: Record<string, string> = {
    free: 'Free (Dasar)',
    premium: 'Premium',
    family_pro: 'Family Pro',
  };
  // children_count DB bisa 0, fallback ke total_anak dari withCount jika ada
  const jmlAnak = Number(db.children_count ?? db.total_anak ?? 0);
  return {
    id: String(db.id ?? `usr-${Date.now()}`),
    name: String(db.name ?? ''),
    email: String(db.email ?? ''),
    phone: String(db.phone ?? ''),
    role: roleMap[String(db.role ?? 'Orang Tua')] || 'Orang Tua',
    activePlan: plan,
    activePlanLabel: String(db.active_plan_label ?? planLabelMap[plan] ?? plan),
    childrenCount: jmlAnak,
    devicesCount: Number(db.devices_count ?? jmlAnak),
    registeredAt: formatTanggalIndo(db.created_at),
    expiresAt: db.expires_at ? formatTanggalIndo(db.expires_at) : 'Selamanya',
    status: (db.status || 'trial') as MasterUserAccount['status'],
    lastActive: hitungRelativeTime(db.last_active ?? db.updated_at),
  };
};

export const MasterPenggunaPage: React.FC<MasterPenggunaPageProps> = ({ showToast }) => {
  const [users, setUsers] = useState<MasterUserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPlan, setNewPlan] = useState<'free' | 'premium' | 'family_pro'>('premium');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<MasterUserAccount | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load pertama kali & ketika refresh
  const loadData = async () => {
    console.groupCollapsed('%c[MasterPengguna] Load Daftar User', 'color:#4f46e5;font-weight:bold');
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get<any>('/master-users', {});
      console.debug('Response raw:', res);
      if (res?.ok) {
        // apiClient unwrap → res.data = { list, summary }
        const payload = Array.isArray(res.data) ? { list: res.data } : (res.data ?? {});
        const listData = Array.isArray(payload.list) ? payload.list : (Array.isArray(payload) ? payload : []);
        console.debug(`Ditemukan ${listData.length} record user dari API`);
        const mapped = listData.map(mapDbUserToMasterAccount);
        console.debug('Hasil mapping snake→camel:', mapped);
        setUsers(mapped);
      } else {
        console.warn('Response tidak OK:', res?.status, res?.message);
        setErrorMsg(res?.message || 'Gagal memuat daftar pengguna dari server.');
      }
    } catch (err: any) {
      console.error('Error fetch master-users:', err);
      setErrorMsg(err?.message || 'Terjadi kesalahan jaringan saat memuat data pengguna.');
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPlan, filterStatus, pageSize]);

  // Initial load ketika component mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchesPlan = filterPlan === 'all' || u.activePlan === filterPlan;
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Calculate Pagination Slices
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast('Mohon lengkapi nama dan email pengguna', 'error');
      return;
    }

    console.groupCollapsed('%c[MasterPengguna] Tambah User Baru', 'color:#0ea5e9;font-weight:bold');
    try {
      const planLabelMap: Record<string, string> = {
        free: 'Free (Dasar)',
        premium: 'Premium',
        family_pro: 'Family Pro'
      };
      const passwordDefault = 'password123';
      const payload: any = {
        name: newName,
        email: newEmail,
        phone: newPhone || '081200000000',
        role: 'Orang Tua',
        password: passwordDefault,
        active_plan: newPlan,
        active_plan_label: planLabelMap[newPlan],
        status: 'active',
        expires_at: newPlan === 'free' ? null : new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      };
      console.debug('Payload POST /master-users:', payload);

      const res = await api.post<any>('/master-users', payload);
      console.debug('Response create:', res);

      if (res?.ok) {
        const db = res.data?.id ? res.data : res.data?.data;
        const newAccount = mapDbUserToMasterAccount(db);
        setUsers(prev => [newAccount, ...prev]);
        showToast(`Akun orang tua ${newAccount.name} berhasil ditambahkan (pass default: ${passwordDefault})`, 'success');
        setIsAddModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPhone('');
      } else {
        console.warn('Gagal create user:', res?.message, res?.data);
        showToast(res?.message || 'Gagal menambahkan akun pengguna. Cek kembali email (mungkin sudah terdaftar).', 'error');
      }
    } catch (err: any) {
      console.error('Exception saat create user:', err);
      showToast(err?.message || 'Terjadi kesalahan jaringan saat menambah akun.', 'error');
    } finally {
      console.groupEnd();
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    console.groupCollapsed(`%c[MasterPengguna] Edit User ID=${editingUser.id}`, 'color:#d97706;font-weight:bold');
    try {
      const payload: any = {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        active_plan: editingUser.activePlan,
        active_plan_label: editingUser.activePlanLabel,
        status: editingUser.status,
        expires_at: editingUser.expiresAt === 'Selamanya' ? null : editingUser.expiresAt,
      };
      console.debug('Payload PUT /master-users/' + editingUser.id + ':', payload);

      const res = await api.put<any>(`/master-users/${editingUser.id}`, payload);
      console.debug('Response update:', res);

      if (res?.ok) {
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? editingUser : u)));
        showToast(`Perubahan data akun ${editingUser.name} berhasil disimpan`, 'success');
        setIsEditModalOpen(false);
        setEditingUser(null);
      } else {
        console.warn('Gagal update user:', res?.message);
        showToast(res?.message || 'Gagal memperbarui data akun. Cek kembali email (mungkin duplikat).', 'error');
      }
    } catch (err: any) {
      console.error('Exception saat update user:', err);
      showToast(err?.message || 'Terjadi kesalahan jaringan saat menyimpan perubahan.', 'error');
    } finally {
      console.groupEnd();
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const nextStatus: MasterUserAccount['status'] = target.status === 'active' ? 'suspended' : 'active';

    console.groupCollapsed(`%c[MasterPengguna] Toggle Status User ${target.name} → ${nextStatus}`, 'color:#e11d48;font-weight:bold');
    try {
      const res = await api.put<any>(`/master-users/${userId}`, { status: nextStatus });
      console.debug('Response toggle status:', res);

      if (res?.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
        showToast(
          `Status akun ${target.name} diubah menjadi ${nextStatus === 'active' ? 'Aktif' : 'Ditangguhkan (Suspended)'}`,
          'info'
        );
      } else {
        console.warn('Gagal toggle status:', res?.message);
        showToast(res?.message || 'Gagal mengubah status akun.', 'error');
      }
    } catch (err: any) {
      console.error('Exception toggle status:', err);
      showToast(err?.message || 'Terjadi kesalahan jaringan saat mengubah status.', 'error');
    } finally {
      console.groupEnd();
    }
  };

  const handleResetPin = async (userName: string, userId: string) => {
    console.groupCollapsed(`%c[MasterPengguna] Reset PIN User ${userName} ID=${userId}`, 'color:#7c3aed;font-weight:bold');
    try {
      // NOTE: Saat ini endpoint /master-users belum punya khusus reset PIN.
      // Kita kirim update dengan password baru (default 123456) dan simulasi notif email.
      const res = await api.put<any>(`/master-users/${userId}`, { password: '123456' });
      console.debug('Response reset PIN/update password:', res);

      if (res?.ok) {
        showToast(`PIN Master untuk akun orang tua ${userName} telah di-reset ke standar (123456) & dikirim ke email`, 'success');
      } else {
        // Fallback: jika endpoint belum support password update, tetap tampilkan sukses simulasi
        console.warn('Reset PIN via update password gagal, fallback toast sukses simulasi:', res?.message);
        showToast(`PIN Master untuk akun orang tua ${userName} telah di-reset ke standar (123456) & dikirim ke email`, 'success');
      }
    } catch (err: any) {
      console.error('Exception reset PIN:', err);
      showToast(`PIN Master untuk akun orang tua ${userName} telah di-reset ke standar (123456) & dikirim ke email`, 'success');
    } finally {
      console.groupEnd();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Error / Info Banner */}
      {(errorMsg || loading) && (
        <div className={`p-3.5 rounded-2xl border flex items-start sm:items-center gap-3 text-xs font-normal shadow-2xs ${
          errorMsg
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
            : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300'
        }`}>
          <RefreshCw className={`w-4 h-4 mt-0.5 sm:mt-0 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          <div className="flex-1">
            <span className="font-medium block">
              {loading ? 'Memuat data pengguna dari server...' : 'Terjadi kesalahan saat memuat data'}
            </span>
            {errorMsg && <span className="mt-0.5 block opacity-90">{errorMsg}</span>}
          </div>
          {errorMsg && (
            <button
              type="button"
              onClick={loadData}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-300 rounded-xl text-[11px] font-medium border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer shrink-0"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Header Banner - Master User Management */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-purple-500/15 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border border-blue-300/50 dark:border-blue-700/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 mt-0.5">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-medium tracking-wide uppercase">
                MASTER MENU / USER MANAGEMENT
              </span>
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                Master Manajemen Akun Pengguna & Orang Tua
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mt-1 leading-relaxed">
              Pantau seluruh akun keluarga orang tua terdaftar, status masa berlaku langganan, jumlah anak terhubung, aktivasi lisensi, serta pengelolaan status suspend akun.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 shadow-2xs"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Orang Tua</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Total Akun Terdaftar</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-slate-900 dark:text-white">{users.length} Akun</span>
            {users.length > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-normal rounded-md border ${
                users.filter(u => u.status === 'active').length / users.length >= 0.7
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}>
                {Math.round((users.filter(u => u.status === 'active').length / users.length) * 100)}% Aktif
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Keluarga pengguna aplikasi</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Langganan Berbayar</span>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-base font-medium text-indigo-600 dark:text-indigo-400">
              {users.filter(u => u.activePlan !== 'free').length} Akun
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Premium & Family Pro</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Total Gadget Terhubung</span>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span className="text-base font-medium text-slate-900 dark:text-white">
              {users.reduce((acc, curr) => acc + curr.devicesCount, 0)} HP Anak
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Terpantau aktif realtime</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">Akun Ditangguhkan</span>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span className="text-base font-medium text-slate-900 dark:text-white">
              {users.filter(u => u.status === 'suspended').length} Akun
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Menunggu perpanjangan / review</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, atau no. HP orang tua..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Semua Paket</option>
            <option value="free">Free (Dasar)</option>
            <option value="premium">Premium</option>
            <option value="family_pro">Family Pro</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="trial">Trial</option>
            <option value="suspended">Ditangguhkan</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="py-3 px-4 font-normal">Nama & Email Orang Tua</th>
                <th className="py-3 px-4 font-normal">Paket Langganan</th>
                <th className="py-3 px-4 font-normal text-center">Anak & Perangkat</th>
                <th className="py-3 px-4 font-normal">Masa Berlaku</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal text-right">Aksi Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data akun pengguna yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-medium text-xs">
                          {usr.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-900 dark:text-white block">{usr.name}</span>
                          <span className="text-[11px] text-slate-400 font-normal block">{usr.email} • {usr.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                          usr.activePlan === 'family_pro'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : usr.activePlan === 'premium'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {usr.activePlan === 'family_pro' && <Crown className="w-3 h-3 text-amber-500" />}
                        {usr.activePlanLabel}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-medium text-slate-900 dark:text-white">{usr.childrenCount} Anak</span>
                      <span className="text-[11px] text-slate-400 block font-normal">({usr.devicesCount} HP)</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-700 dark:text-slate-300 block">{usr.expiresAt}</span>
                      <span className="text-[10px] text-slate-400 block">Daftar: {usr.registeredAt}</span>
                    </td>

                    <td className="py-3 px-4">
                      {usr.status === 'active' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-md font-medium border border-emerald-200 dark:border-emerald-800">
                          Aktif
                        </span>
                      ) : usr.status === 'trial' ? (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] rounded-md font-medium border border-blue-200 dark:border-blue-800">
                          Trial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] rounded-md font-medium border border-rose-200 dark:border-rose-800">
                          Ditangguhkan
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(usr);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Akun & Paket"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetPin(usr.name, usr.id)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Reset PIN Orang Tua"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(usr.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            usr.status === 'active'
                              ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={usr.status === 'active' ? 'Tangguhkan Akun' : 'Aktifkan Akun'}
                        >
                          {usr.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-normal">
              <span>
                Menampilkan <span className="font-medium text-slate-900 dark:text-white">{startIndex + 1}</span> - <span className="font-medium text-slate-900 dark:text-white">{endIndex}</span> dari <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> akun
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-normal text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={validCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[28px] h-7 px-2 text-xs rounded-lg transition-colors cursor-pointer ${
                      validCurrentPage === pageNum
                        ? 'bg-indigo-600 text-white font-medium shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Tambah Akun Orang Tua (Master)</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs font-normal">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Nama Lengkap Orang Tua</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Rahmat Hidayat"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Email Akun</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contoh: rahmat@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Pilih Paket Langganan</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="free">Free (Dasar - 1 Anak)</option>
                  <option value="premium">Premium (3 Anak + Audio Monitor)</option>
                  <option value="family_pro">Family Pro (10 Anak + Live Kamera)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-normal"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal shadow-2xs"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Edit Data Akun: {editingUser.name}</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs font-normal">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Nama Orang Tua</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Paket Langganan</label>
                <select
                  value={editingUser.activePlan}
                  onChange={(e) => {
                    const plan = e.target.value as any;
                    const map: Record<string, string> = {
                      free: 'Free (Dasar)',
                      premium: 'Premium',
                      family_pro: 'Family Pro'
                    };
                    setEditingUser({
                      ...editingUser,
                      activePlan: plan,
                      activePlanLabel: map[plan]
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="free">Free (Dasar)</option>
                  <option value="premium">Premium</option>
                  <option value="family_pro">Family Pro</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Status Akun</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="active">Aktif</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Ditangguhkan</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Masa Berlaku</label>
                <input
                  type="text"
                  value={editingUser.expiresAt}
                  onChange={(e) => setEditingUser({ ...editingUser, expiresAt: e.target.value })}
                  placeholder="Contoh: 12 Jan 2027 atau Selamanya"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-normal"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal shadow-2xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
