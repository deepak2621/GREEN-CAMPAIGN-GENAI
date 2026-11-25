import React, { useState, useEffect, useRef } from 'react';
import {
  Leaf,
  Sparkles,
  LayoutDashboard,
  Compass,
  History,
  Menu,
  X,
  Cpu,
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

  // Close account dropdown on outside click
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
    { id: 'generator', label: 'AI Generator', icon: Sparkles },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'history', label: 'History', icon: History },
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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-emerald-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-20">
          {/* Logo */}
          <button
            type="button"
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-3 cursor-pointer group text-left shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-200">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Green Campaign
                </span>
                <span className="px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200/50 dark:border-emerald-800/40">
                  AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Sustainability Education Visual Generator
              </p>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-colors">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs shadow-slate-200 dark:shadow-none'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right utilities: Model Badge + Account Menu + Mobile Menu + Top-Right Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Provider status badge */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 rounded-full text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  modelReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold">FLUX.1 Dev Q4</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 font-semibold text-emerald-800 dark:text-emerald-300">
                {healthStatus.model_status || (modelReady ? 'Ready' : 'Offline')}
              </span>
            </div>

            {/* Auth Actions / Account Menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-label="Open account menu"
                  className="flex items-center gap-2 pl-2 pr-2.5 sm:pr-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-xs font-bold flex items-center justify-center">
                      {userInitials}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[110px] truncate">
                    {user.full_name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
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
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Campaign Dashboard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNavClick('profile')}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Profile &amp; Settings</span>
                      </button>
                    </div>

                    <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 px-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('signup')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/25 transition-all cursor-pointer"
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
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl lg:hidden cursor-pointer"
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
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-amber-300 hover:text-emerald-600 dark:hover:text-amber-200 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
            >
              <Sun
                className={`w-[18px] h-[18px] text-amber-400 transition-all duration-300 absolute ${
                  theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`}
              />
              <Moon
                className={`w-[18px] h-[18px] text-slate-700 transition-all duration-300 absolute ${
                  theme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-2 transition-colors">
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
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                {item.label}
              </button>
            );
          })}

          {isAuthenticated && user ? (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="px-4 py-2 text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{user.full_name}</p>
                <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Profile &amp; Settings</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
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

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
            <span>AI Diffusion Engine</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
              <span className={`w-2 h-2 rounded-full ${modelReady ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {healthStatus.model || 'FLUX.1 Dev (Q4_K_S GGUF)'}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
