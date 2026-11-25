import React, { useState } from 'react';
import {
  Leaf,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MailCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/authContextValue';
import { validateEmail, validatePassword, getPasswordRules } from '../utils/authValidation';
import { GoogleIcon, PasswordChecklist } from '../components/AuthShared';
import { MagneticButton } from '../components/MotionPrimitives';

export default function SignUpPage({ navigateTo, showToast }) {
  const { signUp, signInWithGoogle, resendVerification } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [verificationState, setVerificationState] = useState(null);
  const [resending, setResending] = useState(false);

  const passwordRules = getPasswordRules(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const errors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters.';
    }
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;

    if (password !== confirmPassword) {
      errors.confirm_password = 'Passwords do not match.';
    }
    if (!termsAccepted) {
      errors.terms_accepted = 'Please accept the Terms and Conditions to continue.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await signUp({
        fullName,
        email,
        password,
        confirmPassword,
        termsAccepted,
      });

      if (res.requiresVerification) {
        setVerificationState({
          email: email.trim().toLowerCase(),
          devVerificationUrl: res.devVerificationUrl || '',
          emailSent: res.emailSent,
        });
        showToast('Account created! Please verify your email address.', 'success');
      } else {
        showToast('Account created and signed in!', 'success');
        navigateTo('dashboard');
      }
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setFormError(err.message || 'Unable to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!verificationState?.email) return;
    setResending(true);
    try {
      const res = await resendVerification(verificationState.email);
      if (res.devVerificationUrl) {
        setVerificationState((prev) => ({ ...prev, devVerificationUrl: res.devVerificationUrl }));
      }
      showToast('Verification link resent!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to resend verification email.', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignUp = async () => {
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

  if (verificationState) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg studio-card rounded-3xl shadow-2xl p-8 sm:p-10 text-center space-y-6 animate-modal">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-500 flex items-center justify-center mx-auto">
            <MailCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Verify your email address
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We&apos;ve prepared a verification link for{' '}
              <span className="font-bold text-slate-900 dark:text-white">{verificationState.email}</span>.
              Verify your email to unlock your Green Campaign AI studio.
            </p>
          </div>

          {verificationState.devVerificationUrl && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left space-y-2.5">
              <p className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Local Development Verification Ready
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                SMTP mail delivery is not configured locally. Click below to verify your email immediately:
              </p>
              <button
                type="button"
                onClick={() => navigateTo('verify-email', verificationState.devVerificationUrl)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Email &amp; Activate Account</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-900/12 dark:border-white/12 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] cursor-pointer disabled:opacity-60"
            >
              {resending ? 'Resending...' : 'Resend Verification Link'}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold hover:opacity-90 cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
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
              <h2 className="font-display text-2xl font-bold leading-snug">
                Turn sustainability ideas into visual stories.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Create your studio account to generate custom Water, Energy, Renewable, and Climate
                visuals powered locally by FLUX.1 Dev.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300 relative z-10 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>7 Dedicated Sustainability Sectors</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Private Campaign Gallery &amp; PNG Exports</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Start building educational sustainability campaigns with AI.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="signup-name"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.full_name) setFieldErrors((p) => ({ ...p, full_name: '' }));
                  }}
                  placeholder="Alex Rivera"
                  className={`studio-input w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                    fieldErrors.full_name
                      ? 'border-rose-400'
                      : 'border-slate-900/12 dark:border-white/10'
                  }`}
                />
              </div>
              {fieldErrors.full_name && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.full_name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="signup-email"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                  }}
                  placeholder="alex@greenutility.org"
                  className={`studio-input w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
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

            <div className="space-y-1">
              <label
                htmlFor="signup-password"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  placeholder="Create a strong password"
                  className={`studio-input w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                    fieldErrors.password
                      ? 'border-rose-400'
                      : 'border-slate-900/12 dark:border-white/10'
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

              <PasswordChecklist rules={passwordRules} columns={2} />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="signup-confirm-password"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm_password) setFieldErrors((p) => ({ ...p, confirm_password: '' }));
                  }}
                  placeholder="Re-enter your password"
                  className={`studio-input w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] border text-sm text-slate-900 dark:text-white placeholder-slate-400 ${
                    fieldErrors.confirm_password
                      ? 'border-rose-400'
                      : 'border-slate-900/12 dark:border-white/10'
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

            <div className="space-y-1">
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  id="signup-terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (fieldErrors.terms_accepted) setFieldErrors((p) => ({ ...p, terms_accepted: '' }));
                  }}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>
                  I agree to the{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Terms of Service</span>{' '}
                  and{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Privacy Policy</span>{' '}
                  for Green Campaign AI.
                </span>
              </label>
              {fieldErrors.terms_accepted && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.terms_accepted}</p>
              )}
            </div>

            <MagneticButton
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </MagneticButton>
          </form>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-900/10 dark:border-white/10" />
            <span className="shrink-0 mx-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Or sign up with
            </span>
            <div className="flex-grow border-t border-slate-900/10 dark:border-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.04] hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.08] border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
