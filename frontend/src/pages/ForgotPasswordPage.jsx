import React, { useState } from 'react';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/authContextValue';
import { validateEmail } from '../utils/authValidation';

export default function ForgotPasswordPage({ navigateTo, showToast }) {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentResult, setSentResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const err = validateEmail(email);
    if (err) {
      setFieldError(err);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setSentResult({
        email: email.trim().toLowerCase(),
        devResetUrl: res.devResetUrl || '',
        emailSent: res.emailSent,
      });
      showToast('Password recovery instructions sent!', 'success');
    } catch (error) {
      setFormError(error.message || 'Could not process password reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6 animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter your registered email address and we&apos;ll send you a secure link to reset your password.
          </p>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {sentResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Reset Instructions Sent</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                If an account exists for <span className="font-semibold">{sentResult.email}</span>, a secure password reset link (valid for 1 hour) has been issued.
              </p>
            </div>

            {sentResult.devResetUrl && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Local Development Reset Link
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SMTP is disabled in local mode. Use this secure token link to complete your password reset:
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('reset-password', sentResult.devResetUrl)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <span>Open Password Reset Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Sign In</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError('');
                  }}
                  placeholder="you@utilitycompany.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldError
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {fieldError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fieldError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
