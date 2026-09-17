import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotificationProps {
  /** The message text to display in the toast */
  message: string;
  /** Toast type variant: success (green), error (red), warning (amber), info (blue) */
  type?: ToastType;
  /** Optional custom title header */
  title?: string;
  /** Callback function invoked when the toast is closed or auto-dismissed */
  onClose?: () => void;
  /** Duration in milliseconds before auto-closing (default: 3500ms, set to 0 to disable auto-close) */
  duration?: number;
  /** Visibility toggle flag */
  isVisible?: boolean;
  /** Onscreen fixed positioning (default: 'top-center') */
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type = 'success',
  title,
  onClose,
  duration = 3500,
  isVisible = true,
  position = 'top-center',
  action
}) => {
  // Handle auto-dismiss timer
  useEffect(() => {
    if (isVisible && duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!message) return null;

  // Type styling configuration
  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
      container: 'bg-[#0f231c]/95 dark:bg-[#091a14]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/30',
      barBg: 'bg-emerald-500',
      defaultTitle: 'Berhasil'
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
      container: 'bg-[#291218]/95 dark:bg-[#1f0b10]/95 border-rose-500/40 text-rose-100 shadow-rose-950/30',
      barBg: 'bg-rose-500',
      defaultTitle: 'Gagal'
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
      container: 'bg-[#261d0f]/95 dark:bg-[#1c1508]/95 border-amber-500/40 text-amber-100 shadow-amber-950/30',
      barBg: 'bg-amber-500',
      defaultTitle: 'Peringatan'
    },
    info: {
      icon: <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />,
      container: 'bg-[#121c33]/95 dark:bg-[#0c1426]/95 border-indigo-500/40 text-indigo-100 shadow-indigo-950/30',
      barBg: 'bg-indigo-500',
      defaultTitle: 'Informasi'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const toastTitle = title || config.defaultTitle;

  // Position classes
  const positionClasses = {
    'top-right': 'top-5 right-5',
    'top-center': 'top-5 left-1/2 -translate-x-1/2',
    'top-left': 'top-5 left-5',
    'bottom-right': 'bottom-5 right-5',
    'bottom-center': 'bottom-5 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-5 left-5'
  };

  const isTop = position.startsWith('top');
  const initialY = isTop ? -25 : 25;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className={`fixed z-[99999] max-w-md w-full px-4 ${positionClasses[position]} pointer-events-none`}>
          <motion.div
            initial={{ opacity: 0, y: initialY, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: initialY, scale: 0.94 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 w-full p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl ${config.container}`}
          >
            {config.icon}

            <div className="flex-1 pr-2 text-left">
              {toastTitle && (
                <div className="text-xs font-medium tracking-wide mb-0.5 opacity-90">
                  {toastTitle}
                </div>
              )}
              <p className="text-xs sm:text-sm font-normal leading-relaxed">
                {message}
              </p>

              {action && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      action.onClick();
                      if (onClose) onClose();
                    }}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer"
                  >
                    {action.label}
                  </button>
                </div>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Optional Progress Bar for Auto Dismiss */}
            {duration > 0 && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-[2px] ${config.barBg} opacity-70`}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ToastNotification;
