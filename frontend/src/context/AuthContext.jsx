import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextValue';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  setApiAuthToken,
  apiAuthRegister,
  apiAuthLogin,
  apiAuthVerifyEmail,
  apiAuthResendVerification,
  apiAuthForgotPassword,
  apiAuthResetPassword,
  apiAuthGetMe,
  apiAuthUpdateProfile,
} from '../services/api';

const TOKEN_STORAGE_KEY = 'gc_access_token';

function persistToken(token, rememberMe = true) {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (!token) return;
    if (rememberMe) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // ignore storage quota errors
  }
  setApiAuthToken(token);
}

function readStoredToken() {
  try {
    return (
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

export function AuthProvider({ children, onAuthEvent }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authMode = isSupabaseConfigured ? 'supabase' : 'local';

  const mapSupabaseUser = useCallback(async (sbUser) => {
    if (!sbUser) return null;
    let profileData = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .single();
      profileData = data;
    } catch {
      // fallback to auth user metadata if profiles query fails before trigger
    }

    const meta = sbUser.user_metadata || {};
    return {
      id: sbUser.id,
      email: sbUser.email,
      full_name:
        profileData?.full_name ||
        meta.full_name ||
        meta.name ||
        (sbUser.email ? sbUser.email.split('@')[0] : 'User'),
      avatar_url: profileData?.avatar_url || meta.avatar_url || meta.picture || '',
      email_verified: Boolean(sbUser.email_confirmed_at || sbUser.confirmed_at),
      auth_provider: sbUser.app_metadata?.provider || 'supabase',
      created_at: profileData?.created_at || sbUser.created_at,
      updated_at: profileData?.updated_at || sbUser.updated_at,
    };
  }, []);

  // Restore session on initial mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token && session?.user) {
            setApiAuthToken(session.access_token);
            const mapped = await mapSupabaseUser(session.user);
            if (mounted) setUser(mapped);
          } else {
            setApiAuthToken('');
            if (mounted) setUser(null);
          }
        } catch {
          if (mounted) setUser(null);
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }

      // Local JWT Auth Session Restoration
      const storedToken = readStoredToken();
      if (!storedToken) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        setApiAuthToken(storedToken);
        const res = await apiAuthGetMe(storedToken);
        if (mounted && res?.data?.user) {
          setUser(res.data.user);
        } else if (mounted) {
          persistToken('');
          setUser(null);
        }
      } catch {
        persistToken('');
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth changes (login, logout, password recovery, email confirmation)
    let subscription = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (event === 'PASSWORD_RECOVERY') {
          if (session?.access_token) setApiAuthToken(session.access_token);
          if (onAuthEvent) onAuthEvent('PASSWORD_RECOVERY');
          return;
        }
        if (session?.access_token && session?.user) {
          setApiAuthToken(session.access_token);
          const mapped = await mapSupabaseUser(session.user);
          if (mounted) setUser(mapped);
        } else {
          setApiAuthToken('');
          if (mounted) setUser(null);
        }
      });
      subscription = data.subscription;
    }

    // Listen for global 401 unauthorized events from protected API calls
    const handleUnauthorized = () => {
      if (!isSupabaseConfigured) {
        persistToken('');
        setUser(null);
      }
    };
    window.addEventListener('gc-auth-unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('gc-auth-unauthorized', handleUnauthorized);
    };
  }, [mapSupabaseUser, onAuthEvent]);

  const signUp = async ({ fullName, email, password, confirmPassword, termsAccepted }) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });
      if (error) {
        throw new Error(error.message);
      }
      // Supabase returns empty identities if user already exists when email confirmation is enabled
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        const dupErr = new Error('An account with this email address already exists. Please sign in instead.');
        dupErr.errorType = 'DuplicateEmailError';
        throw dupErr;
      }
      return {
        user: data.user,
        requiresVerification: !data.session,
        emailSent: true,
      };
    }

    const res = await apiAuthRegister({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
      terms_accepted: termsAccepted,
    });
    return {
      user: res.data.user,
      requiresVerification: res.data.requires_verification,
      emailSent: res.data.email_sent,
      devVerificationUrl: res.data.dev_verification_url,
      verificationToken: res.data.verification_token,
    };
  };

  const signIn = async ({ email, password, rememberMe = true }) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data?.session?.access_token && data?.user) {
        setApiAuthToken(data.session.access_token);
        const mapped = await mapSupabaseUser(data.user);
        setUser(mapped);
        return mapped;
      }
      return null;
    }

    const res = await apiAuthLogin({
      email,
      password,
      remember_me: rememberMe,
    });
    const { access_token, user: loggedInUser } = res.data;
    persistToken(access_token, rememberMe);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw new Error(error.message);
      return;
    }

    const err = new Error(
      'Google Sign-In requires Supabase Auth configuration (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env).'
    );
    err.isConfigNotice = true;
    throw err;
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    persistToken('');
    setUser(null);
  };

  const forgotPassword = async (email) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      return { emailSent: true };
    }
    const res = await apiAuthForgotPassword(email);
    return {
      emailSent: res.data?.email_sent,
      devResetUrl: res.data?.dev_reset_url,
      resetToken: res.data?.reset_token,
    };
  };

  const resetPassword = async ({ token, password, confirmPassword }) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      return { success: true };
    }
    const res = await apiAuthResetPassword({
      token,
      password,
      confirm_password: confirmPassword,
    });
    return res;
  };

  const verifyEmail = async (token) => {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const mapped = await mapSupabaseUser(session.user);
        setUser(mapped);
        return { verified: true, user: mapped };
      }
      return { verified: true };
    }
    const res = await apiAuthVerifyEmail(token);
    return res;
  };

  const resendVerification = async (email) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) throw new Error(error.message);
      return { emailSent: true };
    }
    const res = await apiAuthResendVerification(email);
    return {
      emailSent: res.data?.email_sent,
      devVerificationUrl: res.data?.dev_verification_url,
    };
  };

  const updateProfile = async ({ full_name, avatar_url }) => {
    if (isSupabaseConfigured && supabase && user) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: full_name.trim(),
          avatar_url: avatar_url ?? user.avatar_url ?? '',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await supabase.auth.updateUser({
        data: { full_name: full_name.trim(), avatar_url: avatar_url ?? user.avatar_url ?? '' },
      });
      const updated = { ...user, ...data };
      setUser(updated);
      return updated;
    }

    const res = await apiAuthUpdateProfile({ full_name, avatar_url });
    const updatedUser = res.data.user;
    setUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    authMode,
    isSupabaseConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

