import React, { useState, useMemo } from 'react';
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
  Users,
  ImageOff,
} from 'lucide-react';
import { exploreExamples, validateUniqueExampleImages } from '../data/exploreExamples';
import { Reveal, SpotlightCard, StudioImage } from '../components/MotionPrimitives';

const ICON_MAP = {
  Droplet,
  Zap,
  Sun,
  ShieldAlert,
  Sprout,
  Wind,
  Leaf,
  Footprints,
};

export default function ExplorePage({ onSelectExample }) {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const duplicateIds = useMemo(() => validateUniqueExampleImages(exploreExamples), []);

  const categories = ['All', ...new Set(exploreExamples.map((e) => e.category))];

  const filteredExamples = exploreExamples.filter((item) => {
    if (selectedFilter === 'All') return true;
    return item.category === selectedFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Campaign Inspiration Gallery</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Explore Sustainability Campaign Concepts
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          Browse curated environmental themes engineered for educational outreach. Select any
          campaign to load its prompt and style settings directly into the Studio.
        </p>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-200 dark:border-white/[0.08]">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === cat
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'studio-card text-slate-600 dark:text-slate-300 hover:border-emerald-500/35'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Unique Visual Campaign Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredExamples.map((item, idx) => {
          const Icon = ICON_MAP[item.iconName] || Leaf;
          const isDuplicateImage = duplicateIds.has(item.id);

          return (
            <Reveal key={item.id} delay={Math.min(idx * 35, 180)}>
              <SpotlightCard interactive className="flex flex-col justify-between overflow-hidden group h-full">
                {/* Unique Campaign Image */}
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-950 overflow-hidden">
                  {!isDuplicateImage && item.previewImage ? (
                    <StudioImage
                      src={item.previewImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-4 text-center">
                      <ImageOff className="w-6 h-6" />
                      <span className="text-xs">Unique preview pending</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                    <span className="px-2.5 py-0.5 text-[10px] font-mono font-medium bg-black/60 backdrop-blur-md text-emerald-300 rounded-full border border-white/15">
                      {item.category}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-black/60 backdrop-blur-md text-white/90 rounded border border-white/10">
                      {item.aspect_ratio}
                    </span>
                  </div>

                  <div className="absolute bottom-3.5 left-4 right-4 z-10 space-y-1 text-white">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md flex items-center justify-center mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight leading-snug">{item.title}</h3>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{item.subtitle}</p>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/[0.06] space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Palette className="w-3.5 h-3.5 text-emerald-500" /> Style
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.image_style}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-emerald-500" /> Audience
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.target_audience}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectExample(item)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
