import React, { useState, useEffect, useRef } from 'react';
import {
  Leaf,
  Sparkles,
  LayoutDashboard,
  Compass,
  History,
  Menu,
  X,
  Sun,
  Moon,
  User,
  LogOut,
  LogIn,
  UserPlus,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { checkHealth } from '../services/api';
import { useAuth } from '../context/authContextValue';

export default function Navbar({
  activePage,
  setActivePage,
  navigateTo,
  theme,
  toggleTheme,
  showToast,
}) {
  const { user, isAuthenticated, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState({
    status: 'checking',
    provider_ready: true,
    model: 'FLUX.1 Dev (Q4_K_S GGUF)',
    model_status: 'Checking',
  });
  const menuRef = useRef(null);

  useEffect(() => {
    checkHealth().then((data) => {
      setHealthStatus(data);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'landing', label: 'Home', icon: Leaf },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'generator', label: 'Studio', icon: Sparkles },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'history', label: 'Gallery', icon: History },
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    if (showToast) showToast('Signed out successfully.', 'info');
    if (navigateTo) {
      navigateTo('login');
    } else {
      setActivePage('login');
    }
  };

  const userInitials = user
    ? (user.full_name || user.email || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const modelReady = healthStatus.provider_ready !== false && healthStatus.status !== 'offline';

  return (
    <header className="sticky top-0 z-40 studio-surface-glass border-b border-slate-900/10 dark:border-white/[0.08] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-[72px]">
          {/* Premium Brand Logo */}
          <button
            type="button"
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-3 cursor-pointer group text-left shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-950/25 border border-emerald-300/30 group-hover:scale-105 transition-transform duration-200">
              <Leaf className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Green Campaign
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-500/25">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Environmental Visual Studio
              </p>
            </div>
          </button>

          {/* Desktop Navigation Rail */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-1 bg-slate-900/[0.04] dark:bg-white/[0.04] p-1 rounded-2xl border border-slate-900/[0.07] dark:border-white/[0.07]"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive
                      ? 'bg-white dark:bg-[#131c18] text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-900/[0.06] dark:border-emerald-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Status Badge + Auth/Profile + Mobile Drawer + Top-Right Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Engine indicator */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  modelReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>FLUX.1 Dev</span>
              <span className="text-emerald-600/70 dark:text-emerald-400/70">•</span>
              <span>{healthStatus.model_status || (modelReady ? 'Ready' : 'Offline')}</span>
            </div>

            {/* Auth Actions / Account Menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-label="Open account menu"
                  className="flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1.5 rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.05] hover:bg-slate-900/[0.08] dark:hover:bg-white/[0.09] border border-slate-900/[0.08] dark:border-white/[0.09] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white text-xs font-bold flex items-center justify-center">
                      {userInitials}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[110px] truncate">
                    {user.full_name}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
                      accountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-white dark:bg-[#0f1613] border border-slate-900/10 dark:border-white/10 shadow-2xl py-2 z-50 animate-modal">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.07] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {user.full_name}
                        </p>
                        {user.email_verified && (
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Verified" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleNavClick('dashboard')}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Campaign Dashboard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNavClick('profile')}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Profile &amp; Settings</span>
                      </button>
                    </div>

                    <div className="pt-1 mt-1 border-t border-slate-100 dark:border-white/[0.07] px-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('login')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] border border-slate-900/10 dark:border-white/10 transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('signup')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-950/20 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] rounded-xl lg:hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Dark / Light Mode Toggle pinned to the TOP-RIGHT CORNER on both desktop & mobile */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-amber-300 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 border border-slate-900/10 dark:border-white/10 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
            >
              <Sun
                className={`w-[17px] h-[17px] text-amber-400 transition-all duration-300 absolute ${
                  theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`}
              />
              <Moon
                className={`w-[17px] h-[17px] text-slate-700 transition-all duration-300 absolute ${
                  theme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-900/10 dark:border-white/[0.08] bg-white/95 dark:bg-[#0b100e]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 animate-modal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                {item.label}
              </button>
            );
          })}

          {isAuthenticated && user ? (
            <div className="pt-2 border-t border-slate-900/10 dark:border-white/[0.08] space-y-1.5">
              <div className="px-4 py-2 text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{user.full_name}</p>
                <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
              >
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Profile &amp; Settings</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-900/10 dark:border-white/[0.08] grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="py-2.5 px-4 rounded-xl border border-slate-900/15 dark:border-white/15 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('signup')}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-900/10 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
            <span>Diffusion Engine</span>
            <span className="flex items-center gap-1.5 font-mono font-medium text-emerald-700 dark:text-emerald-400">
              <span className={`w-2 h-2 rounded-full ${modelReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {healthStatus.model || 'FLUX.1 Dev (Q4_K_S GGUF)'}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
