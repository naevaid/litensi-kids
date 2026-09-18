import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Shield, ShieldCheck, ShieldAlert, Plus, Search, Filter,
  RefreshCw, Navigation, AlertTriangle, Check, X, Sliders,
  Smartphone, User, Calendar, Clock, Trash2, Edit3, Eye, Radio,
  Compass, Battery, ChevronRight, Layers, Bell, ArrowRight
} from 'lucide-react';
import { GeofenceZone, GeofenceLog } from '../../types';
import { GoogleMapsGeofenceView } from './GoogleMapsGeofenceView';
import { GoogleMapsLocationPicker } from './GoogleMapsLocationPicker';
import { api, getSessionUser } from '../../lib/apiClient';

interface GeofencePageProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ChildOptionItem {
  id: string;
  name: string;
  deviceName: string;
  age?: number;
}

interface MarkerChild {
  id: string;
  name: string;
  device: string;
  lat: number;
  lng: number;
  battery: string;
  accuracy: string;
  status: string;
  zone: string;
  color: string;
  avatar: string;
}

const PLACEHOLDER_ALAMAT_DEFAULT = '';
const DEFAULT_RADIUS_METERS = 150;
const TENGAH_INA_DEFAULT = { lat: -2.5, lng: 118 };

// Mapping response API /anak ke ChildOptionItem
const mapApiAnakToChildOption = (db: any): ChildOptionItem => ({
  id: String(db.id ?? `anak-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
  name: db.name ?? String(db.id ?? 'Anak'),
  deviceName: db.device_name ?? db.deviceName ?? 'Perangkat Anak',
  age: db.age ? Number(db.age) : undefined,
});

// Helper: Map DB snake_case → TS camelCase untuk zona geofence
// Menerima children state (sudah loaded) untuk mapping assigned_children id/name ke nama asli user
const makeMapDbZonaGeofenceToInterface = (children: ChildOptionItem[]) => (db: any): GeofenceZone => {
  const getColorByCategory = (cat: string) => {
    switch (cat) {
      case 'home': return '#10b981';
      case 'school': return '#3b82f6';
      case 'danger': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#8b5cf6';
    }
  };

  const assignedRaw = Array.isArray(db.assigned_children) ? db.assigned_children : [];
  const assignedChildren = assignedRaw.map((raw: string) => {
    const byId = children.find(c => c.id === raw);
    if (byId) return byId.name;
    const byName = children.find(c => c.name === raw);
    return byName ? byName.name : raw;
  }).filter(Boolean) as string[];

  let lastTriggered = '-';
  if (db.last_triggered) {
    try {
      const d = new Date(db.last_triggered);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) lastTriggered = 'Baru saja';
      else if (diffMin < 60) lastTriggered = `${diffMin} menit lalu`;
      else if (diffMin < 1440) lastTriggered = `${Math.floor(diffMin / 60)} jam lalu`;
      else lastTriggered = d.toLocaleDateString('id-ID');
    } catch {
      lastTriggered = '-';
    }
  }

  return {
    id: String(db.id ?? `zone-${Date.now()}`),
    name: String(db.name ?? 'Zona Geofence'),
  category: (['safe','danger','warning','school','home'].includes(db.category) ? db.category : 'unknown') as any,
  address: String(db.address ?? '-'),
  latitude: Number(db.latitude ?? 0),
  longitude: Number(db.longitude ?? 0),
  radiusMeters: Number(db.radius_meters ?? DEFAULT_RADIUS_METERS),
  assignedChildren,
  notifyOnEnter: Boolean(db.notify_on_enter ?? true),
  notifyOnExit: Boolean(db.notify_on_exit ?? true),
  status: db.status === 'active' ? 'active' : 'inactive',
    color: String(db.color ?? getColorByCategory(db.category)),
    lastTriggered,
    createdAt: String(db.created_at ?? new Date().toISOString().split('T')[0]),
  };
};

// Helper: Map DB snake_case → TS camelCase untuk log geofence
function mapDbLogGeofenceToInterface(db: any): GeofenceLog {
  let timestamp = '-';
  if (db.timestamp) {
    try {
      const d = new Date(db.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const jamStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const tglStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (diffMin < 1) timestamp = `Baru saja (${jamStr})`;
      else if (diffMin < 60) timestamp = `${diffMin} menit lalu (${jamStr})`;
      else if (diffMin < 1440) timestamp = `Hari ini, ${jamStr}`;
      else timestamp = `${tglStr}, ${jamStr}`;
    } catch {
      timestamp = String(db.timestamp ?? '-');
    }
  }

  // Potong child_name lengkap (misal "Rayhan Pratama") jadi first name saja untuk UI ringkas
  let childShortName = String(db.child_name ?? 'Anak');
  if (childShortName.indexOf(' ') !== -1) {
    childShortName = childShortName.split(' ')[0];
  }

  const eventType = (['enter','exit','dwell'].includes(db.event_type)
    ? db.event_type : 'enter') as GeofenceLog['eventType'];

  const zoneType = (['safe','danger','warning','school','home'].includes(db.zone_type)
    ? db.zone_type : 'safe') as GeofenceLog['zoneType'];

  return {
    id: String(db.id ?? `log-${Date.now()}`),
    childName: childShortName,
    deviceName: String(db.device_name ?? 'Perangkat Anak'),
    zoneName: String(db.zone_name ?? 'Zona Geofence'),
    zoneType,
    eventType,
    timestamp,
    locationCoordinates: String(db.location_coordinates ?? '-'),
    batteryStatus: db.battery_status ? String(db.battery_status) : undefined,
    accuracy: String(db.accuracy ?? '-'),
  };
}

// Helper: Reverse mapper form state anak ID/NAME ke DB string list.
// Jika user memilih ID (dari children state) → kirim ID asli, jika legacy name → kirim name (mapping backend akan tangani)
const makeMapFormToDbBody = (children: ChildOptionItem[]) => (params: {
  editingZoneId?: string;
  formName: string;
  formCategory: GeofenceZone['category'];
  formAddress: string;
  formLat: number;
  formLng: number;
  formRadius: number;
  formChildren: string[];
  formNotifyEnter: boolean;
  formNotifyExit: boolean;
}) => {
  const assignedChildrenDb: string[] = params.formChildren.map(selected => {
    const byId = children.find(c => c.id === selected);
    if (byId) return byId.id;
    const byName = children.find(c => c.name === selected);
    return byName ? byName.id : selected;
  }).filter(Boolean);
  return {
    name: params.formName.trim(),
    category: params.formCategory,
    address: params.formAddress.trim(),
    latitude: params.formLat,
    longitude: params.formLng,
    radius_meters: params.formRadius,
    assigned_children: assignedChildrenDb,
    notify_on_enter: params.formNotifyEnter,
    notify_on_exit: params.formNotifyExit,
  };
};

// Helper: Format timestamp relatif (untuk KPI card)
function formatRelatifTime(dbTimestamp: string | null | undefined): string {
  if (!dbTimestamp) return '-';
  try {
    const d = new Date(dbTimestamp);
    if (isNaN(d.getTime())) return String(dbTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const jamStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    if (diffMin < 1440) return `Tiba ${jamStr}`;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ` ${jamStr}`;
  } catch {
    return String(dbTimestamp);
  }
}

export const GeofencePage: React.FC<GeofencePageProps> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [logs, setLogs] = useState<GeofenceLog[]>([]);
  const [children, setChildren] = useState<ChildOptionItem[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [activeTab, setActiveTab] = useState<'peta' | 'daftar' | 'riwayat'>('peta');
  const [isSaving, setIsSaving] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [selectedZoneOnMap, setSelectedZoneOnMap] = useState<GeofenceZone | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<GeofenceZone | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<GeofenceZone['category']>('safe');
  const [formAddress, setFormAddress] = useState(PLACEHOLDER_ALAMAT_DEFAULT);
  const [formLat, setFormLat] = useState<number>(0);
  const [formLng, setFormLng] = useState<number>(0);
  const [formRadius, setFormRadius] = useState(DEFAULT_RADIUS_METERS);
  const [formChildren, setFormChildren] = useState<string[]>([]);
  const [formNotifyEnter, setFormNotifyEnter] = useState(true);
  const [formNotifyExit, setFormNotifyExit] = useState(true);
  const [showMapPickerInModal, setShowMapPickerInModal] = useState(true);

  // Delete Modal State
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<GeofenceZone | null>(null);

  // Live Simulated GPS State
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  // Helper: dapatkan anak dari children state (by id atau name fallback)
  const getAnak = (idOrName: string): ChildOptionItem | null => {
    if (!idOrName) return null;
    const byId = children.find(c => c.id === idOrName);
    if (byId) return byId;
    const byName = children.find(c => c.name === idOrName);
    return byName || null;
  };

  // Dapatkan daftar unik anak (gabungan children API + yang muncul di logs zona)
  const daftarAnakUnik = useMemo<ChildOptionItem[]>(() => {
    const mapByName = new Map<string, ChildOptionItem>();
    if (Array.isArray(children)) {
      children.forEach(c => { mapByName.set(c.name, c); });
    }
    // Tambahkan nama anak yang muncul di logs (jika tidak ada di children API)
    logs.forEach(log => {
      if (log.childName && !mapByName.has(log.childName)) {
        mapByName.set(log.childName, {
          id: `log-anak-${log.childName}`,
          name: log.childName,
          deviceName: log.deviceName || 'Perangkat Anak',
        });
      }
    });
    return Array.from(mapByName.values());
  }, [children, logs]);

  // ============== LOAD DATA REAL DARI API ==============
  const loadData = async () => {
    console.groupCollapsed('%c[Geofence] loadData GET /anak + /geofence + /geofence/logs', 'color:#0d9488;font-weight:700');
    try {
      setErrorMsg(null);
      setLoading(true);
      setLoadingChildren(true);

      const sessUser = getSessionUser();
      let listAnak: ChildOptionItem[] = [];
      const uid = sessUser?.id ? String(sessUser.id) : '';
      if (uid) {
        try {
          const resAnak = await api.get<any[]>('/anak');
          if (resAnak?.ok && Array.isArray(resAnak.data)) {
            listAnak = resAnak.data.map(mapApiAnakToChildOption).filter(Boolean) as ChildOptionItem[];
          }
        } catch (errAnak) {
          console.debug('[Geofence] gagal load daftar anak (lanjut empty list):', errAnak);
        }
      }
      setChildren(listAnak);
      setLoadingChildren(false);

      const [zonaResp, logResp] = await Promise.all([
        uid ? api.get('/geofence', { params: { user_id: uid } }) : Promise.resolve({ ok: true, data: [] } as any),
        uid ? api.get('/geofence/logs', { params: { user_id: uid, limit: 100 } }) : Promise.resolve({ ok: true, data: [] } as any),
      ]);

      console.debug('%c[Geofence] GET /geofence response shape', 'color:#0d9488;font-weight:600', zonaResp);
      console.debug('%c[Geofence] GET /geofence/logs response shape', 'color:#0d9488;font-weight:600', logResp);

      const zonaPayload = Array.isArray(zonaResp.data) ? zonaResp.data : [];
      const logPayload = Array.isArray(logResp.data) ? logResp.data : [];

      console.debug(`%c[Geofence] Terima ${zonaPayload.length} zona + ${logPayload.length} log dari DB`, 'color:#0d9488;font-weight:600');

      const mapperZona = makeMapDbZonaGeofenceToInterface(listAnak);
      const mappedZones = zonaPayload.map((z: any) => mapperZona(z));
      const mappedLogs = logPayload.map((l: any) => mapDbLogGeofenceToInterface(l));

      console.debug('%c[Geofence] Zona setelah mapping (camelCase):', 'color:#0d9488;font-weight:600', mappedZones);
      console.debug('%c[Geofence] Log setelah mapping (camelCase):', 'color:#0d9488;font-weight:600', mappedLogs);

      setZones(mappedZones);
      setLogs(mappedLogs);
      if (mappedZones.length > 0 && !selectedZoneOnMap) {
        setSelectedZoneOnMap(mappedZones[0]);
      } else if (mappedZones.length > 0 && selectedZoneOnMap) {
        const stillExists = mappedZones.find(z => z.id === selectedZoneOnMap.id);
        if (!stillExists) setSelectedZoneOnMap(mappedZones[0]);
      } else if (mappedZones.length === 0) {
        setSelectedZoneOnMap(null);
      }
    } catch (err: any) {
      console.error('%c[Geofence] Gagal load data:', 'color:#dc2626;font-weight:700', err);
      const msg = err?.message || err?.data?.message || 'Gagal memuat data geofence dari server';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setLoadingChildren(false);
      console.groupEnd();
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============== HANDLE SAVE ZONE (POST / PUT API) ==============
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAddress.trim()) {
      showToast('Nama geofence dan alamat lokasi wajib diisi', 'warning');
      return;
    }

    if (formChildren.length === 0) {
      showToast('Pilih minimal satu anak yang diawasi di zona ini', 'warning');
      return;
    }

    const mapperForm = makeMapFormToDbBody(children);
    const body = mapperForm({
      editingZoneId: editingZone?.id,
      formName, formCategory, formAddress, formLat, formLng,
      formRadius, formChildren, formNotifyEnter, formNotifyExit,
    });

    console.groupCollapsed('%c[Geofence] handleSaveZone', 'color:#0d9488;font-weight:700');
    try {
      setIsSaving(true);
      if (editingZone) {
        console.debug(`%c[Geofence] PUT /geofence/${editingZone.id}`, 'color:#0d9488;font-weight:600', body);
        await api.put(`/geofence/${editingZone.id}`, body as any);
        showToast(`Geofence "${formName}" berhasil diperbarui`, 'success');
      } else {
        console.debug('%c[Geofence] POST /geofence', 'color:#0d9488;font-weight:600', body);
        await api.post('/geofence', body as any);
        showToast(`Geofence baru "${formName}" berhasil dibuat`, 'success');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('%c[Geofence] Gagal simpan:', 'color:#dc2626;font-weight:700', err);
      const msg = err?.message || err?.data?.message || 'Gagal menyimpan geofence ke server';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  // ============== HANDLE DELETE ZONE (DELETE API) ==============
  const handleDeleteZone = async () => {
    if (!deleteZoneTarget) return;
    console.groupCollapsed('%c[Geofence] handleDeleteZone', 'color:#0d9488;font-weight:700');
    try {
      setIsSaving(true);
      console.debug(`%c[Geofence] DELETE /geofence/${deleteZoneTarget.id}`, 'color:#0d9488;font-weight:600');
      await api.del(`/geofence/${deleteZoneTarget.id}`);
      showToast(`Geofence "${deleteZoneTarget.name}" berhasil dihapus`, 'info');
      setDeleteZoneTarget(null);
      await loadData();
    } catch (err: any) {
      console.error('%c[Geofence] Gagal hapus:', 'color:#dc2626;font-weight:700', err);
      const msg = err?.message || err?.data?.message || 'Gagal menghapus geofence';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
      console.groupEnd();
    }
  };

  // ============== KOMPUTASI DINAMIS KPI DARI LOG TERBARU ==============
  const latestLogPerChild = useMemo(() => {
    // Urutkan logs berdasarkan timestamp (dari raw logs field timestamp_original tidak disimpan,
    // tapi kita bisa pakai urutan array DB yang biasanya newest-first atau berdasarkan id descending)
    // Untuk akurasi lebih baik, kita simpan map last per child:
    const map: Record<string, GeofenceLog> = {};
    // Iterasi logs dari index terbesar (asumsi seed insert ascending, index terakhir = terbaru)
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      if (!map[log.childName]) map[log.childName] = log;
    }
    return map;
  }, [logs]);

  // Hitung rata-rata akurasi GPS dari semua log untuk KPI card 4
  // ZERO TOLERANCE FALLBACK: JIKA TIDAK ADA DATA / TIDAK ADA ANGKA → RETURN '-' EMPTY STATE JUJUR.
  const avgAccuracyText = useMemo(() => {
    if (logs.length === 0) return '-';
    const nums: number[] = [];
    logs.forEach(l => {
      const m = String(l.accuracy).match(/\d+/);
      if (m) nums.push(Number(m[0]));
    });
    if (nums.length === 0) return '-';
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return `±${Math.round(avg)} Meter`;
  }, [logs]);

  const handleRefreshGps = async () => {
    setIsRefreshingGps(true);
    try {
      await loadData();
      setIsRefreshingGps(false);
      const totalLog = logs.length;
      const totalZona = zones.length;
      const totalAnak = Object.keys(latestLogPerChild).length;
      const detail = totalZona || totalLog || totalAnak
        ? ` (${totalZona} zona, ${totalAnak} perangkat, ${totalLog} log riwayat)`
        : '';
      showToast(`Berhasil muat ulang data geofence terbaru dari server${detail}`, 'success');
    } catch (err) {
      setIsRefreshingGps(false);
      const msg = err instanceof Error ? err.message : 'Gagal muat ulang data geofence';
      showToast(msg, 'error');
    }
  };

  // Helper: Build marker anak untuk Google Maps dari latestLogPerChild
  // ZERO HARDCODE: TIDAK ADA posisi RAYHAN/NADIA Jakarta hardcode.
  // Jika log punya latitude/longitude field → pakai itu. Jika tidak (log legacy):
  //   Jika zona terkait ada di zones → pakai tengah zona.
  //   Jika tidak ada → fallback ke TENGAH_INA_DEFAULT (tidak bias kota)
  const markerChildren = useMemo<MarkerChild[]>(() => {
    const daftar = daftarAnakUnik;
    if (daftar.length === 0) return [];
    const PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];
    const hasil: MarkerChild[] = [];
    daftar.forEach((anak, idx) => {
      const log = latestLogPerChild[anak.name] || null;
      let lat = Number(log?.latitude ?? 0);
      let lng = Number(log?.longitude ?? 0);
      if ((!lat && lat !== 0) || (!lng && lng !== 0) || (lat === 0 && lng === 0)) {
        const zoneName = log?.zoneName || '';
        const zonaDariNama = zoneName ? zones.find(z => z.name === zoneName) : null;
        if (zonaDariNama) { lat = zonaDariNama.latitude; lng = zonaDariNama.longitude; }
        else if (zones.length > 0) {
          // Fallback tengah semua zona (user punya zona tapi log belum ada koordinat)
          const sumLat = zones.reduce((a, z) => a + (Number(z.latitude) || 0), 0);
          const sumLng = zones.reduce((a, z) => a + (Number(z.longitude) || 0), 0);
          lat = sumLat / zones.length; lng = sumLng / zones.length;
        } else {
          // Fallback NETRAL: Tengah Indonesia (-2.5,118) BUKAN JAKARTA
          lat = TENGAH_INA_DEFAULT.lat; lng = TENGAH_INA_DEFAULT.lng;
        }
      }
      const badgeInfo = (() => { try { return getChildLocationBadge(anak.name); } catch { return { badge: 'Belum ada data', badgeColor: 'slate' as const, zone: '-' }; } })();
      hasil.push({
        id: anak.id,
        name: anak.name,
        device: anak.deviceName || (log?.deviceName ?? 'Perangkat Anak'),
        lat: Number(lat) || TENGAH_INA_DEFAULT.lat,
        lng: Number(lng) || TENGAH_INA_DEFAULT.lng,
        battery: String(log?.batteryStatus ?? (log ? 'Data tersedia' : '-')).trim() || '-',
        accuracy: String(log?.accuracy ?? (log ? 'Tersedia' : '-')).trim() || '-',
        status: badgeInfo.badge || (log ? 'Data lokasi tersedia' : 'Belum ada log lokasi'),
        zone: String(log?.zoneName ?? badgeInfo.zone ?? '-').trim() || '-',
        color: PALETTE[idx % PALETTE.length],
        avatar: (anak.name || 'A').trim().charAt(0).toUpperCase() || 'A',
      });
    });
    return hasil;
  }, [daftarAnakUnik, latestLogPerChild, zones]);

  const handleSimulateTesting = () => {
    showToast('Testing lokasi: Data marker anak diambil dari log riwayat perangkat. Simulasi pergerakan GPS real membutuhkan Android Companion App aktif di HP anak', 'info');
  };

  const handleToggleZoneStatus = (zoneId: string) => {
    setZones(prev => prev.map(z => {
      if (z.id === zoneId) {
        const nextStatus = z.status === 'active' ? 'inactive' : 'active';
        showToast(`Geofence "${z.name}" sekarang ${nextStatus === 'active' ? 'Aktif' : 'Dinonaktifkan'}`, 'info');
        return { ...z, status: nextStatus };
      }
      return z;
    }));
  };

  const openAddModal = (presetLocation?: { lat: number; lng: number; address: string; name?: string }) => {
    setEditingZone(null);
    setFormName(presetLocation?.name || '');
    setFormCategory('safe');
    // ZERO HARDCODE: TIDAK ADA preset alamat Jl Melati / Koordinat Monas Jakarta
    setFormAddress(presetLocation?.address || PLACEHOLDER_ALAMAT_DEFAULT);
    setFormLat(Number(presetLocation?.lat ?? 0));
    setFormLng(Number(presetLocation?.lng ?? 0));
    setFormRadius(DEFAULT_RADIUS_METERS);
    // ZERO HARDCODE: TIDAK ADA preselect anak Nadia/Rayhan
    setFormChildren([]);
    setFormNotifyEnter(true);
    setFormNotifyExit(true);
    setShowMapPickerInModal(true);
    setIsModalOpen(true);
  };

  const openEditModal = (zone: GeofenceZone) => {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormCategory(zone.category);
    setFormAddress(zone.address);
    setFormLat(zone.latitude);
    setFormLng(zone.longitude);
    setFormRadius(zone.radiusMeters);
    setFormChildren([...zone.assignedChildren]);
    setFormNotifyEnter(zone.notifyOnEnter);
    setFormNotifyExit(zone.notifyOnExit);
    setShowMapPickerInModal(true);
    setIsModalOpen(true);
  };

  const toggleChildSelection = (child: string) => {
    if (formChildren.includes(child)) {
      setFormChildren(prev => prev.filter(c => c !== child));
    } else {
      setFormChildren(prev => [...prev, child]);
    }
  };

  // Filtered Zones
  const filteredZones = zones.filter(zone => {
    const matchSearch = zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        zone.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || zone.category === categoryFilter;
    const matchChild = selectedChild === 'all' || zone.assignedChildren.includes(selectedChild);
    return matchSearch && matchCat && matchChild;
  });

  const getCategoryBadge = (cat: GeofenceZone['category'] | 'unknown') => {
    switch (cat) {
      case 'home':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <ShieldCheck className="w-3 h-3" /> Rumah (Zona Aman)
          </span>
        );
      case 'school':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            <MapPin className="w-3 h-3" /> Sekolah
          </span>
        );
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
            <ShieldAlert className="w-3 h-3" /> Zona Terlarang / Bahaya
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
            <AlertTriangle className="w-3 h-3" /> Area Waspada
          </span>
        );
      case 'safe':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
            <MapPin className="w-3 h-3" /> Tempat Les / Khusus
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
            <AlertTriangle className="w-3 h-3" /> Kategori Tidak Dikenal
          </span>
        );
    }
  };

  const activeZonesCount = zones.filter(z => z.status === 'active').length;

  // Helper untuk mendapatkan status badge lokasi anak (untuk side panel di tab peta)
  // ZERO TOLERANCE FALLBACK: DEFAULT JANGAN ANGGAP "DALAM ZONA AMAN" BILA ZONETYPE TIDAK DIKETAHUI.
  const getChildLocationBadge = (childName: string) => {
    const log = latestLogPerChild[childName];
    if (!log) return { zone: 'Lokasi tidak diketahui', badge: 'Tidak Terdata', badgeColor: 'slate' };
    const zoneType = log.zoneType;
    const zoneName = log.zoneName;
    let badge: string;
    let badgeColor: 'emerald' | 'blue' | 'rose' | 'amber' | 'slate' = 'slate';
    switch (zoneType) {
      case 'home': badge = 'Di Rumah'; badgeColor = 'emerald'; break;
      case 'school': badge = 'Di Sekolah'; badgeColor = 'blue'; break;
      case 'danger': badge = 'ZONA BAHAYA!'; badgeColor = 'rose'; break;
      case 'warning': badge = 'Area Waspada'; badgeColor = 'amber'; break;
      case 'safe': badge = 'Dalam Zona Aman'; badgeColor = 'emerald'; break;
      default: badge = 'Lokasi tidak terverifikasi'; badgeColor = 'slate'; break;
    }
    return { zone: zoneName, badge, badgeColor };
  };

  const badgeColorClass = (color: string, type: 'bg' | 'text') => {
    const map: Record<string, { bg: string; text: string }> = {
      emerald: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
      blue:    { bg: 'bg-blue-100 dark:bg-blue-950/60',      text: 'text-blue-700 dark:text-blue-300' },
      rose:    { bg: 'bg-rose-100 dark:bg-rose-950/60',      text: 'text-rose-700 dark:text-rose-300' },
      amber:   { bg: 'bg-amber-100 dark:bg-amber-950/60',    text: 'text-amber-700 dark:text-amber-300' },
      slate:   { bg: 'bg-slate-100 dark:bg-slate-700',       text: 'text-slate-600 dark:text-slate-300' },
    };
    return (map[color] || map.slate)[type];
  };

  return (
    <div className="space-y-5">
      {/* BANNER ERROR / LOADING */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3 sm:p-4 flex items-start gap-3">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-rose-800 dark:text-rose-300">Gagal memuat data geofence</p>
            <p className="text-[11px] font-normal text-rose-700/90 dark:text-rose-400 mt-0.5 truncate">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 text-[11px] font-medium bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}
      {loading && !errorMsg && (
        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
          <RefreshCw className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
          <p className="text-xs font-normal text-teal-800 dark:text-teal-300">
            Memuat zona geofence dan riwayat log dari server database...
          </p>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
              <MapPin className="w-5 h-5" />
            </div>
            <h1 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
              Geofences & Pemantauan Radius Lokasi
            </h1>
          </div>
          <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
            Buat radius zona aman (Rumah, Sekolah, Les) dan zona bahaya otomatis dengan notifikasi saat anak tiba atau keluar.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Muat ulang data zona & log dari database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600 dark:text-teal-400' : ''}`} />
            <span>{loading ? 'Memuat...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshGps}
            disabled={isRefreshingGps}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Perbarui koordinat GPS terkini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingGps ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{isRefreshingGps ? 'Memperbarui GPS...' : 'Refresh GPS'}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Geofence</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Geofence Aktif</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-medium text-slate-900 dark:text-white">
            {loading ? '...' : `${activeZonesCount} Zona`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Dari total {zones.length} radius terdaftar</div>
        </div>

        {/* KPI 2 & 3 DINAMIS: Daftar Anak dari daftarAnakUnik (maks 2 anak pertama = layout sm:grid-cols-4) */}
        {daftarAnakUnik.length === 0 && (
          <>
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-normal">Anak Belum Ada Data</span>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              </div>
              <div className="text-base font-medium text-slate-500 dark:text-slate-400 truncate">
                {loadingChildren ? 'Memuat...' : 'Belum ada perangkat'}
              </div>
              <div className="text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                <Battery className="w-3 h-3 text-slate-400" />
                <span>-</span>
                <span>•</span>
                <span>Tambahkan anak & perangkat terlebih dahulu</span>
              </div>
            </div>
            <div className="hidden sm:block bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 opacity-0 pointer-events-none" aria-hidden="true" />
          </>
        )}
        {daftarAnakUnik.slice(0, 2).map((anak, idx) => {
          const log = latestLogPerChild[anak.name];
          const palette = idx === 0
            ? { color: 'emerald', title: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
            : { color: 'blue', title: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' };
          return (
            <div key={`kpi-anak-${anak.id}`} className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-normal truncate">{anak.name} ({anak.deviceName || 'Perangkat'})</span>
                <span className={`w-2 h-2 shrink-0 rounded-full ${log ? `${palette.dot} animate-pulse` : 'bg-slate-400'}`}></span>
              </div>
              <div className={`text-base font-medium truncate ${palette.title}`}>
                {loading ? '...' : (log?.zoneName ?? 'Lokasi tidak diketahui')}
              </div>
              <div className="text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-500" />
                <span>{loading ? '...' : (log?.batteryStatus ?? '-')}</span>
                <span>•</span>
                <span className="truncate">{loading ? '...' : (log?.timestamp ? String(log.timestamp).split('(')[0].trim() : 'Belum ada data')}</span>
              </div>
            </div>
          );
        })}

        {/* KPI 4: AKURASI GPS DINAMIS */}
        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Akurasi GPS</span>
            <Compass className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-medium text-indigo-600 dark:text-indigo-400">
            {loading ? '...' : avgAccuracyText}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
            {avgAccuracyText === '-'
              ? 'Data akurasi GPS belum tersedia dari log perangkat'
              : 'Berdasarkan data log GPS perangkat'}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('peta')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeTab === 'peta'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Peta Visual Geofence</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daftar')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeTab === 'daftar'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Kelola Radius Zona ({zones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeTab === 'riwayat'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Riwayat Masuk/Keluar</span>
        </button>
      </div>

      {/* TAB 1: PETA VISUAL GEOFENCE */}
      {activeTab === 'peta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Google Maps Visual Canvas */}
          <div className="lg:col-span-2 min-h-[460px]">
            <GoogleMapsGeofenceView
              zones={zones}
              selectedZone={selectedZoneOnMap}
              onSelectZone={(z) => setSelectedZoneOnMap(z)}
              showToast={showToast}
              markerChildren={markerChildren}
              onRequestSimulateTesting={handleSimulateTesting}
            />
          </div>

          {/* Side Panel: Detail Status & Zone List */}
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h3 className="text-xs font-medium text-slate-900 dark:text-white flex items-center justify-between">
                <span>Posisi Anak Terkini</span>
                <span className="text-[11px] text-slate-400 font-normal">Real-time</span>
              </h3>

              {daftarAnakUnik.length === 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Belum ada data perangkat anak. Tambahkan anak terlebih dahulu di halaman Kelola Anak.
                </div>
              )}

              {daftarAnakUnik.map((anak, idx) => {
                const badgeInfo = getChildLocationBadge(anak.name);
                const palette = idx === 0
                  ? { avatar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', accent: 'text-emerald-500' }
                  : idx === 1
                    ? { avatar: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', accent: 'text-blue-500' }
                    : { avatar: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', accent: 'text-indigo-500' };
                const log = latestLogPerChild[anak.name];
                const initial = anak.name?.trim().charAt(0).toUpperCase() || 'A';
                return (
                  <div
                    key={`pos-anak-${anak.id}`}
                    className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 shrink-0 rounded-full ${palette.avatar} flex items-center justify-center text-xs font-medium`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{anak.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal truncate">{log?.deviceName ?? anak.deviceName ?? 'Perangkat Anak'}</div>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeColorClass(badgeInfo.badgeColor, 'bg')} ${badgeColorClass(badgeInfo.badgeColor, 'text')}`}>
                        {badgeInfo.badge}
                      </span>
                    </div>
                    <div className="text-xs font-normal text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${palette.accent}`} />
                      <span className="truncate">{badgeInfo.zone}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Geofence Promo Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Notifikasi Otomatis Orang Tua</span>
              </div>
              <p className="text-xs font-normal text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
                Aplikasi mengirimkan notifikasi instan ke HP Anda jika anak meninggalkan sekolah sebelum jam pulang atau mendekati area bahaya.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-1 w-full py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                + Tambah Lokasi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA DAFTAR GEOFENCE */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama zona atau alamat geofence..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Tipe Zona</option>
                <option value="home">Rumah (Aman)</option>
                <option value="school">Sekolah</option>
                <option value="safe">Tempat Les / Bimbel</option>
                <option value="danger">Zona Bahaya / Terlarang</option>
              </select>

              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Anak</option>
                {children.length === 0 && !loadingChildren && (
                  <option value="" disabled>Belum ada daftar anak</option>
                )}
                {children.map(anak => (
                  <option key={`filter-anak-${anak.id}`} value={anak.id}>
                    {anak.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Zones Grid Cards */}
          {loading ? (
            <div className="bg-white dark:bg-slate-800/80 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-normal text-slate-400">Memuat konfigurasi geofence...</p>
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/80 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <MapPin className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Tidak ada geofence yang cocok dengan pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredZones.map(zone => (
                <div
                  key={zone.id}
                  className="bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3.5 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                          {zone.name}
                        </h3>
                        {zone.status === 'active' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Aktif"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-400" title="Non-aktif"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getCategoryBadge(zone.category)}
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Radius: {zone.radiusMeters}m
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleZoneStatus(zone.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        zone.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {zone.status === 'active' ? 'Aktif' : 'Mati'}
                    </button>
                  </div>

                  <p className="text-xs font-normal text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{zone.address}</span>
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-normal">Anak yang Diawasi</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {zone.assignedChildren.join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-normal">Aturan Notifikasi</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {zone.notifyOnEnter && zone.notifyOnExit
                          ? 'Masuk & Keluar'
                          : zone.notifyOnEnter
                          ? 'Saat Masuk'
                          : 'Saat Keluar'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-normal">
                      Pemicu: {zone.lastTriggered || 'Belum ada'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(zone)}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit Geofence"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteZoneTarget(zone)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Geofence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RIWAYAT MASUK / KELUAR */}
      {activeTab === 'riwayat' && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                Log Riwayat Masuk & Keluar Zona
              </h3>
              <p className="text-xs font-normal text-slate-400 mt-0.5">
                Catatan aktivitas riil saat perangkat anak melintasi batas radius geofence ({logs.length} log).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <th className="py-3 px-4">Anak & Perangkat</th>
                  <th className="py-3 px-4">Zona Geofence</th>
                  <th className="py-3 px-4">Jenis Peristiwa</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Status Baterai & Akurasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-slate-400 font-normal">
                      Belum ada riwayat log masuk/keluar zona geofence.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">{log.childName}</div>
                        <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                          <Smartphone className="w-3 h-3 text-slate-400" />
                          <span>{log.deviceName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{log.zoneName}</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">Koordinat: {log.locationCoordinates}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {log.eventType === 'enter' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            <Check className="w-3 h-3" /> Memasuki Zona
                          </span>
                        ) : log.eventType === 'exit' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            <ArrowRight className="w-3 h-3" /> Meninggalkan Zona
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            <Clock className="w-3 h-3" /> Berada di Lokasi
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-normal">
                        {log.timestamp}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Battery className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{log.batteryStatus ?? '-'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Akurasi: {log.accuracy}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL TAMBAH / EDIT GEOFENCE DENGAN GOOGLE MAPS PIN PICKER */}
      {/* =============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    {editingZone ? 'Edit Geofence & Pin Lokasi di Maps' : 'Tambah Geofence Baru dari Google Maps'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Cari alamat atau klik titik di Google Maps untuk menentukan radius zona aman anak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4">
              {/* Google Maps Location Search & Pin Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Cari & Tentukan Pin Lokasi di Google Maps</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMapPickerInModal(prev => !prev)}
                    className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {showMapPickerInModal ? 'Sembunyikan Peta' : 'Buka Peta Interaktif'}
                  </button>
                </div>

                {showMapPickerInModal && (
                  <GoogleMapsLocationPicker
                    initialLat={formLat}
                    initialLng={formLng}
                    initialAddress={formAddress}
                    radiusMeters={formRadius}
                    categoryColor={
                      formCategory === 'home' ? '#10b981' :
                      formCategory === 'school' ? '#3b82f6' :
                      formCategory === 'danger' ? '#ef4444' :
                      formCategory === 'warning' ? '#f59e0b' : '#8b5cf6'
                    }
                    onLocationSelected={({ lat, lng, address }) => {
                      setFormLat(lat);
                      setFormLng(lng);
                      setFormAddress(address);
                      if (!formName && address) {
                        const shortName = address.split(',')[0];
                        if (shortName && shortName.length < 35) {
                          setFormName(shortName);
                        }
                      }
                    }}
                    height="280px"
                  />
                )}
              </div>

              {/* Nama Zona & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1">
                    Nama Geofence / Lokasi
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Rumah Nenek, SD Bintang Kejora, Tempat Bimbel"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="home">Rumah (Zona Aman)</option>
                    <option value="school">Sekolah</option>
                    <option value="safe">Tempat Les / Bimbel</option>
                    <option value="danger">Zona Bahaya / Terlarang</option>
                    <option value="warning">Area Waspada</option>
                  </select>
                </div>
              </div>

              {/* Radius Batas Slider */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-normal text-slate-700 dark:text-slate-300">
                    Radius Batas Geofence:
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formRadius} Meter ({formRadius >= 1000 ? `${(formRadius / 1000).toFixed(1)} km` : `${formRadius} m`})
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={formRadius}
                  onChange={(e) => setFormRadius(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-normal">
                  <span>20m (Minimal / Presisi)</span>
                  <span>150m (Rumah)</span>
                  <span>300m (Sekolah)</span>
                  <span>1000m (Wilayah)</span>
                </div>
              </div>

              {/* Alamat & Koordinat Terpilih */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                    Alamat Lengkap / Patokan Lokasi
                  </label>
                  <span className="text-[11px] font-normal text-slate-400">
                    GPS: {formLat.toFixed(5)}, {formLng.toFixed(5)}
                  </span>
                </div>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Ketik alamat atau gunakan pin di atas untuk mengisi otomatis..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Assign Anak */}
              <div>
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">
                  Anak yang Diawasi di Radius Ini
                </label>
                {children.length === 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center text-xs font-normal text-slate-500 dark:text-slate-400 mb-2">
                    {loadingChildren
                      ? 'Memuat daftar anak...'
                      : 'Belum ada data anak. Tambahkan anak terlebih dahulu di halaman Kelola Anak agar bisa memilih siapa yang diawasi di zona ini.'}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  {children.map(anak => (
                    <label
                      key={`assign-anak-${anak.id}`}
                      className="flex items-center gap-2 text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formChildren.includes(anak.id) || formChildren.includes(anak.name)}
                        onChange={() => toggleChildSelection(anak.id)}
                        className="rounded text-emerald-600"
                      />
                      <span>{anak.name} ({anak.deviceName || 'Perangkat'})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Aturan Trigger Notifikasi */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                  Kirim Notifikasi Peringatan Saat:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formNotifyEnter}
                      onChange={(e) => setFormNotifyEnter(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Anak Memasuki Zona</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formNotifyExit}
                      onChange={(e) => setFormNotifyExit(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Anak Meninggalkan Zona</span>
                  </label>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isSaving ? 'Menyimpan...' : (editingZone ? 'Simpan Perubahan Geofence' : 'Aktifkan Geofence Baru')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL KONFIRMASI HAPUS GEOFENCE */}
      {/* =============================================================== */}
      {deleteZoneTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                  Hapus Geofence?
                </h3>
                <p className="text-[11px] text-slate-400 font-normal">
                  Peringatan keluar/masuk lokasi ini akan dinonaktifkan
                </p>
              </div>
            </div>

            <p className="text-xs font-normal text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus radius geofence <span className="font-medium text-slate-900 dark:text-white">"{deleteZoneTarget.name}"</span>?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteZoneTarget(null)}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteZone}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>{isSaving ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
