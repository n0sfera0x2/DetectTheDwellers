const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const skeleton = require('../deck/skeleton');
const { build, FACES, SHEETS } = require('../deck/build');
const CARDS = 72; // 15 mobs, 18 situations, 3 bosses, 5 analysts, 16 kit, 4 HP trackers, 2 references, 9 markers

test('the deck is 72 cards and builds eight duplex sheets, the last one all markers', () => {
  const items = build();
  assert.strictEqual(items.length, CARDS);
  assert.strictEqual(SHEETS, 8);
  const info = require('../deck/cards').meta();
  assert.strictEqual(info.length, CARDS);
  assert.deepStrictEqual(info.slice(63).map(m => m.type), Array(9).fill('marker'));
  assert.deepStrictEqual(info.filter(m => m.type === 'marker').map(m => m.id), [...Array(6).fill('marker_back'), 'marker_next', 'marker_round', 'marker_once']);
  for (let s = 1; s <= 8; s++) for (const side of ['fronts', 'backs'])
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
// Uses the playwright devDependency through deck/browser.js: its own Chromium if installed
// (`npx playwright install chromium`), else any Chromium already in the Playwright cache, else CHROME_PATH.
// Skips with a message when none is found.
const { chromium, findChrome } = require('../deck/browser');
const CHROME = findChrome();
const NO_CHROME = CHROME === undefined ? 'no Chromium found: run `npx playwright install chromium`; rendered checks skipped' : false;
test('no card content overflows its 240×336 card (all 72 fronts and backs, rendered)', { skip: CHROME === undefined ? 'no Chromium found: run `npx playwright install chromium`; overflow check skipped' : false }, async () => {
  build();
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    const dir = path.join(__dirname, '..', 'dist', 'deck');
    let cards = 0;
    const problems = [];
    for (let s = 1; s <= SHEETS; s++) for (const side of ['fronts', 'backs']) {
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
    assert.strictEqual(cards, 2 * CARDS, 'expected 72 fronts and 72 backs');
    assert.deepStrictEqual(problems, []);
  } finally { await browser.close(); }
});

// Which deck card sits in each slot of a sheet page: fronts in deck order, backs mirrored left-right.
const slotsOf = (s, side) => { const idx = [...Array(9)].map((_, i) => s * 9 + i); return side === 'fronts' ? idx : [0, 1, 2].flatMap(r => idx.slice(r * 3, r * 3 + 3).reverse()); };

// The safe zone is 1/8 in (12 px) inside trim. Every line of text, every keyword icon and every content
// box (stats, chips, tags, hit boxes, slots, cells) must sit inside it. Art panels and their scenes, the
// frame line, the accent tab and the back's scene are decoration and may run out toward the bleed.
function safeZoneProblems(SAFE) {
  const out = [];
  document.querySelectorAll('.card').forEach((card, i) => {
    const c = card.getBoundingClientRect();
    const over = b => Math.max(c.left + SAFE - b.left, b.right - (c.right - SAFE), c.top + SAFE - b.top, b.bottom - (c.bottom - SAFE));
    const isArt = el => { const f = el.firstElementChild; return f && f.tagName.toLowerCase() === 'svg' && f.getAttribute('viewBox') !== '0 0 16 16' && el.children.length === 1; };
    let bad = null;
    const walk = el => {
      for (const k of el.children) {
        if (bad) return;
        const tag = k.tagName.toLowerCase();
        if (tag === 'svg') { if (k.getAttribute('viewBox') === '0 0 16 16' && over(k.getBoundingClientRect()) > 0.25) bad = ['keyword icon', over(k.getBoundingClientRect())]; continue; }
        if (isArt(k)) continue;
        const b = k.getBoundingClientRect(), cs = getComputedStyle(k);
        const layout = b.width >= c.width - 0.5 || (cs.position === 'absolute' && !k.textContent.trim());
        if (!layout && b.width && b.height && over(b) > 0.25) { bad = [k.textContent.trim() || `<${tag}> box`, over(b)]; return; }
        walk(k);
      }
    };
    walk(card);
    const tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let n; !bad && (n = tw.nextNode());) {
      if (!n.textContent.trim() || n.parentElement.closest('svg')) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of rg.getClientRects()) if (over(b) > 0.25) { bad = [n.textContent.trim(), over(b)]; break; }
    }
    if (bad) out.push(`card ${i + 1}: "${bad[0].slice(0, 40)}" is ${bad[1].toFixed(1)}px outside the safe zone`);
  });
  return out;
}

test('text, numbers, icons and chips sit inside the 1/8 in safe zone (all 72 fronts and backs, rendered)', { skip: NO_CHROME }, async () => {
  build();
  const { SAFE } = require('../deck/render');
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    const problems = []; let cards = 0;
    for (let s = 1; s <= SHEETS; s++) for (const side of ['fronts', 'backs']) {
      await page.goto('file://' + path.join(__dirname, '..', 'dist', 'deck', `sheet-${s}-${side}.html`));
      await page.evaluate(() => document.fonts.ready);
      cards += await page.evaluate(() => document.querySelectorAll('.card').length);
      problems.push(...(await page.evaluate(safeZoneProblems, SAFE)).map(p => `sheet-${s}-${side} ${p}`));
    }
    assert.strictEqual(cards, 2 * CARDS);
    assert.deepStrictEqual(problems, []);
  } finally { await browser.close(); }
});

// Every element and line of text, as a box relative to the card's trim edge.
function layoutOf() {
  const card = document.querySelector('.card'), c = card.getBoundingClientRect(), r = v => Math.round(v * 100) / 100;
  const box = b => [r(b.left - c.left), r(b.top - c.top), r(b.width), r(b.height)].join(',');
  const out = [...card.querySelectorAll('*')].filter(el => !el.closest('svg') || el.tagName.toLowerCase() === 'svg').map(el => box(el.getBoundingClientRect()));
  const tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) { if (!n.textContent.trim() || n.parentElement.closest('svg')) continue; const rg = document.createRange(); rg.selectNodeContents(n); out.push(...[...rg.getClientRects()].map(box)); }
  return out;
}

test('a face rendered with bleed lays out its trim area exactly as on the sheet', { skip: NO_CHROME }, async () => {
  const items = build();
  const { faceDoc, groundOf, CW, CH, BLEED } = require('../deck/render');
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  try {
    const sheet = await browser.newPage({ viewport: { width: 816, height: 1056 } }), solo = await browser.newPage({ viewport: { width: CW + 2 * BLEED, height: CH + 2 * BLEED } });
    const problems = []; let faces = 0;
    for (let s = 0; s < SHEETS; s++) for (const side of ['fronts', 'backs']) {
      await sheet.goto('file://' + path.join(__dirname, '..', 'dist', 'deck', `sheet-${s + 1}-${side}.html`));
      await sheet.evaluate(() => document.fonts.ready);
      // Each slot's boxes relative to its trim, against the same card rendered alone with bleed.
      for (let i = 0; i < 9; i++) {
        const html = items[slotsOf(s, side)[i]][side === 'fronts' ? 0 : 1];
        const want = await sheet.evaluate(k => {
          const list = [...document.querySelectorAll('.cards > div')], card = list[k], c = card.getBoundingClientRect(), r = v => Math.round(v * 100) / 100;
          const box = b => [r(b.left - c.left), r(b.top - c.top), r(b.width), r(b.height)].join(',');
          const out = [...card.querySelectorAll('*')].filter(el => !el.closest('svg') || el.tagName.toLowerCase() === 'svg').map(el => box(el.getBoundingClientRect()));
          const tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
          for (let n; (n = tw.nextNode());) { if (!n.textContent.trim() || n.parentElement.closest('svg')) continue; const rg = document.createRange(); rg.selectNodeContents(n); out.push(...[...rg.getClientRects()].map(box)); }
          return out;
        }, i);
        await solo.setContent(faceDoc(html));
        await solo.evaluate(() => document.fonts.ready);
        const got = await solo.evaluate(layoutOf);
        const frame = await solo.evaluate(() => { const b = document.querySelector('.bleed'), c = document.querySelector('.card').getBoundingClientRect(); return { w: b.offsetWidth, h: b.offsetHeight, x: c.left, y: c.top, bg: getComputedStyle(b).backgroundColor }; });
        const g = groundOf(html), rgb = `rgb(${parseInt(g.slice(1, 3), 16)}, ${parseInt(g.slice(3, 5), 16)}, ${parseInt(g.slice(5, 7), 16)})`;
        const where = `sheet-${s + 1}-${side} slot ${i + 1}`;
        if (frame.w !== CW + 2 * BLEED || frame.h !== CH + 2 * BLEED || frame.x !== BLEED || frame.y !== BLEED) problems.push(`${where}: bleed face is ${frame.w}×${frame.h} with the card at ${frame.x},${frame.y}`);
        if (frame.bg !== rgb) problems.push(`${where}: bleed ground ${frame.bg}, card ground ${rgb}`);
        if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${where}: layout differs from the sheet (${got.findIndex((v, k) => v !== want[k])})`);
        faces++;
      }
    }
    assert.strictEqual(faces, 2 * CARDS);
    assert.deepStrictEqual(problems, []);
  } finally { await browser.close(); }
});

test('the singles export counts 72 cards: kit 8 × 2, HP tracker × 4, Came back × 6, own backs on the two references', () => {
  const { plan, manifestCsv } = require('../scripts/export-cards');
  const p = plan();
  assert.strictEqual(p.reduce((a, e) => a + e.quantity, 0), CARDS);
  assert.strictEqual(p.length, CARDS - 8 - 3 - 5); // kit, HP tracker and Came back copies share a front
  assert.deepStrictEqual(p.filter(e => e.type === 'kit').map(e => e.quantity), Array(8).fill(2));
  assert.strictEqual(p.find(e => e.id === 'hp_tracker').quantity, 4);
  assert.deepStrictEqual(p.filter(e => e.type === 'marker').map(e => [e.id, e.quantity]), [['marker_back', 6], ['marker_next', 1], ['marker_round', 1], ['marker_once', 1]]);
  assert.deepStrictEqual(p.filter(e => e.backFile !== 'card_back.png').map(e => e.id), ['ref_row', 'ref_fight']);
  assert.strictEqual(new Set(p.map(e => e.frontFile)).size, p.length);
  assert.strictEqual(manifestCsv(p).trim().split('\n').length, CARDS - 8 - 3 - 5 + 1);
});

test('a single renders at 825 × 1125 px (2.75 × 3.75 in at 300 dpi)', { skip: NO_CHROME }, async () => {
  const { renderFace, openPage, PX } = require('../scripts/export-cards');
  const { deck } = require('../deck/cards');
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  try {
    const png = await renderFace(await openPage(browser), deck()[0][0]);
    assert.deepStrictEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [825, 1125]);
    assert.deepStrictEqual(PX, [825, 1125]);
  } finally { await browser.close(); }
});

test('every mob card prints its hits for 1–4 analysts, matching the engine', () => {
  const D = require('../data/cards.json'), E = require('../src/engine')(D), { mob } = require('../deck/cards');
  for (const m of D.mobs) {
    const text = mob(m).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const want = [1, 2, 3, 4].map(n => `${n}p ${E.mobHits(m.hits, n)}`).join(' ');
    assert.ok(text.includes(`Hits ${want}`), `${m.name} should print "Hits ${want}"`);
    assert.ok(!/Hits 2p/.test(text), `${m.name} still prints the old 2p-only stat`);
  }
});

test('every boss card prints its hits for 1–4 analysts from bossAdd, and no per-analyst rule', () => {
  const D = require('../data/cards.json'), { boss } = require('../deck/cards');
  for (const b of D.bosses) {
    const text = boss(b).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const want = [1, 2, 3, 4].map(n => `${n}p ${b.hitsBase + D.bossAdd[n]}`).join(' ');
    assert.ok(text.includes(`Hits ${want}`), `${b.name} should print "Hits ${want}"`);
    assert.ok(!/per analyst/.test(text), `${b.name} still says per analyst`);
  }
});

test('every analyst card prints its perk and its agent link from data', () => {
  const D = require('../data/cards.json'), { analyst } = require('../deck/cards');
  const flat = s => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  for (const c of D.classes) {
    const text = flat(analyst(c));
    assert.ok(c.agent, `${c.name} has no agent link in data`);
    assert.ok(text.includes(flat(c.perk)) && text.includes('Agents ' + flat(c.agent)), `${c.name} should print its perk and agent link`);
  }
});

test('analyst cards print the perk numbers from data; bosses mark their row trigger as Full Shift; story cards say Advanced', () => {
  const D = require('../data/cards.json'), { analyst, boss, story } = require('../deck/cards');
  const flat = s => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const card = id => flat(analyst(D.classes.find(c => c.id === id)));
  assert.ok(card('HUN').includes(`+${D.perks.HUN.back} against mobs that came back`));
  assert.ok(card('RES').includes(`+${D.perks.RES.top} against the highest-damage mob`) && card('RES').includes(`Your +${D.perks.RES.top}`));
  assert.ok(card('PAT').includes(`heal ${D.perks.PAT.fight} HP split`) && card('PAT').includes(`You heal ${D.perks.PAT.fight} after every fight`));
  for (const b of D.bosses) assert.match(flat(boss(b)), /Full Shift: [^.]*row\./, `${b.name} should lead its row trigger with "Full Shift:"`);
  for (const s of D.situations.filter(x => x.story)) assert.ok(flat(story(s)).includes('Advanced · Full Shift'), `${s.name} should carry the Advanced tag`);
});


test('pass 11 on print: no Pack mark anywhere, Guard on the fight card, Second wind on the marker, the First Shift comeback', () => {
  const D = require('../data/cards.json'), C = require('../deck/cards');
  const flat = s => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  for (const m of D.mobs) assert.ok(!/>Pack</.test(C.mob(m)), `${m.name} still carries a PACK chip`);
  assert.ok(!/Pack/.test(flat(C.glossary())), 'the Mob keywords card still mentions Pack');
  assert.ok(flat(C.fight()).includes(`Guard A crew die showing ${D.guard.min}+ can guard instead of hitting: you block this round.`));
  const once = flat(C.oncePerFight());
  assert.ok(once.includes('Once per shift') && once.includes('Don’t clear') && once.includes(`Second wind The first time anyone drops to ${D.secondWind.at} HP or less`));
  const fs1 = flat(C.firstshift()), first = D.mobs.find(m => m.id === D.intro.deck[0]).name.replace(/^MFA /, '');
  assert.ok(fs1.includes(`Flip ${D.intro.comeback} Don’t roll for the row. The ${first} comes back`) && fs1.includes(`Start at ${D.hp.intro[1]} HP each`));
});
