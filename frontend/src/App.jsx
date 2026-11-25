import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Leaf } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/authContextValue';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import GeneratorPage from './pages/GeneratorPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import ExplorePage from './pages/ExplorePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';

const INITIAL_FORM_DATA = {
  campaign_title: '',
  description: '',
  category: 'Water Conservation',
  image_style: 'Realistic Photography',
  target_audience: 'General Public',
  aspect_ratio: '1:1',
  preset: 'fast',
  additional_instructions: '',
  custom_prompt: '',
  seed: '',
  custom_negative_prompt: ''
};

const PAGE_TO_PATH = {
  landing: '/',
  dashboard: '/dashboard',
  generator: '/generator',
  result: '/result',
  history: '/history',
  explore: '/explore',
  profile: '/profile',
  login: '/login',
  signup: '/signup',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  'verify-email': '/verify-email',
};

const PROTECTED_PAGES = new Set([
  'dashboard',
  'generator',
  'result',
  'history',
  'explore',
  'profile',
]);

const AUTH_GUEST_ONLY_PAGES = new Set([
  'login',
  'signup',
  'forgot-password',
]);

function getPageFromPathname(pathname = window.location.pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const match = Object.entries(PAGE_TO_PATH).find(([, path]) => path === clean);
  return match ? match[0] : 'landing';
}

function AppContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activePage, setActivePageState] = useState(() => getPageFromPathname());
  const [intendedPage, setIntendedPage] = useState(() =>
    PROTECTED_PAGES.has(getPageFromPathname()) ? getPageFromPathname() : 'dashboard'
  );
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [generatedData, setGeneratedData] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch { }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const navigateTo = useCallback((pageId, explicitUrlPath = null) => {
    const targetPath = explicitUrlPath || PAGE_TO_PATH[pageId] || '/';
    if (window.location.pathname + window.location.search !== targetPath) {
      window.history.pushState({ pageId }, '', targetPath);
    }
    setActivePageState(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Route guard synced with setActivePage prop for child components
  const setActivePage = useCallback(
    (pageId) => {
      if (!authLoading && PROTECTED_PAGES.has(pageId) && !isAuthenticated) {
        setIntendedPage(pageId);
        showToast('Please sign in to access your AI campaign workspace.', 'info');
        navigateTo('login');
        return;
      }
      if (!authLoading && AUTH_GUEST_ONLY_PAGES.has(pageId) && isAuthenticated) {
        navigateTo('dashboard');
        return;
      }
      navigateTo(pageId);
    },
    [authLoading, isAuthenticated, navigateTo, showToast]
  );

  // Derive guarded page cleanly without triggering cascading setState inside useEffect
  const effectivePage = useMemo(() => {
    if (authLoading) return activePage;
    if (PROTECTED_PAGES.has(activePage) && !isAuthenticated) return 'login';
    if (AUTH_GUEST_ONLY_PAGES.has(activePage) && isAuthenticated) return 'dashboard';
    return activePage;
  }, [authLoading, activePage, isAuthenticated]);

  const redirectTarget = PROTECTED_PAGES.has(activePage) ? activePage : intendedPage;

  // Browser back/forward button listener
  useEffect(() => {
    const handlePopState = () => {
      setActivePageState(getPageFromPathname());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize URL bar with derived effectivePage
  useEffect(() => {
    if (authLoading) return;
    const expectedPath = PAGE_TO_PATH[effectivePage] || '/';
    if (effectivePage !== activePage && window.location.pathname !== expectedPath) {
      window.history.replaceState({ pageId: effectivePage }, '', expectedPath);
    }
  }, [authLoading, activePage, effectivePage]);

  const handleSelectExample = (example) => {
    setFormData({
      campaign_title: example.title,
      description: example.description,
      category: example.category,
      image_style: example.image_style,
      target_audience: example.target_audience,
      aspect_ratio: example.aspect_ratio || '1:1',
      preset: 'fast',
      additional_instructions: example.additional_instructions || '',
      custom_prompt: '',
      seed: '',
      custom_negative_prompt: ''
    });
    if (!isAuthenticated) {
      setIntendedPage('generator');
      showToast('Sign in to generate with this campaign template.', 'info');
      navigateTo('login');
      return;
    }
    navigateTo('generator');
    showToast(`Template "${example.title}" loaded into generator!`, 'info');
  };

  const handleSelectForRegenerate = (historyItem) => {
    setFormData({
      campaign_title: historyItem.campaign_title,
      description: historyItem.description,
      category: historyItem.category,
      image_style: historyItem.image_style,
      target_audience: historyItem.target_audience,
      aspect_ratio: historyItem.aspect_ratio || '1:1',
      preset: 'fast',
      additional_instructions: '',
      custom_prompt: '',
      seed: historyItem.seed || '',
      custom_negative_prompt: ''
    });
    navigateTo('generator');
    showToast(`Loaded "${historyItem.campaign_title}" for customization.`, 'info');
  };

  const handleGenerationSuccess = (resultData) => {
    setGeneratedData(resultData);
    navigateTo('result');
  };

  const handleEditPrompt = () => {
    navigateTo('generator');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
          <Leaf className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Restoring your secure session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Navigation Header */}
      <Navbar
        activePage={effectivePage}
        setActivePage={setActivePage}
        navigateTo={navigateTo}
        theme={theme}
        toggleTheme={toggleTheme}
        showToast={showToast}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {effectivePage === 'landing' && (
          <LandingPage
            setActivePage={setActivePage}
            onSelectExample={handleSelectExample}
          />
        )}

        {effectivePage === 'login' && !isAuthenticated && (
          <LoginPage
            navigateTo={navigateTo}
            showToast={showToast}
            redirectAfterLogin={redirectTarget}
          />
        )}

        {effectivePage === 'signup' && !isAuthenticated && (
          <SignUpPage
            navigateTo={navigateTo}
            showToast={showToast}
          />
        )}

        {effectivePage === 'forgot-password' && !isAuthenticated && (
          <ForgotPasswordPage
            navigateTo={navigateTo}
            showToast={showToast}
          />
        )}

        {effectivePage === 'reset-password' && (
          <ResetPasswordPage
            navigateTo={navigateTo}
            showToast={showToast}
          />
        )}

        {effectivePage === 'verify-email' && (
          <VerifyEmailPage
            navigateTo={navigateTo}
            showToast={showToast}
          />
        )}

        {effectivePage === 'dashboard' && isAuthenticated && (
          <DashboardPage
            setActivePage={setActivePage}
            onSelectForRegenerate={handleSelectForRegenerate}
          />
        )}

        {effectivePage === 'generator' && isAuthenticated && (
          <GeneratorPage
            formData={formData}
            setFormData={setFormData}
            onGenerationSuccess={handleGenerationSuccess}
            showToast={showToast}
          />
        )}

        {effectivePage === 'result' && isAuthenticated && (
          <ResultPage
            generatedData={generatedData}
            setGeneratedData={setGeneratedData}
            onEditPrompt={handleEditPrompt}
            showToast={showToast}
          />
        )}

        {effectivePage === 'history' && isAuthenticated && (
          <HistoryPage
            setActivePage={setActivePage}
            onSelectForRegenerate={handleSelectForRegenerate}
            showToast={showToast}
          />
        )}

        {effectivePage === 'explore' && isAuthenticated && (
          <ExplorePage
            onSelectExample={handleSelectExample}
          />
        )}

        {effectivePage === 'profile' && isAuthenticated && (
          <ProfilePage
            navigateTo={navigateTo}
            showToast={showToast}
          />
        )}
      </main>

      {/* Global Toast Alert */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />

      {/* Footer */}
      <Footer setActivePage={setActivePage} />
    </div>
  );
}

export default function App() {
  const handleAuthEvent = useCallback((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      window.history.pushState({ pageId: 'reset-password' }, '', '/reset-password');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  return (
    <AuthProvider onAuthEvent={handleAuthEvent}>
      <AppContent />
    </AuthProvider>
  );
}
