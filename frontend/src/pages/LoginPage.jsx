import React, { useState } from 'react';
import {
  Leaf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/authContextValue';
import { validateEmail } from '../utils/authValidation';
import { GoogleIcon } from '../components/AuthShared';
import { MagneticButton } from '../components/MotionPrimitives';

export default function LoginPage({ navigateTo, showToast, redirectAfterLogin = 'dashboard' }) {
  const { signIn, signInWithGoogle, resendVerification } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [devVerifyLink, setDevVerifyLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setUnverifiedEmail('');
    setDevVerifyLink('');

    const errors = {};
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    if (!password) errors.password = 'Password is required.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await signIn({ email, password, rememberMe });
      showToast('Welcome back to Green Campaign AI!', 'success');
      navigateTo(redirectAfterLogin || 'dashboard');
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      if (err.requiresVerification) {
        setUnverifiedEmail(err.email || email);
      }
      setFormError(err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      const res = await resendVerification(unverifiedEmail);
      if (res.devVerificationUrl) {
        setDevVerifyLink(res.devVerificationUrl);
      }
      showToast('Verification email dispatched!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to resend verification email.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFormError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError(err.message);
      showToast(err.message, err.isConfigNotice ? 'info' : 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[300px] bg-gradient-to-tr from-emerald-500/15 to-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10"
      />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 studio-card rounded-3xl shadow-2xl overflow-hidden animate-in">
        {/* Left Brand Panel */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 bg-gradient-to-br from-[#071f17] via-[#0a1411] to-[#050807] text-white relative overflow-hidden border-r border-white/[0.08]">
          <div className="space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg border border-emerald-400/20">
                <Leaf className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">Green Campaign AI</span>
            </div>

            <div className="space-y-3 pt-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-[11px] font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>FLUX.1 Dev Studio</span>
              </div>
              <h2 className="font-display text-2xl font-bold leading-snug">
                Sign in to craft high-impact sustainability visuals.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Access your environmental campaign studio, generate photorealistic FLUX.1 Dev visuals,
                and curate your saved gallery.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300 relative z-10 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Signed JWT Sessions &amp; Verified Accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Persistent Campaign Studio &amp; PNG Exports</span>
            </div>
          </div>
          <div className="absolute -right-14 -bottom-14 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in with your Green Campaign AI credentials to continue.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs sm:text-sm space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{formError}</span>
              </div>
              {unverifiedEmail && (
                <div className="pl-6 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{isResending ? 'Sending...' : 'Resend Verification Email'}</span>
                  </button>
                  {devVerifyLink && (
                    <button
                      type="button"
                      onClick={() => navigateTo('verify-email', devVerifyLink)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      <span>Dev Mode: Verify Email Now</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                  }}
                  placeholder="you@utilitycompany.com"
                  className={`studio-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                    fieldErrors.email
                      ? 'border-rose-400'
                      : 'border-slate-900/12 dark:border-white/10'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigateTo('forgot-password')}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  placeholder="Enter your password"
                  className={`studio-input w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                    fieldErrors.password
                      ? 'border-rose-400'
                      : 'border-slate-900/12 dark:border-white/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <MagneticButton
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </MagneticButton>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-900/10 dark:border-white/10" />
            <span className="shrink-0 mx-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Or continue with
            </span>
            <div className="flex-grow border-t border-slate-900/10 dark:border-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.08] border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            <span>Sign in with Google</span>
          </button>

          <p className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 pt-1">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => navigateTo('signup')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
