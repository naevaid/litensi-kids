import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowLeft, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { Page, User } from '../types';
import { api, setSessionUser, SessionUser } from '../lib/apiClient';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Semua kolom input wajib diisi.');
      return;
    }

    setIsLoading(true);
    console.log('[LoginPage] attempt login untuk email:', email.toLowerCase());

    try {
      const res = await api.post<{ user: SessionUser }>(
        '/auth/login',
        {
          email: email.toLowerCase().trim(),
          password: password,
        },
        { authRequired: false, skipUserParam: true }
      );

      if (!res.ok || !res.data?.user) {
        console.warn('[LoginPage] login gagal:', res.status, res.message, res.data);
        const msg =
          res.message && res.status !== 422
            ? res.message
            : 'Email atau password salah. Coba lagi atau daftarkan akun baru.';
        if (res.status === 422) {
          // Coba ambil pesan error dari Laravel validator
          const rawBody = (res.raw as any)?.bodyUsed
            ? null
            : (res as any).message;
        }
        setError(msg);
        return;
      }

      const u = res.data.user;
      // Simpan session untuk digunakan request berikutnya (inject user_id)
      setSessionUser(u);

      const uiUser: User = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role === 'Maste' || u.role?.toLowerCase().includes('master')
          ? 'Master / Pemilik Web App'
          : 'Orang Tua / Administrator',
        avatarUrl: u.avatar_url || undefined,
        activePlan: u.active_plan,
        activePlanLabel: u.active_plan_label,
        childrenCount: u.children_count,
        devicesCount: u.devices_count,
        expiresAt: u.expires_at,
        status: u.status,
      };

      console.log('[LoginPage] login sukses:', uiUser);
      setSuccess('Login berhasil! Mengalihkan...');
      setTimeout(() => {
        onLoginSuccess(uiUser);
        onNavigate('dashboard');
      }, 700);
    } catch (err: any) {
      console.error('[LoginPage] exception saat login:', err);
      setError('Terjadi kesalahan pada sistem. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300 font-sans">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

      {/* Utilities header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <button 
          onClick={() => onNavigate('landing')}
          id="login-back-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Beranda
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:glass border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl p-8"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="flex items-center justify-center">
            <img
              src="/logo/litensilogo.png"
              alt="Litensi Kids Logo"
              className="w-12 h-12 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                const fallback = document.getElementById('login-logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'block';
                const fallback = document.getElementById('login-logo-fallback');
                if (fallback) fallback.style.display = 'none';
              }}
            />
            <div
              id="login-logo-fallback"
              style={{ display: 'none' }}
              className="items-center justify-center p-2.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 rounded-xl text-white shadow-md"
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-1">
            <h2 className="text-base font-medium tracking-wider text-slate-900 dark:text-white">
              LITENSI KIDS
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Masuk ke Dasbor Bimbingan Digital Orang Tua
            </p>
          </div>
        </div>

        {!(import.meta as any).env?.PROD && (
          // Hanya tampilkan Akun Demo Cepat di mode pengembangan (bukan production)
          <div className="mb-5 p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <span className="font-medium block mb-1">💡 Akun Demo Cepat (Database Real):</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 font-mono text-[11px]">
              <span>Master Admin:</span>
              <span className="sm:text-right">
                <span className="select-all">admin@litensikids.id</span> / <span className="select-all">admin123</span>
              </span>
              <span>Orang Tua:</span>
              <span className="sm:text-right">
                <span className="select-all">orangtua@litensikids.id</span> / <span className="select-all">password123</span>
              </span>
            </div>
          </div>
        )}

        {/* Status Alerts */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                id="login-email-input"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Password
              </label>
              <button 
                type="button"
                onClick={() => onNavigate('forgot')}
                id="login-forgot-pass-link"
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Lupa Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                id="login-password-input"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            id="login-submit-btn"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Masuk Akun'
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-slate-500 dark:text-slate-400">
          Belum memiliki akun LEVEL UP?{' '}
          <button 
            onClick={() => onNavigate('register')}
            id="login-to-register"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
          >
            Daftar Uji Coba Gratis
          </button>
        </div>
      </motion.div>
    </div>
  );
};
