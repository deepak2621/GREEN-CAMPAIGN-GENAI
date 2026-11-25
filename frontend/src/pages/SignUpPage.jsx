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
  Check,
  Loader2,
  MailCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, getPasswordRules } from '../utils/authValidation';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

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

  // Post-signup verification pending state
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
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 sm:p-10 text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <MailCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Verify your email address
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We&apos;ve prepared a verification link for{' '}
              <span className="font-bold text-slate-900 dark:text-white">{verificationState.email}</span>.
              Verify your email to unlock your Green Campaign AI studio.
            </p>
          </div>

          {verificationState.devVerificationUrl && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-left space-y-2.5">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Local Development Verification Ready
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                SMTP mail delivery is not configured locally. Click below to verify your email immediately:
              </p>
              <button
                type="button"
                onClick={() => navigateTo('verify-email', verificationState.devVerificationUrl)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
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
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
            >
              {resending ? 'Resending...' : 'Resend Verification Link'}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 cursor-pointer"
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-gradient-to-tr from-emerald-300/25 to-teal-200/15 dark:from-emerald-900/20 dark:to-teal-900/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in duration-200">
        {/* Left Brand Panel */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white relative overflow-hidden">
          <div className="space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg">
                <Leaf className="w-5 h-5 stroke-[2.3]" />
              </div>
              <span className="font-bold text-lg tracking-tight">Green Campaign AI</span>
            </div>

            <div className="space-y-3 pt-4">
              <h2 className="text-2xl font-extrabold leading-snug">
                Launch sustainability campaigns in seconds.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Create your utility educator account to generate custom Water, Energy, Renewable, and Waste Management visuals powered by FLUX.2 Klein 4B.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300 relative z-10 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>7 Dedicated Sustainability Categories</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Private Campaign History &amp; PNG Exports</span>
            </div>
          </div>
        </div>

        {/* Right Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Start building educational sustainability campaigns with AI.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="signup-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
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
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.full_name
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {fieldErrors.full_name && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fieldErrors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
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
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.email
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="signup-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
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
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
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
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fieldErrors.password}</p>
              )}

              {/* Password Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5">
                {passwordRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${
                      rule.met
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 shrink-0 ${rule.met ? 'opacity-100' : 'opacity-40'}`} />
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="signup-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
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
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.confirm_password
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
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
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fieldErrors.confirm_password}</p>
              )}
            </div>

            {/* Terms & Conditions */}
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
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Terms of Service</span>{' '}
                  and{' '}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Privacy Policy</span>{' '}
                  for Green Campaign AI.
                </span>
              </label>
              {fieldErrors.terms_accepted && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fieldErrors.terms_accepted}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="shrink-0 mx-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Or sign up with
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
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
