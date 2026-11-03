// Chapter dice prototype: Ink & Static scenes for the five consumable item cards (cons_*), drawn with the
// shared ink-kit in the hand of the kit_* familiars (tools/ink/crew/scenes.js). Cyan spot throughout.
// Writes art.json next to this file as a flat { key: svg } object.
// Usage: node prototypes/chapter-dice/art/scenes.js
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../../../tools/ink/ink-kit');
const { CYAN, PAPER, soft, rot } = kit;
const INK = '#07060A';
const n1 = v => (Math.round(v * 10) / 10).toString();

// ---------- shared helpers (the crew batch's lens, keyline, monitor, altar and torch) ----------
const lens = (x, y, r, paperRing = true) => (paperRing ? `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r + 2)}" fill="${PAPER}"/>` : '')
  + `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r + 1.1)}" fill="${INK}"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${CYAN}"/><circle cx="${n1(x - r * .25)}" cy="${n1(y - r * .25)}" r="${n1(r * .32)}" fill="${INK}"/>`;
const cy = (d, w = 1.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n1(w * 2.1)}"/><path d="${d}" fill="none" stroke="${CYAN}" stroke-width="${w}"/>`;
function monitor(k, x, y, w, h, { b = 4, neck = true } = {}) {
  k.add(k.fill(k.shape([[x, y + 1], [x + w / 2, y - 1.4], [x + w, y + .6], [x + w + 1.4, y + h / 2], [x + w, y + h], [x + w / 2, y + h + 1.2], [x - .4, y + h], [x - 1.4, y + h / 2]], { wob: .4, tension: .6 })));
  const i = { x: x + b, y: y + b, w: w - 2 * b, h: h - 2 * b };
  k.add(k.fill(k.shape([[i.x, i.y + .6], [i.x + i.w / 2, i.y - .6], [i.x + i.w, i.y + .4], [i.x + i.w + .8, i.y + i.h / 2], [i.x + i.w, i.y + i.h], [i.x + i.w / 2, i.y + i.h + .6], [i.x, i.y + i.h], [i.x - .8, i.y + i.h / 2]], { wob: .3, tension: .6 }), 'paper'));
  if (neck) { const cx = x + w / 2, yb = y + h; k.add(k.fill(k.shape([[cx - 4, yb], [cx + 4, yb], [cx + 7, yb + 7], [cx - 7, yb + 7]], { wob: .3, tension: .5 }))); }
  return i;
}
function altar(k, x0, x1, y, { lip = true, drips = 4 } = {}) {
  k.add(k.fill(k.shape([[x0, y + 1], [(x0 + x1) / 2, y - .6], [x1, y + .8], [x1 + 1, y + 16], [x1 + 2, 114], [x0 - 2, 114], [x0 - 1, y + 16]], { wob: .5, tension: .7 })));
  if (lip) k.add(k.brush([[x0 + 2, y + .4], [(x0 + x1) / 2, y - .5], [x1 - 2, y + .6]], { w: 1.1, tone: 'paper', tip0: .2, tip1: .2 }));
  if (drips) k.add(k.drips(x0 + 3, x1 - 3, y + 1.6, drips, { len: [3, 8], w: 1.2, tone: 'paper' }));
}
function torch(k, x, y, fy, { r = [22, 120], a = [0, 360], sy = .85, fr = [8, 130], fa = [-10, 190], step = 4.6 } = {}) {
  k.add(k.glow({ x, y, r, a, sy, step, clip: { x: 0, y: 0, w: 200, h: fy }, w: [.15, 2.2] }));
  k.add(k.glow({ x, y: fy - 2, r: fr, a: fa, sy: .3, step: step + .6, clip: { x: 0, y: fy, w: 200, h: 112 - fy }, w: [.2, 1.8] }));
  k.add(k.brush([[0, fy + .4], [70, fy - .4], [140, fy + .3], [200, fy - .2]], { w: 1.6, tip0: .5, tip1: .5 }));
}

// A die: a paper cube face with an ink keyline and ink pips, tilted by ang. hot: an ink face with cyan pips.
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
function die(k, x, y, s, ang, v, { hot = false, kw = 1.4 } = {}) {
  const face = k.shape(rot(soft(x - s / 2, y - s / 2, s, s, s * .24), x, y, ang), { wob: .2, tension: .9 });
  let g = k.fill(face, hot ? 'ink' : 'paper', hot ? ` stroke="${PAPER}" stroke-width="${n1(kw * .7)}"` : ` stroke="${INK}" stroke-width="${kw}"`);
  const o = s * .27, pr = s * .095;
  g += rot(PIPS[v].map(([a, b]) => [x + a * o, y + b * o]), x, y, ang).map(([px, py]) => `<circle cx="${n1(px)}" cy="${n1(py)}" r="${n1(pr)}" fill="${hot ? CYAN : INK}"/>`).join('');
  return g;
}
// Motion: short tapered streaks trailing behind a flying object, away from direction (dx, dy).
const trail = (k, x, y, dx, dy, n = 3, L = 10) => { const m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m; return Array.from({ length: n }, (_, i) => { const o = (i - (n - 1) / 2) * 3.2, sx = x - uy * o - ux * 6, sy = y + ux * o - uy * 6; return [[[sx - ux * L, sy - uy * L], [sx, sy]], { w: .9, tip0: .02, tip1: .5, per: 2 }]; }); };

// =====================================================================================
// Surge Playbook: the binder flung open on the altar, three dice bursting out of its pages.
// =====================================================================================
function surge(key) {
  const k = kit.scene({ key, seed: 211, spot: CYAN });
  torch(k, 24, 40, 84, { r: [18, 130], a: [-90, 90], sy: .85, fr: [8, 140], fa: [-10, 70], step: 4.8 });
  altar(k, -4, 204, 78, { drips: 5 });
  const s = monitor(k, 2, 18, 34, 38, { b: 3.4 });
  k.add(k.staticNoise({ x: s.x, y: s.y, w: s.w, h: s.h }, 4, { sw: .5 }));
  // The binder: an ink cover splayed flat, two paper pages fanned up off the rings.
  k.add(k.tendrils([[[60, 84], [34, 100], { sag: 3, curl: 2, w: 1.6, tip: .3, thorns: 1 }]]));
  k.add(k.shadow(58, 138, 78, 24, 40, { len: 30, spread: .3, sy: .3 }));
  const cover = k.shape([[48, 77], [96, 69], [100, 73], [148, 68], [156, 78], [100, 83], [46, 81]], { wob: .5, tension: .7 });
  k.add(k.fill(cover, 'ink', ` stroke="${PAPER}" stroke-width="1.2"`));
  const left = k.shape([[54, 73], [68, 56], [86, 50], [97, 58], [97, 71], [82, 68], [58, 75]], { wob: .4 });
  const right = k.shape([[99, 58], [112, 49], [130, 49], [148, 64], [140, 73], [116, 69], [99, 71]], { wob: .4 });
  k.add(k.fill(left, 'paper', ` stroke="${INK}" stroke-width="2"`), k.hatch(left, { a: 60, gap: 1.8, bend: 2, w: [.2, 1.2], broken: .3, cover: [.7, 1] }));
  k.add(k.fill(right, 'paper', ` stroke="${INK}" stroke-width="2"`), k.hatch(right, { a: -60, gap: 1.8, bend: -2, w: [1.2, .2], broken: .3, cover: [0, .28] }));
  // A flying page caught mid-flip.
  const flip = k.shape([[100, 58], [96, 40], [104, 30], [112, 36], [110, 52]], { wob: .4 });
  k.add(k.fill(flip, 'paper', ` stroke="${INK}" stroke-width="1.8"`));
  // Play lines on the pages, the one being run in cyan.
  k.add(k.brushes([[[[70, 66], [80, 62], [90, 61]], { w: 1.1, per: 2 }], [[[74, 69], [84, 65.6], [92, 65]], { w: 1.1, per: 2 }], [[[106, 58], [118, 57], [128, 60]], { w: 1.1, per: 2 }], [[[104, 66], [116, 64.6], [126, 66]], { w: 1.1, per: 2 }], [[[101, 46], [106, 44]], { w: 1, per: 2 }], [[[101, 50], [107, 48.6]], { w: 1, per: 2 }]]));
  k.add(cy('M104 61.6Q115 60 130 63.6', 1.2));
  // Rings at the spine.
  k.add(`<g fill="none" stroke="${INK}" stroke-width="1.6"><ellipse cx="98" cy="58" rx="2.4" ry="3"/><ellipse cx="98" cy="64" rx="2.4" ry="3"/><ellipse cx="98" cy="70" rx="2.4" ry="3"/></g>`);
  // The burst: three dice spilling up and out of the gutter, the lead one hot.
  k.add(k.brushes([[[[98, 56], [112, 40], [130, 26]], { w: 1.2, tip0: .02, tip1: .02 }], [[[96, 54], [88, 34], [80, 16]], { w: 1, tip0: .02, tip1: .02 }], [[[100, 54], [136, 46], [152, 44]], { w: 1, tip0: .02, tip1: .02 }]]));
  k.add(k.brushes([...trail(k, 140, 20, 1, -.6), ...trail(k, 76, 12, -.3, -1), ...trail(k, 162, 42, 1, -.1, 2)]));
  k.add(die(k, 140, 20, 15, 22, 6), die(k, 76, 13, 13, -16, 3), die(k, 164, 44, 14, 8, 5, { hot: true }));
  k.add(k.stipple(150, 98, 40, 6, 10, { size: .8 }));
  return k.svg();
}

// =====================================================================================
// Threat Intel Feed: an antenna spire pours signal down into the screen; ticker tape spills out of it,
// and eyes open everywhere in the dark.
// =====================================================================================
function intel(key) {
  const k = kit.scene({ key, seed: 221, spot: CYAN });
  torch(k, 100, 62, 88, { r: [20, 80], sy: .85, fr: [8, 100], step: 4.8 });
  altar(k, 50, 150, 84, { drips: 3 });
  const s = monitor(k, 78, 50, 44, 30, { b: 3.4, neck: false });
  // A feed scrolling on the screen.
  k.add(k.brushes([0, 1, 2, 3].map(i => [[[s.x + 2, s.y + 4 + i * 5.4], [s.x + 8 + ((i * 7) % 16), s.y + 4 + i * 5.4]], { w: 1.2, tip0: .6, tip1: .4, per: 2 }])));
  // The antenna spire behind the screen, its mast a twisted cable.
  k.add(k.tendrils([[[100, 50], [100, 14], { sag: 0, curl: 1.5, w: 3.4, tip: .5, segs: 3 }]]));
  k.add(k.brushes([[[[100, 30], [90, 24], [84, 26]], { w: 1.6, tip0: 1, tip1: .1 }], [[[100, 30], [110, 24], [116, 26]], { w: 1.6, tip0: 1, tip1: .1 }], [[[100, 22], [93, 18]], { w: 1.4, tip0: 1, tip1: .1 }], [[[100, 22], [107, 18]], { w: 1.4, tip0: 1, tip1: .1 }]]));
  // Signal pouring in: concentric broken arcs around the tip.
  const arcs = [];
  for (let i = 0; i < 3; i++) { const R = 9 + i * 7; [-1, 1].forEach(sd => arcs.push([[[100 + sd * R * .5, 14 - R * .82], [100 + sd * R * .92, 14 - R * .3], [100 + sd * R, 14 + R * .25]], { w: 1.6 - i * .2, tip0: .1, tip1: .1, per: 3 }])); }
  k.add(k.brushes(arcs));
  k.add(lens(100, 12, 2.8));
  // Ticker tape spilling out of the screen in loops, across the altar and down to the floor.
  const tape = [[[122, 66], [140, 62], [154, 70], [150, 80], [162, 88], [184, 92], [196, 104]], [[78, 70], [60, 64], [46, 72], [52, 84], [36, 94], [12, 102]]];
  tape.forEach(p => k.add(k.brush(p, { w: 6, tip0: 1, tip1: 1, per: 4 }), k.brush(p, { w: 3.6, tone: 'paper', tip0: 1, tip1: 1, per: 4 })));
  k.add(k.brushes(tape.flatMap(p => k.sample(p, false, 4).filter((_, i) => i % 3 === 1).map(([x, y]) => [[[x - 1.2, y], [x + 1.2, y]], { w: .9, tip0: 1, tip1: 1, per: 1 }]))));
  // Eyes everywhere: lenses in the dark corners and along the feed.
  [[18, 16, 2.6], [40, 34, 2], [168, 14, 2.8], [186, 40, 2], [150, 30, 1.8], [24, 54, 1.8], [62, 20, 1.6], [138, 12, 1.6]].forEach(([x, y, r]) => k.add(lens(x, y, r)));
  k.add(lens(146, 72, 2.4, false), lens(50, 76, 2.4, false));
  k.add(k.stipple(100, 102, 70, 6, 10, { size: .8 }));
  return k.svg();
}

// =====================================================================================
// Isolation Script: a terminal on the altar runs the cut; giant shears snip the cables to the alarm's
// cabinet, and a die drops from every severed line.
// =====================================================================================
function isolate(key) {
  const k = kit.scene({ key, seed: 231, spot: CYAN });
  torch(k, 34, 44, 86, { r: [20, 120], a: [-90, 90], sy: .85, fr: [8, 130], fa: [-10, 60], step: 4.8 });
  altar(k, -4, 64, 74, { drips: 2 });
  const s = monitor(k, 6, 22, 52, 40, { b: 4 });
  // The script: a prompt and a kill line, the run mark in cyan.
  k.add(k.brushes([[[[s.x + 3, s.y + 5], [s.x + 6, s.y + 7.4], [s.x + 3, s.y + 9.8]], { w: 1.2, tip0: .5, tip1: .5, per: 2 }], [[[s.x + 9, s.y + 7.4], [s.x + 24, s.y + 7.4]], { w: 1.2, tip0: .6, tip1: .4, per: 2 }],
    [[[s.x + 3, s.y + 14], [s.x + 18, s.y + 14]], { w: 1.2, tip0: .6, tip1: .4, per: 2 }], [[[s.x + 3, s.y + 19], [s.x + 14, s.y + 19]], { w: 1.2, tip0: .6, tip1: .4, per: 2 }]]));
  k.add(cy(`M${s.x + 3} ${s.y + 25}h${s.w - 10}`, 1.3));
  k.add(k.staticNoise({ x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 }, 3, { sw: .5 }));
  // The alarm's cabinet in the dark at the right: a chipped arch niche, two flare-less eyes gone dim.
  k.add(k.fill(k.shape([[160, 86], [159, 34], [166, 18], [178, 8], [190, 18], [197, 34], [198, 86]], { wob: .6, chip: .25, tension: .8 }), 'ink', ` stroke="${PAPER}" stroke-width=".8"`));
  k.add(`<path d="M171 40h.1M185 40h.1M171 52h.1M178 52h.1M185 64h.1" stroke="${PAPER}" stroke-width="1.6"/>`);
  // Three cables from the screen to the cabinet, each cut in the middle; the severed ends curl away.
  const lines = [[30, 98, 40], [58, 112, 56], [86, 126, 70]];
  const ends = [];
  lines.forEach(([y0, xc, yc], i) => {
    ends.push([[60, 30 + i * 12], [xc - 6, yc - 6], { sag: 8, curl: 2, w: 2.6, tip: .7, thorns: i === 1 ? 1 : 0 }]);
    ends.push([[xc + 8, yc - 10 + i * 2], [160, 40 + i * 12], { sag: 6, curl: 2, w: 2.6, tip: 1 }]);
  });
  k.add(k.tendrils(ends));
  // Sparks at each cut: short paper-gapped ink ticks.
  k.add(k.brushes(lines.flatMap(([, xc, yc], i) => [0, 1, 2, 3].map(j => { const a = j * 1.6 + i, L = 3 + j % 2 * 2; return [[[xc + 1 + Math.cos(a) * 2, yc - 8 + i + Math.sin(a) * 2], [xc + 1 + Math.cos(a) * (2 + L), yc - 8 + i + Math.sin(a) * (2 + L)]], { w: .9, tip0: 1, tip1: .02, per: 2 }]; }))));
  // A die falls from every cut, down to the floor.
  k.add(k.brushes([...trail(k, 96, 70, .2, 1, 2, 7), ...trail(k, 118, 84, .2, 1, 2, 7), ...trail(k, 140, 96, .1, 1, 2, 7)]));
  k.add(die(k, 96, 72, 11, 18, 2), die(k, 118, 86, 11, -12, 4), die(k, 140, 98, 11, 30, 1));
  // The shears: two ink blades crossed over the middle cable, a paper rim on each, a cyan pivot.
  const P = [112, 48];
  k.add(k.fill(k.shape([[P[0] - 4, P[1] + 2], [P[0] + 30, P[1] - 18], [P[0] + 36, P[1] - 22], [P[0] + 30, P[1] - 14], [P[0] + 2, P[1] + 4]], { wob: .3, tension: .6 }), 'ink', ` stroke="${PAPER}" stroke-width="1.1"`));
  k.add(k.fill(k.shape([[P[0] - 2, P[1] - 4], [P[0] + 30, P[1] + 10], [P[0] + 38, P[1] + 12], [P[0] + 30, P[1] + 15], [P[0] - 4, P[1] + 2]], { wob: .3, tension: .6 }), 'ink', ` stroke="${PAPER}" stroke-width="1.1"`));
  k.add(`<g fill="none" stroke="${PAPER}" stroke-width="4.4"><ellipse cx="${P[0] - 12}" cy="${P[1] + 9}" rx="6.4" ry="4.4"/><ellipse cx="${P[0] - 13}" cy="${P[1] - 8}" rx="6" ry="4.4"/></g>`);
  k.add(`<g fill="none" stroke="${INK}" stroke-width="2.6"><ellipse cx="${P[0] - 12}" cy="${P[1] + 9}" rx="6.4" ry="4.4"/><ellipse cx="${P[0] - 13}" cy="${P[1] - 8}" rx="6" ry="4.4"/></g>`);
  k.add(k.brushes([[[[P[0] - 3, P[1] - 1], [P[0] - 7, P[1] - 5]], { w: 3, tip0: 1, tip1: 1 }], [[[P[0] - 3, P[1] + 1], [P[0] - 7, P[1] + 6]], { w: 3, tip0: 1, tip1: 1 }]]));
  k.add(lens(P[0], P[1], 2.2));
  k.add(k.stipple(150, 102, 44, 6, 10, { size: .8 }));
  return k.svg();
}

// =====================================================================================
// Shift Coffee: a steaming mug on the altar; the steam curls up into the monitor's glow.
// =====================================================================================
function coffee(key) {
  const k = kit.scene({ key, seed: 241, spot: CYAN });
  torch(k, 150, 40, 80, { r: [24, 120], sy: .85, fr: [8, 130], fa: [100, 210], step: 4.8 });
  altar(k, 10, 210, 76, { drips: 5 });
  const s = monitor(k, 124, 8, 56, 50, { b: 4.4 });
  // The crew's vitals: three hearts, the steam reaching them; filled ones in cyan on ink.
  [[s.x + 10, s.y + 15, true], [s.x + s.w / 2, s.y + 15, true], [s.x + s.w - 10, s.y + 15, false]].forEach(([x, y, full]) => {
    const d = `M${n1(x)} ${n1(y + 5)}C${n1(x - 7)} ${n1(y)} ${n1(x - 5)} ${n1(y - 5)} ${n1(x)} ${n1(y - 2)}C${n1(x + 5)} ${n1(y - 5)} ${n1(x + 7)} ${n1(y)} ${n1(x)} ${n1(y + 5)}Z`;
    k.add(`<path d="${d}" fill="${full ? CYAN : PAPER}" stroke="${INK}" stroke-width="1.8"/>`);
  });
  k.add(k.brush([[s.x + 3, s.y + 30], [s.x + 14, s.y + 30], [s.x + 18, s.y + 24], [s.x + 22, s.y + 35], [s.x + 26, s.y + 30], [s.x + s.w - 3, s.y + 30]], { w: 1.3, tip0: .4, tip1: .4, per: 2 }));
  k.add(k.staticNoise({ x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 }, 3, { sw: .5 }));
  // Clutter on the altar: a keyboard edge and a cable down to the floor.
  k.add(k.fill(k.shape([[118, 72], [150, 71], [178, 72], [179, 75.6], [150, 76], [117, 75.6]], { wob: .3, tension: .5 }), 'ink', ` stroke="${PAPER}" stroke-width=".7"`));
  k.add(k.tendrils([[[60, 90], [30, 106], { sag: 3, curl: 2, w: 1.6, tip: .3, thorns: 1 }], [[150, 66], [176, 104], { sag: 4, curl: 2, w: 1.4, tip: .3 }]]));
  // The mug: a big chipped ink mug, lit rim on the screen side, a hatched shadow side, a handle.
  k.add(k.shadow(62, 104, 76, 150, 40, { len: 30, spread: .3, sy: .3 }));
  const mug = k.shape([[62, 40], [82, 37], [102, 40], [101, 60], [98, 74], [82, 77], [66, 74], [63, 60]], { wob: .5, chip: .2 });
  k.add(k.fill(mug), k.hatch(mug, { a: 90, gap: 2, bend: 3, w: [1, .3], tone: 'paper', broken: .5, cover: [0, .26] }));
  k.add(k.rim(mug, { from: .1, to: .38, w: 1.2 }));
  k.add(`<path d="M99 47c13-3 16 13 0 17" fill="none" stroke="${PAPER}" stroke-width="9"/><path d="M99 47c13-3 16 13 0 17" fill="none" stroke="${INK}" stroke-width="6"/>`);
  // The coffee's surface: a paper ellipse with an ink pool.
  k.add(`<ellipse cx="82" cy="39.4" rx="20" ry="4.6" fill="${PAPER}"/><ellipse cx="82" cy="40" rx="17" ry="3.2" fill="${INK}"/>`);
  // The mug's sigil: a cyan cross on an ink plate.
  k.add(`<circle cx="82" cy="58" r="7.4" fill="${PAPER}"/><circle cx="82" cy="58" r="6" fill="${INK}"/><path d="M82 54v8M78 58h8" stroke="${CYAN}" stroke-width="2.4"/>`);
  // Steam rising off the cup and curling toward the screen: ink wisps over the lit wall.
  k.add(k.brushes([[[[72, 34], [68, 26], [74, 18], [70, 10], [80, 4], [100, 6], [118, 14]], { w: 2.6, tip0: .4, tip1: .02 }], [[[82, 33], [86, 26], [80, 20], [88, 14], [104, 16], [118, 22]], { w: 2.2, tip0: .4, tip1: .02 }],
    [[[92, 34], [96, 28], [92, 24], [104, 24], [118, 30]], { w: 1.8, tip0: .4, tip1: .02 }]]));
  k.add(k.stipple(100, 100, 80, 6, 12, { size: .8 }));
  return k.svg();
}

// =====================================================================================
// Change Freeze: the change board on the wall, chained and padlocked, frosted over; icicles hang from
// the board and the altar.
// =====================================================================================
function freeze(key) {
  const k = kit.scene({ key, seed: 251, spot: CYAN });
  torch(k, 176, 50, 84, { r: [16, 150], a: [90, 270], sy: .85, fr: [8, 150], fa: [110, 190], step: 4.8 });
  altar(k, 150, 206, 76, { drips: 0 });
  monitor(k, 160, 34, 40, 34, { b: 3.4 });
  k.add(k.staticNoise({ x: 164, y: 38, w: 32, h: 26 }, 4, { sw: .5 }));
  // The board: a paper calendar sheet hung on the wall, an ink header, a grid of days.
  const B = { x: 44, y: 12, w: 100, h: 62 };
  const board = k.shape(soft(B.x, B.y, B.w, B.h, 3), { wob: .4, tension: .9 });
  k.add(k.fill(board, 'paper', ` stroke="${INK}" stroke-width="2"`));
  k.add(k.fill(k.shape(soft(B.x, B.y, B.w, 12, 3), { wob: .3, tension: .9 })));
  k.add(`<path d="M${B.x + 22} ${B.y - 3}v7M${B.x + B.w - 22} ${B.y - 3}v7" stroke="${PAPER}" stroke-width="4"/><path d="M${B.x + 22} ${B.y - 3}v7M${B.x + B.w - 22} ${B.y - 3}v7" stroke="${INK}" stroke-width="2.2"/>`);
  // Grid lines are screen content, so they may be straight; the struck days are crossed out.
  let grid = '';
  for (let c = 1; c < 6; c++) grid += `M${n1(B.x + c * B.w / 6)} ${B.y + 13}v${B.h - 14}`;
  for (let r = 1; r < 4; r++) grid += `M${B.x + 1} ${n1(B.y + 12 + r * (B.h - 12) / 4)}h${B.w - 2}`;
  k.add(`<path d="${grid}" stroke="${INK}" stroke-width=".8"/>`);
  const cw = B.w / 6, rh = (B.h - 12) / 4;
  k.add(k.brushes([[0, 0], [1, 0], [2, 1], [4, 2], [5, 3], [0, 3]].map(([c, r]) => [[[B.x + c * cw + 3, B.y + 12 + r * rh + 3], [B.x + (c + 1) * cw - 3, B.y + 12 + (r + 1) * rh - 3]], { w: 1.2, tip0: .5, tip1: .5, per: 2 }])));
  // Frost creeping in from the corners: hatched crusts on the board.
  const frost1 = k.shape([[B.x, B.y + 30], [B.x + 14, B.y + 44], [B.x + 28, B.y + 56], [B.x + 30, B.y + B.h], [B.x, B.y + B.h]], { wob: 1 });
  const frost2 = k.shape([[B.x + B.w, B.y + 12], [B.x + B.w - 18, B.y + 18], [B.x + B.w - 10, B.y + 30], [B.x + B.w, B.y + 34]], { wob: 1 });
  k.add(k.hatch(frost1, { a: -50, gap: 1.6, bend: 2, w: [.3, .9], broken: .6 }), k.hatch(frost2, { a: 50, gap: 1.6, bend: 2, w: [.9, .3], broken: .6 }));
  // Chains across the board in an X, heavy ink links with a paper gap.
  const chain = (a, b) => { const p = k.sample([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 4], b], false, 6); return p.map(([x, y], i) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="3.2" ry="1.9" transform="rotate(${n1(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + (i % 2 ? 90 : 0))} ${n1(x)} ${n1(y)})"/>`).join(''); };
  const links = chain([B.x - 2, B.y + 4], [B.x + B.w + 2, B.y + B.h + 2]) + chain([B.x + B.w + 2, B.y + 4], [B.x - 2, B.y + B.h + 2]);
  k.add(`<g fill="none" stroke="${PAPER}" stroke-width="3.4">${links}</g><g fill="none" stroke="${INK}" stroke-width="1.6">${links}</g>`);
  // The padlock where the chains cross: shackle, ink body with a paper rim, a cyan keyhole.
  const L = [B.x + B.w / 2, B.y + B.h / 2 + 6];
  k.add(k.brush([[L[0] - 7, L[1] - 4], [L[0] - 7, L[1] - 14], [L[0], L[1] - 19], [L[0] + 7, L[1] - 14], [L[0] + 7, L[1] - 4]], { w: 6.4, tone: 'paper', tip0: 1, tip1: 1, per: 3 }));
  k.add(k.brush([[L[0] - 7, L[1] - 4], [L[0] - 7, L[1] - 14], [L[0], L[1] - 19], [L[0] + 7, L[1] - 14], [L[0] + 7, L[1] - 4]], { w: 3.6, tip0: 1, tip1: 1, per: 3 }));
  const lock = k.shape(soft(L[0] - 12, L[1] - 6, 24, 20, 4), { wob: .3, tension: .9 });
  k.add(k.fill(lock, 'ink', ` stroke="${PAPER}" stroke-width="1.4"`), k.hatch(lock, { a: 90, gap: 1.8, bend: 2, w: [.9, .2], tone: 'paper', broken: .5, cover: [.7, 1] }));
  k.add(`<circle cx="${L[0]}" cy="${L[1] + 2}" r="2.6" fill="${CYAN}"/><path d="M${L[0]} ${L[1] + 3}v5" stroke="${CYAN}" stroke-width="2.2"/>`);
  // Icicles: tapered paper spikes off the board's lower edge, and off the altar lip.
  const ice = [50, 58, 64, 76, 90, 104, 114, 126, 136].map((x, i) => [[x, B.y + B.h + 1], [x + .4, B.y + B.h + 6 + (i % 3) * 3 + 3]]);
  k.add(k.brushes(ice.map((p, i) => [p, { w: 5.4 - (i % 2) * .8, tip0: 1, tip1: .3, per: 2 }])), k.brushes(ice.map((p, i) => [p, { w: 2.8 - (i % 2) * .8, tip0: 1, tip1: .02, per: 2 }]), 'paper'));
  k.add(k.brushes([154, 162, 170, 180, 188, 196].map((x, i) => [[[x, 77], [x, 82 + (i % 3) * 3]], { w: 2.4, tip0: 1, tip1: .02, per: 2 }]), 'paper'));
  // Frost on the floor and snow in the air.
  k.add(k.stipple(100, 98, 90, 10, 18, { size: .9 }), k.stipple(30, 40, 26, 34, 14, { size: 1 }));
  return k.svg();
}

const art = { cons_surge: surge('cons_surge'), cons_intel: intel('cons_intel'), cons_isolate: isolate('cons_isolate'), cons_coffee: coffee('cons_coffee'), cons_freeze: freeze('cons_freeze') };
fs.writeFileSync(path.join(__dirname, 'art.json'), JSON.stringify(art, null, 1) + '\n');
console.log(Object.fromEntries(Object.entries(art).map(([k, v]) => [k, (v.length / 1024).toFixed(1) + ' KB'])));
module.exports = art;
