import React, { useState } from 'react';
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
  Dices
} from 'lucide-react';
import { saveCampaignToHistory, generateCampaignImage } from '../services/api';

export default function ResultPage({ 
  generatedData, 
  setGeneratedData,
  onEditPrompt, 
  showToast 
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!generatedData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">No Generated Image Found</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Please launch a new visual generation from the generator dashboard.</p>
        <button
          onClick={onEditPrompt}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm cursor-pointer"
        >
          Go to Generator
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
        aspect_ratio: generatedData.aspect_ratio || "1:1",
        generated_prompt: generatedData.generated_prompt,
        negative_prompt: generatedData.negative_prompt,
        image_path: generatedData.file_path || generatedData.filename,
        seed: generatedData.seed
      });
      setIsSaved(true);
      showToast("Campaign visual permanently saved to History!", "success");
    } catch (err) {
      showToast(err.message || "Failed to save campaign to history.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const downloadUrl = generatedData.download_url || `/api/images/${generatedData.filename}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = generatedData.filename || 'sustainability_campaign.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloading high-resolution PNG...", "info");
  };

  const handleRegenerateClick = async () => {
    setIsRegenerating(true);
    try {
      showToast("Regenerating visual with active diffusion model...", "info");
      const res = await generateCampaignImage({
        campaign_title: generatedData.campaign_title,
        description: generatedData.description,
        category: generatedData.category,
        image_style: generatedData.image_style,
        target_audience: generatedData.target_audience,
        aspect_ratio: generatedData.aspect_ratio || "1:1",
        additional_instructions: generatedData.additional_instructions || "",
        seed: generatedData.seed ? generatedData.seed + 1 : undefined
      });
      setGeneratedData(res.data);
      setIsSaved(false);
      showToast("Regenerated visual ready!", "success");
    } catch (err) {
      showToast(err.message || "Regeneration failed.", "error");
    } finally {
      setIsRegenerating(false);
    }
  };

  const formattedDate = generatedData?.created_at
    ? generatedData.created_at.slice(0, 10)
    : 'Recent';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Generation Output
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {generatedData.campaign_title}
          </h1>
        </div>

        {/* Action button toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onEditPrompt}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Edit Parameters</span>
          </button>

          <button
            onClick={handleRegenerateClick}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? "Regenerating..." : "Generate Again"}</span>
          </button>

          <button
            onClick={handleSaveToHistory}
            disabled={isSaved || isSaving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSaved
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-default'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 hover:bg-emerald-100'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Saved to History</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isSaving ? "Saving..." : "Save to History"}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Preview + Campaign Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Large Image Preview */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4 transition-colors">
          <div className="relative group rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[380px] max-h-[640px]">
            <img
              src={generatedData.image_url}
              alt={generatedData.campaign_title}
              className="w-full h-auto object-contain max-h-[600px] rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
              loading="eager"
            />
            
            {/* Resolution & Seed watermark tag */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {generatedData.seed && (
                <div className="px-2 py-0.5 bg-slate-900/80 backdrop-blur-md rounded text-[10px] font-mono text-emerald-300 border border-white/10">
                  Seed: {generatedData.seed}
                </div>
              )}
              <div className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-md text-[11px] font-mono text-white/90 border border-white/10">
                {generatedData.width} × {generatedData.height} PNG
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 px-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Verified Lossless PNG Format
            </span>
            <span>
              Aspect Ratio: {generatedData.aspect_ratio || "1:1"}
            </span>
          </div>
        </div>

        {/* Right column: Campaign Specs & Prompt Details */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Campaign Specifications
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Sector:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-right bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-xs">
                  {generatedData.category}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Style:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">
                  {generatedData.image_style}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Target Audience:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">
                  {generatedData.target_audience}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Date:
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                  {formattedDate}
                </span>
              </div>

              {generatedData.seed && (
                <div className="flex items-start justify-between">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Dices className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Seed:
                  </span>
                  <span className="font-mono text-xs text-slate-800 dark:text-slate-200 text-right">
                    {generatedData.seed}
                  </span>
                </div>
              )}
            </div>

            {/* Campaign narrative */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Campaign Narrative
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
                {generatedData.description}
              </p>
            </div>
          </div>

          {/* AI Prompt Engineering Accordion */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <button
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>FLUX.2 Klein 4B Prompt Specifications</span>
              </div>
              {showPromptDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showPromptDetails && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
                <div>
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Structured Positive Prompt
                  </span>
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 leading-relaxed">
                    {generatedData.generated_prompt}
                  </p>
                </div>

                {generatedData.negative_prompt && (
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Negative Constraints & Category Exclusions
                    </span>
                    <p className="text-xs font-mono text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 leading-relaxed">
                      {generatedData.negative_prompt}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Download callout */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-4">
            <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-0.5">
              <span className="font-bold block">Production-Ready Utility Asset</span>
              <span className="text-emerald-700 dark:text-emerald-400">Suitable for bill inserts, social media, and digital banners.</span>
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Export PNG
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
