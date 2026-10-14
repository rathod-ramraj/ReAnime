import React from 'react';
import { useApp } from '../../context/AppContext';

export function MobileBottomNav() {
  const { view, homeCategory, goHome, openCategory, setMobileSearchOpen } = useApp();

  const isHome = view === 'home' && homeCategory === 'home';
  const isBrowse = view === 'home' && ['movies', 'tv', 'popular', 'airing'].includes(homeCategory);
  const isLibrary = view === 'home' && homeCategory === 'library';

  return (
    <nav className="mobile-bottom-nav" id="mobileNav" aria-label="Mobile navigation">
      <button
        type="button"
        className={`mob-nav-item${isHome ? ' active' : ''}`}
        onClick={goHome}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Home</span>
      </button>

      <button
        type="button"
        className="mob-nav-item"
        onClick={() => setMobileSearchOpen(true)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span>Search</span>
      </button>

      <button
        type="button"
        className={`mob-nav-item${isBrowse ? ' active' : ''}`}
        onClick={() => openCategory('popular')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        <span>Browse</span>
      </button>

      <button
        type="button"
        className={`mob-nav-item${isLibrary ? ' active' : ''}`}
        onClick={() => openCategory('library')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span>Library</span>
      </button>
    </nav>
  );
}
