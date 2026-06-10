/**
 * Download manager — queue, resolve sources via /api/download, save to disk.
 */
const DownloadManager = {
  queue: [],
  active: false,
  listeners: new Set(),

  init() {
    this.queue = this._read('queue', []);
    this.renderPanel();
  },

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(`animexplore:download:${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  _write(key, data) {
    try {
      localStorage.setItem(`animexplore:download:${key}`, JSON.stringify(data));
    } catch { /* quota */ }
  },

  _persist() {
    this._write('queue', this.queue.slice(0, 100));
  },

  _emit(forceFull = true) {
    this.listeners.forEach((fn) => fn(this.queue));
    if (forceFull) this.renderPanel();
    this._updateBadge();
  },

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  _updateBadge() {
    const pending = this.queue.filter((q) => q.status === 'queued' || q.status === 'downloading').length;
    document.querySelectorAll('[data-download-badge]').forEach((el) => {
      el.textContent = pending > 0 ? String(pending) : '';
      el.classList.toggle('hidden', pending === 0);
    });
  },

  makeId() {
    return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  sanitizeFilename(name) {
    return (name || 'video')
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  },

  buildFilename(animeTitle, episode, lang, ext = 'mp4') {
    const base = this.sanitizeFilename(animeTitle);
    const ep = episode ? `_Ep${String(episode).padStart(2, '0')}` : '';
    const lg = lang === 'dub' ? '_DUB' : '_SUB';
    return `${base}${ep}${lg}.${ext}`;
  },

  /** Build resolve params from anime + episode (mirrors stream chain). */
  buildResolveParams(anime, ep, lang, preferredMethod) {
    const embedUrl = typeof ep?.embedUrl === 'string'
      ? ep.embedUrl
      : ep?.embedUrl?.[lang] || ep?.embedUrl?.sub || null;

    const method = preferredMethod
      || (ep?.embedId ? 'embed' : anime?.aniId ? 'ani' : 'mal');

    return {
      method,
      embedId: ep?.embedId || null,
      malId: anime?.malId || null,
      aniId: anime?.aniId || null,
      episode: Number(ep?.number) || null,
      lang: lang || 'sub',
      embedUrl,
    };
  },

  async resolveSources(anime, ep, lang, preferredMethod) {
    const methods = [...new Set([preferredMethod, ...(API.STREAM_METHOD_ORDER || ['embed', 'mal', 'ani'])].filter(Boolean))];
    let lastError = 'No download source available';

    for (const method of methods) {
      const params = this.buildResolveParams(anime, ep, lang, method);
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') qs.set(k, String(v));
      });
      try {
        const res = await fetch(`/api/download/resolve?${qs}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          lastError = errJson.error || `HTTP ${res.status}`;
          continue;
        }
        const json = await res.json();
        if (json.ok && json.sources?.length) return json;
        lastError = json.error || lastError;
      } catch (err) {
        lastError = err.message || lastError;
      }
    }

    throw new Error(lastError);
  },

  pickBestSource(sources) {
    const mp4 = sources.find((s) => s.type === 'mp4');
    if (mp4) return mp4;
    const m3u8 = sources.find((s) => s.type === 'm3u8' || s.url.includes('.m3u8'));
    if (m3u8) return m3u8;
    return sources[0];
  },

  addToQueue({ anime, episode, lang = 'sub', epData, streamMethod }) {
    const ep = epData || { number: episode };
    const id = this.makeId();
    const item = {
      id,
      animeTitle: anime.title,
      poster: anime.poster || null,
      malId: anime.malId || null,
      seriesId: anime.seriesId || null,
      episode: Number(ep.number),
      lang,
      epData: ep,
      anime,
      streamMethod: streamMethod || null,
      status: 'queued',
      progress: 0,
      addedAt: Date.now(),
      error: null,
    };
    this.queue.unshift(item);
    this._persist();
    this._emit();
    this.processQueue();
    return id;
  },

  addBulk(anime, episodes, lang = 'sub', streamMethod = null) {
    const ids = [];
    [...episodes].reverse().forEach((ep) => {
      ids.push(this.addToQueue({ anime, episode: ep.number, lang, epData: ep, streamMethod }));
    });
    return ids;
  },

  remove(id) {
    this.queue = this.queue.filter((q) => q.id !== id);
    this._persist();
    this._emit();
  },

  clearCompleted() {
    this.queue = this.queue.filter((q) => q.status !== 'done' && q.status !== 'failed');
    this._persist();
    this._emit();
  },

  update(id, patch) {
    const item = this.queue.find((q) => q.id === id);
    if (!item) return;
    Object.assign(item, patch);
    this._persist();
    const keys = Object.keys(patch);
    const progressOnly = keys.length === 1 && keys[0] === 'progress';
    if (progressOnly) {
      this._updateProgressDom(id, item);
      return;
    }
    this._emit(true);
  },

  _updateProgressDom(id, item) {
    const row = document.querySelector(`.download-item[data-id="${id}"]`);
    if (!row) {
      this.renderPanel();
      return;
    }
    const bar = row.querySelector('.download-progress span');
    if (bar) bar.style.width = `${item.progress || 0}%`;
  },

  async processQueue() {
    if (this.active) return;
    const next = this.queue.find((q) => q.status === 'queued');
    if (!next) return;

    this.active = true;
    this.update(next.id, { status: 'downloading', progress: 5, error: null });

    try {
      const resolved = await this.resolveSources(next.anime, next.epData, next.lang, next.streamMethod);
      const source = this.pickBestSource(resolved.sources);
      const isHls = source.type === 'm3u8' || source.url.includes('.m3u8');
      const filename = this.buildFilename(next.animeTitle, next.episode, next.lang, isHls ? 'ts' : 'mp4');
      const dlUrl = `/api/download/file?url=${encodeURIComponent(source.url)}&filename=${encodeURIComponent(filename)}`;

      this.update(next.id, { progress: 15, sourceUrl: source.url });

      const res = await fetch(dlUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed (${res.status})`);
      }

      const total = Number(res.headers.get('content-length')) || 0;
      const reader = res.body?.getReader();
      if (!reader) {
        const blob = await res.blob();
        this._saveBlob(blob, filename);
        this.update(next.id, { status: 'done', progress: 100 });
      } else {
        const chunks = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) {
            this.update(next.id, { progress: Math.min(95, 15 + Math.round((received / total) * 80)) });
          }
        }
        const blob = new Blob(chunks, { type: res.headers.get('content-type') || 'video/mp4' });
        this._saveBlob(blob, filename);
        this.update(next.id, { status: 'done', progress: 100 });
      }

      if (window.showToast) {
        window.showToast(`Downloaded ${filename}`, 'success');
      }
    } catch (err) {
      this.update(next.id, { status: 'failed', error: err.message, progress: 0 });
      if (window.showToast) {
        window.showToast(err.message || 'Download failed', 'error');
      }
    }

    this.active = false;
    setTimeout(() => this.processQueue(), 800);
  },

  _saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  renderPanel() {
    const list = document.getElementById('downloadList');
    const empty = document.getElementById('downloadEmpty');
    if (!list) return;

    const items = this.queue;
    if (!items.length) {
      list.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    list.innerHTML = items.map((item) => {
      const statusLabel = {
        queued: 'Queued',
        downloading: 'Downloading…',
        done: 'Complete',
        failed: 'Failed',
      }[item.status] || item.status;

      return `
        <article class="download-item" data-id="${item.id}">
          <div class="download-item-poster">
            ${item.poster ? `<img src="${escAttr(API.posterUrl(item.poster))}" alt="" loading="lazy" />` : '<span class="download-item-ph">▶</span>'}
          </div>
          <div class="download-item-body">
            <h4>${escHtml(item.animeTitle)}</h4>
            <p>Episode ${item.episode} · ${item.lang.toUpperCase()}</p>
            <div class="download-progress"><span style="width:${item.progress || 0}%"></span></div>
            <p class="download-status download-status-${item.status}">${escHtml(statusLabel)}${item.error ? ` — ${escHtml(item.error)}` : ''}</p>
          </div>
          <div class="download-item-actions">
            ${item.status === 'failed' ? `<button type="button" class="tool-btn sm download-retry" data-retry="${item.id}">Retry</button>` : ''}
            <button type="button" class="download-item-remove" data-remove="${item.id}" aria-label="Remove">✕</button>
          </div>
        </article>`;
    }).join('');

    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => this.remove(btn.dataset.remove));
    });
    list.querySelectorAll('[data-retry]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = this.queue.find((q) => q.id === btn.dataset.retry);
        if (!item) return;
        this.update(item.id, { status: 'queued', progress: 0, error: null });
        this.processQueue();
      });
    });
  },
};

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function escAttr(str) {
  return escHtml(str).replace(/"/g, '&quot;');
}

window.DownloadManager = DownloadManager;
