async function initDesign() {
  try {
    const res = await fetch('/Design.json');
    const design = await res.json();
    applyDesignPalette(design);
    applyAnimeXploreTheme();
    document.title = 'Home - ReAnime - Watch Anime Online, Free Anime Streaming';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#000000';
  } catch (e) {
    console.warn('[Design] Could not load Design.json', e);
    applyAnimeXploreTheme();
  }
}

function applyAnimeXploreTheme() {
  const root = document.documentElement;
  const theme = {
    '--bg': '#050505',
    '--surface': '#141821',
    '--surface-2': '#181C25',
    '--surface-muted': 'rgba(5, 5, 5, 0.6)',
    '--surface-raised': '#141821',
    '--surface-strong': '#181C25',
    '--highlight': '#9DFF00',
    '--highlight-soft': '#B8FF45',
    '--accent-purple': '#7C5CFF',
    '--accent-blue': '#7C5CFF',
    '--grad-brand': 'linear-gradient(135deg, #7C5CFF, #9DFF00)',
    '--accent-dim': 'rgba(124, 92, 255, 0.12)',
    '--accent-glow': 'rgba(157, 255, 0, 0.35)',
    '--glass-border': 'rgba(255, 255, 255, 0.08)',
    '--glass-border-2': 'rgba(255, 255, 255, 0.05)',
    '--gold': '#9DFF00',
    '--gold-bright': '#B8FF45',
    '--gold-dim': 'rgba(157, 255, 0, 0.12)',
    '--text-2': '#B9C0CC',
    '--text-3': '#7E8696',
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
