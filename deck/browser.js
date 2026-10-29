// Finds a Chromium for Playwright: its own if installed (`npx playwright install chromium`), else any
// Chromium already in the Playwright cache, else CHROME_PATH. Shared by the deck tests and the exporters.
// findChrome() returns null for Playwright's own browser, a path for a cached one, undefined for none.
const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try { if (fs.existsSync(chromium.executablePath())) return null; } catch { /* not installed */ }
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
  const bins = ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-linux64/chrome'];
  let dirs = []; try { dirs = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().reverse(); } catch { /* no cache */ }
  for (const d of dirs) for (const b of bins) { const p = path.join(cache, d, b); if (fs.existsSync(p)) return p; }
  return undefined;
}
function launch() {
  const exe = findChrome();
  if (exe === undefined) throw new Error('no Chromium found: run `npx playwright install chromium` or set CHROME_PATH');
  return chromium.launch(exe ? { executablePath: exe } : {});
}
// Waits until every embedded font face on the page has loaded; true when all of them did.
const fontsReady = page => page.evaluate(async () => {
  const faces = [...document.fonts];
  await Promise.all(faces.map(f => f.load().catch(() => null)));
  await document.fonts.ready;
  return faces.every(f => f.status === 'loaded');
});
module.exports = { chromium, findChrome, launch, fontsReady };
