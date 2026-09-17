import React, { useState, useEffect } from 'react';
import {
  AppWindow, Shield, ShieldCheck, ShieldAlert, Lock, Unlock,
  Clock, Filter, Search, Plus, Check, X, AlertTriangle,
  Gamepad2, Video, MessageCircle, BookOpen, Globe, Smartphone,
  Sliders, Calendar, RefreshCw, Eye, Sparkles, ChevronDown,
  Info, User, Music, Headphones
} from 'lucide-react';
import { Pagination } from '../common/Pagination';

export interface AppRuleItem {
  id: string;
  appName: string;
  packageName: string;
  category: 'game' | 'social' | 'video' | 'education' | 'chat' | 'utility';
  icon: string;
  childName: string;
  deviceName: string;
  status: 'allowed' | 'limited' | 'blocked';
  dailyLimitMinutes: number; // e.g. 45 min
  usedTodayMinutes: number; // e.g. 30 min
  scheduleMode: 'all_day' | 'study_time_blocked' | 'bedtime_blocked' | 'custom';
  allowWeekendExtra: boolean;
  weekendExtraMinutes: number;
  lastUsedTime: string;
}

export interface AppCategoryLimit {
  category: 'game' | 'social' | 'video' | 'education' | 'chat';
  label: string;
  iconType: string;
  totalApps: number;
  isRestricted: boolean;
  defaultLimitMinutes: number;
  description: string;
}

export interface AppAccessRequest {
  id: string;
  childName: string;
  appName: string;
  category: string;
  requestedAt: string;
  durationRequested: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface KontrolAplikasiPageProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const INITIAL_APPS: AppRuleItem[] = [
  {
    id: 'app-1',
    appName: 'YouTube Kids',
    packageName: 'com.google.android.apps.youtube.kids',
    category: 'video',
    icon: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'limited',
    dailyLimitMinutes: 45,
    usedTodayMinutes: 30,
    scheduleMode: 'bedtime_blocked',
    allowWeekendExtra: true,
    weekendExtraMinutes: 30,
    lastUsedTime: '15 menit lalu'
  },
  {
    id: 'app-2',
    appName: 'Ruangguru',
    packageName: 'com.ruangguru.livestudents',
    category: 'education',
    icon: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=128&auto=format&fit=crop',
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    status: 'allowed',
    dailyLimitMinutes: 0, // Tanpa batas
    usedTodayMinutes: 50,
    scheduleMode: 'all_day',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '10 menit lalu'
  },
  {
    id: 'app-3',
    appName: 'Roblox',
    packageName: 'com.roblox.client',
    category: 'game',
    icon: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'blocked',
    dailyLimitMinutes: 30,
    usedTodayMinutes: 0,
    scheduleMode: 'study_time_blocked',
    allowWeekendExtra: true,
    weekendExtraMinutes: 45,
    lastUsedTime: 'Kemarin, 16:20'
  },
  {
    id: 'app-4',
    appName: 'Duolingo',
    packageName: 'com.duolingo',
    category: 'education',
    icon: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=128&auto=format&fit=crop',
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    status: 'allowed',
    dailyLimitMinutes: 0,
    usedTodayMinutes: 25,
    scheduleMode: 'all_day',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '1 jam lalu'
  },
  {
    id: 'app-5',
    appName: 'TikTok Lite',
    packageName: 'com.zhiliaoapp.musically.go',
    category: 'social',
    icon: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?q=80&w=128&auto=format&fit=crop',
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    status: 'blocked',
    dailyLimitMinutes: 0,
    usedTodayMinutes: 0,
    scheduleMode: 'bedtime_blocked',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: 'Diblokir Total'
  },
  {
    id: 'app-6',
    appName: 'WhatsApp Messenger',
    packageName: 'com.whatsapp',
    category: 'chat',
    icon: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?q=80&w=128&auto=format&fit=crop',
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    status: 'limited',
    dailyLimitMinutes: 60,
    usedTodayMinutes: 18,
    scheduleMode: 'study_time_blocked',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '30 menit lalu'
  },
  {
    id: 'app-7',
    appName: 'Minecraft Pocket',
    packageName: 'com.mojang.minecraftpe',
    category: 'game',
    icon: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'limited',
    dailyLimitMinutes: 40,
    usedTodayMinutes: 20,
    scheduleMode: 'study_time_blocked',
    allowWeekendExtra: true,
    weekendExtraMinutes: 30,
    lastUsedTime: '2 jam lalu'
  },
  {
    id: 'app-8',
    appName: 'Math Kids Learning',
    packageName: 'com.rvappstudios.math.kids',
    category: 'education',
    icon: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'allowed',
    dailyLimitMinutes: 0,
    usedTodayMinutes: 15,
    scheduleMode: 'all_day',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '3 jam lalu'
  },
  {
    id: 'app-9',
    appName: 'Mobile Legends: Bang Bang',
    packageName: 'com.mobile.legends',
    category: 'game',
    icon: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'blocked',
    dailyLimitMinutes: 30,
    usedTodayMinutes: 0,
    scheduleMode: 'study_time_blocked',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '3 hari lalu'
  },
  {
    id: 'app-10',
    appName: 'Spotify Kids & Music',
    packageName: 'com.spotify.kids',
    category: 'video',
    icon: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=128&auto=format&fit=crop',
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    status: 'limited',
    dailyLimitMinutes: 60,
    usedTodayMinutes: 35,
    scheduleMode: 'bedtime_blocked',
    allowWeekendExtra: true,
    weekendExtraMinutes: 30,
    lastUsedTime: '45 menit lalu'
  },
  {
    id: 'app-11',
    appName: 'Chess for Kids',
    packageName: 'com.chess.kids',
    category: 'education',
    icon: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'allowed',
    dailyLimitMinutes: 0,
    usedTodayMinutes: 20,
    scheduleMode: 'all_day',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '4 jam lalu'
  },
  {
    id: 'app-12',
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    category: 'social',
    icon: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=128&auto=format&fit=crop',
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    status: 'blocked',
    dailyLimitMinutes: 0,
    usedTodayMinutes: 0,
    scheduleMode: 'bedtime_blocked',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: 'Diblokir Permanen'
  },
  {
    id: 'app-13',
    appName: 'Google Classroom',
    packageName: 'com.google.android.apps.classroom',
    category: 'education',
    icon: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'allowed',
    dailyLimitMinutes: 0,
    usedTodayMinutes: 40,
    scheduleMode: 'all_day',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '1 jam lalu'
  },
  {
    id: 'app-14',
    appName: 'Free Fire MAX',
    packageName: 'com.dts.freefiremax',
    category: 'game',
    icon: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=128&auto=format&fit=crop',
    childName: 'Rayhan',
    deviceName: 'Xiaomi Redmi 10',
    status: 'blocked',
    dailyLimitMinutes: 30,
    usedTodayMinutes: 0,
    scheduleMode: 'study_time_blocked',
    allowWeekendExtra: false,
    weekendExtraMinutes: 0,
    lastUsedTime: '5 hari lalu'
  },
  {
    id: 'app-15',
    appName: 'ScratchJr Coding',
    packageName: 'org.scratchjr.android',
    category: 'education',
    icon: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=128&auto=format&fit=crop',
    childName: 'Nadia',
    deviceName: 'Tablet Samsung Tab A8',
    status: 'allowed',
    dailyLimitMinutes: 0,
    usedTodayMinutes: 30,
    scheduleMode: 'all_day',
    allowWeekendExtra: true,
    weekendExtraMinutes: 30,
    lastUsedTime: '2 jam lalu'
  }
];

const INITIAL_REQUESTS: AppAccessRequest[] = [
  {
    id: 'req-1',
    childName: 'Rayhan',
    appName: 'Roblox',
    category: 'Game',
    requestedAt: '10 menit lalu',
    durationRequested: '+30 Menit',
    reason: 'Ingin bermain bersama teman kelas sebentar setelah selesai PR.',
    status: 'pending'
  },
  {
    id: 'req-2',
    childName: 'Nadia',
    appName: 'YouTube Kids',
    category: 'Video Edukasi',
    requestedAt: '1 jam lalu',
    durationRequested: '+45 Menit',
    reason: 'Menonton tutorial melukis untuk tugas seni budaya.',
    status: 'pending'
  }
];

export const KontrolAplikasiPage: React.FC<KontrolAplikasiPageProps> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRuleItem[]>([]);
  const [requests, setRequests] = useState<AppAccessRequest[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'daftar' | 'jadwal' | 'permintaan'>('daftar');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [childFilter, setChildFilter] = useState<'all' | 'Nadia' | 'Rayhan'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'allowed' | 'limited' | 'blocked'>('all');

  // Pagination State for Subtab 1 (Daftar Aplikasi)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Pagination State for Subtab 3 (Permintaan Akses)
  const [requestsPage, setRequestsPage] = useState<number>(1);
  const [requestsPerPage, setRequestsPerPage] = useState<number>(5);

  // Confirmation Modal for Lock / Unlock State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    app: AppRuleItem | null;
    actionType: 'buka' | 'kunci' | 'batasi';
  }>({
    isOpen: false,
    app: null,
    actionType: 'buka'
  });

  // Edit Modal State
  const [editingApp, setEditingApp] = useState<AppRuleItem | null>(null);
  const [limitMinutesInput, setLimitMinutesInput] = useState<number>(30);
  const [scheduleModeInput, setScheduleModeInput] = useState<'all_day' | 'study_time_blocked' | 'bedtime_blocked' | 'custom'>('study_time_blocked');
  const [allowWeekendInput, setAllowWeekendInput] = useState<boolean>(false);
  const [weekendExtraInput, setWeekendExtraInput] = useState<number>(30);

  // New App Block Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppCategory, setNewAppCategory] = useState<'game' | 'social' | 'video' | 'education' | 'chat'>('game');
  const [newAppChild, setNewAppChild] = useState<'Nadia' | 'Rayhan'>('Rayhan');
  const [newAppStatus, setNewAppStatus] = useState<'limited' | 'blocked'>('limited');
  const [newAppLimit, setNewAppLimit] = useState<number>(30);

  // Simulate Asynchronous AJAX data load
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setApps(INITIAL_APPS);
      setRequests(INITIAL_REQUESTS);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Request Confirmation for Lock / Unlock Action
  const requestActionConfirmation = (app: AppRuleItem, actionType: 'buka' | 'kunci' | 'batasi') => {
    setConfirmModal({
      isOpen: true,
      app,
      actionType
    });
  };

  // Execute Confirmed Lock / Unlock Action
  const handleExecuteConfirmedAction = () => {
    if (!confirmModal.app) return;
    const { app, actionType } = confirmModal;

    let nextStatus: AppRuleItem['status'] = 'allowed';
    let msg = '';

    if (actionType === 'buka') {
      nextStatus = 'allowed';
      msg = `Aplikasi ${app.appName} pada perangkat ${app.deviceName} milik ${app.childName} berhasil dibuka/diizinkan bebas.`;
    } else if (actionType === 'kunci') {
      nextStatus = 'blocked';
      msg = `Aplikasi ${app.appName} pada perangkat ${app.deviceName} milik ${app.childName} berhasil dikunci/diblokir total.`;
    } else {
      nextStatus = 'limited';
      msg = `Aplikasi ${app.appName} pada perangkat ${app.deviceName} milik ${app.childName} sekarang dibatasi durasi waktu harian.`;
    }

    setApps(prev => prev.map(item => {
      if (item.id === app.id) {
        return {
          ...item,
          status: nextStatus,
          dailyLimitMinutes: nextStatus === 'allowed' ? 0 : (item.dailyLimitMinutes || 30)
        };
      }
      return item;
    }));

    showToast(msg, actionType === 'kunci' ? 'warning' : 'success');
    setConfirmModal({ isOpen: false, app: null, actionType: 'buka' });
  };

  const handleQuickBlockAllGames = () => {
    setApps(prev => prev.map(app => (app.category === 'game' ? { ...app, status: 'blocked' } : app)));
    showToast('Semua aplikasi game berhasil dikunci/diblokir untuk semua perangkat anak', 'warning');
  };

  const handleQuickAllowEducation = () => {
    setApps(prev => prev.map(app => (app.category === 'education' ? { ...app, status: 'allowed', dailyLimitMinutes: 0 } : app)));
    showToast('Semua aplikasi edukasi & belajar diizinkan tanpa batas waktu', 'success');
  };

  const openEditModal = (app: AppRuleItem) => {
    setEditingApp(app);
    setLimitMinutesInput(app.dailyLimitMinutes || 30);
    setScheduleModeInput(app.scheduleMode);
    setAllowWeekendInput(app.allowWeekendExtra);
    setWeekendExtraInput(app.weekendExtraMinutes || 30);
  };

  const saveEditModal = () => {
    if (!editingApp) return;

    setApps(prev => prev.map(a => {
      if (a.id === editingApp.id) {
        return {
          ...a,
          dailyLimitMinutes: limitMinutesInput,
          scheduleMode: scheduleModeInput,
          allowWeekendExtra: allowWeekendInput,
          weekendExtraMinutes: weekendExtraInput,
          status: limitMinutesInput > 0 ? (a.status === 'blocked' ? 'limited' : a.status) : 'allowed'
        };
      }
      return a;
    }));

    showToast(`Pengaturan batas durasi untuk ${editingApp.appName} milik ${editingApp.childName} berhasil disimpan`, 'success');
    setEditingApp(null);
  };

  const handleCreateCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) {
      showToast('Nama aplikasi tidak boleh kosong', 'warning');
      return;
    }

    const newApp: AppRuleItem = {
      id: `app-custom-${Date.now()}`,
      appName: newAppName.trim(),
      packageName: `com.custom.${newAppName.toLowerCase().replace(/\s+/g, '')}`,
      category: newAppCategory,
      icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=128&auto=format&fit=crop',
      childName: newAppChild,
      deviceName: newAppChild === 'Nadia' ? 'Tablet Samsung Tab A8' : 'Xiaomi Redmi 10',
      status: newAppStatus,
      dailyLimitMinutes: newAppStatus === 'limited' ? newAppLimit : 0,
      usedTodayMinutes: 0,
      scheduleMode: 'study_time_blocked',
      allowWeekendExtra: false,
      weekendExtraMinutes: 0,
      lastUsedTime: 'Baru ditambahkan'
    };

    setApps(prev => [newApp, ...prev]);
    showToast(`Aturan untuk aplikasi ${newAppName} (${newAppChild} - ${newApp.deviceName}) berhasil ditambahkan!`, 'success');
    setIsAddModalOpen(false);
    setNewAppName('');
  };

  const handleApproveRequest = (id: string, appName: string, childName: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    setApps(prev => prev.map(a => {
      if (a.appName.toLowerCase() === appName.toLowerCase() && a.childName === childName) {
        return {
          ...a,
          status: 'limited',
          dailyLimitMinutes: (a.dailyLimitMinutes || 30) + 30
        };
      }
      return a;
    }));
    showToast(`Permintaan akses ${appName} oleh ${childName} disetujui (+30 menit)!`, 'success');
  };

  const handleRejectRequest = (id: string, appName: string, childName: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    showToast(`Permintaan akses ${appName} oleh ${childName} ditolak`, 'info');
  };

  // Filtered Apps
  const filteredApps = apps.filter(app => {
    const matchesSearch = app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChild = childFilter === 'all' || app.childName === childFilter;
    const matchesCat = categoryFilter === 'all' || app.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesChild && matchesCat && matchesStatus;
  });

  // Calculate pagination for apps
  const totalAppsPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalAppsPages);
  const paginatedApps = filteredApps.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  // Pagination for Requests
  const totalRequestsPages = Math.ceil(requests.length / requestsPerPage) || 1;
  const safeRequestsPage = Math.min(requestsPage, totalRequestsPages);
  const paginatedRequests = requests.slice(
    (safeRequestsPage - 1) * requestsPerPage,
    safeRequestsPage * requestsPerPage
  );

  const getCategoryBadge = (category: AppRuleItem['category']) => {
    switch (category) {
      case 'game':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
            <Gamepad2 className="w-3 h-3" /> Game
          </span>
        );
      case 'education':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <BookOpen className="w-3 h-3" /> Edukasi
          </span>
        );
      case 'video':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
            <Video className="w-3 h-3" /> Video
          </span>
        );
      case 'social':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
            <Globe className="w-3 h-3" /> Media Sosial
          </span>
        );
      case 'chat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            <MessageCircle className="w-3 h-3" /> Chat
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Aplikasi
          </span>
        );
    }
  };

  const getStatusBadge = (status: AppRuleItem['status']) => {
    switch (status) {
      case 'allowed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Unlock className="w-3 h-3" /> Diizinkan
          </span>
        );
      case 'limited':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Dibatasi Waktu
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Lock className="w-3 h-3" /> Diblokir
          </span>
        );
    }
  };

  const totalAppsCount = apps.length;
  const blockedAppsCount = apps.filter(a => a.status === 'blocked').length;
  const limitedAppsCount = apps.filter(a => a.status === 'limited').length;
  const pendingReqCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Header & Overview Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
              <AppWindow className="w-5 h-5" />
            </div>
            <h1 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
              Kontrol & Pembatasan Aplikasi
            </h1>
          </div>
          <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
            Kelola izin akses, batas kuota harian, jadwal blokir otomatis, dan proteksi kategori aplikasi per anak.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Aturan Aplikasi</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Total Aplikasi</span>
            <AppWindow className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-medium text-slate-900 dark:text-white">
            {loading ? '...' : `${totalAppsCount} Aplikasi`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Terdaftar dalam filter</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Dibatasi Waktu</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-medium text-amber-600 dark:text-amber-400">
            {loading ? '...' : `${limitedAppsCount} Aplikasi`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Ada kuota harian</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Diblokir Total</span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base font-medium text-rose-600 dark:text-rose-400">
            {loading ? '...' : `${blockedAppsCount} Aplikasi`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Akses ditutup 24/7</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Permintaan Akses</span>
            <AlertTriangle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-base font-medium text-purple-600 dark:text-purple-400">
            {loading ? '...' : `${pendingReqCount} Menunggu`}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Permintaan izin anak</div>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="bg-white dark:bg-slate-800/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Aksi Cepat Aturan:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleQuickBlockAllGames}
            className="px-2.5 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Semua Game</span>
          </button>

          <button
            type="button"
            onClick={handleQuickAllowEducation}
            className="px-2.5 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Buka Bebas Edukasi</span>
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('daftar')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeSubTab === 'daftar'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <AppWindow className="w-3.5 h-3.5" />
          <span>Daftar Aplikasi ({apps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('jadwal')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeSubTab === 'jadwal'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Jadwal Blokir Rutin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('permintaan')}
          className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeSubTab === 'permintaan'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Permintaan Izin Akses</span>
          {pendingReqCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-medium">
              {pendingReqCount}
            </span>
          )}
        </button>
      </div>

      {/* SUBTAB 1: DAFTAR APLIKASI */}
      {activeSubTab === 'daftar' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama aplikasi atau package..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Anak */}
              <select
                value={childFilter}
                onChange={(e) => {
                  setChildFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Anak</option>
                <option value="Nadia">Nadia (Tablet Samsung Tab A8)</option>
                <option value="Rayhan">Rayhan (Xiaomi Redmi 10)</option>
              </select>

              {/* Filter Kategori */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Kategori</option>
                <option value="game">Game</option>
                <option value="education">Edukasi & Belajar</option>
                <option value="video">Video</option>
                <option value="social">Media Sosial</option>
                <option value="chat">Chat & Pesan</option>
              </select>

              {/* Filter Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Semua Status</option>
                <option value="allowed">Diizinkan</option>
                <option value="limited">Dibatasi Waktu</option>
                <option value="blocked">Diblokir</option>
              </select>
            </div>
          </div>

          {/* Apps Table / Cards */}
          {loading ? (
            <div className="bg-white dark:bg-slate-800/80 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              <p className="text-xs font-normal text-slate-400">Memuat data pembatasan aplikasi...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/80 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <AppWindow className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Tidak ada aplikasi yang cocok dengan filter pencarian.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 text-xs font-medium">
                      <th className="py-3 px-4">Aplikasi & Kategori</th>
                      <th className="py-3 px-4">Anak & Perangkat</th>
                      <th className="py-3 px-4">Batas Durasi Harian</th>
                      <th className="py-3 px-4">Status Izin</th>
                      <th className="py-3 px-4 text-right">Aksi & Kontrol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {paginatedApps.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        {/* App Icon & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={app.icon}
                              alt={app.appName}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="text-xs font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{app.appName}</span>
                              </div>
                              <div className="mt-1">
                                {getCategoryBadge(app.category)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Child & Device */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {app.childName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                            <Smartphone className="w-3 h-3 text-slate-400" />
                            <span>{app.deviceName}</span>
                          </div>
                        </td>

                        {/* Usage & Limits */}
                        <td className="py-3.5 px-4">
                          {app.status === 'blocked' ? (
                            <span className="text-xs font-normal text-rose-500 flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" /> Terkunci Total
                            </span>
                          ) : app.status === 'allowed' ? (
                            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Unlock className="w-3.5 h-3.5" /> Tanpa Batas
                            </span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                  {app.dailyLimitMinutes} Menit/Hari
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  (Terpakai: {app.usedTodayMinutes}m)
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    (app.usedTodayMinutes / (app.dailyLimitMinutes || 1)) >= 1
                                      ? 'bg-rose-500'
                                      : (app.usedTodayMinutes / (app.dailyLimitMinutes || 1)) >= 0.7
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-500'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, (app.usedTodayMinutes / (app.dailyLimitMinutes || 1)) * 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => requestActionConfirmation(
                              app,
                              app.status === 'blocked' ? 'buka' : 'kunci'
                            )}
                            className="cursor-pointer"
                            title="Klik untuk ubah status dengan konfirmasi"
                          >
                            {getStatusBadge(app.status)}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(app)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>Atur Batas</span>
                            </button>

                            {app.status === 'blocked' ? (
                              <button
                                type="button"
                                onClick={() => requestActionConfirmation(app, 'buka')}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title={`Buka Kunci untuk ${app.childName}`}
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Buka</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => requestActionConfirmation(app, 'kunci')}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title={`Kunci Aplikasi untuk ${app.childName}`}
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Kunci</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Responsive Pagination */}
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalAppsPages}
                totalItems={filteredApps.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                pageSizeOptions={[5, 10, 15, 20]}
                itemLabel="aplikasi"
              />
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: JADWAL BLOKIR RUTIN */}
      {activeSubTab === 'jadwal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                  Jadwal Jam Sekolah (07:00 - 14:00)
                </h3>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  Otomatis kunci game, video, dan medsos saat jam belajar di sekolah.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-slate-700 dark:text-slate-300 font-normal">Status Proteksi Jam Sekolah</span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium rounded-md">
                  Aktif (Senin - Jumat)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-slate-700 dark:text-slate-300 font-normal">Aplikasi yang Dikecualikan</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Hanya Aplikasi Edukasi</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                  Jadwal Jam Tidur Malam (21:00 - 06:00)
                </h3>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  Kunci seluruh layar & aplikasi hiburan saat waktu istirahat malam.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-slate-700 dark:text-slate-300 font-normal">Status Proteksi Jam Tidur</span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium rounded-md">
                  Aktif Setiap Hari
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-slate-700 dark:text-slate-300 font-normal">Panggilan Darurat Orang Tua</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tetap Diizinkan</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: PERMINTAAN IZIN AKSES */}
      {activeSubTab === 'permintaan' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/80 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Tidak ada permintaan izin akses yang menunggu saat ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedRequests.map(req => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-900 dark:text-white">
                        {req.childName} meminta akses aplikasi: {req.appName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {req.durationRequested}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {req.requestedAt}
                      </span>
                    </div>
                    <p className="text-xs font-normal text-slate-600 dark:text-slate-300 italic">
                      "{req.reason}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req.id, req.appName, req.childName)}
                          className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.id, req.appName, req.childName)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      </>
                    ) : req.status === 'approved' ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Telah Disetujui
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <X className="w-4 h-4" /> Ditolak
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {requests.length > 5 && (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
                  <Pagination
                    currentPage={safeRequestsPage}
                    totalPages={totalRequestsPages}
                    totalItems={requests.length}
                    itemsPerPage={requestsPerPage}
                    onPageChange={setRequestsPage}
                    onItemsPerPageChange={setRequestsPerPage}
                    pageSizeOptions={[5, 10, 20]}
                    itemLabel="permintaan"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL KONFIRMASI BUKA / KUNCI APLIKASI */}
      {/* =================================================================== */}
      {confirmModal.isOpen && confirmModal.app && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${
                  confirmModal.actionType === 'kunci'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                }`}>
                  {confirmModal.actionType === 'kunci' ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Unlock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    {confirmModal.actionType === 'kunci' ? 'Konfirmasi Kunci Aplikasi' : 'Konfirmasi Buka Akses Aplikasi'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Pengendalian Parental Control Langsung
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, app: null, actionType: 'buka' })}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Information Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center gap-3">
                <img
                  src={confirmModal.app.icon}
                  alt={confirmModal.app.appName}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                    {confirmModal.app.appName}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-normal truncate">
                    {confirmModal.app.packageName}
                  </p>
                </div>
              </div>

              {/* Detail Anak & Perangkat */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-normal block">Nama Anak</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    {confirmModal.app.childName}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-normal block">Perangkat Terhubung</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{confirmModal.app.deviceName}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation Message */}
            <div className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              {confirmModal.actionType === 'kunci' ? (
                <p>
                  Apakah Anda yakin ingin <span className="font-medium text-rose-600 dark:text-rose-400">mengunci / memblokir total</span> aplikasi <strong>{confirmModal.app.appName}</strong> pada perangkat <strong>{confirmModal.app.deviceName}</strong> milik <strong>{confirmModal.app.childName}</strong>? Aplikasi tidak akan dapat dibuka oleh anak hingga dibuka kembali oleh orang tua.
                </p>
              ) : (
                <p>
                  Apakah Anda yakin ingin <span className="font-medium text-emerald-600 dark:text-emerald-400">membuka akses</span> aplikasi <strong>{confirmModal.app.appName}</strong> pada perangkat <strong>{confirmModal.app.deviceName}</strong> milik <strong>{confirmModal.app.childName}</strong>? Aplikasi akan dapat digunakan secara bebas tanpa batas waktu.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, app: null, actionType: 'buka' })}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 text-xs font-medium text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  confirmModal.actionType === 'kunci'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {confirmModal.actionType === 'kunci' ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Ya, Kunci Aplikasi</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Ya, Buka Akses</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT BATAS WAKTU APLIKASI */}
      {/* =================================================================== */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <img
                  src={editingApp.icon}
                  alt={editingApp.appName}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    Atur Batas: {editingApp.appName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Untuk {editingApp.childName} ({editingApp.deviceName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Daily Limit Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-medium">Batas Waktu Harian:</label>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium rounded-md">
                    {limitMinutesInput === 0 ? 'Tanpa Batas' : `${limitMinutesInput} Menit`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="15"
                  value={limitMinutesInput}
                  onChange={(e) => setLimitMinutesInput(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Bebas (0m)</span>
                  <span>30m</span>
                  <span>60m</span>
                  <span>120m</span>
                  <span>180m</span>
                </div>
              </div>

              {/* Schedule Mode */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Mode Jadwal Kunci:
                </label>
                <select
                  value={scheduleModeInput}
                  onChange={(e) => setScheduleModeInput(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-200"
                >
                  <option value="study_time_blocked">Blokir Otomatis Saat Jam Sekolah & Belajar</option>
                  <option value="bedtime_blocked">Blokir Otomatis Saat Jam Tidur Malam</option>
                  <option value="all_day">Berlaku Sepanjang Hari</option>
                </select>
              </div>

              {/* Weekend Extra */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Tambahan Waktu Akhir Pekan
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Berikan bonus waktu saat Sabtu & Minggu
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowWeekendInput}
                  onChange={(e) => setAllowWeekendInput(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveEditModal}
                className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: TAMBAH ATURAN BARU */}
      {/* =================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AppWindow className="w-5 h-5 text-indigo-500" />
                <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                  Tambah Aturan Aplikasi Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomApp} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Nama Aplikasi:
                </label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="Contoh: Mobile Legends, Netflix, Telegram..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Kategori:
                  </label>
                  <select
                    value={newAppCategory}
                    onChange={(e) => setNewAppCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-200"
                  >
                    <option value="game">Game & Hiburan</option>
                    <option value="social">Media Sosial</option>
                    <option value="video">Streaming Video</option>
                    <option value="chat">Chat & Komunikasi</option>
                    <option value="education">Edukasi & Belajar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Pilih Anak:
                  </label>
                  <select
                    value={newAppChild}
                    onChange={(e) => setNewAppChild(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-200"
                  >
                    <option value="Rayhan">Rayhan (Xiaomi Redmi 10)</option>
                    <option value="Nadia">Nadia (Tablet Samsung Tab A8)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Aturan Akses:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAppStatus('limited')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-colors cursor-pointer ${
                      newAppStatus === 'limited'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Batas Kuota Waktu
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAppStatus('blocked')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-colors cursor-pointer ${
                      newAppStatus === 'blocked'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Kunci / Blokir Total
                  </button>
                </div>
              </div>

              {newAppStatus === 'limited' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Durasi Harian: {newAppLimit} Menit
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="120"
                    step="15"
                    value={newAppLimit}
                    onChange={(e) => setNewAppLimit(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Tambahkan Aturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
