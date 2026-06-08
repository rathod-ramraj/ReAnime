async function initDesign() {
  try {
    const res = await fetch('/Design.json');
    const design = await res.json();
    applyDesignPalette(design);
    applyAnimeXploreTheme();
    document.title = 'AnimeXplore — Watch Anime Online Free in HD';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#050505';
  } catch (e) {
    console.warn('[Design] Could not load Design.json', e);
    applyAnimeXploreTheme();
  }
}

function applyAnimeXploreTheme() {
  const root = document.documentElement;
  const theme = {
    '--bg': '#050505',
    '--surface': 'rgba(255, 255, 255, 0.05)',
    '--surface-2': 'rgba(255, 255, 255, 0.03)',
    '--highlight': '#d4a853',
    '--highlight-soft': '#e8c547',
    '--accent-purple': '#4a9eff',
    '--accent-blue': '#3b82f6',
    '--grad-brand': 'linear-gradient(135deg, #3b82f6, #d4a853)',
    '--accent-dim': 'rgba(59, 130, 246, 0.1)',
    '--accent-glow': 'rgba(212, 168, 83, 0.35)',
    '--glass-border': 'rgba(255, 255, 255, 0.08)',
    '--glass-border-2': 'rgba(255, 255, 255, 0.05)',
    '--gold': '#d4a853',
    '--gold-bright': '#e8c547',
    '--gold-dim': 'rgba(212, 168, 83, 0.12)',
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
