export const SEO = {
  defaultTitle: 'ReAnime - Watch Anime Online, Free Anime Streaming',
  
  setTitle(title, episode) {
    if (typeof document === 'undefined') return;
    if (title && episode) {
      document.title = `${title} · Ep ${episode} — ReAnime`;
    } else if (title) {
      document.title = `Watch ${title} Online HD — ReAnime`;
    } else {
      document.title = this.defaultTitle;
    }
  },

  resetTitle() {
    if (typeof document !== 'undefined') {
      document.title = this.defaultTitle;
    }
  },
};
