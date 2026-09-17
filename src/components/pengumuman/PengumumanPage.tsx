import React, { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Sparkles, CheckCircle2, Search, X,
  Calendar, Eye, Pencil, Trash2, ShieldCheck, BookOpen, Heart,
  RefreshCw, AlertTriangle
} from 'lucide-react';
import { AnnouncementItem } from '../../types';
import { api } from '../../lib/apiClient';

interface PengumumanPageProps {
  announcements?: AnnouncementItem[];
  setAnnouncements?: React.Dispatch<React.SetStateAction<AnnouncementItem[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  setActiveMainPopup?: (ann: AnnouncementItem | null) => void;
  setIsMainPopupVisible?: (visible: boolean) => void;
}

// Helper mapping class warna badge berdasarkan DB field badge_color
const getBadgeClass = (color?: string): string => {
  switch (color) {
    case 'amber':
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';
    case 'emerald':
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60';
    case 'indigo':
      return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60';
    case 'rose':
      return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60';
    case 'blue':
      return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60';
    case 'purple':
      return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60';
    default:
      return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60';
  }
};

// Helper format tanggal rapi untuk UI
// Menangani 3 format input:
//   1. ISO string dari Laravel: "2026-09-15T16:13:55.000000Z"
//   2. MySQL datetime string: "2026-09-15 16:13:55"
//   3. Date object
// Output format pendek Indonesia: "15 Sep 2026"
const formatTanggalRapi = (inputRaw: any): string => {
  if (!inputRaw) return '-';
  try {
    let raw = String(inputRaw).trim();
    // Normalisasi: jika ada "T" dan berakhiran "Z" / ada microsecond .xxxxxx
    if (raw.includes('T')) {
      raw = raw.split('T')[0] ?? raw;
    } else if (raw.includes(' ')) {
      raw = raw.split(' ')[0] ?? raw;
    } else if (raw.length > 10) {
      raw = raw.slice(0, 10);
    }
    // Pastikan format YYYY-MM-DD (10 char)
    if (raw.length < 10 || !raw.includes('-')) {
      return String(inputRaw).slice(0, 10);
    }
    const parts = raw.split('-');
    if (parts.length < 3) return raw;
    const tahun = parts[0];
    const bulanNum = parseInt(parts[1], 10);
    const tanggal = parts[2];
    const namaBulanPendek: string[] = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const bulan = namaBulanPendek[(bulanNum - 1) % 12] || 'Sep';
    return `${tanggal} ${bulan} ${tahun}`;
  } catch (e: any) {
    return String(inputRaw).slice(0, 10);
  }
};

// Mapper snake_case DB → camelCase interface AnnouncementItem
const mapDbPengumumanToInterface = (dbRow: any): AnnouncementItem => {
  const createdAtRaw = dbRow.created_at ?? dbRow.start_date ?? new Date().toISOString();
  const startDateRaw = dbRow.start_date ?? '';
  const endDateRaw = dbRow.end_date ?? '';
  return {
    id: String(dbRow.id ?? `ann-${Date.now()}`),
    title: dbRow.title ?? '',
    badgeText: dbRow.badge_text ?? 'PENGUMUMAN',
    badgeColor: (dbRow.badge_color as any) ?? 'indigo',
    contentType: (dbRow.content_type as any) ?? 'text',
    description: dbRow.description ?? '',
    imageUrl: dbRow.image_url ?? undefined,
    videoUrl: dbRow.video_url ?? undefined,
    displayTarget: (dbRow.display_target as any) ?? 'both',
    startDate: formatTanggalRapi(startDateRaw),
    endDate: formatTanggalRapi(endDateRaw),
    isActive: !!dbRow.is_active,
    ctaLabel: dbRow.cta_label ?? undefined,
    ctaUrl: dbRow.cta_url ?? undefined,
    createdAt: formatTanggalRapi(createdAtRaw),
    author: dbRow.author ?? undefined,
  };
};

export const PengumumanPage: React.FC<PengumumanPageProps> = ({
  announcements: propAnnouncements,
  showToast
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [internalAnnouncements, setInternalAnnouncements] = useState<AnnouncementItem[]>([]);

  const announcementsList = propAnnouncements || internalAnnouncements;

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBadge, setFormBadge] = useState('PANDUAN');
  const [formDesc, setFormDesc] = useState('');

  // Load data pengumuman real dari API
  const loadData = async () => {
    console.groupCollapsed('%c[Pengumuman] loadData GET /pengumuman', 'color:#0ea5e9;font-weight:700');
    try {
      setLoading(true);
      setErrorMsg(null);
      // active_only=false biar MASTER bisa lihat semua (nonaktif + future) di halaman kelola
      const res = await api.get('/pengumuman', { active_only: false });
      console.debug('[Pengumuman] raw response (res.data FLAT ARRAY):', res);
      // KONVENSI apiClient unwrap 1x: res.data = array pengumuman langsung
      const list: any[] = Array.isArray(res.data) ? res.data : [];
      console.debug('[Pengumuman] DB rows count:', list.length);
      const mapped = list.map(mapDbPengumumanToInterface);
      console.debug('[Pengumuman] mapped interface:', mapped);
      setInternalAnnouncements(mapped);
    } catch (err: any) {
      const msg = err?.message || 'Gagal memuat data pengumuman';
      console.error('[Pengumuman] loadData error:', err);
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) {
      showToast('Mohon lengkapi judul dan deskripsi pengumuman', 'error');
      return;
    }
    console.groupCollapsed('%c[Pengumuman] handleCreate POST /pengumuman', 'color:#0ea5e9;font-weight:700');
    try {
      setIsSaving(true);
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      await api.post('/pengumuman', {
        title: formTitle.trim(),
        description: formDesc.trim(),
        badge_text: formBadge,
        badge_color: 'indigo',
        content_type: 'text',
        display_target: 'both',
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      });
      showToast('Pengumuman / Catatan baru berhasil ditambahkan!', 'success');
      setIsCreateModalOpen(false);
      setFormTitle('');
      setFormDesc('');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Gagal simpan pengumuman';
      console.error('[Pengumuman] create error:', err);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  const handleDelete = async (id: string) => {
    console.groupCollapsed(`%c[Pengumuman] handleDelete DELETE /pengumuman/${id}`, 'color:#0ea5e9;font-weight:700');
    try {
      setIsSaving(true);
      await api.del(`/pengumuman/${id}`);
      showToast('Pengumuman berhasil dihapus', 'info');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Gagal hapus pengumuman';
      console.error('[Pengumuman] delete error:', err);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  const filtered = announcementsList.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full text-left">
      {/* Banner Error ROSE */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Gagal memuat pengumuman</p>
            <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5 font-normal">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="shrink-0 px-2 py-1 text-[11px] bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg font-normal cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Banner Loading SKY */}
      {loading && !errorMsg && (
        <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 rounded-xl p-3 flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-sky-500 shrink-0 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sky-700 dark:text-sky-300">Memuat data pengumuman...</p>
            <p className="text-[11px] text-sky-600/90 dark:text-sky-400/90 mt-0.5 font-normal">Menghubungkan ke server backend 127.0.0.1:8000</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-indigo-600" />
            Pengumuman & Edukasi Parenting
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Catatan edukasi digital, panduan keluarga, dan pengumuman sistem proteksi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || isSaving}
            className={`px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-400/40 hover:text-sky-600 dark:hover:text-sky-400 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${loading || isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
            title="Refresh data pengumuman"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={loading || isSaving}
            className={`px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${loading || isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Pengumuman</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari pengumuman atau tips parenting..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500 shadow-2xs"
        />
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div
              key={`skeleton-${i}`}
              className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-11/12 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
                <div className="h-6 w-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 sm:p-10 text-center space-y-2">
          <Megaphone className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {searchQuery ? 'Pengumuman tidak ditemukan' : 'Belum ada pengumuman'}
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal max-w-xs mx-auto">
            {searchQuery ? 'Coba kata kunci pencarian lain' : 'Klik tombol Buat Pengumuman untuk menambahkan catatan edukasi keluarga'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-indigo-400/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-normal border ${getBadgeClass(item.badgeColor)}`}>
                    {item.badgeText}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {item.createdAt}
                  </span>
                </div>

                <h2 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h2>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-2">
                {item.author && (
                  <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {item.author}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={isSaving}
                    className={`p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-xs ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Buat Pengumuman Baru</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSaving}
                className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Kategori / Label</label>
                <select
                  value={formBadge}
                  onChange={e => setFormBadge(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="EDUKASI PARENTING">EDUKASI PARENTING</option>
                  <option value="FITUR BARU">FITUR BARU</option>
                  <option value="PANDUAN">PANDUAN</option>
                  <option value="PENGINGAT KELUARGA">PENGINGAT KELUARGA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Contoh: Tips Mendampingi Anak Belajar Online"
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">Isi Pesan / Penjelasan</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Tuliskan catatan atau pesan lengkap di sini..."
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSaving}
                  className={`px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-normal cursor-pointer ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-normal cursor-pointer shadow-2xs flex items-center gap-1.5 ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengumuman'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
