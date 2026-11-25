import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Cpu, HardDrive, RefreshCw, Clock, Gauge } from 'lucide-react';
import { fetchSystemMetrics } from '../services/api';
import { SpotlightCard } from './MotionPrimitives';

export default function SystemMonitorCard({ compact = false }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await fetchSystemMetrics();
      setMetrics(data);
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const pull = () => {
      fetchSystemMetrics()
        .then((data) => {
          if (mounted) {
            setMetrics(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setLoading(false);
        });
    };
    pull();
    const interval = setInterval(pull, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && !metrics) {
    return (
      <div className="studio-card rounded-2xl p-5 text-xs text-slate-500 dark:text-slate-400">
        Reading live GPU and RAM telemetry...
      </div>
    );
  }

  if (!metrics) return null;

  const vramDisplay =
    metrics.vram_used_mb != null && metrics.vram_total_mb
      ? `${metrics.vram_used_mb} / ${metrics.vram_total_mb} MB (${metrics.vram_percent}%)`
      : 'Unavailable';

  const gpuUtilDisplay =
    metrics.gpu_utilization_pct != null ? `${metrics.gpu_utilization_pct}%` : 'Unavailable';

  const ramDisplay =
    metrics.ram_used_gb != null && metrics.ram_total_gb
      ? `${metrics.ram_used_gb} / ${metrics.ram_total_gb} GB (${metrics.ram_percent}%)`
      : 'Unavailable';

  return (
    <SpotlightCard className="p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hardware &amp; Inference Telemetry
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {metrics.gpu_name} • ComfyUI{' '}
                <span
                  className={
                    metrics.server_online
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-amber-600 dark:text-amber-400 font-semibold'
                  }
                >
                  {metrics.server_online ? 'Online' : 'Standby'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-900/[0.04] dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-900/10 dark:border-white/10 capitalize">
              {metrics.generation_status || 'idle'}
            </span>
            <button
              type="button"
              onClick={() => loadMetrics(true)}
              aria-label="Refresh system telemetry"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 ${
            compact ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-5'
          } gap-3 text-xs`}
        >
          <div className="p-3 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/[0.06] dark:border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <Gauge className="w-3.5 h-3.5 text-emerald-500" />
              <span>GPU Load</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-white font-mono">
              {gpuUtilDisplay}
              {metrics.gpu_temp_c != null ? ` • ${metrics.gpu_temp_c}°C` : ''}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/[0.06] dark:border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              <span>VRAM</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-white font-mono">{vramDisplay}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/[0.06] dark:border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span>System RAM</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-white font-mono">{ramDisplay}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/[0.06] dark:border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Model Load</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-white font-mono">
              {metrics.last_model_load_sec != null ? `${metrics.last_model_load_sec}s` : 'Standby'}
            </div>
          </div>

          {!compact && (
            <div className="p-3 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/[0.06] dark:border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Last Render</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white font-mono">
                {metrics.last_generation_sec != null
                  ? `${metrics.last_generation_sec}s (${metrics.last_preset || 'fast'})`
                  : 'Ready'}
              </div>
            </div>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}
