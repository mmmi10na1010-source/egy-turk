export type CategoryId =
  | 'turkish_drama'
  | 'turkish_action'
  | 'turkish_historical'
  | 'turkish_movies'
  | 'egyturk_originals';

export interface CategoryInfo {
  id: CategoryId;
  titleAr: string;
  order: number;
  descriptionAr: string;
}

export const CATEGORIES_ORDERED: CategoryInfo[] = [
  {
    id: 'turkish_drama',
    titleAr: 'دراما تركية',
    order: 1,
    descriptionAr: 'أحدث المسلسلات الدرامية والرومانسية التركية المترجمة'
  },
  {
    id: 'turkish_action',
    titleAr: 'أكشن وإثارة',
    order: 2,
    descriptionAr: 'أقوى مسلسلات المافيا والغموض والأكشن التركي المترجم'
  },
  {
    id: 'turkish_historical',
    titleAr: 'تاريخية وأسطورية',
    order: 3,
    descriptionAr: 'الملاحم التاريخية التركية الكبرى مترجمة كاملة HD'
  },
  {
    id: 'turkish_movies',
    titleAr: 'أفلام تركية',
    order: 4,
    descriptionAr: 'أحدث الأفلام السينمائية التركية المترجمة بأعلى جودة'
  }
];

export interface ServerSource {
  id: string;
  name: string;
  url: string;
  quality?: string;
  type?: 'embed' | 'direct' | 'youtube';
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  description?: string;
  duration?: string;
  thumbnail?: string;
  views?: number;
  servers: ServerSource[];
  downloadUrl?: string;
}

export interface Season {
  id: string;
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export type MediaType = 'movie' | 'series';

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  categoryId: CategoryId;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  rating?: number;
  ageRating?: string;
  genres: string[];
  duration?: string;
  isFeatured?: boolean;
  views: number;
  isEgyTurkOriginal?: boolean;
  keywords?: string[];
  servers?: ServerSource[];
  downloadUrl?: string;
  seasons?: Season[];
  createdAt: string;
}

export interface AdminUser {
  username: string;
  role: 'admin';
  isAuthenticated: boolean;
}

export interface AdSettings {
  isEnabled: boolean;
  headerScript: string;
  playerBannerHtml: string;
  homeBannerHtml: string;
}
