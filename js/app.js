const state = {
  view: 'home',
  recentPage: 1,
  recentItems: [],
  recentPagination: null,
  currentAnime: null,
  episodes: [],
  streamMethod: 'embed',
  currentEpisode: 1,
  language: 'sub',
  epRangeStart: 1,
  epRangeSize: 26,
  searchQuery: '',
  searchResults: [],
  searchOpen: false,
  searchIndex: -1,
};

const $ = (sel) => document.querySelector(sel);

const els = {
  searchInput: $('#searchInput'),
  searchDropdown: $('#searchDropdown'),
  recentList: $('#recentList'),
  prevPage: $('#prevPage'),
  nextPage: $('#nextPage'),
  pageInfo: $('#pageInfo'),
  homeView: $('#homeView'),
  seriesView: $('#seriesView'),
  homeGrid: $('#homeGrid'),
  seriesPoster: $('#seriesPoster'),
  seriesTitle: $('#seriesTitle'),
  seriesBadges: $('#seriesBadges'),
  seriesDesc: $('#seriesDesc'),
  readMore: $('#readMore'),
  metaGrid: $('#metaGrid'),
  ratingScore: $('#ratingScore'),
  ratingStars: $('#ratingStars'),
  episodeGrid: $('#episodeGrid'),
  playerIframe: $('#playerIframe'),
  playerPlaceholder: $('#playerPlaceholder'),
  playerWrap: $('#playerWrap'),
  watchingMsg: $('#watchingMsg'),
  subBtn: $('#subBtn'),
  dubBtn: $('#dubBtn'),
  subServers: $('#subServers'),
  dubServers: $('#dubServers'),
  prevEpBtn: $('#prevEpBtn'),
  nextEpBtn: $('#nextEpBtn'),
  autoNext: $('#autoNext'),
  epRange: $('#epRange'),
  epFind: $('#epFind'),
  epLangFilter: $('#epLangFilter'),
  seriesError: $('#seriesError'),
  seriesInfo: $('#seriesInfo'),
  navHome: $('#navHome'),
  navHomeBtn: $('#navHomeBtn'),
  navBrowse: $('#navBrowse'),
  franchiseSection: $('#franchiseSection'),
  franchiseTrack: $('#franchiseTrack'),
  franchiseDots: $('#franchiseDots'),
};

async function init() {
  bindEvents();
  checkServer();
  loadRecent();
  showView('home');
  window.addEventListener('message', onPlayerMessage);
}

async function checkServer() {
  const banner = $('#proxyBanner');
  if (!banner) return;
  try {
    const res = await fetch('/api/recent?page=1&per_page=1');
    if (!res.ok) throw new Error('bad');
    banner.classList.add('hidden');
  } catch {
    banner.classList.remove('hidden');
  }
}

function bindEvents() {
  els.searchInput.addEventListener('input', debounce(onSearchInput, 120));
  els.searchInput.addEventListener('keydown', onSearchKeydown);
  els.searchInput.addEventListener('focus', () => {
    if (state.searchResults.length) state.searchOpen = true;
    renderSearchDropdown();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
      state.searchOpen = false;
      renderSearchDropdown();
    }
  });

  els.prevPage?.addEventListener('click', () => {
    if (state.recentPage > 1) { state.recentPage--; loadRecent(); }
  });
  els.nextPage?.addEventListener('click', () => {
    if (state.recentPagination && state.recentPage < state.recentPagination.total_pages) {
      state.recentPage++;
      loadRecent();
    }
  });

  els.subBtn?.addEventListener('click', () => setLanguage('sub'));
  els.dubBtn?.addEventListener('click', () => setLanguage('dub'));
  els.readMore?.addEventListener('click', toggleDescription);
  els.prevEpBtn?.addEventListener('click', () => playAdjacent(-1));
  els.nextEpBtn?.addEventListener('click', () => playAdjacent(1));

  els.epRange?.addEventListener('change', (e) => {
    state.epRangeStart = parseInt(e.target.value, 10);
    renderEpisodeGrid();
  });

  els.epFind?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const n = parseInt(e.target.value, 10);
      if (n > 0) playEpisode(n, true);
    }
  });

  const goHome = (e) => {
    e?.preventDefault();
    showView('home');
  };
  els.navHome?.addEventListener('click', goHome);
  els.navHomeBtn?.addEventListener('click', goHome);
  els.navBrowse?.addEventListener('click', () => showView(state.currentAnime ? 'series' : 'home'));
}

async function loadRecent() {
  els.recentList.innerHTML = '<li class="loading"><div class="spinner"></div></li>';
  try {
    const { items, pagination } = await API.getRecentAnime(state.recentPage, 20);
    state.recentItems = items;
    state.recentPagination = pagination;
    renderRelatedList();
    renderHomeGrid();
    updatePageControls();
  } catch (e) {
    els.recentList.innerHTML = `<li class="empty-state">Failed: ${e.message}</li>`;
  }
}

function renderRelatedList() {
  if (!state.recentItems.length) {
    els.recentList.innerHTML = '<li class="empty-state">No anime</li>';
    return;
  }
  els.recentList.innerHTML = state.recentItems.map((item) => {
    const norm = API.normalizeAnikotoAnime(item);
    const active = state.currentAnime?.seriesId === norm.seriesId ? ' active' : '';
    return `
      <li class="related-item${active}" data-id="${norm.seriesId}">
        <img src="${norm.poster || ''}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="related-title">${esc(norm.title)}</span>
      </li>`;
  }).join('');

  els.recentList.querySelectorAll('.related-item').forEach((li) => {
    li.addEventListener('click', () => openAnikotoSeries(parseInt(li.dataset.id, 10)));
  });
}

function renderHomeGrid() {
  els.homeGrid.innerHTML = state.recentItems.slice(0, 16).map((item) => {
    const a = API.normalizeAnikotoAnime(item);
    return `
      <article class="anime-card" data-id="${a.seriesId}">
        <div class="anime-card-poster">
          <img src="${a.poster || ''}" alt="${esc(a.title)}" loading="lazy">
        </div>
        <div class="anime-card-body">
          <div class="anime-card-title">${esc(a.title)}</div>
          <div class="anime-card-meta">${[a.year, a.score ? `★ ${a.score}` : ''].filter(Boolean).join(' · ')}</div>
        </div>
      </article>`;
  }).join('');

  els.homeGrid.querySelectorAll('.anime-card').forEach((card) => {
    card.addEventListener('click', () => openAnikotoSeries(parseInt(card.dataset.id, 10)));
  });
}

async function onSearchInput(e) {
  const q = e.target.value.trim();
  state.searchQuery = q;
  if (q.length < 2) {
    state.searchResults = [];
    state.searchOpen = false;
    renderSearchDropdown();
    return;
  }

  const cached = Cache.getSearch(q);
  if (cached) {
    state.searchResults = cached.items.map(API.normalizeJikanAnime);
    state.searchOpen = true;
    renderSearchDropdown();
    return;
  }

  try {
    const { items } = await API.searchAnime(q);
    state.searchResults = items.map(API.normalizeJikanAnime);
    state.searchOpen = true;
    renderSearchDropdown();
  } catch {
    state.searchResults = [];
    renderSearchDropdown();
  }
}

function renderSearchDropdown() {
  if (!state.searchOpen || !state.searchResults.length) {
    els.searchDropdown.classList.add('hidden');
    return;
  }
  els.searchDropdown.classList.remove('hidden');
  els.searchDropdown.innerHTML = state.searchResults.map((anime, i) => `
    <div class="search-item${i === state.searchIndex ? ' active' : ''}" data-idx="${i}" data-mal="${anime.malId}">
      <img src="${anime.poster || ''}" alt="" onerror="this.style.display='none'">
      <div>
        <div class="search-item-title">${esc(anime.title)}</div>
        <div class="search-item-meta">${anime.year || ''} · ${anime.episodes || '?'} eps</div>
      </div>
    </div>`).join('');

  els.searchDropdown.querySelectorAll('.search-item').forEach((el) => {
    const idx = parseInt(el.dataset.idx, 10);
    el.addEventListener('click', () => openSearchResult(state.searchResults[idx]));
    el.addEventListener('mouseenter', () => API.prefetchResolve(parseInt(el.dataset.mal, 10)));
  });
  state.searchResults.slice(0, 3).forEach((a) => API.prefetchResolve(a.malId));
}

function onSearchKeydown(e) {
  if (!state.searchOpen || !state.searchResults.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.searchIndex = Math.min(state.searchIndex + 1, state.searchResults.length - 1);
    renderSearchDropdown();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.searchIndex = Math.max(state.searchIndex - 1, 0);
    renderSearchDropdown();
  } else if (e.key === 'Enter' && state.searchIndex >= 0) {
    e.preventDefault();
    openSearchResult(state.searchResults[state.searchIndex]);
  } else if (e.key === 'Escape') {
    state.searchOpen = false;
    renderSearchDropdown();
  }
}

function applyResolvedData(result) {
  const { anime, episodes, streamMethod } = API.applyResolveResult(result);
  state.currentAnime = anime;
  state.episodes = episodes;
  state.streamMethod = streamMethod;
  state.currentEpisode = 1;
  state.language = anime.hasSub !== false ? 'sub' : 'dub';
  state.epRangeStart = 1;
  renderSeries();
  playEpisode(1, true);
}

async function openSearchResult(anime) {
  state.searchOpen = false;
  els.searchInput.value = anime.title || '';
  renderSearchDropdown();
  showView('series');
  els.seriesError.classList.add('hidden');

  const cached = Cache.getResolve(anime.malId);
  if (cached) {
    applyResolvedData(cached);
    setLoading(false);
    API.resolveByMalId(anime.malId).catch(() => {});
    return;
  }

  setLoading(true);
  try {
    applyResolvedData(await API.resolveByMalId(anime.malId));
    setLoading(false);
  } catch (e) {
    setLoading(false);
    showSeriesError(`Could not load: ${e.message}`);
  }
}

async function openAnikotoSeries(seriesId) {
  showView('series');
  els.seriesError.classList.add('hidden');

  const cached = Cache.getSeries(seriesId);
  if (cached) {
    applyResolvedData(cached);
    setLoading(false);
    renderRelatedList();
    API.resolveBySeriesId(seriesId).catch(() => {});
    return;
  }

  setLoading(true);
  try {
    applyResolvedData(await API.resolveBySeriesId(seriesId));
    renderRelatedList();
    setLoading(false);
  } catch (e) {
    setLoading(false);
    showSeriesError(`Failed: ${e.message}`);
  }
}

function renderSeries() {
  const a = state.currentAnime;
  if (!a) return;

  els.seriesPoster.innerHTML = `<img src="${a.poster || ''}" alt="${esc(a.title)}">`;
  els.seriesTitle.textContent = a.title;

  const tags = ['<span class="tag hd">HD</span>'];
  if (a.hasSub) tags.push('<span class="tag sub">CC</span>');
  if (a.hasDub) tags.push('<span class="tag dub">DUB</span>');
  if (a.status) tags.push(`<span class="tag">${esc(a.status)}</span>`);
  if (a.genres?.length) tags.push(...a.genres.slice(0, 3).map((g) => `<span class="tag">${esc(g)}</span>`));
  els.seriesBadges.innerHTML = tags.join('');

  els.seriesDesc.textContent = stripHtml(a.description || 'No description.');
  els.seriesDesc.classList.remove('expanded');
  els.readMore.classList.toggle('hidden', (a.description || '').length < 200);

  const score = a.score ? parseFloat(a.score) : null;
  els.ratingScore.textContent = score ? `${score}` : '—';
  els.ratingStars.textContent = score ? starsFromScore(score) : '☆☆☆☆☆';

  els.metaGrid.innerHTML = [
    metaRow('Type', 'TV'),
    metaRow('Year', a.year),
    metaRow('Status', a.status),
    metaRow('Episodes', a.episodes || state.episodes.length),
    metaRow('Score', a.score ? `${a.score} / 10` : '—'),
    metaRow('Genres', (a.genres || []).slice(0, 4).join(', ') || '—'),
  ].join('');

  renderEpRangeSelect();
  renderEpisodeGrid();
  renderServerButtons();
  updateLangButtons();
  loadFranchise(a.malId);
}

function metaRow(label, value) {
  return `<div class="meta-item"><strong>${label}:</strong> ${esc(String(value || '—'))}</div>`;
}

const FRANCHISE_RELATIONS = ['Prequel', 'Sequel', 'Side story', 'Spin-off', 'Parent story'];

async function expandFranchiseIds(startMalId) {
  const discovered = new Map();
  discovered.set(startMalId, {
    title: state.currentAnime?.title || '',
    relation: 'Current',
  });

  const queue = [startMalId];
  const fetched = new Set();
  let fetches = 0;

  while (queue.length && fetches < 8 && discovered.size < 14) {
    const id = queue.shift();
    if (fetched.has(id)) continue;
    fetched.add(id);
    fetches += 1;

    try {
      const relations = await API.getAnimeRelations(id);
      for (const group of relations) {
        if (!FRANCHISE_RELATIONS.includes(group.relation)) continue;
        for (const entry of group.entry || []) {
          if (entry.type !== 'anime' || /novel|manga|light novel/i.test(entry.name || '')) continue;
          if (!discovered.has(entry.mal_id)) {
            discovered.set(entry.mal_id, { title: entry.name, relation: group.relation });
            queue.push(entry.mal_id);
          }
        }
      }
    } catch {
      /* try next id */
    }
  }

  return discovered;
}

function formatFranchiseLabel(title, relation) {
  const t = title || '';
  if (/movie|gekijouban|film/i.test(t)) {
    const part = t.split(':').pop()?.trim() || t;
    return `THE MOVIE: ${part.toUpperCase()}`.slice(0, 52);
  }
  const season = t.match(/(?:season|part)\s*(\d+)/i);
  if (season) return `SEASON ${season[1]}`;
  const arc = t.match(/:\s*([^:]+)$/);
  if (arc && relation === 'Sequel') return arc[1].trim().toUpperCase().slice(0, 52);
  if (relation === 'Prequel') return 'PREQUEL';
  if (relation === 'Sequel') return 'SEQUEL';
  return t.toUpperCase().slice(0, 52);
}

async function loadFranchise(malId) {
  if (!els.franchiseSection || !malId) {
    els.franchiseSection?.classList.add('hidden');
    return;
  }

  const cached = Cache.getFranchise(malId);
  if (cached?.length) {
    renderFranchise(cached, malId);
    return;
  }

  try {
    const discovered = await expandFranchiseIds(malId);
    const items = [...discovered.entries()].map(([id, meta]) => ({
      malId: id,
      title: meta.title,
      label: formatFranchiseLabel(meta.title, meta.relation),
      relation: meta.relation,
      poster: id === malId ? (state.currentAnime?.poster || null) : null,
      aired: '',
      isCurrent: id === malId,
    }));

    if (items.length <= 1) {
      els.franchiseSection.classList.add('hidden');
      return;
    }

    const enriched = await Promise.all(
      items.slice(0, 14).map(async (item) => {
        if (item.poster && item.aired) return item;
        try {
          const brief = await API.getJikanAnimeBrief(item.malId);
          return {
            ...item,
            poster: item.poster || brief.poster,
            aired: brief.aired || '',
            year: brief.year,
            type: brief.type,
            label: item.label === item.title?.toUpperCase()?.slice(0, 52)
              ? formatFranchiseLabel(brief.title || item.title, item.relation)
              : item.label,
          };
        } catch {
          return item;
        }
      })
    );

    enriched.sort((a, b) => {
      const da = a.aired || `${a.year || 9999}-12-31`;
      const db = b.aired || `${b.year || 9999}-12-31`;
      return da.localeCompare(db);
    });

    Cache.setFranchise(malId, enriched);
    renderFranchise(enriched, malId);
  } catch {
    els.franchiseSection.classList.add('hidden');
  }
}

function renderFranchise(items, currentMalId) {
  if (!items?.length || items.length <= 1) {
    els.franchiseSection?.classList.add('hidden');
    return;
  }

  els.franchiseSection.classList.remove('hidden');
  const activeIdx = Math.max(0, items.findIndex((i) => i.malId === currentMalId));

  els.franchiseTrack.innerHTML = items.map((item, idx) => {
    const active = item.malId === currentMalId ? ' active' : '';
    const safePoster = (item.poster || '').replace(/'/g, '%27');
    const bg = safePoster ? ` style="background-image:url('${safePoster}')"` : '';
    return `
      <button class="franchise-card${active}" type="button" data-mal="${item.malId}" data-title="${esc(item.title)}" data-idx="${idx}"${bg}>
        <span class="franchise-label">${esc(item.label)}</span>
      </button>`;
  }).join('');

  els.franchiseDots.innerHTML = items.map((_, idx) =>
    `<span class="franchise-dot${idx === activeIdx ? ' active' : ''}" data-idx="${idx}"></span>`
  ).join('');

  els.franchiseTrack.querySelectorAll('.franchise-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.mal, 10);
      if (!id || id === currentMalId) return;
      openSearchResult({ malId: id, title: card.dataset.title || '' });
    });
  });

  const activeCard = els.franchiseTrack.querySelector('.franchise-card.active');
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function starsFromScore(score) {
  const full = Math.round(score / 2);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function renderEpRangeSelect() {
  const total = state.episodes.length;
  const size = state.epRangeSize;
  if (!els.epRange) return;
  els.epRange.innerHTML = '';
  for (let start = 1; start <= total; start += size) {
    const end = Math.min(start + size - 1, total);
    const opt = document.createElement('option');
    opt.value = start;
    opt.textContent = `${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}`;
    if (start === state.epRangeStart) opt.selected = true;
    els.epRange.appendChild(opt);
  }
}

function getVisibleEpisodes() {
  const start = state.epRangeStart;
  const end = start + state.epRangeSize - 1;
  return state.episodes.filter((ep) => {
    const n = Number(ep.number);
    return n >= start && n <= end;
  });
}

function renderEpisodeGrid() {
  const visible = getVisibleEpisodes();
  if (!visible.length) {
    els.episodeGrid.innerHTML = '<div class="empty-state">No episodes</div>';
    return;
  }

  els.episodeGrid.innerHTML = visible.map((ep) => {
    const num = Number(ep.number);
    const active = num === Number(state.currentEpisode) ? ' active' : '';
    const title = ep.title && ep.title !== `Episode ${num}` ? ep.title : getEpTitle(num);
    return `
      <button class="ep-row episode-btn${active}" data-ep="${num}" type="button">
        <span class="ep-num">${num}</span>
        <span class="ep-name">${esc(title)}</span>
        <span class="ep-play">▶</span>
      </button>`;
  }).join('');

  els.episodeGrid.querySelectorAll('.episode-btn').forEach((btn) => {
    btn.addEventListener('click', () => playEpisode(parseInt(btn.dataset.ep, 10), true));
  });
}

function getEpTitle(num) {
  return `Episode ${num}`;
}

function renderServerButtons() {
  const methods = [
    { id: 'embed', label: 'HD-1' },
    { id: 'mal', label: 'MAL' },
    { id: 'ani', label: 'AniList' },
  ];

  const render = (container, lang) => {
    if (!container) return;
    container.innerHTML = methods.map((m) => {
      const active = state.language === lang && state.streamMethod === m.id ? ' active' : '';
      return `<button class="server-btn${active}" data-method="${m.id}" data-lang="${lang}" type="button">${m.label}</button>`;
    }).join('');

    container.querySelectorAll('.server-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.language = btn.dataset.lang;
        state.streamMethod = btn.dataset.method;
        updateLangButtons();
        renderServerButtons();
        playEpisode(state.currentEpisode, false);
      });
    });
  };

  render(els.subServers, 'sub');
  render(els.dubServers, 'dub');
}

function resolveStreamUrl(ep, lang, method) {
  const a = state.currentAnime;
  if (!ep || !a) return null;
  const epNum = Number(ep.number);
  const m = method || state.streamMethod;

  if (m === 'embed') {
    if (ep.embedId) return { url: API.buildStreamUrl({ method: 'embed', embedId: ep.embedId, lang }), method: 'embed' };
    if (ep.embedUrl?.[lang]) return { url: ep.embedUrl[lang], method: 'embed' };
  }
  if (m === 'ani' && a.aniId) {
    return { url: API.buildStreamUrl({ method: 'ani', aniId: a.aniId, episode: epNum, lang }), method: 'ani' };
  }
  if (m === 'mal' && a.malId) {
    return { url: API.buildStreamUrl({ method: 'mal', malId: a.malId, episode: epNum, lang }), method: 'mal' };
  }
  if (ep.embedId) return { url: API.buildStreamUrl({ method: 'embed', embedId: ep.embedId, lang }), method: 'embed' };
  if (a.aniId) return { url: API.buildStreamUrl({ method: 'ani', aniId: a.aniId, episode: epNum, lang }), method: 'ani' };
  if (a.malId) return { url: API.buildStreamUrl({ method: 'mal', malId: a.malId, episode: epNum, lang }), method: 'mal' };
  return null;
}

function findEpisode(epNum) {
  const num = Number(epNum);
  return state.episodes.find((e) => Number(e.number) === num) || state.episodes[num - 1] || null;
}

function loadPlayer(url) {
  els.playerPlaceholder.classList.remove('hidden');
  els.playerPlaceholder.textContent = 'Loading…';
  els.playerIframe.classList.add('hidden');
  els.playerIframe.src = 'about:blank';
  setTimeout(() => {
    els.playerIframe.src = url;
    els.playerIframe.classList.remove('hidden');
    els.playerPlaceholder.classList.add('hidden');
  }, 100);
}

function scrollToPlayer() {
  els.playerWrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateEpisodeUI(ep) {
  const num = Number(ep.number);
  if (els.watchingMsg) {
    els.watchingMsg.innerHTML = `You're watching <strong>Episode ${num}</strong>. If current server doesn't work, try another.`;
  }
}

function playEpisode(epNum, scrollToPlayerView = true) {
  const ep = findEpisode(epNum);
  if (!ep) return;

  state.currentEpisode = Number(ep.number);

  const rangeStart = Math.floor((state.currentEpisode - 1) / state.epRangeSize) * state.epRangeSize + 1;
  if (rangeStart !== state.epRangeStart) {
    state.epRangeStart = rangeStart;
    if (els.epRange) els.epRange.value = String(rangeStart);
  }

  let stream = resolveStreamUrl(ep, state.language, state.streamMethod);
  if (!stream?.url) {
    stream = resolveStreamUrl(ep, state.language);
    if (stream) state.streamMethod = stream.method;
  }

  if (stream?.url) {
    loadPlayer(stream.url);
  } else {
    els.playerIframe.src = 'about:blank';
    els.playerIframe.classList.add('hidden');
    els.playerPlaceholder.classList.remove('hidden');
    els.playerPlaceholder.textContent = 'No stream for this episode.';
  }

  updateEpisodeUI(ep);
  renderEpisodeGrid();
  renderServerButtons();
  updateLangButtons();
  updateNavButtons();

  if (scrollToPlayerView) scrollToPlayer();
}

function playAdjacent(dir) {
  const idx = state.episodes.findIndex((e) => Number(e.number) === Number(state.currentEpisode));
  const next = state.episodes[idx + dir];
  if (next) playEpisode(next.number, true);
}

function setLanguage(lang) {
  state.language = lang;
  updateLangButtons();
  renderServerButtons();
  playEpisode(state.currentEpisode, false);
}

function updateLangButtons() {
  els.subBtn?.classList.toggle('active', state.language === 'sub');
  els.dubBtn?.classList.toggle('active', state.language === 'dub');
}

function updateNavButtons() {
  const idx = state.episodes.findIndex((e) => Number(e.number) === Number(state.currentEpisode));
  if (els.prevEpBtn) els.prevEpBtn.disabled = idx <= 0;
  if (els.nextEpBtn) els.nextEpBtn.disabled = idx >= state.episodes.length - 1;
}

function setLoading(on) {
  els.seriesInfo?.classList.toggle('hidden', on);
  $('#seriesLoading')?.classList.toggle('hidden', !on);
}

function showSeriesError(msg) {
  els.seriesError.textContent = msg;
  els.seriesError.classList.remove('hidden');
  els.seriesInfo?.classList.add('hidden');
}

function showView(view) {
  els.navHomeBtn?.classList.toggle('active', view === 'home');
  els.navBrowse?.classList.toggle('active', view !== 'home');

  if (state.view === view) return;

  const prevEl = state.view === 'home' ? els.homeView : els.seriesView;
  const nextEl = view === 'home' ? els.homeView : els.seriesView;

  prevEl?.classList.add('view-leaving');
  setTimeout(() => {
    prevEl?.classList.add('hidden');
    prevEl?.classList.remove('view-leaving');
    nextEl?.classList.remove('hidden');
  }, 280);

  state.view = view;
}

function toggleDescription() {
  const expanded = els.seriesDesc.classList.toggle('expanded');
  els.readMore.textContent = expanded ? 'Show less' : 'Read more';
}

function updatePageControls() {
  const p = state.recentPagination;
  if (els.prevPage) els.prevPage.disabled = state.recentPage <= 1;
  if (els.nextPage) els.nextPage.disabled = !p || state.recentPage >= p.total_pages;
  if (els.pageInfo) els.pageInfo.textContent = p ? `${p.page}/${p.total_pages}` : '';
}

function onPlayerMessage(event) {
  if (event.origin !== 'https://megaplay.buzz') return;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.textContent || '';
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

document.addEventListener('DOMContentLoaded', init);
