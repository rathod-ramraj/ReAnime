import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export function FloatingSidebar() {
  const { view, homeCategory, goHome, openCategory, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const isHomeActive = view === 'home' && homeCategory === 'home';
  const isBrowseActive = view === 'home' && ['movies', 'tv', 'popular', 'airing'].includes(homeCategory);
  const isLibraryActive = view === 'home' && homeCategory === 'library';

  return (
    <>
      <button
        className="sidebar-trigger"
        id="sidebarTrigger"
        aria-label="Expand Menu"
        onClick={() => setMobileExpanded(!mobileExpanded)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <aside className={`floating-sidebar${sidebarCollapsed ? ' collapsed' : ''}${mobileExpanded ? ' active' : ''}`} id="floatingSidebar">
        {/* Home */}
        <button
          className={`sidebar-item${isHomeActive ? ' active' : ''}`}
          onClick={goHome}
          aria-label="Home"
        >
          <svg className="sidebar-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="sidebar-tooltip">Home</span>
        </button>

        {/* Browse */}
        <button
          className={`sidebar-item${isBrowseActive ? ' active' : ''}`}
          onClick={() => openCategory('popular')}
          aria-label="Browse"
        >
          <svg className="sidebar-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span className="sidebar-tooltip">Browse</span>
        </button>

        {/* Library */}
        <button
          className={`sidebar-item${isLibraryActive ? ' active' : ''}`}
          onClick={() => openCategory('library')}
          aria-label="Library"
        >
          <svg className="sidebar-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="sidebar-tooltip">Library</span>
        </button>

        <div className="sidebar-divider" />

        {/* Community */}
        <a
          href="https://t.me/meme_adda_098"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-item"
          aria-label="Community"
        >
          <svg className="sidebar-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="sidebar-tooltip">Community</span>
        </a>

        {/* Collapse toggle */}
        <button
          className="sidebar-item sidebar-collapse"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label="Collapse Menu"
        >
          <svg className="sidebar-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="sidebar-tooltip">Collapse Menu</span>
        </button>
      </aside>
    </>
  );
}
