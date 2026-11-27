/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MediaItem,
  CategoryId,
  CATEGORIES_ORDERED,
  AdSettings
} from './types';
import {
  getStoredMediaItems,
  EGYTURK_MEDIA_STORAGE_KEY,
  resetMediaCatalogToDefault,
  getMyListIds,
  toggleMyList,
  isAdminLoggedIn,
  logoutAdmin,
  recordMediaView,
  subscribeToGlobalMediaCatalog,
  fetchGlobalMediaCatalog,
  subscribeToAdSettings,
  getStoredAdSettings,
  testFirestoreConnection
} from './services/storage';

import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { BrandHub } from './components/BrandHub';
import { CategoryRow } from './components/CategoryRow';
import { Top10Row } from './components/Top10Row';
import { MediaCard } from './components/MediaCard';
import { MediaPage } from './components/MediaPage';
import { LatestEpisodesRow } from './components/LatestEpisodesRow';
import { getLatestEpisodeNumber } from './utils/imageHelper';
import {
  parseAppRoute,
  ParsedAppRoute,
  getHomeUrl,
  getMediaUrl,
  getMoviePlayUrl,
  getEpisodeUrl
} from './utils/routes';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { EgyTurkIntroModal } from './components/EgyTurkIntroModal';
import { EgyTurkLogo } from './components/EgyTurkLogo';
import { AdSlot } from './components/AdSlot';

import {
  Film,
  Bookmark,
  Search,
  Shield,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(getStoredMediaItems);
  const [isCatalogLoaded, setIsCatalogLoaded] = useState<boolean>(false);
  const [myListIds, setMyListIds] = useState<string[]>(getMyListIds);
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminLoggedIn);

  const initialRoute = useMemo(() => parseAppRoute(), []);
  const [route, setRoute] = useState<ParsedAppRoute>(initialRoute);
  const [activeTab, setActiveTab] = useState<string>(initialRoute.tab || 'home');
  const [searchQuery, setSearchQuery] = useState<string>(initialRoute.search || '');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryId | null>(null);

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(false);

  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);

  useEffect(() => {
    try {
      if (adSettings?.isEnabled && adSettings?.headerScript) {
        const existing = document.getElementById('egyturk-injected-header-script');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'egyturk-injected-header-script';
        container.innerHTML = adSettings.headerScript;
        Array.from(container.childNodes).forEach(node => {
          if (node.nodeName === 'SCRIPT') {
            const oldScript = node as HTMLScriptElement;
            const s = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => s.setAttribute(attr.name, attr.value));
            if (oldScript.innerHTML) s.innerHTML = oldScript.innerHTML;
            document.head.appendChild(s);
          }
        });
      }
    } catch (e) {
      console.warn('Ad script injection notice:', e);
    }
  }, [adSettings]);

  useEffect(() => {
    testFirestoreConnection();

    fetchGlobalMediaCatalog()
      .then((items) => {
        setMediaItems(items);
        setIsCatalogLoaded(true);
      })
      .catch(() => {
        setIsCatalogLoaded(true);
      });

    const unsubscribeCatalog = subscribeToGlobalMediaCatalog((cloudItems) => {
      setMediaItems(cloudItems);
      setIsCatalogLoaded(true);
    });

    const unsubscribeAds = subscribeToAdSettings((newAds) => {
      setAdSettings(newAds);
    });

    return () => {
      if (typeof unsubscribeCatalog === 'function') unsubscribeCatalog();
      if (typeof unsubscribeAds === 'function') unsubscribeAds();
    };
  }, []);

  // Sync browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const next = parseAppRoute();
      setRoute(next);
      if (next.mode === 'home') {
        setActiveTab(next.tab || 'home');
        setSearchQuery(next.search || '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const pushPath = useCallback((targetPath: string, replace = false) => {
    const current = window.location.pathname + window.location.search;
    if (current !== targetPath) {
      if (replace) {
        window.history.replaceState({}, '', targetPath);
      } else {
        window.history.pushState({}, '', targetPath);
      }
    }
  }, []);

  const navigateHome = useCallback((tab: string = 'home') => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedCategoryFilter(null);
    setRoute({ mode: 'home', tab });
    pushPath(getHomeUrl(tab));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pushPath]);

  const navigateToMedia = useCallback((item: MediaItem, autoplay = false) => {
    setSearchQuery('');
    if (autoplay && item.type === 'series') {
      const latestEp = getLatestEpisodeNumber(item);
      if (latestEp !== null) {
        setRoute({
          mode: 'episode',
          watchId: item.id,
          epParam: String(latestEp),
          autoplay: true
        });
        pushPath(getEpisodeUrl(item.id, latestEp));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    setRoute({
      mode: 'details',
      watchId: item.id,
      autoplay
    });
    pushPath(autoplay && item.type === 'movie' ? getMoviePlayUrl(item.id) : getMediaUrl(item.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pushPath]);

  const navigateToEpisode = useCallback((item: MediaItem, epNumberOrId: number | string) => {
    setSearchQuery('');
    let epNumber: number | string = epNumberOrId;

    if (item.seasons) {
      for (const s of item.seasons) {
        const matched = s.episodes?.find(
          e => e.id === String(epNumberOrId) || String(e.episodeNumber) === String(epNumberOrId)
        );
        if (matched && typeof matched.episodeNumber === 'number') {
          epNumber = matched.episodeNumber;
          break;
        }
      }
    }

    setRoute({
      mode: 'episode',
      watchId: item.id,
      epParam: String(epNumber),
      autoplay: true
    });
    pushPath(getEpisodeUrl(item.id, epNumber));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pushPath]);

  const activeRouteItem = useMemo(() => {
    if (route.mode === 'home' || !route.watchId) return null;
    return mediaItems.find(i => i.id === route.watchId) || null;
  }, [route.mode, route.watchId, mediaItems]);

  // Normalize legacy ?watch= URLs cleanly to /watch/... without forcing reload
  useEffect(() => {
    if (!activeRouteItem || route.mode === 'home') return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('watch')) {
      let targetUrl = getMediaUrl(activeRouteItem.id);
      if (route.mode === 'episode' && route.epParam) {
        let epNum: number | string = route.epParam;
        if (activeRouteItem.seasons) {
          for (const s of activeRouteItem.seasons) {
            const matched = s.episodes?.find(
              e => e.id === route.epParam || String(e.episodeNumber) === String(route.epParam)
            );
            if (matched) {
              epNum = matched.episodeNumber;
              break;
            }
          }
        }
        targetUrl = getEpisodeUrl(activeRouteItem.id, epNum);
      }
      pushPath(targetUrl, true);
    }
  }, [activeRouteItem, route.mode, route.epParam, pushPath]);

  // Dynamic SEO Head Metadata & Schema.org JSON-LD per standalone page
  useEffect(() => {
    const origin = window.location.origin;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setCanonical = (href: string) => {
      let link = document.getElementById('egyturk-canonical-link') as HTMLLinkElement | null;
      if (!link) {
        link = document.querySelector('link[rel="canonical"]');
      }
      if (!link) {
        link = document.createElement('link');
        link.id = 'egyturk-canonical-link';
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    if (activeRouteItem && route.mode !== 'home') {
      const isMovie = activeRouteItem.type === 'movie';

      let currentEpNumber: number | null = null;
      if (!isMovie && route.mode === 'episode' && activeRouteItem.seasons) {
        const targetNum = Number(route.epParam);
        for (const s of activeRouteItem.seasons) {
          const found = s.episodes?.find(
            e => e.episodeNumber === targetNum || String(e.id) === String(route.epParam)
          );
          if (found && typeof found.episodeNumber === 'number') {
            currentEpNumber = found.episodeNumber;
            break;
          }
        }
      }

      const canonicalPath =
        !isMovie && currentEpNumber !== null
          ? getEpisodeUrl(activeRouteItem.id, currentEpNumber)
          : getMediaUrl(activeRouteItem.id);
      const currentUrl = `${origin}${canonicalPath}`;

      const pageTitle = isMovie
        ? `مشاهدة فيلم ${activeRouteItem.title} التركي مترجم كامل HD اون لاين | ايجي تورك EGY TURK`
        : currentEpNumber !== null
          ? `مشاهدة مسلسل ${activeRouteItem.title} الحلقة ${currentEpNumber} مترجمة HD اون لاين | ايجي تورك EGY TURK`
          : `مشاهدة مسلسل ${activeRouteItem.title} التركي كامل مترجم بجودة عالية FHD | ايجي تورك EGY TURK`;

      const metaDesc = isMovie
        ? `مشاهدة وتحميل فيلم ${activeRouteItem.title} التركي (${activeRouteItem.releaseYear}) ${activeRouteItem.genres?.join('، ') || ''} مترجم كامل بجودة 1080p FHD مع روابط وسيرفرات سريعة VIP على ايجي تورك EGY TURK.`
        : currentEpNumber !== null
          ? `مشاهدة وتحميل المسلسل التركي ${activeRouteItem.title} الحلقة ${currentEpNumber} (${activeRouteItem.releaseYear}) مترجمة كاملة بجودة عالية 1080p FHD مع سيرفرات مشاهدة سريعة VIP على ايجي تورك.`
          : `مشاهدة وتحميل المسلسل التركي ${activeRouteItem.title} (${activeRouteItem.releaseYear}) كامل جميع الحلقات مترجم بجودة 1080p FHD مع سيرفرات مشاهدة مباشرة VIP على ايجي تورك.`;

      const posterImg = activeRouteItem.posterUrl || activeRouteItem.backdropUrl || `${origin}/favicon.ico`;

      document.title = pageTitle;
      setMeta('description', metaDesc);
      setMeta('og:title', pageTitle, true);
      setMeta('og:description', metaDesc, true);
      setMeta('og:url', currentUrl, true);
      setCanonical(currentUrl);
      if (posterImg) {
        setMeta('og:image', posterImg, true);
        setMeta('twitter:image', posterImg);
      }
      setMeta('og:type', isMovie ? 'video.movie' : 'video.tv_show', true);
      setMeta('twitter:title', pageTitle);
      setMeta('twitter:description', metaDesc);

      let script = document.getElementById('egyturk-schema-jsonld') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'egyturk-schema-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }

      const categoryNames: Record<string, string> = {
        turkish_drama: 'مسلسلات دراما تركية مترجمة',
        turkish_action: 'مسلسلات أكشن وإثارة تركية مترجمة',
        turkish_historical: 'مسلسلات تاريخية تركية مترجمة',
        turkish_movies: 'أفلام تركية مترجمة'
      };
      const categoryTabs: Record<string, string> = {
        turkish_drama: 'drama',
        turkish_action: 'action',
        turkish_historical: 'historical',
        turkish_movies: 'movies'
      };
      const catLabel = categoryNames[activeRouteItem.categoryId] || 'مسلسلات وأفلام تركية مترجمة';
      const catTab = categoryTabs[activeRouteItem.categoryId] || 'home';

      const schemaData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': isMovie ? 'Movie' : currentEpNumber !== null ? 'TVEpisode' : 'TVSeries',
            'name': isMovie
              ? activeRouteItem.title
              : currentEpNumber !== null
                ? `${activeRouteItem.title} الحلقة ${currentEpNumber}`
                : activeRouteItem.title,
            'alternateName': activeRouteItem.originalTitle || undefined,
            'headline': isMovie
              ? activeRouteItem.title
              : currentEpNumber !== null
                ? `${activeRouteItem.title} الحلقة ${currentEpNumber}`
                : activeRouteItem.title,
            'episodeNumber': currentEpNumber ?? undefined,
            'partOfSeries': !isMovie
              ? {
                  '@type': 'TVSeries',
                  'name': activeRouteItem.title,
                  'url': `${origin}${getMediaUrl(activeRouteItem.id)}`
                }
              : undefined,
            'image': posterImg,
            'description': activeRouteItem.synopsis,
            'datePublished': `${activeRouteItem.releaseYear}-01-01`,
            'genre': activeRouteItem.genres,
            'inLanguage': 'ar',
            'url': currentUrl,
            'aggregateRating': {
              '@type': 'AggregateRating',
              'ratingValue': activeRouteItem.rating || 8.6,
              'bestRating': 10,
              'ratingCount':
                activeRouteItem.views && activeRouteItem.views > 20 ? activeRouteItem.views : 1850
            },
            'offers': {
              '@type': 'Offer',
              'price': '0',
              'priceCurrency': 'USD',
              'availability': 'https://schema.org/InStock',
              'url': currentUrl
            }
          },
          {
            '@type': 'BreadcrumbList',
            'itemListElement': [
              {
                '@type': 'ListItem',
                'position': 1,
                'name': 'الرئيسية',
                'item': `${origin}/`
              },
              {
                '@type': 'ListItem',
                'position': 2,
                'name': catLabel,
                'item': `${origin}${getHomeUrl(catTab)}`
              },
              {
                '@type': 'ListItem',
                'position': 3,
                'name': activeRouteItem.title,
                'item': `${origin}${getMediaUrl(activeRouteItem.id)}`
              },
              ...(currentEpNumber !== null
                ? [
                    {
                      '@type': 'ListItem',
                      'position': 4,
                      'name': `الحلقة ${currentEpNumber}`,
                      'item': currentUrl
                    }
                  ]
                : [])
            ]
          }
        ]
      };
      script.text = JSON.stringify(schemaData);
    } else if (searchQuery.trim()) {
      document.title = `بحث عن "${searchQuery}" - مسلسلات وأفلام تركية | ايجي تورك EGY TURK`;
    } else {
      document.title = 'ايجي تورك EGY TURK | موقع مشاهدة وتحميل المسلسلات والأفلام التركية المترجمة';
      const homeDesc =
        'موقع ايجي تورك EGY TURK الرسمي لمشاهدة وتحميل أحدث المسلسلات والأفلام التركية المترجمة للعربية (دراما، أكشن، تاريخية، أفلام تركية) كاملة مجاناً وبأعلى جودة FHD.';
      const canonicalHome = activeTab && activeTab !== 'home' ? `${origin}${getHomeUrl(activeTab)}` : `${origin}/`;
      setMeta('description', homeDesc);
      setMeta('og:title', 'ايجي تورك EGY TURK | مسلسلات وأفلام تركية مترجمة', true);
      setMeta('og:description', homeDesc, true);
      setMeta('og:url', canonicalHome, true);
      setCanonical(canonicalHome);
    }
  }, [activeRouteItem, route.mode, route.epParam, searchQuery, activeTab]);

  const featuredItem = useMemo(() => {
    return mediaItems.find(i => i.isFeatured) || mediaItems[0];
  }, [mediaItems]);

  const handleSaveItems = (newItems: MediaItem[]) => {
    setMediaItems(newItems);
    try {
      localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(newItems));
    } catch {
      // ignore
    }
  };

  const handleResetCatalog = async () => {
    const defaultData = await resetMediaCatalogToDefault();
    setMediaItems(defaultData);
  };

  const handleToggleWatchlist = useCallback((id: string) => {
    const updated = toggleMyList(id);
    setMyListIds(updated);
  }, []);

  const isSavedInList = useCallback((id: string) => myListIds.includes(id), [myListIds]);

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setIsAdminDashboardOpen(true);
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
    setIsAdminDashboardOpen(false);
  };

  const handleRecordView = useCallback((mediaId: string) => {
    const updated = recordMediaView(mediaId);
    setMediaItems(updated);
  }, []);

  const handleSelectCategoryFromHub = (categoryId: CategoryId) => {
    setSelectedCategoryFilter(categoryId);
    const element = document.getElementById(`section-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredMediaList = useMemo(() => {
    let result = mediaItems;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return result.filter(item => {
        const latestEp = getLatestEpisodeNumber(item);
        const latestEpQueries =
          latestEp !== null
            ? [
                `الحلقة ${latestEp}`,
                `الحلقه ${latestEp}`,
                `حلقة ${latestEp}`,
                `حلقه ${latestEp}`,
                `الحلقة${latestEp}`,
                `حلقة${latestEp}`,
                `${item.title} ${latestEp}`,
                `${item.title} الحلقة ${latestEp}`,
                `${item.title} الحلقه ${latestEp}`
              ].map(s => s.toLowerCase())
            : [];

        const matchesLatestEp = latestEpQueries.some(term => term.includes(q) || q.includes(term));

        const matchesEpisodeDesc =
          item.type === 'series' &&
          item.seasons?.some(s =>
            s.episodes?.some(
              ep =>
                (ep.description && ep.description.toLowerCase().includes(q)) ||
                (ep.title && ep.title.toLowerCase().includes(q))
            )
          );

        return (
          item.title.toLowerCase().includes(q) ||
          matchesLatestEp ||
          matchesEpisodeDesc ||
          (item.originalTitle && item.originalTitle.toLowerCase().includes(q)) ||
          (Array.isArray(item.genres) && item.genres.some(g => g.toLowerCase().includes(q))) ||
          (item.synopsis && item.synopsis.toLowerCase().includes(q)) ||
          (item.keywords && item.keywords.some(k => k.toLowerCase().includes(q)))
        );
      });
    }

    if (activeTab === 'drama') {
      result = result.filter(item => item.categoryId === 'turkish_drama');
    } else if (activeTab === 'action') {
      result = result.filter(item => item.categoryId === 'turkish_action');
    } else if (activeTab === 'historical') {
      result = result.filter(item => item.categoryId === 'turkish_historical');
    } else if (activeTab === 'movies') {
      result = result.filter(item => item.type === 'movie' || item.categoryId === 'turkish_movies');
    } else if (activeTab === 'series') {
      result = result.filter(item => item.type === 'series');
    } else if (activeTab === 'mylist') {
      result = result.filter(item => myListIds.includes(item.id));
    }

    if (selectedCategoryFilter && activeTab !== 'home') {
      result = result.filter(item => item.categoryId === selectedCategoryFilter);
    }

    return result;
  }, [mediaItems, searchQuery, activeTab, selectedCategoryFilter, myListIds]);

  const isWatchRoute = route.mode !== 'home' && !searchQuery.trim();

  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100 flex flex-col selection:bg-red-600 selection:text-white">
      <Navbar
        activeTab={isWatchRoute ? '' : activeTab}
        onSelectTab={(tab) => navigateHome(tab)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim() && route.mode !== 'home') {
            setRoute({ mode: 'home', tab: 'home' });
            pushPath('/', true);
          }
        }}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onAdminLogout={handleAdminLogout}
        myListCount={myListIds.length}
      />

      <main className="flex-1 pb-16">
        {searchQuery.trim() ? (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-rose-400" />
                  <span>نتائج البحث عن: "{searchQuery}"</span>
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  تم العثور على {filteredMediaList.length} عمل تركي
                </p>
              </div>

              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                مسح البحث
              </button>
            </div>

            {filteredMediaList.length === 0 ? (
              <div className="py-20 text-center text-zinc-400 space-y-3">
                <Search className="w-12 h-12 text-zinc-600 mx-auto" />
                <p className="text-base">لم نتمكن من العثور على أي عمل تركي يطابق بحثك.</p>
                <p className="text-xs text-zinc-500">جرب البحث بكلمات أخرى أو تصفح الأقسام الرئيسية.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredMediaList.map(item => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onPlay={(target) => navigateToMedia(target, true)}
                    onOpenDetails={(target) => navigateToMedia(target, false)}
                    isSavedInList={isSavedInList(item.id)}
                    onToggleList={handleToggleWatchlist}
                  />
                ))}
              </div>
            )}
          </div>
        ) : isWatchRoute ? (
          activeRouteItem ? (
            <MediaPage
              item={activeRouteItem}
              allItems={mediaItems}
              mode={route.mode === 'episode' ? 'episode' : 'details'}
              epParam={route.epParam}
              autoplay={route.autoplay}
              adSettings={adSettings}
              isSavedInList={isSavedInList(activeRouteItem.id)}
              isItemSaved={isSavedInList}
              onToggleList={handleToggleWatchlist}
              onNavigateHome={navigateHome}
              onNavigateToMedia={navigateToMedia}
              onNavigateToEpisode={navigateToEpisode}
              onRecordView={handleRecordView}
            />
          ) : !isCatalogLoaded ? (
            <div className="max-w-3xl mx-auto px-4 py-28 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-[#9F1239]/30 border-t-rose-500 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-zinc-400 font-medium">جاري تحميل صفحة العمل...</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
              <Film className="w-14 h-14 text-zinc-600 mx-auto" />
              <h1 className="text-2xl font-black text-white">الصفحة غير موجودة</h1>
              <p className="text-sm text-zinc-400">
                تعذر العثور على الفيلم أو المسلسل التركي المطلوب. ربما تم حذفه أو تغيير رابطه.
              </p>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigateHome('home');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-sm font-bold transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للصفحة الرئيسية</span>
              </a>
            </div>
          )
        ) : activeTab === 'home' ? (
          <div>
            {featuredItem && (
              <HeroBanner
                item={featuredItem}
                onPlay={(target) => navigateToMedia(target, true)}
                onMoreInfo={(target) => navigateToMedia(target, false)}
                isSavedInList={isSavedInList(featuredItem.id)}
                onToggleList={handleToggleWatchlist}
              />
            )}

            <BrandHub onSelectCategory={handleSelectCategoryFromHub} />

            {mediaItems.length === 0 ? (
              <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-3">
                <Film className="w-12 h-12 text-zinc-600 mx-auto" />
                <p className="text-base font-bold text-white">لا توجد أعمال في الكتالوج حالياً</p>
                <p className="text-xs text-zinc-400">
                  يمكنك إضافة مسلسلات وأفلام تركية جديدة من لوحة التحكم، أو استعادة القائمة الافتراضية.
                </p>
              </div>
            ) : (
              <>
                <Top10Row
                  items={mediaItems}
                  onPlay={(target) => navigateToMedia(target, true)}
                  onOpenDetails={(target) => navigateToMedia(target, false)}
                  isSavedInList={isSavedInList}
                  onToggleList={handleToggleWatchlist}
                />

                {adSettings.isEnabled && adSettings.homeBannerHtml && (
                  <div className="max-w-7xl mx-auto px-4 md:px-8 my-4">
                    <AdSlot htmlContent={adSettings.homeBannerHtml} label="إعلان ممول" />
                  </div>
                )}

                <LatestEpisodesRow
                  items={mediaItems}
                  onPlayEpisode={(item, epId) => navigateToEpisode(item, epId)}
                  onOpenDetails={(target) => navigateToMedia(target, false)}
                />

                <div id="section-turkish_drama">
                  <CategoryRow
                    category={CATEGORIES_ORDERED[0]}
                    items={mediaItems.filter(i => i.categoryId === 'turkish_drama')}
                    onPlay={(target) => navigateToMedia(target, true)}
                    onOpenDetails={(target) => navigateToMedia(target, false)}
                    isSavedInList={isSavedInList}
                    onToggleList={handleToggleWatchlist}
                  />
                </div>

                <div id="section-turkish_action">
                  <CategoryRow
                    category={CATEGORIES_ORDERED[1]}
                    items={mediaItems.filter(i => i.categoryId === 'turkish_action')}
                    onPlay={(target) => navigateToMedia(target, true)}
                    onOpenDetails={(target) => navigateToMedia(target, false)}
                    isSavedInList={isSavedInList}
                    onToggleList={handleToggleWatchlist}
                  />
                </div>

                <div id="section-turkish_historical">
                  <CategoryRow
                    category={CATEGORIES_ORDERED[2]}
                    items={mediaItems.filter(i => i.categoryId === 'turkish_historical')}
                    onPlay={(target) => navigateToMedia(target, true)}
                    onOpenDetails={(target) => navigateToMedia(target, false)}
                    isSavedInList={isSavedInList}
                    onToggleList={handleToggleWatchlist}
                  />
                </div>

                <div id="section-turkish_movies">
                  <CategoryRow
                    category={CATEGORIES_ORDERED[3]}
                    items={mediaItems.filter(i => i.categoryId === 'turkish_movies')}
                    onPlay={(target) => navigateToMedia(target, true)}
                    onOpenDetails={(target) => navigateToMedia(target, false)}
                    isSavedInList={isSavedInList}
                    onToggleList={handleToggleWatchlist}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white">
                  {activeTab === 'drama' && 'مسلسلات الدراما التركية المترجمة'}
                  {activeTab === 'action' && 'مسلسلات الأكشن والإثارة التركية'}
                  {activeTab === 'historical' && 'المسلسلات التاريخية التركية المترجمة'}
                  {activeTab === 'movies' && 'الأفلام التركية المترجمة'}
                  {activeTab === 'series' && 'المسلسلات التركية الكاملة'}
                  {activeTab === 'mylist' && 'قائمتي الخاصة'}
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  {activeTab === 'mylist'
                    ? 'الأعمال التركية التي قمت بحفظها لمشاهدتها لاحقاً'
                    : `عرض وتصفح أحدث الأعمال التركية المترجمة (${filteredMediaList.length} عمل)`}
                </p>
              </div>
            </div>

            {filteredMediaList.length === 0 ? (
              <div className="py-24 text-center text-zinc-400 space-y-3">
                {activeTab === 'mylist' ? (
                  <>
                    <Bookmark className="w-12 h-12 text-zinc-600 mx-auto" />
                    <p className="text-base font-semibold">قائمتك فارغة حالياً</p>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      يمكنك إضافة أي فيلم أو مسلسل تركي إلى قائمتك بالنقر على زر (+) لحفظه والمشاهدة لاحقاً.
                    </p>
                    <button
                      onClick={() => navigateHome('home')}
                      className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold"
                    >
                      تصفح الأعمال التركية الآن
                    </button>
                  </>
                ) : (
                  <>
                    <Film className="w-12 h-12 text-zinc-600 mx-auto" />
                    <p className="text-base">لا توجد أعمال في هذا التصنيف حالياً.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredMediaList.map(item => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onPlay={(target) => navigateToMedia(target, true)}
                    onOpenDetails={(target) => navigateToMedia(target, false)}
                    isSavedInList={isSavedInList(item.id)}
                    onToggleList={handleToggleWatchlist}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-[#09090d] border-t border-zinc-800/80 py-8 px-4 md:px-8 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <EgyTurkLogo size="sm" onClick={() => setIsIntroOpen(true)} />
            <p className="text-zinc-400 max-w-md text-center md:text-right leading-relaxed text-xs">
              منصة ايجي تورك EGY TURK المتخصصة في مشاهدة وتحميل أحدث المسلسلات والأفلام التركية المترجمة للعربية بأعلى جودة وسيرفرات فائقة السرعة.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-400">
              <button
                onClick={() => setIsAdminDashboardOpen(true)}
                className="hover:text-rose-300 transition-colors flex items-center gap-1 font-medium"
              >
                <Shield className="w-3.5 h-3.5 text-[#b91c1c]" />
                <span>لوحة تحكم المشرف</span>
              </button>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-5 border-t border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()} ايجي تورك EGY TURK</span>
          <span className="font-mono">EGY TURK Stream Engine</span>
        </div>
      </footer>

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {isAdmin && isAdminDashboardOpen && (
        <AdminDashboard
          items={mediaItems}
          onSaveItems={handleSaveItems}
          onResetCatalog={handleResetCatalog}
          onClose={() => setIsAdminDashboardOpen(false)}
        />
      )}

      <EgyTurkIntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
      />
    </div>
  );
}
