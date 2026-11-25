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
  FileX
} from 'lucide-react';
import { fetchHistory, deleteCampaignFromHistory } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';

export default function HistoryPage({ setActivePage, onSelectForRegenerate, showToast }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Deletion modal state
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View modal state
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
      .then(res => {
        if (isMounted) {
          setHistoryItems(res.data || []);
          setLoading(false);
        }
      })
      .catch(err => {
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
      setHistoryItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      showToast('Campaign successfully deleted from history.', 'success');
      setItemToDelete(null);
    } catch (err) {
      showToast(err.message || 'Failed to delete campaign.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (item) => {
    const downloadUrl = item.download_url || `/api/images/${item.filename}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = item.filename || 'sustainability_campaign.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloading visual PNG...", "info");
  };

  // Filtered campaigns
  const filteredItems = historyItems.filter(item => {
    const matchesSearch = 
      item.campaign_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...new Set(historyItems.map(i => i.category).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Campaign Archives
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Saved Campaign Visuals
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Browse, inspect, re-download, or manage previously generated utility sustainability campaigns.
          </p>
        </div>

        <button
          onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm shadow-emerald-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Visual</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by theme or description..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-emerald-700 dark:border-t-emerald-300 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading campaign records from database...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <p className="text-sm text-rose-800 dark:text-rose-300 font-medium">{error}</p>
          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <History className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {historyItems.length === 0 ? "No Saved Campaigns Yet" : "No Matching Campaigns Found"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {historyItems.length === 0
                ? "Generate your first environmental education visual in the dashboard, then click 'Save to History'."
                : "Try adjusting your search query or switching categories."}
            </p>
          </div>
          {historyItems.length === 0 && (
            <button
              onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Campaign Generator</span>
            </button>
          )}
        </div>
      )}

      {/* Campaign Cards Grid */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const formattedItemDate = item.created_at
              ? item.created_at.slice(0, 10)
              : 'Recent';

            return (
              <div
                key={item.id}
                className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Thumbnail Area */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                  {item.image_exists !== false ? (
                    <img
                      src={item.image_url}
                      alt={item.campaign_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                      <FileX className="w-8 h-8 text-slate-500" />
                      <span className="text-xs">Image file moved or missing</span>
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold bg-slate-950/80 backdrop-blur-md text-emerald-400 rounded-full border border-white/10">
                    {item.category}
                  </span>

                  {/* Aspect ratio & seed */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {item.seed && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono bg-black/60 text-emerald-300 rounded border border-white/10">
                        #{item.seed}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-black/60 text-white rounded">
                      {item.aspect_ratio || "1:1"}
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {item.campaign_title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Meta Specs */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Style:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.image_style}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Date:
                      </span>
                      <span>{formattedItemDate}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingItem(item)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="View Full Image & Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDownload(item)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Download PNG"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectForRegenerate(item)}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                      >
                        Remix in Generator
                      </button>

                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete from History"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>
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

      {/* View Modal Lightbox */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 max-h-[90vh] flex flex-col transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {viewingItem.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {viewingItem.campaign_title}
                </h3>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center max-h-[500px]">
              <img
                src={viewingItem.image_url}
                alt={viewingItem.campaign_title}
                className="max-h-[480px] w-auto object-contain rounded"
              />
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 overflow-y-auto pr-1">
              <p><span className="font-bold text-slate-900 dark:text-white">Narrative:</span> {viewingItem.description}</p>
              <p><span className="font-bold text-slate-900 dark:text-white">Style:</span> {viewingItem.image_style} | <span className="font-bold text-slate-900 dark:text-white">Audience:</span> {viewingItem.target_audience} {viewingItem.seed && `| Seed: #${viewingItem.seed}`}</p>
              {viewingItem.generated_prompt && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  <span className="font-bold block mb-1 text-slate-900 dark:text-white">Generated AI Prompt:</span>
                  {viewingItem.generated_prompt}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  onSelectForRegenerate(item);
                }}
                className="px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Load into Generator
              </button>
              <button
                onClick={() => handleDownload(viewingItem)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
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
