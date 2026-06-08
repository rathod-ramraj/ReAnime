const BOT_PATTERNS = [
  /bot\b/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /wget/i,
  /python-requests/i,
  /python\/\d/i,
  /scrapy/i,
  /headless/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /httpclient/i,
  /libwww/i,
  /go-http-client/i,
  /java\/\d/i,
  /okhttp/i,
  /axios\/\d/i,
  /node-fetch/i,
  /postman/i,
  /insomnia/i,
  /ahrefs/i,
  /semrush/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /anthropic/i,
  /ccbot/i,
];

const ALLOWED_BOTS = [
  /googlebot/i,
  /bingbot/i,
];

function isBlockedBot(req) {
  const ua = req.headers['user-agent'] || '';
  if (!ua.trim()) return true;
  if (ua.length < 12) return true;
  if (ALLOWED_BOTS.some((p) => p.test(ua))) return false;
  return BOT_PATTERNS.some((p) => p.test(ua));
}

function botGuardMiddleware(req, res, next) {
  if (isBlockedBot(req)) {
    return res.status(403).type('text/plain').send('Access denied. Automated access is not permitted.');
  }
  next();
}

module.exports = { botGuardMiddleware, isBlockedBot };
