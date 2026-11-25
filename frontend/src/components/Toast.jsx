import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: 'bg-emerald-900/90 border-emerald-500 text-white shadow-emerald-950/20',
    error: 'bg-rose-900/90 border-rose-500 text-white shadow-rose-950/20',
    warning: 'bg-amber-900/90 border-amber-500 text-white shadow-amber-950/20',
    info: 'bg-slate-900/90 border-slate-700 text-white shadow-slate-950/20'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md ${styles[type] || styles.info}`}>
        {icons[type] || icons.info}
        <div className="flex-1 text-sm font-medium leading-snug">
          {message}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
