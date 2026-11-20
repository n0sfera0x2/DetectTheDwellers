// Detect the Dwellers: the pixel sprites (PixelLab, 2026-11-20). Every analyst, alarm, boss and item has a
// 5-frame idle loop: sprites/<id>.png is a horizontal sheet (frame 0 is the still, 1–4 the PixelLab animation),
// stitched from the raw frames in sprites/src/<id>_f0..f4.png. sprites/prompts.json keeps what made each one.
//
// The page and the PDF read the same CSS: one class per sprite (.spr-<id>) carries its sheet once, and .spr steps
// through the frames. Print shows frame 0 (no motion on paper); so does prefers-reduced-motion.
//
// Usage: node game/art/sprites.js            restitch every sheet from sprites/src (needs Playwright)
//        require('./sprites').IDS / .css()   the ids that have a sprite, and the CSS block
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'sprites'), SRC = path.join(DIR, 'src'), FRAMES = 5;

/** The ids that have a sheet (analyst class ids, mob ids, boss ids, item ids), sorted. */
const IDS = fs.readdirSync(DIR).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).sort();

/**
 * The sprite CSS: the shared .spr rules plus one background per sheet, inlined as data URIs.
 * A .spr is a square, centred in whatever art box holds it, as tall as the box.
 */
function css() {
  // background-size 500%: position p% shows frame 4p (0%, 25% … 100%). The loop ping-pongs, 0 1 2 3 4 3 2 1, so a
  // last frame that drifts from the first (a fading shield, a stamp coming down) never snaps back.
  const seq = [...Array(FRAMES).keys(), ...[...Array(FRAMES - 2).keys()].map(k => FRAMES - 2 - k)];
  const keys = seq.map((f, i) => `${+(i * 100 / seq.length).toFixed(3)}%{background-position:${f * 100 / (FRAMES - 1)}% 0}`).join('');
  const base = `.spr{display:block;position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);height:100%;aspect-ratio:1;background-repeat:no-repeat;background-size:${FRAMES * 100}% 100%;background-position:0 0;image-rendering:pixelated;animation:spr-play ${seq.length * .15}s steps(1,end) infinite}
*:has(>.spr){position:relative;background:radial-gradient(circle at 50% 62%,#16303A 0,#07060A 72%)}
@keyframes spr-play{${keys}}
@media (prefers-reduced-motion:reduce){.spr{animation:none}}
@media print{.spr{animation:none}}`;
  return base + '\n' + IDS.map(id => `.spr-${id}{background-image:url(data:image/png;base64,${fs.readFileSync(path.join(DIR, id + '.png')).toString('base64')})}`).join('\n');
}

/** Stitch sprites/src/<id>_f0..f4.png into sprites/<id>.png, for every id with frames. */
async function stitch() {
  const { chromium } = require('playwright');
  const ids = [...new Set(fs.readdirSync(SRC).map(f => (f.match(/^(.+)_f0\.png$/) || [])[1]).filter(Boolean))].sort();
  const b = await chromium.launch(), p = await b.newPage();
  for (const id of ids) {
    const frames = [...Array(FRAMES).keys()].map(k => 'data:image/png;base64,' + fs.readFileSync(path.join(SRC, `${id}_f${k}.png`)).toString('base64'));
    const url = await p.evaluate(async fr => {
      const ims = await Promise.all(fr.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
      const c = document.createElement('canvas'); c.width = ims[0].width * ims.length; c.height = ims[0].height;
      const x = c.getContext('2d'); ims.forEach((im, k) => x.drawImage(im, k * im.width, 0)); return c.toDataURL('image/png');
    }, frames);
    fs.writeFileSync(path.join(DIR, id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
  console.log(`stitched ${ids.length} sheets into game/art/sprites/`);
}

module.exports = { IDS, css, FRAMES };
if (require.main === module) stitch().catch(e => { console.error(e); process.exit(1); });
