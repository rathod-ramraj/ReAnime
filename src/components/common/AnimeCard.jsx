import React from 'react';
import { RatingCircle } from './RatingCircle';
import { API } from '../../services/api';
import { useApp } from '../../context/AppContext';

export function AnimeCard({ anime, index = 0, extraClass = '', onDelete }) {
  const { openAnime } = useApp();
  if (!anime) return null;

  const typeAndYear = [anime.type || anime.raw?.type || 'TV', anime.year].filter(Boolean).join(' · ');
  const posterSrc = API.posterUrl(anime.poster);

  const handleMouseEnter = () => {
    if (anime.malId) API.prefetchResolve(anime.malId);
  };

  const handleClick = () => {
    openAnime(anime);
  };

  return (
    <article
      className={`category-card${extraClass ? ` ${extraClass}` : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      data-mal={anime.malId || ''}
      data-series={anime.seriesId || ''}
      data-idx={index}
    >
      <div className="category-poster">
        <img
          src={posterSrc || '/logo.png'}
          alt={anime.title || 'Anime poster'}
          loading="lazy"
          onError={(e) => {
            if (e.target.dataset.fallbackApplied) return;
            e.target.dataset.fallbackApplied = 'true';
            e.target.src = anime.poster || '/logo.png';
          }}
        />
        <RatingCircle rawScore={anime.score} />
        {onDelete && (
          <button
            type="button"
            className="continue-item-delete history-card-delete-btn"
            aria-label="Remove from history"
            title="Remove from history"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="category-info">
        <h3>{anime.title}</h3>
        <p>{typeAndYear}</p>
      </div>
    </article>
  );
}
