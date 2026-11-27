import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, Tv, Play } from 'lucide-react';
import { MediaItem } from '../types';
import { normalizeImageUrl } from '../utils/imageHelper';
import { getEpisodeUrl, getMediaUrl } from '../utils/routes';

interface LatestEpisodeEntry {
  item: MediaItem;
  episodeId: string;
  episodeNumber: number;
  episodeTitle?: string;
}

interface LatestEpisodesRowProps {
  items: MediaItem[];
  onPlayEpisode: (item: MediaItem, episodeId: string) => void;
  onOpenDetails: (item: MediaItem) => void;
}

export const LatestEpisodesRow: React.FC<LatestEpisodesRowProps> = ({
  items,
  onPlayEpisode,
  onOpenDetails
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const latestEpisodes: LatestEpisodeEntry[] = React.useMemo(() => {
    const list: LatestEpisodeEntry[] = [];

    items.forEach(item => {
      if (item.type === 'series' && item.seasons && item.seasons.length > 0) {
        const allEps: { id: string; num: number; title?: string }[] = [];
        item.seasons.forEach(s => {
          if (s.episodes && s.episodes.length > 0) {
            s.episodes.forEach(ep => {
              if (typeof ep.episodeNumber === 'number') {
                allEps.push({
                  id: ep.id,
                  num: ep.episodeNumber,
                  title: ep.title
                });
              }
            });
          }
        });

        allEps.sort((a, b) => b.num - a.num);

        const top = allEps.slice(0, 2);
        top.forEach(ep => {
          list.push({
            item,
            episodeId: ep.id,
            episodeNumber: ep.num,
            episodeTitle: ep.title
          });
        });
      }
    });

    return list.sort((a, b) => b.episodeNumber - a.episodeNumber).slice(0, 16);
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (latestEpisodes.length === 0) return null;

  return (
    <section className="relative my-7 group">
      <div className="flex items-center justify-between px-4 md:px-8 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#2a0812] border border-[#881337]/70 text-rose-300">
            <Tv className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              أحدث الحلقات التركية المضافة اليوم
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              تصفح وشاهد أحدث حلقات المسلسلات التركية المترجمة فور صدورها بجودة 1080p FHD
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-[#14141c] border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-[#9F1239] transition-colors"
            title="التالي"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-[#14141c] border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-[#9F1239] transition-colors"
            title="السابق"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-3.5 overflow-x-auto px-4 md:px-8 pb-3 pt-1 no-scrollbar scroll-smooth"
      >
        {latestEpisodes.map(({ item, episodeId, episodeNumber }) => {
          const resolvedImg = normalizeImageUrl(item.posterUrl || item.backdropUrl);
          const epUrl = getEpisodeUrl(item.id, episodeNumber);
          const fullTitle = `مشاهدة مسلسل ${item.title} الحلقة ${episodeNumber} مترجمة HD`;

          return (
            <div
              key={`${item.id}-ep-${episodeNumber}`}
              className="flex-none w-36 sm:w-44 md:w-48 group/card flex flex-col rounded-2xl overflow-hidden bg-[#101016] border border-zinc-800/90 hover:border-[#9F1239]/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              <a
                href={epUrl}
                onClick={(e) => {
                  e.preventDefault();
                  onPlayEpisode(item, episodeId);
                }}
                className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer bg-gradient-to-b from-[#171720] to-[#0a0a0e] block"
                title={fullTitle}
              >
                {resolvedImg ? (
                  <img
                    src={resolvedImg}
                    alt={fullTitle}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center transform group-hover/card:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#14141b]">
                    <span className="text-xs font-bold text-white">{item.title}</span>
                  </div>
                )}

                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#060608]/80 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#101016] via-[#101016]/80 to-transparent pointer-events-none" />

                <div className="absolute top-2 right-2 z-10 flex items-center shadow-md rounded-md overflow-hidden border border-[#881337]">
                  <span className="bg-[#881337] text-white text-[10px] font-black px-1.5 py-0.5 tracking-tight">
                    الحلقة
                  </span>
                  <span className="bg-white text-[#881337] text-xs font-black font-mono px-1.5 py-0.5">
                    {episodeNumber}
                  </span>
                </div>

                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <div className="w-11 h-11 rounded-full bg-[#881337] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </a>

              <div className="p-2.5 flex flex-col flex-1 justify-between bg-[#101016]">
                <div>
                  <h3 className="text-xs font-black line-clamp-1">
                    <a
                      href={epUrl}
                      onClick={(e) => {
                        e.preventDefault();
                        onPlayEpisode(item, episodeId);
                      }}
                      className="text-white hover:text-rose-300 transition-colors"
                      title={fullTitle}
                    >
                      {item.title}
                    </a>
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span className="text-rose-300 font-bold font-mono">الحلقة {episodeNumber}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-medium">1080p</span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between">
                  <a
                    href={epUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      onPlayEpisode(item, episodeId);
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-[#881337]/30 hover:bg-[#881337] text-rose-200 hover:text-white border border-[#881337]/60 text-[10px] font-black transition-all flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>تشغيل</span>
                  </a>
                  <a
                    href={getMediaUrl(item.id)}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenDetails(item);
                    }}
                    className="mr-1.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] transition-colors"
                    title="كل الحلقات"
                  >
                    المزيد
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
