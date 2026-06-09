const state = {
  view: 'home',
  homeCategory: 'home',
  recentPage: 1,
  recentItems: [],
  recentPagination: null,
  spotlightItems: [],
  spotlightIndex: 0,
  spotlightTimer: null,
  trendingItems: [],
  categoryItems: [],
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

const CATEGORY_LABELS = {
  home: 'Home',
  movies: 'Movies',
  tv: 'TV Series',
  popular: 'Most Popular',
  airing: 'Top Airing',
};

const $ = (sel) => document.querySelector(sel);

function isMobileView() {
  return window.matchMedia('(max-width: 900px)').matches
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024);
}

function syncDeviceMode() {
  document.documentElement.classList.toggle('mobile-mode', isMobileView());
  syncMobileBrowseBar();
}

function posterSrc(url) {
  return API.posterUrl(url || '');
}

function imgTag(poster, alt) {
  const direct = poster || '';
  const src = posterSrc(direct);
  return `<img src="${esc(src)}" data-fallback="${esc(direct)}" alt="${esc(alt || '')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="window.__imgFallback(this)">`;
}

window.__imgFallback = function (img) {
  const fb = img.dataset.fallback;
  if (fb && img.src !== fb && !img.dataset.triedFb) {
    img.dataset.triedFb = '1';
    img.src = fb;
    return;
  }
  if (img.classList.contains('hero-bg-img') || img.classList.contains('hero-visual-img')) {
    img.style.opacity = '0';
    return;
  }
  img.style.opacity = '0.3';
};

function updatePageTitle(animeTitle, episode) {
  if (!window.PageTitle) return;
  if (!animeTitle) window.PageTitle.reset();
  else window.PageTitle.set(animeTitle, episode);
}

const els = {
  searchInput: $('#searchInput'),
  searchDropdown: $('#searchDropdown'),
  recentList: $('#recentList'),
  prevPage: $('#prevPage'),
  nextPage: $('#nextPage'),
  pageInfo: $('#pageInfo'),
  homeView: $('#homeView'),
  seriesView: $('#seriesView'),
  pageRoot: $('#pageRoot'),
  heroSection: $('#heroSection'),
  heroBg: $('#heroBg'),
  heroBgImg: $('#heroBgImg'),
  heroVisualImg: $('#heroVisualImg'),
  heroRank: $('#heroRank'),
  heroTitle: $('#heroTitle'),
  heroMeta: $('#heroMeta'),
  heroDesc: $('#heroDesc'),
  heroWatch: $('#heroWatch'),
  heroDetail: $('#heroDetail'),
  heroPrev: $('#heroPrev'),
  heroNext: $('#heroNext'),
  homeTrendingSection: $('#homeTrendingSection'),
  trendingRow: $('#trendingRow'),
  trendingNext: $('#trendingNext'),
  categorySection: $('#categorySection'),
  categoryTitle: $('#categoryTitle'),
  categoryGrid: $('#categoryGrid'),
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
  mobileWatchTitle: $('#mobileWatchTitle'),
  mobileWatchEp: $('#mobileWatchEp'),
  detailPanel: $('#detailPanel'),
  mobileInfoToggle: $('#mobileInfoToggle'),
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
  franchiseSection: $('#franchiseSection'),
  franchiseTrack: $('#franchiseTrack'),
  franchiseDots: $('#franchiseDots'),
  continueSection: $('#continueSection'),
  continueRow: $('#continueRow'),
  bookmarkBtn: $('#bookmarkBtn'),
  azGrid: $('#azGrid'),
  mobileNav: $('#mobileNav'),
  homePopularSection: $('#homePopularSection'),
  homePopularGrid: $('#homePopularGrid'),
  homeAiringSection: $('#homeAiringSection'),
  homeAiringGrid: $('#homeAiringGrid'),
  notifyBtn: $('#notifyBtn'),
  notifyPanel: $('#notifyPanel'),
  notifyClose: $('#notifyClose'),
  notifyDot: $('#notifyDot'),
  profileBtn: $('#profileBtn'),
  profileDropdown: $('#profileDropdown'),
  profileMenu: $('#profileMenu'),
  mobileSearchSheet: $('#mobileSearchSheet'),
  mobileSearchInput: $('#mobileSearchInput'),
  mobileSearchResults: $('#mobileSearchResults'),
  mobileSearchClose: $('#mobileSearchClose'),
  mobileBrowseBar: $('#mobileBrowseBar'),
};

const AZ_LETTERS = ['All', '#', '0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

async function init() {
  syncDeviceMode();
  window.addEventListener('resize', debounce(syncDeviceMode, 150));
  injectToastContainer();
  initRevealObserver();
  initHeaderMenus();
  bindEvents();
  renderAzGrid();
  renderContinueWatching();
  setHomeCategory('home');
  showView('home');
  window.addEventListener('message', onPlayerMessage);
  checkServer();
  loadHomeData();
  loadRecent();
  syncMobileBrowseBar();
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
    setHomeCategory('home');
    showView('home');
  };
  els.navHome?.addEventListener('click', goHome);

  document.querySelectorAll('.nav-cat').forEach((btn) => {
    btn.addEventListener('click', () => setHomeCategory(btn.dataset.cat));
  });

  els.heroPrev?.addEventListener('click', () => stepSpotlight(-1));
  els.heroNext?.addEventListener('click', () => stepSpotlight(1));
  els.heroWatch?.addEventListener('click', () => openSpotlightAnime(true));
  els.heroDetail?.addEventListener('click', () => openSpotlightAnime(false));
  els.trendingNext?.addEventListener('click', () => {
    els.trendingRow?.scrollBy({ left: 320, behavior: 'smooth' });
  });

  els.bookmarkBtn?.addEventListener('click', toggleBookmarkCurrent);
  $('#footerBrand')?.addEventListener('click', (e) => { e.preventDefault(); goHome(e); });

  document.querySelectorAll('[data-footer], [data-social]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('This section will be available soon.', 'info');
    });
  });

  document.querySelectorAll('[data-footer-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.footerNav;
      if (cat === 'home' || cat === 'movies' || cat === 'tv' || cat === 'popular') {
        setHomeCategory(cat === 'home' ? 'home' : cat);
        showView('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      showToast('Community features coming soon.', 'info');
    });
  });

  els.profileDropdown?.querySelectorAll('[data-profile]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeHeaderMenus();
      const action = btn.dataset.profile;
      if (action === 'library') { onMobileNav('library'); return; }
      if (action === 'continue') {
        showView('home');
        setHomeCategory('home');
        els.continueSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (action === 'bookmarks') { onMobileNav('library'); return; }
      showToast('This feature will be available soon.', 'info');
    });
  });

  els.mobileNav?.querySelectorAll('.mob-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => onMobileNav(btn.dataset.mob));
  });

  els.mobileSearchInput?.addEventListener('input', debounce((e) => {
    els.searchInput.value = e.target.value;
    onSearchInput({ target: els.searchInput });
  }, 120));

  els.mobileSearchInput?.addEventListener('keydown', (e) => {
    els.searchInput.value = els.mobileSearchInput.value;
    onSearchKeydown(e);
  });

  els.mobileSearchClose?.addEventListener('click', closeMobileSearch);

  els.mobileInfoToggle?.addEventListener('click', toggleMobileDetail);
}

function openMobileSearch() {
  if (!isMobileView()) {
    els.searchInput?.focus();
    return;
  }
  closeHeaderMenus();
  els.mobileSearchSheet?.classList.remove('hidden');
  document.body.classList.add('search-sheet-open');
  els.mobileSearchInput.value = els.searchInput?.value || '';
  requestAnimationFrame(() => els.mobileSearchInput?.focus());
  if (state.searchResults.length) renderMobileSearchResults();
}

function closeMobileSearch() {
  els.mobileSearchSheet?.classList.add('hidden');
  document.body.classList.remove('search-sheet-open');
  els.mobileNav?.querySelectorAll('.mob-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.mob === 'home' && state.view === 'home' && state.homeCategory === 'home');
  });
}

function renderMobileSearchResults() {
  if (!els.mobileSearchResults) return;
  if (!state.searchResults.length) {
    els.mobileSearchResults.innerHTML = state.searchQuery.length >= 2
      ? '<p class="mobile-search-empty">No results found</p>'
      : '<p class="mobile-search-empty">Type to search anime…</p>';
    return;
  }
  els.mobileSearchResults.innerHTML = state.searchResults.map((anime, i) => `
    <button type="button" class="search-item mobile-search-item${i === state.searchIndex ? ' active' : ''}" data-idx="${i}" data-mal="${anime.malId}">
      ${imgTag(anime.poster, '')}
      <div>
        <div class="search-item-title">${esc(anime.title)}</div>
        <div class="search-item-meta">${anime.year || ''} · ${anime.episodes || '?'} eps</div>
      </div>
    </button>`).join('');

  els.mobileSearchResults.querySelectorAll('.mobile-search-item').forEach((el) => {
    const idx = parseInt(el.dataset.idx, 10);
    el.addEventListener('click', () => {
      closeMobileSearch();
      openSearchResult(state.searchResults[idx]);
    });
  });
}

function syncMobileBrowseBar() {
  const bar = els.mobileBrowseBar;
  if (!bar) return;
  const show = isMobileView() && state.view === 'home' && state.homeCategory !== 'library';
  bar.classList.toggle('hidden', !show);
  bar.querySelectorAll('.mob-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.cat === state.homeCategory);
  });
}

function toggleMobileDetail() {
  const isCollapsed = els.detailPanel?.classList.contains('mobile-collapsed');
  setMobileDetailCollapsed(!isCollapsed);
}

function setMobileDetailCollapsed(collapsed) {
  els.detailPanel?.classList.toggle('mobile-collapsed', collapsed);
  if (els.mobileInfoToggle) {
    els.mobileInfoToggle.textContent = collapsed ? 'Show anime info ▾' : 'Hide anime info ▴';
    els.mobileInfoToggle.setAttribute('aria-expanded', String(!collapsed));
  }
}

function onMobileNav(tab) {
  closeMobileSearch();
  els.mobileNav?.querySelectorAll('.mob-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.mob === tab);
  });
  if (tab === 'home') { setHomeCategory('home'); showView('home'); return; }
  if (tab === 'search') { showView('home'); openMobileSearch(); return; }
  if (tab === 'browse') { showView('home'); setHomeCategory('popular'); return; }
  if (tab === 'library') { showLibrary(); }
}

function showLibrary() {
  showView('home');
  state.homeCategory = 'library';
  document.querySelectorAll('.nav-cat').forEach((b) => b.classList.remove('active'));
  els.heroSection?.classList.add('hidden');
  els.homeTrendingSection?.classList.add('hidden');
  els.homePopularSection?.classList.add('hidden');
  els.homeAiringSection?.classList.add('hidden');
  els.continueSection?.classList.add('hidden');
  els.categorySection?.classList.remove('hidden');
  revealSection(els.categorySection);
  if (els.categoryTitle) els.categoryTitle.textContent = 'My Library';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  syncMobileBrowseBar();
  renderLibraryGrid();
}

function renderLibraryGrid() {
  const bookmarks = UserStore.getBookmarks();
  const history = UserStore.getHistory();
  const merged = [...bookmarks, ...history.filter((h) => !bookmarks.some((b) => b.id === h.id))];
  if (!merged.length) {
    els.categoryGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">★</span>
        <h4>Your library is empty</h4>
        <p>Bookmark anime or start watching to build your personal list.</p>
      </div>`;
    return;
  }
  els.categoryGrid.innerHTML = merged.map((item, i) => `
    <article class="category-card" data-idx="${i}" data-mal="${item.malId || ''}" data-series="${item.seriesId || ''}">
      <div class="category-poster">
        ${imgTag(item.poster, item.title)}
      </div>
      <div class="category-info">
        <h3>${esc(item.title)}</h3>
        <p>${item.episode ? `Episode ${item.episode}` : 'Bookmarked'}</p>
      </div>
    </article>`).join('');

  els.categoryGrid.querySelectorAll('.category-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx, 10);
      const item = merged[idx];
      if (item.seriesId) openAnikotoSeries(parseInt(item.seriesId, 10));
      else if (item.malId) openSearchResult({ malId: parseInt(item.malId, 10), title: item.title });
    });
  });
}

function renderAzGrid() {
  if (!els.azGrid) return;
  els.azGrid.innerHTML = AZ_LETTERS.map((l) =>
    `<button type="button" class="az-btn" data-letter="${l === 'All' ? 'all' : l}">${l}</button>`
  ).join('');
  els.azGrid.querySelectorAll('.az-btn').forEach((btn) => {
    btn.addEventListener('click', () => filterByLetter(btn.dataset.letter));
  });
}

async function filterByLetter(letter) {
  els.azGrid?.querySelectorAll('.az-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.letter === letter);
  });
  showView('home');
  els.heroSection?.classList.add('hidden');
  els.homeTrendingSection?.classList.add('hidden');
  els.homePopularSection?.classList.add('hidden');
  els.homeAiringSection?.classList.add('hidden');
  els.continueSection?.classList.add('hidden');
  els.categorySection?.classList.remove('hidden');
  revealSection(els.categorySection);
  if (els.categoryTitle) els.categoryTitle.textContent = letter === 'all' ? 'All Anime' : `Anime: ${letter}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  els.categoryGrid.innerHTML = Array(8).fill('<div class="skeleton-card"></div>').join('');

  try {
    const { items } = await API.getBrowse('popular', 1);
    const pool = items || [];
    const filtered = pool.filter((a) => matchesLetter(a.title, letter));
    state.categoryItems = filtered;
    renderCategoryGrid();
  } catch (e) {
    els.categoryGrid.innerHTML = `<div class="empty-state">Failed: ${e.message}</div>`;
  }
}

function matchesLetter(title, letter) {
  const t = (title || '').trim();
  if (!t) return false;
  if (letter === 'all') return true;
  if (letter === '#') return /^[^a-zA-Z0-9]/.test(t);
  if (letter === '0-9') return /^[0-9]/.test(t);
  return t.toUpperCase().startsWith(letter);
}

function renderContinueWatching() {
  const items = UserStore.getContinueWatching();
  if (!items.length) {
    els.continueSection?.classList.add('hidden');
    return;
  }
  els.continueSection?.classList.remove('hidden');
  window.__observeReveal?.(els.continueSection);
  els.continueRow.innerHTML = items.map((item, i) => {
    const pct = item.totalEps ? Math.min(100, (item.episode / item.totalEps) * 100) : 30;
    return `
      <article class="continue-card" data-idx="${i}">
        <div class="continue-poster">
          ${imgTag(item.poster, item.title)}
        </div>
        <div class="continue-info">
          <h4>${esc(item.title)}</h4>
          <p>Episode ${item.episode || 1}</p>
          <div class="continue-bar"><span style="width:${pct}%"></span></div>
        </div>
      </article>`;
  }).join('');

  els.continueRow.querySelectorAll('.continue-card').forEach((card) => {
    card.addEventListener('click', () => resumeWatch(items[parseInt(card.dataset.idx, 10)]));
  });
}

function resumeWatch(item) {
  if (item.seriesId) {
    openAnikotoSeries(parseInt(item.seriesId, 10));
    setTimeout(() => { if (item.episode) playEpisode(item.episode, true); }, 1200);
  } else if (item.malId) {
    openSearchResult({ malId: parseInt(item.malId, 10), title: item.title });
    setTimeout(() => { if (item.episode) playEpisode(item.episode, true); }, 1200);
  }
}

function toggleBookmarkCurrent() {
  if (!state.currentAnime) return;
  const on = UserStore.toggleBookmark(state.currentAnime);
  updateBookmarkButton(on);

  // Tactile pop animation + toast feedback
  els.bookmarkBtn?.classList.remove('just-toggled');
  requestAnimationFrame(() => els.bookmarkBtn?.classList.add('just-toggled'));
  els.bookmarkBtn?.addEventListener('animationend', () => {
    els.bookmarkBtn.classList.remove('just-toggled');
  }, { once: true });

  showToast(
    on ? '★ Bookmarked' : '☆ Removed from bookmarks',
    on ? 'success' : 'info'
  );
}

function updateBookmarkButton(forced) {
  if (!els.bookmarkBtn || !state.currentAnime) return;
  const on = typeof forced === 'boolean' ? forced : UserStore.isBookmarked(UserStore.animeKey(state.currentAnime));
  els.bookmarkBtn.textContent = on ? '★' : '☆';
  els.bookmarkBtn.classList.toggle('active', on);
  els.bookmarkBtn.setAttribute('aria-label', on ? 'Remove bookmark' : 'Bookmark anime');
}

function saveWatchProgress() {
  const a = state.currentAnime;
  if (!a) return;
  UserStore.addHistory({
    id: UserStore.animeKey(a),
    malId: a.malId || null,
    seriesId: a.seriesId || null,
    title: a.title,
    poster: a.poster || null,
    episode: state.currentEpisode,
    totalEps: state.episodes.length || a.episodes || null,
  });
  renderContinueWatching();
}

async function loadRecent() {
  els.recentList.innerHTML = '<li class="loading"><div class="spinner"></div></li>';
  try {
    const { items, pagination } = await API.getRecentAnime(state.recentPage, 20);
    state.recentItems = items;
    state.recentPagination = pagination;
    renderRelatedList();
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
        ${imgTag(norm.poster, norm.title)}
        <span class="related-title">${esc(norm.title)}</span>
      </li>`;
  }).join('');

  els.recentList.querySelectorAll('.related-item').forEach((li) => {
    li.addEventListener('click', () => openAnikotoSeries(parseInt(li.dataset.id, 10)));
  });
}

function applyHomeData(data) {
  if (!data) return;
  state.spotlightItems = data.spotlight || [];
  state.trendingItems = data.trending || [];
  state.spotlightIndex = 0;
  renderSpotlight();
  renderTrending();
  startSpotlightAutoplay();
}

async function loadHomeData() {
  const cached = Cache.getHome();
  if (cached?.spotlight?.length) applyHomeData(cached);

  try {
    applyHomeData(await API.getHomeFeed());
  } catch (e) {
    if (!cached?.spotlight?.length && els.heroTitle) {
      els.heroTitle.textContent = 'Could not load — retrying…';
      setTimeout(() => loadHomeData(), 2000);
    }
  }

  // Load popular + airing grids in parallel, non-blocking
  loadHomeGrid('popular', els.homePopularGrid);
  loadHomeGrid('airing', els.homeAiringGrid);
}

async function loadHomeGrid(type, gridEl) {
  if (!gridEl) return;
  try {
    const { items } = await API.getBrowse(type, 1);
    const slice = (items || []).slice(0, 12);
    if (!slice.length) { gridEl.innerHTML = ''; return; }
    gridEl.innerHTML = slice.map((a, i) => `
      <article class="category-card" data-mal="${a.malId}" data-idx="${i}">
        <div class="category-poster">${imgTag(a.poster, a.title)}</div>
        <div class="category-info">
          <h3>${esc(a.title)}</h3>
          <p>${[a.type || 'TV', a.year, a.score ? `★ ${a.score}` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      </article>`).join('');
    gridEl.querySelectorAll('.category-card').forEach((card) => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx, 10);
        openSearchResult(slice[idx]);
      });
      card.addEventListener('mouseenter', () => API.prefetchResolve(parseInt(card.dataset.mal, 10)));
    });
  } catch {
    gridEl.innerHTML = '';
  }
}

async function loadCategoryItems(type) {
  els.categoryGrid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const { items } = await API.getBrowse(type, 1);
    state.categoryItems = items || [];
    renderCategoryGrid();
  } catch (e) {
    els.categoryGrid.innerHTML = `<div class="empty-state">Failed: ${e.message}</div>`;
  }
}

function setHomeCategory(cat) {
  state.homeCategory = cat || 'home';
  if (state.view !== 'home') showView('home');

  document.querySelectorAll('.nav-cat').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  const isHome = cat === 'home';
  els.heroSection?.classList.toggle('hidden', !isHome);
  els.homeTrendingSection?.classList.toggle('hidden', !isHome);
  els.homePopularSection?.classList.toggle('hidden', !isHome);
  els.homeAiringSection?.classList.toggle('hidden', !isHome);
  els.continueSection?.classList.toggle('hidden', !isHome || !UserStore.getContinueWatching().length);
  els.categorySection?.classList.toggle('hidden', isHome);
  els.azGrid?.querySelectorAll('.az-btn').forEach((b) => b.classList.remove('active'));

  syncMobileBrowseBar();

  if (isHome) {
    stopSpotlightAutoplay();
    startSpotlightAutoplay();
    return;
  }

  stopSpotlightAutoplay();
  revealSection(els.categorySection);
  if (els.categoryTitle) els.categoryTitle.textContent = CATEGORY_LABELS[cat] || 'Browse';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadCategoryItems(cat);
}

function setHeroImage(imgEl, poster, title) {
  if (!imgEl) return;
  const src = posterSrc(poster);
  imgEl.dataset.fallback = poster || '';
  imgEl.dataset.triedFb = '';
  imgEl.referrerPolicy = 'no-referrer';
  imgEl.onerror = function () { window.__imgFallback(this); };
  imgEl.src = src || '';
  imgEl.alt = title || '';
  imgEl.style.opacity = src ? '1' : '0';
}

function renderSpotlight() {
  const items = state.spotlightItems;
  if (!items.length) return;

  const idx = ((state.spotlightIndex % items.length) + items.length) % items.length;
  state.spotlightIndex = idx;
  const a = items[idx];

  setHeroImage(els.heroBgImg, a.poster, '');
  setHeroImage(els.heroVisualImg, a.poster, a.title);
  if (els.heroBg) els.heroBg.style.backgroundImage = 'none';

  // Re-trigger visual entrance on slide change
  const frame = document.querySelector('.hero-visual-frame');
  if (frame) {
    frame.style.animation = 'none';
    requestAnimationFrame(() => { frame.style.animation = ''; });
  }
  if (els.heroRank) els.heroRank.textContent = `#${idx + 1} Spotlight`;
  if (els.heroTitle) els.heroTitle.textContent = a.title || '—';
  if (els.heroDesc) {
    const desc = stripHtml(a.description || '');
    els.heroDesc.textContent = desc.length > 220 ? `${desc.slice(0, 220)}…` : desc || 'No description available.';
  }
  if (els.heroMeta) {
    const type = a.type || a.raw?.type || 'TV';
    const eps = a.episodes ? `${a.episodes} eps` : '';
    els.heroMeta.innerHTML = [
      `<span class="hero-badge">${esc(type)}</span>`,
      eps ? `<span class="hero-badge">${esc(eps)}</span>` : '',
      '<span class="hero-badge hd">HD</span>',
      a.score ? `<span class="hero-badge score">★ ${esc(String(a.score))}</span>` : '',
    ].filter(Boolean).join('');
  }

  renderHeroDots(items.length, idx);
}

function renderHeroDots(total, activeIdx) {
  const container = document.getElementById('heroDots');
  if (!container || total <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  // Only rebuild DOM when count changes; otherwise just swap the active class
  if (container.children.length !== total) {
    container.innerHTML = Array.from({ length: total }, (_, i) => `
      <button class="hero-dot${i === activeIdx ? ' active' : ''}"
              type="button"
              data-idx="${i}"
              aria-label="Slide ${i + 1}"
              role="tab"
              aria-selected="${i === activeIdx}">
      </button>`).join('');

    container.querySelectorAll('.hero-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        state.spotlightIndex = parseInt(dot.dataset.idx, 10);
        renderSpotlight();
        resetSpotlightAutoplay();
      });
    });
  } else {
    container.querySelectorAll('.hero-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIdx);
      dot.setAttribute('aria-selected', String(i === activeIdx));
    });
  }
}

function renderTrending() {
  if (!els.trendingRow) return;
  const items = state.trendingItems.slice(0, 20);
  if (!items.length) {
    els.trendingRow.innerHTML = '<div class="empty-state">No trending anime</div>';
    return;
  }

  els.trendingRow.innerHTML = items.map((a, i) => `
    <article class="trending-card" data-mal="${a.malId}" data-idx="${i}">
      <span class="trending-vtitle">${esc(a.title)}</span>
      ${imgTag(a.poster, a.title)}
    </article>`).join('');

  els.trendingRow.querySelectorAll('.trending-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx, 10);
      openSearchResult(state.trendingItems[idx]);
    });
    card.addEventListener('mouseenter', () => API.prefetchResolve(parseInt(card.dataset.mal, 10)));
  });
}

function renderCategoryGrid() {
  if (!els.categoryGrid) return;
  const items = state.categoryItems;
  if (!items.length) {
    els.categoryGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🎌</span>
        <h4>No results found</h4>
        <p>Try a different category or browse via the search bar.</p>
      </div>`;
    return;
  }

  els.categoryGrid.innerHTML = items.map((a, i) => `
    <article class="category-card" data-mal="${a.malId}" data-idx="${i}">
      <div class="category-poster">
        ${imgTag(a.poster, a.title)}
      </div>
      <div class="category-info">
        <h3>${esc(a.title)}</h3>
        <p>${[a.type || a.raw?.type || 'Anime', a.year, a.score ? `★ ${a.score}` : ''].filter(Boolean).join(' · ')}</p>
      </div>
    </article>`).join('');

  els.categoryGrid.querySelectorAll('.category-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx, 10);
      openSearchResult(state.categoryItems[idx]);
    });
    card.addEventListener('mouseenter', () => API.prefetchResolve(parseInt(card.dataset.mal, 10)));
  });
}

function stepSpotlight(dir) {
  if (!state.spotlightItems.length) return;
  state.spotlightIndex += dir;
  renderSpotlight();
  resetSpotlightAutoplay();
}

function startSpotlightAutoplay() {
  stopSpotlightAutoplay();
  if (state.homeCategory !== 'home' || state.spotlightItems.length < 2) return;
  state.spotlightTimer = setInterval(() => {
    state.spotlightIndex += 1;
    renderSpotlight();
  }, 6000);
}

function stopSpotlightAutoplay() {
  if (state.spotlightTimer) {
    clearInterval(state.spotlightTimer);
    state.spotlightTimer = null;
  }
}

function resetSpotlightAutoplay() {
  stopSpotlightAutoplay();
  startSpotlightAutoplay();
}

function openSpotlightAnime(watchNow = true) {
  const a = state.spotlightItems[state.spotlightIndex];
  if (!a) return;
  if (watchNow) {
    openSearchResult(a, { autoPlay: true, scrollToPlayer: true });
    return;
  }
  openSearchResult(a, { autoPlay: false, scrollToPlayer: false });
  setTimeout(() => scrollToDetail(), 600);
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
  if (isMobileView() && !els.mobileSearchSheet?.classList.contains('hidden')) {
    renderMobileSearchResults();
  }

  if (!state.searchOpen || !state.searchResults.length) {
    els.searchDropdown.classList.add('hidden');
    if (isMobileView()) renderMobileSearchResults();
    return;
  }
  els.searchDropdown.classList.remove('hidden');
  els.searchDropdown.innerHTML = state.searchResults.map((anime, i) => `
    <div class="search-item${i === state.searchIndex ? ' active' : ''}" data-idx="${i}" data-mal="${anime.malId}">
      ${imgTag(anime.poster, '')}
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

  // Prefetch top results only once per query, not on every render (arrow-key navigation)
  if (!state._lastPrefetchQuery || state._lastPrefetchQuery !== state.searchQuery) {
    state._lastPrefetchQuery = state.searchQuery;
    state.searchResults.slice(0, 3).forEach((a) => API.prefetchResolve(a.malId));
  }
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

function getFirstEpisodeNumber() {
  if (!state.episodes.length) return 1;
  const sorted = [...state.episodes].sort((a, b) => Number(a.number) - Number(b.number));
  return Number(sorted[0].number) || 1;
}

function applyResolvedData(result, opts = {}) {
  const { anime, episodes, streamMethod } = API.applyResolveResult(result);
  state.currentAnime = anime;
  state.episodes = episodes;
  state.streamMethod = streamMethod;
  state.currentEpisode = getFirstEpisodeNumber();
  state.language = anime.hasSub !== false ? 'sub' : 'dub';
  state.epRangeStart = 1;
  renderSeries();
  setMobileDetailCollapsed(isMobileView());
  updatePageTitle(anime.title, null);
  if (opts.autoPlay === false) {
    requestAnimationFrame(() => scrollToPlayer('instant'));
    setTimeout(() => scrollToPlayer('instant'), 100);
    return;
  }
  const firstEp = getFirstEpisodeNumber();
  const delay = isMobileView() ? 550 : 450;
  setTimeout(() => playEpisode(firstEp, opts.scrollToPlayer !== false), delay);
}

async function openSearchResult(anime, opts = {}) {
  state.searchOpen = false;
  els.searchInput.value = '';
  if (els.mobileSearchInput) els.mobileSearchInput.value = '';
  closeMobileSearch();
  renderSearchDropdown();
  showView('series');
  els.seriesError.classList.add('hidden');

  const cached = Cache.getResolve(anime.malId);
  if (cached) {
    applyResolvedData(cached, opts);
    setLoading(false);
    API.resolveByMalId(anime.malId).catch(() => {});
    return;
  }

  setLoading(true);
  try {
    applyResolvedData(await API.resolveByMalId(anime.malId), opts);
    setLoading(false);
  } catch (e) {
    setLoading(false);
    showSeriesError(`Could not load: ${e.message}`, () => openSearchResult(anime, opts));
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
    showSeriesError(`Failed: ${e.message}`, () => openAnikotoSeries(seriesId));
  }
}

function renderSeries() {
  const a = state.currentAnime;
  if (!a) return;

  els.seriesPoster.innerHTML = imgTag(a.poster, a.title);
  els.seriesTitle.textContent = a.title;
  if (els.mobileWatchTitle) els.mobileWatchTitle.textContent = a.title;

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
  updateBookmarkButton();
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

  while (queue.length && fetches < 4 && discovered.size < 10) {
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
    // Use data-poster attribute and set via JS to avoid inline-style URL injection (XSS)
    return `
      <button class="franchise-card${active}" type="button" data-mal="${item.malId}" data-title="${esc(item.title)}" data-poster="${esc(item.poster || '')}" data-idx="${idx}">
        <span class="franchise-label">${esc(item.label)}</span>
      </button>`;
  }).join('');

  // Apply background images safely via JS (avoids CSS injection through malformed URLs)
  els.franchiseTrack.querySelectorAll('.franchise-card[data-poster]').forEach((card) => {
    const poster = card.dataset.poster;
    if (poster) card.style.backgroundImage = `url(${JSON.stringify(poster)})`; // JSON.stringify escapes quotes
  });

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
    els.episodeGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">📺</span>
        <h4>No episodes</h4>
        <p>Episode data isn't available for this title yet.</p>
      </div>`;
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

  const activeBtn = els.episodeGrid.querySelector('.episode-btn.active');
  if (activeBtn) {
    setTimeout(() => {
      activeBtn.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: 'smooth',
      });
    }, 80);
  }
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

function tryStreamMethod(method, ep, lang) {
  const a = state.currentAnime;
  const epNum = Number(ep.number);
  if (method === 'embed') {
    if (ep.embedId) return { url: API.buildStreamUrl({ method: 'embed', embedId: ep.embedId, lang }), method: 'embed' };
    if (ep.embedUrl?.[lang]) return { url: ep.embedUrl[lang], method: 'embed' };
  }
  if (method === 'ani' && a.aniId) {
    return { url: API.buildStreamUrl({ method: 'ani', aniId: a.aniId, episode: epNum, lang }), method: 'ani' };
  }
  if (method === 'mal' && a.malId) {
    return { url: API.buildStreamUrl({ method: 'mal', malId: a.malId, episode: epNum, lang }), method: 'mal' };
  }
  return null;
}

function resolveStreamUrl(ep, lang, method) {
  const a = state.currentAnime;
  if (!ep || !a) return null;

  const preferred = method || state.streamMethod;
  const chain = [...new Set([preferred, 'embed', 'mal', 'ani'])];
  for (const m of chain) {
    const hit = tryStreamMethod(m, ep, lang);
    if (hit?.url) return hit;
  }
  return null;
}

function findEpisode(epNum) {
  const num = Number(epNum);
  // Only use the exact-match path — the [num-1] fallback assumed sorted 1-indexed
  // episodes which is not guaranteed and returned wrong episodes for multi-season anime.
  return state.episodes.find((e) => Number(e.number) === num) || null;
}

function loadPlayer(url) {
  els.playerPlaceholder.classList.remove('hidden');
  setPlayerPlaceholder('Loading…');
  els.playerIframe.classList.add('hidden');
  els.playerIframe.src = 'about:blank';

  const load = () => {
    els.playerIframe.onload = () => {
      els.playerIframe.classList.remove('hidden');
      els.playerPlaceholder.classList.add('hidden');
      els.playerIframe.onload = null;
    };
    els.playerIframe.src = url;
    setTimeout(() => {
      if (!els.playerIframe.classList.contains('hidden')) return;
      els.playerIframe.classList.remove('hidden');
      els.playerPlaceholder.classList.add('hidden');
    }, 2500);
  };

  setTimeout(load, 200);
}

function getHeaderHeight() {
  const header = document.querySelector('.site-header');
  const banner = document.getElementById('proxyBanner');
  let h = header?.offsetHeight || 72;
  if (banner && !banner.classList.contains('hidden')) h += banner.offsetHeight;
  return h;
}

function scrollToPlayer(behavior = 'smooth') {
  const target = els.playerWrap;
  if (!target) return;
  const offset = getHeaderHeight() + 12;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

function scrollToDetail() {
  const target = els.detailPanel;
  if (!target) return;
  setMobileDetailCollapsed(false);
  const top = target.getBoundingClientRect().top + window.scrollY - getHeaderHeight() - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function updateEpisodeUI(ep) {
  const num = Number(ep.number);
  if (els.watchingMsg) {
    els.watchingMsg.innerHTML = `You're watching <strong>Episode ${num}</strong>. If current server doesn't work, try another.`;
  }
  if (els.mobileWatchEp) els.mobileWatchEp.textContent = `Episode ${num}`;
  updatePageTitle(state.currentAnime?.title, num);
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
    setPlayerPlaceholder('No stream available for this episode. Try a different server.');
  }

  updateEpisodeUI(ep);
  renderEpisodeGrid();
  renderServerButtons();
  updateLangButtons();
  updateNavButtons();

  saveWatchProgress();

  if (scrollToPlayerView) {
    scrollToPlayer();
    setTimeout(() => scrollToPlayer('instant'), 400);
    if (isMobileView()) setTimeout(() => scrollToPlayer('instant'), 800);
  }
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
  if (!on && state.view === 'series') {
    requestAnimationFrame(() => scrollToPlayer('instant'));
    setTimeout(() => scrollToPlayer('instant'), 150);
  }
}

function showSeriesError(msg, retryFn) {
  els.seriesError.innerHTML = `
    <span>${esc(msg)}</span>
    ${retryFn ? '<button class="btn-retry" id="retryBtn">↺ Retry</button>' : ''}
  `;
  els.seriesError.classList.remove('hidden');
  els.seriesInfo?.classList.add('hidden');
  if (retryFn) {
    document.getElementById('retryBtn')?.addEventListener('click', retryFn, { once: true });
  }
}

function showView(view) {
  els.pageRoot?.classList.toggle('series-mode', view === 'series');
  els.pageRoot?.classList.toggle('home-mode', view === 'home');

  if (view === 'home') {
    updatePageTitle(null);
    document.querySelectorAll('.nav-cat').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cat === state.homeCategory);
    });
    els.mobileNav?.querySelectorAll('.mob-nav-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.mob === 'home' && state.homeCategory === 'home');
    });
    if (state.homeCategory === 'home') startSpotlightAutoplay();
  } else {
    stopSpotlightAutoplay();
    document.querySelectorAll('.nav-cat').forEach((btn) => btn.classList.remove('active'));
    els.mobileNav?.querySelectorAll('.mob-nav-item').forEach((b) => b.classList.remove('active'));
  }

  if (state.view === view) return;

  const prevEl = state.view === 'home' ? els.homeView : els.seriesView;
  const nextEl = view === 'home' ? els.homeView : els.seriesView;

  prevEl?.classList.add('view-leaving');
  setTimeout(() => {
    prevEl?.classList.add('hidden');
    prevEl?.classList.remove('view-leaving');
    nextEl?.classList.remove('hidden');
    if (view === 'series') {
      requestAnimationFrame(() => scrollToPlayer('instant'));
      setTimeout(() => scrollToPlayer('instant'), 350);
    }
  }, 280);

  state.view = view;
  syncMobileBrowseBar();
  if (view === 'series') closeMobileSearch();
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
  const data = event.data;
  if (!data || !els.autoNext?.checked) return;
  if (data === 'ended' || data?.event === 'ended' || data?.type === 'ended') {
    playAdjacent(1);
  }
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

// ─── Toast notification system ────────────────────────────────────────────
let _toastContainer = null;

function injectToastContainer() {
  if (_toastContainer) return;
  _toastContainer = document.createElement('div');
  _toastContainer.className = 'toast-container';
  _toastContainer.setAttribute('aria-live', 'polite');
  _toastContainer.setAttribute('aria-atomic', 'false');
  document.body.appendChild(_toastContainer);
}

const TOAST_ICONS = { success: '✓', error: '✕', info: 'ℹ' };

function showToast(message, type = 'info', duration = 3000) {
  if (!_toastContainer) injectToastContainer();

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span>${esc(message)}</span>`;

  _toastContainer.appendChild(el);

  const dismiss = () => {
    el.classList.add('toast-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };

  const timer = setTimeout(dismiss, duration);
  el.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}

// ─── Player placeholder text update helper ────────────────────────────────
function initRevealObserver() {
  const targets = document.querySelectorAll('.reveal-up');
  if (!targets.length) return;

  const show = (el) => el.classList.add('is-visible');

  if (!('IntersectionObserver' in window)) {
    targets.forEach(show);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        show(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach((el) => {
    if (el.classList.contains('hidden')) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) show(el);
    else io.observe(el);
  });

  // Re-observe sections when they become visible
  window.__observeReveal = (el) => {
    if (!el || el.classList.contains('is-visible')) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('is-visible');
      return;
    }
    io.observe(el);
  };
}

function revealSection(el) {
  if (!el) return;
  el.classList.add('is-visible');
  window.__observeReveal?.(el);
}

function initHeaderMenus() {
  els.notifyBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !els.notifyPanel?.classList.contains('hidden');
    closeHeaderMenus();
    if (!open) {
      els.notifyPanel?.classList.remove('hidden');
      els.notifyBtn?.setAttribute('aria-expanded', 'true');
      els.notifyDot?.classList.remove('has-unread');
    }
  });

  els.notifyClose?.addEventListener('click', closeHeaderMenus);

  els.profileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = els.profileBtn.getAttribute('aria-expanded') === 'true';
    closeHeaderMenus();
    if (!open) {
      els.profileDropdown?.classList.remove('hidden');
      els.profileBtn.setAttribute('aria-expanded', 'true');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-actions') && !e.target.closest('.notify-panel')) {
      closeHeaderMenus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHeaderMenus();
  });

  els.notifyDot?.classList.add('has-unread');
}

function closeHeaderMenus() {
  els.notifyPanel?.classList.add('hidden');
  els.notifyBtn?.setAttribute('aria-expanded', 'false');
  els.profileDropdown?.classList.add('hidden');
  els.profileBtn?.setAttribute('aria-expanded', 'false');
}

function setPlayerPlaceholder(text) {
  const el = els.playerPlaceholder;
  if (!el) return;
  // Preserve the icon span, update the text node
  let textNode = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
  if (!textNode) {
    textNode = document.createTextNode('');
    el.appendChild(textNode);
  }
  textNode.textContent = '\n' + text;
}

document.addEventListener('DOMContentLoaded', init);
