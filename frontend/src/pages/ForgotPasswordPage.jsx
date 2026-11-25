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
import { MagneticButton } from '../components/MotionPrimitives';

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
      <div className="w-full max-w-md studio-card rounded-3xl shadow-2xl p-8 space-y-6 animate-in">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-500 flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter your registered email address and we&apos;ll issue a secure link to reset your password.
          </p>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{formError}</span>
          </div>
        )}

        {sentResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Reset Instructions Sent</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                If an account exists for <span className="font-semibold">{sentResult.email}</span>, a secure password reset link (valid for 1 hour) has been issued.
              </p>
            </div>

            {sentResult.devResetUrl && (
              <div className="p-4 rounded-2xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/10 dark:border-white/10 space-y-2.5">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Local Development Reset Link
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SMTP is disabled in local mode. Use this secure link to complete your password reset:
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('reset-password', sentResult.devResetUrl)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  <span>Open Password Reset Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-900/12 dark:border-white/12 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Sign In</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="forgot-email"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
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
                  className={`studio-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                    fieldError ? 'border-rose-400' : 'border-slate-900/12 dark:border-white/10'
                  }`}
                />
              </div>
              {fieldError && (
                <p className="text-xs text-rose-500 font-medium">{fieldError}</p>
              )}
            </div>

            <MagneticButton
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/25 disabled:opacity-60 cursor-pointer"
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
            </MagneticButton>

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
