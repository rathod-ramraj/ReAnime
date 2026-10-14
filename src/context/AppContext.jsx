import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API } from '../services/api';
import { UserStore } from '../services/storage';
import { SEO } from '../services/seo';
import { initDesign } from '../services/design';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [view, setView] = useState('home'); // 'home' | 'series'
  const [homeCategory, setHomeCategory] = useState('home'); // 'home' | 'movies' | 'tv' | 'popular' | 'airing' | 'library'
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Watch state
  const [currentAnime, setCurrentAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [streamMethod, setStreamMethod] = useState('mal');
  const [streamLang, setStreamLang] = useState('sub');
  const [autoNext, setAutoNext] = useState(true);
  const [playerIframeSrc, setPlayerIframeSrc] = useState('');
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState('');
  const [mobileInfoExpanded, setMobileInfoExpanded] = useState(false);

  // Home feeds
  const [spotlightItems, setSpotlightItems] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);
  const [categoryItems, setCategoryItems] = useState([]);
  const [airingItems, setAiringItems] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);

  // User store
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Load init
  useEffect(() => {
    initDesign();
    setBookmarks(UserStore.getBookmarks());
    setHistory(UserStore.getHistory());
    setContinueWatching(UserStore.getContinueWatching());

    const savedSettings = UserStore.getSettings();
    if (savedSettings?.autoNext !== undefined) setAutoNext(savedSettings.autoNext);
    if (savedSettings?.defaultLang) setStreamLang(savedSettings.defaultLang);

    window.__onHomeFeedUpdate = (feed) => {
      if (feed?.spotlight?.length) setSpotlightItems(feed.spotlight);
      if (feed?.trending?.length) setTrendingItems(feed.trending);
    };
    window.__onTrendingUpdate = (data) => {
      if (data?.items?.length) setTrendingItems(data.items);
    };

    // Initial home feed
    loadHomeData();

    return () => {
      delete window.__onHomeFeedUpdate;
      delete window.__onTrendingUpdate;
    };
  }, []);

  const loadHomeData = async () => {
    setHomeLoading(true);
    try {
      const [feed, trendingRes, airingRes, popularRes, compRes] = await Promise.all([
        API.getHomeFeed().catch(() => ({ spotlight: [], trending: [] })),
        API.getTrending(10).catch(() => ({ items: [] })),
        API.getBrowse('airing', 1).catch(() => ({ items: [] })),
        API.getBrowse('popular', 1).catch(() => ({ items: [] })),
        API.getBrowse('completed', 1).catch(() => ({ items: [] })),
      ]);

      if (feed?.spotlight?.length) {
        setSpotlightItems(feed.spotlight);
      }

      const trending = (feed?.trending?.length) ? feed.trending : (trendingRes?.items || []);
      if (trending.length) {
        setTrendingItems(trending);
      }

      setAiringItems(airingRes?.items || []);
      setPopularItems(popularRes?.items || []);
      setCompletedItems(compRes?.items || []);
    } catch (e) {
      console.error('Home load error:', e);
    } finally {
      setHomeLoading(false);
    }
  };

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const refreshUserData = useCallback(() => {
    setBookmarks(UserStore.getBookmarks());
    setHistory(UserStore.getHistory());
    setContinueWatching(UserStore.getContinueWatching());
  }, []);

  const handleToggleBookmark = useCallback((anime) => {
    const added = UserStore.toggleBookmark(anime);
    refreshUserData();
    showToast(added ? 'Added to your Bookmarks' : 'Removed from Bookmarks', added ? 'success' : 'info');
    return added;
  }, [refreshUserData, showToast]);

  const handleRemoveHistory = useCallback((id) => {
    UserStore.removeHistory(id);
    refreshUserData();
  }, [refreshUserData]);

  // Navigate to Home
  const goHome = useCallback(() => {
    setView('home');
    setHomeCategory('home');
    setSearchMode(false);
    SEO.resetTitle();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Navigate to a Category
  const openCategory = useCallback(async (cat) => {
    setView('home');
    setHomeCategory(cat);
    setSearchMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (cat === 'home') return;
    if (cat === 'library') {
      refreshUserData();
      return;
    }

    try {
      const res = await API.getBrowse(cat, 1);
      setCategoryItems(res.items || []);
    } catch (err) {
      console.error('Category load error:', err);
    }
  }, [refreshUserData]);

  // Execute full search
  const runFullSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return;
    const q = query.trim();
    setSearchLoading(true);
    setSearchQuery(q);
    setSearchMode(true);
    setView('home');
    setSearchOpen(false);
    setMobileSearchOpen(false);

    try {
      const res = await API.searchAnime(q, 1);
      const items = (res.items || []).map((i) => API.normalizeJikanAnime(i));
      setSearchResults(items);
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Open anime watch/detail view
  const openAnime = useCallback(async (animeRef, targetEpisode = null) => {
    if (!animeRef) return;
    setSeriesLoading(true);
    setSeriesError('');
    setView('series');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      let resolved = null;
      if (animeRef.malId) {
        resolved = await API.resolveByMalId(animeRef.malId);
      } else if (animeRef.seriesId) {
        resolved = await API.resolveBySeriesId(animeRef.seriesId);
      }

      if (!resolved || (!resolved.anime && !resolved.episodes)) {
        throw new Error('Could not resolve streaming metadata');
      }

      const applied = API.applyResolveResult(resolved);
      const finalAnime = applied.anime || API.normalizeJikanAnime(animeRef);
      const finalEpisodes = applied.episodes?.length
        ? applied.episodes
        : API.buildEpisodesFromCount(finalAnime.episodes || 12);

      setCurrentAnime(finalAnime);
      setEpisodes(finalEpisodes);

      const chosenEp = targetEpisode || finalEpisodes[0]?.number || 1;
      setCurrentEpisode(chosenEp);

      const pickedMethod = API.pickDefaultStreamMethod(finalAnime, finalEpisodes.find((e) => e.number === chosenEp) || finalEpisodes[0]);
      setStreamMethod(pickedMethod);

      // Play stream
      playEpisodeStream(finalAnime, finalEpisodes, chosenEp, pickedMethod, streamLang);

      SEO.setTitle(finalAnime.title, chosenEp);
    } catch (err) {
      console.error('Error opening anime:', err);
      setSeriesError(err.message || 'Failed to load anime');
    } finally {
      setSeriesLoading(false);
    }
  }, [streamLang]);

  const playEpisodeStream = useCallback((anime, epList, epNum, method, lang) => {
    if (!anime) return;
    const epObj = (epList || []).find((e) => Number(e.number) === Number(epNum)) || { number: epNum };
    const src = API.buildStreamUrl({
      method: method || 'mal',
      embedId: epObj.embedId,
      malId: anime.malId,
      aniId: anime.aniId,
      episode: epNum,
      lang: lang || 'sub',
      zencloudId: epObj.zencloudId,
    });

    if (src) {
      setPlayerIframeSrc(src);
      // Record history
      UserStore.addHistory({
        id: String(anime.malId || anime.seriesId || anime.id),
        malId: anime.malId || null,
        seriesId: anime.seriesId || null,
        title: anime.title,
        poster: anime.poster,
        backdrop: anime.backdrop || anime.banner || anime.poster || null,
        banner: anime.banner || anime.backdrop || null,
        type: anime.type || 'tv',
        episode: epNum,
        progress: anime.progress || 10,
        currentTime: anime.currentTime || 150,
        duration: anime.duration || 1440,
      });
      refreshUserData();
    }
  }, [refreshUserData]);

  const changeEpisode = useCallback((epNum) => {
    if (!currentAnime || !episodes.length) return;
    setCurrentEpisode(epNum);
    playEpisodeStream(currentAnime, episodes, epNum, streamMethod, streamLang);
    SEO.setTitle(currentAnime.title, epNum);
  }, [currentAnime, episodes, streamMethod, streamLang, playEpisodeStream]);

  const changeServer = useCallback((newMethod) => {
    setStreamMethod(newMethod);
    if (currentAnime && currentEpisode) {
      playEpisodeStream(currentAnime, episodes, currentEpisode, newMethod, streamLang);
    }
  }, [currentAnime, episodes, currentEpisode, streamLang, playEpisodeStream]);

  const changeLang = useCallback((newLang) => {
    setStreamLang(newLang);
    UserStore.updateSettings({ defaultLang: newLang });
    if (currentAnime && currentEpisode) {
      playEpisodeStream(currentAnime, episodes, currentEpisode, streamMethod, newLang);
    }
  }, [currentAnime, episodes, currentEpisode, streamMethod, playEpisodeStream]);

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        homeCategory,
        setHomeCategory,
        searchMode,
        setSearchMode,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        searchLoading,
        searchOpen,
        setSearchOpen,
        mobileSearchOpen,
        setMobileSearchOpen,

        // Watch state
        currentAnime,
        episodes,
        currentEpisode,
        streamMethod,
        streamLang,
        autoNext,
        setAutoNext,
        playerIframeSrc,
        seriesLoading,
        seriesError,
        mobileInfoExpanded,
        setMobileInfoExpanded,

        // Home feeds
        spotlightItems,
        trendingItems,
        categoryItems,
        airingItems,
        popularItems,
        completedItems,
        homeLoading,

        // User Data
        bookmarks,
        history,
        continueWatching,
        handleToggleBookmark,
        handleRemoveHistory,
        refreshUserData,

        // UI
        sidebarCollapsed,
        setSidebarCollapsed,
        notifyOpen,
        setNotifyOpen,
        toasts,
        showToast,

        // Navigation Actions
        goHome,
        openCategory,
        runFullSearch,
        openAnime,
        changeEpisode,
        changeServer,
        changeLang,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
