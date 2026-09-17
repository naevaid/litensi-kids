import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, Clock, ShieldCheck, ShieldAlert,
  MessageSquare, Smartphone, X, ChevronRight, Check
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'request' | 'security' | 'system' | 'limit';
  read: boolean;
  childName?: string;
  deviceName?: string;
  actionRequired?: boolean;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string, subId?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Permintaan Tambahan Waktu',
    message: 'Nadia meminta tambahan waktu layar +30 menit untuk mengerjakan latihan soal matematika di Ruangguru.',
    time: '2 menit lalu',
    type: 'request',
    read: false,
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    actionRequired: true
  },
  {
    id: 'notif-2',
    title: 'Batas Waktu Layar Tercapai',
    message: 'Rayhan telah menggunakan gadget selama 1 jam 30 menit. Kunci layar otomatis telah diaktifkan.',
    time: '15 menit lalu',
    type: 'limit',
    read: false,
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10'
  },
  {
    id: 'notif-3',
    title: 'SafeSearch & Filter Aktif',
    message: 'Pemindaian URL berbahaya & kata kunci negatif aktif pada 2 perangkat terhubung.',
    time: '1 jam lalu',
    type: 'security',
    read: true
  },
  {
    id: 'notif-4',
    title: 'Update Edukasi Parenting',
    message: 'Tips baru tersedia: "Menyeimbangkan Screen Time & Istirahat Malam Anak".',
    time: '3 jam lalu',
    type: 'system',
    read: true
  }
];

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  showToast
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle click outside and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('Semua notifikasi ditandai telah dibaca', 'info');
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleApproveRequest = (id: string, childName?: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, actionRequired: false } : n));
    showToast(`Permintaan +30 menit untuk ${childName || 'anak'} disetujui!`, 'success');
  };

  const handleRejectRequest = (id: string, childName?: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, actionRequired: false } : n));
    showToast(`Permintaan waktu untuk ${childName || 'anak'} ditolak`, 'info');
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'request':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'limit':
        return <Smartphone className="w-4 h-4 text-rose-400" />;
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'system':
      default:
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        ref={dropdownRef}
        className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-[#0f172a] dark:bg-[#090d16] text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 dark:border-slate-800 z-50 overflow-hidden"
      >
        {/* Header bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <span className="text-xs sm:text-sm font-medium text-white">Notifikasi & Aktivitas</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Tandai Dibaca</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer ml-1"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 border-b border-slate-800/60 bg-[#0d1424]">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'unread'
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Belum Dibaca ({unreadCount})
          </button>
        </div>

        {/* List of Notifications */}
        <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y divide-slate-800/50">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
              <p className="text-xs font-normal">Tidak ada notifikasi {filter === 'unread' ? 'belum dibaca' : ''}</p>
            </div>
          ) : (
            filteredNotifications.map(item => (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`p-3 sm:p-3.5 transition-colors cursor-pointer ${
                  item.read
                    ? 'hover:bg-slate-800/30 bg-transparent'
                    : 'bg-indigo-950/20 hover:bg-indigo-950/30'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-medium text-white truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {item.time}
                      </span>
                    </div>

                    <p className="text-xs font-normal text-slate-300 leading-relaxed mb-1.5">
                      {item.message}
                    </p>

                    {item.deviceName && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-2">
                        <Smartphone className="w-3 h-3 text-slate-500" />
                        <span>{item.deviceName}</span>
                      </div>
                    )}

                    {/* Action buttons if required */}
                    {item.actionRequired && (
                      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveRequest(item.id, item.childName);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Setujui +30m
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectRequest(item.id, item.childName);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>

                  {!item.read && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-2.5 sm:p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateTab('inbox', 'chat');
            }}
            className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Buka Inbox Chat</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateTab('pengumuman');
            }}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Edukasi & Catatan</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
};
