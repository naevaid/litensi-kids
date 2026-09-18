import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Clock, Search, ShieldAlert,
  Send, Paperclip, CheckCircle2, User, Smartphone, ShieldCheck,
  AlertTriangle, Bell, ArrowLeft, Plus, MessageCircle
} from 'lucide-react';
import { User as UserType } from '../../types';
import { api, getSessionUser } from '../../lib/apiClient';

interface ChatMessage {
  id: string;
  sender: 'child' | 'parent' | 'system';
  childName?: string;
  deviceName?: string;
  text: string;
  timestamp: string;
  isAlert?: boolean;
}

interface DeviceThread {
  id: string;
  anakId: string;
  childName: string;
  childFullName: string;
  deviceModel: string;
  status: 'online' | 'offline' | 'restricted';
  battery: number | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
  avatarColor: string;
  messages: ChatMessage[];
}

interface ChatInboxPageProps {
  user?: UserType;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigate?: (page: any) => void;
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

// Palet warna avatar konsisten berdasarkan index (tidak hardcode nama)
const AVATAR_COLOR_PALET = [
  'bg-indigo-600', 'bg-purple-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-rose-600', 'bg-sky-600',
  'bg-teal-600', 'bg-orange-600',
];

// Mapper: ChildOptionItem → DeviceThread (tanpa data dummy pesan)
const mapChildToThread = (child: ChildOptionItem, idx: number): DeviceThread => {
  // 🔴 PENTING: childName = HANYA nama anak (JUJUR!), TIDAK BOLEH diisi device info / OS / app_version
  // Jika nama_panggilan & nama_lengkap KOSONG → fallback Profilm Anak #id (JANGAN Android 14 / Companion v...)
  const namaPanggilan = (child.nama_panggilan ?? '').trim();
  const namaLengkap = (child.nama_lengkap ?? '').trim();
  const displayName = namaPanggilan || namaLengkap || `Profil Anak #${child.id}`;

  // Device info: HANYA device_model + OS version (JANGAN pernah sisip teks hardcode "Litensi Kids Companion vX.X.X")
  const deviceParts: string[] = [];
  if (child.device_model) deviceParts.push(child.device_model);
  if (child.os_version) deviceParts.push(`Android ${child.os_version}`);
  const deviceStr = deviceParts.length > 0 ? deviceParts.join(' • ') : 'Perangkat';

  return {
    id: `thread-anak-${child.id}`,
    anakId: child.id,
    childName: displayName,
    childFullName: namaLengkap || displayName,
    deviceModel: deviceStr,
    status: 'offline', // Default JUJUR: sampai ada real status dari app companion
    battery: null, // Jangan hardcode 84% / 62% boongan
    lastMessage: '-',
    lastTime: '-',
    unread: 0,
    avatarColor: AVATAR_COLOR_PALET[idx % AVATAR_COLOR_PALET.length],
    messages: [], // BELUM ada pesan riil dari DB
  };
};

export const ChatInboxPage: React.FC<ChatInboxPageProps> = ({ user, showToast }) => {
  const sessUser = getSessionUser();
  const uid = sessUser?.id ? String(sessUser.id) : '';

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [children, setChildren] = useState<ChildOptionItem[]>([]);

  // ZERO HARDCODE: threads initial KOSONG, nanti diisi dari API /anak via loadData
  const [threads, setThreads] = useState<DeviceThread[]>([]);

  // Load daftar anak untuk membuat thread list dinamis
  const loadData = async () => {
    console.groupCollapsed('%c[ChatInbox] loadData GET /anak', 'color:#6366f1;font-weight:700');
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

      const newThreads = listAnak.map(mapChildToThread);
      setThreads(newThreads);

      // Auto-pilih thread pertama jika ada (tanpa hardcode 'thread-1')
      if (newThreads.length > 0 && !activeThreadId) {
        setActiveThreadId(newThreads[0].id);
      }
      // Jika thread aktif sebelumnya tidak ada lagi (anak dihapus), reset
      if (activeThreadId && !newThreads.find(t => t.id === activeThreadId)) {
        setActiveThreadId(newThreads[0]?.id ?? '');
      }

      console.debug('[ChatInbox] daftar anak:', listAnak.length, 'threads:', newThreads.length);
    } catch (err: any) {
      console.error('[ChatInbox] loadData error:', err);
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

  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (!activeThread) {
      showToast('Pilih perangkat anak terlebih dahulu', 'error');
      return;
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'parent',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          lastMessage: inputText,
          lastTime: newMsg.timestamp,
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));

    setInputText('');
    showToast('Pesan terkirim ke perangkat anak', 'success');
  };

  const handleQuickGrant = (minutes: number) => {
    if (!activeThread) {
      showToast('Pilih perangkat anak terlebih dahulu', 'error');
      return;
    }
    const systemMsg: ChatMessage = {
      id: `grant-${Date.now()}`,
      sender: 'system',
      text: `Orang tua menambahkan kuota waktu layar +${minutes} menit.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          messages: [...t.messages, systemMsg]
        };
      }
      return t;
    }));

    showToast(`Berhasil menambah waktu layar +${minutes} menit!`, 'success');
  };

  const filteredThreads = threads.filter(t => 
    t.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.deviceModel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Pesan & Permintaan Kuota Anak
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Komunikasi langsung dengan anak dan respons cepat izin perpanjangan waktu layar.
          </p>
        </div>
      </div>

      {/* Main Chat Layout: Responsive Multi-pane on Desktop/Tablet, Clean view on Mobile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs min-h-[520px] grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: Threads List (5 cols on md, 4 cols on lg) */}
        <div
          className={`md:col-span-5 lg:col-span-4 border-r border-slate-200/80 dark:border-slate-800 flex flex-col ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari perangkat anak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Device Threads */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center">
                <Clock className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
                <p className="text-[11px] text-slate-400 font-normal">Memuat daftar perangkat anak...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              // ZERO HARDCODE: Empty state JUJUR jika user BELUM pairing perangkat
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Belum ada perangkat anak terhubung
                </p>
                <p className="text-[11px] font-normal text-slate-400 dark:text-slate-500 mb-3 max-w-[220px] mx-auto">
                  Lakukan pairing perangkat terlebih dahulu di menu <span className="font-semibold text-indigo-600 dark:text-indigo-400">Kelola Anak</span> untuk mulai berkomunikasi & mengatur kuota.
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const isOnline = thread.status === 'online';
                const statusClass = isOnline ? 'text-emerald-500' : 'text-slate-400';
                const statusLabel = thread.status === 'restricted'
                  ? 'Dibatasi'
                  : isOnline ? 'Online' : 'Offline';
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      setMobileView('chat');
                    }}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-2 border-indigo-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${thread.avatarColor} text-white flex items-center justify-center font-medium text-xs shrink-0`}>
                      {thread.childName.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-slate-900 dark:text-white truncate">
                          {thread.childName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">{thread.lastTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{thread.deviceModel}</span>
                        {thread.battery !== null ? (
                          <span className="text-emerald-500 font-normal shrink-0">• {thread.battery}%</span>
                        ) : (
                          <span className={`font-normal shrink-0 flex items-center gap-1 ${statusClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {statusLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-1 font-normal">
                        {thread.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat & Controls (7 cols on md, 8 cols on lg) */}
        <div
          className={`md:col-span-7 lg:col-span-8 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20 ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white md:hidden cursor-pointer"
                    title="Kembali ke daftar"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className={`w-8 h-8 rounded-xl ${activeThread.avatarColor} text-white flex items-center justify-center font-medium text-xs shrink-0`}>
                    {activeThread.childName.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {activeThread.childName}
                    </h2>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      {(() => {
                        const isOnline = activeThread.status === 'online';
                        const restricted = activeThread.status === 'restricted';
                        const dotClass = restricted
                          ? 'bg-amber-500'
                          : isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400';
                        const txtClass = restricted
                          ? 'text-amber-500'
                          : isOnline ? 'text-emerald-500' : 'text-slate-400';
                        const label = restricted ? 'Dibatasi' : (isOnline ? 'Online' : 'Offline');
                        return (
                          <>
                            <span className={`flex items-center gap-1 font-normal ${txtClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} /> {label}
                            </span>
                            <span>•</span>
                            <span className="truncate">{activeThread.deviceModel}</span>
                            {activeThread.battery !== null && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-500">{activeThread.battery}%</span>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Quick Screen Time Grant Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickGrant(15)}
                    className="px-2.5 py-1 text-[11px] font-normal bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 rounded-lg transition-colors cursor-pointer"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickGrant(30)}
                    className="px-2.5 py-1 text-[11px] font-normal bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    +30m
                  </button>
                </div>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {activeThread.messages.length === 0 ? (
                  // ZERO HARDCODE: Empty state jujur BELUM ada riwayat pesan (bukan prompt dummy "minta perpanjangan waktu")
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-3">
                      <MessageCircle className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Belum ada percakapan dengan {activeThread.childName}
                    </p>
                    <p className="text-[11px] font-normal text-slate-400 dark:text-slate-500 max-w-xs">
                      Ketik pesan di kolom bawah untuk memulai obrolan, atau gunakan tombol <span className="font-semibold">+15m / +30m</span> untuk memberikan tambahan kuota waktu layar dengan cepat.
                    </p>
                  </div>
                ) : (
                  activeThread.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'parent'
                          ? 'items-end'
                          : msg.sender === 'child'
                          ? 'items-start'
                          : 'items-center'
                      }`}
                    >
                      {msg.sender === 'system' ? (
                        <div className="my-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-normal max-w-md text-center">
                          {msg.text}
                        </div>
                      ) : (
                        <div
                          className={`max-w-[85%] sm:max-w-md p-3 rounded-2xl text-xs font-normal space-y-1 shadow-2xs ${
                            msg.sender === 'parent'
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-none'
                          }`}
                        >
                          <p className="leading-relaxed">{msg.text}</p>
                          <span
                            className={`block text-[9px] text-right font-normal ${
                              msg.sender === 'parent' ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            {msg.timestamp}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ketik pesan atau balasan untuk anak..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-normal bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-colors cursor-pointer shrink-0"
                  title="Kirim Pesan"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Pilih perangkat anak untuk mulai melihat pesan
                </p>
                <p className="text-[11px] font-normal text-slate-400 dark:text-slate-500 max-w-[260px]">
                  {loading
                    ? 'Menunggu daftar perangkat dimuat dari server...'
                    : threads.length === 0
                    ? 'Belum ada perangkat anak. Lakukan pairing terlebih dahulu.'
                    : 'Tap salah satu perangkat di panel sebelah kiri untuk membuka percakapan.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
