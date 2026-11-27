import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Server,
  Tv,
  Film,
  Search,
  X,
  Check,
  RotateCcw,
  Download,
  Upload,
  Shield,
  Eye,
  TrendingUp,
  LayoutGrid,
  Sparkles,
  SlidersHorizontal,
  ExternalLink,
  Layers,
  AlertTriangle,
  Play,
  Megaphone,
  Tag,
  Globe,
  Send,
  Zap,
  Copy
} from 'lucide-react';
import {
  MediaItem,
  CategoryId,
  CATEGORIES_ORDERED,
  MediaType,
  ServerSource,
  Season,
  Episode,
  AdSettings
} from '../types';
import { AdsManagerModal } from './AdsManagerModal';
import {
  getStoredAdSettings,
  saveAdSettings,
  saveSingleMediaItemToCloud,
  deleteMediaItemFromCloud,
  saveMediaItems
} from '../services/storage';
import { normalizeImageUrl, isHtmlViewerImageUrl, getLatestEpisodeNumber } from '../utils/imageHelper';
import { getMediaUrl, getEpisodeUrl } from '../utils/routes';

interface AdminDashboardProps {
  items: MediaItem[];
  onSaveItems: (items: MediaItem[]) => void;
  onResetCatalog: () => Promise<void> | void;
  onClose: () => void;
}

const getSiteBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://egyturk.app';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  onSaveItems,
  onResetCatalog,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'views' | 'rating' | 'date'>('views');

  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const [isAdsModalOpen, setIsAdsModalOpen] = useState<boolean>(false);
  const [isSeoGuideOpen, setIsSeoGuideOpen] = useState<boolean>(false);
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveAdSettings = (newSettings: AdSettings) => {
    setAdSettings(newSettings);
    saveAdSettings(newSettings);
    showToast('تم حفظ إعدادات الإعلانات بنجاح.');
  };

  const filteredItems = items
    .filter(item => {
      const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.originalTitle && item.originalTitle.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const deletedTitle = itemToDelete.title;
    try {
      await deleteMediaItemFromCloud(itemToDelete.id);
      const updated = items.filter(i => i.id !== itemToDelete.id);
      onSaveItems(updated);
      setItemToDelete(null);
      showToast(`تم حذف "${deletedTitle}" بنجاح من السحابة وجميع الأجهزة.`);
    } catch (err: any) {
      showToast(`خطأ أثناء الحذف من السحابة: ${err?.message || 'تعذر الحذف'}`);
    }
  };

  const handleSaveItem = async (savedItem: MediaItem) => {
    try {
      await saveSingleMediaItemToCloud(savedItem);
      const exists = items.some(i => i.id === savedItem.id);
      let updated: MediaItem[];
      if (exists) {
        updated = items.map(i => (i.id === savedItem.id ? savedItem : i));
        showToast('تم تحديث العمل ومزامنته سحابياً بنجاح.');
      } else {
        updated = [savedItem, ...items];
        showToast('تمت إضافة العمل ومزامنته سحابياً بنجاح.');
      }
      onSaveItems(updated);
      setEditingItem(null);
      setIsNewModalOpen(false);
    } catch (err: any) {
      showToast(`فشل الحفظ في السحابة: ${err?.message || 'خطأ غير متوقع'}`);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `egyturk-backup-${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    showToast('تم تصدير نسخة احتياطية من كتالوج ايجي تورك بنجاح.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            await saveMediaItems(parsed);
            onSaveItems(parsed);
            showToast('تم استيراد الكتالوج ومزامنته سحابياً بنجاح.');
          } else {
            showToast('خطأ: ملف النسخة الاحتياطية غير متطابق.');
          }
        } catch {
          showToast('تعذر قراءة ملف JSON أو الحفظ في السحابة.');
        }
      };
    }
  };

  const handleExportSitemapXml = () => {
    const baseUrl = getSiteBaseUrl();
    const today = new Date().toISOString().slice(0, 10);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/?tab=drama</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/?tab=action</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/?tab=historical</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/?tab=movies</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/?tab=series</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;

    items.forEach(item => {
      xml += `  <url><loc>${baseUrl}${getMediaUrl(item.id)}</loc><lastmod>${(item.createdAt || today).slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.85</priority></url>\n`;
      if (item.type === 'series' && item.seasons) {
        item.seasons.forEach(s => {
          s.episodes?.forEach(ep => {
            xml += `  <url><loc>${baseUrl}${getEpisodeUrl(item.id, ep.episodeNumber || ep.id)}</loc><lastmod>${(item.createdAt || today).slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.80</priority></url>\n`;
          });
        });
      }
    });

    xml += `</urlset>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', url);
    dlAnchor.setAttribute('download', 'sitemap.xml');
    dlAnchor.click();
    showToast('تم تصدير ملف خريطة الموقع sitemap.xml المحدث لكافة الأعمال التركية بنجاح!');
  };

  const siteBase = getSiteBaseUrl();

  return (
    <div className="fixed inset-0 z-50 bg-[#060608] overflow-y-auto text-zinc-100">
      <header className="sticky top-0 z-30 bg-[#0b0b10]/95 backdrop-blur-md border-b border-zinc-800 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] via-[#881337] to-[#4c0519] shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>لوحة تحكم ايجي تورك المتقدمة</span>
              <span className="text-xs px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-mono">
                EGY TURK STUDIO
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              إدارة احترافية منظمة للمسلسلات والأفلام التركية المترجمة والمواسم وسيرفرات البث
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsSeoGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 hover:from-emerald-900/80 hover:to-teal-900/80 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs sm:text-sm font-bold transition-all shadow-sm"
            title="دليل تصدر محرك بحث جوجل وأرشفة الموقع الفورية"
          >
            <Globe className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">سيو وأرشفة جوجل ⚡</span>
          </button>

          <button
            onClick={() => setIsAdsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-red-300 hover:text-white text-xs sm:text-sm font-bold transition-all"
            title="إدارة أكواد الإعلانات في الموقع"
          >
            <Megaphone className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">إدارة الإعلانات</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsNewModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-900/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عمل تركي جديد</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#161620] border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="خروج من لوحة التحكم"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0e0e14] border border-red-500/50 text-red-300 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4 text-red-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-[#101016] border border-zinc-800/90 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">إجمالي الكتالوج التركي</p>
              <h4 className="text-lg sm:text-xl font-black text-white">{items.length} عمل</h4>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#101016] border border-zinc-800/90 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">أفلام تركية</p>
              <h4 className="text-lg sm:text-xl font-black text-white">
                {items.filter(i => i.type === 'movie').length} فيلم
              </h4>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#101016] border border-zinc-800/90 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">مسلسلات تركية</p>
              <h4 className="text-lg sm:text-xl font-black text-white">
                {items.filter(i => i.type === 'series').length} مسلسل
              </h4>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#101016] border border-zinc-800/90 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">إجمالي المشاهدات</p>
              <h4 className="text-lg sm:text-xl font-black text-white font-mono">
                {items.reduce((acc, curr) => acc + (curr.views || 0), 0).toLocaleString('ar-EG')}
              </h4>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#101016] border border-zinc-800 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم العربي أو التركي الأصلي..."
                className="w-full bg-[#161620] border border-zinc-700/80 focus:border-[#b91c1c] rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#161620] border border-zinc-700/80 rounded-xl p-1 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-red-400 mr-1" />
                <button
                  onClick={() => setSortBy('views')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
                    sortBy === 'views' ? 'bg-[#881337] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  الأعلى مشاهدة (الرائج)
                </button>
                <button
                  onClick={() => setSortBy('rating')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
                    sortBy === 'rating' ? 'bg-[#881337] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  التقييم
                </button>
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
                    sortBy === 'date' ? 'bg-[#881337] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  الأحدث
                </button>
              </div>

              <div className="flex items-center gap-1.5 mr-auto md:mr-0">
                <button
                  onClick={handleExportJson}
                  className="p-2 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="تصدير نسخة احتياطية من الكتالوج (JSON)"
                >
                  <Download className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline">نسخة احتياطية</span>
                </button>

                <label
                  className="p-2 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="استيراد كتالوج من ملف JSON"
                >
                  <Upload className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline">استيراد</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="p-2 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-rose-400 transition-colors"
                  title="استعادة الكتالوج الافتراضي"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-zinc-800/80 pt-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                  : 'bg-[#161620] text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              الكل ({items.length})
            </button>
            {CATEGORIES_ORDERED.map(cat => {
              const count = items.filter(i => i.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                      : 'bg-[#161620] text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span>{cat.titleAr}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-zinc-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#101016] border border-zinc-800 space-y-3">
            <LayoutGrid className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-white">لا توجد أعمال مطابقة لبحثك</h3>
            <p className="text-xs text-zinc-400">جرب البحث بكلمة أخرى أو تغيير القسم المحدد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const isSeries = item.type === 'series';
              const serverCount = isSeries
                ? item.seasons?.reduce(
                    (acc, s) => acc + s.episodes.reduce((eAcc, ep) => eAcc + ep.servers.length, 0),
                    0
                  ) || 0
                : item.servers?.length || 0;

              const episodeCount = isSeries
                ? item.seasons?.reduce((acc, s) => acc + s.episodes.length, 0) || 0
                : 0;

              const posterImg = normalizeImageUrl(item.posterUrl || item.backdropUrl);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#101016] border border-zinc-800/90 hover:border-zinc-700 p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-xl"
                >
                  <div className="flex items-start gap-3.5">
                    {posterImg ? (
                      <img
                        src={posterImg}
                        alt={item.title}
                        className="w-20 h-28 object-cover rounded-xl shrink-0 border border-zinc-700/60 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-28 rounded-xl shrink-0 border border-zinc-700/60 bg-[#161620] flex items-center justify-center text-[10px] text-zinc-500 text-center p-1">
                        لا توجد صورة
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isSeries
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {isSeries ? 'مسلسل تركي' : 'فيلم تركي'}
                        </span>

                        {item.isEgyTurkOriginal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            حصري
                          </span>
                        )}

                        <span className="text-[11px] text-zinc-400 mr-auto font-mono">
                          {item.releaseYear}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white truncate" title={item.title}>
                        {item.title}
                      </h3>

                      {item.originalTitle && (
                        <p className="text-[11px] text-zinc-400 truncate font-mono text-left" dir="ltr">
                          {item.originalTitle}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-red-300 bg-red-950/70 border border-red-800/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                          <Server className="w-3 h-3 text-red-400" />
                          <span>{serverCount} سيرفرات</span>
                        </span>

                        {isSeries && (
                          <span className="text-[11px] text-zinc-300 bg-[#161620] border border-zinc-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Tv className="w-3 h-3 text-amber-400" />
                            <span>
                              {episodeCount} حلقة ({item.seasons?.length || 1} موسم)
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
                    <div
                      className="flex items-center gap-1.5 text-zinc-300 bg-[#161620] px-2.5 py-1 rounded-lg border border-zinc-700/60"
                      title="مشاهدات فعلية مسجلة تلقائياً من تشغيل الفيديو"
                    >
                      <Eye className="w-3.5 h-3.5 text-red-400" />
                      <span className="font-mono font-bold">
                        {(item.views || 0).toLocaleString('ar-EG')}
                      </span>
                      <span className="text-[10px] text-zinc-400">مشاهدة فعلية</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const latestEp = getLatestEpisodeNumber(item);
                          const itemUrl = `${siteBase}${latestEp ? getEpisodeUrl(item.id, latestEp) : getMediaUrl(item.id)}`;
                          navigator.clipboard.writeText(itemUrl);
                          showToast(
                            `تم نسخ رابط الأرشفة لجوجل: ${item.title}${latestEp ? ` (الحلقة ${latestEp})` : ''}`
                          );
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#161620] hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-zinc-700 hover:border-emerald-500/50 text-xs font-medium transition-all"
                        title="نسخ رابط العمل لـ Google Search Console"
                      >
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">رابط جوجل</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsNewModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161620] hover:bg-[#9F1239]/30 text-zinc-200 hover:text-red-300 border border-zinc-700 hover:border-red-500/50 text-xs font-semibold transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-red-400" />
                        <span>تعديل وسيرفرات</span>
                      </button>

                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 rounded-lg bg-[#161620] hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-700 transition-colors"
                        title="حذف هذا العمل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0e0e14] border border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">تأكيد حذف العمل نهائياً</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف{' '}
                  <strong className="text-rose-400 font-bold">"{itemToDelete.title}"</strong>؟ سيتم
                  حذف بيانات العمل وكافة روابط سيرفراته نهائياً من ايجي تورك.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#161620] border border-zinc-800 text-xs">
              {normalizeImageUrl(itemToDelete.posterUrl || itemToDelete.backdropUrl) && (
                <img
                  src={normalizeImageUrl(itemToDelete.posterUrl || itemToDelete.backdropUrl)}
                  alt={itemToDelete.title}
                  className="w-10 h-14 object-cover rounded-lg border border-zinc-700"
                />
              )}
              <div>
                <p className="font-bold text-white">{itemToDelete.title}</p>
                <p className="text-[11px] text-zinc-400">
                  {itemToDelete.type === 'movie' ? 'فيلم تركي' : 'مسلسل تركي'} ·{' '}
                  {itemToDelete.releaseYear}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#161620] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold transition-colors"
              >
                إلغاء التراجع
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف العمل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0e0e14] border border-amber-700/60 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">استعادة الكتالوج الافتراضي</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  هل تريد استعادة قائمة المسلسلات والأفلام التركية الافتراضية لايجي تورك ومزامنتها مع السحابة؟
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161620] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await onResetCatalog();
                    setIsResetConfirmOpen(false);
                    showToast('تم استعادة الكتالوج الافتراضي الأصلي ومزامنته سحابياً بنجاح.');
                  } catch (err: any) {
                    showToast(`فشل استعادة الكتالوج سحابياً: ${err?.message || 'خطأ غير متوقع'}`);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>نعم، استعادة الكتالوج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isSeoGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0e0e14] border border-emerald-500/50 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Globe className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">
                  دليل أرشفة وظهور موقع ايجي تورك في محرك بحث جوجل (Google SEO)
                </h3>
              </div>
              <button
                onClick={() => setIsSeoGuideOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>تم تجهيز وبرمجة كل ملفات السيو المتقدمة في موقعك تلقائياً:</span>
                </h4>
                <p className="text-zinc-300 text-xs">
                  تم بناء ملف خريطة الموقع الكامل <code>sitemap.xml</code>، وملف <code>robots.txt</code>،
                  ووسوم الميتا تاغ، وبيانات Schema.org المنظمة، وربط أرقام الحلقات والأفلام التركية بروابط مباشرة.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">خطوات ظهور الموقع في الصفحة الأولى بجوجل:</h4>

                <div className="p-3 rounded-xl bg-[#161620] border border-zinc-800 space-y-2">
                  <span className="font-bold text-red-300">1. رابط خريطة موقعك (Sitemap URL):</span>
                  <p className="text-xs text-zinc-400">
                    انسخ هذا الرابط وضعه في Google Search Console ليقوم روبوت جوجل بفحص كل أعمالك فورياً:
                  </p>
                  <div className="flex items-center gap-2 bg-[#0b0b10] p-2 rounded-lg border border-zinc-700 font-mono text-xs text-emerald-300 select-all">
                    <span>{siteBase}/sitemap.xml</span>
                  </div>
                  <button
                    onClick={handleExportSitemapXml}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white font-bold text-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل ملف Sitemap.xml المحدث لجميع أعمالك ({items.length} عمل)</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#161620] border border-zinc-800 space-y-2">
                  <span className="font-bold text-red-300">
                    2. إرسال الموقع إلى أدوات مشرفي المواقع (Google Search Console):
                  </span>
                  <p className="text-xs text-zinc-400">
                    افتح موقع Google Search Console، واختر "إضافة موقع" (URL Prefix)، ثم ضع رابط موقعك:
                    <br />
                    <code className="text-red-300">{siteBase}/</code>
                  </p>
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#881337] hover:bg-[#9F1239] text-white font-bold text-xs"
                  >
                    <span>فتح Google Search Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#161620] to-[#0e0e14] border border-red-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-700/60 pb-2.5">
                    <div>
                      <span className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <span>3. روابط كل حلقة وكل فيلم تركي لـ Google Search Console:</span>
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        ضع رابط أي حلقة جديدة في شريط فحص العناوين بـ Google Search Console لتبدأ بالظهور فوراً!
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const allUrls = items
                          .map(item => {
                            const latestEp = getLatestEpisodeNumber(item);
                            const title =
                              item.type === 'series' && latestEp
                                ? `${item.title} الحلقة ${latestEp}`
                                : item.title;
                            const url = `${siteBase}${latestEp ? getEpisodeUrl(item.id, latestEp) : getMediaUrl(item.id)}`;
                            return `${title}: ${url}`;
                          })
                          .join('\n');
                        navigator.clipboard.writeText(allUrls);
                        showToast(`تم نسخ روابط جميع الأعمال والحلقات (${items.length} رابط) بنجاح!`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-md transition-all active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ جميع الروابط دفعة واحدة</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {items.map(item => {
                      const latestEp = getLatestEpisodeNumber(item);
                      const epUrl = `${siteBase}${latestEp ? getEpisodeUrl(item.id, latestEp) : getMediaUrl(item.id)}`;
                      const titleLabel =
                        item.type === 'series' && latestEp ? `${item.title} - الحلقة ${latestEp}` : item.title;

                      return (
                        <div
                          key={item.id}
                          className="p-2 rounded-lg bg-[#08080b] border border-zinc-800 flex items-center justify-between gap-2 hover:border-zinc-700 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs truncate">{titleLabel}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 font-mono">
                                {item.type === 'series' ? 'مسلسل' : 'فيلم'}
                              </span>
                            </div>
                            <p className="text-[11px] text-red-400 font-mono truncate select-all" dir="ltr">
                              {epUrl}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(epUrl);
                                showToast(`تم نسخ رابط: ${titleLabel}`);
                              }}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-emerald-700/60 text-zinc-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="نسخ الرابط"
                            >
                              <Copy className="w-3 h-3" />
                              <span>نسخ</span>
                            </button>

                            <a
                              href={epUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-red-300 transition-colors"
                              title="فتح وتجربة الرابط"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsSeoGuideOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161620] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewModalOpen && (
        <OrganizedMediaEditorModal
          initialItem={editingItem}
          onSave={handleSaveItem}
          onClose={() => {
            setIsNewModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {isAdsModalOpen && (
        <AdsManagerModal
          initialSettings={adSettings}
          onSave={handleSaveAdSettings}
          onClose={() => setIsAdsModalOpen(false)}
        />
      )}
    </div>
  );
};

interface OrganizedMediaEditorModalProps {
  initialItem: MediaItem | null;
  onSave: (item: MediaItem) => void;
  onClose: () => void;
}

const OrganizedMediaEditorModal: React.FC<OrganizedMediaEditorModalProps> = ({
  initialItem,
  onSave,
  onClose
}) => {
  const isEdit = !!initialItem;

  const [activeTab, setActiveTab] = useState<'info' | 'seo' | 'stream_management'>('info');
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  const [title, setTitle] = useState(initialItem?.title || '');
  const [originalTitle, setOriginalTitle] = useState(initialItem?.originalTitle || '');
  const [type, setType] = useState<MediaType>(initialItem?.type || 'series');
  const [categoryId, setCategoryId] = useState<CategoryId>(initialItem?.categoryId || 'turkish_drama');
  const [synopsis, setSynopsis] = useState(initialItem?.synopsis || '');
  const [posterUrl, setPosterUrl] = useState(initialItem?.posterUrl || '');
  const [releaseYear, setReleaseYear] = useState<number | ''>(
    initialItem?.releaseYear !== undefined ? initialItem.releaseYear : 2025
  );
  const [rating, setRating] = useState<number | ''>(
    initialItem?.rating !== undefined ? initialItem.rating : ''
  );
  const [ageRating, setAgeRating] = useState<string>(initialItem?.ageRating || '');
  const [duration, setDuration] = useState(initialItem?.duration || '');
  const [genresInput, setGenresInput] = useState(initialItem?.genres?.join('، ') || 'دراما تركية، مترجم');
  const [keywordsInput, setKeywordsInput] = useState(initialItem?.keywords?.join('، ') || '');
  const [isFeatured, setIsFeatured] = useState(initialItem?.isFeatured || false);
  const [isEgyTurkOriginal, setIsEgyTurkOriginal] = useState(initialItem?.isEgyTurkOriginal || false);
  const [downloadUrl, setDownloadUrl] = useState(initialItem?.downloadUrl || '');

  const showNotice = (msg: string) => {
    setInlineNotice(msg);
    setTimeout(() => setInlineNotice(null), 4000);
  };

  const [movieServers, setMovieServers] = useState<ServerSource[]>(
    initialItem?.servers || [
      {
        id: 's1',
        name: 'سيرفر 1 (سريع VIP)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '1080p FHD',
        type: 'direct'
      },
      {
        id: 's2',
        name: 'سيرفر 2 (Ultra 4K)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        quality: '4K UHD',
        type: 'direct'
      }
    ]
  );

  const [seasons, setSeasons] = useState<Season[]>(
    initialItem?.seasons || [
      {
        id: 's-1',
        seasonNumber: 1,
        title: 'الموسم الأول',
        episodes: [
          {
            id: 'ep-1',
            episodeNumber: 1,
            title: 'الحلقة 1',
            duration: '120 دقيقة',
            servers: [
              {
                id: 's1',
                name: 'سيرفر 1 (سريع VIP)',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                quality: '1080p',
                type: 'direct'
              },
              {
                id: 's2',
                name: 'سيرفر 2 (FHD)',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                quality: '720p',
                type: 'direct'
              }
            ]
          }
        ]
      }
    ]
  );

  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);
  const [customEpNumber, setCustomEpNumber] = useState<number | ''>('');

  const handleAutoGenerateKeywords = () => {
    const mediaTitle = title.trim();
    if (!mediaTitle) {
      showNotice('يرجى كتابة عنوان العمل أولاً لتوليد الكلمات المفتاحية المناسبة له.');
      return;
    }
    const isMovie = type === 'movie';
    let generated: string[] = [];

    if (isMovie) {
      generated = [
        `مشاهدة فيلم ${mediaTitle} التركي مترجم كامل`,
        `تحميل فيلم ${mediaTitle} مترجم 1080p FHD`,
        `ايجي تورك ${mediaTitle}`,
        `قصة عشق ${mediaTitle}`,
        `فيديو لاروزا ${mediaTitle}`,
        `برستيج ${mediaTitle}`,
        `${mediaTitle} تركي مترجم بدون إعلانات`,
        `${mediaTitle} سنة ${releaseYear}`
      ];
      if (originalTitle.trim()) {
        generated.push(`Watch ${originalTitle.trim()} Turkish movie sub`);
        generated.push(`${originalTitle.trim()} full turkish movie`);
      }
    } else {
      let latestEp = 0;
      let latestEpTitle = '';
      let latestEpDesc = '';
      for (const season of seasons) {
        for (const ep of season.episodes) {
          if ((ep.episodeNumber || 0) >= latestEp) {
            latestEp = ep.episodeNumber || 0;
            latestEpTitle = ep.title || '';
            latestEpDesc = ep.description || '';
          }
        }
      }
      const epNum = latestEp > 0 ? latestEp : 1;

      generated = [
        `مسلسل ${mediaTitle} الحلقة ${epNum} مترجمة`,
        `مشاهدة مسلسل ${mediaTitle} الحلقة ${epNum} كاملة HD`,
        `تحميل مسلسل ${mediaTitle} الحلقة ${epNum} 1080p`,
        `ايجي تورك ${mediaTitle} الحلقة ${epNum}`,
        `${mediaTitle} حلقة ${epNum} قصة عشق`,
        `${mediaTitle} حلقة ${epNum} تركي مترجم`,
        `${mediaTitle} الحلقة ${epNum} بدون تقطيع`,
        `الحلقة ${epNum} ${mediaTitle}`
      ];

      if (latestEpTitle && !latestEpTitle.startsWith('الحلقة')) {
        generated.push(`${mediaTitle} ${latestEpTitle}`);
      }

      if (latestEpDesc.trim()) {
        const descWords = latestEpDesc.trim().split(/\s+/).slice(0, 10).join(' ');
        generated.push(`${mediaTitle} الحلقة ${epNum} ${descWords}`);
      }
    }

    const currentList = keywordsInput
      ? keywordsInput.split(/[,،]/).map(s => s.trim()).filter(Boolean)
      : [];
    const merged = Array.from(new Set([...currentList, ...generated]));
    setKeywordsInput(merged.join('، '));
  };

  const handleAddKeywordChip = (chip: string) => {
    const mediaTitle = title.trim() || 'المسلسل التركي';
    const term = `${chip} ${mediaTitle}`.trim();
    const currentList = keywordsInput
      ? keywordsInput.split(/[,،]/).map(s => s.trim()).filter(Boolean)
      : [];
    if (!currentList.includes(term)) {
      setKeywordsInput([...currentList, term].join('، '));
    }
  };

  const handleAddMovieServer = () => {
    const newIdx = movieServers.length + 1;
    setMovieServers([
      ...movieServers,
      {
        id: `s-${Date.now()}-${newIdx}`,
        name: newIdx === 1 ? 'سيرفر VIP' : `سيرفر ${newIdx - 1}`,
        url: '',
        type: 'direct'
      }
    ]);
  };

  const handleAddFreePresetServer = (typePreset: 'telegram' | 'vidsrc' | 'autoembed') => {
    if (typePreset === 'telegram') {
      setMovieServers([
        ...movieServers,
        {
          id: `tg-${Date.now()}`,
          name: 'سيرفر تليجرام السحابي (مجاني وسريع)',
          url: '',
          quality: '1080p FHD',
          type: 'direct'
        }
      ]);
    } else if (typePreset === 'vidsrc') {
      const cleanTitle = encodeURIComponent(title.trim() || 'turkish');
      setMovieServers([
        ...movieServers,
        {
          id: `vidsrc-${Date.now()}`,
          name: 'سيرفر البث العالمي VidSrc (مجاني ومترجم)',
          url: `https://vidsrc.to/embed/movie/${cleanTitle}`,
          quality: '1080p Multi-Audio',
          type: 'embed'
        }
      ]);
    } else if (typePreset === 'autoembed') {
      setMovieServers([
        ...movieServers,
        {
          id: `autoembed-${Date.now()}`,
          name: 'سيرفر AutoEmbed التلقائي',
          url: `https://autoembed.co/movie/tmdb/`,
          quality: '1080p FHD',
          type: 'embed'
        }
      ]);
    }
  };

  const sanitizeServerUrl = (raw: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    const hrefMatch = trimmed.match(/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/i);
    if (hrefMatch && hrefMatch[1]) return hrefMatch[1].trim();
    const iframeMatch = trimmed.match(/<iframe\s+(?:[^>]*?\s+)?src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) return iframeMatch[1].trim();
    return trimmed;
  };

  const handleUpdateMovieServer = (idx: number, field: keyof ServerSource, val: string) => {
    const copy = [...movieServers];
    const cleanedVal = field === 'url' ? sanitizeServerUrl(val) : val;
    copy[idx] = { ...copy[idx], [field]: cleanedVal };
    setMovieServers(copy);
  };

  const handleRemoveMovieServer = (idx: number) => {
    setMovieServers(movieServers.filter((_, i) => i !== idx));
  };

  const handleAddSeason = () => {
    const newSeasonNum = seasons.length + 1;
    const newSeasonTitle =
      newSeasonNum === 2
        ? 'الموسم الثاني'
        : newSeasonNum === 3
          ? 'الموسم الثالث'
          : `الموسم ${newSeasonNum}`;
    const newSeason: Season = {
      id: `season-${Date.now()}`,
      seasonNumber: newSeasonNum,
      title: newSeasonTitle,
      episodes: [
        {
          id: `ep-${Date.now()}-1`,
          episodeNumber: 1,
          title: 'الحلقة 1',
          duration: '120 دقيقة',
          servers: [
            {
              id: `s-${Date.now()}-1`,
              name: 'سيرفر 1 (سريع VIP)',
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              quality: '1080p',
              type: 'direct'
            }
          ]
        }
      ]
    };
    setSeasons([...seasons, newSeason]);
    setSelectedSeasonIdx(seasons.length);
  };

  const handleRemoveSeason = (idxToRemove: number) => {
    if (seasons.length <= 1) {
      showNotice('يجب أن يحتوي المسلسل على موسم واحد على الأقل.');
      return;
    }
    const updated = seasons.filter((_, i) => i !== idxToRemove);
    setSeasons(updated);
    setSelectedSeasonIdx(Math.max(0, idxToRemove - 1));
  };

  const handleAddEpisodeToCurrentSeason = (specifiedNumber?: number) => {
    const copy = [...seasons];
    const targetSeason = copy[selectedSeasonIdx];
    if (!targetSeason) return;

    let epNum: number;
    if (typeof specifiedNumber === 'number' && specifiedNumber > 0) {
      epNum = specifiedNumber;
    } else {
      const highestEp = targetSeason.episodes.reduce(
        (max, ep) => Math.max(max, ep.episodeNumber || 0),
        0
      );
      epNum = highestEp > 0 ? highestEp + 1 : targetSeason.episodes.length + 1;
    }

    const newEp: Episode = {
      id: `ep-${Date.now()}-${epNum}`,
      episodeNumber: epNum,
      title: `الحلقة ${epNum}`,
      servers: [
        {
          id: `s1-${Date.now()}`,
          name: 'سيرفر VIP',
          url: '',
          type: 'embed'
        }
      ]
    };

    targetSeason.episodes.push(newEp);
    targetSeason.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    setSeasons(copy);
    setCustomEpNumber('');
  };

  const handleUpdateEpisodeNumber = (epIdx: number, newNumber: number) => {
    const copy = [...seasons];
    const targetSeason = copy[selectedSeasonIdx];
    if (!targetSeason || !targetSeason.episodes[epIdx]) return;

    targetSeason.episodes[epIdx].episodeNumber = newNumber;
    if (!targetSeason.episodes[epIdx].title || targetSeason.episodes[epIdx].title.startsWith('الحلقة')) {
      targetSeason.episodes[epIdx].title = `الحلقة ${newNumber}`;
    }
    targetSeason.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    setSeasons(copy);
  };

  const handleRemoveEpisode = (epIdx: number) => {
    const copy = [...seasons];
    const targetSeason = copy[selectedSeasonIdx];
    if (!targetSeason) return;
    if (targetSeason.episodes.length <= 1) {
      showNotice('يجب أن يحتوي الموسم على حلقة واحدة على الأقل.');
      return;
    }
    targetSeason.episodes = targetSeason.episodes.filter((_, i) => i !== epIdx);
    setSeasons(copy);
  };

  const handleAddEpisodeServer = (epIdx: number) => {
    const copy = [...seasons];
    const targetSeason = copy[selectedSeasonIdx];
    if (!targetSeason) return;
    const ep = targetSeason.episodes[epIdx];
    const sNum = ep.servers.length + 1;
    ep.servers.push({
      id: `srv-${Date.now()}-${sNum}`,
      name: sNum === 1 ? 'سيرفر VIP' : `سيرفر ${sNum - 1}`,
      url: '',
      type: 'embed'
    });
    setSeasons(copy);
  };

  const handleRemoveEpisodeServer = (epIdx: number, srvIdx: number) => {
    const copy = [...seasons];
    const targetSeason = copy[selectedSeasonIdx];
    if (!targetSeason) return;
    targetSeason.episodes[epIdx].servers = targetSeason.episodes[epIdx].servers.filter(
      (_, i) => i !== srvIdx
    );
    setSeasons(copy);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showNotice('يرجى كتابة عنوان العمل التركي.');
      setActiveTab('info');
      return;
    }

    const genresList = genresInput
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(Boolean);

    const keywordsList = keywordsInput
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(Boolean);

    const saved: MediaItem = {
      id: initialItem?.id || `egyturk-${Date.now()}`,
      title: title.trim(),
      originalTitle: originalTitle.trim() || undefined,
      type,
      categoryId,
      synopsis: synopsis.trim() || 'لا يوجد وصف متوفر.',
      posterUrl:
        normalizeImageUrl(posterUrl.trim()) ||
        'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600',
      backdropUrl:
        normalizeImageUrl(posterUrl.trim()) ||
        'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200',
      releaseYear: releaseYear ? Number(releaseYear) : new Date().getFullYear(),
      rating: rating !== '' && !isNaN(Number(rating)) ? Number(rating) : undefined,
      ageRating: ageRating.trim() || undefined,
      genres: genresList.length > 0 ? genresList : ['دراما تركية'],
      keywords: keywordsList.length > 0 ? keywordsList : undefined,
      duration: duration.trim() || undefined,
      isFeatured,
      views: initialItem?.views || 0,
      isEgyTurkOriginal,
      downloadUrl: downloadUrl.trim() || undefined,
      servers: type === 'movie' ? movieServers : undefined,
      seasons: type === 'series' ? seasons : undefined,
      createdAt: initialItem?.createdAt || new Date().toISOString().slice(0, 10)
    };

    onSave(saved);
  };

  const previewPosterUrl = normalizeImageUrl(posterUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0e0e14] border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-auto max-h-[92vh] flex flex-col">
        <div className="pb-4 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white">
              {type === 'movie' ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isEdit ? `تعديل: ${title || 'العمل التركي'}` : 'إضافة عمل تركي وسيرفرات جديدة'}
              </h2>
              <p className="text-xs text-zinc-400">
                {type === 'movie' ? 'فيلم تركي مترجم مع سيرفرات متعددة' : 'مسلسل تركي مترجم مع مواسم وحلقات وسيرفرات'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#161620] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {inlineNotice && (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/50 border border-amber-600/60 text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{inlineNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setInlineNotice(null)}
              className="text-amber-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-4 pb-3 border-b border-zinc-800/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'info'
                ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm'
                : 'bg-[#161620] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Edit3 className="w-4 h-4 text-red-400" />
            <span>1. تفاصيل العمل والبوسترات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'seo'
                ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm ring-1 ring-red-400'
                : 'bg-[#161620] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Tag className="w-4 h-4 text-red-400" />
            <span>2. الكلمات المفتاحية والسيو (SEO)</span>
            {keywordsInput ? <span className="w-2 h-2 rounded-full bg-red-400" /> : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stream_management')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'stream_management'
                ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm'
                : 'bg-[#161620] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Server className="w-4 h-4 text-red-400" />
            <span>
              {type === 'movie' ? '3. سيرفرات الفيلم (Servers)' : '3. المواسم والحلقات والسيرفرات'}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-1 space-y-6">
          <form id="media-editor-form" onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'info' ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#161620] border border-zinc-800">
                  <div>
                    <label className="block text-xs font-bold text-zinc-200 mb-1.5">
                      نوع العمل التركي *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setType('movie')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          type === 'movie'
                            ? 'bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white border-transparent shadow-md'
                            : 'bg-[#0e0e14] text-zinc-400 border-zinc-700 hover:text-white'
                        }`}
                      >
                        <Film className="w-4 h-4" />
                        <span>فيلم تركي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType('series')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          type === 'series'
                            ? 'bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white border-transparent shadow-md'
                            : 'bg-[#0e0e14] text-zinc-400 border-zinc-700 hover:text-white'
                        }`}
                      >
                        <Tv className="w-4 h-4" />
                        <span>مسلسل تركي</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-200 mb-1.5">
                      القسم الرئيسي (Category) *
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                      className="w-full bg-[#0e0e14] border border-zinc-700 focus:border-red-500 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                    >
                      {CATEGORIES_ORDERED.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.titleAr} ({cat.descriptionAr})
                        </option>
                      ))}
                      <option value="egyturk_originals">أعمال ايجي تورك الحصرية</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      عنوان العمل (بالعربية) *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: المؤسس عثمان أو طائر الرفراف"
                      className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      العنوان التركي الأصلي (Turkish Title)
                    </label>
                    <input
                      type="text"
                      value={originalTitle}
                      onChange={(e) => setOriginalTitle(e.target.value)}
                      placeholder="مثال: Kuruluş Osman / Yalı Çapkını"
                      dir="ltr"
                      className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono text-left outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">سنة الإنتاج</label>
                    <input
                      type="number"
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(Number(e.target.value))}
                      className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      التقييم <span className="text-[10px] text-zinc-400 font-normal">(اختياري)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={rating}
                      onChange={(e) => setRating(e.target.value ? Number(e.target.value) : '')}
                      placeholder="بدون تقييم"
                      className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      التصنيف العمري{' '}
                      <span className="text-[10px] text-zinc-400 font-normal">(اختياري)</span>
                    </label>
                    <select
                      value={ageRating}
                      onChange={(e) => setAgeRating(e.target.value)}
                      className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                    >
                      <option value="">بدون تحديد (إخفاء)</option>
                      <option value="للجميع">للجميع (G)</option>
                      <option value="+13">+13</option>
                      <option value="+16">+16</option>
                      <option value="+18">+18</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">المشاهدات الفعلية</label>
                    <div
                      className="w-full bg-[#0e0e14] border border-zinc-700/70 rounded-xl px-3 py-2 text-xs text-red-300 font-mono flex items-center gap-1.5 select-none"
                      title="تُحسب تلقائياً وبشكل حصري من تشغيل الفيديو الفعلي"
                    >
                      <Eye className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">
                        {(initialItem?.views || 0).toLocaleString('ar-EG')} مشاهدة
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      المدة <span className="text-[10px] text-zinc-400 font-normal">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="مثال: ساعتان"
                      className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    التصنيفات والأنواع (مفصولة بفواصل)
                  </label>
                  <input
                    type="text"
                    value={genresInput}
                    onChange={(e) => setGenresInput(e.target.value)}
                    placeholder="مثال: دراما تركية، أكشن، رومانسي، مترجم"
                    className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1c1014] to-[#121016] border border-red-700/50 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30">
                      <Tag className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>الكلمات المفتاحية وسيو جوجل (SEO)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300">
                          {keywordsInput
                            ? `${keywordsInput.split(/[,،]/).filter(Boolean).length} كلمة مضافة`
                            : 'جاهز للتوليد'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        يمكنك إضافة الكلمات يدوياً أو توليدها بنقرة زر في تبويب السيو
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('seo')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>الانتقال لتبويب السيو والكلمات (2) ←</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    رابط البوستر (Poster URL) *
                  </label>
                  <input
                    type="text"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                  />
                  {isHtmlViewerImageUrl(posterUrl).isViewer && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>تنبيه رابط صفحة ImgBB وليس رابط مباشر للصورة!</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        الرابط الذي نسخته هو صفحة ويب (<code className="text-amber-200">ibb.co/...</code>).
                        للحصول على الرابط المباشر: اضغط كليك يمين على الصورة واختر{' '}
                        <strong className="text-white">"نسخ عنوان الصورة"</strong> بحيث يبدأ بـ{' '}
                        <code className="text-red-300">https://i.ibb.co/...</code>
                      </p>
                    </div>
                  )}
                  {previewPosterUrl && !isHtmlViewerImageUrl(posterUrl).isViewer && (
                    <div className="flex items-center gap-2 pt-1">
                      <img
                        src={previewPosterUrl}
                        alt="معاينة البوستر"
                        className="w-12 h-16 object-cover rounded-lg border border-zinc-700 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> تم التعرف على رابط البوستر بنجاح
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    ملخص القصة (Synopsis) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="اكتب ملخصاً تشويقياً للمسلسل أو الفيلم التركي..."
                    className="w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-xl p-3 text-xs text-white leading-relaxed outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-[#161620] border border-zinc-800">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isEgyTurkOriginal}
                      onChange={(e) => setIsEgyTurkOriginal(e.target.checked)}
                      className="rounded border-zinc-700 text-red-600 focus:ring-0 w-4 h-4"
                    />
                    <span>عمل حصري على ايجي تورك (EGY TURK)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded border-zinc-700 text-red-600 focus:ring-0 w-4 h-4"
                    />
                    <span>تثبيت في البانر البارز الرئيسي (Hero Banner)</span>
                  </label>
                </div>
              </div>
            ) : activeTab === 'seo' ? (
              <div className="space-y-6">
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/60 via-[#1a0e12] to-[#121016] border border-red-700/70 shadow-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>الكلمات المفتاحية ووسوم السيو (SEO Engine)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/80 text-red-300 font-mono">
                            Google Ready
                          </span>
                        </h4>
                        <p className="text-xs text-zinc-300 mt-0.5">
                          هذه الكلمات تُحقن في شفرة الموقع لمحركات بحث جوجل لتصدر نتائج البحث للمسلسلات والأفلام التركية
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoGenerateKeywords}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold shadow-lg shadow-red-950/60 transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>توليد كلمات مفتاحية تلقائية لجوجل ⚡</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#161620] border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-200">
                      قائمة الكلمات والوسوم (مفصولة بفواصل ، أو ,)
                    </label>
                    <span className="text-xs text-red-400 font-medium">
                      {keywordsInput
                        ? `${keywordsInput.split(/[,،]/).map(s => s.trim()).filter(Boolean).length} كلمة مفتاحية`
                        : '0 كلمات'}
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    placeholder="مثال: مشاهدة مسلسل المؤسس عثمان الحلقة 180 مترجمة، ايجي تورك، قصة عشق..."
                    className="w-full bg-[#0e0e14] border border-zinc-700 focus:border-red-500 rounded-xl p-3.5 text-xs sm:text-sm text-white outline-none leading-relaxed placeholder:text-zinc-500"
                  />

                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                      <span>إضافة وسوم تركية شائعة فورية (اضغط للإضافة السريعة):</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'مشاهدة وتحميل',
                        'مسلسل تركي مترجم',
                        'فيلم تركي مترجم',
                        'بجودة 1080p FHD',
                        'ايجي تورك',
                        'قصة عشق',
                        'فيديو لاروزا',
                        'بدون إعلانات مزعجة',
                        'حصريا تركي'
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleAddKeywordChip(chip)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0e0e14] hover:bg-red-950 border border-zinc-700 hover:border-red-500 text-zinc-300 hover:text-red-300 text-xs font-medium transition-colors"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e14] border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>معاينة مظهر العمل في نتائج بحث جوجل (Google Search Preview):</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1f1f1f] border border-[#333] space-y-1.5 font-sans" dir="rtl">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="w-4 h-4 rounded-full bg-[#881337] flex items-center justify-center text-[9px] text-white font-bold">
                        E
                      </span>
                      <span className="text-[11px] text-zinc-300">ايجي تورك EGY TURK</span>
                    </div>
                    <h5 className="text-base text-[#8ab4f8] hover:underline cursor-pointer font-medium leading-snug">
                      {title.trim()
                        ? type === 'series'
                          ? (() => {
                              const maxEp = seasons.reduce((acc, s) => {
                                const epMax = s.episodes.reduce(
                                  (m, e) => Math.max(m, e.episodeNumber || 0),
                                  0
                                );
                                return Math.max(acc, epMax);
                              }, 0);
                              const epPart = maxEp > 0 ? ` الحلقة ${maxEp}` : '';
                              return `مشاهدة وتحميل مسلسل ${title.trim()}${epPart} مترجم كامل HD 1080p - ايجي تورك`;
                            })()
                          : `مشاهدة وتحميل فيلم ${title.trim()} التركي مترجم HD 1080p - ايجي تورك`
                        : 'مشاهدة وتحميل أحدث المسلسلات والأفلام التركية المترجمة - ايجي تورك'}
                    </h5>
                    <p className="text-xs text-[#bdc1c6] leading-relaxed line-clamp-2">
                      {synopsis.trim()
                        ? synopsis.trim()
                        : 'شاهد الآن بجودة عالية وبدون تقطيع أحدث المسلسلات والأفلام التركية المترجمة للعربية على ايجي تورك EGY TURK.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {type === 'movie' ? (
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#0a1c1d] to-[#12121a] border border-emerald-500/50 space-y-3 shadow-lg">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span>سيرفرات خارجية جاهزة وسريعة (DMCA Free):</span>
                        </div>
                        <span className="text-[11px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-400 border border-emerald-800">
                          حماية + 0 تكلفة
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddFreePresetServer('telegram')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-900/80 hover:bg-sky-800 border border-sky-600/70 text-sky-200 text-xs font-bold transition-all shadow active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-400" />
                          <span>+ سيرفر تليجرام المباشر</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddFreePresetServer('vidsrc')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-600/70 text-purple-200 text-xs font-bold transition-all shadow active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>+ سيرفر البث الجاهز VidSrc</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddFreePresetServer('autoembed')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600/70 text-emerald-200 text-xs font-bold transition-all shadow active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          <span>+ سيرفر AutoEmbed التلقائي</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#161620] border border-zinc-800">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Server className="w-4 h-4 text-red-400" />
                          <span>سيرفرات الفيلم المضافة ({movieServers.length} سيرفر متوفر)</span>
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          يمكنك إضافة روابط Embed أو روابط بث فيديو مباشرة مع أزرار تبديل فورية
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMovieServer}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold shadow-md transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة سيرفر يدوي جديد</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {movieServers.map((server, sIdx) => {
                        const isVip = sIdx === 0;
                        const label = isVip ? 'سيرفر VIP الذهبي' : `سيرفر رقم ${sIdx}`;

                        return (
                          <div
                            key={server.id || sIdx}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isVip
                                ? 'bg-amber-950/20 border-amber-500/40'
                                : 'bg-[#161620] border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className={`text-xs font-black flex items-center gap-1.5 ${
                                  isVip ? 'text-amber-400' : 'text-red-300'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isVip ? 'bg-amber-400' : 'bg-red-500'
                                  }`}
                                />
                                <span>{label}</span>
                              </span>

                              {movieServers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMovieServer(sIdx)}
                                  className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
                                  title="حذف السيرفر"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div>
                              <input
                                type="text"
                                value={server.url}
                                onChange={(e) => handleUpdateMovieServer(sIdx, 'url', e.target.value)}
                                placeholder="ضع رابط سيرفر المشاهدة هنا (vidspeed, anafast, dood, mp4, iframe...)"
                                dir="ltr"
                                className="w-full bg-[#0e0e14] border border-zinc-700 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                      <label className="block text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>
                          رابط تحميل الفيلم المباشر (اختياري - لن يظهر للجمهور إلا إذا قمت بوضعه هنا)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={downloadUrl}
                        onChange={(e) => setDownloadUrl(e.target.value)}
                        placeholder="https://... (اتركه فارغاً إذا كنت لا تريد إظهار زر تحميل للجمهور)"
                        dir="ltr"
                        className="w-full bg-[#0e0e14] border border-emerald-700/50 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
                      {seasons.map((season, sIdx) => {
                        const isSelected = selectedSeasonIdx === sIdx;
                        return (
                          <div key={season.id} className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedSeasonIdx(sIdx)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white shadow-md'
                                  : 'bg-[#161620] text-zinc-400 hover:text-white border border-zinc-800'
                              }`}
                            >
                              <Tv className="w-3.5 h-3.5" />
                              <span>{season.title}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
                                {season.episodes.length} حلقة
                              </span>
                            </button>

                            {seasons.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSeason(sIdx)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40"
                                title="حذف هذا الموسم"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={handleAddSeason}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ إضافة موسم جديد</span>
                      </button>
                    </div>

                    {seasons[selectedSeasonIdx] && (
                      <div className="space-y-4">
                        <div className="bg-[#161620] p-4 rounded-2xl border border-zinc-800 space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>حلقات {seasons[selectedSeasonIdx].title}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-300 font-mono">
                                  {seasons[selectedSeasonIdx].episodes.length} حلقة
                                </span>
                              </h4>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                يمكنك إضافة أي رقم حلقة تريده مباشرة (مثلاً الحلقة 180 مباشرة) دون الحاجة لإضافة الحلقات السابقة!
                              </p>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => handleAddEpisodeToCurrentSeason()}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                                <span>+ إضافة الحلقة التالية</span>
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-400 font-semibold">
                              أو اختر إضافة حلقة برقم محدد فوراً:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={999}
                                value={customEpNumber}
                                onChange={(e) =>
                                  setCustomEpNumber(e.target.value ? Number(e.target.value) : '')
                                }
                                placeholder="رقم الحلقة (مثلاً: 18)"
                                className="w-28 sm:w-32 bg-[#0e0e14] border border-red-800/80 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof customEpNumber === 'number' && customEpNumber > 0) {
                                    handleAddEpisodeToCurrentSeason(customEpNumber);
                                  } else {
                                    showNotice('يرجى كتابة رقم الحلقة المراد إضافتها أولاً.');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة الحلقة {customEpNumber ? `#${customEpNumber}` : ''}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1 mr-auto text-[11px] text-zinc-400">
                              <span>سريع:</span>
                              {[10, 15, 18, 20, 25, 30].map(num => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => handleAddEpisodeToCurrentSeason(num)}
                                  className="px-2 py-0.5 rounded bg-[#0e0e14] hover:bg-red-900/60 border border-zinc-700 hover:border-red-500 text-zinc-300 font-mono transition-colors"
                                >
                                  +{num}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          {seasons[selectedSeasonIdx].episodes.map((ep, epIdx) => (
                            <div
                              key={ep.id}
                              className="p-4 rounded-2xl bg-[#161620] border border-zinc-800/90 space-y-3 transition-all hover:border-zinc-700"
                            >
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                                <div className="flex items-center gap-2.5 flex-1">
                                  <div
                                    className="flex items-center gap-1 bg-red-950/80 border border-red-800 rounded-xl px-2 py-1 text-red-300 shrink-0"
                                    title="اضغط لتغيير رقم الحلقة بحرية"
                                  >
                                    <span className="text-[10px] text-red-400 font-bold">حلقة:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={ep.episodeNumber}
                                      onChange={(e) =>
                                        handleUpdateEpisodeNumber(epIdx, Number(e.target.value) || 1)
                                      }
                                      className="w-12 bg-transparent text-xs font-black font-mono text-red-300 text-center outline-none focus:bg-red-900 rounded"
                                    />
                                  </div>

                                  <input
                                    type="text"
                                    value={ep.title}
                                    onChange={(e) => {
                                      const copy = [...seasons];
                                      copy[selectedSeasonIdx].episodes[epIdx].title = e.target.value;
                                      setSeasons(copy);
                                    }}
                                    placeholder="عنوان الحلقة (مثلاً: الحلقة 18)"
                                    className="bg-[#0e0e14] border border-zinc-700 focus:border-red-500 rounded-xl px-3 py-1.5 text-xs text-white flex-1 min-w-[140px]"
                                  />
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAddEpisodeServer(epIdx)}
                                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-600/30 text-red-300 border border-red-500/40 hover:bg-[#881337] hover:text-white transition-all shadow-sm"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ سيرفر للحلقة</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEpisode(epIdx)}
                                    className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition-colors"
                                    title="حذف هذه الحلقة"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-zinc-400">
                                  وصف مختصر لأحداث الحلقة (يساعد بقوة في تصدر بحث جوجل وظهور الحلقة للزوار):
                                </label>
                                <textarea
                                  rows={2}
                                  value={ep.description || ''}
                                  onChange={(e) => {
                                    const copy = [...seasons];
                                    copy[selectedSeasonIdx].episodes[epIdx].description = e.target.value;
                                    setSeasons(copy);
                                  }}
                                  placeholder="اكتب نبذة أو ملخص تشويقي لأحداث هذه الحلقة للظهور في محركات البحث..."
                                  className="w-full bg-[#0e0e14] border border-zinc-700/80 focus:border-red-500 rounded-xl p-2.5 text-xs text-white outline-none leading-relaxed"
                                />
                              </div>

                              <div className="space-y-2 pr-2 border-r-2 border-red-700/60">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-[#0e0e14] p-2.5 rounded-xl border border-emerald-900/60">
                                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <Download className="w-3 h-3" />
                                    <span>رابط تحميل الحلقة (اختياري):</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={ep.downloadUrl || ''}
                                    onChange={(e) => {
                                      const copy = [...seasons];
                                      copy[selectedSeasonIdx].episodes[epIdx].downloadUrl = e.target.value;
                                      setSeasons(copy);
                                    }}
                                    placeholder="https://... (اتركه فارغاً إذا كنت لا تريد إظهار زر تحميل لهذه الحلقة)"
                                    dir="ltr"
                                    className="flex-1 w-full bg-[#161620] border border-zinc-700 focus:border-emerald-400 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
                                  />
                                </div>

                                {ep.servers.map((srv, srvIdx) => {
                                  const isVip = srvIdx === 0;
                                  const label = isVip ? 'سيرفر VIP الذهبي' : `سيرفر رقم ${srvIdx}`;

                                  return (
                                    <div
                                      key={srv.id || srvIdx}
                                      className={`flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl border ${
                                        isVip
                                          ? 'bg-amber-950/20 border-amber-500/40'
                                          : 'bg-[#0e0e14] border-zinc-800'
                                      }`}
                                    >
                                      <span
                                        className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${
                                          isVip
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                            : 'bg-red-950/70 text-red-400 border border-red-800/80'
                                        }`}
                                      >
                                        {label}
                                      </span>

                                      <input
                                        type="text"
                                        value={srv.url}
                                        onChange={(e) => {
                                          const copy = [...seasons];
                                          copy[selectedSeasonIdx].episodes[epIdx].servers[srvIdx].url =
                                            sanitizeServerUrl(e.target.value);
                                          setSeasons(copy);
                                        }}
                                        placeholder="رابط البث أو كود التضمين (vidspeed, anafast, dood, mp4, iframe...)"
                                        dir="ltr"
                                        className="flex-1 w-full bg-[#161620] border border-zinc-700 focus:border-red-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
                                      />

                                      {ep.servers.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveEpisodeServer(epIdx, srvIdx)}
                                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors self-end sm:self-center"
                                          title="حذف هذا السيرفر"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#161620] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs sm:text-sm font-semibold transition-colors"
          >
            إلغاء
          </button>

          <button
            type="submit"
            form="media-editor-form"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-900/30 transition-all flex items-center gap-2 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{isEdit ? 'حفظ التعديلات' : 'إضافة العمل والسيرفرات'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
