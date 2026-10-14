import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { AnimeCard } from '../common/AnimeCard';
import { ThanosParticles } from '../common/ThanosParticles';

export function LibraryView() {
  const { bookmarks, history, openAnime, handleRemoveHistory } = useApp();
  const [tab, setTab] = useState('bookmarks'); // 'bookmarks' | 'history'
  const [deletingItem, setDeletingItem] = useState(null);
  const [deletingRect, setDeletingRect] = useState(null);

  const itemRefs = useRef(new Map());

  const items = tab === 'bookmarks' ? bookmarks : history;

  const handleDelete = useCallback((itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const ref = itemRefs.current.get(itemId);
    if (ref) {
      setDeletingRect(ref.getBoundingClientRect());
      setDeletingItem(itemId);
    } else {
      handleRemoveHistory(itemId);
    }
  }, [handleRemoveHistory]);

  const completeDelete = useCallback(() => {
    if (deletingItem === null) return;
    handleRemoveHistory(deletingItem);
    setDeletingItem(null);
    setDeletingRect(null);
  }, [deletingItem, handleRemoveHistory]);

  return (
    <>
      <ThanosParticles
        isActive={deletingItem !== null}
        onComplete={completeDelete}
        rect={deletingRect}
      />

      <div id="librarySection" className="home-section container-max reveal-up" style={{ minHeight: '60vh', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 className="section-title" style={{ margin: 0 }}>My Library</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`tool-btn${tab === 'bookmarks' ? ' active' : ''}`}
              onClick={() => setTab('bookmarks')}
              style={{ borderRadius: '20px', padding: '6px 16px', background: tab === 'bookmarks' ? 'var(--highlight)' : 'rgba(255,255,255,0.08)', color: tab === 'bookmarks' ? '#000' : '#fff' }}
            >
              Bookmarks ({bookmarks.length})
            </button>
            <button
              type="button"
              className={`tool-btn${tab === 'history' ? ' active' : ''}`}
              onClick={() => setTab('history')}
              style={{ borderRadius: '20px', padding: '6px 16px', background: tab === 'history' ? 'var(--highlight)' : 'rgba(255,255,255,0.08)', color: tab === 'history' ? '#000' : '#fff' }}
            >
              History ({history.length})
            </button>
          </div>
        </div>

        {!items.length ? (
          <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>
              {tab === 'bookmarks' ? '★' : '⏱'}
            </span>
            <h4>Your {tab} list is empty</h4>
            <p style={{ color: 'var(--text-2)' }}>
              {tab === 'bookmarks' ? 'Bookmark anime to build your list.' : 'Anime you watch will appear here.'}
            </p>
          </div>
        ) : (
          <div className="category-grid">
            {items.map((anime, i) => {
              const itemId = String(anime.id || anime.malId || anime.seriesId || i);
              const isDeleting = deletingItem !== null && String(deletingItem) === String(itemId);

              return (
                <div
                  key={itemId}
                  ref={(el) => {
                    if (el) itemRefs.current.set(itemId, el);
                    else itemRefs.current.delete(itemId);
                  }}
                  style={{
                    position: 'relative',
                    opacity: isDeleting ? 0 : 1,
                    transform: isDeleting ? 'scale(0.5) translateY(-8px)' : 'none',
                    filter: isDeleting ? 'blur(12px)' : 'none',
                    transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: isDeleting ? 'none' : 'auto',
                  }}
                >
                  <AnimeCard
                    anime={anime}
                    index={i}
                    onDelete={tab === 'history' ? (e) => handleDelete(itemId, e) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
