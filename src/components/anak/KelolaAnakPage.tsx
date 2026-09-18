import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone, Plus, Clock, ShieldCheck,
  CheckCircle, RefreshCw, Lock, Unlock, Trash2, Edit3,
  QrCode, Search, Wifi, WifiOff, Battery, BatteryCharging,
  Eye, X, Copy, AlertTriangle, User, Check, ArrowRight,
  Sparkles, SmartphoneCharging, Radio, ChevronRight, Timer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ChildProfile } from '../../types';
import { AvatarPicker } from './AvatarPicker';
import { renderAvatarIcon } from './AvatarIconSelector';
import { api, getSessionUser } from '../../lib/apiClient';

interface KelolaAnakPageProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Helper mapping data dari DB (snake_case) ke TypeScript interface (camelCase)
const mapDbAnakToChildProfile = (db: any): ChildProfile => ({
  id: String(db.id ?? `child-${Date.now()}`),
  name: db.name ?? '',
  age: Number(db.age ?? 8),
  gender: db.gender ?? 'laki-laki',
  deviceName: db.device_name ?? db.deviceName ?? '',
  deviceModel: db.device_model ?? db.deviceModel ?? '',
  osVersion: db.os_version ?? db.osVersion ?? '-',
  batteryLevel: Number(db.battery_level ?? db.batteryLevel ?? 80),
  isOnline: Boolean(db.is_online ?? db.isOnline ?? false),
  status: (db.status as any) ?? 'active',
  avatar: db.avatar ?? 'icon:Smile',
  qrPairingCode: db.qr_pairing_code ?? db.qrPairingCode ?? `LTN-${Math.floor(1000 + Math.random() * 9000)}-SEC`,
  pairingPin: db.pairing_pin ?? db.pairingPin ?? String(Math.floor(100000 + Math.random() * 900000)),
  pairedAt: db.paired_at ? new Date(db.paired_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
  lastActive: db.last_active ? (Date.now() - new Date(db.last_active).getTime() < 60_000 ? 'Aktif saat ini' : `${Math.round((Date.now() - new Date(db.last_active).getTime()) / 60_000)} menit yang lalu`) : 'Baru saja',
  usedToday: db.used_today ?? db.usedToday ?? '0m',
  notes: db.notes ?? undefined,
});

const DEFAULT_AVATAR = 'icon:Smile';

export const KelolaAnakPage: React.FC<KelolaAnakPageProps> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');

  // Timer countdown TTL kode pairing (auto expire 10 menit)
  const [pairingSecondsLeft, setPairingSecondsLeft] = useState<number | null>(null);
  const pairingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Add Child Modal Flow (SESUAI REQUIREMENT USER: Step 1 QR Pairing DULU → Step 2 Form Data Anak)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<'pairing' | 'form'>('pairing');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pollingPairing, setPollingPairing] = useState(false);
  const [pairingPollCount, setPairingPollCount] = useState<number>(0);
  const [newChildName, setNewChildName] = useState('');
  const [newAge, setNewAge] = useState<number>(8);
  const [newGender, setNewGender] = useState<'laki-laki' | 'perempuan'>('laki-laki');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceModel, setNewDeviceModel] = useState<string>('');
  const [newOSVersion, setNewOSVersion] = useState<string>('');
  const [newAvatar, setNewAvatar] = useState(DEFAULT_AVATAR);
  const [newNotes, setNewNotes] = useState('');
  const [generatedPairing, setGeneratedPairing] = useState<{
    code: string;
    pin: string;
    qrPayload?: string;
    expiresAt?: string;
    paired: boolean;
    deviceInfo?: any;
  }>({ code: '', pin: '', paired: false });
  const [isSavingNewChild, setIsSavingNewChild] = useState(false);

  // Edit Child Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);

  // Delete Child Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingChild, setDeletingChild] = useState<ChildProfile | null>(null);

  // View Pairing QR / Details Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRChild, setSelectedQRChild] = useState<ChildProfile | null>(null);

  // Lock / Unlock Screen Confirmation Modal State
  const [showLockModal, setShowLockModal] = useState(false);
  const [targetLockChild, setTargetLockChild] = useState<ChildProfile | null>(null);
  const [lockMessage, setLockMessage] = useState('Waktunya istirahat dan belajar ya!');
  const [lockDuration, setLockDuration] = useState('30 Menit');

  // Fetch data profil anak dari API backend
  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    console.groupCollapsed('%c[Anak] Load daftar profil anak', 'color:#6366f1;font-weight:600');
    try {
      const res = await api.get<any>('/anak');
      console.debug('Response GET /anak:', res);
      // catatan: apiClient SUDAH extract field `data.data`, jadi res.data langsung = array
      if (res?.ok && res?.data) {
        const listData = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
        const mapped = (listData as any[]).map(mapDbAnakToChildProfile);
        console.debug(`Mapped ${mapped.length} records ke ChildProfile:`, mapped);
        setChildren(mapped);
        showToast(`Berhasil memuat ${mapped.length} data profil anak & perangkat`, 'info');
      } else {
        const msg = res?.message || 'Gagal memuat data anak';
        console.error('Error response:', res);
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      console.error('[Anak] Exception fetch data:', err);
      setErrorMsg(err?.message || 'Kesalahan jaringan saat ambil data profil anak');
      showToast('Gagal memuat data. Periksa koneksi atau server backend.', 'error');
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered children list
  const filteredChildren = children.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.deviceModel && c.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Open Lock / Unlock Modal
  const handleOpenLockModal = (child: ChildProfile) => {
    setTargetLockChild(child);
    if (child.status !== 'locked') {
      setLockMessage('Waktunya istirahat dan belajar ya!');
      setLockDuration('30 Menit');
    }
    setShowLockModal(true);
  };

  // Confirm Lock Screen Action
  const handleConfirmLock = async () => {
    if (!targetLockChild) return;
    console.groupCollapsed(`%c[Anak] Kunci Layar ${targetLockChild.name}`, 'color:#f43f5e;font-weight:600');
    try {
      const res = await api.put<any>(`/anak/${targetLockChild.id}`, {
        status: 'locked',
      });
      console.debug('Response PUT /anak/{id} locked:', res);
      if (res?.ok) {
        setChildren(prev =>
          prev.map(c => (c.id === targetLockChild.id ? { ...c, status: 'locked' } : c))
        );
        showToast(
          `Layar ${targetLockChild.name} berhasil dikunci (${lockDuration}) dengan pesan: "${lockMessage}"`,
          'success'
        );
      } else {
        showToast(res?.message || 'Gagal mengunci layar perangkat', 'error');
      }
    } catch (err: any) {
      console.error('Lock error:', err);
      showToast(err?.message || 'Kesalahan jaringan saat kunci layar', 'error');
    } finally {
      console.groupEnd();
      setShowLockModal(false);
    }
  };

  // Confirm Unlock Screen Action
  const handleConfirmUnlock = async () => {
    if (!targetLockChild) return;
    console.groupCollapsed(`%c[Anak] Buka Kunci Layar ${targetLockChild.name}`, 'color:#10b981;font-weight:600');
    try {
      const res = await api.put<any>(`/anak/${targetLockChild.id}`, {
        status: 'active',
      });
      console.debug('Response PUT /anak/{id} active:', res);
      if (res?.ok) {
        setChildren(prev =>
          prev.map(c => (c.id === targetLockChild.id ? { ...c, status: 'active' } : c))
        );
        showToast(`Kunci layar perangkat ${targetLockChild.name} berhasil dibuka`, 'info');
      } else {
        showToast(res?.message || 'Gagal membuka kunci layar', 'error');
      }
    } catch (err: any) {
      console.error('Unlock error:', err);
      showToast(err?.message || 'Kesalahan jaringan saat buka kunci', 'error');
    } finally {
      console.groupEnd();
      setShowLockModal(false);
    }
  };

  // Helper countdown TTL kode pairing (expires_at → detik tersisa)
  const stopPairingCountdown = () => {
    if (pairingIntervalRef.current) {
      clearInterval(pairingIntervalRef.current);
      pairingIntervalRef.current = null;
    }
    setPairingSecondsLeft(null);
  };

  const startPairingCountdown = (expiresAtIso: string | undefined) => {
    stopPairingCountdown();
    if (!expiresAtIso) return;
    const targetMs = new Date(expiresAtIso).getTime();
    if (isNaN(targetMs)) return;

    const hitungDetik = () => {
      const sisa = Math.max(0, Math.round((targetMs - Date.now()) / 1000));
      setPairingSecondsLeft(sisa);
      if (sisa <= 0) {
        stopPairingCountdown();
        showToast('Kode pairing sudah kedaluwarsa, silakan generate ulang.', 'warning');
      }
    };
    hitungDetik();
    pairingIntervalRef.current = setInterval(hitungDetik, 1000);
  };

  // Helper format detik → MM:SS
  const formatPairingCountdown = (secs: number | null): string => {
    if (secs == null || isNaN(secs)) return '-';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Cleanup otomatis: stop countdown TTL saat modal tambah anak ditutup
  useEffect(() => {
    if (!showAddModal) {
      stopPairingCountdown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal]);

  // Open Add Child Modal: SELALU mulai Step 1 = Pairing QR Code DULU (sesuai requirement user)
  const handleOpenAddModal = async () => {
    stopPairingCountdown();
    setNewChildName('');
    setNewAge(8);
    setNewGender('laki-laki');
    setNewDeviceName('');
    setNewDeviceModel('');
    setNewOSVersion('');
    setNewAvatar(DEFAULT_AVATAR);
    setNewNotes('');
    setIsSavingNewChild(false);
    setPairingPollCount(0);
    setPollingPairing(false);
    setGeneratedPairing({ code: '', pin: '', paired: false });
    // PENTING: Default Step PAIRING terlebih dahulu (QR + Manual Code)
    setAddStep('pairing');
    setShowAddModal(true);

    // Segera generate kode pairing via API backend
    console.groupCollapsed('%c[Anak] Generate Pairing Code (Step 1)', 'color:#7c3aed;font-weight:600');
    setPairingLoading(true);
    try {
      const sessUser = getSessionUser();
      const res = await api.post<any>('/anak/pairing/generate', {
        user_id: sessUser?.id
      });
      console.debug('Response POST /anak/pairing/generate:', res);
      if (res?.ok && res?.data) {
        const d = res.data;
        setGeneratedPairing({
          code: d.code ?? '',
          pin: d.pin ?? '',
          qrPayload: d.qr_payload,
          expiresAt: d.expires_at,
          paired: false,
          deviceInfo: null
        });
        startPairingCountdown(d.expires_at);
        showToast('Kode pairing berhasil dibuat. Silakan scan QR di perangkat anak.', 'info');
        // Mulai polling realtime status pairing
        startPairingPolling(d.code ?? '');
      } else {
        showToast(res?.message || 'Gagal generate kode pairing', 'error');
      }
    } catch (err: any) {
      console.error('[Anak] Exception generate pairing:', err);
      showToast(err?.message || 'Gagal generate kode pairing. Periksa koneksi.', 'error');
    } finally {
      setPairingLoading(false);
      console.groupEnd();
    }
  };

  // Polling realtime status pairing setiap 2.5 detik
  // Sampai status paired=true (perangkat terhubung) → otomatis lanjut ke Step 2 Form Data Anak
  const startPairingPolling = (pairingCode: string) => {
    if (!pairingCode) return;
    setPollingPairing(true);
    setPairingPollCount(n => n + 1);
    console.groupCollapsed('%c[Anak] Mulai Polling Status Pairing', 'color:#0d9488;font-weight:600');
    console.debug('Polling kode:', pairingCode);
    console.groupEnd();
    pollPairingStatusOnce(pairingCode);
  };

  const pollPairingStatusOnce = async (pairingCode: string) => {
    if (!pairingCode) return;
    try {
      const res = await api.get<any>(`/anak/pairing/status?code=${encodeURIComponent(pairingCode)}`);
      const data = res?.data;
      console.debug(`%c[Anak] Poll #${pairingPollCount} status:`, 'color:#0d9488', data?.paired, data);
      if (data && data.paired === true) {
        // BERHASIL TERHUBUNG!
        console.log('%c[Anak] ✅ Pairing SUCCESS! Perangkat terdeteksi terhubung.', 'color:#059669;font-weight:700', data.device_info, 'name=', data.name);
        setPollingPairing(false);
        stopPairingCountdown();
        setGeneratedPairing(prev => ({
          ...prev,
          paired: true,
          deviceInfo: data.device_info ?? prev.deviceInfo
        }));

        // 🆕 RULE BARU: Backend confirmPairing SUDAH menyimpan / auto-create row ProfilAnak ke DB!
        // Jadi kita TIDAK USAH pindah ke Step 2 Form lagi (menghindari double POST / double data row
        // ketika user klik "Simpan" lagi di Step 2). Sebaliknya:
        // 1. Refresh daftar anak dari API agar row baru muncul realtime di list card
        // 2. OTOMATIS TUTUP modal tambah perangkat
        // 3. Tampilkan toast sukses final + informasi nama perangkat + nama anak yang tersinkron
        const namaPerangkat = data.device_info?.nama_perangkat || 'baru';
        const namaAnak = (typeof data.name === 'string') ? data.name.trim() : '';
        const namaAnakDisplay = namaAnak ? ` (${namaAnak})` : '';

        showToast(
          `✅ Perangkat ${namaPerangkat}${namaAnakDisplay} BERHASIL TERHUBUNG & TERSIMPAN! Data disinkronkan otomatis dari perangkat anak.`,
          'success'
        );

        // Isi prefill field device & nama dari backend (untuk state internal jika butuh)
        if (data.device_info) {
          setNewDeviceName(data.device_info.nama_perangkat || '');
          setNewDeviceModel(data.device_info.model || '');
          setNewOSVersion(`${data.device_info.os || ''} / ${data.device_info.versi_app || ''}`.trim().replace(/^ \/ /, ''));
        }
        if (namaAnak) {
          setNewChildName(namaAnak);
        }

        // 🔴 PENTING: JANGAN pindah ke Step 2. LANGSUNG refresh list + close modal!
        console.debug('[Anak] Auto-close modal + refresh children list dari API (Backend confirmPairing sudah save row ke DB → avoid double save).');
        setTimeout(async () => {
          try {
            // Refresh list children terlebih dahulu agar card baru muncul realtime
            await loadData();
          } catch (_err) {
            // Jika loadData gagal, tidak apa-apa. Tetap tutup modal saja.
          } finally {
            setShowAddModal(false);
          }
        }, 600);
        return;
      }
      setPairingPollCount(n => n + 1);
    } catch (e: any) {
      console.debug('[Anak] Polling status error (lanjut polling):', e);
    }
    // Schedule poll berikutnya jika masih polling
    setTimeout(() => {
      if (pairingCode && generatedPairing.paired !== true) {
        // Cek dari state terbaru via setter functional tidak perlu, coba cek satu kali lagi:
        pollPairingStatusOnce(pairingCode);
      }
    }, 2500);
  };

  // Simulasikan perangkat companion scan QR & confirm pairing (tombol di Step 1)
  // Digunakan untuk testing UX tanpa install companion app
  const handleSimulateDevicePaired = async () => {
    if (!generatedPairing.code || generatedPairing.paired) return;
    try {
      console.groupCollapsed('%c[Anak] Simulasi Perangkat Terhubung', 'color:#10b981;font-weight:600');
      console.debug('Code untuk disimulasikan paired:', generatedPairing.code);
      const res = await api.get<any>(`/anak/pairing/status?code=${encodeURIComponent(generatedPairing.code)}&simulate_paired=1`);
      console.debug('Response simulate paired:', res);
      if (res?.ok && res?.data && res.data.paired === true) {
        console.log('%c[Anak] Simulasi paired → SUCCESS', 'color:#059669');
        setGeneratedPairing(prev => ({
          ...prev,
          paired: true,
          deviceInfo: res.data.device_info ?? null
        }));
        const dInfo = res.data.device_info || {};
        setNewDeviceName(dInfo.nama_perangkat || '');
        setNewDeviceModel(dInfo.model || '');
        setNewOSVersion(`${dInfo.os || ''} / ${dInfo.versi_app || ''}`.trim().replace(/^ \/ /, ''));
        // Prefill state nama anak dari simulasi (jika ada)
        if (typeof res.data.name === 'string') {
          const namaTrim = res.data.name.trim();
          if (namaTrim) setNewChildName(namaTrim);
        }
        const namaAnak = (typeof res.data.name === 'string') ? res.data.name.trim() : '';
        const namaAnakDisplay = namaAnak ? ` (${namaAnak})` : '';
        showToast(`✅ Simulasi Sukses: Perangkat ${dInfo.nama_perangkat || 'baru'}${namaAnakDisplay} TERHUBUNG & TERSIMPAN otomatis!`, 'success');
        // 🆕 SAMA RULE BARU: JANGAN pindah Step 2. LANGSUNG refresh list + close modal (simulate backend sudah save).
        console.debug('[Anak] Simulasi paired: Auto-close modal + refresh children list (skip Step 2 to avoid double save).');
        setTimeout(async () => {
          try { await loadData(); } catch (_err) { /* ignore */ } finally { setShowAddModal(false); }
        }, 600);
      } else {
        showToast(res?.message || 'Gagal simulasikan perangkat terhubung', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal simulasi perangkat', 'error');
    } finally {
      console.groupEnd();
    }
  };

  // Step 2 Form Submit → Simpan data anak final ke API (POST /anak)
  // Data QR pair sudah dipastikan SUCCESS paired dari Step 1
  const handleProceedAndSaveChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) {
      showToast('Mohon isi nama anak', 'error');
      return;
    }
    if (!newDeviceName.trim()) {
      showToast('Mohon isi nama perangkat gadget anak', 'error');
      return;
    }
    if (!generatedPairing.paired) {
      showToast('Perangkat belum terhubung. Mohon pastikan scan QR pairing terlebih dahulu.', 'warning');
      return;
    }
    handleCompleteAddChild();
  };

  // Complete Pairing & Save New Child
  const handleCompleteAddChild = async () => {
    setIsSavingNewChild(true);
    console.groupCollapsed('%c[Anak] Tambah Profil Anak Baru (Final Save)', 'color:#6366f1;font-weight:600');
    try {
      const sessUser = getSessionUser();
      const payload = {
        user_id: sessUser?.id,
        name: newChildName.trim(),
        age: Number(newAge) || 8,
        gender: newGender,
        device_name: newDeviceName.trim(),
        device_model: newDeviceModel.trim() || `${newDeviceName.trim()} (Android)`,
        os_version: newOSVersion.trim() || 'Android 13 / Companion App v2.4',
        battery_level: 100,
        is_online: true,
        status: 'active',
        avatar: newAvatar,
        qr_pairing_code: generatedPairing.code,
        pairing_pin: generatedPairing.pin,
        paired_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        used_today: '0m',
        notes: newNotes.trim() || null,
      };
      console.debug('Payload POST /anak:', payload);
      const res = await api.post<any>('/anak', payload);
      console.debug('Response POST /anak:', res);

      if (res?.ok && res?.data) {
        const savedChild = mapDbAnakToChildProfile(res.data);
        console.debug('Hasil mapped child baru:', savedChild);
        setChildren(prev => [savedChild, ...prev]);
        setShowAddModal(false);
        showToast(`Perangkat ${savedChild.name} berhasil dipasangkan dan terhubung!`, 'success');
      } else {
        const msg = res?.message || 'Gagal menyimpan profil anak';
        console.error('Error save:', res);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      console.error('[Anak] Exception create child:', err);
      showToast(err?.message || 'Kesalahan jaringan saat simpan data anak', 'error');
    } finally {
      setIsSavingNewChild(false);
      console.groupEnd();
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (child: ChildProfile) => {
    setEditingChild({ ...child });
    setShowEditModal(true);
  };

  // Save Edit Child
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild) return;
    if (!editingChild.name.trim() || !editingChild.deviceName.trim()) {
      showToast('Nama anak dan nama perangkat wajib diisi', 'error');
      return;
    }
    console.groupCollapsed(`%c[Anak] Edit Profil ${editingChild.name}`, 'color:#f59e0b;font-weight:600');
    try {
      const payload = {
        name: editingChild.name.trim(),
        age: Number(editingChild.age) || 8,
        gender: editingChild.gender,
        device_name: editingChild.deviceName.trim(),
        device_model: editingChild.deviceModel || undefined,
        avatar: editingChild.avatar,
        notes: editingChild.notes || null,
      };
      console.debug('Payload PUT /anak/{id}:', payload);
      const res = await api.put<any>(`/anak/${editingChild.id}`, payload);
      console.debug('Response PUT /anak/{id}:', res);
      if (res?.ok) {
        const updatedChild = res?.data ? mapDbAnakToChildProfile(res.data) : editingChild;
        setChildren(prev =>
          prev.map(c => (c.id === editingChild.id ? updatedChild : c))
        );
        showToast(`Data profil ${updatedChild.name} berhasil diperbarui`, 'success');
        setShowEditModal(false);
        setEditingChild(null);
      } else {
        showToast(res?.message || 'Gagal memperbarui data profil', 'error');
      }
    } catch (err: any) {
      console.error('[Anak] Exception edit child:', err);
      showToast(err?.message || 'Kesalahan jaringan saat edit profil', 'error');
    } finally {
      console.groupEnd();
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (child: ChildProfile) => {
    setDeletingChild(child);
    setShowDeleteModal(true);
  };

  // Confirm Delete Child
  const handleConfirmDelete = async () => {
    if (!deletingChild) return;
    console.groupCollapsed(`%c[Anak] Hapus Profil ${deletingChild.name}`, 'color:#ef4444;font-weight:600');
    try {
      const res = await api.del<any>(`/anak/${deletingChild.id}`);
      console.debug('Response DELETE /anak/{id}:', res);
      if (res?.ok) {
        setChildren(prev => prev.filter(c => c.id !== deletingChild.id));
        showToast(`Profil & perangkat ${deletingChild.name} berhasil dihapus`, 'success');
        setShowDeleteModal(false);
        setDeletingChild(null);
      } else {
        showToast(res?.message || 'Gagal menghapus profil anak', 'error');
      }
    } catch (err: any) {
      console.error('[Anak] Exception delete child:', err);
      showToast(err?.message || 'Kesalahan jaringan saat hapus profil', 'error');
    } finally {
      console.groupEnd();
    }
  };

  // View QR Code for existing device
  const handleOpenQRModal = (child: ChildProfile) => {
    setSelectedQRChild(child);
    setShowQRModal(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} berhasil disalin ke clipboard`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">
              Kelola Profil Anak & Perangkat
            </h2>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10.5px] rounded-md font-medium border border-indigo-200 dark:border-indigo-800">
              {children.length} Perangkat Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            Daftar anak dan perangkat HP/Tablet yang terhubung dalam perlindungan aplikasi Litensi Kids
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 transition-colors text-xs font-normal flex items-center gap-1.5 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Perangkat Anak</span>
          </button>
        </div>
      </div>

      {/* Banner Error Fetch Data */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/60 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-full border border-red-500/50 bg-red-500/10 text-red-500 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-normal leading-snug block">
                {errorMsg}
              </span>
              <span className="text-[10px] sm:text-xs text-red-500/80 dark:text-red-400/80 font-normal block mt-0.5">
                Periksa koneksi jaringan atau pastikan server backend berjalan di http://127.0.0.1:8000
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              loadData();
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-normal rounded-xl transition-colors cursor-pointer shrink-0 self-start sm:self-center flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama anak atau nama perangkat gadget..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
          Menampilkan <span className="font-medium text-slate-900 dark:text-white">{filteredChildren.length}</span> dari {children.length} anak
        </div>
      </div>

      {/* Loading Skeleton / List Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/2" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredChildren.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {searchQuery ? 'Tidak ada perangkat anak yang cocok dengan kata kunci' : 'Belum ada perangkat anak yang terhubung'}
          </p>
          <p className="text-xs text-slate-400 font-normal">
            {searchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Klik tombol \'Tambah Perangkat Anak\' untuk mulai scan QR Code pairing.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChildren.map(child => (
            <div
              key={child.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 hover:border-indigo-400/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Child & Device Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {renderAvatarIcon(child.avatar, 'w-11 h-11', 'w-5 h-5')}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                          {child.name}
                        </h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                          {child.age} thn
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                        <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{child.deviceName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                      child.status === 'locked'
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {child.status === 'locked' ? 'Terkunci' : 'Aktif'}
                  </span>
                </div>

                {/* Device Diagnostics Bar */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-normal pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      {child.isOnline ? (
                        <Wifi className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-slate-400" />
                      )}
                      Koneksi
                    </span>
                    <span className={`font-medium text-[10.5px] ${child.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {child.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Battery className="w-3 h-3 text-amber-500" />
                      Baterai
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-[10.5px]">
                      {child.batteryLevel || 80}%
                    </span>
                  </div>
                </div>

                {/* Info Details */}
                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  <div className="flex justify-between items-center">
                    <span>Model HP / OS:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium text-right truncate max-w-[140px]">
                      {child.deviceModel || child.deviceName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Terakhir Aktif:</span>
                    <span className="text-slate-700 dark:text-slate-300">{child.lastActive || 'Baru saja'}</span>
                  </div>
                  {child.notes && (
                    <div className="pt-1 text-[10.5px] text-slate-400 italic line-clamp-1">
                      Catatan: {child.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                {/* QR Code Pairing Button */}
                <button
                  type="button"
                  onClick={() => handleOpenQRModal(child)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Lihat QR Code Pairing"
                >
                  <QrCode className="w-4 h-4" />
                </button>

                {/* Edit Child Button */}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(child)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Edit Profil Anak"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Delete Child Button */}
                <button
                  type="button"
                  onClick={() => handleOpenDelete(child)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Perangkat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Lock / Unlock Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleOpenLockModal(child)}
                  className={`ml-auto px-2.5 py-1 rounded-xl text-xs font-normal transition-colors cursor-pointer flex items-center gap-1 ${
                    child.status === 'locked'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}
                >
                  {child.status === 'locked' ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>Buka Kunci</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Kunci Layar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH PERANGKAT ANAK (FLOW SESUAI REQUIREMENT USER: QR DULU!) */}
      {/* Step 1: QR Code + Manual Code + Polling Realtime Status → Step 2: Form Data Anak */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${addStep === 'pairing' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'}`}>
                  {addStep === 'pairing' ? (
                    <QrCode className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                    {addStep === 'pairing' ? 'Hubungkan Perangkat Anak' : 'Lengkapi Data Anak'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {addStep === 'pairing' ? 'Langkah 1 dari 2: Scan QR Code atau masukkan kode manual' : 'Langkah 2 dari 2: Isi identitas anak & simpan'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ========================================================================= */}
            {/* STEP 1: QR CODE PAIRING WORKFLOW — TAMPIL PERTAMA KALI (DEFAULT)          */}
            {/* ========================================================================= */}
            {addStep === 'pairing' ? (
              <div className="space-y-4 text-center">
                {/* Banner Instruksi */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-left border border-indigo-100 dark:border-indigo-900/60">
                  <div className="flex items-start gap-2">
                    <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs font-normal text-slate-700 dark:text-slate-300">
                      <p className="font-medium text-indigo-700 dark:text-indigo-300">
                        Buka aplikasi <b>Litensi Kids Companion</b> di HP/Tablet anak:
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        Pilih menu <b>"Scan QR Pairing"</b> lalu arahkan kamera perangkat anak ke kode QR. Jika tidak bisa scan, gunakan kode manual di bawah.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Loading saat generate code */}
                {pairingLoading && !generatedPairing.code ? (
                  <div className="py-16 text-center space-y-2">
                    <RefreshCw className="w-10 h-10 mx-auto text-indigo-500 animate-spin" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Membuat kode pairing unik...</p>
                  </div>
                ) : generatedPairing.code ? (
                  <>
                    {/* QR Code Container — LOKAL via qrcode.react (BUKAN external api.qrserver.com third party!) */}
                    <div className="relative mx-auto w-56 h-56 bg-white p-3 rounded-2xl border-2 border-indigo-500 shadow-md flex flex-col items-center justify-center overflow-hidden">
                      <QRCodeSVG
                        value={
                          generatedPairing.qrPayload && String(generatedPairing.qrPayload).trim().length > 0
                            ? generatedPairing.qrPayload
                            : JSON.stringify({
                                t: 'litensi-pair',
                                v: 1,
                                c: generatedPairing.code,
                                p: generatedPairing.pin,
                                u: Number(getSessionUser()?.id ?? 0),
                                ts: Date.now()
                              })
                        }
                        size={200}
                        level="M"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#4f46e5"
                        className="w-44 h-44 rounded-lg"
                      />
                      {/* Pulse scan animation border */}
                      <div className="absolute inset-0 border-2 border-dashed border-indigo-400/50 rounded-2xl pointer-events-none animate-pulse" />
                    </div>

                    {/* Status Realtime Polling + TTL Countdown BERBARIS */}
                    <div className="flex flex-col items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-normal pt-1">
                      <div className="flex items-center justify-center gap-2">
                        {generatedPairing.paired ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Perangkat BERHASIL TERHUBUNG ✅
                            </span>
                          </>
                        ) : (
                          <>
                            <Radio className={`w-4 h-4 text-indigo-500 ${pollingPairing ? 'animate-pulse' : ''}`} />
                            <span>
                              {pollingPairing ? 'Menunggu perangkat scan QR...' : 'Siap untuk di-scan'}
                              {pollingPairing && pairingPollCount > 0 && (
                                <span className="text-[10px] ml-1 text-slate-400">(cek #{pairingPollCount})</span>
                              )}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Countdown TTL kode pairing (10 menit) */}
                      {!generatedPairing.paired && (pairingSecondsLeft != null) && pairingSecondsLeft > 0 && (
                        <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-500 mt-0.5">
                          <Timer className="w-3 h-3 text-slate-400" />
                          <span>
                            Kode berlaku:{' '}
                            <span
                              className={`font-mono font-semibold ${
                                pairingSecondsLeft <= 120 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'
                              }`}
                            >
                              {formatPairingCountdown(pairingSecondsLeft)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pairing Code & PIN Fallback */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-2 text-xs font-normal">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Kode Pairing:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400 text-xs tracking-wider">
                            {generatedPairing.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(generatedPairing.code, 'Kode Pairing')}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Salin Kode"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                        <span className="text-slate-400 text-[11px]">PIN Verifikasi Cepat:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tracking-widest text-xs">
                            {generatedPairing.pin}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(generatedPairing.pin, 'PIN Verifikasi')}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Salin PIN"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {generatedPairing.deviceInfo && (
                        <div className="pt-2 mt-1 border-t border-emerald-200/60 dark:border-emerald-900/50">
                          <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Wifi className="w-3 h-3" /> Perangkat Terdeteksi:
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                            {generatedPairing.deviceInfo.nama_perangkat}
                            {generatedPairing.deviceInfo.model && <span className="text-slate-500"> · {generatedPairing.deviceInfo.model}</span>}
                          </p>
                          {generatedPairing.deviceInfo.os && (
                            <p className="text-[10.5px] text-slate-500 mt-0.5">
                              OS: {generatedPairing.deviceInfo.os} · App v{generatedPairing.deviceInfo.versi_app?.replace('Litensi Kids Companion v', '') || '-'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* LINK OPSIONAL FALLBACK SIMULASI (BUKAN TOMBOL UTAMA!) — HANYA UNTUK TESTING TANPA INSTALL COMPANION APP */}
                      {!generatedPairing.paired && (
                        <div className="pt-2 mt-1 border-t border-slate-200/70 dark:border-slate-700/80 text-center">
                          <button
                            type="button"
                            onClick={handleSimulateDevicePaired}
                            className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal hover:text-teal-600 dark:hover:text-teal-300 underline decoration-dotted decoration-teal-400/60 cursor-pointer transition-colors"
                            title="Mode testing: simulasikan seolah-olah perangkat anak sudah scan QR & confirm PIN"
                          >
                            <Sparkles className="w-3 h-3 inline -mt-0.5 mr-1" />
                            Sudah scan tapi belum terhubung? Simulasikan pairing (testing)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions Bar Step 1 */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-normal cursor-pointer"
                      >
                        Batal
                      </button>

                      {/* Button ke Step 2 Form (HANYA AKTIF JIKA SUDAH PAIRED!) */}
                      <button
                        type="button"
                        disabled={!generatedPairing.paired}
                        onClick={() => setAddStep('form')}
                        className={`px-4 py-2 text-xs rounded-xl font-normal cursor-pointer shadow-xs flex items-center gap-1.5 ${
                          generatedPairing.paired
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                          {generatedPairing.paired ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Lanjut Isi Data Anak</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3.5 h-3.5" />
                              <span>Perangkat Belum Terhubung</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
              /* ========================================================================= */
              /* STEP 2: FORM DATA ANAK (HANYA SETELAH PAIRED / TERHUBUNG)                 */
              /* ========================================================================= */
              <form onSubmit={handleProceedAndSaveChild} className="space-y-3.5">
                {/* Info preview perangkat yang sudah terhubung */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-left border border-emerald-100 dark:border-emerald-900/60">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs font-normal text-slate-700 dark:text-slate-300 flex-1">
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        Perangkat Terhubung ✅
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        Gadget <b>{newDeviceName || generatedPairing.deviceInfo?.nama_perangkat || 'Anak'}</b> terhubung.
                        Sekarang lengkapi data identitas anak berikut untuk menyelesaikan.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                    Nama Lengkap / Panggilan Anak *
                  </label>
                  <input
                    type="text"
                    required
                    value={newChildName}
                    onChange={e => setNewChildName(e.target.value)}
                    placeholder="Contoh: Nadia Putri atau Farhan"
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                      Usia Anak (Tahun)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={18}
                      value={newAge}
                      onChange={e => setNewAge(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={newGender}
                      onChange={e => setNewGender(e.target.value as 'laki-laki' | 'perempuan')}
                      className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    >
                      <option value="laki-laki">Laki-laki</option>
                      <option value="perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                    Nama Perangkat Gadget Anak *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeviceName}
                    onChange={e => setNewDeviceName(e.target.value)}
                    placeholder="Contoh: Tablet Samsung Tab A8 / Xiaomi Redmi 10"
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                      Model Perangkat
                    </label>
                    <input
                      type="text"
                      value={newDeviceModel}
                      onChange={e => setNewDeviceModel(e.target.value)}
                      placeholder="Otomatis terisi dari pairing"
                      className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                      OS / Versi App
                    </label>
                    <input
                      type="text"
                      value={newOSVersion}
                      onChange={e => setNewOSVersion(e.target.value)}
                      placeholder="Otomatis dari app companion"
                      className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Pilih Avatar */}
                <div>
                  <AvatarPicker
                    value={newAvatar}
                    onChange={setNewAvatar}
                    showToast={showToast}
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                    Catatan Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="Contoh: Jam tidur jam 21:00 / HP khusus daring sekolah"
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAddStep('pairing')}
                    className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-normal cursor-pointer flex items-center gap-1.5"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    <span>Kembali ke QR</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingNewChild}
                    className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-normal cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    {isSavingNewChild ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan Data Anak...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Simpan & Aktifkan Perlindungan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PROFIL & PERANGKAT ANAK */}
      {/* ========================================================================= */}
      {showEditModal && editingChild && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                    Edit Profil & Perangkat Anak
                  </h3>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Perbarui informasi identitas anak dan nama perangkat
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                  Nama Anak *
                </label>
                <input
                  type="text"
                  required
                  value={editingChild.name}
                  onChange={e => setEditingChild({ ...editingChild, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                    Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={18}
                    value={editingChild.age}
                    onChange={e => setEditingChild({ ...editingChild, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editingChild.gender}
                    onChange={e => setEditingChild({ ...editingChild, gender: e.target.value as 'laki-laki' | 'perempuan' })}
                    className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  >
                    <option value="laki-laki">Laki-laki</option>
                    <option value="perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                  Nama Perangkat Gadget *
                </label>
                <input
                  type="text"
                  required
                  value={editingChild.deviceName}
                  onChange={e => setEditingChild({ ...editingChild, deviceName: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                  Model / Spesifikasi Perangkat
                </label>
                <input
                  type="text"
                  value={editingChild.deviceModel || ''}
                  onChange={e => setEditingChild({ ...editingChild, deviceModel: e.target.value })}
                  placeholder="Contoh: SM-X200 (Android 13)"
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Pilih Avatar */}
              <div>
                <AvatarPicker
                  value={editingChild.avatar}
                  onChange={avatar => setEditingChild({ ...editingChild, avatar })}
                  showToast={showToast}
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-600 dark:text-slate-400 mb-1">
                  Catatan Khusus
                </label>
                <input
                  type="text"
                  value={editingChild.notes || ''}
                  onChange={e => setEditingChild({ ...editingChild, notes: e.target.value })}
                  placeholder="Catatan tambahan untuk anak ini..."
                  className="w-full px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-normal cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-normal cursor-pointer shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LIHAT QR CODE & DETAIL PAIRING */}
      {/* ========================================================================= */}
      {showQRModal && selectedQRChild && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  QR Code Pairing Perangkat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-900 dark:text-white">
                {selectedQRChild.name} ({selectedQRChild.deviceName})
              </p>
              <p className="text-[11px] text-slate-400 font-normal">
                Scan kode ini dari aplikasi Litensi Kids di HP anak untuk sinkronisasi ulang
              </p>
            </div>

            <div className="mx-auto w-48 h-48 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
              <QRCodeSVG
                value={JSON.stringify({
                  app: 'LitensiKids',
                  v: 1,
                  pairingCode: selectedQRChild.qrPairingCode || String(selectedQRChild.id || ''),
                  pin: selectedQRChild.pairingPin || String(selectedQRChild.id || ''),
                  childName: selectedQRChild.name,
                  deviceName: selectedQRChild.deviceName,
                  ts: Date.now()
                })}
                size={160}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#4f46e5"
                className="w-40 h-40 rounded-lg"
              />
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-1.5 text-xs font-normal text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">Kode Pairing:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                  {selectedQRChild.qrPairingCode || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">PIN Hubung:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                  {selectedQRChild.pairingPin || '-'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-normal transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KONFIRMASI HAPUS PERANGKAT ANAK */}
      {/* ========================================================================= */}
      {showDeleteModal && deletingChild && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Hapus Perangkat Anak?
                </h3>
                <span className="text-[11px] text-slate-400 font-normal">
                  Tindakan ini tidak dapat dibatalkan
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
              Apakah Anda yakin ingin menghapus profil <span className="font-medium text-slate-900 dark:text-white">{deletingChild.name}</span> beserta perangkat <span className="font-medium text-slate-900 dark:text-white">{deletingChild.deviceName}</span> dari perlindungan Litensi Kids?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-normal cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-normal cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Perangkat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: KONFIRMASI KUNCI LAYAR & PESAN KHUSUS / BUKA KUNCI */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showLockModal && targetLockChild && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800"
            >
              {/* Modal Header */}
              <div
                className={`px-5 py-3.5 flex items-center justify-between ${
                  targetLockChild.status === 'locked'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                    : 'bg-amber-50/70 dark:bg-amber-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      targetLockChild.status === 'locked'
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {targetLockChild.status === 'locked' ? (
                      <Unlock className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                      {targetLockChild.status === 'locked'
                        ? 'Konfirmasi Buka Kunci Layar'
                        : 'Konfirmasi Kunci Layar'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      {targetLockChild.status === 'locked'
                        ? 'Pulihkan akses perangkat anak'
                        : 'Kunci layar & tampilkan pesan khusus'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Target Child Information */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {renderAvatarIcon(targetLockChild.avatar, 'w-9 h-9', 'w-4 h-4')}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-900 dark:text-white">
                          {targetLockChild.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({targetLockChild.age} thn)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal block">
                        {targetLockChild.deviceModel || targetLockChild.deviceName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-medium block ${
                        targetLockChild.status === 'locked'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {targetLockChild.status === 'locked' ? '🔒 Terkunci' : '🔓 Tidak Terkunci'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Baterai {targetLockChild.batteryLevel}%
                    </span>
                  </div>
                </div>

                {targetLockChild.status === 'locked' ? (
                  /* Unlock State View */
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 font-normal space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Buka Kunci Layar Perangkat</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                        Membuka kunci layar akan langsung memberikan anak akses penuh kembali ke layar utama dan seluruh aplikasi di ponselnya.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Lock Screen Form View */
                  <div className="space-y-3.5">
                    {/* Pesan Kunci Layar Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Pesan Kunci Layar
                      </label>
                      <input
                        type="text"
                        value={lockMessage}
                        onChange={(e) => setLockMessage(e.target.value)}
                        placeholder="Tulis pesan yang muncul di layar anak..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 font-normal outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400/40"
                      />

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {[
                          'Waktunya Belajar 📚',
                          'Waktunya Istirahat 🌙',
                          'Waktu Layar Habis ⏳',
                          'Makan Bersama 🍽️'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setLockMessage(preset)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-normal transition-colors cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Durasi Kunci Layar */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Durasi Kunci Layar
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {['15 Menit', '30 Menit', '1 Jam', '2 Jam', 'Sampai Dibuka'].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setLockDuration(dur)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] transition-colors cursor-pointer border text-center ${
                              lockDuration === dur
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-50 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            {dur}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Emergency Call Guarantee */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Panggilan Darurat SOS dan nomor orang tua tetap dapat diakses oleh anak kapan saja saat layar terkunci.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-normal cursor-pointer transition-colors"
                >
                  Batal
                </button>
                {targetLockChild.status === 'locked' ? (
                  <button
                    type="button"
                    onClick={handleConfirmUnlock}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Buka Kunci Layar Sekarang</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmLock}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Kunci Layar Sekarang</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
