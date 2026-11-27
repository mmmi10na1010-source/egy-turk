import { MediaItem } from '../types';

export interface ParsedAppRoute {
  mode: 'home' | 'details' | 'episode';
  watchId?: string;
  epParam?: string;
  autoplay?: boolean;
  tab?: string;
  search?: string;
}

export const getHomeUrl = (tab?: string): string => {
  if (!tab || tab === 'home') return '/';
  return `/?tab=${encodeURIComponent(tab)}`;
};

export const getMediaUrl = (itemId: string): string => {
  return `/watch/${encodeURIComponent(itemId)}`;
};

export const getMoviePlayUrl = (itemId: string): string => {
  return `/watch/${encodeURIComponent(itemId)}/play`;
};

export const getEpisodeUrl = (itemId: string, epNumber: number | string): string => {
  return `/watch/${encodeURIComponent(itemId)}/ep/${encodeURIComponent(String(epNumber))}`;
};

export const getCanonicalWatchUrl = (
  item: Pick<MediaItem, 'id' | 'type'>,
  epNumber?: number | string | null
): string => {
  if (item.type === 'series' && epNumber !== undefined && epNumber !== null && epNumber !== '') {
    return getEpisodeUrl(item.id, epNumber);
  }
  return getMediaUrl(item.id);
};

export const parseAppRoute = (
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  search: string = typeof window !== 'undefined' ? window.location.search : ''
): ParsedAppRoute => {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search);

  const epMatch = cleanPath.match(/^\/watch\/([^/]+)\/ep\/([^/]+)$/i);
  if (epMatch) {
    return {
      mode: 'episode',
      watchId: decodeURIComponent(epMatch[1]),
      epParam: decodeURIComponent(epMatch[2]),
      autoplay: true
    };
  }

  const playMatch = cleanPath.match(/^\/watch\/([^/]+)\/play$/i);
  if (playMatch) {
    return {
      mode: 'details',
      watchId: decodeURIComponent(playMatch[1]),
      autoplay: true
    };
  }

  const watchMatch = cleanPath.match(/^\/watch\/([^/]+)$/i);
  if (watchMatch) {
    return {
      mode: 'details',
      watchId: decodeURIComponent(watchMatch[1]),
      autoplay: false
    };
  }

  const watchParam = params.get('watch');
  const epParam = params.get('ep') || params.get('episode') || undefined;
  if (watchParam) {
    return {
      mode: epParam ? 'episode' : 'details',
      watchId: watchParam,
      epParam,
      autoplay: Boolean(epParam)
    };
  }

  const tab = params.get('tab') || undefined;
  const searchQuery = params.get('search') || undefined;

  return {
    mode: 'home',
    tab,
    search: searchQuery
  };
};
