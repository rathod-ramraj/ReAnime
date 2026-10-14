import React from 'react';
import { useApp } from '../../context/AppContext';
import { AnimeCard } from '../common/AnimeCard';
import { SkeletonGrid } from '../common/SkeletonCard';

const CATEGORY_TITLES = {
  movies: 'Movies',
  tv: 'TV Series',
  popular: 'Most Popular',
  airing: 'Top Airing',
  completed: 'Latest Completed',
};

export function BrowseView() {
  const { homeCategory, categoryItems } = useApp();
  const title = CATEGORY_TITLES[homeCategory] || 'Browse Anime';

  return (
    <div id="categorySection" className="home-section container-max reveal-up">
      <h2 className="section-title" id="categoryTitle">{title}</h2>
      <div className="category-grid" id="categoryGrid">
        {!categoryItems.length ? (
          <SkeletonGrid count={12} />
        ) : (
          categoryItems.map((anime, i) => (
            <AnimeCard key={anime.malId || anime.seriesId || i} anime={anime} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
