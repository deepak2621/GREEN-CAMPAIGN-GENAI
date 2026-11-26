import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  RotateCcw,
  Edit3,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  Palette,
  Users,
  ShieldCheck,
  FileCheck,
  Dices,
  Clock,
  Cpu,
} from 'lucide-react';
import {
  saveCampaignToHistory,
  startGenerationJob,
  getGenerationStatus,
} from '../services/api';
import { downloadImageFile } from '../utils/download';
import { SpotlightCard, MagneticButton, StudioImage } from '../components/MotionPrimitives';

export default function ResultPage({
  generatedData,
  setGeneratedData,
  onEditPrompt,
  showToast,
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const regenTimerRef = useRef(null);
  const regenMountedRef = useRef(true);

  useEffect(() => {
    regenMountedRef.current = true;
    return () => {
      regenMountedRef.current = false;
      if (regenTimerRef.current) clearInterval(regenTimerRef.current);
    };
  }, []);

  if (!generatedData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          No Generated Visual Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Launch a new visual generation from the Studio workspace.
        </p>
        <button
          type="button"
          onClick={onEditPrompt}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm cursor-pointer"
        >
          Open Studio
        </button>
      </div>
    );
  }

  const handleSaveToHistory = async () => {
    if (isSaved || isSaving) return;

    setIsSaving(true);
    try {
      await saveCampaignToHistory({
        campaign_title: generatedData.campaign_title,
        description: generatedData.description,
        category: generatedData.category,
        image_style: generatedData.image_style,
        target_audience: generatedData.target_audience,
        aspect_ratio: generatedData.aspect_ratio || '1:1',
        generated_prompt: generatedData.generated_prompt,
        negative_prompt: generatedData.negative_prompt,
        image_path: generatedData.file_path || generatedData.filename,
        seed: generatedData.seed,
      });
      setIsSaved(true);
      showToast('Campaign visual saved to Gallery!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save campaign to history.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const downloadUrl =
      generatedData.download_url || `/api/images/${generatedData.filename}/download`;
    downloadImageFile(
      downloadUrl,
      generatedData.filename || 'sustainability_campaign.png',
      showToast
    );
  };

  const handleRegenerateClick = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    let inFlight = false;
    let transientRetries = 0;
    const startedAt = Date.now();

    const finish = () => {
      if (regenTimerRef.current) {
        clearInterval(regenTimerRef.current);
        regenTimerRef.current = null;
      }
      if (regenMountedRef.current) {
        setIsRegenerating(false);
      }
    };

    try {
      showToast('Generating a new FLUX.2 Klein 4B variation...', 'info');
      const job = await startGenerationJob({
        campaign_title: generatedData.campaign_title,
        description: generatedData.description,
        category: generatedData.category,
        image_style: generatedData.image_style,
        target_audience: generatedData.target_audience,
        aspect_ratio: generatedData.aspect_ratio || '1:1',
        preset: generatedData.preset || 'fast',
        additional_instructions: generatedData.additional_instructions || '',
        seed: generatedData.seed ? Number(generatedData.seed) + 1 : undefined,
      });

      regenTimerRef.current = setInterval(async () => {
        if (inFlight) return;
        if (Date.now() - startedAt > 320000) {
          finish();
          showToast('Image generation took too long. Please try again.', 'error');
          return;
        }
        inFlight = true;
        try {
          const status = await getGenerationStatus(job.job_id);
          transientRetries = 0;
          if (!regenMountedRef.current) {
            finish();
            return;
          }
          if (status.status === 'completed' && status.result?.image_url) {
            finish();
            setGeneratedData(status.result);
            setIsSaved(false);
            showToast('Your image has been generated successfully.', 'success');
          } else if (status.status === 'error') {
            finish();
            showToast(status.error || 'Variation generation failed.', 'error');
          } else if (status.status === 'cancelled') {
            finish();
            showToast('Variation generation cancelled.', 'info');
          }
        } catch (pollErr) {
          const isTransient =
            pollErr?.statusCode === 502 ||
            pollErr?.statusCode === 503 ||
            pollErr?.errorCode === 'BACKEND_UNAVAILABLE' ||
            pollErr?.errorCode === 'EMPTY_RESPONSE';
          if (isTransient && transientRetries < 3) {
            transientRetries += 1;
            return;
          }
          finish();
          showToast(pollErr.message || 'Image-generation service is currently unavailable.', 'error');
        } finally {
          inFlight = false;
        }
      }, 750);
    } catch (err) {
      finish();
      showToast(err.message || 'Variation generation failed.', 'error');
    }
  };

  const formattedDate = generatedData?.created_at
    ? generatedData.created_at.slice(0, 10)
    : 'Recent';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-900/10 dark:border-white/[0.08]">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            FLUX.2 Klein 4B Render
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {generatedData.campaign_title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onEditPrompt}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl studio-card hover:border-emerald-500/35 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Prompt</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerateClick}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl studio-card hover:border-emerald-500/35 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Rendering...' : 'Generate Variation'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToHistory}
            disabled={isSaved || isSaving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isSaved
                ? 'bg-slate-900/[0.05] dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-900/10 dark:border-white/10 cursor-default'
                : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Saved to Gallery</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isSaving ? 'Saving...' : 'Save to Gallery'}</span>
              </>
            )}
          </button>

          <MagneticButton
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/25 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </MagneticButton>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Studio Image Viewport */}
        <SpotlightCard className="lg:col-span-7 p-4 sm:p-5 space-y-4">
          <div className="relative group rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#080d0b] border border-slate-200 dark:border-white/10 flex items-center justify-center min-h-[380px] max-h-[640px] transition-colors">
            <StudioImage
              key={generatedData.filename || generatedData.image_url}
              src={generatedData.image_url}
              alt={generatedData.campaign_title}
              loading="eager"
              className="w-full h-auto object-contain max-h-[600px] transition-transform duration-500 group-hover:scale-[1.015]"
            />

            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {generatedData.seed && (
                <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-lg text-[10px] font-mono text-emerald-300 border border-white/10">
                  Seed: {generatedData.seed}
                </div>
              )}
              <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-lg text-[11px] font-mono text-white/90 border border-white/10">
                {generatedData.width} × {generatedData.height} PNG
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Verified Lossless PNG
            </span>
            <span className="font-mono">Aspect Ratio: {generatedData.aspect_ratio || '1:1'}</span>
          </div>
        </SpotlightCard>

        {/* Metadata & Specs */}
        <div className="lg:col-span-5 space-y-5">
          <SpotlightCard className="p-6 space-y-5">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-900/[0.06] dark:border-white/[0.06] pb-3">
              Campaign Specifications
            </h3>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" /> Sector
                </span>
                <span className="font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-xs border border-emerald-500/20">
                  {generatedData.category}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                  <Palette className="w-3.5 h-3.5 text-emerald-500" /> Style
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-xs">
                  {generatedData.image_style}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-emerald-500" /> Audience
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-xs">
                  {generatedData.target_audience}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                  <Cpu className="w-3.5 h-3.5 text-emerald-500" /> Engine
                </span>
                <span className="font-mono text-slate-900 dark:text-white text-xs text-right">
                  {generatedData.model || 'FLUX.2 Klein 4B Q4'}
                  {generatedData.preset_label ? ` • ${generatedData.preset_label}` : ''}
                </span>
              </div>

              {generatedData.generation_time_sec != null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" /> Render Time
                  </span>
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                    {generatedData.generation_time_sec}s
                    {generatedData.model_load_time_sec ? ` (load ${generatedData.model_load_time_sec}s)` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Date
                </span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                  {formattedDate}
                </span>
              </div>

              {generatedData.seed && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                    <Dices className="w-3.5 h-3.5 text-emerald-500" /> Seed
                  </span>
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                    {generatedData.seed}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
              <span className="block text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Campaign Narrative
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-900/[0.03] dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-900/[0.06] dark:border-white/[0.06]">
                {generatedData.description}
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard className="overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>FLUX.2 Klein 4B Prompt &amp; Specs</span>
              </div>
              {showPromptDetails ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showPromptDetails && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-900/[0.06] dark:border-white/[0.06] space-y-3 animate-modal">
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-900/[0.03] dark:bg-black/40 p-3 rounded-xl border border-slate-900/[0.06] dark:border-white/[0.08] leading-relaxed">
                  {generatedData.generated_prompt}
                </p>

                {generatedData.steps && (
                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-900/[0.03] dark:bg-white/[0.03] p-2.5 rounded-xl">
                    Steps: {generatedData.steps} • CFG: {generatedData.cfg_scale ?? generatedData.guidance_scale} •{' '}
                    {generatedData.sampler}/{generatedData.scheduler}
                  </div>
                )}
              </div>
            )}
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
