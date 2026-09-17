import React, { useState } from 'react';
import { 
  MessageSquare, Clock, Search, ShieldAlert,
  Send, Paperclip, CheckCircle2, User, Smartphone, ShieldCheck,
  AlertTriangle, Bell, ArrowLeft, Plus
} from 'lucide-react';
import { User as UserType } from '../../types';

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
  childName: string;
  deviceModel: string;
  status: 'online' | 'offline' | 'restricted';
  battery: number;
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

export const ChatInboxPage: React.FC<ChatInboxPageProps> = ({ user, showToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string>('thread-1');
  const [inputText, setInputText] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const [threads, setThreads] = useState<DeviceThread[]>([
    {
      id: 'thread-1',
      childName: 'Nadia (10 thn)',
      deviceModel: 'Tablet Samsung Tab A8',
      status: 'online',
      battery: 84,
      lastMessage: 'Ayah, boleh minta perpanjangan waktu belajar 30 menit?',
      lastTime: '10:15',
      unread: 1,
      avatarColor: 'bg-indigo-600',
      messages: [
        {
          id: 'm1',
          sender: 'system',
          text: 'Batas waktu layar harian telah mencapai 1 jam 15 menit. Perangkat beralih ke Mode Belajar.',
          timestamp: '10:00',
          isAlert: true
        },
        {
          id: 'm2',
          sender: 'child',
          childName: 'Nadia',
          text: 'Ayah, boleh minta perpanjangan waktu belajar 30 menit? Mau ngerjain tugas Ruangguru.',
          timestamp: '10:15'
        }
      ]
    },
    {
      id: 'thread-2',
      childName: 'Rayhan (7 thn)',
      deviceModel: 'Xiaomi Redmi 10',
      status: 'online',
      battery: 62,
      lastMessage: 'Aplikasi YouTube Kids telah diizinkan hingga pukul 17:00.',
      lastTime: '08:30',
      unread: 0,
      avatarColor: 'bg-purple-600',
      messages: [
        {
          id: 'm3',
          sender: 'child',
          childName: 'Rayhan',
          text: 'Bunda, mau nonton video edukasi sains dong.',
          timestamp: '08:25'
        },
        {
          id: 'm4',
          sender: 'parent',
          text: 'Sudah diizinkan ya sayang, batasnya 30 menit.',
          timestamp: '08:30'
        }
      ]
    }
  ]);

  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

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
            {filteredThreads.map((thread) => {
              const isActive = thread.id === activeThreadId;
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
                    {thread.childName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-slate-900 dark:text-white truncate">
                        {thread.childName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">{thread.lastTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{thread.deviceModel}</span>
                      <span className="text-emerald-500 font-normal shrink-0">• {thread.battery}%</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-1 font-normal">
                      {thread.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
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
                    {activeThread.childName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {activeThread.childName}
                    </h2>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      <span className="flex items-center gap-1 text-emerald-500 font-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                      </span>
                      <span>•</span>
                      <span className="truncate">{activeThread.deviceModel}</span>
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
                {activeThread.messages.map((msg) => (
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
                ))}
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
            <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs font-normal">
              Pilih perangkat anak untuk mulai melihat pesan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
