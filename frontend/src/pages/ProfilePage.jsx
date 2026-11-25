import React, { useState } from 'react';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  LogOut,
  Save,
  Loader2,
  CheckCircle2,
  Key,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage({ navigateTo, showToast }) {
  const { user, updateProfile, signOut, authMode } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const initials = (user.full_name || user.email || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ full_name: fullName, avatar_url: avatarUrl });
      showToast('Profile information updated!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    showToast('You have been signed out.', 'info');
    navigateTo('login');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Account &amp; Profile Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your Green Campaign AI identity, profile details, and active session.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer self-start sm:self-center"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-2xl font-extrabold flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {user.full_name}
            </h2>
            {user.email_verified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Email
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{user.email}</span>
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Auth Provider: <strong className="text-slate-700 dark:text-slate-200 uppercase">{authMode === 'supabase' ? 'Supabase Auth' : user.auth_provider || 'Local JWT'}</strong>
            </span>
            {user.created_at && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                Joined: <strong className="text-slate-700 dark:text-slate-200">{new Date(user.created_at).toLocaleDateString()}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Details</h3>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-600 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="profile-fullname" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Email Address (Read-only)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-avatar" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Avatar Image URL (Optional)
            </label>
            <input
              id="profile-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving Changes...' : 'Save Profile'}</span>
          </button>
        </form>

        {/* Account Security Metadata */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Security Metadata</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-slate-400 uppercase font-semibold text-[10px]">User UUID</span>
              <span className="font-mono text-slate-700 dark:text-slate-200 break-all">{user.id}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-slate-400 uppercase font-semibold text-[10px]">Session Protection</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Bearer JWT + Backend Verified
              </span>
            </div>
            {user.updated_at && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="block text-slate-400 uppercase font-semibold text-[10px]">Last Updated</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {new Date(user.updated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
