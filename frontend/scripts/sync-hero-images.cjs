/**
 * Sync hero JPGs from repo resources/hero into frontend/public for Vite/nginx.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const srcDir = path.join(root, 'resources', 'hero');
const destDir = path.join(__dirname, '../public/resources/hero');

const RENAME = {
  'one platform bacgground.jpg': 'one-platform-background.jpg',
};

if (!fs.existsSync(srcDir)) {
  console.warn('[sync-hero] Missing', srcDir);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const name of fs.readdirSync(srcDir)) {
  if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
  const outName = RENAME[name] || name;
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, outName));
  console.log('[sync-hero]', outName);
}

const loginSrc = path.join(root, 'resources', 'login');
const loginDest = path.join(__dirname, '../public/resources/login');
if (fs.existsSync(loginSrc)) {
  fs.mkdirSync(loginDest, { recursive: true });
  for (const name of fs.readdirSync(loginSrc)) {
    if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
    fs.copyFileSync(path.join(loginSrc, name), path.join(loginDest, name));
    console.log('[sync-login]', name);
  }
}
