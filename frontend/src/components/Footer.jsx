import React from 'react';
import { Leaf, Globe, Shield } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ setActivePage }) {
  return (
    <footer className="bg-slate-950 dark:bg-[#050807] text-slate-300 border-t border-slate-800/80 dark:border-white/[0.07] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white border border-emerald-400/20">
                <Leaf className="w-4 h-4" />
              </div>
              <span className="font-display text-lg font-bold text-white tracking-tight">
                Green Campaign <span className="text-emerald-400">AI</span>
              </span>
            </div>

            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Environmental generative studio built for sustainability educators, conservation agencies,
              and clean energy leaders—powered locally by FLUX.1 Dev.
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Local Offline Inference</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>FLUX.1 Dev 12B Q4 GGUF</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-300 mb-4">
              Workspace
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { id: 'dashboard', label: 'Operations Dashboard' },
                { id: 'generator', label: 'Generative Studio' },
                { id: 'explore', label: 'Curated Creations' },
                { id: 'history', label: 'Saved Gallery' },
                { id: 'landing', label: 'Overview' },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage(link.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-300 mb-4">
              Focus Areas
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Water Conservation &amp; Watersheds</li>
              <li>Clean Energy &amp; Grid Transition</li>
              <li>Ocean &amp; Wildlife Protection</li>
              <li>Circular Waste &amp; Zero Plastic</li>
              <li>Reforestation &amp; Climate Resilience</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {CURRENT_YEAR} Green Campaign AI. Built for Environmental Educators &amp; Public Utilities.</p>
          <span className="font-mono text-slate-400">ComfyUI • FLUX.1 Dev • Pillow PNG</span>
        </div>
      </div>
    </footer>
  );
}
