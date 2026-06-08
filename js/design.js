async function initDesign() {
  try {
    const res = await fetch('/Design.json');
    const design = await res.json();
    applyDesignPalette(design);
    applyAnimeXploreTheme();
    if (window.ShapeGridApp) {
      ShapeGridApp.init(document.getElementById('sg-global-bg'), getShapeGridOptions(design));
    }
    document.title = 'AnimeXplore — Watch Anime Online';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#0a1628';
  } catch (e) {
    console.warn('[Design] Could not load Design.json', e);
    applyAnimeXploreTheme();
  }
}

function applyAnimeXploreTheme() {
  const root = document.documentElement;
  const blue = {
    '--bg': '#0a1628',
    '--highlight': '#38bdf8',
    '--highlight-soft': '#60a5fa',
    '--accent-purple': '#06b6d4',
    '--accent-blue': '#3b82f6',
    '--grad-brand': 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    '--accent-dim': 'rgba(59, 130, 246, 0.12)',
    '--accent-glow': 'rgba(59, 130, 246, 0.35)',
    '--glass-border': 'rgba(30, 58, 95, 0.55)',
    '--glass-border-2': 'rgba(30, 58, 95, 0.35)',
  };
  for (const [key, val] of Object.entries(blue)) {
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
    primary_bg: '--bg',
    secondary_bg: '--surface-2',
    glass_surface: '--surface',
    glass_border: '--glass-border',
    glass_border_light: '--glass-border-2',
    accent_blue: '--accent-blue',
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

function getShapeGridOptions(design) {
  const sg = design?.design_system?.background?.shapegrid?.defaults_from_design_json || {};
  return {
    direction: sg.direction || 'diagonal',
    speed: sg.speed ?? 0.28,
    squareSize: sg.squareSize || 40,
    shape: sg.shape || 'square',
    backgroundColor: '#0a1628',
    borderColor: '#1e3a5f',
    hoverFillColor: 'rgba(59,130,246,0.18)',
    hoverTrailAmount: sg.hoverTrailAmount ?? 3,
    vignetteEdge: sg.vignetteEdge || 'rgba(5, 12, 28, 0.5)',
  };
}

document.addEventListener('DOMContentLoaded', initDesign);
