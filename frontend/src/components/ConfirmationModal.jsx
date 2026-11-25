import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmationModal({ 
  isOpen, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmLabel = "Delete", 
  confirmVariant = "danger",
  onConfirm, 
  onCancel,
  isLoading = false 
}) {
  if (!isOpen) return null;

  const confirmBtnClasses = confirmVariant === "danger"
    ? "bg-rose-600 hover:bg-rose-700 text-white"
    : "bg-emerald-600 hover:bg-emerald-700 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 transition-colors"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer ${confirmBtnClasses}`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Deleting...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
