import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RatingCircle } from '../common/RatingCircle';
import { API } from '../../services/api';

export function TrendingCarousel() {
  const { trendingItems, openAnime, homeLoading } = useApp();
  const [bgImage, setBgImage] = useState('');
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const rowRef = useRef(null);

  const items = trendingItems.slice(0, 10);

  useEffect(() => {
    if (items.length > 0 && !bgImage) {
      const initialBg = items[0].banner || items[0].bannerImage || items[0].poster || '';
      setBgImage(initialBg);
    }
  }, [items, bgImage]);

  const updateNav = () => {
    if (!rowRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = rowRef.current;
    setIsBeginning(scrollLeft <= 5);
    setIsEnd(scrollLeft + clientWidth >= scrollWidth - 5);
  };

  const handlePrev = () => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: 320, behavior: 'smooth' });
  };

  return (
    <div id="homeTrendingSection" className="home-section tmdb-carousel-wrapper reveal-up">
      <div
        id="trendingBgImg"
        className="tmdb-carousel-bg-image"
        style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined }}
      />
      <div className="tmdb-carousel-container">
        <div className="tmdb-carousel-homewrapper">
          <div className="flex items-center gap-3">
            <h3 className="tmdb-carousel-text-outline tmdb-carousel-top10">
              <span className="tmdb-carousel-letter-shadow-r">T</span>
              <span className="tmdb-carousel-letter-shadow-r -ml-2">O</span>
              <span className="tmdb-carousel-letter-shadow-r -ml-2 mr-1">P</span>
              <span className="tmdb-carousel-letter-shadow-r ml-2">1</span>
              <span className="tmdb-carousel-letter-shadow-r -ml-2">0</span>
            </h3>
            <div className="flex flex-col">
              <h3 className="tmdb-carousel-subtitle text-sm md:text-xl">ANIME</h3>
              <h3 className="tmdb-carousel-subtitle text-sm md:text-xl">TODAY</h3>
            </div>
          </div>
        </div>

        <div className="tmdb-carousel-navigation-top">
          <button
            id="trendingPrev"
            type="button"
            className={`tmdb-carousel-nav-button${isBeginning ? ' tmdb-carousel-nav-disabled' : ''}`}
            onClick={handlePrev}
            disabled={isBeginning}
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            id="trendingNext"
            type="button"
            className={`tmdb-carousel-nav-button${isEnd ? ' tmdb-carousel-nav-disabled' : ''}`}
            onClick={handleNext}
            disabled={isEnd}
            aria-label="Next slide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div
          ref={rowRef}
          className="tmdb-carousel-swiper h-auto pt-8"
          id="trendingRow"
          onScroll={updateNav}
        >
          {items.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="tmdb-carousel-skeleton-item">
                <div className="tmdb-carousel-skeleton-number" />
                <div className="tmdb-carousel-skeleton-poster" />
              </div>
            ))
          ) : (
            items.map((item, idx) => {
              const rank = idx + 1;
              const poster = API.posterUrl(item.poster);
              const banner = item.banner || item.bannerImage || item.poster || '';

              return (
                <div
                  key={item.malId || item.seriesId || idx}
                  className="block relative tmdb-carousel-slide"
                  onClick={() => openAnime(item)}
                  onMouseEnter={() => {
                    if (banner) setBgImage(banner);
                    if (item.malId) API.prefetchResolve(item.malId);
                  }}
                >
                  <h3 className="sr-only">{item.title}</h3>
                  <div className="tmdb-carousel-card group">
                    <p className="tmdb-carousel-number tmdb-carousel-top10">
                      {rank < 10 ? (
                        <span className="tmdb-carousel-number-hollow text-transparent transition-all duration-300">
                          {rank}
                        </span>
                      ) : (
                        <>
                          <span className="tmdb-carousel-number-hollow text-transparent transition-all duration-300">
                            1
                          </span>
                          <span className="tmdb-carousel-double-digit tmdb-carousel-number-hollow text-transparent transition-all duration-300">
                            0
                          </span>
                        </>
                      )}
                    </p>
                    <div className="relative">
                      <img
                        className="tmdb-carousel-poster"
                        src={poster || '/logo.png'}
                        alt={item.title || 'Poster'}
                        loading="lazy"
                      />
                      <RatingCircle rawScore={item.score} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
