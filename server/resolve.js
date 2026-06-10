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

function normalizeEpisodes(episodes = []) {
  const mapped = episodes.map((ep, i) => {
    const num = ep.number ?? ep.episode_number ?? ep.episode ?? (i + 1);
    return {
      number: Number(num) || i + 1,
      title: ep.title || ep.name || `Episode ${num}`,
      embedId: ep.episode_embed_id || ep.embed_id || ep.embedId,
      embedUrl: ep.embed_url || ep.embedUrl || null,
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

  async function browseJikan(type, page = 1) {
    const limit = 24;
    const paths = {
      airing: `/top/anime?filter=airing&page=${page}&limit=${limit}`,
      popular: `/top/anime?filter=bypopularity&page=${page}&limit=${limit}`,
      movies: `/anime?type=movie&order_by=popularity&sort=desc&page=${page}&limit=${limit}`,
      tv: `/anime?type=tv&order_by=popularity&sort=desc&page=${page}&limit=${limit}`,
      trending: `/top/anime?filter=bypopularity&page=${page}&limit=${limit}`,
      spotlight: `/top/anime?filter=airing&page=${page}&limit=8`,
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
      const stale = cache.getStale(key);
      if (stale) return stale;
      throw err;
    }
  }

  async function getHomeFeed() {
    const key = 'home:feed';
    return cache.dedupe(key, async () => {
      const cached = cache.get(key);
      if (cached) return cached;

      const [airing, popular] = await Promise.all([
        fetchJSON(`${upstream.jikan}/top/anime?filter=airing&page=1&limit=12`).catch(() => ({ data: [] })),
        fetchJSON(`${upstream.jikan}/top/anime?filter=bypopularity&page=1&limit=36`).catch(() => ({ data: [] })),
      ]);

      const result = {
        spotlight: (airing.data || []).slice(0, 8).map(normalizeJikan),
        trending: (popular.data || []).map(normalizeJikan),
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
    const json = await fetchJSON(
      `${upstream.jikan}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&order_by=popularity`
    );
    const result = {
      items: (json.data || []).map(normalizeJikan),
      pagination: json.pagination || {},
    };
    cache.set(key, result, TTL.search);
    return result;
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

      const details = await getJikanDetails(malId);
      const enriched = normalizeJikan(details);
      let episodes = [];
      let streamMethod = 'mal';

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
