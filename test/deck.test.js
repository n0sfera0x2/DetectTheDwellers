const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const skeleton = require('../deck/skeleton');
const { build, FACES } = require('../deck/build');

test('the deck is 54 cards and builds six duplex sheets', () => {
  const items = build();
  assert.strictEqual(items.length, 54);
  for (let s = 1; s <= 6; s++) for (const side of ['fronts', 'backs'])
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'dist', 'deck', `sheet-${s}-${side}.html`)));
});

test('card markup matches the snapshot (run `npm run golden` after an intentional change)', () => {
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-cards.json'), 'utf8'));
  const now = skeleton();
  assert.strictEqual(now.length, golden.length);
  now.forEach(([f, b], i) => { assert.strictEqual(f, golden[i][0], `front of card ${i + 1} changed`); assert.strictEqual(b, golden[i][1], `back of card ${i + 1} changed`); });
});

test('every SVG gradient id on a sheet is unique', () => {
  const dir = path.join(__dirname, '..', 'dist', 'deck');
  for (const f of fs.readdirSync(dir).filter(x => x.startsWith('sheet-'))) {
    const ids = [...fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(new Set(ids).size, ids.length, `${f} has duplicate ids`);
  }
});

// Renders every sheet in a real browser and checks that nothing on any card runs past its frame.
// Uses the playwright devDependency. Its own Chromium if installed (`npx playwright install chromium`),
// else any Chromium already in the Playwright cache, else CHROME_PATH. Skips with a message when none is found.
const os = require('os');
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
const CHROME = findChrome();
test('no card content overflows its 240×336 card (all 54 fronts and backs, rendered)', { skip: CHROME === undefined ? 'no Chromium found: run `npx playwright install chromium`; overflow check skipped' : false }, async () => {
  build();
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    const dir = path.join(__dirname, '..', 'dist', 'deck');
    let cards = 0;
    const problems = [];
    for (let s = 1; s <= 6; s++) for (const side of ['fronts', 'backs']) {
      await page.goto('file://' + path.join(dir, `sheet-${s}-${side}.html`));
      const fontsOk = await page.evaluate(async n => {
        const faces = [...document.fonts];
        await Promise.all(faces.map(f => f.load().catch(() => null)));
        await document.fonts.ready;
        return faces.length === n && faces.every(f => f.status === 'loaded');
      }, FACES.length);
      const r = await page.evaluate(faces => {
        const out = [];
        // Every line of text must use a weight that is embedded, or the browser fakes it.
        const have = new Set(faces.map(([f, w]) => `${f} ${w}`)), seen = new Set();
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n; (n = tw.nextNode());) {
          if (!n.textContent.trim()) continue;
          const cs = getComputedStyle(n.parentElement), face = `${cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim()} ${cs.fontWeight}`;
          if (!have.has(face) && !seen.has(face)) { seen.add(face); out.push(`text "${n.textContent.trim().slice(0, 30)}" asks for ${face}, which is not embedded`); }
        }
        const list = [...document.querySelectorAll('.cards > .card')];
        list.forEach((card, i) => {
          const box = card.getBoundingClientRect();
          if (Math.round(box.width) !== 240 || Math.round(box.height) !== 336) out.push(`card ${i + 1} is ${box.width}×${box.height}`);
          // Inside the 5 px frame line. SVG internals are skipped: scenes are cropped on purpose.
          const lim = { l: box.left + 5, r: box.right - 5, t: box.top + 5, b: box.bottom - 5 };
          const over = b => Math.max(b.bottom - lim.b, b.right - lim.r, lim.l - b.left, lim.t - b.top);
          let bad = null;
          for (const el of card.querySelectorAll('*')) {
            if (el.closest('svg') && el.closest('svg') !== el) continue;
            const b = el.getBoundingClientRect();
            if (!b.width || !b.height || b.width >= 239.5) continue; // full-width layout boxes; their text is checked below
            if (over(b) > 0.5) { bad = [el.textContent, over(b)]; break; }
          }
          // Every line of text, measured directly.
          const walk = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
          for (let n; !bad && (n = walk.nextNode());) {
            if (!n.textContent.trim() || n.parentElement.closest('svg')) continue;
            const rg = document.createRange(); rg.selectNodeContents(n);
            for (const b of rg.getClientRects()) {
              // The frame's cut corners (16 px diagonals, bottom left and top right) count as frame too.
              const cut = Math.max(16 - ((b.left - lim.l) + (lim.b - b.bottom)), 16 - ((lim.r - b.right) + (b.top - lim.t)));
              const o = Math.max(over(b), cut);
              if (o > 0.5) { bad = [n.textContent, o]; break; }
            }
          }
          if (bad) out.push(`card ${i + 1}: "${bad[0].trim().slice(0, 40)}" overruns the frame by ${bad[1].toFixed(1)}px`);
          // Fixed-height boxes (the content column, slots, cells) must hold what they contain.
          for (const el of card.querySelectorAll('div')) if (el.style.height && !el.closest('svg') && getComputedStyle(el).overflow !== 'hidden' && el.scrollHeight > el.clientHeight + 1) { out.push(`card ${i + 1}: content taller than its box (${el.scrollHeight} > ${el.clientHeight}: "${el.textContent.trim().slice(0, 30)}")`); break; }
        });
        return { n: list.length, out };
      }, FACES);
      assert.ok(fontsOk, `sheet-${s}-${side}: embedded fonts did not load`);
      cards += r.n;
      problems.push(...r.out.map(p => `sheet-${s}-${side} ${p}`));
    }
    assert.strictEqual(cards, 108, 'expected 54 fronts and 54 backs');
    assert.deepStrictEqual(problems, []);
  } finally { await browser.close(); }
});
