import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Trash2,
  Download,
  Eye,
  Sparkles,
  Calendar,
  Palette,
  Search,
  AlertCircle,
  X,
  FileX,
} from 'lucide-react';
import { fetchHistory, deleteCampaignFromHistory } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { downloadImageFile } from '../utils/download';
import { Reveal, SpotlightCard, StudioImage } from '../components/MotionPrimitives';

export default function HistoryPage({ setActivePage, onSelectForRegenerate, showToast }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHistory();
      setHistoryItems(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load campaign history');
      showToast('Could not load history from backend.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;
    fetchHistory()
      .then((res) => {
        if (isMounted) {
          setHistoryItems(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load campaign history');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCampaignFromHistory(itemToDelete.id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      showToast('Campaign successfully deleted from gallery.', 'success');
      setItemToDelete(null);
    } catch (err) {
      showToast(err.message || 'Failed to delete campaign.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (item) => {
    const downloadUrl = item.download_url || `/api/images/${item.filename}/download`;
    downloadImageFile(downloadUrl, item.filename || 'sustainability_campaign.png', showToast);
  };

  const filteredItems = historyItems.filter((item) => {
    const matchesSearch =
      item.campaign_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...new Set(historyItems.map((i) => i.category).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-900/10 dark:border-white/[0.08]">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Campaign Gallery
          </span>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Saved Campaign Visuals
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Inspect, export, or remix your generated sustainability artwork.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActivePage('generator');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-sm shadow-emerald-950/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Visual</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <SpotlightCard className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by theme or description..."
            className="studio-input w-full pl-9 pr-4 py-2 bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-900/[0.04] dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.08] dark:hover:bg-white/[0.1]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </SpotlightCard>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="studio-card rounded-3xl overflow-hidden p-5 space-y-4">
              <div className="aspect-[4/3] rounded-2xl studio-skeleton" />
              <div className="h-4 w-2/3 rounded studio-skeleton" />
              <div className="h-3 w-full rounded studio-skeleton" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">{error}</p>
          <button
            type="button"
            onClick={loadHistory}
            className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <SpotlightCard className="py-16 px-8 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {historyItems.length === 0 ? 'No Saved Campaigns Yet' : 'No Matching Campaigns Found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {historyItems.length === 0
                ? "Generate your first sustainability visual in the Studio, then click 'Save to Gallery'."
                : 'Try adjusting your search query or switching sector filters.'}
            </p>
          </div>
          {historyItems.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setActivePage('generator');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Studio</span>
            </button>
          )}
        </SpotlightCard>
      )}

      {/* Premium Gallery Grid */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => {
            const formattedItemDate = item.created_at ? item.created_at.slice(0, 10) : 'Recent';

            return (
              <Reveal key={item.id} delay={Math.min(idx * 35, 200)}>
                <SpotlightCard
                  interactive
                  className="group rounded-3xl overflow-hidden flex flex-col justify-between h-full"
                >
                  {/* Thumbnail with Smooth Hover Overlay */}
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden flex items-center justify-center">
                    {item.image_exists !== false ? (
                      <StudioImage
                        src={item.image_url}
                        alt={item.campaign_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                        <FileX className="w-8 h-8 text-slate-500" />
                        <span className="text-xs">Image file moved or missing</span>
                      </div>
                    )}

                    {/* Hover Overlay Quick Actions */}
                    {item.image_exists !== false && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5 z-10">
                        <button
                          type="button"
                          onClick={() => setViewingItem(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-lg hover:bg-emerald-400 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg hover:bg-emerald-500 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PNG</span>
                        </button>
                      </div>
                    )}

                    <span className="absolute top-3 left-3 px-2.5 py-0.5 text-[10px] font-mono font-medium bg-black/65 backdrop-blur-md text-emerald-300 rounded-full border border-white/15 z-10">
                      {item.category}
                    </span>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {item.seed && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-black/65 text-emerald-300 rounded border border-white/10">
                          #{item.seed}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-black/65 text-white rounded">
                        {item.aspect_ratio || '1:1'}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.campaign_title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2.5 border-t border-slate-900/[0.06] dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-emerald-500" /> Style
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.image_style}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Created
                        </span>
                        <span className="font-mono">{formattedItemDate}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-900/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingItem(item)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Inspect Image & Prompt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Download PNG"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectForRegenerate(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          Remix
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete from Gallery"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={Boolean(itemToDelete)}
        title="Delete Campaign Visual"
        message={`Are you sure you want to permanently delete "${itemToDelete?.campaign_title}"? This will remove the SQLite history record and the generated PNG file.`}
        confirmLabel="Delete Campaign"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Lightbox Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
          <div className="bg-white dark:bg-[#0e1512] rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden space-y-4 max-h-[90vh] flex flex-col animate-modal">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  {viewingItem.category}
                </span>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {viewingItem.campaign_title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                aria-label="Close preview modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#060908] rounded-2xl overflow-hidden flex items-center justify-center max-h-[480px] border border-white/10">
              <img
                src={viewingItem.image_url}
                alt={viewingItem.campaign_title}
                className="max-h-[460px] w-auto object-contain"
              />
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 overflow-y-auto pr-1">
              <p>
                <span className="font-bold text-slate-900 dark:text-white">Narrative:</span>{' '}
                {viewingItem.description}
              </p>
              <p className="font-mono text-[11px]">
                Style: {viewingItem.image_style} | Audience: {viewingItem.target_audience}{' '}
                {viewingItem.seed && `| Seed: #${viewingItem.seed}`}
              </p>
              {viewingItem.generated_prompt && (
                <div className="bg-slate-900/[0.03] dark:bg-black/40 p-3 rounded-xl border border-slate-900/[0.08] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  <span className="font-bold block mb-1 text-slate-900 dark:text-white">
                    Prompt:
                  </span>
                  {viewingItem.generated_prompt}
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-900/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  onSelectForRegenerate(item);
                }}
                className="px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer"
              >
                Load into Studio
              </button>
              <button
                type="button"
                onClick={() => handleDownload(viewingItem)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
