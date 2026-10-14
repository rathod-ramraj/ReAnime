const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distHtml = path.join(rootDir, 'dist', 'index.html');
const rootHtml = path.join(rootDir, 'index.html');
const devHtml = path.join(rootDir, 'index.html.dev');

if (fs.existsSync(distHtml)) {
  if (!fs.existsSync(devHtml) && fs.existsSync(rootHtml)) {
    // Keep a backup of dev index.html
    fs.copyFileSync(rootHtml, devHtml);
  }
  fs.copyFileSync(distHtml, rootHtml);
  console.log('[sync-html] Successfully synced dist/index.html to root index.html for Express serving');
} else {
  console.error('[sync-html] dist/index.html not found! Run vite build first.');
}
