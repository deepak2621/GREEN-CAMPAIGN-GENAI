import React from 'react';
import {
  Sparkles,
  Compass,
  ArrowRight,
  Droplets,
  Zap,
  Sun,
  Recycle,
  TreePine,
  Wind,
  CheckCircle2,
  Clock,
  Layers,
  Download,
  Cpu,
} from 'lucide-react';
import { exploreExamples } from '../data/exploreExamples';
import { Reveal, SpotlightCard, MagneticButton, StudioImage } from '../components/MotionPrimitives';

export default function LandingPage({ setActivePage, onSelectExample }) {
  const categories = [
    {
      title: 'Water Conservation',
      icon: Droplets,
      desc: 'Watershed stewardship, smart metering & household water-saving campaigns.',
    },
    {
      title: 'Energy Conservation',
      icon: Zap,
      desc: 'Peak load reduction, efficient LED retrofits & everyday power mindfulness.',
    },
    {
      title: 'Renewable Energy',
      icon: Sun,
      desc: 'Photovoltaic solar arrays, wind farms & clean microgrid infrastructure.',
    },
    {
      title: 'Waste Management',
      icon: Recycle,
      desc: 'Circular economy education, organics composting & smart sorting.',
    },
    {
      title: 'Climate Awareness',
      icon: TreePine,
      desc: 'Biodiversity preservation, rainforest protection & climate resilience.',
    },
    {
      title: 'Pollution Control',
      icon: Wind,
      desc: 'Plastic-free oceans, coastal restoration & clean air initiatives.',
    },
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'Faithful Prompt Precision',
      desc: 'Your campaign narrative leads the generation pipeline verbatim—preserving intent while elevating composition and lighting.',
    },
    {
      icon: Layers,
      title: '6 Curated Visual Disciplines',
      desc: 'Switch effortlessly between editorial photography, 3D architectural renders, digital concept art, and clean vector posters.',
    },
    {
      icon: Clock,
      title: 'Fast & Quality Modes',
      desc: 'Draft rapidly at 512px (18 steps) or render high-detail campaign posters at 768px (26 steps) with live WebSocket telemetry.',
    },
    {
      icon: Download,
      title: 'Lossless PNG & Studio Archive',
      desc: 'Export publication-grade PNG artwork verified with Pillow and organize generations in your private SQLite campaign library.',
    },
  ];

  return (
    <div className="space-y-28 pb-24">
      {/* PREMIUM HERO SECTION */}
      <section className="relative overflow-hidden pt-12 sm:pt-16 lg:pt-20 pb-8">
        {/* Subtle Ambient Emerald Orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[760px] h-[420px] rounded-full bg-gradient-to-tr from-emerald-600/18 via-teal-500/10 to-transparent dark:from-emerald-500/16 dark:via-teal-700/10 blur-3xl animate-ambient -z-10"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 space-y-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>FLUX.1 Dev 12B • Environmental AI Studio</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl xl:text-[3.65rem] font-bold text-slate-900 dark:text-white leading-[1.07] tracking-tight">
                Turn Sustainability Into{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-500">
                  Powerful Visual Stories.
                </span>
              </h1>

              <p className="max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Create stunning AI-powered environmental visuals that inspire awareness, education
                and real-world change.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
                <MagneticButton
                  onClick={() => {
                    setActivePage('generator');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-950/25 hover:shadow-emerald-500/25 cursor-pointer text-sm sm:text-base"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Creating</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>

                <button
                  type="button"
                  onClick={() => {
                    setActivePage('explore');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 studio-card hover:border-emerald-500/35 text-slate-800 dark:text-slate-100 font-semibold rounded-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-sm sm:text-base"
                >
                  <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Explore Creations</span>
                </button>
              </div>

              {/* Studio Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2.5 gap-x-6 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Local FLUX.1 Dev Inference
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Real-Time Step Telemetry
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Lossless PNG Export
                </span>
              </div>
            </div>

            {/* Right Editorial Showcase Mosaic */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-12 gap-3.5 sm:gap-4">
                {/* Featured Large Rainforest Card */}
                <div className="col-span-7 row-span-2 group relative rounded-3xl overflow-hidden border border-slate-900/10 dark:border-white/10 shadow-2xl aspect-[4/5] bg-slate-950">
                  <StudioImage
                    src="/showcase/rainforest-river.png"
                    alt="Sunlit emerald rainforest river generated with FLUX.1 Dev"
                    loading="eager"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-[10px] font-mono text-emerald-300">
                    FLUX.1 Dev • Climate
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 space-y-1">
                    <p className="text-xs font-semibold text-white">Forest Biodiversity Campaign</p>
                    <p className="text-[11px] text-slate-300 line-clamp-1">
                      Sunbeams piercing an emerald canopy above a crystal river
                    </p>
                  </div>
                </div>

                {/* Top Right Renewable Solar & Wind */}
                <div className="col-span-5 group relative rounded-2xl overflow-hidden border border-slate-900/10 dark:border-white/10 shadow-xl aspect-square bg-slate-950">
                  <StudioImage
                    src="/showcase/solar-wind.png"
                    alt="Clean solar panels and wind turbines on green hills"
                    loading="eager"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[11px] font-semibold text-white">Clean Energy</p>
                    <p className="text-[10px] font-mono text-emerald-300">768×768 Quality</p>
                  </div>
                </div>

                {/* Bottom Right Ocean Wildlife */}
                <div className="col-span-5 group relative rounded-2xl overflow-hidden border border-slate-900/10 dark:border-white/10 shadow-xl aspect-square bg-slate-950">
                  <StudioImage
                    src="/showcase/ocean-wildlife.jpg"
                    alt="Sea turtle swimming over healthy coral reef"
                    loading="eager"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[11px] font-semibold text-white">Marine Protection</p>
                    <p className="text-[10px] font-mono text-emerald-300">Editorial Preset</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CURATED CREATION PRESETS */}
      <Reveal>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Curated Gallery
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Pre-Engineered Sustainability Concepts
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePage('explore');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <span>Browse all 8 creations</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {exploreExamples.slice(0, 4).map((ex) => (
              <SpotlightCard key={ex.id} interactive className="group flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                  <StudioImage
                    src={ex.previewImage || '/showcase/rainforest-river.png'}
                    alt={ex.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 text-[10px] font-mono font-medium bg-black/55 backdrop-blur-md text-emerald-300 rounded-full border border-white/15">
                    {ex.category}
                  </span>
                  <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                    <h3 className="text-base font-bold tracking-tight">{ex.title}</h3>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{ex.subtitle}</p>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {ex.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => onSelectExample(ex)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer border border-emerald-500/25"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open in Studio</span>
                  </button>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </section>
      </Reveal>

      {/* STUDIO WORKFLOW */}
      <Reveal>
        <section className="border-y border-slate-900/10 dark:border-white/[0.07] bg-slate-900/[0.02] dark:bg-white/[0.015] py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Creative Pipeline
              </span>
              <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                From Environmental Concept to Campaign Asset
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                Designed for speed, visual coherence, and effortless campaign iteration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  num: '01',
                  title: 'Compose Your Narrative',
                  desc: 'Describe your scene directly or choose a sector, visual style, demographic, and aspect ratio.',
                },
                {
                  num: '02',
                  title: 'FLUX.1 Dev Diffusion',
                  desc: '12B parameter flow-matching transformer renders locally on GPU with live WebSocket step feedback.',
                },
                {
                  num: '03',
                  title: 'Inspect, Export & Archive',
                  desc: 'Download lossless PNG visuals, inspect exact prompts and seeds, or remix inside your studio gallery.',
                },
              ].map((step) => (
                <SpotlightCard key={step.num} interactive className="p-7 space-y-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-sm">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* STUDIO CAPABILITIES */}
      <Reveal>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Platform Architecture
            </span>
            <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Precision Tooling for Sustainability Teams
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <SpotlightCard key={idx} interactive className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </SpotlightCard>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* SECTORS BANNER */}
      <Reveal>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071f17] via-[#0a1310] to-[#050807] p-8 sm:p-12 text-white border border-emerald-500/20 shadow-2xl">
            <div className="max-w-2xl mb-10 space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>Environmental Coverage</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Dedicated Support Across Utility &amp; Climate Sectors
              </h2>
              <p className="text-slate-300 text-sm sm:text-base">
                Tailored art direction presets across the highest-impact public awareness domains.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
              {categories.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-500/15 border border-emerald-500/25 rounded-lg text-emerald-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{cat.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{cat.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <p className="text-xs text-slate-300">
                Ready to craft your next sustainability campaign visual?
              </p>
              <MagneticButton
                onClick={() => {
                  setActivePage('generator');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl cursor-pointer whitespace-nowrap"
              >
                Open Generative Studio
              </MagneticButton>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
