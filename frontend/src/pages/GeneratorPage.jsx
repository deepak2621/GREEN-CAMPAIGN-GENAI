import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  AlertCircle,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Dices,
  ShieldCheck,
  Eye,
  Copy,
  Cpu,
  Layers,
  Code2,
  Zap,
  Award,
  XCircle,
} from 'lucide-react';
import {
  startGenerationJob,
  getGenerationStatus,
  cancelGenerationJob,
  previewPrompt,
} from '../services/api';
import {
  CATEGORIES,
  STYLES,
  AUDIENCES,
  PRESETS,
  RATIOS,
  QUICK_THEMES,
} from '../data/campaignOptions';
import SystemMonitorCard from '../components/SystemMonitorCard';

export default function GeneratorPage({
  formData,
  setFormData,
  onGenerationSuccess,
  showToast,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Prompt inspector state
  const [showPromptDebugger, setShowPromptDebugger] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const pollTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Fetch live prompt preview whenever inputs change while inspector is open
  useEffect(() => {
    if (!showPromptDebugger) return;
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      const data = await previewPrompt(formData);
      if (!isCancelled && data) {
        setPreviewData(data);
      }
      if (!isCancelled) setIsLoadingPreview(false);
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
    showToast('AI prompt copied to clipboard!', 'success');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
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
    const hasCustomPrompt = Boolean(formData.custom_prompt && formData.custom_prompt.trim());
    if (!hasCustomPrompt) {
      if (!formData.campaign_title || !formData.campaign_title.trim()) {
        newErrors.campaign_title = 'Please enter a campaign theme or title.';
      }
      if (!formData.description || !formData.description.trim()) {
        newErrors.description = 'Please describe what educational concept to communicate.';
      }
    }
    if (!formData.category) {
      newErrors.category = 'Please select a campaign category.';
    }
    if (!formData.image_style) {
      newErrors.image_style = 'Please select an image style.';
    }
    if (!formData.target_audience) {
      newErrors.target_audience = 'Please specify the target audience.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const executeGeneration = async () => {
    if (isGenerating) return;

    setApiError(null);
    if (!validateForm()) {
      showToast('Please fill in all required fields before generating.', 'warning');
      return;
    }

    setIsGenerating(true);
    setActiveJob({
      status: 'queued',
      stage: 'Submitting job to FLUX.1 Dev...',
      progress_pct: 2,
      step: 0,
      max_steps: activePreset.steps,
      elapsed_sec: 0,
    });

    try {
      const initialJob = await startGenerationJob(formData);
      if (!mountedRef.current) return;
      setActiveJob(initialJob);

      const jobId = initialJob.job_id;
      pollTimerRef.current = setInterval(async () => {
        try {
          const job = await getGenerationStatus(jobId);
          if (!mountedRef.current) return;
          setActiveJob(job);

          if (job.status === 'completed' && job.result) {
            stopPolling();
            setIsGenerating(false);
            setActiveJob(null);
            showToast('FLUX.1 Dev campaign visual generated!', 'success');
            onGenerationSuccess(job.result);
          } else if (job.status === 'cancelled') {
            stopPolling();
            setIsGenerating(false);
            setActiveJob(null);
            showToast('Generation cancelled.', 'info');
          } else if (job.status === 'error') {
            stopPolling();
            setIsGenerating(false);
            setActiveJob(null);
            const msg = job.error || 'Image generation failed.';
            setApiError({ type: job.error_type || 'GenerationError', message: msg });
            showToast(msg, 'error');
          }
        } catch (pollErr) {
          stopPolling();
          if (!mountedRef.current) return;
          setIsGenerating(false);
          setActiveJob(null);
          const msg = pollErr.message || 'Lost connection while monitoring generation.';
          setApiError({ type: pollErr.errorType || 'GenerationError', message: msg });
          showToast(msg, 'error');
        }
      }, 750);
    } catch (err) {
      stopPolling();
      setIsGenerating(false);
      setActiveJob(null);
      const msg = err.message || 'Failed to start campaign visual generation.';
      setApiError({ type: err.errorType || 'GenerationError', message: msg });
      showToast(msg, 'error');
    }
  };

  const handleCancelGeneration = async () => {
    if (!activeJob?.job_id) return;
    try {
      await cancelGenerationJob(activeJob.job_id);
      stopPolling();
      setIsGenerating(false);
      setActiveJob(null);
      showToast('Generation cancelled.', 'info');
    } catch (err) {
      showToast(err.message || 'Unable to cancel active job.', 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeGeneration();
  };

  const activePresetId = formData.preset || 'fast';
  const activePresetMeta = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0];
  const activePreset = {
    ...activePresetMeta,
    steps: activePresetId === 'quality' ? 26 : 18,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Black Forest Labs • FLUX.1 Dev (12B Q4_K_S GGUF)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          AI Campaign Visual Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl">
          Create photorealistic environmental posters and sustainability visuals with{' '}
          <strong>FLUX.1 Dev</strong>, optimized locally for NVIDIA GPU + smart CPU offloading.
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
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Model: FLUX.1 Dev (Q4_K_S GGUF)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  12B MMDiT • T5-XXL Q4_K_M + CLIP-L
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Backend: <span className="font-semibold text-slate-700 dark:text-slate-200">Local ComfyUI</span> • Preset:{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {activePreset.label} ({activePreset.badge})
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                isGenerating
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isGenerating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                }`}
              ></span>
              <span>
                Status: {isGenerating ? `${activeJob?.progress_pct || 0}%` : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Compact Hardware Telemetry */}
      <SystemMonitorCard compact />

      {/* Error Alert with Retry */}
      {apiError && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-950 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <h4 className="font-bold text-rose-900 dark:text-rose-200">
                {apiError.type === 'CudaOOMError' ? 'GPU Memory Limit Reached' : 'Generation Error'}
              </h4>
              <p className="text-rose-800 dark:text-rose-300 text-xs leading-relaxed max-w-xl">
                {apiError.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={executeGeneration}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 self-end sm:self-center disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Generation</span>
          </button>
        </div>
      )}

      {/* Main Generator Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8 transition-colors"
      >
        {/* Generation Speed & Quality Preset */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-900 dark:text-white">
              Generation Mode (Speed vs. Detail)
            </label>
            <span className="text-xs text-slate-400 dark:text-slate-500">FLUX.1 Dev presets</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              const Icon = preset.id === 'fast' ? Zap : Award;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleInputChange('preset', preset.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 disabled:opacity-60 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-bold">{preset.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {preset.desc}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1: Campaign Theme & Quick Suggestions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="campaign-title" className="block text-sm font-bold text-slate-900 dark:text-white">
              1. Campaign Theme <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400 dark:text-slate-500">Core message</span>
          </div>

          <input
            id="campaign-title"
            type="text"
            value={formData.campaign_title || ''}
            onChange={(e) => handleInputChange('campaign_title', e.target.value)}
            placeholder="e.g. Save Water: Every Drop Counts"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none dark:bg-slate-800 dark:text-white ${
              errors.campaign_title
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
            <label htmlFor="campaign-desc" className="block text-sm font-bold text-slate-900 dark:text-white">
              2. Visual Scene &amp; Educational Description <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400 dark:text-slate-500">Sent directly as primary subject</span>
          </div>

          <textarea
            id="campaign-desc"
            rows={3}
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the exact scene you want FLUX.1 Dev to depict (e.g. Volunteers cleaning plastic bottles off a sunlit tropical beach with turquoise waves and a sea turtle swimming offshore)..."
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none dark:bg-slate-800 dark:text-white ${
              errors.description
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
                  className={`p-3 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
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
                <button
                  key={style.label}
                  type="button"
                  onClick={() => handleInputChange('image_style', style.label)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-sm font-bold">{style.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{style.desc}</p>
                </button>
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
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold">{aud.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
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
              const pxSize = activePresetMeta.dimensions[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleInputChange('aspect_ratio', item.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">
                      {item.label} ({item.ratio}) • {pxSize}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.purpose}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 7: Additional Instructions */}
        <div className="space-y-2">
          <label htmlFor="art-notes" className="block text-sm font-bold text-slate-900 dark:text-white">
            7. Art Direction Notes <span className="text-xs text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            id="art-notes"
            type="text"
            value={formData.additional_instructions || ''}
            onChange={(e) => handleInputChange('additional_instructions', e.target.value)}
            placeholder="e.g. Crisp blue sky, clean water reflections, golden hour illumination"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 text-sm transition-all focus:outline-none"
          />
        </div>

        {/* Advanced Controls Accordion (Seed & Verbatim Custom Prompt) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Advanced Generation Controls (Seed &amp; Verbatim Prompt Override)</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4 animate-in">
              {/* Seed Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="adv-seed" className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                  id="adv-seed"
                  type="number"
                  value={formData.seed || ''}
                  onChange={(e) => handleInputChange('seed', e.target.value)}
                  placeholder="Leave empty for auto-generated random seed"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>

              {/* Verbatim Custom Prompt */}
              <div className="space-y-1.5">
                <label htmlFor="adv-custom-prompt" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Direct Verbatim FLUX.1 Dev Prompt (Optional Override)
                </label>
                <textarea
                  id="adv-custom-prompt"
                  rows={2}
                  value={formData.custom_prompt || ''}
                  onChange={(e) => handleInputChange('custom_prompt', e.target.value)}
                  placeholder="Optional: if filled, this exact prompt is sent unmodified to FLUX.1 Dev."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Collapsible View AI Prompt Section */}
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
                FLUX.1 Dev Inspector
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{showPromptDebugger ? 'Collapse' : 'Inspect Prompt Before Generation'}</span>
              {showPromptDebugger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showPromptDebugger && (
            <div className="mt-3 p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 space-y-4 shadow-inner animate-in">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    Live FLUX.1 Dev Prompt Inspector
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
                  <span>Preparing prompt preview...</span>
                </div>
              ) : previewData ? (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>1. User Input Summary</span>
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
                        <span className="text-slate-500 block">Preset / Ratio:</span>
                        <span className="font-semibold text-slate-200">
                          {previewData.parameters.preset_label} ({previewData.original_inputs.aspect_ratio})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Description:</span>
                        <span className="font-semibold text-slate-200 truncate block">{previewData.original_inputs.description || '(None)'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>2. Exact Prompt Passed to FLUX.1 Dev</span>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-900/40 text-emerald-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                      {previewData.prompt}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Cpu className="w-3 h-3 text-emerald-400" />
                        <span>3. Active Diffusion Model</span>
                      </div>
                      <div className="text-slate-200 font-semibold text-xs">
                        {previewData.model_info.model_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Provider: <span className="font-mono text-emerald-300">{previewData.model_info.provider}</span> • {previewData.model_info.quantization}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Sliders className="w-3 h-3 text-emerald-400" />
                        <span>4. Inference Parameters</span>
                      </div>
                      <div className="text-slate-200 text-[11px] space-y-0.5">
                        <div>Dimensions: <span className="font-mono text-emerald-300">{previewData.parameters.width}×{previewData.parameters.height}</span> ({previewData.parameters.aspect_ratio})</div>
                        <div>Seed: <span className="font-mono text-emerald-300">{previewData.parameters.seed}</span></div>
                        <div>
                          Steps / Guidance: <span className="font-mono text-slate-300">{previewData.parameters.inference_steps} steps, FluxGuidance {previewData.parameters.guidance_scale} ({previewData.parameters.sampler}/{previewData.parameters.scheduler})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Submit Button & Real-Time ComfyUI Progress Indicator */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          {isGenerating && activeJob ? (
            <div className="p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-3 border-emerald-400 border-t-emerald-700 dark:border-t-emerald-300 animate-spin shrink-0"></div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      Generating with FLUX.1 Dev ({activePreset.label})...
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      {activeJob.stage || 'Waiting for ComfyUI...'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelGeneration}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-center"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>

              <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 dark:bg-emerald-400 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(4, activeJob.progress_pct || 0)}%` }}
                ></div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 pt-1">
                <span>
                  Progress: {activeJob.progress_pct || 0}% (Step {activeJob.step || 0}/{activeJob.max_steps || activePreset.steps})
                </span>
                <span>Elapsed: {activeJob.elapsed_sec || 0}s</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Lossless PNG output • Exact prompt fidelity • Local GPU inference</span>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 font-bold rounded-xl shadow-md transition-all duration-150 text-sm cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 hover:shadow-emerald-600/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Campaign Visual</span>
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
