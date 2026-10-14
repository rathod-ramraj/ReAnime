import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { API } from '../../services/api';
import { Titles } from '../../services/titles';

export function MobileSearchSheet() {
  const { mobileSearchOpen, setMobileSearchOpen, runFullSearch, openAnime } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      document.body.classList.add('search-sheet-open');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.classList.remove('search-sheet-open');
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await API.searchAnime(query.trim(), 1);
        const items = (res.items || []).map((i) => API.normalizeJikanAnime(i));
        setResults(items);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!mobileSearchOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      runFullSearch(query.trim());
      setMobileSearchOpen(false);
    }
  };

  return (
    <div id="mobileSearchSheet" className="mobile-search-sheet" role="dialog" aria-label="Search anime">
      <div className="mobile-search-head">
        <div className="mobile-search-field">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            id="mobileSearchInput"
            className="mobile-search-input"
            placeholder="Search anime…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className="mobile-search-cancel"
          onClick={() => setMobileSearchOpen(false)}
        >
          Cancel
        </button>
      </div>

      <div id="mobileSearchResults" className="mobile-search-results">
        {loading && <p className="mobile-search-empty">Searching anime…</p>}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="mobile-search-empty">No results found</p>
        )}
        {!loading && query.trim().length < 2 && (
          <p className="mobile-search-empty">Type to search anime…</p>
        )}
        {!loading && results.map((anime, i) => {
          const meta = Titles.searchMetaLine(anime);
          return (
            <button
              key={anime.malId || anime.seriesId || i}
              type="button"
              className="search-item mobile-search-item"
              onClick={() => {
                openAnime(anime);
                setMobileSearchOpen(false);
              }}
            >
              <img src={anime.poster || '/logo.png'} alt="" loading="lazy" />
              <div>
                <div className="search-item-title">{anime.title}</div>
                <div className="search-item-meta">{meta}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
