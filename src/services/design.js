export async function initDesign() {
  try {
    const res = await fetch('/Design.json');
    const design = await res.json();
    applyDesignPalette(design);
    applyReAnimeTheme();
    document.title = 'ReAnime - Watch Anime Online, Free Anime Streaming';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#0c0c0e';
  } catch (e) {
    console.warn('[Design] Could not load Design.json', e);
    applyReAnimeTheme();
  }
}

export function applyReAnimeTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = {
    '--bg': '#0c0c0e',
    '--surface': '#161618',
    '--surface-2': '#1a1a1e',
    '--surface-muted': 'rgba(12, 12, 14, 0.6)',
    '--surface-raised': '#161618',
    '--surface-strong': '#1e1e22',
    '--highlight': '#9DFF00',
    '--highlight-soft': '#B8FF45',
    '--highlight-dim': 'rgba(157, 255, 0, 0.12)',
    '--highlight-glow': 'rgba(157, 255, 0, 0.35)',
    '--accent-blue': '#9DFF00',
    '--grad-brand': 'linear-gradient(135deg, #9DFF00, #22c55e)',
    '--accent-dim': 'rgba(157, 255, 0, 0.12)',
    '--accent-glow': 'rgba(157, 255, 0, 0.35)',
    '--glass-border': 'rgba(255, 255, 255, 0.08)',
    '--glass-border-2': 'rgba(255, 255, 255, 0.05)',
    '--gold': '#9DFF00',
    '--gold-bright': '#B8FF45',
    '--gold-dim': 'rgba(157, 255, 0, 0.12)',
    '--text-2': '#a1a1aa',
    '--text-3': '#71717a',
  };
  for (const [key, val] of Object.entries(theme)) {
    root.style.setProperty(key, val);
  }
}

export function applyDesignPalette(design) {
  const ds = design?.design_system?.style;
  if (!ds || typeof document === 'undefined') return;

  const root = document.documentElement;
  const c = ds.colors || {};

  if (c.background) {
    root.style.setProperty('--bg', c.background);
    root.style.setProperty('--surface', c.background);
    root.style.setProperty('--surface-raised', c.background);
    root.style.setProperty('--player-bg', c.background);
  }
  if (c.surface) {
    root.style.setProperty('--surface-2', c.surface);
    root.style.setProperty('--surface-strong', c.surface);
  }
  if (c.primary) {
    root.style.setProperty('--highlight', c.primary);
    root.style.setProperty('--highlight-soft', c.primary);
    root.style.setProperty('--accent-blue', c.primary);
    root.style.setProperty('--gold', c.primary);
    root.style.setProperty('--gold-bright', c.primary);
  }
}
