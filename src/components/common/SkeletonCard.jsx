import React from 'react';

export function SkeletonCard() {
  return <div className="skeleton-card" />;
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
