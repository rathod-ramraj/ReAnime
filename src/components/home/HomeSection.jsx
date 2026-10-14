import React from 'react';
import { AnimeCard } from '../common/AnimeCard';
import { SkeletonGrid } from '../common/SkeletonCard';

export function HomeSection({ id, title, items = [], loading = false }) {
  const displayItems = items.slice(0, 8);

  return (
    <div id={id} className="home-section container-max reveal-up">
      <h2 className="section-title">{title}</h2>
      <div className="category-grid">
        {loading && <SkeletonGrid count={8} />}
        {!loading && displayItems.map((anime, i) => (
          <AnimeCard key={anime.malId || anime.seriesId || i} anime={anime} index={i} />
        ))}
      </div>
    </div>
  );
}
