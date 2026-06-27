(function initSeo() {
  const origin = window.location.origin;
  const pageUrl = origin + '/';

  const setAbs = (id, path) => {
    const el = document.getElementById(id);
    if (el && path) el.setAttribute('content', origin + path);
  };

  const canonical = document.getElementById('canonicalUrl');
  if (canonical) canonical.href = pageUrl;

  setAbs('ogUrl', '/');
  setAbs('ogImage', '/favicon.png?v=2');
  setAbs('twitterImage', '/favicon.png?v=2');

  const schema = document.getElementById('schemaWebSite');
  if (schema) {
    try {
      const data = JSON.parse(schema.textContent);
      data.url = pageUrl;
      if (data.potentialAction?.target) {
        data.potentialAction.target = pageUrl + '?q={search_term_string}';
      }
      schema.textContent = JSON.stringify(data);
    } catch (_) { /* keep static fallback */ }
  }

  const year = document.getElementById('footerYear');
  if (year) year.textContent = String(new Date().getFullYear());

  window.PageTitle = {
    default: 'Home - ReAnime - Watch Anime Online, Free Anime Streaming',
    set(animeTitle, episode) {
      if (animeTitle && episode) {
        document.title = `${animeTitle} · Ep ${episode} — ReAnime`;
      } else if (animeTitle) {
        document.title = `${animeTitle} — ReAnime`;
      } else {
        document.title = this.default;
      }
    },
    reset() {
      document.title = this.default;
    },
  };
})();
