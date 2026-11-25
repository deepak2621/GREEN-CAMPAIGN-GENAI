import React from 'react';
import { 
  Leaf,
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
  Download
} from 'lucide-react';
import { exploreExamples } from '../data/exploreExamples';

export default function LandingPage({ setActivePage, onSelectExample }) {
  const categories = [
    { title: "Water Conservation", icon: Droplets, desc: "Smart metering, leak detection & household tap saving habits.", count: "12+ Presets" },
    { title: "Energy Conservation", icon: Zap, desc: "Peak hour load shifting, LED upgrades & phantom energy reduction.", count: "15+ Presets" },
    { title: "Renewable Energy", icon: Sun, desc: "Community solar panels, microgrids & clean transmission infrastructure.", count: "10+ Presets" },
    { title: "Waste Management", icon: Recycle, desc: "Circular economy education, zero single-use plastics & composting.", count: "8+ Presets" },
    { title: "Climate Awareness", icon: TreePine, desc: "Carbon footprint tracking, climate resilience & biodiversity.", count: "14+ Presets" },
    { title: "Pollution Control", icon: Wind, desc: "Clean waterways, industrial emission reduction & clear air action.", count: "9+ Presets" }
  ];

  const features = [
    {
      icon: Sparkles,
      title: "Faithful FLUX.1 Dev Prompting",
      desc: "Preserves your exact environmental message at the forefront while applying clean art direction, lighting, and campaign composition."
    },
    {
      icon: Layers,
      title: "6 Specialized Visual Styles",
      desc: "From friendly 3D character illustrations for school programs to photorealistic solar installations for commercial utility campaigns."
    },
    {
      icon: Clock,
      title: "Fast & Quality Inference Presets",
      desc: "Choose Fast Mode (512px, 18 steps) for rapid drafting or Quality Mode (768px, 26 steps) for detailed campaign posters."
    },
    {
      icon: Download,
      title: "Lossless PNG & Persistent History",
      desc: "Download high-resolution visuals optimized with Pillow and organize campaigns in a persistent local SQLite database."
    }
  ];

  return (
    <div className="space-y-24 pb-20 transition-colors">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-emerald-300/30 to-teal-200/20 dark:from-emerald-900/20 dark:to-teal-900/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>AI-Powered Generative Visuals for Public Utilities</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Create Powerful Sustainability <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-300">
              Campaigns with AI
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Equip municipal utilities, conservation agencies, and sustainability educators with instant, 
            high-fidelity campaign illustrations. Transform simple text themes into persuasive, 
            publication-ready environmental visuals.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-base"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Creating</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => { setActivePage('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs transition-all duration-200 cursor-pointer text-base"
            >
              <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Explore Examples</span>
            </button>
          </div>

          {/* Trust points */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-8 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              FLUX.1 Dev 12B Local AI
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Lossless PNG Export
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Fast &amp; Quality Presets
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Integrated SQLite History
            </span>
          </div>

        </div>
      </section>

      {/* Featured Campaign Visual Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              Curated Gallery
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Pre-Engineered Campaign Templates
            </h2>
          </div>
          <button
            onClick={() => { setActivePage('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
          >
            <span>View all 8 campaign themes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {exploreExamples.slice(0, 4).map((ex) => (
            <div 
              key={ex.id}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 flex flex-col overflow-hidden"
            >
              <div className={`h-40 bg-gradient-to-br ${ex.previewGradient} p-6 flex flex-col justify-between text-white relative overflow-hidden`}>
                <div className="absolute right-0 bottom-0 opacity-15 translate-x-4 translate-y-4">
                  <Leaf className="w-32 h-32" />
                </div>
                <div className="flex items-center justify-between z-10">
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-white/20 backdrop-blur-md rounded-full">
                    {ex.category}
                  </span>
                  <span className="text-xs opacity-90">{ex.image_style}</span>
                </div>
                <div className="z-10">
                  <h3 className="text-xl font-bold tracking-tight">{ex.title}</h3>
                  <p className="text-xs opacity-90 mt-0.5">{ex.subtitle}</p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {ex.description}
                </p>

                <button
                  onClick={() => onSelectExample(ex)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-800/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Customize in Generator</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-16 lg:py-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Workflow
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              From Sustainability Idea to Campaign Visual in 3 Steps
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Engineered specifically for utility communications managers and municipal educators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs relative transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-lg flex items-center justify-center mb-6">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Input Campaign Goals</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Enter your theme, target audience (students, households), desired visual style, and aspect ratio.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs relative transition-colors">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-lg flex items-center justify-center mb-6">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">AI Diffusion Synthesis</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Our prompt builder injects environmental motifs, category negative exclusions, and lighting directives.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs relative transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center mb-6 shadow-sm shadow-emerald-600/30">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Export & Deploy</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Download your visual in full-resolution PNG format, archive to SQLite campaign history, or tweak prompts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Enterprise Capabilities
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Built for Serious Environmental Education
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Everything your utility marketing and outreach team needs to deliver professional public engagement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{feat.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Supported Campaign Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl border border-emerald-800/40">
          <div className="max-w-3xl mb-10 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Coverage
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Supported Utility Campaign Categories
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Optimized visual representations for the most crucial environmental and utility resource sectors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <div key={i} className="bg-white/10 backdrop-blur-xs p-5 rounded-xl border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{cat.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{cat.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-300">
              Need custom art direction for your district? Additional prompt instructions allow fine-tuned brand alignment.
            </p>
            <button
              onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Launch Generator
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
