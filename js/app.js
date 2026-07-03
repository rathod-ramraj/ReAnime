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
  searchMode: false,
  playerScrolled: false,
  streamAttempt: 0,
  streamChain: [],
  streamIndex: 0,
  navToken: 0,
  homeRetryCount: 0,
  _playTimer: null,
  streamLoadTimer: null,
};

const CATEGORY_LABELS = {
  home: 'Home',
  movies: 'Movies',
  tv: 'TV Series',
  popular: 'Most Popular',
  airing: 'Top Airing',
};

const $ = (sel) => document.querySelector(sel);

const DL_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

function cardDownloadBtn(label) {
  return '';
}

function categoryCardHtml(a, i, extraClass = '') {
  const typeAndYear = [a.type || a.raw?.type || 'TV', a.year].filter(Boolean).join(' · ');
  const scoreBadge = a.score ? `<span class="card-rating-badge">★ ${a.score}</span>` : '';
  return `
    <article class="category-card${extraClass ? ` ${extraClass}` : ''}" data-mal="${a.malId || ''}" data-series="${a.seriesId || ''}" data-idx="${i}">
      <div class="category-poster">
        ${imgTag(a.poster, a.title)}
        ${scoreBadge}
        ${cardDownloadBtn(`Download ${a.title}`)}
      </div>
      <div class="category-info">
        <h3>${esc(a.title)}</h3>
        <p>${typeAndYear}</p>
      </div>
    </article>`;
}

function wireCategoryCards(container, items, onOpen, getEpNum) {
  container.querySelectorAll('.category-card').forEach((card) => {
    const idx = parseInt(card.dataset.idx, 10);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-dl-btn')) return;
      onOpen(items[idx], idx);
    });
    card.querySelector('.card-dl-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const ep = typeof getEpNum === 'function' ? getEpNum(items[idx], idx) : getEpNum;
      queueCardDownload(items[idx], ep);
    });
    card.addEventListener('mouseenter', () => {
      const mal = parseInt(card.dataset.mal, 10);
      if (mal) API.prefetchResolve(mal);
    });
  });
}

async function queueCardDownload(item, epNum = null) {
  if (!item?.malId && !item?.seriesId) {
    showToast('Cannot download this title', 'error');
    return;
  }
  showToast('Adding to download queue…', 'info');
  try {
    const result = item.seriesId
      ? await API.resolveBySeriesId(item.seriesId)
      : await API.resolveByMalId(item.malId);
    const { anime, episodes } = API.applyResolveResult(result);
    const num = epNum || episodes[0]?.number || 1;
    const ep = episodes.find((e) => Number(e.number) === Number(num)) || episodes[0] || { number: num };
    DownloadManager.addToQueue({
      anime,
      episode: ep.number,
      lang: anime.hasSub !== false ? 'sub' : 'dub',
      epData: ep,
      streamMethod: null,
    });
    showToast(`Queued ${anime.title}`, 'success');
  } catch (err) {
    showToast(err.message || 'Download failed', 'error');
  }
}

function setNavDownloadsActive(on) {
  els.navDownloads?.classList.toggle('active', on);
  if (on) document.querySelectorAll('.nav-cat').forEach((b) => b.classList.remove('active'));
}

function isMobileView() {
  return window.matchMedia('(max-width: 900px)').matches
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024);
}

function syncBannerOffset() {
  const banner = document.getElementById('proxyBanner');
  const h = banner && !banner.classList.contains('hidden') ? banner.offsetHeight : 0;
  document.documentElement.style.setProperty('--banner-h', `${h}px`);
}

function bumpNavigation() {
  state.navToken += 1;
  state.playerScrolled = false;
  if (state._playTimer) {
    clearTimeout(state._playTimer);
    state._playTimer = null;
  }
  return state.navToken;
}

function schedulePlayEpisode(epNum, shouldScroll, token, malId) {
  state._playTimer = setTimeout(() => {
    state._playTimer = null;
    if (state.navToken !== token) return;
    if (malId != null && state.currentAnime?.malId !== malId) return;
    playEpisode(epNum, shouldScroll);
  }, 10);
}

function getEpisodeNumbers() {
  return state.episodes
    .map((e) => Number(e.number))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

function alignEpRangeStart(epNum) {
  const numbers = getEpisodeNumbers();
  if (!numbers.length) {
    state.epRangeStart = 1;
    return;
  }
  const size = state.epRangeSize;
  const target = Number(epNum) || numbers[0];
  const idx = numbers.findIndex((n) => n >= target);
  const baseIdx = idx >= 0 ? Math.floor(idx / size) * size : 0;
  state.epRangeStart = numbers[baseIdx];
}

function syncDeviceMode() {
  document.documentElement.classList.toggle('mobile-mode', isMobileView());
  syncMobileBrowseBar();
  syncBannerOffset();
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
  playerRefreshBtn: $('#playerRefreshBtn'),
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
  mobileNav: $('#mobileNav'),
  homeAiringSection: $('#homeAiringSection'),
  homeAiringGrid: $('#homeAiringGrid'),
  homePopularSection: $('#homePopularSection'),
  homePopularGrid: $('#homePopularGrid'),
  homeFavoriteSection: $('#homeFavoriteSection'),
  homeFavoriteGrid: $('#homeFavoriteGrid'),
  homeCompletedSection: $('#homeCompletedSection'),
  homeCompletedGrid: $('#homeCompletedGrid'),
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
  searchResultsSection: $('#searchResultsSection'),
  searchResultsTitle: $('#searchResultsTitle'),
  searchResultsGrid: $('#searchResultsGrid'),
  downloadsSection: $('#downloadsSection'),
  downloadEpBtn: $('#downloadEpBtn'),
  downloadAllBtn: $('#downloadAllBtn'),
  openDownloadsBtn: $('#openDownloadsBtn'),
  clearDownloadsBtn: $('#clearDownloadsBtn'),
  navDownloads: $('#navDownloads'),
  installPrompt: $('#installPrompt'),
  installPromptClose: $('#installPromptClose'),
  installPromptBtn: $('#installPromptBtn'),
  installPromptLater: $('#installPromptLater'),
  installPromptIos: $('#installPromptIos'),
  installPromptDesc: $('#installPromptDesc'),
};

async function init() {
  syncDeviceMode();
  window.addEventListener('resize', debounce(syncDeviceMode, 150));
  injectToastContainer();
  initRevealObserver();
  initHeaderMenus();
  initInstallPrompt();
  initSidebar();
  if (window.DownloadManager) DownloadManager.init();
  window.showToast = showToast;
  initSearchPlaceholderRotation();
  bindEvents();
  renderContinueWatching();
  setHomeCategory('home');
  handleRouting();
  window.addEventListener('message', onPlayerMessage);
  checkServer();
  syncBannerOffset();
  window.__onHomeFeedUpdate = (data) => {
    if (state.view === 'home' && state.homeCategory === 'home' && !state.searchMode) {
      applyHomeData(data);
    }
  };
  window.__onTrendingUpdate = (data) => {
    if (state.view === 'home' && state.homeCategory === 'home' && !state.searchMode && data.items) {
      state.trendingItems = data.items;
      renderTrending();
    }
  };
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
  syncBannerOffset();
}

function initSearchPlaceholderRotation() {
  const texts = ["Search Anime..", "Search Onepiece..", "ONEPIECE IS REAL !!!"];
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  
  function type() {
    const currentWord = texts[wordIndex];
    charIndex += isDeleting ? -1 : 1;
    
    const textToShow = currentWord.substring(0, charIndex);
    if (els.searchInput) els.searchInput.placeholder = textToShow || " ";
    if (els.mobileSearchInput) els.mobileSearchInput.placeholder = textToShow || " ";
    
    let speed = isDeleting ? 40 : 80;
    
    if (!isDeleting && charIndex === currentWord.length) {
      speed = 1800;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % texts.length;
      speed = 400;
    }
    setTimeout(type, speed);
  }
  
  setTimeout(type, 500);
}

function bindEvents() {
  els.searchInput?.addEventListener('input', debounce(onSearchInput, 80));
  els.searchInput?.addEventListener('keydown', onSearchKeydown);
  els.searchInput?.addEventListener('focus', () => {
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
  els.playerRefreshBtn?.addEventListener('click', refreshPlayer);
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

  els.epLangFilter?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'sub' || val === 'dub') setLanguage(val);
  });

  const goHome = (e) => {
    e?.preventDefault();
    setHomeCategory('home');
    showView('home');
  };
  els.navHome?.addEventListener('click', goHome);

  document.querySelectorAll('.nav-cat').forEach((btn) => {
    btn.addEventListener('click', () => {
      setNavDownloadsActive(false);
      setHomeCategory(btn.dataset.cat);
    });
  });
  els.navDownloads?.addEventListener('click', showDownloadsView);

  els.heroPrev?.addEventListener('click', () => stepSpotlight(-1));
  els.heroNext?.addEventListener('click', () => stepSpotlight(1));
  els.heroWatch?.addEventListener('click', () => openSpotlightAnime(true));
  els.heroDetail?.addEventListener('click', () => openSpotlightAnime(false));

  // Mobile swipe gestures for spotlight slider
  let touchStartX = 0;
  let touchEndX = 0;
  els.heroSection?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  els.heroSection?.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        stepSpotlight(-1);
      } else {
        stepSpotlight(1);
      }
      resetSpotlightAutoplay();
    }
  }, { passive: true });
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
      if (action === 'downloads') { showDownloadsView(); return; }
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
  }, 80));

  els.mobileSearchInput?.addEventListener('keydown', (e) => {
    els.searchInput.value = els.mobileSearchInput.value;
    onSearchKeydown(e);
  });

  els.mobileSearchClose?.addEventListener('click', closeMobileSearch);
  
  els.playerPlaceholder?.addEventListener('click', () => {
    const ep = state.currentEpisode || getFirstEpisodeNumber();
    if (ep) playEpisode(ep, false);
  });

  els.mobileInfoToggle?.addEventListener('click', toggleMobileDetail);

  els.downloadEpBtn?.addEventListener('click', () => queueEpisodeDownload(state.currentEpisode));
  els.downloadAllBtn?.addEventListener('click', queueAllDownloads);
  els.openDownloadsBtn?.addEventListener('click', showDownloadsView);
  els.clearDownloadsBtn?.addEventListener('click', () => DownloadManager?.clearCompleted());
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
        <div class="search-item-meta">${esc(searchResultMeta(anime))}</div>
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
  const show = isMobileView() && state.view === 'home' && state.homeCategory === 'home' && !state.searchMode;
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
  if (tab === 'downloads') { showDownloadsView(); return; }
  if (tab === 'library') { showLibrary(); }
}

function showDownloadsView() {
  closeHeaderMenus();
  closeMobileSearch();
  showView('home');
  state.homeCategory = 'downloads';
  setNavDownloadsActive(true);
  els.heroSection?.classList.add('hidden');
  els.homeTrendingSection?.classList.add('hidden');
  els.homeLatestSection?.classList.add('hidden');
  els.homeNewSection?.classList.add('hidden');
  els.homeUpcomingSection?.classList.add('hidden');
  els.continueSection?.classList.add('hidden');
  els.categorySection?.classList.add('hidden');
  els.searchResultsSection?.classList.add('hidden');
  els.mobileBrowseBar?.classList.add('hidden');
  els.downloadsSection?.classList.remove('hidden');
  revealSection(els.downloadsSection);
  DownloadManager?.renderPanel();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  els.mobileNav?.querySelectorAll('.mob-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.mob === 'downloads');
  });
}

function getEpisodeForDownload(epNum) {
  const ep = findEpisode(epNum || state.currentEpisode);
  if (ep) return ep;
  const a = state.currentAnime;
  if (!a) return null;
  const num = Number(epNum || state.currentEpisode || 1);
  return { number: num, embedId: null, title: a.title || `Episode ${num}` };
}

function queueEpisodeDownload(epNum, lang) {
  if (!state.currentAnime) return;
  const ep = getEpisodeForDownload(epNum);
  if (!ep) {
    showToast('Episode not found', 'error');
    return;
  }
  const useLang = lang || state.language;
  DownloadManager.addToQueue({
    anime: state.currentAnime,
    episode: ep.number,
    lang: useLang,
    epData: ep,
    streamMethod: state.streamMethod,
  });
  showToast(`Queued Ep ${ep.number} for download`, 'success');
}

function queueAllDownloads() {
  if (!state.currentAnime || !state.episodes.length) return;
  const lang = state.language;
  DownloadManager.addBulk(state.currentAnime, state.episodes, lang, state.streamMethod);
  showToast(`Queued ${state.episodes.length} episodes`, 'success');
}

function showLibrary() {
  showView('home');
  state.homeCategory = 'library';
  setNavDownloadsActive(false);
  document.querySelectorAll('.nav-cat').forEach((b) => b.classList.remove('active'));
  els.heroSection?.classList.add('hidden');
  els.homeTrendingSection?.classList.add('hidden');
  els.homeLatestSection?.classList.add('hidden');
  els.homeNewSection?.classList.add('hidden');
  els.homeUpcomingSection?.classList.add('hidden');
  els.continueSection?.classList.add('hidden');
  els.categorySection?.classList.remove('hidden');
  els.downloadsSection?.classList.add('hidden');
  revealSection(els.categorySection);
  if (els.categoryTitle) els.categoryTitle.textContent = 'My Library';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  syncMobileBrowseBar();
  renderLibraryGrid();
  els.mobileNav?.querySelectorAll('.mob-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.mob === 'library');
  });
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
  els.categoryGrid.innerHTML = merged.map((item, i) => categoryCardHtml(
    { ...item, type: item.episode ? `Ep ${item.episode}` : 'Bookmarked', year: '', score: null },
    i,
  )).join('');

  wireCategoryCards(els.categoryGrid, merged, (item) => {
    if (item.seriesId) openAnikotoSeries(parseInt(item.seriesId, 10));
    else if (item.malId) openSearchResult({ malId: parseInt(item.malId, 10), title: item.title });
  }, (item) => item.episode);
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
    return `
      <article class="continue-card" data-idx="${i}">
        <div class="continue-poster">
          ${imgTag(item.poster, item.title)}
          <button type="button" class="continue-delete-btn" aria-label="Remove" title="Remove from Continue Watching">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="continue-info">
          <p>Episode ${item.episode || 1}</p>
          <h4>${esc(item.title)}</h4>
        </div>
      </article>`;
  }).join('');

  els.continueRow.querySelectorAll('.continue-card').forEach((card) => {
    const idx = parseInt(card.dataset.idx, 10);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.continue-delete-btn')) return;
      resumeWatch(items[idx]);
    });
    card.querySelector('.continue-delete-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.add('exploding');
      setTimeout(() => {
        UserStore.removeHistory(items[idx].id);
        renderContinueWatching();
        showToast('Removed from Continue Watching', 'success');
      }, 300);
    });
  });
}

function resumeWatch(item) {
  const opts = {
    autoPlay: false,
    scrollToPlayer: true,
    startEpisode: item.episode || null,
  };
  if (item.seriesId) {
    openAnikotoSeries(parseInt(item.seriesId, 10), opts);
  } else if (item.malId) {
    openSearchResult({ malId: parseInt(item.malId, 10), title: item.title }, opts);
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
  if (!state.currentAnime) return;
  const on = typeof forced === 'boolean' ? forced : UserStore.isBookmarked(UserStore.animeKey(state.currentAnime));
  if (els.bookmarkBtn) {
    els.bookmarkBtn.textContent = on ? '★' : '☆';
    els.bookmarkBtn.classList.toggle('active', on);
    els.bookmarkBtn.setAttribute('aria-label', on ? 'Remove bookmark' : 'Bookmark anime');
  }
  const btn2 = document.getElementById('detailBookmarkBtn');
  if (btn2) {
    btn2.textContent = on ? 'Remove from List' : 'Add to List';
    btn2.classList.toggle('active', on);
  }
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
        <div class="related-item-poster">
          ${imgTag(norm.poster, norm.title)}
        </div>
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
  if (data.trending?.length) state.trendingItems = data.trending;
  state.spotlightIndex = 0;
  renderSpotlight();
  if (state.trendingItems.length) {
    renderTrending();
    revealSection(els.homeTrendingSection);
  }
  startSpotlightAutoplay();
}

async function loadHomeData() {
  const cached = Cache.getHome();
  if (cached?.spotlight?.length || cached?.trending?.length) applyHomeData(cached);

  const homePromise = API.getHomeFeed()
    .then((data) => {
      applyHomeData(data);
      state.homeRetryCount = 0;
    })
    .catch((e) => {
      if (!cached?.spotlight?.length && els.heroTitle && state.homeRetryCount < 5) {
        state.homeRetryCount += 1;
        els.heroTitle.textContent = `Could not load — retrying (${state.homeRetryCount}/5)…`;
        setTimeout(() => loadHomeData(), 2000 * state.homeRetryCount);
      } else if (els.heroTitle && !cached?.spotlight?.length) {
        els.heroTitle.textContent = 'Could not load home feed';
      }
      return e;
    });

  await Promise.all([homePromise, loadTrendingSection()]);

  loadHomeGrid('airing', els.homeAiringGrid);
  loadHomeGrid('popular', els.homePopularGrid);
  loadHomeGrid('favorite', els.homeFavoriteGrid);
  loadHomeGrid('completed', els.homeCompletedGrid);
}

async function loadTrendingSection() {
  if (!els.trendingRow) return;

  if (!state.trendingItems.length) {
    els.trendingRow.innerHTML = Array(6).fill('<div class="skeleton-trending"></div>').join('');
  }

  try {
    const result = await API.getTrending(10);
    if (result.items && result.items.length) {
      state.trendingItems = result.items;
      renderTrending();
      revealSection(els.homeTrendingSection);
    } else if (!state.trendingItems.length) {
      els.trendingRow.innerHTML = '<div class="empty-state">No trending anime</div>';
    }
  } catch (err) {
    console.error('[loadTrendingSection] Error:', err);
    if (!state.trendingItems.length) {
      els.trendingRow.innerHTML = '<div class="empty-state">No trending anime</div>';
    }
  }
}

const HOME_GRID_LIMIT = 10;

async function loadHomeGrid(type, gridEl) {
  if (!gridEl) return;
  try {
    const [p1, p2] = await Promise.all([
      API.getBrowse(type, 1),
      API.getBrowse(type, 2),
    ]);
    const slice = [...(p1.items || []), ...(p2.items || [])].slice(0, HOME_GRID_LIMIT);
    if (!slice.length) { gridEl.innerHTML = ''; return; }
    gridEl.innerHTML = slice.map((a, i) => categoryCardHtml({ ...a, type: a.type || 'TV' }, i)).join('');
    wireCategoryCards(gridEl, slice, (item) => openSearchResult(item));
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

  setNavDownloadsActive(false);
  document.querySelectorAll('.nav-cat').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  if (cat === 'home') exitSearchMode();

  const isHome = cat === 'home';
  els.heroSection?.classList.toggle('hidden', !isHome);
  els.searchResultsSection?.classList.toggle('hidden', !state.searchMode);
  els.homeTrendingSection?.classList.toggle('hidden', !isHome);
  els.homeLatestSection?.classList.toggle('hidden', !isHome);
  els.homeNewSection?.classList.toggle('hidden', !isHome);
  els.homeUpcomingSection?.classList.toggle('hidden', !isHome);
  els.continueSection?.classList.toggle('hidden', !isHome || !UserStore.getContinueWatching().length);
  els.categorySection?.classList.toggle('hidden', isHome);
  els.downloadsSection?.classList.add('hidden');

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
  const items = state.trendingItems.slice(0, 10);
  if (!items.length) {
    els.trendingRow.innerHTML = '<div class="empty-state">No trending anime</div>';
    return;
  }

  els.trendingRow.innerHTML = items.map((a, i) => `
    <article class="movie-card" data-mal="${a.malId}" data-idx="${i}">
      <div class="card-inner">
        <span class="rank-number">${i + 1}</span>
        <div class="poster-wrap">
          ${cardDownloadBtn(`Download ${a.title}`)}
          ${imgTag(a.poster, a.title)}
        </div>
      </div>
      <h3 class="movie-title">${esc(a.title)}</h3>
    </article>`).join('');

  els.trendingRow.querySelectorAll('.movie-card').forEach((card) => {
    const idx = parseInt(card.dataset.idx, 10);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-dl-btn')) return;
      openSearchResult(state.trendingItems[idx]);
    });
    card.querySelector('.card-dl-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      queueCardDownload(state.trendingItems[idx]);
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

  els.categoryGrid.innerHTML = items.map((a, i) => categoryCardHtml(a, i)).join('');
  wireCategoryCards(els.categoryGrid, items, (item) => openSearchResult(item));
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
}

function rankSearchResults(query, items) {
  if (typeof Titles !== 'undefined') {
    return Titles.filterAndRankSearch(query, items);
  }
  const q = query.toLowerCase().trim();
  return [...items].filter((a) => (a.title || '').toLowerCase().includes(q));
}

function searchResultMeta(anime) {
  if (typeof Titles !== 'undefined') return Titles.searchMetaLine(anime);
  return [anime.year || '', anime.episodes ? `${anime.episodes} eps` : ''].filter(Boolean).join(' · ');
}

async function onSearchInput(e) {
  const q = e.target.value.trim();
  state.searchQuery = q;
  if (q.length < 2) {
    state.searchResults = [];
    state.searchOpen = false;
    if (state.searchMode) exitSearchMode();
    preserveScroll(() => renderSearchDropdown());
    return;
  }

  hideSearchResultsView();

  const applyResults = (items, rebuildDropdown = true) => {
    state.searchResults = rankSearchResults(q, items);
    state._lastAppliedQuery = q;
    state.searchOpen = state.searchResults.length > 0;
    state.searchIndex = -1;
    preserveScroll(() => {
      if (isMobileView() && !els.mobileSearchSheet?.classList.contains('hidden')) {
        renderMobileSearchResults();
      }
      renderSearchDropdown(rebuildDropdown);
    });
  };

  const cached = Cache.getSearch(q);
  if (cached) {
    applyResults(cached.items.map(API.normalizeJikanAnime));
    API.searchAnime(q).then(({ items }) => {
      if (state.searchQuery !== q) return;
      applyResults(items.map(API.normalizeJikanAnime));
    }).catch(() => {});
    return;
  }

  try {
    const { items } = await API.searchAnime(q);
    if (state.searchQuery !== q) return;
    applyResults(items.map(API.normalizeJikanAnime));
  } catch {
    if (state.searchQuery === q) {
      state.searchResults = [];
      renderSearchResultsGrid();
      renderSearchDropdown();
    }
  }
}

function restoreHomeSections() {
  const isHome = state.homeCategory === 'home';
  els.heroSection?.classList.toggle('hidden', !isHome);
  els.homeTrendingSection?.classList.toggle('hidden', !isHome);
  els.homeLatestSection?.classList.toggle('hidden', !isHome);
  els.homeNewSection?.classList.toggle('hidden', !isHome);
  els.homeUpcomingSection?.classList.toggle('hidden', !isHome);
  els.continueSection?.classList.toggle('hidden', !isHome || !UserStore.getContinueWatching().length);
  els.categorySection?.classList.toggle('hidden', isHome);
  els.downloadsSection?.classList.add('hidden');
  els.mobileBrowseBar?.classList.toggle('hidden', !isMobileView() || !isHome || state.searchMode);
  syncMobileBrowseBar();
}

function hideSearchResultsView() {
  if (!state.searchMode) return;
  state.searchMode = false;
  els.searchResultsSection?.classList.add('hidden');
  restoreHomeSections();
}

function showSearchResultsView(query) {
  state.searchMode = true;
  if (isMobileView() && !els.mobileSearchSheet?.classList.contains('hidden')) {
    renderMobileSearchResults();
    return;
  }
  if (state.view !== 'home') showView('home');
  setNavDownloadsActive(false);
  document.querySelectorAll('.nav-cat').forEach((b) => b.classList.remove('active'));

  els.heroSection?.classList.add('hidden');
  els.homeTrendingSection?.classList.add('hidden');
  els.homeLatestSection?.classList.add('hidden');
  els.homeNewSection?.classList.add('hidden');
  els.homeUpcomingSection?.classList.add('hidden');
  els.continueSection?.classList.add('hidden');
  els.categorySection?.classList.add('hidden');
  els.downloadsSection?.classList.add('hidden');
  els.mobileBrowseBar?.classList.add('hidden');

  els.searchResultsSection?.classList.remove('hidden');
  revealSection(els.searchResultsSection);
  if (els.searchResultsTitle) {
    els.searchResultsTitle.textContent = `Results for “${query}”`;
  }
  renderSearchResultsGrid();
  syncMobileBrowseBar();
}

function exitSearchMode() {
  state.searchMode = false;
  state.searchQuery = '';
  state.searchResults = [];
  state._submitQuery = '';
  state._lastAppliedQuery = '';
  els.searchResultsSection?.classList.add('hidden');
  restoreHomeSections();
}

function preserveScroll(fn) {
  const y = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
  });
}

function renderSearchResultsGrid() {
  if (!els.searchResultsGrid) return;
  const items = state.searchResults;
  if (!items.length) {
    els.searchResultsGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⌕</span>
        <h4>No results found</h4>
        <p>Try a different spelling or shorter keywords.</p>
      </div>`;
    return;
  }

  els.searchResultsGrid.innerHTML = items.map((a, i) => categoryCardHtml(a, i, 'search-result-card')).join('');
  wireCategoryCards(els.searchResultsGrid, items, (item) => {
    openSearchResult(item, { autoPlay: true, scrollToPlayer: true });
  });
}

function renderSearchDropdown(rebuild = false) {
  if (!els.searchDropdown) return;

  if (!state.searchOpen || !state.searchResults.length) {
    els.searchDropdown.classList.add('hidden');
    if (isMobileView()) renderMobileSearchResults();
    return;
  }
  els.searchDropdown.classList.remove('hidden');

  if (!rebuild && els.searchDropdown.children.length === state.searchResults.length) {
    els.searchDropdown.querySelectorAll('.search-item').forEach((el, i) => {
      el.classList.toggle('active', i === state.searchIndex);
    });
    return;
  }

  els.searchDropdown.innerHTML = state.searchResults.map((anime, i) => `
    <div class="search-item${i === state.searchIndex ? ' active' : ''}" data-idx="${i}" data-mal="${anime.malId}">
      ${imgTag(anime.poster, '')}
      <div>
        <div class="search-item-title">${esc(anime.title)}</div>
        <div class="search-item-meta">${esc(searchResultMeta(anime))}</div>
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

function submitSearch() {
  const q = (els.searchInput?.value || els.mobileSearchInput?.value || '').trim();
  if (q.length < 2) return;

  state.searchQuery = q;
  state.searchOpen = false;
  state.searchIndex = -1;
  els.searchDropdown?.classList.add('hidden');

  if (isMobileView() && !els.mobileSearchSheet?.classList.contains('hidden')) {
    closeMobileSearch();
  }

  const hasLive = state.searchResults.length > 0 && state._lastAppliedQuery === q;
  const cached = !hasLive ? Cache.getSearch(q) : null;

  if (cached) {
    state.searchResults = rankSearchResults(q, cached.items.map(API.normalizeJikanAnime));
    state._lastAppliedQuery = q;
  }

  showSearchResultsView(q);

  if (!hasLive && !cached) {
    if (els.searchResultsGrid) {
      els.searchResultsGrid.innerHTML = Array(8).fill('<div class="skeleton-card"></div>').join('');
    }
    API.searchAnime(q).then(({ items }) => {
      if (state.searchQuery !== q) return;
      state.searchResults = rankSearchResults(q, items.map(API.normalizeJikanAnime));
      state._lastAppliedQuery = q;
      if (state.searchMode) renderSearchResultsGrid();
    }).catch(() => {
      if (state.searchQuery !== q) return;
      state.searchResults = [];
      renderSearchResultsGrid();
    });
  } else {
    API.searchAnime(q).then(({ items }) => {
      if (state.searchQuery !== q) return;
      state.searchResults = rankSearchResults(q, items.map(API.normalizeJikanAnime));
      state._lastAppliedQuery = q;
      if (state.searchMode) renderSearchResultsGrid();
    }).catch(() => {});
  }

  els.searchResultsSection?.scrollIntoView({ behavior: 'auto', block: 'start' });
}

function onSearchKeydown(e) {
  if (e.key === 'Enter') {
    const q = (e.target?.value || els.searchInput?.value || '').trim();
    if (q.length < 2) return;
    e.preventDefault();
    if (state.searchResults.length && state.searchIndex >= 0) {
      openSearchResult(state.searchResults[state.searchIndex], { autoPlay: true, scrollToPlayer: true });
      return;
    }
    submitSearch();
    return;
  }
  if (!state.searchOpen || !state.searchResults.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.searchIndex = Math.min(state.searchIndex + 1, state.searchResults.length - 1);
    renderSearchDropdown(false);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.searchIndex = Math.max(state.searchIndex - 1, 0);
    renderSearchDropdown(false);
  } else if (e.key === 'Escape') {
    state.searchOpen = false;
    exitSearchMode();
    els.searchInput.value = '';
    if (els.mobileSearchInput) els.mobileSearchInput.value = '';
    renderSearchDropdown();
    setHomeCategory('home');
  }
}

function getFirstEpisodeNumber() {
  if (!state.episodes.length) return 1;
  const sorted = [...state.episodes].sort((a, b) => Number(a.number) - Number(b.number));
  return Number(sorted[0].number) || 1;
}

function applyResolvedData(result, opts = {}) {
  const { anime, episodes, streamMethod } = API.applyResolveResult(result);
  
  if (!opts.autoPlayEp) {
    updateHistory(`/${createAnimeSlug(anime)}`);
  }
  
  const token = bumpNavigation();
  state.currentAnime = anime;
  state.episodes = episodes;
  state.currentEpisode = opts.startEpisode || getFirstEpisodeNumber();
  state.streamMethod = API.pickDefaultStreamMethod(anime, findEpisode(state.currentEpisode));
  state.language = anime.hasSub !== false ? 'sub' : 'dub';
  alignEpRangeStart(state.currentEpisode);
  if (els.epLangFilter) {
    els.epLangFilter.value = state.language === 'dub' ? 'dub' : 'sub';
  }
  renderSeries();
  setMobileDetailCollapsed(isMobileView());
  updatePageTitle(anime.title, null);
  if (opts.autoPlayEp) {
    opts.autoPlay = true;
    opts.startEpisode = opts.autoPlayEp;
  }

  if (!opts.autoPlay) {
    pinPlayerOnce();
    els.playerPlaceholder?.classList.remove('hidden');
    setPlayerPlaceholder('Click to play episode');
    return;
  }
  
  const firstEp = opts.startEpisode || getFirstEpisodeNumber();
  const shouldScroll = opts.scrollToPlayer !== false;
  schedulePlayEpisode(firstEp, shouldScroll, token, anime.malId);
}

async function openSearchResult(anime, opts = {}) {
  if (state.view === 'series') stopPlayer();
  state.searchOpen = false;
  exitSearchMode();
  els.searchInput && (els.searchInput.value = '');
  if (els.mobileSearchInput) els.mobileSearchInput.value = '';
  closeMobileSearch();
  renderSearchDropdown();
  showView('series');
  els.seriesError?.classList.add('hidden');

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

async function openAnikotoSeries(seriesId, opts = {}) {
  if (state.view === 'series') stopPlayer();
  showView('series');
  els.seriesError?.classList.add('hidden');

  const cached = Cache.getSeries(seriesId);
  if (cached) {
    applyResolvedData(cached, opts);
    setLoading(false);
    renderRelatedList();
    API.resolveBySeriesId(seriesId).catch(() => {});
    return;
  }

  setLoading(true);
  try {
    applyResolvedData(await API.resolveBySeriesId(seriesId), opts);
    renderRelatedList();
    setLoading(false);
  } catch (e) {
    setLoading(false);
    showSeriesError(`Failed: ${e.message}`, () => openAnikotoSeries(seriesId, opts));
  }
}

function renderSeries() {
  const a = state.currentAnime;
  if (!a) return;

  // Render backdrop image
  const bannerImg = a.bannerImage || a.poster || '';
  const bannerBg = document.getElementById('seriesBannerBg');
  if (bannerBg) {
    bannerBg.style.backgroundImage = bannerImg ? `url(${bannerImg})` : '';
  }

  // Populate Japanese subtitle
  const jnameEl = document.getElementById('seriesJName');
  if (jnameEl) {
    jnameEl.innerHTML = a.jname ? `<em>${esc(a.jname)}</em>` : '';
  }

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
    metaRow('Type', a.type || a.raw?.type || 'TV'),
    metaRow('Year', a.year),
    metaRow('Status', a.status),
    metaRow('Episodes', a.episodes || state.episodes.length),
    metaRow('Score', a.score ? `${a.score} / 10` : '—'),
    metaRow('Genres', (a.genres || []).slice(0, 4).join(', ') || '—'),
  ].join('');

  // Wire new detail actions
  const watchBtn = document.getElementById('detailWatchBtn');
  if (watchBtn) {
    watchBtn.onclick = () => {
      const activeEpRow = document.querySelector('.ep-row.active') || document.querySelector('.ep-row');
      if (activeEpRow) {
        activeEpRow.click();
      } else {
        const firstEp = state.episodes[0];
        if (firstEp) selectEpisode(firstEp.number);
      }
      document.getElementById('playerWrap')?.scrollIntoView({ behavior: 'smooth' });
    };
  }

  const bookmarkActBtn = document.getElementById('detailBookmarkBtn');
  if (bookmarkActBtn) {
    bookmarkActBtn.onclick = () => {
      toggleBookmarkCurrent();
    };
  }

  const shareBtn = document.getElementById('detailShareBtn');
  if (shareBtn) {
    shareBtn.onclick = () => {
      try {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'success');
      } catch (_) {
        showToast('Failed to copy link', 'error');
      }
    };
  }

  renderEpRangeSelect();
  renderEpisodeGrid();
  renderServerButtons();
  updateLangButtons();
  updateDownloadControls();
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
  const numbers = getEpisodeNumbers();
  const size = state.epRangeSize;
  if (!numbers.length || !els.epRange) return;
  if (!numbers.includes(state.epRangeStart)) alignEpRangeStart(state.currentEpisode);

  els.epRange.innerHTML = '';
  for (let i = 0; i < numbers.length; i += size) {
    const chunk = numbers.slice(i, i + size);
    const start = chunk[0];
    const end = chunk[chunk.length - 1];
    const opt = document.createElement('option');
    opt.value = String(start);
    opt.textContent = `${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}`;
    if (start === state.epRangeStart) opt.selected = true;
    els.epRange.appendChild(opt);
  }
}

function getVisibleEpisodes() {
  const numbers = getEpisodeNumbers();
  if (!numbers.length) return [];
  const startIdx = numbers.indexOf(state.epRangeStart);
  const from = startIdx >= 0 ? startIdx : 0;
  const slice = numbers.slice(from, from + state.epRangeSize);
  return slice
    .map((n) => state.episodes.find((e) => Number(e.number) === n))
    .filter(Boolean);
}

function updateDownloadControls() {
  const count = state.episodes.length;
  const isMovie = count <= 1;
  if (els.downloadEpBtn) {
    els.downloadEpBtn.innerHTML = isMovie
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download ep`;
  }
  if (els.downloadAllBtn) {
    els.downloadAllBtn.classList.toggle('hidden', isMovie);
    els.downloadAllBtn.textContent = count > 1 ? `Download all ${count} episodes` : 'Download all episodes';
  }
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
      <div class="ep-row episode-btn${active}" data-ep="${num}" role="button" tabindex="0">
        <span class="ep-num">${num}</span>
        <span class="ep-name">${esc(title)}</span>
        <button class="ep-download" type="button" data-dl-ep="${num}" aria-label="Download episode ${num}" title="Download">⬇</button>
        <span class="ep-play">▶</span>
      </div>`;
  }).join('');

  els.episodeGrid.querySelectorAll('.episode-btn').forEach((row) => {
    const play = () => playEpisode(parseInt(row.dataset.ep, 10), true);
    row.addEventListener('click', (e) => {
      if (e.target.closest('.ep-download')) return;
      play();
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        play();
      }
    });
  });

  els.episodeGrid.querySelectorAll('.ep-download').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      queueEpisodeDownload(parseInt(btn.dataset.dlEp, 10));
    });
  });

  const activeBtn = els.episodeGrid.querySelector('.episode-btn.active');
  const list = els.episodeGrid;
  if (activeBtn && list) {
    setTimeout(() => {
      const left = activeBtn.offsetLeft - list.clientWidth / 2 + activeBtn.offsetWidth / 2;
      list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }, 80);
  }
}

function getEpTitle(num) {
  return `Episode ${num}`;
}

function getPreferredStreamMethod(ep) {
  if (isMobileView()) {
    return API.pickDefaultStreamMethod(state.currentAnime, ep);
  }
  return state.streamMethod;
}

function renderServerButtons() {
  const ep = findEpisode(state.currentEpisode);
  if (isMobileView()) {
    if (els.subServers) els.subServers.innerHTML = '';
    if (els.dubServers) els.dubServers.innerHTML = '';
    return;
  }
  const methods = (API.STREAM_SERVERS || []).filter(
    (m) => !ep || API.canUseStreamMethod(m.id, state.currentAnime, ep),
  );

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
        state.streamIndex = 0;
        state.streamAttempt = 0;
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

  if ((method === 'embed' || method === 'embed-hd2') && ep.embedUrl && !ep.embedId) {
    if (typeof ep.embedUrl === 'string') return { url: ep.embedUrl, method };
    if (ep.embedUrl[lang]) return { url: ep.embedUrl[lang], method };
    if (ep.embedUrl.sub) return { url: ep.embedUrl.sub, method };
  }

  const url = API.buildStreamUrl({
    method,
    embedId: ep.embedId,
    malId: a.malId,
    aniId: a.aniId,
    episode: epNum,
    lang,
    zencloudId: ep.zencloudId,
  });
  if (url) return { url, method };
  return null;
}

function buildStreamChain(ep, lang, preferred) {
  if (!ep || !state.currentAnime) return [];
  const pref = preferred || getPreferredStreamMethod(ep);
  const methods = [...new Set([pref, ...(API.STREAM_METHOD_ORDER || [])])];
  const chain = [];
  const seen = new Set();

  for (const m of methods) {
    if ((m === 'vidnest' || m === 'vidnest-pahe') && lang === 'dub') {
      const hitDub = tryStreamMethod(m, ep, 'dub');
      if (hitDub?.url && !seen.has(hitDub.url)) {
        seen.add(hitDub.url);
        chain.push(hitDub);
      }
      const hitHindi = tryStreamMethod(m, ep, 'hindi');
      if (hitHindi?.url && !seen.has(hitHindi.url)) {
        seen.add(hitHindi.url);
        chain.push(hitHindi);
      }
    } else {
      const hit = tryStreamMethod(m, ep, lang);
      if (hit?.url && !seen.has(hit.url)) {
        seen.add(hit.url);
        chain.push(hit);
      }
    }
  }
  return chain;
}

function resolveStreamUrl(ep, lang, method) {
  const chain = buildStreamChain(ep, lang, method);
  return chain[0] || null;
}

function findEpisode(epNum) {
  const num = Number(epNum);
  // Only use the exact-match path — the [num-1] fallback assumed sorted 1-indexed
  // episodes which is not guaranteed and returned wrong episodes for multi-season anime.
  return state.episodes.find((e) => Number(e.number) === num) || null;
}

function clearStreamFailTimer() {
  if (state.streamLoadTimer) {
    clearTimeout(state.streamLoadTimer);
    state.streamLoadTimer = null;
  }
}

function stopPlayer() {
  clearStreamFailTimer();
  if (state._playTimer) {
    clearTimeout(state._playTimer);
    state._playTimer = null;
  }
  state.streamAttempt = 0;
  state.streamIndex = 0;
  const iframe = els.playerIframe;
  if (!iframe) return;
  iframe.onload = null;
  try {
    iframe.contentWindow?.stop?.();
  } catch (_) { /* cross-origin */ }
  iframe.src = 'about:blank';
  iframe.classList.add('hidden');
  els.playerPlaceholder?.classList.remove('hidden');
  setPlayerPlaceholder('Select an episode to play');
  document.documentElement.classList.remove('perf-streaming');
}

function loadPlayer(url) {
  clearStreamFailTimer();
  els.playerIframe.onload = null;
  els.playerPlaceholder.classList.remove('hidden');
  setPlayerPlaceholder('Loading…');
  els.playerIframe.classList.add('hidden');

  els.playerIframe.onload = () => {
    clearStreamFailTimer();
    els.playerIframe.classList.remove('hidden');
    els.playerPlaceholder.classList.add('hidden');
    els.playerIframe.onload = null;
  };
  els.playerIframe.src = url;
  
  state.streamLoadTimer = setTimeout(() => {
    if (els.playerIframe.classList.contains('hidden')) {
      switchToNextServer();
    }
  }, 7000);
}

function switchToNextServer() {
  clearStreamFailTimer();
  state.streamIndex += 1;
  state.streamAttempt += 1;

  if (state.streamIndex < state.streamChain.length) {
    const nextStream = state.streamChain[state.streamIndex];
    state.streamMethod = nextStream.method;
    setPlayerPlaceholder(`Server failed. Auto-switching to server ${state.streamIndex + 1}...`);
    renderServerButtons();
    updateLangButtons();
    loadPlayer(nextStream.url);
  } else {
    els.playerIframe.src = 'about:blank';
    els.playerIframe.classList.add('hidden');
    els.playerPlaceholder.classList.remove('hidden');
    setPlayerPlaceholder('All servers failed. Please click refresh at the top-right or try another episode.');
  }
}

function getHeaderHeight() {
  const header = document.querySelector('.site-header');
  const banner = document.getElementById('proxyBanner');
  let h = header?.offsetHeight || 72;
  if (banner && !banner.classList.contains('hidden')) h += banner.offsetHeight;
  return h;
}

function pinPlayerOnce() {
  if (state.playerScrolled || state.view !== 'series') return;
  state.playerScrolled = true;
  const target = els.playerWrap;
  if (!target) return;
  const offset = getHeaderHeight() + 8;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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

function refreshPlayer() {
  if (!state.currentEpisode || !findEpisode(state.currentEpisode)) return;
  state.streamAttempt = 0;
  playEpisode(state.currentEpisode, false);
}

function playEpisode(epNum, scrollToPlayerView = true) {
  const ep = findEpisode(epNum);
  if (!ep) return;

  state.currentEpisode = Number(ep.number);

  if (state.currentAnime) {
    updateHistory(`/watch/${createAnimeSlug(state.currentAnime)}?ep=${state.currentEpisode}`);
  }

  const prevRange = state.epRangeStart;
  alignEpRangeStart(state.currentEpisode);
  if (prevRange !== state.epRangeStart) renderEpRangeSelect();
  else if (els.epRange) els.epRange.value = String(state.epRangeStart);

  state.streamChain = buildStreamChain(ep, state.language, getPreferredStreamMethod(ep));
  if (state.streamAttempt === 0) {
    state.streamIndex = 0;
  }

  const stream = state.streamChain[state.streamIndex] || null;
  if (stream && !isMobileView()) state.streamMethod = stream.method;

  if (stream?.url) {
    if (scrollToPlayerView) {
      setTimeout(() => {
        loadPlayer(stream.url);
      }, 350);
    } else {
      loadPlayer(stream.url);
    }
  } else {
    els.playerIframe.onload = null;
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

  if (scrollToPlayerView) pinPlayerOnce();
}

function playAdjacent(dir) {
  const numbers = getEpisodeNumbers();
  const idx = numbers.indexOf(Number(state.currentEpisode));
  const nextNum = numbers[idx + dir];
  if (nextNum != null) playEpisode(nextNum, false);
}

function setLanguage(lang) {
  state.language = lang;
  if (els.epLangFilter && lang !== 'all') els.epLangFilter.value = lang;
  updateLangButtons();
  renderServerButtons();
  playEpisode(state.currentEpisode, false);
}

function updateLangButtons() {
  els.subBtn?.classList.toggle('active', state.language === 'sub');
  els.dubBtn?.classList.toggle('active', state.language === 'dub');
}

function updateNavButtons() {
  const numbers = getEpisodeNumbers();
  const idx = numbers.indexOf(Number(state.currentEpisode));
  if (els.prevEpBtn) els.prevEpBtn.disabled = idx <= 0;
  if (els.nextEpBtn) els.nextEpBtn.disabled = idx < 0 || idx >= numbers.length - 1;
}

function setLoading(on) {
  els.seriesInfo?.classList.toggle('hidden', on);
  $('#seriesLoading')?.classList.toggle('hidden', !on);

}

function showSeriesError(msg, retryFn) {
  if (!els.seriesError) return;
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
  if (view === 'home') updateHistory('/');
  els.pageRoot?.classList.toggle('series-mode', view === 'series');
  els.pageRoot?.classList.toggle('home-mode', view === 'home');

  if (view === 'home') {
    const sidebar = document.getElementById('floatingSidebar');
    if (sidebar) {
      document.body.classList.remove('sidebar-collapsed');
      sidebar.classList.remove('collapsed');
      localStorage.setItem('sidebar_state', 'expanded');
    }
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

  if (view === 'home' && state.view === 'series') {
    bumpNavigation();
    stopPlayer();
  }

  if (state.view === view) return;

  const prevEl = state.view === 'home' ? els.homeView : els.seriesView;
  const nextEl = view === 'home' ? els.homeView : els.seriesView;

  prevEl?.classList.add('view-leaving');
  setTimeout(() => {
    prevEl?.classList.add('hidden');
    prevEl?.classList.remove('view-leaving');
    nextEl?.classList.remove('hidden');
    if (view === 'series') requestAnimationFrame(() => pinPlayerOnce());
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

function parsePlayerMessage(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

function isEpisodeEnded(data) {
  if (!data) return false;
  if (data === 'ended') return true;
  if (data.event === 'ended' || data.event === 'complete') return true;
  if (data.type === 'ended') return true;
  if (data.type === 'PLAYER_EVENT' && data.data?.event === 'ended') return true;
  return false;
}

function onPlayerMessage(event) {
  if (!API.PLAYER_ORIGINS?.includes(event.origin)) return;
  if (!els.autoNext?.checked) return;
  const data = parsePlayerMessage(event.data);
  if (isEpisodeEnded(data)) playAdjacent(1);
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

function initSidebar() {
  const sidebar = document.getElementById('floatingSidebar');
  const collapseBtn = document.getElementById('sidebarCollapse');
  const triggerBtn = document.getElementById('sidebarTrigger');
  
  if (!sidebar) return;

  collapseBtn?.addEventListener('click', () => {
    document.body.classList.add('sidebar-collapsed');
    sidebar.classList.add('collapsed');
    localStorage.setItem('sidebar_state', 'collapsed');
  });

  triggerBtn?.addEventListener('click', () => {
    document.body.classList.remove('sidebar-collapsed');
    sidebar.classList.remove('collapsed');
    localStorage.setItem('sidebar_state', 'expanded');
  });

  const savedState = localStorage.getItem('sidebar_state');
  if (savedState === 'collapsed') {
    document.body.classList.add('sidebar-collapsed');
    sidebar.classList.add('collapsed');
  }

  sidebar.querySelectorAll('.sidebar-item').forEach((btn) => {
    if (btn.id === 'sidebarCollapse') return;
    
    btn.addEventListener('click', () => {
      sidebar.querySelectorAll('.sidebar-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      
      const target = btn.dataset.sidebar;
      if (target === 'home') {
        setHomeCategory('home');
        showView('home');
      } else if (target === 'search') {
        openMobileSearch();
      } else {
        showToast(`${target.charAt(0).toUpperCase() + target.slice(1)} features coming soon.`, 'info');
      }
    });
  });

  // Scroll listener to hide/show sidebar (throttled using requestAnimationFrame for smooth scrolling)
  let lastScrollTop = 0;
  const siteHeader = document.querySelector('.site-header');
  let scrollTicking = false;

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (siteHeader) {
          siteHeader.classList.toggle('scrolled', st > 20);
        }
        if (st > lastScrollTop && st > 100) {
          document.body.classList.add('sidebar-collapsed');
          sidebar.classList.add('collapsed');
        } else if (st < lastScrollTop) {
          document.body.classList.remove('sidebar-collapsed');
          sidebar.classList.remove('collapsed');
        }
        lastScrollTop = st <= 0 ? 0 : st;
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
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

// ─── PWA install prompt ───────────────────────────────────────────────────
let deferredInstallPrompt = null;
let installPopupTimer = null;
const INSTALL_DISMISS_KEY = 'animexplore:installDismissed';
const INSTALL_DISMISS_DAYS = 14;

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '')
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInstallDismissed() {
  try {
    const ts = parseInt(localStorage.getItem(INSTALL_DISMISS_KEY), 10);
    if (!ts) return false;
    return Date.now() - ts < INSTALL_DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

function dismissInstallPrompt() {
  els.installPrompt?.classList.add('hidden');
  document.body.classList.remove('install-prompt-open');
  try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
}

function showInstallPopup(mode = 'native') {
  if (!els.installPrompt || isAppInstalled() || isInstallDismissed()) return;

  const isIos = mode === 'ios' || (mode === 'auto' && isIosDevice());
  const hasNative = mode === 'native' && deferredInstallPrompt;

  if (mode === 'auto' && !isIos && !deferredInstallPrompt) return;

  els.installPromptIos?.classList.toggle('hidden', !isIos);
  if (els.installPromptDesc) {
    els.installPromptDesc.classList.toggle('hidden', isIos);
  }
  if (els.installPromptBtn) {
    if (isIos) {
      els.installPromptBtn.textContent = 'Got it';
    } else {
      els.installPromptBtn.textContent = 'Install App';
    }
  }

  els.installPrompt.classList.remove('hidden');
  document.body.classList.add('install-prompt-open');
}

function scheduleInstallPopup(mode = 'auto', delayMs = 3500) {
  if (installPopupTimer) clearTimeout(installPopupTimer);
  installPopupTimer = setTimeout(() => showInstallPopup(mode), delayMs);
}

async function onInstallClick() {
  if (isIosDevice() || !deferredInstallPrompt) {
    dismissInstallPrompt();
    return;
  }
  deferredInstallPrompt.prompt();
  try {
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') dismissInstallPrompt();
  } catch { /* ignore */ }
  deferredInstallPrompt = null;
}

function initInstallPrompt() {
  if (isAppInstalled() || isInstallDismissed()) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.documentElement.classList.add('pwa-installable');
    scheduleInstallPopup('native', 2500);
  });

  window.addEventListener('appinstalled', dismissInstallPrompt);

  els.installPromptClose?.addEventListener('click', dismissInstallPrompt);
  els.installPromptLater?.addEventListener('click', dismissInstallPrompt);
  els.installPromptBtn?.addEventListener('click', onInstallClick);

  els.installPrompt?.addEventListener('click', (e) => {
    if (e.target === els.installPrompt) dismissInstallPrompt();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.installPrompt?.classList.contains('hidden')) {
      dismissInstallPrompt();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      els.searchInput?.focus();
    }
  });



  if (isMobileView() && isIosDevice()) {
    scheduleInstallPopup('ios', 4000);
  }
  initProtection();
}

function initProtection() {
  const prevent = (e) => e.preventDefault();
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('selectstart', prevent);
  document.addEventListener('dragstart', prevent);
  ['copy', 'cut', 'paste'].forEach((event) => document.addEventListener(event, prevent));

  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') ||
      (e.ctrlKey && e.shiftKey && ['I', 'C', 'J', 'K', 'U'].includes(e.key)) ||
      (e.metaKey && e.altKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
      (e.metaKey && e.shiftKey && ['c', 'i'].includes(e.key.toLowerCase()))
    ) {
      e.preventDefault();
    }
  });

  // DevTools window size detection disabled to allow usage in tab
}

// --- URL Routing ---
state.isPoppingState = false;

function createAnimeSlug(anime) {
  if (!anime) return '';
  const title = anime.title || anime.name || 'anime';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${slug}-${anime.malId}`;
}

function updateHistory(path, replace = false) {
  if (state.isPoppingState) return;
  if (window.location.pathname + window.location.search === path) return;
  if (replace) {
    history.replaceState(null, '', path);
  } else {
    history.pushState(null, '', path);
  }
}

function handleRouting() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  state.isPoppingState = true;
  
  if (path === '/') {
    showView('home');
  } else if (path.startsWith('/watch/')) {
    const parts = path.split('/')[2].split('-');
    const malId = parseInt(parts[parts.length - 1], 10);
    const ep = parseInt(params.get('ep') || '1', 10);
    if (!isNaN(malId)) {
      openSearchResult({ malId }, { autoPlayEp: ep });
    } else {
      showView('home');
    }
  } else {
    const parts = path.substring(1).split('-');
    const malId = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(malId)) {
      openSearchResult({ malId });
    } else {
      showView('home');
    }
  }
  
  setTimeout(() => { state.isPoppingState = false; }, 50);
}

window.addEventListener('popstate', handleRouting);
// -------------------

document.addEventListener('DOMContentLoaded', init);
