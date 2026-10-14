export const UserStore = {
  PREFIX: 'ReAnime:',

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
    } catch {
      /* quota */
    }
  },

  getHistory() {
    return this._read('history', []);
  },

  addHistory(entry) {
    const list = this.getHistory().filter((h) => String(h.id) !== String(entry.id));
    const progress = entry.duration > 0 
      ? Math.round((entry.currentTime / entry.duration) * 100) 
      : (entry.progress !== undefined ? entry.progress : 0);
    list.unshift({
      ...entry,
      timestamp: Date.now(),
      watchedAt: Date.now(),
      progress,
    });
    this._write('history', list.slice(0, 20));
  },

  removeHistory(id) {
    const list = this.getHistory().filter((h) => String(h.id) !== String(id));
    this._write('history', list);
  },

  getContinueWatching() {
    return this.getHistory().slice(0, 20);
  },

  getBookmarks() {
    return this._read('bookmarks', []);
  },

  isBookmarked(id) {
    return this.getBookmarks().some((b) => String(b.id) === String(id));
  },

  toggleBookmark(anime) {
    const id = anime.malId || anime.seriesId || anime.id;
    if (!id) return false;
    const key = String(id);
    let list = this.getBookmarks();
    const exists = list.find((b) => String(b.id) === key);
    if (exists) {
      list = list.filter((b) => String(b.id) !== key);
      this._write('bookmarks', list);
      return false;
    }
    list.unshift({
      id: key,
      malId: anime.malId || null,
      seriesId: anime.seriesId || null,
      title: anime.title,
      poster: anime.poster,
      year: anime.year,
      type: anime.type,
      savedAt: Date.now(),
    });
    this._write('bookmarks', list);
    return true;
  },

  getSettings() {
    return this._read('settings', {
      autoNext: true,
      defaultLang: 'sub',
      theme: 'dark',
    });
  },

  updateSettings(patch) {
    const cur = this.getSettings();
    this._write('settings', { ...cur, ...patch });
  },
};
