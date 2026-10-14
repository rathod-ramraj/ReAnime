import React from 'react';
import { useApp } from '../../context/AppContext';

export function MobileBrowseBar() {
  const { homeCategory, openCategory } = useApp();

  return (
    <nav className="mobile-browse-bar container-max" id="mobileBrowseBar" aria-label="Quick browse">
      <button
        type="button"
        className={`mob-chip nav-cat${homeCategory === 'movies' ? ' active' : ''}`}
        onClick={() => openCategory('movies')}
      >
        Movies
      </button>
      <button
        type="button"
        className={`mob-chip nav-cat${homeCategory === 'tv' ? ' active' : ''}`}
        onClick={() => openCategory('tv')}
      >
        TV Series
      </button>
      <button
        type="button"
        className={`mob-chip nav-cat${homeCategory === 'popular' ? ' active' : ''}`}
        onClick={() => openCategory('popular')}
      >
        Popular
      </button>
      <button
        type="button"
        className={`mob-chip nav-cat${homeCategory === 'airing' ? ' active' : ''}`}
        onClick={() => openCategory('airing')}
      >
        Top Airing
      </button>
    </nav>
  );
}
