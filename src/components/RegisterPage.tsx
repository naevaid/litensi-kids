import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Lock, 
  Phone,
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2,
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  Copy,
  Check,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Shield,
  Smartphone,
  MapPin,
  Mic,
  Camera,
  Navigation,
  MessageSquare,
  Crown
} from 'lucide-react';
import { Page, User as UserType } from '../types';
import { api, setSessionUser, SessionUser } from '../lib/apiClient';

interface RegisterPageProps {
  onNavigate: (page: Page) => void;
  onLoginSuccess?: (user: UserType) => void;
}

export type PlanId = 'free' | 'premium' | 'family_pro';

interface PlanDetail {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  badge?: string;
  popular?: boolean;
  desc: string;
  features: string[];
}

const PLAN_DETAILS: Record<PlanId, PlanDetail> = {
  free: {
    id: 'free',
    name: 'Free (Dasar)',
    monthlyPrice: 0,
    annualPrice: 0,
    badge: 'Gratis',
    desc: 'Pengawasan esensial untuk 1 perangkat anak tanpa biaya bulanan.',
    features: [
      '1 Perangkat Anak Terhubung',
      'Lacak Lokasi GPS Dasar (Riwayat 24 Jam)',
      'Pembatasan Maksimal 3 Aplikasi',
      '1 Area Geofence Aman & Bahaya',
      'Kunci Layar Jarak Jauh (Manual)',
      'Dashboard Kontrol Orang Tua'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 49000,
    annualPrice: 39000,
    popular: true,
    badge: 'Paling Populer',
    desc: 'Pengawasan terarah & audio monitor 1 arah untuk 1-3 perangkat anak.',
    features: [
      'Hingga 3 Perangkat Anak Terhubung',
      'Lacak Lokasi Real-time GPS & Riwayat 7 Hari',
      'Dengarkan Suara Sekitar 1 Arah (Audio Monitor)',
      'Pembatasan Aplikasi Tanpa Batas & Terjadwal',
      '5 Area Geofence Notifikasi Otomatis Masuk/Keluar',
      'Teruskan Notifikasi Pesan SMS & Chat Masuk',
      'Kunci Layar Seketika & Otomatis Jam Belajar'
    ]
  },
  family_pro: {
    id: 'family_pro',
    name: 'Family Pro',
    monthlyPrice: 99000,
    annualPrice: 79000,
    badge: 'Perlindungan Total',
    desc: 'Solusi keamanan total keluarga dengan live kamera 360°, audio HD, dan filter AI.',
    features: [
      'Hingga 10 Perangkat Anak Terhubung',
      'Lacak Lokasi Presisi Tinggi + Riwayat 30 Hari + Tombol SOS',
      'Live Monitor Kamera Depan & Belakang Jarak Jauh',
      'Dengarkan Suara 1 Arah Kualitas HD Unlimited',
      'Geofence Tanpa Batas (Unlimited Geofences)',
      'Baca Notifikasi Lengkap (WhatsApp, SMS, Game & Alert OTP)',
      'Filter AI Konten Dewasa & Deteksi Kata Sensitif',
      'Kunci Layar Jarak Jauh + Modus Darurat SOS'
    ]
  }
};

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onLoginSuccess }) => {
  // Form fields
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Package & Billing
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('premium');
  const [isAnnual, setIsAnnual] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bca_va' | 'mandiri_va' | 'bri_va' | 'ewallet'>('qris');
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [copiedVa, setCopiedVa] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Status message
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load saved plan choice if navigated from landing
  useEffect(() => {
    const savedPlan = localStorage.getItem('selected_plan');
    if (savedPlan) {
      if (savedPlan === 'free' || savedPlan === 'starter') {
        setSelectedPlanId('free');
      } else if (savedPlan === 'premium' || savedPlan === 'business') {
        setSelectedPlanId('premium');
      } else if (savedPlan === 'family_pro' || savedPlan === 'enterprise') {
        setSelectedPlanId('family_pro');
      }
    }
  }, []);

  const currentPlan = PLAN_DETAILS[selectedPlanId] || PLAN_DETAILS.premium;
  const isFreePlan = selectedPlanId === 'free';

  // Calculate pricing
  const basePricePerMonth = isAnnual ? currentPlan.annualPrice : currentPlan.monthlyPrice;
  const grandTotal = isAnnual ? basePricePerMonth * 12 : basePricePerMonth;

  // Format currency
  const formatRupiah = (amount: number) => {
    if (amount === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Mohon lengkapi seluruh kolom wajib pendaftaran akun orang tua.');
      return;
    }

    if (password.length < 6) {
      setError('Password akun minimal terdiri dari 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }

    if (!agreedToTerms) {
      setError('Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi Litensi Kids.');
      return;
    }

    console.log('[RegisterPage] submit form untuk email:', email.toLowerCase(), 'plan:', selectedPlanId);

    if (isFreePlan) {
      // Free plan: langsung create user via endpoint register
      setIsLoading(true);
      try {
        const res = await api.post<{ user: SessionUser }>(
          '/auth/register',
          {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || null,
            password: password,
          },
          { authRequired: false, skipUserParam: true }
        );

        if (!res.ok || !res.data?.user) {
          console.warn('[RegisterPage] register gagal:', res);
          const msg =
            res.status === 422 && res.message?.includes('email')
              ? 'Email ini telah terdaftar. Silakan gunakan email lain atau masuk.'
              : res.message || 'Gagal mendaftarkan akun. Coba lagi.';
          setError(msg);
          setIsLoading(false);
          return;
        }

        finalizeRegistrationAndLogin(res.data.user);
      } catch (err) {
        console.error('[RegisterPage] exception register:', err);
        setError('Terjadi kesalahan jaringan saat pendaftaran. Coba lagi.');
        setIsLoading(false);
      }
    } else {
      // Paid plan proceeds to payment step
      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const finalizeRegistrationAndLogin = (sessionUser?: SessionUser) => {
    // User sudah dibuat via API, cukup simpan session dan login UI
    const fallbackAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    let session: SessionUser;
    if (sessionUser) {
      session = sessionUser;
      console.log('[RegisterPage] pakai user dari API:', session.id, session.email);
    } else {
      // Fallback: buat user dari data form (biasanya untuk paid setelah payment)
      session = {
        id: 0,
        name,
        email,
        role: 'Orang Tua',
        avatar_url: fallbackAvatar,
        active_plan: selectedPlanId,
        active_plan_label: currentPlan.name,
        children_count: 0,
        devices_count: 0,
        status: 'trial',
      };
    }

    // Simpan session user (untuk auto-inject user_id ke request API berikutnya)
    setSessionUser(session);
    localStorage.setItem('litensi_active_plan', selectedPlanId);

    const uiUser: UserType = {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role === 'Maste' || session.role?.toLowerCase().includes('master')
        ? 'Master / Pemilik Web App'
        : 'Orang Tua / Administrator',
      avatarUrl: session.avatar_url || fallbackAvatar,
      activePlan: session.active_plan,
      activePlanLabel: session.active_plan_label,
      childrenCount: session.children_count,
      devicesCount: session.devices_count,
      expiresAt: session.expires_at,
      status: session.status,
    };

    if (onLoginSuccess) {
      onLoginSuccess(uiUser);
    } else {
      onNavigate('dashboard');
    }
  };

  const handleSimulatePayment = async () => {
    setIsVerifyingPayment(true);
    console.log('[RegisterPage] simulasi pembayaran paket:', selectedPlanId, 'periode:', isAnnual ? 'tahunan' : 'bulanan');

    // Step 1: create user dulu via API register
    let session: SessionUser | null = null;
    try {
      const res = await api.post<{ user: SessionUser }>(
        '/auth/register',
        {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone || null,
          password: password,
        },
        { authRequired: false, skipUserParam: true }
      );
      if (res.ok && res.data?.user) {
        session = res.data.user;
      } else {
        console.warn('[RegisterPage] register user di payment step gagal, lanjut dengan simulasi. err:', res.message);
      }
    } catch (err) {
      console.warn('[RegisterPage] exception create user (email mungkin sudah ada):', err);
    }

    setTimeout(() => {
      setIsVerifyingPayment(false);
      setStep('success');
      setTimeout(() => {
        finalizeRegistrationAndLogin(session || undefined);
      }, 1800);
    }, 1200);
  };

  const handleCopyVA = (vaNumber: string) => {
    navigator.clipboard.writeText(vaNumber);
    setCopiedVa(true);
    setTimeout(() => setCopiedVa(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('landing')}
            id="register-back-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-normal rounded-xl text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </button>
          
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <img
              src="/logo/litensilogo.png"
              alt="Litensi Kids Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                const fallback = document.getElementById('register-header-logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'block';
                const fallback = document.getElementById('register-header-logo-fallback');
                if (fallback) fallback.style.display = 'none';
              }}
            />
            <div
              id="register-header-logo-fallback"
              style={{ display: 'none' }}
              className="items-center justify-center p-1 bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 rounded-xl text-white shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="brand-text-shine text-xs sm:text-sm font-medium tracking-wider block leading-none">
                LITENSI KIDS
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-normal block tracking-wide mt-0.5 leading-none">
                Bimbingan Digital Anak
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Sudah memiliki akun?</span>
          <button 
            onClick={() => onNavigate('login')}
            id="register-header-login-btn"
            className="px-3.5 py-1.5 text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
          >
            Masuk Akun
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Step Indicator */}
        <div className="max-w-xl mx-auto mb-6 sm:mb-8">
          <div className="flex items-center justify-between text-xs font-normal text-slate-400">
            <div className={`flex items-center gap-2 ${step === 'form' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-normal ${step === 'form' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                {step !== 'form' ? '✓' : '1'}
              </span>
              <span>1. Form Pendaftaran Akun</span>
            </div>

            <div className={`h-0.5 flex-1 mx-4 ${step !== 'form' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />

            <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : step === 'success' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-normal ${step === 'payment' ? 'bg-indigo-600 text-white' : step === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {step === 'success' ? '✓' : '2'}
              </span>
              <span>2. Pembayaran & Akses Proteksi</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div 
              key="form-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-start"
            >
              {/* LEFT COLUMN: Registration Form */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-md uppercase font-medium">
                      Parental Control System
                    </span>
                  </div>
                  <h1 className="text-base sm:text-base font-medium text-slate-900 dark:text-white mt-1">
                    Pendaftaran Akun Orang Tua & Proteksi Anak
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal leading-relaxed">
                    Daftarkan akun Owner keluarga untuk mengontrol waktu layar, melacak lokasi GPS, dan membatasi akses gadget anak.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Nama Lengkap Orang Tua <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <User className="w-4 h-4" />
                        </span>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Bunda Sarah / Ayah Rian"
                          id="register-name-input"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors font-normal text-slate-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Nama Keluarga / Profil Rumah
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Building className="w-4 h-4" />
                        </span>
                        <input 
                          type="text" 
                          value={familyName}
                          onChange={(e) => setFamilyName(e.target.value)}
                          placeholder="Keluarga Pratama"
                          id="register-family-input"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors font-normal text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Email Orang Tua (Login) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="orangtua@email.com"
                          id="register-email-input"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors font-normal text-slate-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Nomor WhatsApp Orang Tua
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Phone className="w-4 h-4" />
                        </span>
                        <input 
                          type="tel" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="081234567890"
                          id="register-phone-input"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors font-normal text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Password Akun <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          id="register-password-input"
                          className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors font-normal text-slate-900 dark:text-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5 text-indigo-500" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Ulangi Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Konfirmasi password"
                          id="register-confirm-password-input"
                          className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors font-normal text-slate-900 dark:text-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 text-indigo-500" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Plan Selector Radios inside left form */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-900 dark:text-white block">
                        Pilih Paket Langganan Keluarga:
                      </label>
                      
                      {/* Billing Cycle Switch */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] ${!isAnnual ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-400'}`}>Bulanan</span>
                        <button
                          type="button"
                          onClick={() => setIsAnnual(!isAnnual)}
                          id="register-billing-switch"
                          className="w-9 h-5 bg-indigo-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 relative transition-colors cursor-pointer"
                        >
                          <div className={`w-3.5 h-3.5 bg-indigo-600 rounded-full transition-transform ${isAnnual ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-[11px] flex items-center gap-1 ${isAnnual ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-400'}`}>
                          <span>Tahunan</span>
                          <span className="px-1 py-0.2 bg-emerald-500 text-white text-[8.5px] rounded-sm font-medium">Hemat 20%</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {(['free', 'premium', 'family_pro'] as const).map((planKey) => {
                        const plan = PLAN_DETAILS[planKey];
                        const isSelected = selectedPlanId === planKey;
                        const displayPrice = isAnnual 
                          ? (plan.annualPrice === 0 ? 'Gratis' : `Rp ${(plan.annualPrice / 1000).toFixed(0)}rb/bln`)
                          : (plan.monthlyPrice === 0 ? 'Gratis' : `Rp ${(plan.monthlyPrice / 1000).toFixed(0)}rb/bln`);

                        return (
                          <div
                            key={planKey}
                            onClick={() => setSelectedPlanId(planKey)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left relative ${
                              isSelected 
                                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600/30' 
                                : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-slate-300'
                            }`}
                          >
                            {plan.popular && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 bg-indigo-600 text-white text-[8px] font-medium uppercase rounded-full tracking-wider">
                                Rekomendasi
                              </span>
                            )}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-xs text-slate-900 dark:text-white">{plan.name}</span>
                                <input 
                                  type="radio" 
                                  name="selectedPlan" 
                                  checked={isSelected} 
                                  onChange={() => setSelectedPlanId(planKey)}
                                  className="accent-indigo-600"
                                />
                              </div>
                              <span className="font-medium text-indigo-600 dark:text-indigo-400 text-xs block">
                                {displayPrice}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className="pt-2 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                    <input 
                      type="checkbox"
                      id="agreed-terms-cb"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded accent-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="agreed-terms-cb" className="cursor-pointer text-[11px]">
                      Saya menyetujui <button type="button" onClick={() => onNavigate('terms')} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Syarat & Ketentuan</button> serta <button type="button" onClick={() => onNavigate('privacy')} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Kebijakan Privasi</button> perlindungan data anak Litensi Kids.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={isLoading}
                    id="register-submit-btn"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-medium text-xs sm:text-sm tracking-wide shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 mt-3"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isFreePlan ? (
                      <>
                        <span>Selesaikan Pendaftaran Gratis</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Lanjut ke Proses Pembayaran ({formatRupiah(grandTotal)})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: Selected Package Details & Feature Limits Summary */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 relative overflow-hidden">
                  {/* Package Badge */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-medium uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">
                        RINGKASAN PAKET TERPILIH
                      </span>
                      <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white mt-0.5">
                        Paket {currentPlan.name}
                      </h3>
                    </div>
                    {currentPlan.badge && (
                      <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 text-[10px] font-medium rounded-md uppercase">
                        {currentPlan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                    {currentPlan.desc}
                  </p>

                  {/* Price Breakdown */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2.5 text-xs font-normal">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>Paket Dipilih:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{currentPlan.name} ({isAnnual ? 'Tahunan' : 'Bulanan'})</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>Harga Normal:</span>
                      <span>{isFreePlan ? 'Gratis' : `Rp ${(currentPlan.monthlyPrice / 1000).toLocaleString('id-ID')}rb / bln`}</span>
                    </div>

                    {isAnnual && !isFreePlan && (
                      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                        <span>Diskon Hemat Tahunan (20%):</span>
                        <span>- Rp {((currentPlan.monthlyPrice - currentPlan.annualPrice) * 12).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span>Biaya Proteksi & Server:</span>
                      <span className="text-emerald-600 font-medium">Sudah Termasuk</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                      <span className="font-medium text-slate-900 dark:text-white text-xs">Total Tagihan:</span>
                      <div className="text-right">
                        <span className="text-base font-medium text-indigo-600 dark:text-indigo-400 block">
                          {formatRupiah(grandTotal)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block">
                          {isFreePlan ? 'Gratis Selamanya' : isAnnual ? 'Ditagihkan 1x Tahunan' : 'Ditagihkan Bulanan'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Included Features List (8 Limits) */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[10px] font-medium uppercase text-slate-400 tracking-wider block">
                      Batasan Fitur & Akses Proteksi:
                    </span>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-normal">
                      {currentPlan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Guarantee Seals */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[10.5px] font-normal text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Enkripsi TLS 256-bit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Aktif Otomatis &lt;1 Mnt</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div 
              key="payment-step"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xs space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    LANGKAH 2: INSTRUKSI PEMBAYARAN
                  </span>
                  <h2 className="text-base font-medium text-slate-900 dark:text-white mt-0.5">
                    Selesaikan Pembayaran Paket {currentPlan.name}
                  </h2>
                </div>

                <button 
                  onClick={() => setStep('form')}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-normal rounded-xl hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Ubah Paket
                </button>
              </div>

              {/* Order Summary Ribbon */}
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-medium uppercase text-indigo-600 dark:text-indigo-400 block">Total Tagihan Pembayaran</span>
                  <span className="text-base font-medium text-slate-900 dark:text-white">{formatRupiah(grandTotal)}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Akun: {name} ({familyName || 'Keluarga Utama'})</span>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-normal">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Batas Bayar: 23:59:50</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                  Pilih Saluran Pembayaran:
                </label>

                <div className="grid sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'qris', name: 'QRIS Scan', sub: 'GoPay, OVO, ShopeePay, m-Banking', icon: <QrCode className="w-4 h-4 text-indigo-600" /> },
                    { id: 'bca_va', name: 'BCA VA', sub: 'Otomatis 24 Jam', icon: <Building className="w-4 h-4 text-blue-600" /> },
                    { id: 'mandiri_va', name: 'Mandiri VA', sub: 'Otomatis 24 Jam', icon: <Building className="w-4 h-4 text-amber-600" /> },
                    { id: 'bri_va', name: 'BRI VA', sub: 'Otomatis 24 Jam', icon: <Building className="w-4 h-4 text-blue-700" /> },
                    { id: 'ewallet', name: 'E-Wallet', sub: 'DANA / OVO / LinkAja', icon: <CreditCard className="w-4 h-4 text-emerald-600" /> }
                  ].map((m) => (
                    <div 
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        paymentMethod === m.id 
                          ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-600/30' 
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">{m.icon}</div>
                      <div>
                        <span className="font-medium text-xs text-slate-900 dark:text-white block">{m.name}</span>
                        <span className="text-[10px] text-slate-400 block">{m.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Payment Display Details */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4">
                {paymentMethod === 'qris' ? (
                  <div className="flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      Scan Kode QRIS Menggunakan Aplikasi Mobile Banking / e-Wallet Anda:
                    </span>

                    {/* QR Code Graphic Box */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`LITENSIKIDS-PAYMENT-${grandTotal}`)}`} 
                        alt="QRIS Payment Code" 
                        className="w-40 h-40 object-contain"
                      />
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] font-normal text-slate-600">
                        <QrCode className="w-3 h-3 text-indigo-600" />
                        <span>NMID: ID102026880199</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 max-w-sm">
                      Dukungan instan untuk GoPay, OVO, ShopeePay, DANA, BCA Mobile, Livin Mandiri, BRImo, dan seluruh m-Banking berlogo QRIS.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
                      Nomor Virtual Account Transfer ({paymentMethod.toUpperCase().replace('_', ' ')}):
                    </span>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-normal uppercase block">Nomor Rekening VA</span>
                        <span className="text-base font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">
                          8801 2490 0012 3456
                        </span>
                      </div>

                      <button 
                        onClick={() => handleCopyVA('8801249000123456')}
                        className="px-3 py-1.5 bg-indigo-600 text-white font-normal text-xs rounded-xl hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {copiedVa ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedVa ? 'Tersalin' : 'Salin Nomor'}</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>• Masukkan nominal pembayaran tepat sebesar <span className="font-medium text-slate-900 dark:text-white">{formatRupiah(grandTotal)}</span></p>
                      <p>• Transaksi akan terverifikasi secara otomatis oleh sistem tanpa perlu upload bukti transfer.</p>
                    </div>
                  </div>
                )}

                {/* Simulate Payment Trigger Button */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={handleSimulatePayment}
                    disabled={isVerifyingPayment}
                    id="payment-verify-btn"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isVerifyingPayment ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Memverifikasi Pembayaran dari Bank...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Simulasi Bayar Sekarang (Verifikasi Otomatis)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 text-center space-y-4 shadow-2xs"
            >
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-base font-medium text-slate-900 dark:text-white">
                  Pembayaran & Pendaftaran Berhasil!
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-normal">
                  Selamat! Akun Litensi Kids Paket <span className="font-medium text-indigo-600">{currentPlan.name}</span> Anda telah aktif. Mengalihkan Anda langsung ke dashboard proteksi...
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1 text-left">
                <div className="flex justify-between">
                  <span>No. Transaksi:</span>
                  <span className="font-medium text-indigo-600">TRX-20260821-LITENSI</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Akses:</span>
                  <span className="font-medium text-emerald-600">AKTIF (Verified)</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-600">
                <span className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                <span>Memuat Dashboard Litensi Kids...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
