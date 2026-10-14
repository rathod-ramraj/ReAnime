import React, { useState, useEffect } from 'react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      try {
        if (!sessionStorage.getItem('reanime_install_shown')) {
          sessionStorage.setItem('reanime_install_shown', '1');
          setShowPrompt(true);
        }
      } catch (_) {
        setShowPrompt(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('reanime_install_shown', '1');
    } catch (_) {}
    setShowPrompt(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      sessionStorage.setItem('reanime_install_shown', '1');
    } catch (_) {}
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div id="installPrompt" className="install-prompt" role="dialog" aria-labelledby="installPromptTitle" aria-modal="true" onClick={(e) => { if (e.target.id === 'installPrompt') handleDismiss(); }}>
      <div className="install-prompt-card">
        <button type="button" className="install-prompt-close" onClick={handleDismiss} aria-label="Close">
          ✕
        </button>
        <img src="/favicon.png?v=2" alt="" className="install-prompt-icon" width="52" height="52" />
        <h3 id="installPromptTitle">Install ReAnime</h3>
        <p id="installPromptDesc">
          Install for faster access — use the button below or the <strong>install icon</strong> next to your browser's address bar.
        </p>
        <div className="install-prompt-actions">
          <button type="button" className="btn-install" onClick={handleInstall}>
            Install App
          </button>
          <button type="button" className="install-prompt-later" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
