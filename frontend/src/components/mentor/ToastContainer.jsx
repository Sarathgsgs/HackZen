import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useMentor } from '../../context/MentorContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useMentor();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 ${
            toast.type === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-900 dark:bg-rose-950/90 dark:border-rose-900/50 dark:text-rose-200'
              : toast.type === 'info'
              ? 'bg-blue-50/95 border-blue-200 text-blue-900 dark:bg-blue-950/90 dark:border-blue-900/50 dark:text-blue-200'
              : 'bg-white/95 border-emerald-200 text-slate-800 dark:bg-navy-900/95 dark:border-emerald-500/30 dark:text-white'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : toast.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold leading-tight">{toast.title}</h4>
            {toast.message && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
