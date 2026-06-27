const UserStore = {
  PREFIX: 'animexplore:',

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  _write(key, data) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(data));
    } catch { /* quota */ }
  },

  getHistory() {
    return this._read('history', []);
  },

  addHistory(entry) {
    const list = this.getHistory().filter((h) => h.id !== entry.id);
    list.unshift({ ...entry, watchedAt: Date.now() });
    this._write('history', list.slice(0, 40));
  },

  removeHistory(id) {
    const list = this.getHistory().filter((h) => String(h.id) !== String(id));
    this._write('history', list);
  },

  getContinueWatching() {
    return this.getHistory().slice(0, 12);
  },

  getBookmarks() {
    return this._read('bookmarks', []);
  },

  isBookmarked(id) {
    return this.getBookmarks().some((b) => b.id === id);
  },

  toggleBookmark(anime) {
    const id = anime.malId || anime.seriesId || anime.id;
    if (!id) return false;
    const key = String(id);
    let list = this.getBookmarks();
    const exists = list.find((b) => b.id === key);
    if (exists) {
      list = list.filter((b) => b.id !== key);
      this._write('bookmarks', list);
      return false;
    }
    list.unshift({
      id: key,
      malId: anime.malId || null,
      seriesId: anime.seriesId || null,
      title: anime.title,
      poster: anime.poster || null,
      savedAt: Date.now(),
    });
    this._write('bookmarks', list.slice(0, 50));
    return true;
  },

  animeKey(anime) {
    return String(anime?.malId || anime?.seriesId || anime?.id || '');
  },
};
