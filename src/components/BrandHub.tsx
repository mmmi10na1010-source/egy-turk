import React from 'react';
import { Tv, Film, Clapperboard, Crown, Flame } from 'lucide-react';
import { CategoryId, CATEGORIES_ORDERED } from '../types';

interface BrandHubProps {
  onSelectCategory: (id: CategoryId) => void;
}

export const BrandHub: React.FC<BrandHubProps> = ({ onSelectCategory }) => {
  const getIcon = (id: CategoryId) => {
    switch (id) {
      case 'turkish_drama':
        return <Clapperboard className="w-5 h-5 text-red-400 group-hover:scale-105 transition-transform" />;
      case 'turkish_action':
        return <Flame className="w-5 h-5 text-rose-500 group-hover:scale-105 transition-transform" />;
      case 'turkish_historical':
        return <Crown className="w-5 h-5 text-red-300 group-hover:scale-105 transition-transform" />;
      case 'turkish_movies':
        return <Film className="w-5 h-5 text-[#9F1239] group-hover:scale-105 transition-transform" />;
      case 'egyturk_originals':
        return <Tv className="w-5 h-5 text-red-400 group-hover:scale-105 transition-transform" />;
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-5">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {CATEGORIES_ORDERED.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className="group relative cursor-pointer rounded-xl p-3.5 bg-gradient-to-b from-[#14141b] to-[#0c0c11] border border-zinc-800/90 hover:border-[#9F1239]/80 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-3 h-20"
          >
            <div className="p-2.5 rounded-xl bg-[#09090d] border border-zinc-800 group-hover:border-[#881337]/60 shrink-0">
              {getIcon(cat.id)}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white group-hover:text-rose-200 transition-colors truncate">
                {cat.titleAr}
              </span>
              <span className="text-[11px] text-zinc-400 truncate">
                {cat.descriptionAr}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
