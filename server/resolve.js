const { TTL } = require('./cache');

function normalizeJikan(item) {
  return {
    source: 'jikan',
    seriesId: null,
    title: item.title,
    altTitle: item.title_japanese,
    poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
    year: item.year,
    score: item.score,
    status: item.status,
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
  return episodes.map((ep) => ({
    number: ep.number || ep.episode_number || ep.episode,
    title: ep.title || ep.name || `Episode ${ep.number}`,
    embedId: ep.episode_embed_id || ep.embed_id,
    embedUrl: ep.embed_url || null,
    id: ep.id,
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

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'AniWorld/1.0',
      Accept: 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

  async function searchAniList(title) {
    const key = `anilist:${title.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const query = `
      query ($search: String) {
        Media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id idMal
          title { romaji english }
          episodes
        }
      }
    `;
    const res = await fetch(upstream.anilist, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { search: title } }),
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
        findSeriesByMal(malId, 10).catch(() => null),
        searchAniList(enriched.title).catch(() => null),
      ]);

      if (seriesId) {
        try {
          const series = await getSeries(seriesId);
          const eps = normalizeEpisodes(series.episodes);
          if (eps.length && eps[0].embedId) {
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
    const episodes = normalizeEpisodes(rawEps);
    const streamMethod = episodes.some((e) => e.embedId) ? 'embed' : norm.malId ? 'mal' : 'ani';

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
    searchJikan,
    resolveByMalId,
    resolveBySeriesId,
    warmMalIndex,
    normalizeAnikotoAnime,
    normalizeEpisodes,
  };
}

module.exports = { createResolver, normalizeJikan, normalizeAnikotoAnime };
