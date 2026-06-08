const express = require('express');
const path = require('path');
const { ApiCache, TTL } = require('./server/cache');
const { createResolver } = require('./server/resolve');
const { botGuardMiddleware } = require('./server/bot-guard');

const ROOT = __dirname;

const UPSTREAM = {
  anikoto: 'https://anikotoapi.site',
  jikan: 'https://api.jikan.moe/v4',
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
        'User-Agent': 'AnimeXplore/1.0',
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
      const result = await resolver.searchJikan(q, page);
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      res.json(result);
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/resolve/mal/:malId', async (req, res) => {
    try {
      const hit = !!cache.get(`resolve:mal:${req.params.malId}`);
      const result = await resolver.resolveByMalId(req.params.malId);
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      res.json(result);
    } catch (err) {
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
    const allowed = ['airing', 'popular', 'movies', 'tv', 'trending', 'spotlight'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ ok: false, error: 'Invalid browse type' });
    }
    try {
      const page = parseInt(req.query.page || '1', 10);
      const hit = !!cache.get(`browse:${type}:${page}`);
      const result = await resolver.browseJikan(type, page);
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

  app.get('/api/cache/stats', (_req, res) => {
    res.json({ entries: cache.store.size, malIndex: cache.malIndex.size });
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

  app.get(/^\/proxy\/jikan(\/.*)?$/, async (req, res) => {
    const upstreamPath = req.originalUrl.replace(/^\/proxy\/jikan/, '') || '/';
    const cacheKey = `proxy:jikan:${upstreamPath}`;
    const cached = cache.get(cacheKey);
    if (cached) return sendProxyResult(res, { ...cached, fromCache: true });
    try {
      const result = await forward(UPSTREAM.jikan, upstreamPath);
      cache.set(cacheKey, result, TTL.jikan);
      sendProxyResult(res, { ...result, fromCache: false });
    } catch (err) {
      sendProxyError(res, err);
    }
  });

  app.post(/^\/proxy\/anilist\/?$/, express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      const result = await forward(UPSTREAM.anilist, '', {
        method: 'POST',
        headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
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
  resolver.browseJikan('popular', 1).catch(() => {});

  return app;
}

module.exports = { createApp, cache, resolver };
