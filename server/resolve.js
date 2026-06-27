const { TTL } = require('./cache');
const { Titles } = require('./titles');

function normalizeJikan(item) {
  return {
    source: 'jikan',
    seriesId: null,
    title: Titles.buildDisplayTitle(item),
    titleEnglish: item.title_english || null,
    titleRomaji: item.title || null,
    synonyms: item.title_synonyms || [],
    altTitle: item.title_japanese,
    rating: item.rating || null,
    poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
    year: item.year,
    score: item.score,
    status: item.status,
    type: item.type || 'TV',
    episodes: item.episodes || null,
    malId: item.mal_id,
    aniId: null,
    description: item.synopsis,
    genres: (item.genres || []).map((g) => g.name),
    hasSub: true,
    hasDub: true,
  };
}

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
    poster: media.coverImage?.large || media.coverImage?.medium || null,
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
          'User-Agent': 'AnimeXplore/1.0',
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

  async function getJikanDetails(malId) {
    const key = `jikan:full:${malId}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const json = await fetchJSON(`${upstream.jikan}/anime/${malId}/full`);
    cache.set(key, json.data, TTL.jikan);
    return json.data;
  }

  async function getAniListDetailsByMalId(malId) {
    const graphql = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
          idMal
          title { romaji english native userPreferred }
          coverImage { large medium }
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
    const json = await fetchAniList(graphql, { malId: parseInt(malId, 10) });
    return json.data?.Media || null;
  }

  async function browseJikan(type, page = 1) {
    const limit = type === 'spotlight' ? 8 : 24;
    const paths = {
      airing: `/top/anime?filter=airing&page=${page}&limit=${limit}`,
      popular: `/top/anime?filter=bypopularity&page=${page}&limit=${limit}`,
      movies: `/anime?type=movie&order_by=popularity&sort=desc&page=${page}&limit=${limit}`,
      tv: `/anime?type=tv&order_by=popularity&sort=desc&page=${page}&limit=${limit}`,
      trending: `/top/anime?filter=bypopularity&page=${page}&limit=${limit}`,
      spotlight: `/top/anime?filter=airing&page=${page}&limit=8`,
      upcoming: `/top/anime?filter=upcoming&page=${page}&limit=${limit}`,
    };
    const path = paths[type] || paths.airing;
    const key = `browse:${type}:${page}`;
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const json = await fetchJSON(`${upstream.jikan}${path}`);
      const result = {
        items: (json.data || []).map(normalizeJikan),
        pagination: json.pagination || { current_page: page, has_next_page: false },
        type,
      };
      cache.set(key, result, TTL.jikan);
      return result;
    } catch (err) {
      console.warn(`[Jikan Browse Fallback for ${type}]`, err.message);
      let sort = 'POPULARITY_DESC';
      let status = undefined;
      let format = undefined;
      if (type === 'airing' || type === 'spotlight') {
        sort = 'POPULARITY_DESC';
        status = 'RELEASING';
      } else if (type === 'upcoming') {
        sort = 'POPULARITY_DESC';
        status = 'NOT_YET_RELEASED';
      } else if (type === 'trending') {
        sort = 'TRENDING_DESC';
      } else if (type === 'movies') {
        format = 'MOVIE';
      } else if (type === 'tv') {
        format = 'TV';
      }

      const graphql = `
        query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus, $format: MediaFormat) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              currentPage
              hasNextPage
              lastPage
            }
            media(sort: $sort, status: $status, format: $format, type: ANIME) {
              id
              idMal
              title { romaji english native userPreferred }
              coverImage { large medium }
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
        cache.set(key, result, TTL.jikan);
        return result;
      } catch (aniErr) {
        const stale = cache.getStale(key);
        if (stale) return stale;
        throw new Error(`Jikan and AniList browse both failed. AniList error: ${aniErr.message}`);
      }
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
        const [airingRes, popularRes] = await Promise.all([
          fetchJSON(`${upstream.jikan}/top/anime?filter=airing&page=1&limit=12`),
          fetchJSON(`${upstream.jikan}/top/anime?filter=bypopularity&page=1&limit=36`),
        ]);
        spotlight = (airingRes.data || []).slice(0, 8).map(normalizeJikan);
        trending = (popularRes.data || []).map(normalizeJikan);
      } catch (jikanErr) {
        console.warn('[Jikan Home Feed Fallback to AniList]', jikanErr.message);
        const graphql = `
          query {
            airing: Page(page: 1, perPage: 12) {
              media(status: RELEASING, sort: POPULARITY_DESC, type: ANIME) {
                id idMal title { romaji english native userPreferred } coverImage { large medium } startDate { year } seasonYear averageScore status format episodes description genres synonyms
              }
            }
            trending: Page(page: 1, perPage: 36) {
              media(sort: TRENDING_DESC, type: ANIME) {
                id idMal title { romaji english native userPreferred } coverImage { large medium } startDate { year } seasonYear averageScore status format episodes description genres synonyms
              }
            }
          }
        `;
        try {
          const json = await fetchAniList(graphql);
          spotlight = (json.data?.airing?.media || []).slice(0, 8).map(normalizeAniListMedia);
          trending = (json.data?.trending?.media || []).map(normalizeAniListMedia);
        } catch (aniErr) {
          console.error('[Jikan and AniList Home Feed both failed]', aniErr.message);
        }
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

  async function searchJikan(query, page = 1) {
    const key = `search:${query.toLowerCase()}:${page}`;
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const json = await fetchJSON(
        `${upstream.jikan}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&order_by=popularity`
      );
      const result = {
        items: (json.data || []).map(normalizeJikan),
        pagination: json.pagination || {},
      };
      cache.set(key, result, TTL.search);
      return result;
    } catch (err) {
      console.warn('[Jikan Search Fallback]', err.message);
      const graphql = `
        query ($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              currentPage
              hasNextPage
              lastPage
              total
            }
            media(search: $search, type: ANIME) {
              id
              idMal
              title { romaji english native userPreferred }
              coverImage { large medium }
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
        throw new Error(`Jikan and AniList search both failed. AniList error: ${aniErr.message}`);
      }
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
    const res = await fetch(upstream.anilist, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { malId: parseInt(malId, 10) } }),
    });
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const json = await res.json();
    const media = json.data?.Media || null;
    cache.set(key, media, TTL.anilist);
    return media;
  }

  async function resolveByMalId(malId) {
    const key = `resolve:mal:${malId}`;
    return cache.dedupe(key, async () => {
      const cached = cache.get(key);
      if (cached) return cached;

      let enriched;
      let episodes = [];
      let streamMethod = 'mal';
      let details;

      try {
        details = await getJikanDetails(malId);
        enriched = normalizeJikan(details);
      } catch (jikanErr) {
        console.warn(`[Jikan getDetails Fallback for MAL ID ${malId}]`, jikanErr.message);
        try {
          const media = await getAniListDetailsByMalId(malId);
          if (media) {
            enriched = normalizeAniListMedia(media);
            details = { episodes: media.episodes };
          } else {
            throw jikanErr;
          }
        } catch (aniErr) {
          throw new Error(`Jikan and AniList details lookup failed for MAL ID ${malId}. AniList error: ${aniErr.message}`);
        }
      }

      const [seriesId, aniMedia] = await Promise.all([
        findSeriesByMal(malId, 16).catch(() => null),
        getAniListByMalId(malId).catch(() => null),
      ]);

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
        const aniId = aniMedia?.id || null;
        if (aniMedia?.episodes) enriched.episodes = aniMedia.episodes;
        enriched.aniId = aniId;
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

  return {
    getRecent,
    getSeries,
    browseJikan,
    getHomeFeed,
    searchJikan,
    resolveByMalId,
    resolveBySeriesId,
    warmMalIndex,
    normalizeAnikotoAnime,
    normalizeEpisodes,
  };
}

module.exports = { createResolver, normalizeJikan, normalizeAnikotoAnime };
