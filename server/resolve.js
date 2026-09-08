const { TTL } = require('./cache');
const { Titles } = require('./titles');



function normalizeAnikotoAnime(item) {
  return {
    source: 'anikoto',
    seriesId: item.id,
    title: item.title || item.name,
    altTitle: item.alternative || item.native,
    poster: item.poster || item.background_image,
    year: item.year,
    score: item.score,
    status: item.status,
    episodes: parseInt(item.episodes, 10) || null,
    malId: item.mal_id ? parseInt(item.mal_id, 10) : null,
    aniId: item.ani_id ? parseInt(item.ani_id, 10) : null,
    description: item.description,
    genres: item.terms_by_type?.genre || [],
    hasSub: !!item.is_sub,
    hasDub: !!item.is_dub,
  };
}

function normalizeAniListMedia(media) {
  if (!media) return null;
  const statusMap = {
    FINISHED: 'Finished Airing',
    RELEASING: 'Currently Airing',
    NOT_YET_RELEASED: 'Not Yet Aired',
    CANCELLED: 'Cancelled',
    HIATUS: 'Hiatus',
  };
  const typeMap = {
    MOVIE: 'Movie',
    MUSIC: 'Music',
    TV: 'TV',
    TV_SHORT: 'TV Special',
    OVA: 'OVA',
    ONA: 'ONA',
    SPECIAL: 'Special',
  };
  const titleFields = {
    title: media.title?.romaji || media.title?.userPreferred || '',
    title_english: media.title?.english || '',
    title_japanese: media.title?.native || '',
    title_synonyms: media.synonyms || [],
  };
  return {
    source: 'anilist',
    seriesId: null,
    title: Titles.buildDisplayTitle(titleFields),
    titleEnglish: media.title?.english || null,
    titleRomaji: media.title?.romaji || null,
    synonyms: media.synonyms || [],
    altTitle: media.title?.native || null,
    rating: null,
    poster: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null,
    banner: media.bannerImage || null,
    bannerImage: media.bannerImage || null,
    year: media.seasonYear || media.startDate?.year || null,
    score: media.averageScore ? media.averageScore / 10 : 0,
    status: statusMap[media.status] || media.status || 'Finished Airing',
    type: typeMap[media.format] || media.format || 'TV',
    episodes: media.episodes || null,
    malId: media.idMal || null,
    aniId: media.id || null,
    description: media.description ? media.description.replace(/<[^>]*>/g, '') : '',
    genres: media.genres || [],
    hasSub: true,
    hasDub: true,
  };
}

function normalizeEpisodes(episodes = []) {
  const mapped = episodes.map((ep, i) => {
    const num = ep.number ?? ep.episode_number ?? ep.episode ?? (i + 1);
    const embUrl = ep.embed_url || ep.embedUrl || null;
    let zencloudId = ep.zencloud_id || ep.zencloudId || ep.zen_id || null;
    if (!zencloudId && typeof embUrl === 'string' && embUrl.includes('zencloud.com')) {
      const parts = embUrl.split('/v/');
      if (parts[1]) zencloudId = parts[1].split('/')[0];
    }
    return {
      number: Number(num) || i + 1,
      title: ep.title || ep.name || `Episode ${num}`,
      embedId: ep.episode_embed_id || ep.embed_id || ep.embedId,
      embedUrl: embUrl,
      zencloudId,
      id: ep.id,
    };
  });

  const nums = mapped.map((e) => Number(e.number)).filter((n) => !Number.isNaN(n));
  const min = nums.length ? Math.min(...nums) : 1;
  if (min === 0) {
    return mapped.map((e) => ({ ...e, number: Number(e.number) + 1 }));
  }
  return mapped.map((e, i) => ({
    ...e,
    number: Number(e.number) || i + 1,
  }));
}

function buildEpisodesFromCount(count, start = 1) {
  const total = count || 1;
  return Array.from({ length: total }, (_, i) => ({
    number: start + i,
    title: `Episode ${start + i}`,
    embedId: null,
    embedUrl: null,
    id: null,
  }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, options = {}, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'AnimeXplore/1.0',
          Accept: 'application/json',
          ...options.headers,
        },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(500 * (attempt + 1));
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) await sleep(350 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function fetchAniList(query, variables = {}, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://anilist.co/',
          Origin: 'https://anilist.co',
        },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(500 * (attempt + 1));
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      lastErr = err;
      if (err.message && err.message.includes('403')) break;
      if (attempt < retries - 1) await sleep(350 * (attempt + 1));
    }
  }
  throw lastErr;
}

function createResolver({ cache, upstream }) {
  async function getRecent(page, perPage = 50) {
    const key = `recent:${page}:${perPage}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const json = await fetchJSON(
      `${upstream.anikoto}/recent-anime?page=${page}&per_page=${perPage}`
    );
    const result = {
      items: json.data || [],
      pagination: json.pagination || { page, per_page: perPage, total_pages: 1 },
    };
    cache.indexRecentItems(result.items);
    cache.set(key, result, TTL.recent);
    return result;
  }

  async function getSeries(seriesId) {
    const key = `series:${seriesId}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const json = await fetchJSON(`${upstream.anikoto}/series/${seriesId}`);
    const data = json.data || json;
    const result = {
      anime: data.anime || data,
      episodes: data.episodes || [],
    };
    cache.set(key, result, TTL.series);
    if (result.anime?.mal_id) {
      cache.malIndex.set(String(result.anime.mal_id), seriesId);
    }
    return result;
  }

  async function findSeriesByMal(malId, maxPages = 12) {
    const existing = cache.getSeriesIdByMal(malId);
    if (existing) return existing;

    const target = String(malId);
    const batchSize = 4;

    for (let start = 1; start <= maxPages; start += batchSize) {
      const pages = Array.from({ length: batchSize }, (_, i) => start + i).filter((p) => p <= maxPages);
      const results = await Promise.all(pages.map((p) => getRecent(p, 50)));

      for (const { items } of results) {
        const match = items.find((a) => String(a.mal_id) === target);
        if (match) {
          cache.malIndex.set(target, match.id);
          return match.id;
        }
      }

      const last = results[results.length - 1];
      if (last && start >= last.pagination.total_pages) break;
    }
    return null;
  }

  async function getAniListDetailsByMalId(malId) {
    const idNum = parseInt(malId, 10);
    if (!idNum) return null;
    const key = `anilist:mal:${idNum}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const graphql = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
          idMal
          title { romaji english native userPreferred }
          coverImage { extraLarge large medium }
          bannerImage
          startDate { year }
          seasonYear
          averageScore
          status
          format
          episodes
          description
          genres
          synonyms
        }
      }
    `;
    try {
      const json = await fetchAniList(graphql, { malId: idNum });
      const media = json.data?.Media || null;
      if (media) {
        cache.set(key, media, TTL.anilist);
        return media;
      }
    } catch (_) {}

    // Fallback if the ID passed was directly an AniList ID
    try {
      const byIdGql = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            idMal
            title { romaji english native userPreferred }
            coverImage { extraLarge large medium }
            bannerImage
            startDate { year }
            seasonYear
            averageScore
            status
            format
            episodes
            description
            genres
            synonyms
          }
        }
      `;
      const json = await fetchAniList(byIdGql, { id: idNum });
      const media = json.data?.Media || null;
      if (media) {
        cache.set(key, media, TTL.anilist);
        return media;
      }
    } catch (_) {}

    return null;
  }

  async function browse(type, page = 1) {
    const limit = type === 'spotlight' ? 8 : 24;
    const key = `browse:${type}:${page}`;
    const cached = cache.get(key);
    if (cached) return cached;

    let sort = ['POPULARITY_DESC'];
    let status = undefined;
    let format = undefined;

    if (type === 'airing' || type === 'spotlight') {
      sort = ['POPULARITY_DESC'];
      status = 'RELEASING';
    } else if (type === 'upcoming') {
      sort = ['POPULARITY_DESC'];
      status = 'NOT_YET_RELEASED';
    } else if (type === 'trending') {
      sort = ['TRENDING_DESC'];
    } else if (type === 'favorite') {
      sort = ['FAVORITES_DESC'];
    } else if (type === 'completed') {
      sort = ['END_DATE_DESC'];
      status = 'FINISHED';
    } else if (type === 'movies') {
      sort = ['POPULARITY_DESC'];
      format = 'MOVIE';
    } else if (type === 'tv') {
      sort = ['POPULARITY_DESC'];
      format = 'TV';
    }

    const graphql = `
      query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus, $format: MediaFormat) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            currentPage
            hasNextPage
            lastPage
            total
          }
          media(sort: $sort, status: $status, format: $format, type: ANIME, isAdult: false) {
            id
            idMal
            title { romaji english native userPreferred }
            coverImage { extraLarge large medium }
            bannerImage
            startDate { year }
            seasonYear
            averageScore
            status
            format
            episodes
            description
            genres
            synonyms
          }
        }
      }
    `;

    try {
      const json = await fetchAniList(graphql, { page, perPage: limit, sort, status, format });
      const mediaList = json.data?.Page?.media || [];
      const pageInfo = json.data?.Page?.pageInfo || {};
      const result = {
        items: mediaList.map(normalizeAniListMedia),
        pagination: {
          current_page: pageInfo.currentPage || page,
          has_next_page: pageInfo.hasNextPage || false,
          last_visible_page: pageInfo.lastPage || page,
        },
        type,
      };
      cache.set(key, result, TTL.anilist);
      return result;
    } catch (aniErr) {
      const stale = cache.getStale(key);
      if (stale) return stale;
      throw new Error(`AniList browse failed for ${type}: ${aniErr.message}`);
    }
  }

  async function getHomeFeed() {
    const key = 'home:feed';
    return cache.dedupe(key, async () => {
      const cached = cache.get(key);
      if (cached) return cached;

      let spotlight = [];
      let trending = [];

      try {
        const graphql = `
          query {
            airing: Page(page: 1, perPage: 8) {
              media(status: RELEASING, sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                id idMal title { romaji english native userPreferred } coverImage { extraLarge large medium } bannerImage startDate { year } seasonYear averageScore status format episodes description genres synonyms
              }
            }
            trending: Page(page: 1, perPage: 36) {
              media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                id idMal title { romaji english native userPreferred } coverImage { extraLarge large medium } bannerImage startDate { year } seasonYear averageScore status format episodes description genres synonyms
              }
            }
          }
        `;
        const json = await fetchAniList(graphql);
        spotlight = (json.data?.airing?.media || []).slice(0, 8).map(normalizeAniListMedia);
        trending = (json.data?.trending?.media || []).map(normalizeAniListMedia);
      } catch (aniErr) {
        const stale = cache.getStale(key);
        if (stale) return stale;
        throw new Error(`AniList Home Feed failed: ${aniErr.message}`);
      }

      const result = {
        spotlight,
        trending,
        cachedAt: Date.now(),
      };
      cache.set(key, result, TTL.jikan);
      cache.set('browse:spotlight:1', { items: result.spotlight, pagination: {}, type: 'spotlight' }, TTL.jikan);
      cache.set('browse:trending:1', { items: result.trending, pagination: {}, type: 'trending' }, TTL.jikan);
      return result;
    });
  }

  async function search(query, page = 1) {
    const key = `search:${query.toLowerCase()}:${page}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const graphql = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            currentPage
            hasNextPage
            lastPage
            total
          }
          media(search: $search, type: ANIME, isAdult: false) {
            id
            idMal
            title { romaji english native userPreferred }
            coverImage { extraLarge large medium }
            bannerImage
            startDate { year }
            seasonYear
            averageScore
            status
            format
            episodes
            description
            genres
            synonyms
          }
        }
      }
    `;
    try {
      const json = await fetchAniList(graphql, { search: query, page, perPage: 20 });
      const mediaList = json.data?.Page?.media || [];
      const pageInfo = json.data?.Page?.pageInfo || {};
      const result = {
        items: mediaList.map(normalizeAniListMedia),
        pagination: {
          current_page: pageInfo.currentPage || page,
          has_next_page: pageInfo.hasNextPage || false,
          last_visible_page: pageInfo.lastPage || page,
        },
      };
      cache.set(key, result, TTL.search);
      return result;
    } catch (aniErr) {
      const stale = cache.getStale(key);
      if (stale) return stale;
      throw new Error(`AniList search failed: ${aniErr.message}`);
    }
  }

  async function getAniListByMalId(malId) {
    const key = `anilist:mal:${malId}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
          idMal
          title { romaji english }
          episodes
        }
      }
    `;
    const json = await fetchAniList(query, { malId: parseInt(malId, 10) });
    const media = json.data?.Media || null;
    cache.set(key, media, TTL.anilist);
    return media;
  }

  async function resolveByMalId(malId) {
    const key = `resolve:mal:${malId}`;
    return cache.dedupe(key, async () => {
      const cached = cache.get(key);
      if (cached) return cached;

      const media = await getAniListDetailsByMalId(malId);
      if (!media) {
        throw new Error(`AniList anime details lookup failed for ID ${malId}`);
      }

      const enriched = normalizeAniListMedia(media);
      let episodes = [];
      let streamMethod = 'mal';
      const aniId = media.id || null;
      enriched.aniId = aniId;

      const seriesId = await findSeriesByMal(malId, 16).catch(() => null);

      if (seriesId) {
        try {
          const series = await getSeries(seriesId);
          const eps = normalizeEpisodes(series.episodes);
          if (eps.length && eps.some((e) => e.embedId)) {
            streamMethod = 'embed';
            enriched.seriesId = seriesId;
            enriched.poster = series.anime?.poster || enriched.poster;
            enriched.description = series.anime?.description || enriched.description;
            enriched.hasSub = !!series.anime?.is_sub;
            enriched.hasDub = !!series.anime?.is_dub;
            episodes = eps;
          }
        } catch (_) { /* fallback */ }
      }

      if (!episodes.length) {
        if (aniMedia?.episodes) enriched.episodes = aniMedia.episodes;
        const epCount = enriched.episodes || details.episodes || 12;
        episodes = buildEpisodesFromCount(epCount);
        streamMethod = aniId ? 'ani' : 'mal';
      }

      const result = { anime: enriched, episodes, streamMethod, cachedAt: Date.now() };
      cache.set(key, result, TTL.resolve);
      return result;
    });
  }

  async function resolveBySeriesId(seriesId) {
    const key = `resolve:series:${seriesId}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const { anime, episodes: rawEps } = await getSeries(seriesId);
    const norm = normalizeAnikotoAnime(anime);
    norm.seriesId = seriesId;
    if (norm.malId && !norm.aniId) {
      const aniMedia = await getAniListByMalId(norm.malId).catch(() => null);
      if (aniMedia?.id) norm.aniId = aniMedia.id;
    }
    const episodes = normalizeEpisodes(rawEps);
    const streamMethod = episodes.some((e) => e.embedId) ? 'embed' : norm.aniId ? 'ani' : norm.malId ? 'mal' : 'mal';

    const result = { anime: norm, episodes, streamMethod, cachedAt: Date.now() };
    cache.set(key, result, TTL.resolve);
    return result;
  }

  async function warmMalIndex(pages = 8) {
    await Promise.all(Array.from({ length: pages }, (_, i) => getRecent(i + 1, 50)));
  }

  // ── Top 10 Trending Today ──────────────────────────────────────────────────
  // Primary: AniList TRENDING_DESC + RELEASING (real-time trending scores)
  // Fallback: Jikan top/anime?filter=airing (by popularity)
  async function getTrending(limit = 10) {
    const key = `trending:top${limit}`;
    const cached = cache.get(key);
    if (cached) return cached;

    return cache.dedupe(key, async () => {
      try {
        const graphql = `
          query ($perPage: Int) {
            Page(page: 1, perPage: $perPage) {
              media(
                sort: TRENDING_DESC
                type: ANIME
                status: RELEASING
                isAdult: false
              ) {
                id
                idMal
                title { romaji english native userPreferred }
                coverImage { extraLarge large medium }
                bannerImage
                startDate { year }
                seasonYear
                averageScore
                status
                format
                episodes
                trending
                description
                genres
                synonyms
              }
            }
          }
        `;
        const json = await fetchAniList(graphql, { perPage: limit });
        const media = json.data?.Page?.media || [];
        const items = media.map(normalizeAniListMedia);
        const result = { items, source: 'anilist' };
        cache.set(key, result, TTL.trending);
        return result;
      } catch (aniErr) {
        const stale = cache.getStale(key);
        if (stale) return stale;
        throw new Error(`AniList trending failed: ${aniErr.message}`);
      }
    });
  }

  return {
    getRecent,
    getSeries,
    browse,
    browseJikan: browse,
    getHomeFeed,
    getTrending,
    search,
    searchJikan: search,
    resolveByMalId,
    resolveBySeriesId,
    warmMalIndex,
    normalizeAnikotoAnime,
    normalizeEpisodes,
    normalizeAniListMedia,
  };
}

module.exports = { createResolver, normalizeAniListMedia, normalizeAnikotoAnime, normalizeJikan: normalizeAniListMedia };
