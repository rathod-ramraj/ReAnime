import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Titles } from '../../services/titles';

export function HeroSpotlight() {
  const { spotlightItems, openAnime } = useApp();
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  const items = spotlightItems.slice(0, 10);
  const current = items[index] || items[0];

  useEffect(() => {
    if (!items.length) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length]);

  if (!items.length || !current) {
    return (
      <div className="hero-spotlight" style={{ minHeight: '520px', background: 'var(--surface)' }}>
        <div className="hero-inner" style={{ display: 'flex', alignItems: 'center', minHeight: '520px', padding: '0 32px' }}>
          <div style={{ width: '100%', maxWidth: '600px' }}>
            <div className="skeleton-line" style={{ height: '24px', width: '120px', marginBottom: '16px' }} />
            <div className="skeleton-line skeleton-title" style={{ height: '56px', width: '80%', marginBottom: '20px' }} />
            <div className="skeleton-line" style={{ height: '20px', width: '50%', marginBottom: '24px' }} />
            <div className="skeleton-line skeleton-desc-1" style={{ marginBottom: '10px' }} />
            <div className="skeleton-line skeleton-desc-2" />
          </div>
        </div>
      </div>
    );
  }

  const metaLine = Titles.heroMetaLine(current);
  const isPosterFallback = !current.banner && !current.bannerImage;
  const bgImg = current.banner || current.bannerImage || current.poster || '';
  const visualImg = current.poster || current.banner || '';

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div id="heroSection" className="hero-spotlight">
      <div className="hero-bg" aria-hidden="true">
        <div
          className="hero-bg-backdrop"
          style={{ backgroundImage: bgImg ? `url(${bgImg})` : undefined }}
        />
        <img
          className={`hero-bg-img${isPosterFallback ? ' is-poster-fallback' : ''}`}
          src={bgImg}
          alt=""
          decoding="async"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          onError={(e) => {
            if (current.poster && e.currentTarget.src !== current.poster) {
              e.currentTarget.src = current.poster;
              e.currentTarget.classList.add('is-poster-fallback');
            }
          }}
        />
      </div>
      <div className="hero-overlay" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-grid">
          <div className="hero-content reveal-up">
            <span className="hero-rank">#{index + 1} Spotlight</span>
            <h1 className="hero-title">{current.title}</h1>
            <div className="hero-meta">{metaLine}</div>
            <p className="hero-desc">{(current.description || '').replace(/<[^>]*>/g, '').trim()}</p>
            <div className="hero-actions">
              <button className="btn-watch" type="button" onClick={() => openAnime(current)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Watch Now</span>
              </button>
              <button className="btn-detail" type="button" onClick={() => openAnime(current)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>View Details</span>
              </button>
            </div>
            <div className="hero-dots" role="tablist" aria-label="Spotlight slides">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`hero-dot${i === index ? ' active' : ''}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="hero-visual reveal-up reveal-delay-1" aria-hidden="true">
            <div className="hero-visual-frame">
              <img
                key={visualImg}
                className="hero-visual-img"
                src={visualImg}
                alt=""
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </div>
        </div>
        <div className="hero-controls">
          <button className="hero-arrow" type="button" onClick={handlePrev} aria-label="Previous spotlight">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
          <button className="hero-arrow" type="button" onClick={handleNext} aria-label="Next spotlight">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
