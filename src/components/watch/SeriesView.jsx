import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { API } from '../../services/api';
import { UserStore } from '../../services/storage';
import { Titles } from '../../services/titles';
import { AnimeCard } from '../common/AnimeCard';

export function SeriesView() {
  const {
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
    changeEpisode,
    changeServer,
    changeLang,
    openAnime,
    handleToggleBookmark,
    showToast,
  } = useApp();

  const [mobileInfoOpen, setMobileInfoOpen] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [epFilter, setEpFilter] = useState('all');
  const [epRangeIndex, setEpRangeIndex] = useState(0);
  const [epSearch, setEpSearch] = useState('');
  const [relatedItems, setRelatedItems] = useState([]);
  const [franchiseItems, setFranchiseItems] = useState([]);
  const playerWrapRef = useRef(null);

  const anime = currentAnime;

  // Load franchise / relations & related anime
  useEffect(() => {
    if (!anime?.malId) return;
    API.getAnimeRelations(anime.malId)
      .then((rels) => {
        const flattened = [];
        rels.forEach((group) => {
          (group.entry || []).forEach((e) => {
            if (e.type === 'anime') {
              flattened.push({
                ...e,
                relation: group.relation,
              });
            }
          });
        });
        setFranchiseItems(flattened);
      })
      .catch(() => setFranchiseItems([]));

    API.getRecentAnime(1, 10)
      .then((res) => {
        const list = (res.items || []).map((i) => API.normalizeAnikotoAnime(i));
        setRelatedItems(list);
      })
      .catch(() => setRelatedItems([]));
  }, [anime?.malId]);

  if (seriesLoading) {
    return (
      <div className="series-loading-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" />
          <span>Loading anime & streaming servers…</span>
        </div>
      </div>
    );
  }

  if (seriesError || !anime) {
    return (
      <div className="container-max" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="error-banner" style={{ display: 'inline-block', padding: '16px 24px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {seriesError || 'Anime not found'}
        </div>
      </div>
    );
  }

  const isBookmarked = UserStore.isBookmarked(anime.malId || anime.seriesId || anime.id);
  const bannerUrl = anime.banner || anime.bannerImage || anime.poster || '';
  const metaLine = Titles.heroMetaLine(anime);

  // Pagination for episodes
  const rangeSize = 100;
  const totalEpisodes = episodes.length;
  const numRanges = Math.ceil(totalEpisodes / rangeSize) || 1;
  const rangeStart = epRangeIndex * rangeSize;
  const rangeEnd = Math.min(rangeStart + rangeSize, totalEpisodes);
  const visibleEpisodes = episodes.slice(rangeStart, rangeEnd);

  // Filtered by search number if entered
  const filteredEpisodes = epSearch.trim()
    ? episodes.filter((e) => String(e.number).includes(epSearch.trim()))
    : visibleEpisodes;

  const handlePrevEp = () => {
    const curIdx = episodes.findIndex((e) => Number(e.number) === Number(currentEpisode));
    if (curIdx > 0) {
      changeEpisode(episodes[curIdx - 1].number);
    }
  };

  const handleNextEp = () => {
    const curIdx = episodes.findIndex((e) => Number(e.number) === Number(currentEpisode));
    if (curIdx >= 0 && curIdx < episodes.length - 1) {
      changeEpisode(episodes[curIdx + 1].number);
    }
  };

  const scrollToPlayer = () => {
    playerWrapRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: anime.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  return (
    <section id="seriesView" className="view" aria-label="Anime watch and details">
      <div
        className="series-banner-bg"
        id="seriesBannerBg"
        style={{ backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined }}
      />

      <div id="seriesInfo">
        {/* Detail Panel */}
        <div className={`detail-panel glass-card${!mobileInfoOpen ? ' mobile-collapsed' : ''}`} id="detailPanel">
          <button
            type="button"
            className="mobile-info-toggle"
            id="mobileInfoToggle"
            onClick={() => setMobileInfoOpen(!mobileInfoOpen)}
          >
            {mobileInfoOpen ? 'Hide anime info ▴' : 'Show anime info ▾'}
          </button>

          <div className="detail-main">
            <div className="detail-poster" id="seriesPoster">
              <img src={anime.poster || '/logo.png'} alt={anime.title} referrerPolicy="no-referrer" />
            </div>

            <div className="detail-body">
              <div className="detail-title-row">
                <div className="title-meta-wrap">
                  <h1 id="seriesTitle">{anime.title}</h1>
                  {anime.altTitle && <h2 id="seriesJName" className="series-jname">{anime.altTitle}</h2>}
                </div>
                <button
                  type="button"
                  className="btn-bookmark"
                  onClick={() => handleToggleBookmark(anime)}
                  style={{ color: isBookmarked ? 'var(--highlight)' : '#fff' }}
                  title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                >
                  {isBookmarked ? '★' : '☆'}
                </button>
              </div>

              <div className="detail-tags" id="seriesBadges">
                {anime.rating && <span className="tag-badge rating">{anime.rating}</span>}
                {anime.score && <span className="tag-badge score">★ {anime.score}</span>}
                {anime.type && <span className="tag-badge type">{anime.type}</span>}
                {anime.year && <span className="tag-badge year">{anime.year}</span>}
                {anime.status && <span className="tag-badge status">{anime.status}</span>}
              </div>

              <p className={`detail-desc${descExpanded ? ' expanded' : ''}`} id="seriesDesc">
                {anime.description || 'No description available.'}
              </p>
              {anime.description && anime.description.length > 220 && (
                <button type="button" className="read-more" onClick={() => setDescExpanded(!descExpanded)}>
                  {descExpanded ? 'Read less' : 'Read more'}
                </button>
              )}

              <div className="detail-actions">
                <button type="button" className="btn-primary btn-watch" onClick={scrollToPlayer}>
                  Watch Now
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-bookmark-act"
                  onClick={() => handleToggleBookmark(anime)}
                >
                  {isBookmarked ? 'In Your List' : 'Add to List'}
                </button>
                <button type="button" className="btn-secondary btn-share" onClick={handleShare}>
                  Share
                </button>
              </div>

              <div className="meta-grid" id="metaGrid">
                <div className="meta-item"><span className="meta-label">Type:</span> <span>{anime.type || 'TV'}</span></div>
                <div className="meta-item"><span className="meta-label">Episodes:</span> <span>{anime.episodes || episodes.length || '—'}</span></div>
                <div className="meta-item"><span className="meta-label">Status:</span> <span>{anime.status || '—'}</span></div>
                <div className="meta-item"><span className="meta-label">Genres:</span> <span>{(anime.genres || []).join(', ') || '—'}</span></div>
                <div className="meta-item"><span className="meta-label">Year:</span> <span>{anime.year || '—'}</span></div>
                <div className="meta-item"><span className="meta-label">Score:</span> <span>{anime.score ? `${anime.score} / 10` : '—'}</span></div>
              </div>
            </div>

            <div className="rating-card" id="ratingCard">
              <div className="rating-score">{anime.score ? Number(anime.score).toFixed(1) : '—'}</div>
              <div className="rating-stars" style={{ color: 'var(--highlight)' }}>
                {'★'.repeat(Math.round((Number(anime.score || 0) / 10) * 5))}
              </div>
              <p className="rating-hint">Community Score</p>
            </div>
          </div>

          {/* Franchise Section */}
          {franchiseItems.length > 0 && (
            <div className="franchise-section" id="franchiseSection">
              <h3 className="franchise-heading s-label">Seasons &amp; Movies</h3>
              <div className="franchise-scroll">
                <div className="franchise-track">
                  {franchiseItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="franchise-card"
                      onClick={() => openAnime({ malId: item.mal_id, title: item.name })}
                    >
                      <span className="franchise-rel">{Titles.franchiseBadge(item.relation, item.type)}</span>
                      <span className="franchise-title">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Watch Zone */}
        <div ref={playerWrapRef} className="watch-zone glass-panel" id="playerWrap">
          <div className="player-sticky">
            <div className="mobile-watch-bar" id="mobileWatchBar">
              <div className="mobile-watch-text">
                <p className="mobile-watch-title">{anime.title}</p>
                <p className="mobile-watch-ep">Episode {currentEpisode || 1}</p>
              </div>
            </div>

            <div className="player-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>If the video is not playing, click the refresh button at the top-right of the player or try changing the server below.</span>
            </div>

            <div className="player-screen">
              <button
                type="button"
                className="player-refresh-btn"
                title="Refresh player"
                onClick={() => {
                  if (currentEpisode) changeEpisode(currentEpisode);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
              </button>

              {playerIframeSrc ? (
                <iframe
                  id="playerIframe"
                  src={playerIframeSrc}
                  allowFullScreen
                  scrolling="no"
                  allow="autoplay; fullscreen; picture-in-picture"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Video Player"
                />
              ) : (
                <div className="player-placeholder" onClick={() => changeEpisode(episodes[0]?.number || 1)}>
                  <span className="player-placeholder-icon">▶</span>
                  Select an episode below to start watching
                </div>
              )}
            </div>
          </div>

          <div className="player-controls">
            <div className="player-toolbar">
              <div className="toolbar-left">
                <button type="button" className="tool-btn" onClick={handlePrevEp} title="Previous">◀ Prev</button>
                <button type="button" className="tool-btn" onClick={handleNextEp} title="Next">Next ▶</button>
                <label className="tool-check">
                  <input
                    type="checkbox"
                    checked={autoNext}
                    onChange={(e) => setAutoNext(e.target.checked)}
                  />
                  Auto Next
                </label>
              </div>

              <div className="toolbar-right">
                <button
                  type="button"
                  className={`tool-btn${streamLang === 'sub' ? ' active' : ''}`}
                  onClick={() => changeLang('sub')}
                >
                  SUB
                </button>
                <button
                  type="button"
                  className={`tool-btn${streamLang === 'dub' ? ' active' : ''}`}
                  onClick={() => changeLang('dub')}
                >
                  DUB
                </button>
              </div>
            </div>

            <div className="server-panel">
              <div className="watching-msg">You're watching Episode {currentEpisode || 1}</div>
              <div className="server-groups">
                <div className="server-group">
                  <span className="server-label">{streamLang.toUpperCase()}</span>
                  <div className="server-btns">
                    {API.STREAM_SERVERS.map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        className={`server-btn${streamMethod === srv.id ? ' active' : ''}`}
                        onClick={() => changeServer(srv.id)}
                      >
                        {srv.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Episode List */}
          <div className="episodes-panel glass-panel">
            <div className="episodes-toolbar">
              {numRanges > 1 && (
                <select
                  className="ep-select"
                  value={epRangeIndex}
                  onChange={(e) => setEpRangeIndex(Number(e.target.value))}
                >
                  {Array.from({ length: numRanges }).map((_, rIdx) => {
                    const start = rIdx * rangeSize + 1;
                    const end = Math.min((rIdx + 1) * rangeSize, totalEpisodes);
                    return (
                      <option key={rIdx} value={rIdx}>
                        EPS: {start}-{end}
                      </option>
                    );
                  })}
                </select>
              )}
              <input
                type="number"
                className="ep-find"
                placeholder="Find number"
                min="1"
                max={totalEpisodes}
                value={epSearch}
                onChange={(e) => setEpSearch(e.target.value)}
              />
            </div>

            <div id="episodeGrid" className="episode-list">
              {filteredEpisodes.map((ep) => {
                const num = Number(ep.number);
                const isActive = num === Number(currentEpisode);
                const title = ep.title && ep.title !== `Episode ${num}` ? ep.title : `Episode ${num}`;
                return (
                  <button
                    key={num}
                    type="button"
                    className={`ep-row episode-btn${isActive ? ' active' : ''}`}
                    onClick={() => changeEpisode(num)}
                    title={title}
                  >
                    <span className="ep-num">{num}</span>
                    <span className="ep-name">{title}</span>
                    <span className="ep-play">▶</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Related Section */}
        {relatedItems.length > 0 && (
          <div id="relatedSection" className="home-section container-max reveal-up" style={{ marginTop: '40px' }}>
            <h2 className="section-title">Related &amp; Recent Anime</h2>
            <div className="category-grid">
              {relatedItems.slice(0, 8).map((rel, i) => (
                <AnimeCard key={rel.seriesId || rel.malId || i} anime={rel} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
