import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ThanosParticles } from '../common/ThanosParticles';

/* --- Watch History Carousel Component --- */
export function ContinueWatching() {
  const { continueWatching, openAnime, handleRemoveHistory } = useApp();
  const [deletingItem, setDeletingItem] = useState(null);
  const [deletingRect, setDeletingRect] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef(null);
  const itemRefs = useRef(new Map());

  const checkScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 5);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  }, []);

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [continueWatching, checkScroll]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  /* Trigger delete particle effect & record card boundary */
  const handleDelete = useCallback((itemId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const ref = itemRefs.current.get(itemId);
    if (ref) {
      setDeletingRect(ref.getBoundingClientRect());
      setDeletingItem(itemId);
    } else {
      handleRemoveHistory(itemId);
    }
  }, [handleRemoveHistory]);

  /* Complete removal after particles finish */
  const completeDelete = useCallback(() => {
    if (deletingItem === null) return;
    handleRemoveHistory(deletingItem);
    setDeletingItem(null);
    setDeletingRect(null);
  }, [deletingItem, handleRemoveHistory]);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!continueWatching || continueWatching.length === 0) return null;

  return (
    <>
      {/* Particle Canvas */}
      <ThanosParticles
        isActive={deletingItem !== null}
        onComplete={completeDelete}
        rect={deletingRect}
      />

      <section className="home-section container-max continue-watching-section reveal-up">
        {/* Header */}
        <div className="continue-header">
          <div className="continue-header-title">
            <h2 className="section-title">Continue Watching</h2>
            <span className="continue-count">{continueWatching.length}</span>
          </div>

          {/* Navigation Arrows */}
          <div className="continue-nav-arrows">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`continue-nav-btn ${canScrollLeft ? 'active' : 'disabled'}`}
              aria-label="Scroll left"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`continue-nav-btn ${canScrollRight ? 'active' : 'disabled'}`}
              aria-label="Scroll right"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="continue-carousel-wrap">
          <div
            ref={scrollContainerRef}
            className="continue-carousel scrollbar-hide"
          >
            {continueWatching.map((item) => {
              const itemId = String(item.id || item.malId || item.seriesId);
              const isDeleting = deletingItem !== null && String(deletingItem) === String(itemId);
              const imageSrc = item.backdrop || item.banner || item.poster || '/logo.png';
              const progressPct = item.progress !== undefined ? item.progress : (item.currentTime && item.duration ? Math.round((item.currentTime / item.duration) * 100) : 0);

              return (
                <div
                  key={`${item.type || 'anime'}-${itemId}`}
                  ref={(el) => {
                    if (el) itemRefs.current.set(itemId, el);
                    else itemRefs.current.delete(itemId);
                  }}
                  className={`continue-card-item ${isDeleting ? 'is-dissolving' : ''}`}
                  style={{
                    opacity: isDeleting ? 0 : 1,
                    transform: isDeleting ? 'scale(0.5) translateY(-8px)' : 'none',
                    filter: isDeleting ? 'blur(12px)' : 'none',
                    transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: isDeleting ? 'none' : 'auto',
                  }}
                  onClick={() => !isDeleting && openAnime(item, item.episode || 1)}
                >
                  <div className="continue-card-body">
                    {/* Media Thumbnail */}
                    <div className="continue-media-box">
                      <img
                        src={imageSrc}
                        alt={item.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="continue-media-img"
                      />

                      {/* Card Overlay & Hover Play Button */}
                      <div className="continue-media-overlay" />
                      <div className="continue-play-hover">
                        <div className="continue-play-badge">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      </div>

                      {/* Badge: Time left or Episode */}
                      <div className="continue-badge">
                        {item.duration > 0 && progressPct < 95 ? (
                          `${formatDuration(item.duration - (item.currentTime || 0))} left`
                        ) : (
                          `EP ${item.episode || 1}`
                        )}
                      </div>

                      {/* Title & Progress Bar Overlay */}
                      <div className="continue-media-footer">
                        <h3 className="continue-item-title" title={item.title}>
                          {item.title}
                        </h3>
                        <div className="continue-progress-track">
                          <div
                            className="continue-progress-fill"
                            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remove / Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(itemId, e)}
                    className="continue-item-delete"
                    aria-label="Remove from history"
                    title="Remove from history"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

