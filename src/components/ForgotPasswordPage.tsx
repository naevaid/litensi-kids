import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { Page } from '../types';

interface ForgotPasswordPageProps {
  onNavigate: (page: Page) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setRecoveredPassword('');

    if (!email) {
      setError('Mohon masukkan alamat email Anda.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const storedUsersRaw = localStorage.getItem('registered_users');
        const registeredUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

        // Check if user exists
        const matchedUser = registeredUsers.find(
          (u: any) => u.email.toLowerCase() === email.toLowerCase()
        );

        const isDefaultDemo = email.toLowerCase() === 'admin@levelup.co.id';

        if (matchedUser) {
          setSuccess(`Email ditemukan! Instruksi pemulihan telah dikirim.`);
          setRecoveredPassword(matchedUser.password);
        } else if (isDefaultDemo) {
          setSuccess(`Email demo ditemukan! Instruksi pemulihan telah dikirim.`);
          setRecoveredPassword('admin123');
        } else {
          // General simulation if email not registered yet
          setSuccess('Link reset password berhasil disimulasikan! Email belum terdaftar di database, namun kami telah memproses instruksi pengiriman ke kotak masuk Anda.');
        }
      } catch (err) {
        setError('Gagal memproses pemulihan kata sandi.');
      } finally {
        setIsLoading(false);
      }
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300 font-sans">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

      {/* Utilities header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <button 
          onClick={() => onNavigate('login')}
          id="forgot-back-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Login
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
                const fallback = document.getElementById('forgot-logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'block';
                const fallback = document.getElementById('forgot-logo-fallback');
                if (fallback) fallback.style.display = 'none';
              }}
            />
            <div
              id="forgot-logo-fallback"
              style={{ display: 'none' }}
              className="items-center justify-center p-2.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 rounded-xl text-white shadow-md"
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-1">
            <h2 className="text-base font-medium tracking-wider text-slate-900 dark:text-white">
              Lupa Password?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Kami akan mengirimkan link instruksi pemulihan akun Litensi Kids ke email Anda
            </p>
          </div>
        </div>

        {/* Alerts */}
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
            className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex flex-col gap-2"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          </motion.div>
        )}

        {/* Recovered Password Alert for Dev convenience */}
        {recoveredPassword && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1"
          >
            <span className="font-bold block">🔐 Password yang Ditemukan (Khusus Demo):</span>
            <p className="font-mono text-sm tracking-wide bg-white/70 dark:bg-black/30 p-2 rounded border border-amber-100 dark:border-amber-900/10">
              {recoveredPassword}
            </p>
            <p className="text-[10px] text-slate-500">Anda dapat menggunakan password di atas untuk langsung masuk di halaman Login.</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Alamat Email Terdaftar
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@perusahaan.com"
                id="forgot-email-input"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            id="forgot-submit-btn"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Kirim Instruksi Reset'
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-slate-500 dark:text-slate-400">
          Ingat kata sandi Anda?{' '}
          <button 
            onClick={() => onNavigate('login')}
            id="forgot-to-login"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
          >
            Masuk Kembali
          </button>
        </div>
      </motion.div>
    </div>
  );
};
