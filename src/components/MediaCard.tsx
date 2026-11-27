import React, { useState } from 'react';
import { Play, Info, Star, Eye } from 'lucide-react';
import { MediaItem } from '../types';
import { normalizeImageUrl, getLatestEpisodeNumber } from '../utils/imageHelper';
import { getMediaUrl } from '../utils/routes';

interface MediaCardProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  isSavedInList?: boolean;
  onToggleList?: (id: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPlay,
  onOpenDetails
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const latestEpisodeNum = getLatestEpisodeNumber(item);
  const resolvedImage = normalizeImageUrl(item.posterUrl || item.backdropUrl);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#101016] border border-zinc-800/90 hover:border-[#b91c1c]/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <a
        href={getMediaUrl(item.id)}
        onClick={(e) => {
          e.preventDefault();
          onOpenDetails(item);
        }}
        className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer bg-gradient-to-b from-[#171720] to-[#0a0a0e] block"
        title={`مشاهدة ${item.title} مترجم`}
      >
        {!imgError && resolvedImage ? (
          <img
            src={resolvedImage}
            alt={item.title}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#14141c] to-[#260610] text-center">
            <span className="text-base font-bold text-rose-200 mb-1 leading-snug">{item.title}</span>
            <span className="text-xs text-zinc-400 font-medium">{item.genres?.[0] || 'عمل تركي'}</span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#060608]/90 via-[#060608]/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#101016] via-[#101016]/80 to-transparent pointer-events-none group-hover:opacity-90 transition-opacity" />

        <div className="absolute top-2 inset-x-2 flex items-start justify-between z-10 pointer-events-none">
          {item.type === 'movie' ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white shadow-sm uppercase tracking-wider">
              فيلم
            </span>
          ) : (
            <span />
          )}

          {item.type === 'series' && latestEpisodeNum !== null && (
            <div className="flex items-center shadow-md rounded-md overflow-hidden border border-[#881337]/80 animate-in fade-in zoom-in-95">
              <span className="bg-[#881337] text-white text-[11px] font-black px-2 py-0.5 tracking-tight flex items-center gap-0.5">
                <span>الحلقة</span>
              </span>
              <span className="bg-white text-[#881337] text-[11px] font-black font-mono px-2 py-0.5">
                {latestEpisodeNum}
              </span>
            </div>
          )}
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white flex items-center justify-center shadow-lg transform transition-all duration-300 ${
              isHovered ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        <div
          className={`absolute bottom-2.5 inset-x-2.5 z-20 flex items-center gap-2 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay(item);
            }}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="مشاهدة الآن"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>مشاهدة</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenDetails(item);
            }}
            className="w-8 h-8 rounded-xl bg-black/80 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:border-[#b91c1c] hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-md shrink-0"
            title="تفاصيل الحلقات"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </a>

      <div className="p-3 flex flex-col justify-between flex-1 bg-[#101016]">
        <div>
          <h3 className="text-xs sm:text-sm font-black line-clamp-1">
            <a
              href={getMediaUrl(item.id)}
              onClick={(e) => {
                e.preventDefault();
                onOpenDetails(item);
              }}
              className="text-white hover:text-rose-300 transition-colors cursor-pointer"
              title={item.title}
            >
              {item.title}
              {item.type === 'series' && latestEpisodeNum !== null && (
                <span className="text-rose-400 font-normal mr-1.5 text-xs">
                  - الحلقة {latestEpisodeNum}
                </span>
              )}
            </a>
          </h3>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 mt-1 font-medium">
            {typeof item.rating === 'number' && (
              <>
                <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span className="tabular-nums">{item.rating.toFixed(1)}</span>
                </span>
                <span>·</span>
              </>
            )}
            <span className="tabular-nums text-zinc-300 font-semibold">{item.releaseYear}</span>
            {item.ageRating && (
              <>
                <span>·</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                  {item.ageRating}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-zinc-800/80">
          <span className="truncate text-rose-300 font-semibold">
            {item.genres?.[0] || 'عمل تركي'}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0 tabular-nums font-mono">
            <Eye className="w-3 h-3 text-zinc-500" />
            <span>{(item.views || 0).toLocaleString('ar-EG')}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
