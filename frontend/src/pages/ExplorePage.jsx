import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Droplet, 
  Zap, 
  Sun, 
  ShieldAlert, 
  Sprout, 
  Wind, 
  Leaf, 
  Footprints,
  Palette,
  Users
} from 'lucide-react';
import { exploreExamples } from '../data/exploreExamples';

const ICON_MAP = {
  Droplet: Droplet,
  Zap: Zap,
  Sun: Sun,
  ShieldAlert: ShieldAlert,
  Sprout: Sprout,
  Wind: Wind,
  Leaf: Leaf,
  Footprints: Footprints
};

export default function ExplorePage({ onSelectExample }) {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const categories = ['All', ...new Set(exploreExamples.map(e => e.category))];

  const filteredExamples = exploreExamples.filter(item => {
    if (selectedFilter === 'All') return true;
    return item.category === selectedFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Curated Utility Templates</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Explore Sustainability Campaign Templates
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          Browse vetted environmental visual concepts built specifically for public utility educational outreach. 
          Select any template to instantly load its parameters into the AI generator for custom diffusion rendering.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === cat
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredExamples.map((item) => {
          const Icon = ICON_MAP[item.iconName] || Leaf;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
            >
              {/* Graphic Banner */}
              <div className={`h-48 bg-gradient-to-br ${item.previewGradient} p-6 flex flex-col justify-between text-white relative overflow-hidden`}>
                <div className="absolute right-0 bottom-0 opacity-15 translate-x-3 translate-y-3">
                  <Icon className="w-32 h-32" />
                </div>

                <div className="flex items-center justify-between z-10">
                  <span className="px-2.5 py-0.5 text-xs font-extrabold bg-white/20 backdrop-blur-md rounded-full">
                    {item.category}
                  </span>
                  <span className="text-xs font-medium opacity-90">{item.aspect_ratio}</span>
                </div>

                <div className="z-10 space-y-0.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="text-xs opacity-90 line-clamp-1">{item.subtitle}</p>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Palette className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Style:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.image_style}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Target:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.target_audience}</span>
                    </div>
                  </div>
                </div>

                {/* Populate Generator Button */}
                <button
                  onClick={() => onSelectExample(item)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-sm shadow-emerald-600/20 transition-all duration-150 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use This Template</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
