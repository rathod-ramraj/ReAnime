const MEGAPLAY = 'https://megaplay.buzz/stream';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildStreamUrls({ method, embedId, malId, aniId, episode, lang = 'sub' }) {
  const urls = [];
  const add = (url, m) => urls.push({ url, method: m });

  const embedUrls = () => {
    if (!embedId) return;
    add(`${MEGAPLAY}/s-2/${embedId}/${lang}`, 'embed');
    add(`${MEGAPLAY}/s-1/${embedId}/${lang}`, 'embed');
  };

  if (method === 'embed') embedUrls();
  else if (method === 'mal' && malId && episode) {
    add(`${MEGAPLAY}/mal/${malId}/${episode}/${lang}`, 'mal');
  } else if (method === 'ani' && aniId && episode) {
    add(`${MEGAPLAY}/ani/${aniId}/${episode}/${lang}`, 'ani');
  }

  embedUrls();
  if (malId && episode) add(`${MEGAPLAY}/mal/${malId}/${episode}/${lang}`, 'mal');
  if (aniId && episode) add(`${MEGAPLAY}/ani/${aniId}/${episode}/${lang}`, 'ani');

  const seen = new Set();
  return urls.filter((u) => {
    if (seen.has(u.url)) return false;
    seen.add(u.url);
    return true;
  });
}

function extractSourcesFromHtml(html, pageUrl) {
  const sources = [];
  const seen = new Set();

  const push = (raw, type) => {
    if (!raw || seen.has(raw)) return;
    if (/\.(m3u8|mp4|webm)(\?|$)/i.test(raw) || type === 'm3u8') {
      seen.add(raw);
      sources.push({ url: raw, type: type || (raw.includes('.m3u8') ? 'm3u8' : 'mp4') });
    }
  };

  const resolveUrl = (raw) => {
    if (!raw) return null;
    const u = raw.replace(/\\\//g, '/').trim();
    if (u.startsWith('http')) return u;
    if (u.startsWith('//')) return `https:${u}`;
    try {
      return new URL(u, pageUrl).href;
    } catch {
      return null;
    }
  };

  const patterns = [
    /https?:\\\/\\\/[^\s"'<>]+?\.(?:m3u8|mp4|webm)[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+?\.(?:m3u8|mp4|webm)[^\s"'<>]*/gi,
    /"(?:file|src|url|source)"\s*:\s*"([^"]+)"/gi,
    /source\s+src=["']([^"']+)["']/gi,
    /data-src=["']([^"']+)["']/gi,
  ];

  for (const re of patterns) {
    let m;
    const rx = new RegExp(re.source, re.flags);
    while ((m = rx.exec(html)) !== null) {
      const candidate = resolveUrl(m[1] || m[0]);
      if (candidate) push(candidate);
    }
  }

  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch) {
    push(resolveUrl(iframeMatch[1]));
  }

  return sources;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      Referer: 'https://megaplay.buzz/',
    },
    redirect: 'follow',
  });
  const html = await res.text();
  if (/error-container|Error Code:/i.test(html) && !/\.m3u8|\.mp4/i.test(html)) {
    return { ok: false, html, status: res.status };
  }
  return { ok: true, html, status: res.status, finalUrl: res.url || url };
}

async function resolveDownloadSources(params) {
  const { embedUrl } = params;
  const candidates = [];

  if (embedUrl && typeof embedUrl === 'string') {
    candidates.push({ url: embedUrl, method: 'direct' });
  }

  candidates.push(...buildStreamUrls(params));

  for (const candidate of candidates) {
    try {
      const page = await fetchPage(candidate.url);
      if (!page.ok) continue;
      const sources = extractSourcesFromHtml(page.html, page.finalUrl || candidate.url);
      if (sources.length) {
        return {
          ok: true,
          sources,
          streamPage: candidate.url,
          method: candidate.method,
        };
      }
    } catch {
      /* try next */
    }
  }

  return {
    ok: false,
    error: 'No downloadable source found for this episode. Try another server or language.',
    streamPage: candidates[0]?.url || null,
  };
}

async function parseHlsSegments(playlistUrl) {
  const res = await fetch(playlistUrl, { headers: { 'User-Agent': UA, Referer: 'https://megaplay.buzz/' } });
  if (!res.ok) throw new Error(`Playlist HTTP ${res.status}`);
  const text = await res.text();
  const base = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);

  if (text.includes('#EXT-X-STREAM-INF')) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let best = null;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].startsWith('#EXT-X-STREAM-INF') && lines[i + 1] && !lines[i + 1].startsWith('#')) {
        const bw = (lines[i].match(/BANDWIDTH=(\d+)/) || [])[1];
        const u = lines[i + 1].startsWith('http') ? lines[i + 1] : base + lines[i + 1];
        if (!best || Number(bw) > Number(best.bandwidth)) {
          best = { url: u, bandwidth: bw || '0' };
        }
      }
    }
    if (best) return parseHlsSegments(best.url);
  }

  const segments = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    segments.push(t.startsWith('http') ? t : base + t);
  }
  return segments;
}

async function streamHlsToResponse(playlistUrl, res, filename) {
  const segments = await parseHlsSegments(playlistUrl);
  if (!segments.length) throw new Error('Empty playlist');

  res.setHeader('Content-Type', 'video/mp2t');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.\-() ]/g, '_')}"`);
  res.setHeader('Cache-Control', 'no-store');

  for (const segUrl of segments) {
    const segRes = await fetch(segUrl, { headers: { 'User-Agent': UA, Referer: 'https://megaplay.buzz/' } });
    if (!segRes.ok) continue;
    const buf = Buffer.from(await segRes.arrayBuffer());
    if (!res.write(buf)) {
      await new Promise((r) => res.once('drain', r));
    }
  }
  res.end();
}

async function proxyFileDownload(sourceUrl, res, filename) {
  const upstream = await fetch(sourceUrl, {
    headers: { 'User-Agent': UA, Referer: 'https://megaplay.buzz/' },
  });
  if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);

  const ct = upstream.headers.get('content-type') || 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.\-() ]/g, '_')}"`);
  res.setHeader('Cache-Control', 'no-store');

  const reader = upstream.body;
  if (reader && typeof reader.getReader === 'function') {
    const stream = require('stream');
    const { Readable } = stream;
    const nodeStream = Readable.fromWeb(reader);
    nodeStream.pipe(res);
    return;
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  res.send(body);
}

module.exports = {
  buildStreamUrls,
  resolveDownloadSources,
  streamHlsToResponse,
  proxyFileDownload,
};
