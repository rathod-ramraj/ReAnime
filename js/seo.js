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
  setAbs('ogImage', '/favicon.png');
  setAbs('twitterImage', '/favicon.png');

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
})();
