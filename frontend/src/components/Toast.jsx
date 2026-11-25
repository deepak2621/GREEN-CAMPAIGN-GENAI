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
    success: 'bg-emerald-950/95 border-emerald-500/40 text-emerald-50 shadow-emerald-950/30',
    error: 'bg-rose-950/95 border-rose-500/40 text-rose-50 shadow-rose-950/30',
    warning: 'bg-amber-950/95 border-amber-500/40 text-amber-50 shadow-amber-950/30',
    info: 'bg-[#0e1512]/95 border-white/15 text-slate-100 shadow-black/40',
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-emerald-400 shrink-0" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-modal">
      <div
        role="status"
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl ${
          styles[type] || styles.info
        }`}
      >
        {icons[type] || icons.info}
        <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">{message}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
