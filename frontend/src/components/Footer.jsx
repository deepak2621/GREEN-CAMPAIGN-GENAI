import React from 'react';
import { Leaf, Globe, Shield } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ setActivePage }) {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Green Campaign <span className="text-emerald-400">AI</span>
              </span>
            </div>
            
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Empowering municipal utility companies, environmental organizations, and clean energy leaders 
              to transform complex sustainability concepts into captivating, high-impact educational campaign visuals 
              with cutting-edge diffusion AI.
            </p>

            <div className="flex items-center gap-6 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Zero Carbon Footprint Workflows</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Enterprise Grade</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => { setActivePage('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Operations Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  AI Campaign Generator
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActivePage('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Campaign Templates
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActivePage('history'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Saved Campaign History
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActivePage('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* Utility Topics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Utility Focus Areas
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Water Conservation & Drought Awareness</li>
              <li>Residential Energy Efficiency</li>
              <li>Rooftop Solar & Smart Grid Adoption</li>
              <li>Plastic-Free Oceans & Circular Economy</li>
              <li>Tree Canopy & Climate Resilience</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {CURRENT_YEAR} Green Campaign AI. Built for Public Utilities and Environmental Educators.
          </p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Powered by Diffusion Text-to-Image AI & Pillow</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
