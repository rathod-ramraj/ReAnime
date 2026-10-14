import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { API } from '../../services/api';
import { Titles } from '../../services/titles';

export function Header() {
  const { goHome, runFullSearch, openAnime, setNotifyOpen, notifyOpen } = useApp();
  const [query, setQuery] = useState('');
  const [dropdownResults, setDropdownResults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const searchWrapRef = useRef(null);

  // Global shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside search wrap closes dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setDropdownResults([]);
      setDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await API.searchAnime(query.trim(), 1);
        const items = (res.items || []).slice(0, 7).map((i) => API.normalizeJikanAnime(i));
        setDropdownResults(items);
        setDropdownOpen(items.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        setDropdownResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && dropdownResults[selectedIndex]) {
        openAnime(dropdownResults[selectedIndex]);
        setDropdownOpen(false);
      } else if (query.trim()) {
        runFullSearch(query.trim());
        setDropdownOpen(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (dropdownResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % dropdownResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (dropdownResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + dropdownResults.length) % dropdownResults.length);
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  return (
    <header className="site-header" role="banner">
      <div className="header-inner">
        <div className="header-left">
          <a href="#" className="brand" onClick={(e) => { e.preventDefault(); goHome(); }} aria-label="ReAnime Home">
            <img src="/logo.png" alt="ReAnime" width="180" height="50" />
          </a>

          <div className="search-wrap" id="headerSearch" ref={searchWrapRef}>
            <svg
              className="search-icon"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              id="searchInput"
              className="search-input"
              placeholder="Search anime... (press '/' to focus)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (dropdownResults.length > 0) setDropdownOpen(true); }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />

            {dropdownOpen && (
              <div id="searchDropdown" className="search-dropdown">
                {dropdownResults.map((anime, i) => {
                  const meta = Titles.searchMetaLine(anime);
                  return (
                    <div
                      key={anime.malId || anime.seriesId || i}
                      className={`search-item${i === selectedIndex ? ' active' : ''}`}
                      onClick={() => {
                        openAnime(anime);
                        setDropdownOpen(false);
                      }}
                      onMouseEnter={() => {
                        setSelectedIndex(i);
                        if (anime.malId) API.prefetchResolve(anime.malId);
                      }}
                    >
                      <img src={anime.poster || '/logo.png'} alt="" loading="lazy" />
                      <div>
                        <div className="search-item-title">{anime.title}</div>
                        <div className="search-item-meta">{meta}</div>
                      </div>
                    </div>
                  );
                })}
                <div
                  className="search-dropdown-view-all"
                  onClick={() => {
                    runFullSearch(query);
                    setDropdownOpen(false);
                  }}
                  style={{ padding: '10px 14px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: 'var(--highlight)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  View all results for "{query}" →
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="notify-btn"
            onClick={() => setNotifyOpen(!notifyOpen)}
            aria-label="Notifications"
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
