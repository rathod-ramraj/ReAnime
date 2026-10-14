const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const devHtml = path.join(rootDir, 'index.html.dev');
const rootHtml = path.join(rootDir, 'index.html');

if (fs.existsSync(devHtml)) {
  fs.copyFileSync(devHtml, rootHtml);
  console.log('[prebuild] Restored index.html from index.html.dev for Vite compilation');
}
