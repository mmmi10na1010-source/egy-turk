const FIREBASE_PROJECT_ID = 'gen-lang-client-0321363508';
const FIREBASE_API_KEY = 'AIzaSyCqudTTPdwV3Ws301pweBZ5K00n8Ax6g3c';
const FIRESTORE_DB_ID = 'ai-studio-miflix-d0679bc1-734b-44f8-bee6-35655b5c4f62';
const FIRESTORE_COLLECTION = 'egyturk_media_items';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;

const CATEGORY_MAP = {
  turkish_drama: { tab: 'drama', label: 'مسلسلات دراما تركية مترجمة' },
  turkish_action: { tab: 'action', label: 'مسلسلات أكشن وإثارة تركية مترجمة' },
  turkish_historical: { tab: 'historical', label: 'مسلسلات تاريخية تركية مترجمة' },
  turkish_movies: { tab: 'movies', label: 'أفلام تركية مترجمة' }
};

function parseFirestoreValue(val) {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const arr = val.arrayValue.values || [];
    return arr.map(parseFirestoreValue).filter(v => v !== undefined);
  }
  if ('mapValue' in val) {
    return parseFirestoreFields(val.mapValue.fields || {});
  }
  return undefined;
}

function parseFirestoreFields(fields) {
  const out = {};
  if (!fields || typeof fields !== 'object') return out;
  for (const [k, v] of Object.entries(fields)) {
    const parsed = parseFirestoreValue(v);
    if (parsed !== undefined) {
      out[k] = parsed;
    }
  }
  return out;
}

function parseFirestoreDoc(doc) {
  if (!doc || !doc.name) return null;
  const idFromName = doc.name.split('/').pop();
  const data = parseFirestoreFields(doc.fields || {});
  return {
    id: data.id || idFromName,
    ...data
  };
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${gDriveMatch[1]}`;
  }
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }
  return trimmed;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseWatchTarget(url) {
  const cleanPath = url.pathname.replace(/\/+$/, '') || '/';

  const epMatch = cleanPath.match(/^\/watch\/([^/]+)\/ep\/([^/]+)$/i);
  if (epMatch) {
    return {
      watchId: decodeURIComponent(epMatch[1]),
      epParam: decodeURIComponent(epMatch[2])
    };
  }

  const playMatch = cleanPath.match(/^\/watch\/([^/]+)\/play$/i);
  if (playMatch) {
    return {
      watchId: decodeURIComponent(playMatch[1]),
      epParam: null
    };
  }

  const watchMatch = cleanPath.match(/^\/watch\/([^/]+)$/i);
  if (watchMatch) {
    return {
      watchId: decodeURIComponent(watchMatch[1]),
      epParam: null
    };
  }

  const qWatch = url.searchParams.get('watch');
  if (qWatch) {
    return {
      watchId: qWatch,
      epParam: url.searchParams.get('ep') || url.searchParams.get('episode') || null
    };
  }

  return null;
}

async function fetchMediaItemById(id) {
  try {
    const res = await fetch(
      `${FIRESTORE_BASE}/${FIRESTORE_COLLECTION}/${encodeURIComponent(id)}?key=${FIREBASE_API_KEY}`
    );
    if (!res.ok) return null;
    const doc = await res.json();
    return parseFirestoreDoc(doc);
  } catch {
    return null;
  }
}

async function fetchAllMediaItems() {
  const items = [];
  const res = await fetch(`${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: FIRESTORE_COLLECTION }],
        limit: 1000
      }
    })
  });
  if (!res.ok) return items;
  const rows = await res.json();
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row?.document) continue;
      const parsed = parseFirestoreDoc(row.document);
      if (parsed && parsed.id && parsed.title) {
        items.push(parsed);
      }
    }
  }
  return items;
}

function buildSitemapXml(origin, items) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${escapeXml(origin)}/</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${escapeXml(origin)}/?tab=drama</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${escapeXml(origin)}/?tab=action</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${escapeXml(origin)}/?tab=historical</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${escapeXml(origin)}/?tab=movies</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${escapeXml(origin)}/?tab=series</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`
  ];

  for (const item of items) {
    const lastmod =
      typeof item.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.createdAt)
        ? item.createdAt.slice(0, 10)
        : today;

    const mediaLoc = `${origin}/watch/${encodeURIComponent(item.id)}`;
    lines.push(
      `  <url><loc>${escapeXml(mediaLoc)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.85</priority></url>`
    );

    if (item.type === 'series' && Array.isArray(item.seasons)) {
      for (const season of item.seasons) {
        if (!Array.isArray(season?.episodes)) continue;
        for (const ep of season.episodes) {
          const epNum = ep?.episodeNumber ?? ep?.id;
          if (epNum === undefined || epNum === null || epNum === '') continue;
          const epLoc = `${origin}/watch/${encodeURIComponent(item.id)}/ep/${encodeURIComponent(String(epNum))}`;
          lines.push(
            `  <url><loc>${escapeXml(epLoc)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.80</priority></url>`
          );
        }
      }
    }
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

function injectSeoIntoHtml(html, origin, item, epParam) {
  const isMovie = item.type !== 'series';
  let matchedEpisode = null;
  let currentEpNumber = null;

  if (!isMovie && epParam && Array.isArray(item.seasons)) {
    const targetNum = Number(epParam);
    for (const season of item.seasons) {
      if (!Array.isArray(season?.episodes)) continue;
      const found = season.episodes.find(
        e => e?.episodeNumber === targetNum || String(e?.id) === String(epParam)
      );
      if (found) {
        matchedEpisode = found;
        currentEpNumber = found.episodeNumber ?? epParam;
        break;
      }
    }
  }

  const canonicalPath =
    !isMovie && currentEpNumber !== null
      ? `/watch/${encodeURIComponent(item.id)}/ep/${encodeURIComponent(String(currentEpNumber))}`
      : `/watch/${encodeURIComponent(item.id)}`;
  const canonicalUrl = `${origin}${canonicalPath}`;

  const pageTitle = isMovie
    ? `مشاهدة فيلم ${item.title} التركي مترجم كامل HD اون لاين | ايجي تورك EGY TURK`
    : currentEpNumber !== null
      ? `مشاهدة مسلسل ${item.title} الحلقة ${currentEpNumber} مترجمة HD اون لاين | ايجي تورك EGY TURK`
      : `مشاهدة مسلسل ${item.title} التركي كامل مترجم بجودة عالية FHD | ايجي تورك EGY TURK`;

  const genresStr = Array.isArray(item.genres) ? item.genres.join('، ') : '';
  const releaseYear = item.releaseYear || 2025;
  const metaDesc = isMovie
    ? `مشاهدة وتحميل فيلم ${item.title} التركي (${releaseYear}) ${genresStr} مترجم كامل بجودة 1080p FHD مع سيرفرات سريعة VIP على ايجي تورك EGY TURK.`
    : currentEpNumber !== null
      ? `مشاهدة وتحميل المسلسل التركي ${item.title} الحلقة ${currentEpNumber} (${releaseYear}) مترجمة كاملة بجودة عالية 1080p FHD على ايجي تورك EGY TURK.`
      : `مشاهدة وتحميل المسلسل التركي ${item.title} (${releaseYear}) كامل جميع الحلقات مترجم بجودة 1080p FHD على ايجي تورك EGY TURK.`;

  const posterImg =
    normalizeImageUrl(item.posterUrl || item.backdropUrl) || `${origin}/favicon.ico`;

  const catInfo = CATEGORY_MAP[item.categoryId] || { tab: 'home', label: 'مسلسلات وأفلام تركية مترجمة' };

  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': isMovie ? 'Movie' : currentEpNumber !== null ? 'TVEpisode' : 'TVSeries',
        name: isMovie
          ? item.title
          : currentEpNumber !== null
            ? `${item.title} الحلقة ${currentEpNumber}`
            : item.title,
        alternateName: item.originalTitle || undefined,
        episodeNumber: currentEpNumber !== null ? Number(currentEpNumber) || currentEpNumber : undefined,
        partOfSeries: !isMovie
          ? {
              '@type': 'TVSeries',
              name: item.title,
              url: `${origin}/watch/${encodeURIComponent(item.id)}`
            }
          : undefined,
        image: posterImg,
        description: matchedEpisode?.description || item.synopsis || metaDesc,
        datePublished: `${releaseYear}-01-01`,
        genre: Array.isArray(item.genres) ? item.genres : undefined,
        inLanguage: 'ar',
        url: canonicalUrl,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: item.rating || 8.6,
          bestRating: 10,
          ratingCount: item.views && item.views > 20 ? item.views : 1850
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: catInfo.label, item: `${origin}/?tab=${catInfo.tab}` },
          {
            '@type': 'ListItem',
            position: 3,
            name: item.title,
            item: `${origin}/watch/${encodeURIComponent(item.id)}`
          },
          ...(currentEpNumber !== null
            ? [
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: `الحلقة ${currentEpNumber}`,
                  item: canonicalUrl
                }
              ]
            : [])
        ]
      }
    ]
  };

  let episodeLinksHtml = '';
  if (!isMovie && Array.isArray(item.seasons)) {
    const links = [];
    for (const season of item.seasons) {
      if (!Array.isArray(season?.episodes)) continue;
      for (const ep of season.episodes) {
        const epNum = ep?.episodeNumber ?? ep?.id;
        if (epNum === undefined || epNum === null) continue;
        const epHref = `/watch/${encodeURIComponent(item.id)}/ep/${encodeURIComponent(String(epNum))}`;
        links.push(
          `<li><a href="${escapeHtml(epHref)}">مشاهدة مسلسل ${escapeHtml(item.title)} الحلقة ${escapeHtml(epNum)} مترجمة HD</a></li>`
        );
      }
    }
    if (links.length > 0) {
      episodeLinksHtml = `<section><h2>جميع حلقات مسلسل ${escapeHtml(item.title)}</h2><ul>${links.join('')}</ul></section>`;
    }
  }

  const rootFallbackHtml = `<div id="root"><article style="max-width:960px;margin:0 auto;padding:24px;color:#eee;"><nav><a href="/">الرئيسية</a> &gt; <a href="/?tab=${escapeHtml(catInfo.tab)}">${escapeHtml(catInfo.label)}</a> &gt; <a href="/watch/${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a></nav><h1>${escapeHtml(
    isMovie
      ? `مشاهدة فيلم ${item.title} (${releaseYear}) التركي مترجم HD`
      : currentEpNumber !== null
        ? `مشاهدة مسلسل ${item.title} الحلقة ${currentEpNumber} مترجمة HD`
        : `مشاهدة مسلسل ${item.title} (${releaseYear}) التركي كامل مترجم`
  )}</h1><p>${escapeHtml(matchedEpisode?.description || item.synopsis || metaDesc)}</p>${episodeLinksHtml}</article></div>`;

  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(pageTitle)}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="description" content="${escapeHtml(metaDesc)}" />`
  );
  out = out.replace(
    /<link\s+rel="canonical"[^>]*>/i,
    () => `<link rel="canonical" id="egyturk-canonical-link" href="${escapeHtml(canonicalUrl)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:description" content="${escapeHtml(metaDesc)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:type" content="${isMovie ? 'video.movie' : 'video.tv_show'}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="twitter:description" content="${escapeHtml(metaDesc)}" />`
  );

  // Inject og:image & twitter:image
  const imageTags = `\n    <meta property="og:image" content="${escapeHtml(posterImg)}" />\n    <meta name="twitter:image" content="${escapeHtml(posterImg)}" />`;
  out = out.replace(/<\/head>/i, () => `${imageTags}\n  </head>`);

  // Replace Schema.org JSON-LD safely
  const safeJsonLd = JSON.stringify(schemaData).replace(/<\/script/gi, '<\\/script');
  out = out.replace(
    /<script\s+id="egyturk-schema-jsonld"\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    () => `<script id="egyturk-schema-jsonld" type="application/ld+json">${safeJsonLd}</script>`
  );

  // Replace root fallback block cleanly
  out = out.replace(
    /<!-- EGYTURK_SEO_ROOT_START -->[\s\S]*?<!-- EGYTURK_SEO_ROOT_END -->/i,
    () => `<!-- EGYTURK_SEO_ROOT_START -->${rootFallbackHtml}<!-- EGYTURK_SEO_ROOT_END -->`
  );

  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Dynamic XML Sitemap directly from Firestore
    if (url.pathname === '/sitemap.xml') {
      try {
        const items = await fetchAllMediaItems();
        if (items.length > 0) {
          const xml = buildSitemapXml(url.origin, items);
          return new Response(xml, {
            status: 200,
            headers: {
              'content-type': 'application/xml; charset=utf-8',
              'cache-control': 'public, max-age=300'
            }
          });
        }
      } catch {
        // Fallback to static sitemap asset
      }
      return env.ASSETS.fetch(request);
    }

    // 2. Edge SSR Metadata & Crawlable HTML for /watch/* and legacy ?watch=*
    const target = parseWatchTarget(url);
    if (target && target.watchId) {
      const indexReq = new Request(new URL('/index.html', url.origin).toString(), {
        method: 'GET',
        headers: request.headers
      });
      const [assetRes, item] = await Promise.all([
        env.ASSETS.fetch(indexReq),
        fetchMediaItemById(target.watchId)
      ]);

      const html = await assetRes.text();
      if (!item || !item.title) {
        return new Response(html, {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=60'
          }
        });
      }

      const seoHtml = injectSeoIntoHtml(html, url.origin, item, target.epParam);
      return new Response(seoHtml, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=120'
        }
      });
    }

    // 3. Default static assets / SPA shell
    return env.ASSETS.fetch(request);
  }
};
