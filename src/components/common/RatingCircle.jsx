import React from 'react';

export function RatingCircle({ rawScore, extraClass = '' }) {
  const score = Number(rawScore || 0);
  if (!score || isNaN(score) || score <= 0) return null;

  const circumference = 2 * Math.PI * 12;
  const ratingColor = score >= 7 ? '#22c55e' : score >= 5 ? '#eab308' : '#ef4444';
  const strokeDashoffset = circumference - (Math.min(score, 10) / 10) * circumference;

  return (
    <div className={`tmdb-carousel-rating${extraClass ? ` ${extraClass}` : ''}`}>
      <div className="tmdb-carousel-rating-circle">
        <svg viewBox="0 0 32 32">
          <circle className="bg" cx="16" cy="16" r="12" />
          <circle
            className="progress"
            cx="16"
            cy="16"
            r="12"
            stroke={ratingColor}
            strokeDasharray={circumference.toFixed(2)}
            strokeDashoffset={strokeDashoffset.toFixed(2)}
          />
        </svg>
        <span className="tmdb-carousel-rating-text">{score.toFixed(1)}</span>
      </div>
    </div>
  );
}
