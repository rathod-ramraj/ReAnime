async function initDesign() {
  try {
    const res = await fetch('/Design.json');
    const design = await res.json();
    applyDesignPalette(design);
    applyReAnimeTheme();
    document.title = 'Home - ReAnime - Watch Anime Online, Free Anime Streaming';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#0c0c0e';
  } catch (e) {
    console.warn('[Design] Could not load Design.json', e);
    applyReAnimeTheme();
  }
}

function applyReAnimeTheme() {
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

function applyDesignPalette(design) {
  const ds = design?.design_system?.style;
  if (!ds) return;

  const root = document.documentElement;
  const props = ds.css_custom_properties || {};
  for (const [key, val] of Object.entries(props)) {
    if (key.startsWith('--') && typeof val === 'string' && !key.includes('highlight') && !key.includes('ff4d6d')) {
      root.style.setProperty(key, val);
    }
  }

  const palette = ds.color_palette || {};
  const mapping = {
    secondary_bg: '--surface-2',
    glass_surface: '--surface',
    text_primary: '--text-1',
    text_secondary: '--text-2',
    text_tertiary: '--text-3',
    player_bg: '--player-bg',
    success: '--success',
    warning: '--warning',
  };
  for (const [src, cssVar] of Object.entries(mapping)) {
    if (palette[src]) root.style.setProperty(cssVar, palette[src]);
  }
}

document.addEventListener('DOMContentLoaded', initDesign);
