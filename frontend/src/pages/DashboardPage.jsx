import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  History,
  ArrowRight,
  Compass,
  Cpu,
  ShieldCheck,
  User,
} from 'lucide-react';
import { fetchHistory, checkHealth } from '../services/api';
import { useAuth } from '../context/authContextValue';
import { CATEGORIES } from '../data/campaignOptions';
import SystemMonitorCard from '../components/SystemMonitorCard';
import { Reveal, SpotlightCard, MagneticButton, StudioImage } from '../components/MotionPrimitives';

export default function DashboardPage({ setActivePage, onSelectForRegenerate }) {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState([]);
  const [healthStatus, setHealthStatus] = useState({
    model: 'FLUX.1 Dev (Q4_K_S GGUF)',
    status: 'healthy',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchHistory(), checkHealth()])
      .then(([histRes, healthRes]) => {
        if (isMounted) {
          setHistoryItems(histRes.data || []);
          setHealthStatus(healthRes);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = historyItems.filter((item) => item.category === cat).length;
    return acc;
  }, {});

  const totalCampaigns = historyItems.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in">
      {/* Studio Operations Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071f17] via-[#0b1411] to-[#050807] p-8 sm:p-11 text-white border border-emerald-500/20 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Campaign Operations</span>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => setActivePage('profile')}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{user.full_name}</span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="hidden sm:inline text-slate-300">{user.email}</span>
              </button>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-tight">
            {user ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Sustainability Visuals Studio'}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Monitor campaign output, inspect GPU inference telemetry, and launch new FLUX.1 Dev
            sustainability visuals across your outreach channels.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <MagneticButton
              onClick={() => {
                setActivePage('generator');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-950/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4" />
            </MagneticButton>

            <button
              type="button"
              onClick={() => {
                setActivePage('explore');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-5 py-3 bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold rounded-xl text-sm border border-white/15 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Explore Creations</span>
            </button>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"
        />
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard interactive className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Saved Visuals
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              {loading ? '...' : totalCampaigns}
            </span>
          </div>
        </SpotlightCard>

        <SpotlightCard interactive className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Active Sectors
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              7 Domains
            </span>
          </div>
        </SpotlightCard>

        <SpotlightCard interactive className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Diffusion Engine
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              {healthStatus.model || 'FLUX.1 Dev (Q4_K_S GGUF)'}
            </span>
          </div>
        </SpotlightCard>

        <SpotlightCard interactive className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Export Format
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white font-display">
              Lossless PNG
            </span>
          </div>
        </SpotlightCard>
      </div>

      {/* Real-time Telemetry */}
      <Reveal>
        <SystemMonitorCard />
      </Reveal>

      {/* Main Content Split: Recent Generations + Sector Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Recent Studio Visuals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Archived generations persisted in local SQLite
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setActivePage('history');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Full Gallery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="studio-card rounded-2xl overflow-hidden p-4 space-y-3">
                  <div className="aspect-video rounded-xl studio-skeleton" />
                  <div className="h-4 w-2/3 rounded studio-skeleton" />
                  <div className="h-3 w-full rounded studio-skeleton" />
                </div>
              ))}
            </div>
          ) : historyItems.length === 0 ? (
            <SpotlightCard className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Saved Campaigns Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Generate your first environmental visual in the Studio to showcase and archive it
                here.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActivePage('generator');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create First Visual</span>
              </button>
            </SpotlightCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {historyItems.slice(0, 4).map((item) => (
                <SpotlightCard
                  key={item.id}
                  interactive
                  className="overflow-hidden group flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                    {item.image_exists !== false ? (
                      <StudioImage
                        src={item.image_url}
                        alt={item.campaign_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-xs text-slate-500">Image file archived</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 text-[10px] font-mono font-medium bg-black/60 backdrop-blur-md text-emerald-300 rounded-full border border-white/15">
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

                    <div className="pt-2.5 border-t border-slate-900/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{item.image_style}</span>
                      <button
                        type="button"
                        onClick={() => onSelectForRegenerate(item)}
                        className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Remix in Studio →
                      </button>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Sector Distribution
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coverage across sustainability themes
            </p>
          </div>

          <SpotlightCard className="p-6 space-y-4">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const percent = totalCampaigns > 0 ? Math.round((count / totalCampaigns) * 100) : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900/[0.06] dark:bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${percent > 0 ? percent : 4}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setActivePage('generator');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-emerald-500/25"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Generate New Visual</span>
              </button>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
