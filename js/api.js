const API = {
  MEGAPLAY: 'https://megaplay.buzz/stream',
  TRYEMBED: 'https://tryembed.us.cc/embed/anime',
  VIDNEST: 'https://vidnest.fun/anime',
  VIDNEST_PAHE: 'https://vidnest.fun/animepahe',
  ANIMO_CDN: 'https://cdn.4animo.xyz/embed',

  STREAM_SERVERS: [
    { id: 'embed', label: 'MegaPlay HD-1' },
    { id: 'embed-hd2', label: 'MegaPlay HD-2' },
    { id: 'tryembed', label: 'TryEmbed' },
    { id: 'vidnest', label: 'VidNest' },
    { id: 'vidnest-pahe', label: 'VidNest Pahe' },
    { id: 'animo-hd1', label: '4Animo HD-1' },
    { id: 'animo-hd2', label: '4Animo HD-2' },
    { id: 'animo-embed', label: '4Animo Embed' },
    { id: 'animo-mal', label: '4Animo MAL' },
    { id: 'ani', label: 'MegaPlay Ani' },
    { id: 'mal', label: 'MegaPlay MAL' },
  ],

  STREAM_METHOD_ORDER: [
    'embed', 'embed-hd2', 'tryembed', 'vidnest', 'vidnest-pahe',
    'animo-hd1', 'animo-hd2', 'animo-embed', 'animo-mal', 'ani', 'mal',
  ],

  PLAYER_ORIGINS: [
    'https://megaplay.buzz',
    'https://tryembed.us.cc',
    'https://cdn.4animo.xyz',
    'https://vidnest.fun',
  ],

  posterUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('/api/img') || url.startsWith('data:')) return url;
    if (url.startsWith('/')) return url;

    const isMobile = typeof window !== 'undefined' && (
      window.matchMedia('(max-width: 900px)').matches
      || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024)
    );

    // Desktop: load CDN directly (fast, worked before proxy). Mobile: proxy for referrer issues.
    if (!isMobile) return url;

    try {
      const u = new URL(url);
      if (u.protocol === 'https:') return `/api/img?url=${encodeURIComponent(url)}`;
    } catch (_) { /* fall through */ }
    return url;
  },

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  },

  async fetchJSON(url, retries = 3) {
    let lastErr;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (res.status === 429 || res.status >= 500) {
          await this.sleep(400 * (i + 1));
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        }
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson?.error) detail = errJson.error;
          } catch { /* ignore */ }
          throw new Error(detail);
        }
        return res.json();
      } catch (err) {
        lastErr = err;
        if (i < retries - 1) await this.sleep(300 * (i + 1));
      }
    }
    throw lastErr;
  },

  normalizeHomeFeed(json) {
    return {
      spotlight: (json.spotlight || []).map((item) => this.normalizeJikanAnime(item)),
      trending: (json.trending || []).map((item) => this.normalizeJikanAnime(item)),
    };
  },

  async getHomeFeed() {
    const cached = Cache.getHome();
    if (cached) {
      this.fetchJSON('/api/home').then((json) => {
        Cache.setHome(this.normalizeHomeFeed(json));
      }).catch(() => {});
      return cached;
    }

    const json = await this.fetchJSON('/api/home');
    const result = this.normalizeHomeFeed(json);
    Cache.setHome(result);
    return result;
  },

  buildStreamUrl({ method, embedId, malId, aniId, episode, lang = 'sub', variant = 's-2' }) {
    const ep = Number(episode);
    const track = lang === 'dub' ? 'dub' : 'sub';
    const animoQs = 'k=1&autoPlay=1&skipIntro=1&skipOutro=1';

    if ((method === 'embed' || method === 'embed-hd2') && embedId) {
      const v = method === 'embed-hd2' ? 's-1' : variant;
      return `${this.MEGAPLAY}/${v}/${embedId}/${track}`;
    }
    if (method === 'mal' && malId && ep) {
      return `${this.MEGAPLAY}/mal/${malId}/${ep}/${track}`;
    }
    if (method === 'ani' && aniId && ep) {
      return `${this.MEGAPLAY}/ani/${aniId}/${ep}/${track}`;
    }
    if (method === 'tryembed' && aniId && ep) {
      return `${this.TRYEMBED}/${aniId}/${ep}/${track}?autoplay=true&autoSkip=true`;
    }
    if (method === 'vidnest' && aniId && ep) {
      return `${this.VIDNEST}/${aniId}/${ep}/${track}`;
    }
    if (method === 'vidnest-pahe' && aniId && ep) {
      return `${this.VIDNEST_PAHE}/${aniId}/${ep}/${track}`;
    }
    if (method === 'animo-hd1' && aniId && ep) {
      return `${this.ANIMO_CDN}/hd-1/ani/${aniId}/${ep}/${track}?${animoQs}`;
    }
    if (method === 'animo-hd2' && aniId && ep) {
      return `${this.ANIMO_CDN}/hd-2/ani/${aniId}/${ep}/${track}?${animoQs}`;
    }
    if (method === 'animo-mal' && malId && ep) {
      return `${this.ANIMO_CDN}/hd-1/mal/${malId}/${ep}/${track}?${animoQs}`;
    }
    if (method === 'animo-embed' && embedId) {
      const id = String(embedId).includes('/') ? embedId : `s-2/${embedId}`;
      return `${this.ANIMO_CDN}/?server=hd-2&id=af:${id}/${track}&${animoQs}`;
    }
    return null;
  },

  canUseStreamMethod(method, anime, ep) {
    if (!anime || !ep) return false;
    if (method === 'embed' || method === 'embed-hd2' || method === 'animo-embed') {
      return !!(ep.embedId || ep.embedUrl);
    }
    if (method === 'mal' || method === 'animo-mal') return !!anime.malId;
    if (['ani', 'tryembed', 'vidnest', 'vidnest-pahe', 'animo-hd1', 'animo-hd2'].includes(method)) {
      return !!anime.aniId;
    }
    return false;
  },

  pickDefaultStreamMethod(anime, ep) {
    for (const id of this.STREAM_METHOD_ORDER) {
      if (this.canUseStreamMethod(id, anime, ep)) return id;
    }
    return 'mal';
  },

  async getBrowse(type = 'airing', page = 1) {
    const key = `browse:${type}:${page}`;
    const cached = Cache.getBrowse(key);
    if (cached) return cached;

    const result = await this.fetchJSON(`/api/browse?type=${encodeURIComponent(type)}&page=${page}`);
    const normalized = {
      items: (result.items || []).map((item) => this.normalizeJikanAnime(item)),
      pagination: result.pagination || {},
      type: result.type || type,
    };
    Cache.setBrowse(key, normalized);
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
