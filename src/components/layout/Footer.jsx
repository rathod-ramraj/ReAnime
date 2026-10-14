import React from 'react';
import { useApp } from '../../context/AppContext';

export function Footer() {
  const { goHome } = useApp();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-inner container-max">
        <div className="footer-top">
          <a href="#" className="footer-brand" onClick={(e) => { e.preventDefault(); goHome(); }}>
            <img src="/logo.png" alt="Re:Anime" className="footer-brand-img" width="180" height="50" />
          </a>
          <p className="footer-tagline">
            Your ultimate destination for anime streaming, discussions, and community. Discover, watch, and connect with fellow anime enthusiasts.
          </p>
          <div className="footer-social" aria-label="Social media">
            <a
              href="https://t.me/meme_adda_098"
              className="telegram-community-btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join our community on Telegram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0C5.37 0 0 5.37 0 12c0 6.63 5.37 12 12 12 6.63 0 12-5.37 12-12S18.57 0 11.944 0zM18.06 8.12l-2.04 9.61c-.15.68-.55.84-1.12.52l-3.11-2.29-1.5 1.44c-.17.17-.3.3-.63.3l.22-3.17 5.77-5.21c.25-.22-.05-.35-.39-.13l-7.14 4.5-3.07-.96c-.67-.21-.68-.67.14-.99l12.01-4.63c.56-.2 1.07.15.85.8z" />
              </svg>
              <span>Join our community</span>
            </a>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copy">© {new Date().getFullYear()} Re:ANIME. All rights reserved.</p>
          <p className="footer-disclaimer">
            Re:ANIME does not store any files on our server, we only link to media hosted on 3rd party services.
          </p>
          <div className="footer-bottom-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Contact</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
