import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Clock,
  Dices,
  ShieldCheck,
  Eye,
  Copy,
  Cpu,
  Layers,
  Code2
} from 'lucide-react';
import { generateCampaignImage, fetchCooldown, previewPrompt } from '../services/api';

const CATEGORIES = [
  "Water Conservation",
  "Energy Conservation",
  "Renewable Energy",
  "Climate Awareness",
  "Waste Management",
  "Pollution Control",
  "Sustainable Living"
];

const STYLES = [
  { label: "Realistic Photography", desc: "True-to-life documentary quality with authentic natural lighting" },
  { label: "3D Illustration", desc: "Pixar-style clean 3D isometric render with friendly studio lighting" },
  { label: "Digital Art", desc: "Atmospheric concept art with painterly environmental depth" },
  { label: "Flat Vector Illustration", desc: "Minimalist corporate Memphis vector art with bold shapes" },
  { label: "Educational Infographic Illustration", desc: "Structured diagrammatic visual with clear instructional clarity" },
  { label: "Cartoon Illustration", desc: "Warm and inviting storybook styling, ideal for youth education" }
];

const AUDIENCES = [
  { label: "General Public", desc: "Broad community appeal with everyday relatable situations" },
  { label: "Students", desc: "Curiosity-driven visuals emphasizing science and youth empowerment" },
  { label: "Children", desc: "Whimsical, friendly characters and bright, cheerful colors" },
  { label: "Households", desc: "Practical residential contexts focusing on home bill savings and comfort" },
  { label: "Industrial Consumers", desc: "Commercial & enterprise scale clean energy infrastructure" }
];

const RATIOS = [
  { id: "1:1", label: "Square", ratio: "1:1", desc: "Balanced square (512×512)" },
  { id: "4:5", label: "Portrait", ratio: "4:5", desc: "Flyers & posters (512×640)" },
  { id: "16:9", label: "Landscape", ratio: "16:9", desc: "Web banners (640×384)" }
];

const QUICK_THEMES = [
  "Save Water in Daily Life",
  "Rooftop Solar for Homes",
  "Unplug Vampire Electronics",
  "Zero Single-Use Plastic",
  "Plant Urban Trees"
];

const STEPS_LABELS = [
  "1. Constructing direct FLUX.2 Klein sustainability prompt...",
  "2. Dispatching to local ComfyUI on NVIDIA GPU (RTX 4050)...",
  "3. Sampling 4-step distilled flow matching with Euler sampler...",
  "4. Decoding FLUX.2 latent representation & validating lossless PNG with Pillow..."
];

export default function GeneratorPage({
  formData,
  setFormData,
  onGenerationSuccess,
  showToast
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Development prompt debugging state (Task 6)
  const [showPromptDebugger, setShowPromptDebugger] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Fetch live prompt preview whenever inputs change or debugger is opened
  useEffect(() => {
    if (!showPromptDebugger) return;
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      const data = await previewPrompt(formData);
      if (!isCancelled && data) {
        setPreviewData(data);
      }
      setIsLoadingPreview(false);
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [showPromptDebugger, formData]);

  const copyPromptToClipboard = () => {
    if (!previewData?.prompt) return;
    navigator.clipboard.writeText(previewData.prompt);
    setCopiedPrompt(true);
    showToast("AI prompt copied to clipboard!", "success");
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Check initial cooldown
  useEffect(() => {
    fetchCooldown().then(res => {
      if (res.cooldown_remaining > 0) {
        setCooldownRemaining(res.cooldown_remaining);
      }
    });
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const randomizeSeed = () => {
    const newSeed = Math.floor(100000 + Math.random() * 90000000);
    handleInputChange('seed', newSeed);
    showToast(`Assigned seed: ${newSeed}`, 'info');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.campaign_title || !formData.campaign_title.trim()) {
      newErrors.campaign_title = "Please enter a campaign theme or title.";
    }
    if (!formData.description || !formData.description.trim()) {
      newErrors.description = "Please describe what educational concept to communicate.";
    }
    if (!formData.category) {
      newErrors.category = "Please select a campaign category.";
    }
    if (!formData.image_style) {
      newErrors.image_style = "Please select an image style.";
    }
    if (!formData.target_audience) {
      newErrors.target_audience = "Please specify the target audience.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const executeGeneration = async () => {
    if (isGenerating) return;

    setApiError(null);
    if (!validateForm()) {
      showToast("Please fill in all required fields before generating.", "warning");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(1);

    // Multi-stage progress stepping
    const stepTimer = setInterval(() => {
      setGenerationStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    try {
      const response = await generateCampaignImage(formData);
      clearInterval(stepTimer);
      setIsGenerating(false);
      setGenerationStep(0);
      showToast("Campaign visual generated successfully!", "success");
      onGenerationSuccess(response.data);
    } catch (err) {
      clearInterval(stepTimer);
      setIsGenerating(false);
      setGenerationStep(0);

      if (err.rateLimited && err.retryAfter) {
        setCooldownRemaining(err.retryAfter);
      }

      const friendlyMsg = err.errorType === 'ServiceBusyError'
        ? "AI image generation is temporarily busy. Your campaign details are saved. Please click Retry in a few seconds."
        : (err.message || "Failed to generate campaign image.");

      setApiError({
        type: err.errorType || "GenerationError",
        message: friendlyMsg,
        rateLimited: err.rateLimited || false,
        retryAfter: err.retryAfter || 0
      });

      showToast(friendlyMsg, "error");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeGeneration();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>FLUX.2 Klein 4B Q4 Engine (&lt; 10s Speed)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          AI Campaign Visual Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl">
          Enter your campaign requirements below. Powered by <strong>FLUX.2 Klein 4B Q4</strong> with 
          high-speed 4-step distilled diffusion, optimized for strict sustainability topic accuracy.
        </p>
      </div>

      {/* Model Architecture & Runtime Status Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Model: FLUX.2 Klein 4B Q4</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  4-Step Distilled Q4_K_M
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                  Apache 2.0 Cleared
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Provider: <span className="font-semibold text-slate-700 dark:text-slate-200">Local ComfyUI</span> • Execution: <span className="font-semibold text-slate-700 dark:text-slate-200">NVIDIA GPU + CPU offloading where supported</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              isGenerating
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
              <span>Status: {isGenerating ? "Synthesizing (< 10s)..." : "Ready"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error & Rate-Limit Alert with Live Countdown & Retry */}
      {apiError && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-950 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <h4 className="font-bold text-rose-900 dark:text-rose-200">
                {apiError.type === "RateLimitError" ? "Free Tier Cooldown Active" : "Generation Notice"}
              </h4>
              <p className="text-rose-800 dark:text-rose-300 text-xs leading-relaxed max-w-xl">
                {apiError.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {cooldownRemaining > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/60 rounded-xl text-xs font-mono font-bold text-rose-800 dark:text-rose-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Ready in {cooldownRemaining}s</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={executeGeneration}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Generation</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Generator Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8 transition-colors">

        {/* Section 1: Campaign Theme & Quick Suggestions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-900 dark:text-white">
              1. Campaign Theme <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400 dark:text-slate-500">Core message</span>
          </div>

          <input
            type="text"
            value={formData.campaign_title || ''}
            onChange={(e) => handleInputChange('campaign_title', e.target.value)}
            placeholder="e.g. Save Water: Every Drop Counts"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-hidden dark:bg-slate-800 dark:text-white ${errors.campaign_title
                ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15'
              }`}
          />
          {errors.campaign_title && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.campaign_title}
            </p>
          )}

          {/* Quick theme suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mr-1">Suggestions:</span>
            {QUICK_THEMES.map((theme, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleInputChange('campaign_title', theme)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                + {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Campaign Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-900 dark:text-white">
              2. Campaign Narrative & Educational Context <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400 dark:text-slate-500">Visual narrative</span>
          </div>

          <textarea
            rows={3}
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe what educational action should be highlighted (e.g. Person closing running sink tap, smart LED lighting, solar panel installation)..."
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-hidden dark:bg-slate-800 dark:text-white ${errors.description
                ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15'
              }`}
          />
          {errors.description && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Section 3: Campaign Category */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            3. Sustainability Sector <span className="text-rose-500">*</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = formData.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleInputChange('category', cat)}
                  className={`p-3 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                >
                  <span className="truncate">{cat}</span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.category}
            </p>
          )}
        </div>

        {/* Section 4: Image Style */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            4. Image Style <span className="text-rose-500">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STYLES.map((style) => {
              const isSelected = formData.image_style === style.label;
              return (
                <div
                  key={style.label}
                  onClick={() => handleInputChange('image_style', style.label)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold">{style.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{style.desc}</p>
                </div>
              );
            })}
          </div>
          {errors.image_style && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.image_style}
            </p>
          )}
        </div>

        {/* Section 5: Target Audience */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            5. Target Demographic <span className="text-rose-500">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {AUDIENCES.map((aud) => {
              const isSelected = formData.target_audience === aud.label;
              return (
                <button
                  key={aud.label}
                  type="button"
                  onClick={() => handleInputChange('target_audience', aud.label)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{aud.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                    {aud.desc}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.target_audience && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.target_audience}
            </p>
          )}
        </div>

        {/* Section 6: Aspect Ratio */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            6. Aspect Ratio
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RATIOS.map((item) => {
              const isSelected = (formData.aspect_ratio || '1:1') === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleInputChange('aspect_ratio', item.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{item.label} ({item.ratio})</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 7: Additional Instructions */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            7. Art Direction Notes <span className="text-xs text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={formData.additional_instructions || ''}
            onChange={(e) => handleInputChange('additional_instructions', e.target.value)}
            placeholder="e.g. Crisp blue sky, clean water reflections, golden hour illumination"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 text-sm transition-all focus:outline-hidden"
          />
        </div>

        {/* Advanced Controls Accordion (Seed & Negative Prompts) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Advanced Generation Controls (Seed & Negative Prompt)</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-150">
              {/* Seed Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Diffusion Seed (Reproducibility)
                  </label>
                  <button
                    type="button"
                    onClick={randomizeSeed}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Randomize</span>
                  </button>
                </div>
                <input
                  type="number"
                  value={formData.seed || ''}
                  onChange={(e) => handleInputChange('seed', e.target.value)}
                  placeholder="Leave empty for auto-generated random seed"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>

              {/* Custom Negative Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custom Negative Prompt (Optional)
                </label>
                <input
                  type="text"
                  value={formData.custom_negative_prompt || ''}
                  onChange={(e) => handleInputChange('custom_negative_prompt', e.target.value)}
                  placeholder="Default eliminates blur, text, watermarks, and unrelated elements"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Collapsible View AI Prompt Section (Task 6 Debugger) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowPromptDebugger(!showPromptDebugger)}
            className="flex items-center justify-between w-full text-left py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>View AI Prompt</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-[10px]">
                Prompt Inspector
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{showPromptDebugger ? 'Collapse' : 'Inspect Prompt Before Generation'}</span>
              {showPromptDebugger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showPromptDebugger && (
            <div className="mt-3 p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 space-y-4 shadow-inner animate-in fade-in duration-150">

              {/* Header Info Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    Live Diffusion Prompt Inspector
                  </span>
                </div>
                {previewData && (
                  <button
                    type="button"
                    onClick={copyPromptToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedPrompt ? 'Copied!' : 'Copy AI Prompt'}</span>
                  </button>
                )}
              </div>

              {isLoadingPreview && !previewData ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Synthesizing structured prompt from form inputs...</span>
                </div>
              ) : previewData ? (
                <div className="space-y-4 text-xs">

                  {/* 1. Original User Input */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>1. Original User Input</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Theme:</span>
                        <span className="font-semibold text-slate-200">{previewData.original_inputs.campaign_title || '(Empty)'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Category:</span>
                        <span className="font-semibold text-emerald-300">{previewData.original_inputs.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Style:</span>
                        <span className="font-semibold text-slate-200">{previewData.original_inputs.image_style}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Audience:</span>
                        <span className="font-semibold text-slate-200">{previewData.original_inputs.target_audience}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Aspect Ratio:</span>
                        <span className="font-semibold text-slate-200">{previewData.original_inputs.aspect_ratio}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Description:</span>
                        <span className="font-semibold text-slate-200 truncate block">{previewData.original_inputs.description || '(None)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Generated AI Prompt */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>2. Generated AI Prompt (10-Point Structured Diffusion Prompt)</span>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-900/40 text-emerald-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                      {previewData.prompt}
                    </div>
                  </div>

                  {/* 3. Negative Prompt */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-rose-400" />
                      <span>3. Negative Prompt (Category Exclusions & Quality Filters)</span>
                    </div>
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-rose-300 font-mono text-[11px] leading-relaxed">
                      {previewData.negative_prompt}
                    </div>
                  </div>

                  {/* 4 & 5. Selected Model & Generation Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Cpu className="w-3 h-3 text-emerald-400" />
                        <span>4. Selected AI Diffusion Model</span>
                      </div>
                      <div className="text-slate-200 font-semibold text-xs">
                        {previewData.model_info.model_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Provider: <span className="font-mono text-emerald-300">{previewData.model_info.provider}</span> • {previewData.model_info.free_tier ? 'Free Open Tier' : 'API Authenticated'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Sliders className="w-3 h-3 text-emerald-400" />
                        <span>5. Model Generation Parameters</span>
                      </div>
                      <div className="text-slate-200 text-[11px] space-y-0.5">
                        <div>Dimensions: <span className="font-mono text-emerald-300">{previewData.parameters.width}×{previewData.parameters.height}</span> ({previewData.parameters.aspect_ratio})</div>
                        <div>Seed: <span className="font-mono text-emerald-300">{previewData.parameters.seed}</span></div>
                        <div>Steps / CFG: <span className="font-mono text-slate-300">{previewData.parameters.inference_steps} steps, scale {previewData.parameters.guidance_scale}</span></div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : null}

            </div>
          )}
        </div>

        {/* Submit Button & Progress Indicator */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          {isGenerating ? (
            <div className="p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border-3 border-emerald-400 border-t-emerald-700 dark:border-t-emerald-300 animate-spin shrink-0"></div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Generating Campaign Visual...
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    {STEPS_LABELS[generationStep - 1] || "Connecting to diffusion model..."}
                  </p>
                </div>
              </div>

              <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 dark:bg-emerald-400 h-1.5 transition-all duration-700 rounded-full"
                  style={{ width: `${(generationStep / 4) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 pt-1">
                <span>Free open diffusion synthesis</span>
                <span>Pillow PNG optimization</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Lossless PNG output • Strict category focus guaranteed</span>
              </div>

              <button
                type="submit"
                disabled={isGenerating || cooldownRemaining > 0}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 font-bold rounded-xl shadow-md transition-all duration-150 text-sm cursor-pointer ${cooldownRemaining > 0
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 hover:shadow-emerald-600/40 active:scale-98'
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {cooldownRemaining > 0 ? `Ready in ${cooldownRemaining}s` : "Generate Campaign Visual"}
                </span>
              </button>
            </div>
          )}
        </div>

      </form>
    </div>
  );
}
