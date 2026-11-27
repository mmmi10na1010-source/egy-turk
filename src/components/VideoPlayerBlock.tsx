import React, { useState, useEffect, useRef } from 'react';
import {
  Server,
  Maximize2,
  Tv,
  ChevronLeft,
  ChevronRight,
  Download,
  Zap
} from 'lucide-react';
import { ServerSource, AdSettings } from '../types';
import { AdSlot } from './AdSlot';

interface VideoPlayerBlockProps {
  title: string;
  servers: ServerSource[];
  downloadUrl?: string;
  adSettings: AdSettings;
  prevEpisodeHref?: string;
  onPrevEpisode?: () => void;
  nextEpisodeHref?: string;
  onNextEpisode?: () => void;
  episodeResetKey: string;
}

const resolveStreamingUrl = (rawUrl: string): { url: string; isEmbed: boolean } => {
  if (!rawUrl) return { url: '', isEmbed: false };
  let trimmed = rawUrl.trim();

  const hrefMatch = trimmed.match(/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1]) {
    trimmed = hrefMatch[1].trim();
  }

  const iframeSrcMatch = trimmed.match(/<iframe\s+(?:[^>]*?\s+)?src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    trimmed = iframeSrcMatch[1].trim();
  }

  if (trimmed.includes('cdnplus.') && !trimmed.includes('/embed-')) {
    trimmed = trimmed.replace(/cdnplus\.[a-z]+\/([a-zA-Z0-9]+)\.html/, 'cdnplus.org/embed-$1.html');
    return { url: trimmed, isEmbed: true };
  }

  if (trimmed.includes('vidspeed.org') && !trimmed.includes('/embed-')) {
    trimmed = trimmed.replace(/vidspeed\.org\/([a-zA-Z0-9]+)\.html/, 'vidspeed.org/embed-$1.html');
    return { url: trimmed, isEmbed: true };
  }

  if (trimmed.includes('anafast.org') && !trimmed.includes('/embed-')) {
    trimmed = trimmed.replace(/anafast\.org\/([a-zA-Z0-9]+)\.html/, 'anafast.org/embed-$1.html');
    return { url: trimmed, isEmbed: true };
  }

  if ((trimmed.includes('dood.') || trimmed.includes('ds2play') || trimmed.includes('doodstream')) && !trimmed.includes('/e/')) {
    trimmed = trimmed.replace(/\/(d|f)\//, '/e/');
    return { url: trimmed, isEmbed: true };
  }

  if (trimmed.includes('streamtape.com') && !trimmed.includes('/e/')) {
    trimmed = trimmed.replace('/v/', '/e/');
    return { url: trimmed, isEmbed: true };
  }

  if (trimmed.includes('vidmoly.me') && !trimmed.includes('/embed-')) {
    trimmed = trimmed.replace(/vidmoly\.me\/([a-zA-Z0-9]+)/, 'vidmoly.me/embed-$1.html');
    return { url: trimmed, isEmbed: true };
  }

  const isEmbedLikely =
    trimmed.includes('embed') ||
    trimmed.includes('/e/') ||
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be') ||
    trimmed.includes('vimeo.com') ||
    trimmed.includes('vidsrc') ||
    trimmed.includes('autoembed') ||
    trimmed.includes('ok.ru') ||
    trimmed.endsWith('.html');

  return { url: trimmed, isEmbed: isEmbedLikely };
};

export const VideoPlayerBlock: React.FC<VideoPlayerBlockProps> = ({
  title,
  servers,
  downloadUrl,
  adSettings,
  prevEpisodeHref,
  onPrevEpisode,
  nextEpisodeHref,
  onNextEpisode,
  episodeResetKey
}) => {
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedServerIndex(0);
    setIsLoading(true);
  }, [episodeResetKey]);

  const currentServer: ServerSource | undefined = servers[selectedServerIndex] || servers[0];
  const resolvedStream = currentServer ? resolveStreamingUrl(currentServer.url) : { url: '', isEmbed: false };
  const hasValidStreamUrl = Boolean(resolvedStream.url && resolvedStream.url.trim());

  useEffect(() => {
    if (!hasValidStreamUrl) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [selectedServerIndex, episodeResetKey, hasValidStreamUrl]);

  const handleServerSwitch = (index: number) => {
    setIsLoading(true);
    setSelectedServerIndex(index);
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className={`w-full ${isTheaterMode ? 'max-w-none' : ''}`}>
      <div className="mb-3 p-3.5 sm:p-4 rounded-2xl bg-[#101016] border border-zinc-800/90 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/70">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#dc2626]" />
            <span className="text-xs sm:text-sm font-bold text-zinc-200">سيرفرات المشاهدة السريعة:</span>
            {currentServer && (
              <span className="text-[11px] text-rose-300 font-mono hidden sm:inline">
                ({selectedServerIndex === 0 ? 'سيرفر VIP' : `سيرفر ${selectedServerIndex}`})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {prevEpisodeHref && onPrevEpisode && (
              <a
                href={prevEpisodeHref}
                onClick={(e) => {
                  e.preventDefault();
                  onPrevEpisode();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#161620] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>الحلقة السابقة</span>
              </a>
            )}

            {nextEpisodeHref && onNextEpisode && (
              <a
                href={nextEpisodeHref}
                onClick={(e) => {
                  e.preventDefault();
                  onNextEpisode();
                }}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold shadow-sm transition-all"
              >
                <span>الحلقة التالية</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={`p-2 rounded-xl border transition-colors text-xs font-bold flex items-center gap-1 ${
                isTheaterMode
                  ? 'bg-[#881337]/40 border-[#9F1239] text-rose-200'
                  : 'bg-[#161620] border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title={isTheaterMode ? 'الوضع العادي' : 'وضع المسرح'}
            >
              <Tv className="w-4 h-4" />
              <span className="hidden md:inline">{isTheaterMode ? 'وضع عادي' : 'مسرح'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-[#161620] border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              title="ملء الشاشة"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {servers.map((server, idx) => {
            const isActive = selectedServerIndex === idx;
            const isVip = idx === 0;
            const label = isVip ? 'سيرفر VIP' : `سيرفر ${idx}`;

            return (
              <button
                key={server.id || idx}
                type="button"
                onClick={() => handleServerSwitch(idx)}
                title={server.name || label}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all duration-200 active:scale-95 ${
                  isVip
                    ? isActive
                      ? 'bg-[#b91c1c] border-red-400 text-white shadow-md scale-[1.03]'
                      : 'bg-[#2a0812] border-[#b91c1c]/60 text-rose-200 hover:border-red-400 hover:bg-[#3a0b18]'
                    : isActive
                      ? 'bg-[#881337] border-[#9F1239] text-white shadow-md scale-[1.03]'
                      : 'bg-[#1c0b10] border-[#881337]/60 text-zinc-200 hover:border-[#9F1239] hover:text-white hover:bg-[#2a0e17]'
                }`}
              >
                {isVip && <Zap className="w-3.5 h-3.5 fill-current shrink-0" />}
                <span>{label}</span>
              </button>
            );
          })}

          {downloadUrl && downloadUrl.trim() && (
            <a
              href={downloadUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-500/70 bg-emerald-950/60 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              title="سيرفر تحميل مباشر"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل مباشر</span>
            </a>
          )}
        </div>
      </div>

      <div
        ref={videoContainerRef}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
      >
        {isLoading && hasValidStreamUrl && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
            <div className="w-10 h-10 border-4 border-[#881337]/30 border-t-[#dc2626] rounded-full animate-spin mb-3" />
            <span className="text-sm text-rose-200 font-medium">جاري تحميل البث...</span>
          </div>
        )}

        {currentServer && hasValidStreamUrl ? (
          resolvedStream.isEmbed || currentServer.type === 'embed' ? (
            <iframe
              key={resolvedStream.url}
              src={resolvedStream.url}
              title={title}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <video
              key={resolvedStream.url}
              src={resolvedStream.url}
              controls
              playsInline
              onLoadedData={() => setIsLoading(false)}
              className="w-full h-full object-contain bg-black"
            >
              متصفحك لا يدعم تشغيل هذا الفيديو مباشرة.
            </video>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
            <Server className="w-12 h-12 text-red-500 mb-2" />
            <p className="text-sm font-semibold">لا يتوفر سيرفر مشاهدة حالياً لهذا العمل.</p>
          </div>
        )}
      </div>

      {adSettings.isEnabled && adSettings.playerBannerHtml && (
        <div className="mt-3 p-3 rounded-2xl bg-[#101016] border border-zinc-800/80">
          <AdSlot htmlContent={adSettings.playerBannerHtml} label="إعلان ممول" />
        </div>
      )}
    </div>
  );
};
