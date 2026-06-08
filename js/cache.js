const Cache = {
  memory: new Map(),
  TTL: {
    search: 30 * 60 * 1000,
    resolve: 60 * 60 * 1000,
    recent: 10 * 60 * 1000,
    series: 60 * 60 * 1000,
    franchise: 60 * 60 * 1000,
    browse: 30 * 60 * 1000,
    home: 30 * 60 * 1000,
  },
  LS_PREFIX: 'animexplore:',

  get(key) {
    const mem = this.memory.get(key);
    if (mem && Date.now() < mem.expires) return mem.data;

    try {
      const raw = localStorage.getItem(this.LS_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() > entry.expires) {
        localStorage.removeItem(this.LS_PREFIX + key);
        return null;
      }
      this.memory.set(key, entry);
      return entry.data;
    } catch {
      return null;
    }
  },

  set(key, data, ttl, persist = false) {
    const entry = { data, expires: Date.now() + ttl };
    this.memory.set(key, entry);
    if (persist) {
      try {
        localStorage.setItem(this.LS_PREFIX + key, JSON.stringify(entry));
      } catch {
        /* storage full — memory only */
      }
    }
  },

  getSearch(query) {
    return this.get(`search:${query.toLowerCase()}`);
  },

  setSearch(query, data) {
    this.set(`search:${query.toLowerCase()}`, data, this.TTL.search, true);
  },

  getResolve(malId) {
    return this.get(`resolve:mal:${malId}`);
  },

  setResolve(malId, data) {
    this.set(`resolve:mal:${malId}`, data, this.TTL.resolve, true);
  },

  getSeries(seriesId) {
    return this.get(`resolve:series:${seriesId}`);
  },

  setSeries(seriesId, data) {
    this.set(`resolve:series:${seriesId}`, data, this.TTL.resolve, true);
  },

  getRecent(page, perPage) {
    return this.get(`recent:${page}:${perPage}`);
  },

  setRecent(page, perPage, data) {
    this.set(`recent:${page}:${perPage}`, data, this.TTL.recent);
  },

  getFranchise(malId) {
    return this.get(`franchise:${malId}`);
  },

  setFranchise(malId, data) {
    this.set(`franchise:${malId}`, data, this.TTL.franchise, true);
  },

  getHome() {
    return this.get('home:feed');
  },

  setHome(data) {
    this.set('home:feed', data, this.TTL.home, true);
  },
};
