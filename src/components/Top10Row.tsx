import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, Flame } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface Top10RowProps {
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  isSavedInList: (id: string) => boolean;
  onToggleList: (id: string) => void;
}

export const Top10Row: React.FC<Top10RowProps> = ({
  items,
  onPlay,
  onOpenDetails,
  isSavedInList,
  onToggleList
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sortedTrendingTop10 = [...items]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (sortedTrendingTop10.length === 0) return null;

  return (
    <div className="relative my-8 group">
      <div className="flex items-center justify-between px-4 md:px-8 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#2a0812] border border-[#881337]/70 text-rose-300">
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <span>الأعمال الـ 10 الأكثر رواجاً اليوم</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#2a0812] border border-[#881337]/70 text-rose-200 font-normal">
                حساب تلقائي بمشاهدات الفيديو الفعلية
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              يتم تحديث قائمة الرائج تلقائياً في الوقت الفعلي مع كل عملية تشغيل ومشاهدة فعلية
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-[#14141c] border border-zinc-700 text-zinc-300 hover:text-white hover:border-[#9F1239] transition-colors"
            title="التالي"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-[#14141c] border border-zinc-700 text-zinc-300 hover:text-white hover:border-[#9F1239] transition-colors"
            title="السابق"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex items-center gap-4 overflow-x-auto px-4 md:px-8 no-scrollbar scroll-smooth pb-4"
      >
        {sortedTrendingTop10.map((item, idx) => {
          const rank = idx + 1;
          return (
            <div
              key={item.id}
              className="relative flex items-center shrink-0 w-64 sm:w-72"
            >
              <div
                className="select-none font-black text-[120px] sm:text-[140px] leading-none shrink-0 -mr-6 sm:-mr-8 z-0 transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                style={{
                  fontFamily: 'impact, sans-serif',
                  WebkitTextStroke: '2px #9f1239',
                  color: '#060608'
                }}
              >
                {rank}
              </div>

              <div className="relative z-10 w-44 sm:w-48 shrink-0">
                <MediaCard
                  item={item}
                  onPlay={onPlay}
                  onOpenDetails={onOpenDetails}
                  isSavedInList={isSavedInList(item.id)}
                  onToggleList={onToggleList}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
