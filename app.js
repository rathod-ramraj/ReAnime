const express = require('express');
const path = require('path');
const { ApiCache, TTL } = require('./server/cache');
const { createResolver } = require('./server/resolve');
const { botGuardMiddleware } = require('./server/bot-guard');

const ROOT = __dirname;

const UPSTREAM = {
  anikoto: 'https://anikotoapi.site',
  anilist: 'https://graphql.anilist.co',
};

const cache = new ApiCache();
const resolver = createResolver({ cache, upstream: UPSTREAM });

function createApp() {
  const app = express();

  app.use(botGuardMiddleware);

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  async function forward(upstreamBase, upstreamPath, options = {}) {
    const url = upstreamBase.replace(/\/$/, '') + (upstreamPath || '/');
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'ReAnime/1.0',
        Accept: 'application/json',
        ...options.headers,
      },
    });
    const body = Buffer.from(await res.arrayBuffer());
    return {
      status: res.status,
      contentType: res.headers.get('content-type') || 'application/json',
      body,
    };
  }

  function sendProxyResult(res, result) {
    res.status(result.status);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('X-Cache', result.fromCache ? 'HIT' : 'MISS');
    res.send(result.body);
  }

  function sendProxyError(res, err) {
    res.status(502).json({ ok: false, error: err.message });
  }

  app.get('/api/search', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ items: [], pagination: {} });
    try {
      const page = parseInt(req.query.page || '1', 10);
      const hit = !!cache.get(`search:${q.toLowerCase()}:${page}`);
      const result = await resolver.search(q, page);
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      res.json(result);
    } catch (err) {
      try {
        const page = parseInt(req.query.page || '1', 10);
        const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&page=${page}&limit=20`;
        const jRes = await fetch(jikanUrl, { headers: { 'User-Agent': 'ReAnime/1.0' } });
        if (jRes.ok) {
          const jData = await jRes.json();
          const items = (jData.data || []).map((d) => ({
            malId: d.mal_id,
            title: d.title,
            titleEnglish: d.title_english,
            titleRomaji: d.title_japanese,
            poster: d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url,
            banner: d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url,
            score: d.score,
            episodes: d.episodes,
            type: d.type,
            year: d.year,
            genres: (d.genres || []).map((g) => g.name),
            description: d.synopsis,
            hasSub: true,
            hasDub: true,
          }));
          return res.json({ items, pagination: { current_page: page, has_next_page: jData.pagination?.has_next_page || false } });
        }
      } catch (_) {}
      res.json({ items: [], pagination: {} });
    }
  });

  app.get('/api/resolve/mal/:malId', async (req, res) => {
    try {
      const hit = !!cache.get(`resolve:mal:${req.params.malId}`);
      const result = await resolver.resolveByMalId(req.params.malId);
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      res.json(result);
    } catch (err) {
      try {
        const jRes = await fetch(`https://api.jikan.moe/v4/anime/${req.params.malId}`);
        if (jRes.ok) {
          const jData = await jRes.json();
          const d = jData.data;
          const anime = {
            malId: d.mal_id,
            title: d.title,
            titleEnglish: d.title_english,
            titleRomaji: d.title_japanese,
            poster: d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url,
            banner: d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url,
            score: d.score,
            episodes: d.episodes,
            type: d.type,
            year: d.year,
            genres: (d.genres || []).map((g) => g.name),
            description: d.synopsis,
            hasSub: true,
            hasDub: true,
          };
          const count = anime.episodes || 12;
          const episodes = Array.from({ length: count }, (_, i) => ({
            number: i + 1,
            title: `Episode ${i + 1}`,
            embedId: null,
            embedUrl: null,
            id: null,
          }));
          return res.json({ anime, episodes, streamMethod: 'mal', cachedAt: Date.now() });
        }
      } catch (_) {}
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/resolve/series/:seriesId', async (req, res) => {
    try {
      const result = await resolver.resolveBySeriesId(req.params.seriesId);
      res.json(result);
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/home', async (req, res) => {
    try {
      const hit = !!cache.get('home:feed');
      const result = await resolver.getHomeFeed();
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json(result);
    } catch (err) {
      const stale = cache.getStale('home:feed');
      if (stale) return res.json(stale);
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/browse', async (req, res) => {
    const type = (req.query.type || 'airing').toLowerCase();
    const allowed = ['airing', 'popular', 'movies', 'tv', 'trending', 'spotlight', 'upcoming', 'favorite', 'completed'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ ok: false, error: 'Invalid browse type' });
    }
    try {
      const page = parseInt(req.query.page || '1', 10);
      const hit = !!cache.get(`browse:${type}:${page}`);
      const result = await resolver.browse(type, page);
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      res.json(result);
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/recent', async (req, res) => {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const perPage = parseInt(req.query.per_page || '20', 10);
      const result = await resolver.getRecent(page, perPage);
      res.json(result);
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/trending', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit || '10', 10), 25);
      const hit = !!cache.get(`trending:top${limit}`);
      const result = await resolver.getTrending(limit);
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      res.setHeader('X-Source', result.source || 'unknown');
      res.setHeader('Cache-Control', 'public, max-age=900');
      res.json(result);
    } catch (err) {
      const stale = cache.getStale(`trending:top10`);
      if (stale) return res.json(stale);
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/cache/stats', (_req, res) => {
    res.json({ entries: cache.store.size, malIndex: cache.malIndex.size });
  });


  const IMG_HOST_BLOCK = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/;

  app.get('/api/img', async (req, res) => {
    const raw = (req.query.url || '').trim();
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return res.status(400).send('Invalid url');
    }
    if (parsed.protocol !== 'https:') return res.status(400).send('HTTPS only');
    const host = parsed.hostname.toLowerCase();
    if (IMG_HOST_BLOCK.test(host) || host.endsWith('.local')) {
      return res.status(400).send('Host not allowed');
    }

    const cacheKey = `img:${parsed.href}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.body);
    }

    try {
      const upstream = await fetch(parsed.href, {
        headers: {
          'User-Agent': 'ReAnime/1.0',
          Accept: 'image/*',
          Referer: 'https://myanimelist.net/',
        },
      });
      if (!upstream.ok) return res.status(upstream.status).send('Upstream error');
      const body = Buffer.from(await upstream.arrayBuffer());
      if (body.length > 3 * 1024 * 1024) return res.status(413).send('Too large');
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      cache.set(cacheKey, { body, contentType }, TTL.jikan);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('X-Cache', 'MISS');
      res.send(body);
    } catch (err) {
      res.status(502).send(err.message);
    }
  });

  app.get(/^\/proxy\/anikoto(\/.*)?$/, async (req, res) => {
    const upstreamPath = req.originalUrl.replace(/^\/proxy\/anikoto/, '') || '/';
    const cacheKey = `proxy:anikoto:${upstreamPath}`;
    const cached = cache.get(cacheKey);
    if (cached) return sendProxyResult(res, { ...cached, fromCache: true });
    try {
      const result = await forward(UPSTREAM.anikoto, upstreamPath);
      if (result.status === 200 && upstreamPath.includes('recent-anime')) {
        try {
          const json = JSON.parse(result.body.toString());
          cache.indexRecentItems(json.data || []);
        } catch (_) { /* ignore */ }
      }
      cache.set(cacheKey, result, TTL.proxy);
      sendProxyResult(res, { ...result, fromCache: false });
    } catch (err) {
      sendProxyError(res, err);
    }
  });


  app.post(/^\/proxy\/anilist\/?$/, express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      const result = await forward(UPSTREAM.anilist, '', {
        method: 'POST',
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://anilist.co/',
          Origin: 'https://anilist.co',
        },
        body: req.body,
      });
      sendProxyResult(res, result);
    } catch (err) {
      sendProxyError(res, err);
    }
  });

  app.use(express.static(ROOT));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/proxy')) {
      return res.status(404).json({ ok: false, error: 'Not found' });
    }
    res.sendFile(path.join(ROOT, 'index.html'));
  });

  resolver.warmMalIndex(4).catch(() => {});
  resolver.getHomeFeed().catch(() => {});
  resolver.getTrending(10).catch(() => {});
  resolver.browse('popular', 1).catch(() => {});

  return app;
}

module.exports = { createApp, cache, resolver };
