const TTL = {
  search: 30 * 60 * 1000,
  recent: 10 * 60 * 1000,
  series: 60 * 60 * 1000,
  jikan: 60 * 60 * 1000,
  anilist: 60 * 60 * 1000,
  resolve: 60 * 60 * 1000,
  proxy: 5 * 60 * 1000,
};

class ApiCache {
  constructor() {
    this.store = new Map();
    this.malIndex = new Map();
    this.pending = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      entry.stale = true;
      return null;
    }
    return entry.data;
  }

  getStale(key) {
    const entry = this.store.get(key);
    return entry?.data || null;
  }

  set(key, data, ttl = TTL.proxy) {
    this.store.set(key, { data, expires: Date.now() + ttl });
  }

  indexRecentItems(items = []) {
    for (const item of items) {
      if (item.mal_id) this.malIndex.set(String(item.mal_id), item.id);
      if (item.ani_id) this.aniIndex = this.aniIndex || new Map();
      if (item.ani_id) this.aniIndex.set(String(item.ani_id), item.id);
    }
  }

  getSeriesIdByMal(malId) {
    return this.malIndex.get(String(malId)) || null;
  }

  async dedupe(key, fn) {
    if (this.pending.has(key)) return this.pending.get(key);
    const promise = fn().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }
}

module.exports = { ApiCache, TTL };
