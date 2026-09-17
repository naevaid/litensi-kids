import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, title?: string) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, duration?: number, title?: string) => void;
    error: (message: string, duration?: number, title?: string) => void;
    warning: (message: string, duration?: number, title?: string) => void;
    info: (message: string, duration?: number, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = 3500,
    title?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { id, message, type, duration, title };

    setToasts(prev => {
      // Keep up to 3 active toasts at once to prevent clutter
      const filtered = prev.slice(-2);
      return [...filtered, newToast];
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg: string, dur?: number, ttl?: string) => showToast(msg, 'success', dur, ttl),
    error: (msg: string, dur?: number, ttl?: string) => showToast(msg, 'error', dur, ttl),
    warning: (msg: string, dur?: number, ttl?: string) => showToast(msg, 'warning', dur, ttl),
    info: (msg: string, dur?: number, ttl?: string) => showToast(msg, 'info', dur, ttl)
  };

  const getVariantStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          container: 'bg-[#0f231c]/95 dark:bg-[#091a14]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40',
          accent: 'bg-emerald-500',
          title: 'Berhasil'
        };
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
          container: 'bg-[#291218]/95 dark:bg-[#1f0b10]/95 border-rose-500/40 text-rose-100 shadow-rose-950/40',
          accent: 'bg-rose-500',
          title: 'Gagal'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          container: 'bg-[#261d0f]/95 dark:bg-[#1c1508]/95 border-amber-500/40 text-amber-100 shadow-amber-950/40',
          accent: 'bg-amber-500',
          title: 'Peringatan'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-4 h-4 text-indigo-400 shrink-0" />,
          container: 'bg-[#121c33]/95 dark:bg-[#0c1426]/95 border-indigo-500/40 text-indigo-100 shadow-indigo-950/40',
          accent: 'bg-indigo-500',
          title: 'Informasi'
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toast }}>
      {children}

      {/* Centralized Animated Toast Container - Positioned Top Center */}
      <div
        id="litensi-toast-portal"
        aria-live="polite"
        className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4"
      >
        <AnimatePresence mode="sync">
          {toasts.map(item => {
            const styles = getVariantStyles(item.type);
            const displayTitle = item.title || styles.title;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -25, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.94 }}
                transition={{
                  duration: 0.28,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 w-full p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl ${styles.container}`}
              >
                {/* Visual Icon */}
                <div className="pt-0.5">{styles.icon}</div>

                {/* Content Message */}
                <div className="flex-1 min-w-0 pr-1 text-left">
                  {displayTitle && (
                    <div className="text-xs font-medium tracking-wide mb-0.5 opacity-90">
                      {displayTitle}
                    </div>
                  )}
                  <p className="text-xs sm:text-sm font-normal leading-relaxed break-words">
                    {item.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Progress bar auto dismiss timer */}
                {item.duration && item.duration > 0 && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: item.duration / 1000, ease: 'linear' }}
                    className={`absolute bottom-0 left-0 h-[2px] ${styles.accent} opacity-70`}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
