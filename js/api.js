const API = {
  MEGAPLAY: 'https://megaplay.buzz/stream',

  async fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  buildStreamUrl({ method, embedId, malId, aniId, episode, lang = 'sub' }) {
    if (method === 'embed' && embedId) {
      return `${this.MEGAPLAY}/s-2/${embedId}/${lang}`;
    }
    if (method === 'mal' && malId) {
      return `${this.MEGAPLAY}/mal/${malId}/${episode}/${lang}`;
    }
    if (method === 'ani' && aniId) {
      return `${this.MEGAPLAY}/ani/${aniId}/${episode}/${lang}`;
    }
    return null;
  },

  async getBrowse(type = 'airing', page = 1) {
    const cached = Cache.get(`browse:${type}:${page}`);
    if (cached) return cached;

    const result = await this.fetchJSON(`/api/browse?type=${encodeURIComponent(type)}&page=${page}`);
    const normalized = {
      items: (result.items || []).map((item) => this.normalizeJikanAnime(item)),
      pagination: result.pagination || {},
      type: result.type || type,
    };
    Cache.set(`browse:${type}:${page}`, normalized, Cache.TTL.browse);
    return normalized;
  },

  async getRecentAnime(page = 1, perPage = 20) {
    const cached = Cache.getRecent(page, perPage);
    if (cached) return cached;

    const json = await this.fetchJSON(`/api/recent?page=${page}&per_page=${perPage}`);
    const result = {
      items: json.items || json.data || [],
      pagination: json.pagination || { page, per_page: perPage, total_pages: 1 },
    };
    Cache.setRecent(page, perPage, result);
    return result;
  },

  async searchAnime(query, page = 1) {
    const cached = Cache.getSearch(query);
    if (cached) return cached;

    const result = await this.fetchJSON(
      `/api/search?q=${encodeURIComponent(query)}&page=${page}`
    );
    Cache.setSearch(query, result);
    return result;
  },

  async resolveByMalId(malId) {
    const cached = Cache.getResolve(malId);
    if (cached) return cached;

    const result = await this.fetchJSON(`/api/resolve/mal/${malId}`);
    Cache.setResolve(malId, result);
    return result;
  },

  async resolveBySeriesId(seriesId) {
    const cached = Cache.getSeries(seriesId);
    if (cached) return cached;

    const result = await this.fetchJSON(`/api/resolve/series/${seriesId}`);
    Cache.setSeries(seriesId, result);
    return result;
  },

  prefetchResolve(malId) {
    if (Cache.getResolve(malId)) return;
    this.resolveByMalId(malId).catch(() => {});
  },

  async getAnimeRelations(malId) {
    const json = await this.fetchJSON(`/proxy/jikan/anime/${malId}/relations`);
    return json.data || [];
  },

  async getJikanAnimeBrief(malId) {
    const json = await this.fetchJSON(`/proxy/jikan/anime/${malId}`);
    const d = json.data || {};
    return {
      malId: d.mal_id || malId,
      title: d.title || d.title_english || '',
      poster: d.images?.jpg?.large_image_url || d.images?.jpg?.image_url || null,
      year: d.year || (d.aired?.from ? d.aired.from.slice(0, 4) : null),
      aired: d.aired?.from || '',
      type: d.type || 'TV',
    };
  },

  normalizeJikanAnime(item) {
    return {
      source: item.source || 'jikan',
      seriesId: item.seriesId || null,
      title: item.title,
      altTitle: item.altTitle || item.title_japanese,
      poster: item.poster || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
      year: item.year,
      score: item.score,
      status: item.status,
      episodes: item.episodes || null,
      malId: item.malId || item.mal_id,
      aniId: item.aniId || null,
      description: item.description || item.synopsis,
      genres: Array.isArray(item.genres)
        ? item.genres.map((g) => (typeof g === 'string' ? g : g.name)).filter(Boolean)
        : [],
      type: item.type || item.raw?.type || 'TV',
      hasSub: item.hasSub !== false,
      hasDub: item.hasDub !== false,
      raw: item.raw || item,
    };
  },

  normalizeAnikotoAnime(item) {
    return {
      source: 'anikoto',
      seriesId: item.seriesId || item.id,
      title: item.title || item.name,
      altTitle: item.alternative || item.native,
      poster: item.poster || item.background_image,
      year: item.year,
      score: item.score,
      status: item.status,
      episodes: parseInt(item.episodes, 10) || null,
      malId: item.malId || (item.mal_id ? parseInt(item.mal_id, 10) : null),
      aniId: item.aniId || (item.ani_id ? parseInt(item.ani_id, 10) : null),
      description: item.description,
      genres: item.genres || item.terms_by_type?.genre || [],
      hasSub: !!item.is_sub || item.hasSub,
      hasDub: !!item.is_dub || item.hasDub,
      raw: item,
    };
  },

  normalizeEpisodesFromAnikoto(episodes) {
    return episodes.map((ep) => ({
      number: ep.number || ep.episode_number || ep.episode,
      title: ep.title || ep.name || `Episode ${ep.number}`,
      embedId: ep.episode_embed_id || ep.embedId || ep.embed_id,
      embedUrl: ep.embed_url || ep.embedUrl || null,
      id: ep.id,
    }));
  },

  buildEpisodesFromCount(count, start = 1) {
    const total = count || 1;
    return Array.from({ length: total }, (_, i) => ({
      number: start + i,
      title: `Episode ${start + i}`,
      embedId: null,
      embedUrl: null,
      id: null,
    }));
  },

  normalizeEpisodeNumbers(episodes = []) {
    if (!episodes.length) return episodes;
    const mapped = episodes.map((ep, i) => ({
      ...ep,
      number: Number(ep.number ?? ep.episode_number ?? ep.episode) || i + 1,
    }));
    const min = Math.min(...mapped.map((e) => e.number));
    if (min === 0) {
      return mapped.map((e) => ({ ...e, number: e.number + 1 }));
    }
    return mapped;
  },

  applyResolveResult(result) {
    const episodes = this.normalizeEpisodeNumbers(result.episodes || []);
    let streamMethod = result.streamMethod || 'mal';
    if (streamMethod === 'embed' && !episodes.some((e) => e.embedId)) {
      streamMethod = result.anime?.aniId ? 'ani' : 'mal';
    }
    return {
      anime: this.normalizeJikanAnime(result.anime),
      episodes,
      streamMethod,
    };
  },
};
