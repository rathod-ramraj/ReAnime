import React from 'react';
import { useApp } from '../../context/AppContext';
import { AnimeCard } from '../common/AnimeCard';
import { SkeletonGrid } from '../common/SkeletonCard';

export function SearchResultsView() {
  const { searchQuery, searchResults, searchLoading } = useApp();

  return (
    <div id="searchResultsSection" className="home-section container-max reveal-up">
      <h2 className="section-title" id="searchResultsTitle">
        {searchLoading ? `Searching for "${searchQuery}"…` : `Search Results for "${searchQuery}"`}
      </h2>
      <div className="category-grid" id="searchResultsGrid">
        {searchLoading && <SkeletonGrid count={8} />}
        {!searchLoading && searchResults.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>🔍</span>
            <h3>No results found</h3>
            <p style={{ color: 'var(--text-2)' }}>Try a different anime title or keyword.</p>
          </div>
        )}
        {!searchLoading && searchResults.map((anime, i) => (
          <AnimeCard key={anime.malId || anime.seriesId || i} anime={anime} index={i} extraClass="search-result-card" />
        ))}
      </div>
    </div>
  );
}
