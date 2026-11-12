import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success: (message: string, duration = 3500) => {
    const item: ToastMessage = { id: Math.random().toString(36).slice(2), type: 'success', message, duration };
    listeners.forEach(fn => fn(item));
  },
  error: (message: string, duration = 4500) => {
    const item: ToastMessage = { id: Math.random().toString(36).slice(2), type: 'error', message, duration };
    listeners.forEach(fn => fn(item));
  },
  info: (message: string, duration = 3000) => {
    const item: ToastMessage = { id: Math.random().toString(36).slice(2), type: 'info', message, duration };
    listeners.forEach(fn => fn(item));
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (newToast: ToastMessage) => {
      setToasts(prev => [...prev.slice(-4), newToast]);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const remove = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, t.duration || 3500);
    return () => clearTimeout(timer);
  }, [t, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-500 shrink-0" />
  };

  const borderColors = {
    success: 'border-emerald-500/30 bg-[#FAF9F3]/95 dark:bg-slate-900/95 text-[#101C19] dark:text-slate-100 shadow-emerald-500/5',
    error: 'border-rose-500/30 bg-[#FAF9F3]/95 dark:bg-slate-900/95 text-[#101C19] dark:text-slate-100 shadow-rose-500/5',
    info: 'border-sky-500/30 bg-[#FAF9F3]/95 dark:bg-slate-900/95 text-[#101C19] dark:text-slate-100 shadow-sky-500/5'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md text-xs font-medium ${borderColors[t.type]}`}
    >
      <div className="flex items-center gap-2.5">
        {icons[t.type]}
        <span>{t.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
