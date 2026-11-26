import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  History,
  ArrowRight,
  Compass,
  Cpu,
  ShieldCheck,
  User
} from 'lucide-react';
import { fetchHistory, checkHealth } from '../services/api';
import { useAuth } from '../context/authContextValue';

const CATEGORIES = [
  "Water Conservation",
  "Energy Conservation",
  "Renewable Energy",
  "Climate Awareness",
  "Waste Management",
  "Pollution Control",
  "Sustainable Living"
];

export default function DashboardPage({ setActivePage, onSelectForRegenerate }) {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState([]);
  const [healthStatus, setHealthStatus] = useState({ provider: 'diffusion', status: 'healthy' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchHistory(), checkHealth()]).then(([histRes, healthRes]) => {
      if (isMounted) {
        setHistoryItems(histRes.data || []);
        setHealthStatus(healthRes);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  // Compute category distribution
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = historyItems.filter(item => item.category === cat).length;
    return acc;
  }, {});

  const totalCampaigns = historyItems.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in duration-200">

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 p-8 sm:p-12 text-white border border-emerald-800/40 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Campaign Operations Center</span>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => setActivePage('profile')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{user.full_name}</span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="hidden sm:inline text-slate-300">{user.email}</span>
              </button>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {user ? `Welcome, ${user.full_name.split(' ')[0]}` : 'Sustainability Visuals Dashboard'}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Monitor public education campaigns, oversee generated educational visuals, and deploy high-impact
            environmental messaging across your utility service area.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Generator</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => { setActivePage('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-sm border border-white/15 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Browse 8 Templates</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Saved Visuals</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? '...' : totalCampaigns}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Active Categories</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">7 Sectors</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">AI Model</span>
            <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {healthStatus.model || 'FLUX.2 Klein 4B Q4'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Output Standards</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">1024 PNG</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Category Overview + Recent Generations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Recent Campaign Visuals */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Campaign Visuals</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Archived generations stored in local SQLite database</p>
            </div>

            <button
              onClick={() => { setActivePage('history'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Loading campaign records...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 transition-colors">
              <History className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Campaigns Generated Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Generate your first sustainability visual to see it showcased here and archived in your history.
              </p>
              <button
                onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Campaign Visual</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {historyItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                    {item.image_exists !== false ? (
                      <img
                        src={item.image_url}
                        alt={item.campaign_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-xs text-slate-500">Image file archived</div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-emerald-400 rounded-full border border-white/10">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.campaign_title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{item.image_style}</span>
                      <button
                        onClick={() => onSelectForRegenerate(item)}
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Remix Visual →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Category Distribution & Coverage */}
        <div className="lg:col-span-4 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sector Distribution</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Coverage across utility sustainability focus areas</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const percent = totalCampaigns > 0 ? Math.round((count / totalCampaigns) * 100) : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                    <span className="text-slate-400 dark:text-slate-500">{count} visuals ({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 dark:bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${percent > 0 ? percent : 4}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800/40"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Create Visual for Any Sector</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
