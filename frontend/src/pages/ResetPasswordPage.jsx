import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/authContextValue';
import { validatePassword, getPasswordRules } from '../utils/authValidation';
import { PasswordChecklist } from '../components/AuthShared';
import { MagneticButton } from '../components/MotionPrimitives';

export default function ResetPasswordPage({ navigateTo, showToast }) {
  const { resetPassword, isSupabaseConfigured } = useAuth();

  const searchParams = new URLSearchParams(window.location.search);
  const urlToken = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const passwordRules = getPasswordRules(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const errors = {};
    if (!isSupabaseConfigured && !urlToken) {
      setFormError('Invalid or missing password reset token. Please request a new reset link.');
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;

    if (password !== confirmPassword) {
      errors.confirm_password = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await resetPassword({ token: urlToken, password, confirmPassword });
      setResetComplete(true);
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setFormError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md studio-card rounded-3xl shadow-2xl p-8 text-center space-y-6 animate-modal">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Password Updated!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your new password is active. You can now sign in with your updated credentials.
            </p>
          </div>
          <MagneticButton
            onClick={() => navigateTo('login')}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/25 cursor-pointer"
          >
            <span>Continue to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </MagneticButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md studio-card rounded-3xl shadow-2xl p-8 space-y-6 animate-in">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-500 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create new password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose a strong password for your Green Campaign AI account.
          </p>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="reset-password"
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                }}
                placeholder="Enter new password"
                className={`studio-input w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                  fieldErrors.password ? 'border-rose-400' : 'border-slate-900/12 dark:border-white/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-rose-500 font-medium">{fieldErrors.password}</p>
            )}

            <PasswordChecklist rules={passwordRules} columns={1} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reset-confirm-password"
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirm_password) setFieldErrors((p) => ({ ...p, confirm_password: '' }));
                }}
                placeholder="Re-enter new password"
                className={`studio-input w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                  fieldErrors.confirm_password ? 'border-rose-400' : 'border-slate-900/12 dark:border-white/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirm_password && (
              <p className="text-xs text-rose-500 font-medium">{fieldErrors.confirm_password}</p>
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </MagneticButton>
        </form>
      </div>
    </div>
  );
}
