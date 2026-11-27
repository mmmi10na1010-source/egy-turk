import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Star,
  Tv,
  Eye,
  Download,
  Share2,
  Check,
  Plus,
  ChevronLeft,
  Home,
  ArrowRight,
  Film,
  Layers
} from 'lucide-react';
import { MediaItem, AdSettings, CATEGORIES_ORDERED, Episode, Season } from '../types';
import { normalizeImageUrl, getLatestEpisodeNumber } from '../utils/imageHelper';
import { getHomeUrl, getMediaUrl, getEpisodeUrl } from '../utils/routes';
import { VideoPlayerBlock } from './VideoPlayerBlock';
import { MediaCard } from './MediaCard';

interface MediaPageProps {
  item: MediaItem;
  allItems: MediaItem[];
  mode: 'details' | 'episode';
  epParam?: string;
  autoplay?: boolean;
  adSettings: AdSettings;
  isSavedInList: boolean;
  isItemSaved?: (id: string) => boolean;
  onToggleList: (id: string) => void;
  onNavigateHome: (tab?: string) => void;
  onNavigateToMedia: (item: MediaItem, autoplay?: boolean) => void;
  onNavigateToEpisode: (item: MediaItem, episodeNumber: number | string) => void;
  onRecordView: (mediaId: string) => void;
}

export const MediaPage: React.FC<MediaPageProps> = ({
  item,
  allItems,
  mode,
  epParam,
  autoplay,
  adSettings,
  isSavedInList,
  isItemSaved,
  onToggleList,
  onNavigateHome,
  onNavigateToMedia,
  onNavigateToEpisode,
  onRecordView
}) => {
  const isSeries = item.type === 'series' && (item.seasons?.length ?? 0) > 0;
  const playerSectionRef = useRef<HTMLDivElement>(null);
  const lastRecordedKeyRef = useRef<string>('');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const resolveSeasonAndEpisode = (): { season?: Season; episode?: Episode } => {
    if (!isSeries || !item.seasons || item.seasons.length === 0) {
      return {};
    }
    if (epParam) {
      const targetNum = Number(epParam);
      for (const s of item.seasons) {
        const matched = s.episodes?.find(
          e => e.episodeNumber === targetNum || String(e.id) === String(epParam)
        );
        if (matched) return { season: s, episode: matched };
      }
    }
    const firstSeason = item.seasons[0];
    return {
      season: firstSeason,
      episode: firstSeason?.episodes?.[0]
    };
  };

  const { season: resolvedSeason, episode: resolvedEpisode } = resolveSeasonAndEpisode();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    resolvedSeason?.id || item.seasons?.[0]?.id || ''
  );

  useEffect(() => {
    if (resolvedSeason?.id) {
      setSelectedSeasonId(resolvedSeason.id);
    } else if (item.seasons?.[0]?.id) {
      setSelectedSeasonId(item.seasons[0].id);
    }
  }, [item.id, resolvedSeason?.id]);

  const activeSeason =
    item.seasons?.find(s => s.id === selectedSeasonId) || resolvedSeason || item.seasons?.[0];

  const isEpisodeView = isSeries && mode === 'episode' && Boolean(resolvedEpisode);
  const latestEpisodeNum = getLatestEpisodeNumber(item);

  useEffect(() => {
    const isPlayablePage = item.type === 'movie' || isEpisodeView;
    if (!isPlayablePage) return;
    const key = `${item.id}:${resolvedEpisode?.id || 'movie'}`;
    if (lastRecordedKeyRef.current !== key) {
      lastRecordedKeyRef.current = key;
      onRecordView(item.id);
    }
  }, [item.id, item.type, isEpisodeView, resolvedEpisode?.id, onRecordView]);

  useEffect(() => {
    if (autoplay && item.type === 'movie' && playerSectionRef.current) {
      setTimeout(() => {
        playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [autoplay, item.id, item.type]);

  const categoryInfo = CATEGORIES_ORDERED.find(c => c.id === item.categoryId);
  const categoryLabel = categoryInfo?.titleAr || 'مسلسلات وأفلام تركية';
  const categoryTabMap: Record<string, string> = {
    turkish_drama: 'drama',
    turkish_action: 'action',
    turkish_historical: 'historical',
    turkish_movies: 'movies'
  };
  const categoryTab = categoryTabMap[item.categoryId] || 'home';

  const resolvedMediaImg = normalizeImageUrl(item.backdropUrl || item.posterUrl);
  const resolvedPosterImg = normalizeImageUrl(item.posterUrl || item.backdropUrl);

  const sortedEpisodesInSeason = (resolvedSeason || activeSeason)?.episodes
    ? [...(resolvedSeason || activeSeason)!.episodes].sort(
        (a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0)
      )
    : [];

  const currentEpIndex = resolvedEpisode
    ? sortedEpisodesInSeason.findIndex(e => e.id === resolvedEpisode.id)
    : -1;
  const prevEpisode = currentEpIndex > 0 ? sortedEpisodesInSeason[currentEpIndex - 1] : undefined;
  const nextEpisode =
    currentEpIndex >= 0 && currentEpIndex < sortedEpisodesInSeason.length - 1
      ? sortedEpisodesInSeason[currentEpIndex + 1]
      : undefined;

  const sharePath =
    isEpisodeView && resolvedEpisode
      ? getEpisodeUrl(item.id, resolvedEpisode.episodeNumber)
      : getMediaUrl(item.id);
  const fullShareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setCopiedUrl(false);
    }
  };

  const relatedItems = allItems
    .filter(other => other.id !== item.id && other.categoryId === item.categoryId)
    .slice(0, 6);

  const activeDownloadUrl = isEpisodeView
    ? resolvedEpisode?.downloadUrl || item.downloadUrl || ''
    : (item.downloadUrl && item.downloadUrl.trim()) ||
      activeSeason?.episodes?.find(ep => ep.downloadUrl)?.downloadUrl ||
      '';

  return (
    <article className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
          <a
            href={getHomeUrl('home')}
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome('home');
            }}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-rose-400" />
            <span>الرئيسية</span>
          </a>
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-600" />
          <a
            href={getHomeUrl(categoryTab)}
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome(categoryTab);
            }}
            className="hover:text-white transition-colors"
          >
            {categoryLabel}
          </a>
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-600" />
          {isEpisodeView ? (
            <>
              <a
                href={getMediaUrl(item.id)}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateToMedia(item);
                }}
                className="hover:text-white transition-colors font-semibold text-zinc-200"
              >
                {item.title}
              </a>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-rose-300 font-bold">
                الحلقة {resolvedEpisode?.episodeNumber}
              </span>
            </>
          ) : (
            <span className="text-rose-300 font-bold">{item.title}</span>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isEpisodeView && (
            <a
              href={getMediaUrl(item.id)}
              onClick={(e) => {
                e.preventDefault();
                onNavigateToMedia(item);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              <span>صفحة المسلسل وكل الحلقات</span>
            </a>
          )}

          <a
            href={getHomeUrl('home')}
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome('home');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </a>
        </div>
      </div>

      {isEpisodeView && resolvedEpisode ? (
        <section className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0e0e14] border border-zinc-800/90 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white font-black">
                    مسلسل تركي
                  </span>
                  {resolvedSeason && (
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#161620] border border-zinc-700 text-rose-300 font-semibold">
                      {resolvedSeason.title}
                    </span>
                  )}
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-white text-[#881337] font-black font-mono">
                    الحلقة {resolvedEpisode.episodeNumber}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                  مشاهدة مسلسل {item.title} الحلقة {resolvedEpisode.episodeNumber} مترجمة HD
                </h1>

                {resolvedEpisode.title && (
                  <p className="text-xs sm:text-sm text-zinc-400">
                    {resolvedEpisode.title} · جودة 1080p FHD · {(item.views || 0).toLocaleString('ar-EG')} مشاهدة
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-all"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">تم نسخ رابط الحلقة</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-rose-400" />
                      <span>مشاركة رابط الحلقة</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleList(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                    isSavedInList
                      ? 'bg-[#2b0913] border-[#881337] text-rose-200'
                      : 'bg-[#161620] border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {isSavedInList ? <Check className="w-4 h-4 text-rose-400" /> : <Plus className="w-4 h-4" />}
                  <span>{isSavedInList ? 'في قائمتي' : 'حفظ لقائمتي'}</span>
                </button>
              </div>
            </div>
          </div>

          <div ref={playerSectionRef}>
            <VideoPlayerBlock
              title={`مشاهدة مسلسل ${item.title} الحلقة ${resolvedEpisode.episodeNumber}`}
              servers={resolvedEpisode.servers || []}
              downloadUrl={activeDownloadUrl}
              adSettings={adSettings}
              prevEpisodeHref={
                prevEpisode ? getEpisodeUrl(item.id, prevEpisode.episodeNumber) : undefined
              }
              onPrevEpisode={
                prevEpisode ? () => onNavigateToEpisode(item, prevEpisode.episodeNumber) : undefined
              }
              nextEpisodeHref={
                nextEpisode ? getEpisodeUrl(item.id, nextEpisode.episodeNumber) : undefined
              }
              onNextEpisode={
                nextEpisode ? () => onNavigateToEpisode(item, nextEpisode.episodeNumber) : undefined
              }
              episodeResetKey={`${item.id}-${resolvedEpisode.id}`}
            />
          </div>

          <div className="p-5 rounded-2xl bg-[#0e0e14] border border-zinc-800/80 flex flex-col sm:flex-row gap-5 items-start">
            <a
              href={getMediaUrl(item.id)}
              onClick={(e) => {
                e.preventDefault();
                onNavigateToMedia(item);
              }}
              className="shrink-0 w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-700/80 shadow-md bg-[#161620]"
            >
              {resolvedPosterImg && (
                <img
                  src={resolvedPosterImg}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
            </a>

            <div className="flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                {typeof item.rating === 'number' && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </span>
                )}
                <span>·</span>
                <span className="text-white font-semibold">{item.releaseYear}</span>
                {item.genres?.map(g => (
                  <span key={g} className="px-2 py-0.5 rounded bg-[#161620] border border-zinc-800 text-zinc-300">
                    {g}
                  </span>
                ))}
              </div>

              <h2 className="text-sm font-bold text-rose-300">قصة المسلسل والحلقة</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {resolvedEpisode.description || item.synopsis}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-[#0e0e14] border border-zinc-800 shadow-2xl">
            <div className="relative w-full h-56 sm:h-72 md:h-80 bg-[#08080b]">
              {resolvedMediaImg && (
                <img
                  src={resolvedMediaImg}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center brightness-75"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e14] via-[#0e0e14]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e14] via-[#0e0e14]/40 to-transparent" />
            </div>

            <div className="relative z-10 px-5 sm:px-8 pb-7 -mt-24 sm:-mt-28 flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-32 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-[#14141c] shrink-0">
                {resolvedPosterImg ? (
                  <img
                    src={resolvedPosterImg}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <Film className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 pt-2 sm:pt-10 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white font-black">
                    {item.type === 'movie' ? 'فيلم تركي' : 'مسلسل تركي'}
                  </span>
                  {isSeries && latestEpisodeNum !== null && (
                    <div className="flex items-center shadow-md rounded-md overflow-hidden border border-red-500/80">
                      <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5">
                        الحلقة
                      </span>
                      <span className="bg-white text-red-700 text-xs font-black font-mono px-2 py-0.5">
                        {latestEpisodeNum}
                      </span>
                    </div>
                  )}
                  {item.isEgyTurkOriginal && (
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#2a0812] border border-[#881337] text-rose-200 font-bold">
                      حصري على ايجي تورك
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                  {item.type === 'movie'
                    ? `مشاهدة فيلم ${item.title} (${item.releaseYear}) التركي مترجم HD`
                    : `مشاهدة مسلسل ${item.title} (${item.releaseYear}) التركي كامل مترجم`}
                </h1>

                {item.originalTitle && (
                  <p className="text-xs sm:text-sm text-zinc-400 font-mono" dir="ltr">
                    {item.originalTitle}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-300 font-medium">
                  {typeof item.rating === 'number' && (
                    <>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span className="tabular-nums">{item.rating.toFixed(1)} / 10</span>
                      </span>
                      <span className="text-zinc-600">·</span>
                    </>
                  )}
                  <span className="tabular-nums text-white font-semibold">{item.releaseYear}</span>
                  {item.ageRating && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs">
                        {item.ageRating}
                      </span>
                    </>
                  )}
                  {item.duration && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span>{item.duration}</span>
                    </>
                  )}
                  <span className="text-zinc-600">·</span>
                  <span className="flex items-center gap-1 text-rose-300 font-medium">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{(item.views || 0).toLocaleString('ar-EG')} مشاهدة</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(item.genres || []).map(g => (
                    <span
                      key={g}
                      className="text-xs px-3 py-1 rounded-lg bg-[#161620] border border-zinc-700/80 text-zinc-200"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-3xl">
                  {item.synopsis}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {item.type === 'movie' ? (
                    <button
                      type="button"
                      onClick={() =>
                        playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white font-black text-sm shadow-md transition-all active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>مشاهدة الفيلم الآن</span>
                    </button>
                  ) : (
                    latestEpisodeNum !== null && (
                      <a
                        href={getEpisodeUrl(item.id, latestEpisodeNum)}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigateToEpisode(item, latestEpisodeNum);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white font-black text-sm shadow-md transition-all active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        <span>مشاهدة الحلقة {latestEpisodeNum} الآن</span>
                      </a>
                    )
                  )}

                  {activeDownloadUrl && item.type === 'movie' && (
                    <a
                      href={activeDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل مباشر</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleList(item.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                      isSavedInList
                        ? 'bg-[#2b0913] border-[#881337] text-rose-200'
                        : 'bg-[#161620] border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {isSavedInList ? <Check className="w-4 h-4 text-rose-400" /> : <Plus className="w-4 h-4" />}
                    <span>{isSavedInList ? 'في قائمتي' : 'إضافة لقائمتي'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs sm:text-sm font-bold transition-all"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">تم نسخ الرابط</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-rose-400" />
                        <span>مشاركة الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {item.type === 'movie' && (
            <div ref={playerSectionRef} id="movie-player-section" className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-rose-400 fill-current" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  مشغل فيلم {item.title} مباشرة أون لاين
                </h2>
              </div>

              <VideoPlayerBlock
                title={`مشاهدة فيلم ${item.title}`}
                servers={item.servers || []}
                downloadUrl={item.downloadUrl}
                adSettings={adSettings}
                episodeResetKey={item.id}
              />
            </div>
          )}
        </section>
      )}

      {isSeries && activeSeason && (
        <section className="p-5 sm:p-6 rounded-2xl bg-[#0e0e14] border border-zinc-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Tv className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isEpisodeView ? `جميع حلقات مسلسل ${item.title}` : `حلقات مسلسل ${item.title}`}
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#2a0812] text-rose-200 border border-[#881337]">
                {activeSeason.episodes.length} حلقة
              </span>
            </div>

            {item.seasons && item.seasons.length > 1 && (
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="bg-[#161620] border border-zinc-700 text-rose-200 text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none"
              >
                {item.seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.episodes?.length || 0} حلقة)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {activeSeason.episodes
              .slice()
              .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
              .map(ep => {
                const epHref = getEpisodeUrl(item.id, ep.episodeNumber);
                const isActiveEp = isEpisodeView && resolvedEpisode?.id === ep.id;

                return (
                  <a
                    key={ep.id}
                    href={epHref}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateToEpisode(item, ep.episodeNumber);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group ${
                      isActiveEp
                        ? 'bg-gradient-to-r from-[#b91c1c] to-[#881337] border-rose-300 text-white shadow-lg scale-[1.03]'
                        : 'bg-[#161620] hover:bg-[#881337]/90 border-zinc-700/80 hover:border-[#b91c1c] text-zinc-200 hover:text-white'
                    }`}
                    title={`مشاهدة مسلسل ${item.title} الحلقة ${ep.episodeNumber} مترجمة HD كاملة`}
                  >
                    <span className="text-[11px] opacity-80 font-medium">الحلقة</span>
                    <span className="text-xl font-black font-mono leading-tight mt-0.5">
                      {ep.episodeNumber}
                    </span>
                    <span className="mt-1.5 text-[10px] px-2 py-0.5 rounded bg-black/30 text-rose-200 flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{isActiveEp ? 'قيد التشغيل' : 'مشاهدة'}</span>
                    </span>
                  </a>
                );
              })}
          </div>
        </section>
      )}

      {relatedItems.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-white">أعمال تركية مشابهة قد تعجبك</h2>
            <a
              href={getHomeUrl(categoryTab)}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome(categoryTab);
              }}
              className="text-xs text-rose-300 hover:text-white font-semibold transition-colors"
            >
              عرض المزيد في {categoryLabel}
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {relatedItems.map(rel => (
              <MediaCard
                key={rel.id}
                item={rel}
                onPlay={(target) => onNavigateToMedia(target, true)}
                onOpenDetails={(target) => onNavigateToMedia(target, false)}
                isSavedInList={isItemSaved ? isItemSaved(rel.id) : false}
                onToggleList={onToggleList}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
