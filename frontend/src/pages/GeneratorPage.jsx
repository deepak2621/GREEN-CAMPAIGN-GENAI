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
  Image as ImageIcon,
} from 'lucide-react';
import {
  startGenerationJob,
  getGenerationStatus,
  cancelGenerationJob,
  previewPrompt,
  fetchHistory,
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
import { SpotlightCard, MagneticButton, StudioImage } from '../components/MotionPrimitives';

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

  // Recent gallery strip inside workspace
  const [recentCreations, setRecentCreations] = useState([]);

  const pollTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchHistory()
      .then((res) => {
        if (mountedRef.current && Array.isArray(res?.data)) {
          setRecentCreations(res.data.filter((item) => item.image_exists !== false).slice(0, 4));
        }
      })
      .catch(() => {});

    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Live prompt preview when inspector is expanded
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

  const activePresetId = formData.preset || 'fast';
  const activePresetMeta = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0];
  const activePreset = {
    ...activePresetMeta,
    steps: activePresetId === 'quality' ? 26 : 18,
  };
  const currentRatio = formData.aspect_ratio || '1:1';
  const currentResolution = activePresetMeta.dimensions[currentRatio] || '512×512';

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

  const ratioPreviewAspect =
    currentRatio === '16:9'
      ? 'aspect-video'
      : currentRatio === '4:5'
      ? 'aspect-[4/5] max-h-[380px]'
      : 'aspect-square max-h-[360px]';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-in">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>FLUX.1 Dev Studio • 12B Q4_K_S GGUF</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Generative Campaign Workspace
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl">
            Craft environmental visuals with exact prompt fidelity, selectable speed/quality presets,
            and live ComfyUI inference monitoring.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-mono font-medium self-start md:self-auto ${
            isGenerating
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isGenerating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
            }`}
          />
          <span>{isGenerating ? `Rendering ${activeJob?.progress_pct || 0}%` : 'Engine Ready'}</span>
        </div>
      </div>

      {/* Main 2-Column Creative Workspace */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN: Prompt Editor & Parameter Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prompt & Narrative Studio Card */}
          <SpotlightCard className="p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900/[0.06] dark:border-white/[0.06] pb-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Prompt Composition
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                CLIP-L + T5-XXL Q4
              </span>
            </div>

            {/* Campaign Theme */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="campaign-title"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                >
                  Campaign Theme <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Core subject title</span>
              </div>

              <input
                id="campaign-title"
                type="text"
                value={formData.campaign_title || ''}
                onChange={(e) => handleInputChange('campaign_title', e.target.value)}
                placeholder="e.g. Save Water: Every Drop Counts"
                className={`studio-input w-full px-4 py-3 rounded-xl border text-sm bg-slate-900/[0.02] dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder-slate-400 ${
                  errors.campaign_title
                    ? 'border-rose-400 bg-rose-500/5'
                    : 'border-slate-900/12 dark:border-white/10'
                }`}
              />
              {errors.campaign_title && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.campaign_title}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-medium text-slate-400 mr-1">Quick ideas:</span>
                {QUICK_THEMES.map((theme, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleInputChange('campaign_title', theme)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900/[0.04] dark:bg-white/[0.05] hover:bg-emerald-500/12 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 border border-slate-900/[0.08] dark:border-white/[0.08] transition-colors cursor-pointer"
                  >
                    + {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Large Prompt / Scene Description Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="campaign-desc"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                >
                  Visual Scene Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Primary subject verbatim
                </span>
              </div>

              <textarea
                id="campaign-desc"
                rows={4}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the scene, lighting, environment, and action for FLUX.1 Dev (e.g. Sunlit coastal beach cleanup with volunteers collecting plastic bottles beside clear turquoise ocean waves)..."
                className={`studio-input w-full px-4 py-3.5 rounded-2xl border text-sm leading-relaxed bg-slate-900/[0.02] dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder-slate-400 ${
                  errors.description
                    ? 'border-rose-400 bg-rose-500/5'
                    : 'border-slate-900/12 dark:border-white/10'
                }`}
              />
              {errors.description && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Art Direction Notes */}
            <div className="space-y-2">
              <label
                htmlFor="art-notes"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
              >
                Art Direction Notes <span className="text-slate-400 font-normal normal-case">(Optional)</span>
              </label>
              <input
                id="art-notes"
                type="text"
                value={formData.additional_instructions || ''}
                onChange={(e) => handleInputChange('additional_instructions', e.target.value)}
                placeholder="e.g. Golden hour illumination, shallow depth of field, clean framing"
                className="studio-input w-full px-4 py-2.5 rounded-xl border border-slate-900/12 dark:border-white/10 bg-slate-900/[0.02] dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </SpotlightCard>

          {/* Generation Presets & Creative Parameters */}
          <SpotlightCard className="p-6 sm:p-7 space-y-7">
            {/* Speed / Quality Preset */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Inference Mode
                </label>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  FluxGuidance 3.5 • Euler
                </span>
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
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-slate-900 dark:text-white ring-2 ring-emerald-500/15'
                          : 'border-slate-900/10 dark:border-white/[0.08] hover:border-emerald-500/30 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Icon className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-bold">{preset.label}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {preset.desc}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Canvas Aspect Ratio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {RATIOS.map((item) => {
                  const isSelected = currentRatio === item.id;
                  const pxSize = activePresetMeta.dimensions[item.id];
                  const frameClass =
                    item.id === '16:9' ? 'w-6 h-3.5' : item.id === '4:5' ? 'w-4 h-5' : 'w-4.5 h-4.5';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleInputChange('aspect_ratio', item.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-slate-900 dark:text-white ring-2 ring-emerald-500/15'
                          : 'border-slate-900/10 dark:border-white/[0.08] hover:border-emerald-500/30 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900/[0.05] dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                        <span
                          className={`${frameClass} rounded-[3px] border-2 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/20'
                              : 'border-slate-400 dark:border-slate-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">
                          {item.label} ({item.ratio})
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {pxSize}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sustainability Sector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Sustainability Sector <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = formData.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleInputChange('category', cat)}
                      className={`px-3 py-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/15'
                          : 'border-slate-900/10 dark:border-white/[0.08] hover:border-emerald-500/30 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
              {errors.category && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.category}
                </p>
              )}
            </div>

            {/* Visual Style */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Visual Aesthetic <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STYLES.map((style) => {
                  const isSelected = formData.image_style === style.label;
                  return (
                    <button
                      key={style.label}
                      type="button"
                      onClick={() => handleInputChange('image_style', style.label)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-slate-900 dark:text-white ring-2 ring-emerald-500/15'
                          : 'border-slate-900/10 dark:border-white/[0.08] hover:border-emerald-500/30 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">{style.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {style.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
              {errors.image_style && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.image_style}
                </p>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Target Demographic <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((aud) => {
                  const isSelected = formData.target_audience === aud.label;
                  return (
                    <button
                      key={aud.label}
                      type="button"
                      title={aud.desc}
                      onClick={() => handleInputChange('target_audience', aud.label)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
                          : 'border-slate-900/10 dark:border-white/[0.08] hover:border-emerald-500/30 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>{aud.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
              {errors.target_audience && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.target_audience}
                </p>
              )}
            </div>

            {/* Advanced Controls Accordion */}
            <div className="pt-2 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-left py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Advanced Controls (Seed &amp; Direct Verbatim Prompt)</span>
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/[0.08] dark:border-white/[0.08] space-y-4 animate-modal">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="adv-seed" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Seed (Reproducibility)
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
                      className="studio-input w-full px-3 py-2 rounded-xl border border-slate-900/12 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="adv-custom-prompt"
                      className="text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Direct Verbatim FLUX.1 Dev Prompt (Optional Override)
                    </label>
                    <textarea
                      id="adv-custom-prompt"
                      rows={2}
                      value={formData.custom_prompt || ''}
                      onChange={(e) => handleInputChange('custom_prompt', e.target.value)}
                      placeholder="Optional: if filled, sent unmodified straight to FLUX.1 Dev."
                      className="studio-input w-full px-3 py-2 rounded-xl border border-slate-900/12 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Inspector */}
            <div className="pt-2 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowPromptDebugger(!showPromptDebugger)}
                className="flex items-center justify-between w-full text-left py-2.5 px-3.5 rounded-xl bg-slate-900/[0.03] hover:bg-slate-900/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.07] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-900/[0.08] dark:border-white/[0.08]"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span>Inspect Compiled FLUX.1 Dev Prompt</span>
                </div>
                {showPromptDebugger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPromptDebugger && (
                <div className="mt-3 p-4 rounded-2xl bg-[#070b0a] text-slate-100 border border-white/10 space-y-3 animate-modal">
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <Code2 className="w-4 h-4" />
                      <span>Compiled Prompt Preview</span>
                    </div>
                    {previewData && (
                      <button
                        type="button"
                        onClick={copyPromptToClipboard}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.07] hover:bg-white/[0.12] rounded-lg text-[11px] font-medium cursor-pointer"
                      >
                        {copiedPrompt ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>

                  {isLoadingPreview && !previewData ? (
                    <div className="py-4 text-center text-xs text-slate-400">Preparing prompt...</div>
                  ) : previewData ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-black/50 rounded-xl border border-emerald-500/20 text-emerald-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                        {previewData.prompt}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                        <span>
                          {previewData.parameters.width}×{previewData.parameters.height} •{' '}
                          {previewData.parameters.inference_steps} steps
                        </span>
                        <span>
                          Guidance {previewData.parameters.guidance_scale} • {previewData.parameters.sampler}/
                          {previewData.parameters.scheduler}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </SpotlightCard>
        </div>

        {/* RIGHT STICKY COLUMN: Studio Canvas Preview, Generate CTA & Live Telemetry */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          {/* Error Alert */}
          {apiError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 animate-modal">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold">
                    {apiError.type === 'CudaOOMError' ? 'GPU Memory Limit Reached' : 'Generation Error'}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">{apiError.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={executeGeneration}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Studio Viewport Preview & Action Card */}
          <SpotlightCard className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Studio Output Viewport
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                {currentResolution} PNG
              </span>
            </div>

            {/* Dynamic Aspect-Ratio Preview Canvas */}
            <div className="rounded-2xl bg-[#070a09] border border-white/10 p-4 flex items-center justify-center min-h-[260px]">
              <div
                className={`w-full ${ratioPreviewAspect} mx-auto rounded-xl border border-dashed ${
                  isGenerating ? 'border-emerald-500/50 studio-skeleton' : 'border-white/15 bg-white/[0.02]'
                } flex flex-col items-center justify-center p-5 text-center transition-all duration-300`}
              >
                {isGenerating && activeJob ? (
                  <div className="space-y-4 w-full max-w-xs">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">
                        {activeJob.stage || 'Synthesizing with FLUX.1 Dev...'}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-300">
                        Step {activeJob.step || 0} / {activeJob.max_steps || activePreset.steps} •{' '}
                        {activeJob.progress_pct || 0}%
                      </p>
                    </div>

                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-1.5 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, activeJob.progress_pct || 0)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{activePreset.label}</span>
                      <span>{activeJob.elapsed_sec || 0}s elapsed</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-xs">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-200">
                        {formData.campaign_title?.trim() || 'Ready to Render Visual'}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {formData.description?.trim() ||
                          'Enter a theme and scene description on the left to generate a FLUX.1 Dev campaign visual.'}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-slate-300">
                      <span>{activePreset.label}</span>
                      <span>•</span>
                      <span>{currentRatio}</span>
                      <span>•</span>
                      <span>{activePreset.steps} steps</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Generate / Cancel Action */}
            {isGenerating && activeJob ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-950/25 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Generation</span>
              </button>
            ) : (
              <MagneticButton
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/25 hover:shadow-emerald-500/25 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Campaign Visual</span>
              </MagneticButton>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Lossless PNG Verified
              </span>
              <span className="font-mono flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                Local ComfyUI
              </span>
            </div>
          </SpotlightCard>

          {/* Hardware Telemetry */}
          <SystemMonitorCard compact />
        </div>
      </form>

      {/* Responsive Recent Session Gallery */}
      {recentCreations.length > 0 && (
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Recent Studio Outputs
            </h2>
            <span className="text-xs text-slate-400">{recentCreations.length} latest renders</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentCreations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    campaign_title: item.campaign_title,
                    description: item.description,
                    category: item.category,
                    image_style: item.image_style,
                    target_audience: item.target_audience,
                    aspect_ratio: item.aspect_ratio || '1:1',
                    seed: item.seed || '',
                  }))
                }
                className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-900/10 dark:border-white/10 bg-slate-950 text-left cursor-pointer"
              >
                <StudioImage
                  src={item.image_url}
                  alt={item.campaign_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2.5 left-3 right-3">
                  <p className="text-[11px] font-bold text-white truncate">{item.campaign_title}</p>
                  <p className="text-[10px] font-mono text-emerald-300 truncate">{item.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
