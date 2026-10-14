import React from 'react';
import { useApp } from '../../context/AppContext';

export function NotificationPanel() {
  const { notifyOpen, setNotifyOpen } = useApp();
  if (!notifyOpen) return null;

  return (
    <div className="notify-panel" id="notifyPanel" role="dialog" aria-label="Notifications">
      <div className="notify-panel-head">
        <h3>Notifications</h3>
        <button type="button" className="notify-close" onClick={() => setNotifyOpen(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="notify-list">
        <div className="notify-item">
          <span className="notify-item-icon">✦</span>
          <div>
            <p className="notify-item-title">Welcome to ReAnime</p>
            <p className="notify-item-text">Discover trending anime and pick up where you left off.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
