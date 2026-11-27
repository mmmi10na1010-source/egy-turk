import React from 'react';
import { Play, Plus, Check, Info, Star } from 'lucide-react';
import { MediaItem } from '../types';
import { normalizeImageUrl, getLatestEpisodeNumber } from '../utils/imageHelper';
import { getMediaUrl, getEpisodeUrl } from '../utils/routes';

interface HeroBannerProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onMoreInfo: (item: MediaItem) => void;
  isSavedInList: boolean;
  onToggleList: (id: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  item,
  onPlay,
  onMoreInfo,
  isSavedInList,
  onToggleList
}) => {
  const heroImage = normalizeImageUrl(item.backdropUrl || item.posterUrl);
  const latestEp = item.type === 'series' ? getLatestEpisodeNumber(item) : null;
  const playHref = latestEp ? getEpisodeUrl(item.id, latestEp) : getMediaUrl(item.id);
  const detailsHref = getMediaUrl(item.id);
  return (
    <section className="relative w-full h-[65vh] min-h-[480px] max-h-[680px] overflow-hidden select-none">
      <div className="absolute inset-0 z-0 bg-[#060608]">
        {heroImage && (
          <img
            src={heroImage}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.8] contrast-[1.06]"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060608] via-[#060608]/75 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto h-full px-4 md:px-8 flex flex-col justify-end pb-12 md:pb-14">
        <div className="max-w-2xl space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />
            <span>
              {item.isEgyTurkOriginal ? 'حصري على ايجي تورك' : 'مترجم الآن بأعلى دقة'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight text-balance drop-shadow-md">
            {item.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm text-zinc-300 font-medium">
            {typeof item.rating === 'number' && (
              <>
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="tabular-nums">{item.rating.toFixed(1)}</span>
                </div>
                <span className="text-zinc-600">·</span>
              </>
            )}
            <span className="tabular-nums">{item.releaseYear}</span>
            {item.ageRating && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-300">{item.ageRating}</span>
              </>
            )}
            {item.duration && (
              <>
                <span className="text-zinc-600">·</span>
                <span>{item.duration}</span>
              </>
            )}
            <span className="text-zinc-600">·</span>
            <span className="text-rose-300 font-medium">
              {(item.views || 0).toLocaleString('ar-EG')} مشاهدة
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            {(item.genres || []).map((g, i) => (
              <React.Fragment key={g}>
                <span className="hover:text-rose-300 transition-colors">{g}</span>
                {i < (item.genres?.length || 0) - 1 && <span className="text-zinc-600">·</span>}
              </React.Fragment>
            ))}
          </div>

          <p className="text-sm md:text-base text-zinc-300 line-clamp-3 leading-relaxed max-w-xl text-balance">
            {item.synopsis}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={playHref}
              onClick={(e) => {
                e.preventDefault();
                onPlay(item);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9f1239] text-white font-bold text-sm shadow-md transition-all transform hover:scale-[1.02] active:scale-95"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>مشاهدة الآن</span>
            </a>

            <button
              onClick={() => onToggleList(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                isSavedInList
                  ? 'bg-[#2b0913] border-[#881337] text-rose-200'
                  : 'bg-[#15151d]/85 border-zinc-700 text-zinc-200 hover:bg-[#1f1f2b] hover:border-[#9F1239]/60'
              }`}
            >
              {isSavedInList ? (
                <>
                  <Check className="w-4 h-4 text-rose-400" />
                  <span>في قائمتي</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>إضافة لقائمتي</span>
                </>
              )}
            </button>

            <a
              href={detailsHref}
              onClick={(e) => {
                e.preventDefault();
                onMoreInfo(item);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#15151d]/85 hover:bg-[#1f1f2b] border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-sm font-semibold transition-colors"
            >
              <Info className="w-4 h-4 text-zinc-400" />
              <span>التفاصيل</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
