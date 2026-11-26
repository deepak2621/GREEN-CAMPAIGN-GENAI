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
import { StudioImage } from '../components/MotionPrimitives';

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
  const pollInFlightRef = useRef(false);
  const pollRetriesRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchHistory()
      .then((res) => {
        if (mountedRef.current && Array.isArray(res?.data)) {
          const seen = new Set();
          const unique = [];
          for (const item of res.data) {
            if (item.image_exists !== false && !seen.has(item.id)) {
              seen.add(item.id);
              unique.push(item);
            }
          }
          setRecentCreations(unique.slice(0, 4));
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
      newErrors.category = 'Please select a sustainability sector.';
    }
    if (!formData.image_style) {
      newErrors.image_style = 'Please select a visual style.';
    }
    if (!formData.target_audience) {
      newErrors.target_audience = 'Please specify a target demographic.';
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
    steps: activePresetId === 'quality' ? 8 : 4,
  };
  const currentRatio = formData.aspect_ratio || '1:1';
  const currentRatioMeta = RATIOS.find((r) => r.id === currentRatio) || RATIOS[0];
  const currentResolution = activePresetMeta.dimensions[currentRatio] || '512×512';

  const executeGeneration = async () => {
    if (isGenerating) return;

    setApiError(null);
    if (!validateForm()) {
      showToast('Please fill in all required fields before generating.', 'warning');
      return;
    }

    setIsGenerating(true);
    pollInFlightRef.current = false;
    pollRetriesRef.current = 0;
    setActiveJob({
      status: 'queued',
      stage: 'Loading the image-generation model...',
      progress_pct: 4,
      step: 0,
      max_steps: activePreset.steps,
      elapsed_sec: 0,
    });

    const maxPollMs = 320000;
    const startedAt = Date.now();

    try {
      const initialJob = await startGenerationJob(formData);
      if (!mountedRef.current) return;
      setActiveJob(initialJob);

      const jobId = initialJob.job_id;
      pollTimerRef.current = setInterval(async () => {
        if (pollInFlightRef.current) return;

        if (Date.now() - startedAt > maxPollMs) {
          stopPolling();
          if (!mountedRef.current) return;
          setIsGenerating(false);
          setActiveJob(null);
          const timeoutMsg = 'Image generation took too long. Please try again.';
          setApiError({ type: 'TimeoutError', message: timeoutMsg });
          showToast(timeoutMsg, 'error');
          return;
        }

        pollInFlightRef.current = true;
        try {
          const job = await getGenerationStatus(jobId);
          pollRetriesRef.current = 0;
          if (!mountedRef.current) return;
          setActiveJob(job);

          if (job.status === 'completed' && job.result) {
            if (!job.result.image_url) {
              throw new Error('Generated image URL is missing from server response.');
            }
            stopPolling();
            setIsGenerating(false);
            setActiveJob(null);
            showToast('Your image has been generated successfully.', 'success');
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
            const msg = job.error || 'Image generation failed. Please try again.';
            setApiError({ type: job.error_type || 'GenerationError', message: msg });
            showToast(msg, 'error');
          }
        } catch (pollErr) {
          const isTransient =
            pollErr?.statusCode === 502 ||
            pollErr?.statusCode === 503 ||
            pollErr?.errorCode === 'BACKEND_UNAVAILABLE' ||
            pollErr?.errorCode === 'EMPTY_RESPONSE';

          if (isTransient && pollRetriesRef.current < 3) {
            pollRetriesRef.current += 1;
            return;
          }

          stopPolling();
          if (!mountedRef.current) return;
          setIsGenerating(false);
          setActiveJob(null);
          const msg = pollErr.message || 'Image-generation service is currently unavailable.';
          setApiError({ type: pollErr.errorType || 'GenerationError', message: msg });
          showToast(msg, 'error');
        } finally {
          pollInFlightRef.current = false;
        }
      }, 750);
    } catch (err) {
      stopPolling();
      setIsGenerating(false);
      setActiveJob(null);
      const msg = err.message || 'Image-generation service is currently unavailable.';
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
      showToast(err.message || 'Unable to cancel generation.', 'error');
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
      ? 'aspect-[4/5] max-h-[400px]'
      : 'aspect-square max-h-[380px]';

  const friendlyStage = (() => {
    if (!activeJob) return 'Creating your sustainability visual...';
    const st = activeJob.status;
    if (st === 'queued') return 'Queuing your sustainability campaign...';
    if (st === 'loading_model') return 'Loading the image-generation model...';
    if (st === 'encoding') return 'Interpreting your campaign prompt...';
    if (st === 'sampling') {
      return activeJob.step && activeJob.max_steps
        ? `Creating your sustainability visual (${activeJob.step}/${activeJob.max_steps})...`
        : 'Creating your sustainability visual...';
    }
    if (st === 'decoding') return 'Finalizing high-resolution PNG...';
    return activeJob.stage || 'Creating your sustainability visual...';
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-in">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>AI Creative Studio</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Design Sustainability Visuals
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            Describe your environmental campaign idea, choose a visual style and canvas format, and
            render high-impact educational artwork.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold self-start sm:self-auto ${
            isGenerating
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isGenerating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
            }`}
          />
          <span>{isGenerating ? `Creating (${activeJob?.progress_pct || 0}%)` : 'Studio Ready'}</span>
        </div>
      </div>

      {/* Balanced 2-Column Workspace (24px–32px Grid Rhythm) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT PANEL: CAMPAIGN CONFIGURATION */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Prompt Input Card */}
          <section className="studio-card rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.07] pb-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  1. Campaign Prompt
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Define your core environmental message and the scene you want illustrated.
                </p>
              </div>
            </div>

            {/* Campaign Theme */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="campaign-title"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  Campaign Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">Headline concept</span>
              </div>

              <input
                id="campaign-title"
                type="text"
                value={formData.campaign_title || ''}
                onChange={(e) => handleInputChange('campaign_title', e.target.value)}
                placeholder="e.g. Save Water: Every Drop Counts"
                className={`studio-input w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder-slate-400 ${
                  errors.campaign_title
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-500/5'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors.campaign_title && (
                <p className="text-xs font-medium text-rose-500 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.campaign_title}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Suggestions:
                </span>
                {QUICK_THEMES.map((theme, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleInputChange('campaign_title', theme)}
                    className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
                  >
                    + {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Scene Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="campaign-desc"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  Visual Scene Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Preserved verbatim
                </span>
              </div>

              <textarea
                id="campaign-desc"
                rows={4}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the scene, environment, subjects, and mood (e.g. Sunlit coastal beach cleanup with volunteers collecting plastic bottles beside clear turquoise ocean waves)..."
                className={`studio-input w-full px-4 py-3.5 rounded-xl border text-sm leading-relaxed bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder-slate-400 ${
                  errors.description
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-500/5'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors.description && (
                <p className="text-xs font-medium text-rose-500 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Art Direction Notes */}
            <div className="space-y-2">
              <label
                htmlFor="art-notes"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                Art Direction Notes{' '}
                <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="art-notes"
                type="text"
                value={formData.additional_instructions || ''}
                onChange={(e) => handleInputChange('additional_instructions', e.target.value)}
                placeholder="e.g. Golden hour sunlight, clean composition, natural textures"
                className="studio-input w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </section>

          {/* 2. Canvas Aspect Ratio & Output Quality */}
          <section className="studio-card rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="space-y-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  2. Canvas Aspect Ratio &amp; Quality
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select your campaign dimensions and rendering detail level.
                </p>
              </div>

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
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-3 h-full ${
                        isSelected
                          ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                        <span
                          className={`${frameClass} rounded-[3px] border-2 ${
                            isSelected
                              ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-500/15'
                              : 'border-slate-400 dark:border-slate-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">
                          {item.label} ({item.ratio})
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                          {pxSize}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-white/[0.07]">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                Generation Mode
              </label>

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
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex items-start justify-between gap-3 h-full disabled:opacity-60 ${
                        isSelected
                          ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-bold">{preset.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {preset.id === 'fast'
                            ? 'Balanced speed for quick campaign drafting and concept exploration.'
                            : 'Higher resolution and finer detail for finished campaign posters.'}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Sustainability Sector */}
          <section className="studio-card rounded-2xl p-6 sm:p-7 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                3. Sustainability Sector <span className="text-rose-500">*</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Categorize your campaign to align thematic framing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = formData.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleInputChange('category', cat)}
                    className={`px-4 py-3 rounded-xl text-left border text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <p className="text-xs font-medium text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.category}
              </p>
            )}
          </section>

          {/* 4. Visual Aesthetic */}
          <section className="studio-card rounded-2xl p-6 sm:p-7 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                4. Visual Aesthetic <span className="text-rose-500">*</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose the illustration or photography treatment for your campaign.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLES.map((style) => {
                const isSelected = formData.image_style === style.label;
                return (
                  <button
                    key={style.label}
                    type="button"
                    onClick={() => handleInputChange('image_style', style.label)}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between gap-1.5 h-full ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs font-bold">{style.label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {style.desc}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.image_style && (
              <p className="text-xs font-medium text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.image_style}
              </p>
            )}
          </section>

          {/* 5. Target Demographic */}
          <section className="studio-card rounded-2xl p-6 sm:p-7 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                5. Target Demographic <span className="text-rose-500">*</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tailor the tone and visual context for your intended audience.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {AUDIENCES.map((aud) => {
                const isSelected = formData.target_audience === aud.label;
                return (
                  <button
                    key={aud.label}
                    type="button"
                    onClick={() => handleInputChange('target_audience', aud.label)}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between gap-1.5 h-full ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs font-bold">{aud.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {aud.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.target_audience && (
              <p className="text-xs font-medium text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.target_audience}
              </p>
            )}
          </section>

          {/* 6 & 7. Advanced Controls + Compiled Prompt Inspection */}
          <section className="studio-card rounded-2xl p-6 sm:p-7 space-y-4">
            {/* 6. Advanced Controls */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-left py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>6. Advanced Controls (Seed &amp; Custom Prompt)</span>
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-4 animate-modal">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="adv-seed" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Seed (Reproducibility)
                      </label>
                      <button
                        type="button"
                        onClick={randomizeSeed}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
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
                      placeholder="Leave empty for a random seed"
                      className="studio-input w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="adv-custom-prompt"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                    >
                      Direct Custom Prompt Override (Optional)
                    </label>
                    <textarea
                      id="adv-custom-prompt"
                      rows={2}
                      value={formData.custom_prompt || ''}
                      onChange={(e) => handleInputChange('custom_prompt', e.target.value)}
                      placeholder="Optional: enter an exact custom prompt to send directly without modification."
                      className="studio-input w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 7. Compiled Prompt Inspection */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => setShowPromptDebugger(!showPromptDebugger)}
                className="flex items-center justify-between w-full text-left py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>7. Compiled Prompt Inspection</span>
                </div>
                {showPromptDebugger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPromptDebugger && (
                <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3 animate-modal">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Code2 className="w-4 h-4" />
                      <span>Compiled Campaign Prompt</span>
                    </div>
                    {previewData && (
                      <button
                        type="button"
                        onClick={copyPromptToClipboard}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        {copiedPrompt ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>

                  {isLoadingPreview && !previewData ? (
                    <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      Preparing prompt preview...
                    </div>
                  ) : previewData ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 bg-white dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-emerald-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                        {previewData.prompt}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Format: {previewData.parameters.width}×{previewData.parameters.height} PNG</span>
                        <span>Mode: {previewData.parameters.preset_label}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT PANEL: IMAGE OUTPUT WORKSPACE */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          {/* Error Banner */}
          {apiError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 animate-modal">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold">Unable to Generate Visual</h4>
                  <p className="text-xs leading-relaxed opacity-90">{apiError.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={executeGeneration}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          <div className="studio-card rounded-2xl p-6 space-y-6">
            {/* Viewport Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Campaign Preview Canvas
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                {currentResolution} PNG
              </span>
            </div>

            {/* Theme-Adaptive Output Viewport Container */}
            <div className="rounded-2xl bg-slate-100/90 dark:bg-[#090e0c] border border-slate-200 dark:border-white/10 p-5 flex items-center justify-center min-h-[340px] sm:min-h-[390px] transition-colors duration-300">
              <div
                className={`w-full ${ratioPreviewAspect} mx-auto rounded-xl border border-dashed ${
                  isGenerating
                    ? 'border-emerald-500/60 bg-white dark:bg-white/[0.03] studio-skeleton'
                    : 'border-slate-300 dark:border-white/15 bg-white/85 dark:bg-white/[0.02]'
                } flex flex-col items-center justify-center p-6 text-center transition-colors duration-300`}
              >
                {isGenerating && activeJob ? (
                  <div className="space-y-4 w-full max-w-xs">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 dark:border-t-emerald-400 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {friendlyStage}
                      </p>
                      <p className="text-xs font-mono text-emerald-700 dark:text-emerald-300">
                        {activeJob.progress_pct || 0}% complete
                      </p>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 dark:bg-emerald-400 h-2 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, activeJob.progress_pct || 0)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{activePreset.label}</span>
                      <span className="font-mono">{activeJob.elapsed_sec || 0}s</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-w-xs">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formData.campaign_title?.trim() || 'Your Campaign Visual Appears Here'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {formData.description?.trim() ||
                          'Complete your campaign prompt and style selections on the left, then generate your artwork.'}
                      </p>
                    </div>
                    <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      <span>{formData.category}</span>
                      <span>•</span>
                      <span>{currentRatioMeta.label}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Generate / Cancel Button */}
            {isGenerating && activeJob ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="w-full h-12 flex items-center justify-center gap-2 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Generation</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isGenerating}
                className="group w-full h-12 flex items-center justify-center gap-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-950/15 hover:shadow-lg hover:shadow-emerald-950/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0d1210]"
              >
                <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>Generate Campaign Visual</span>
              </button>
            )}

            {/* User-Friendly Creative Summary */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.07] grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 dark:text-slate-500 block">Sector</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {formData.category}
                </span>
              </div>
              <div className="space-y-0.5 text-right">
                <span className="text-slate-400 dark:text-slate-500 block">Style</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {formData.image_style}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 dark:text-slate-500 block">Canvas Format</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {currentRatioMeta.label} ({currentRatio})
                </span>
              </div>
              <div className="space-y-0.5 text-right">
                <span className="text-slate-400 dark:text-slate-500 block">Export</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Lossless PNG
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Responsive Recent Studio Gallery */}
      {recentCreations.length > 0 && (
        <section className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Recent Creations
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Click any visual to reuse its settings
            </span>
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
                className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950 text-left cursor-pointer"
              >
                <StudioImage
                  src={item.image_url}
                  alt={item.campaign_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs font-bold text-white truncate">{item.campaign_title}</p>
                  <p className="text-[11px] text-emerald-300 truncate">{item.category}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
