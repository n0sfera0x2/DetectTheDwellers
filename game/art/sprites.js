// Detect the Dwellers: the pixel sprites (PixelLab, since 2026-11-20). Every analyst, alarm, boss, item and situation
// has an idle loop; the hero, the card back and the three win rooms are animated scenes; die_roll is the dice tumble.
// sprites/<id>.png is a horizontal sheet (frame 0 is the still, then the PixelLab animation), stitched from the raw
// frames in sprites/src/<id>_f0..fN.png. sprites/meta.json records each sheet's frame count and frame size;
// sprites/prompts.json keeps what made each one.
//
// The page and the PDF read the same CSS: one class per sprite (.spr-<id>) carries its sheet once, and .spr steps
// through the frames. Characters and icons sit centred at the art box's full height; scenes (.cover) fill the box,
// cropped like a background photo. Idle loops ping-pong; the die roll plays forward. Print and
// prefers-reduced-motion show frame 0.
//
// Usage: node game/art/sprites.js            restitch every sheet from sprites/src (needs Playwright)
//        require('./sprites').IDS / .css()   the ids that have a sprite, and the CSS block
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'sprites'), SRC = path.join(DIR, 'src'), META = path.join(DIR, 'meta.json');

/** Scenes fill their box (cover); everything else is a character or icon centred at full height. */
const SCENES = ['hero', 'back', 'win_wyrm', 'win_apt', 'win_ai'];
/** Sprites that play straight through instead of ping-ponging. */
const FORWARD = ['die_roll'];
/** Seconds per frame: idle loops, and the die roll. */
const FRAME_S = .15, ROLL_S = .06;
/** Frames in an idle loop (the still plus four). */
const FRAMES = 5;

const meta = () => fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : {}; // {} before the first stitch
/** The ids that have a sheet, sorted. */
const IDS = Object.keys(meta()).sort();

/** The frame order a sheet of n frames plays in: forward, or ping-pong (0 1 2 3 4 3 2 1). */
const order = (id, n) => FORWARD.includes(id) ? [...Array(n).keys()] : [...Array(n).keys(), ...[...Array(Math.max(0, n - 2)).keys()].map(k => n - 2 - k)];

/**
 * The sprite CSS: the shared .spr rules, one keyframes block per playback shape, and one rule per sheet (its image,
 * frame count, aspect ratio and loop), inlined as data URIs.
 */
function css() {
  const M = meta(), shapes = new Map();
  const rules = IDS.map(id => {
    const { frames: n, w, h } = M[id], fwd = FORWARD.includes(id), seq = order(id, n), key = `spr-${fwd ? 'f' : 'p'}${n}`;
    if (!shapes.has(key)) shapes.set(key, `@keyframes ${key}{${seq.map((f, i) => `${+(i * 100 / seq.length).toFixed(3)}%{background-position:${n > 1 ? f * 100 / (n - 1) : 0}% 0}`).join('')}}`);
    const dur = +(seq.length * (fwd ? ROLL_S : FRAME_S)).toFixed(2);
    return `.spr-${id}{background-image:url(data:image/png;base64,${fs.readFileSync(path.join(DIR, id + '.png')).toString('base64')});background-size:${n * 100}% 100%;aspect-ratio:${w}/${h};animation-name:${key};animation-duration:${dur}s}`;
  });
  const base = `.spr{display:block;position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);height:100%;background-repeat:no-repeat;background-position:0 0;image-rendering:pixelated;animation-timing-function:steps(1,end);animation-iteration-count:infinite}
.spr.cover{top:50%;bottom:auto;transform:translate(-50%,-50%);height:auto;width:auto;min-width:100%;min-height:100%}
*:has(>.spr){position:relative;background:radial-gradient(circle at 50% 62%,#16303A 0,#07060A 72%)}
*:has(>.spr.cover){background:#07060A}
@media (prefers-reduced-motion:reduce){.spr{animation:none}}
@media print{.spr{animation:none}}`;
  return [base, ...shapes.values(), ...rules].join('\n');
}

/** The markup for one sprite (scenes carry .cover), or '' when there's no sheet. */
const html = id => IDS.includes(id) ? `<i class="spr spr-${id}${SCENES.includes(id) ? ' cover' : ''}"></i>` : '';

/** Stitch sprites/src/<id>_f0..fN.png into sprites/<id>.png, for every id with frames, and write meta.json. */
async function stitch() {
  const { chromium } = require('playwright');
  const ids = [...new Set(fs.readdirSync(SRC).map(f => (f.match(/^(.+)_f0\.png$/) || [])[1]).filter(Boolean))].sort();
  const b = await chromium.launch(), p = await b.newPage(), M = {};
  for (const id of ids) {
    const files = []; for (let k = 0; fs.existsSync(path.join(SRC, `${id}_f${k}.png`)); k++) files.push(path.join(SRC, `${id}_f${k}.png`));
    const frames = files.map(f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
    const r = await p.evaluate(async fr => {
      const ims = await Promise.all(fr.map(s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = s; })));
      const c = document.createElement('canvas'); c.width = ims[0].width * ims.length; c.height = ims[0].height;
      const x = c.getContext('2d'); ims.forEach((im, k) => x.drawImage(im, k * im.width, 0));
      return { url: c.toDataURL('image/png'), w: ims[0].width, h: ims[0].height };
    }, frames);
    fs.writeFileSync(path.join(DIR, id + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
    M[id] = { frames: files.length, w: r.w, h: r.h };
  }
  await b.close();
  fs.writeFileSync(META, JSON.stringify(M, null, 1) + '\n');
  console.log(`stitched ${ids.length} sheets into game/art/sprites/`);
}

module.exports = { IDS, css, html, FRAMES, SCENES, FORWARD };
if (require.main === module) stitch().catch(e => { console.error(e); process.exit(1); });
