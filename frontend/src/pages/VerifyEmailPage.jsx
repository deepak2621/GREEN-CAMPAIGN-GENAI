import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/authContextValue';

export default function VerifyEmailPage({ navigateTo, showToast }) {
  const { verifyEmail, isSupabaseConfigured } = useAuth();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') || '';

    async function runVerification() {
      if (!isSupabaseConfigured && !token) {
        setStatus('error');
        setMessage('Missing verification token. Please use the link sent during registration.');
        return;
      }

      try {
        await verifyEmail(token);
        setStatus('success');
        setMessage('Your email address has been verified! You can now sign in and start creating sustainability visuals.');
        if (showToast) showToast('Email verified successfully!', 'success');
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Verification failed or link expired.');
      }
    }

    runVerification();
  }, [verifyEmail, isSupabaseConfigured, showToast]);

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md studio-card rounded-3xl shadow-2xl p-8 text-center space-y-6 animate-modal">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-500 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Verifying Email...
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Email Verified!
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/25 cursor-pointer"
            >
              <span>Sign In to Your Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/12 border border-rose-500/25 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Verification Issue
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="w-full py-3.5 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-sm cursor-pointer"
            >
              Return to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
