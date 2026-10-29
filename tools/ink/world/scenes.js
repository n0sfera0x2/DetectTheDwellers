// WORLD batch: situations, domain places and fallbacks, drawn with the lead's ink-kit.
// Usage: node scenes.js  -> writes ink-art.json { art: {...}, print: {} } and prints sizes.
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../ink-kit');
const { FLARE, CYAN, AMBER, INK, PAPER, soft, rot } = kit;
const KL = (w = .8) => ` stroke="${INK}" stroke-width="${w}"`;
const f1 = n => (Math.round(n * 10) / 10).toString();

// ---------------------------------------------------------------- shared helpers
// The torch on the wall: a pool of paper light round (x, y), clipped above the floor/desk line.
const wallLight = (k, x, y, r, floor, o = {}) => k.add(k.glow({ x, y, r: [o.r0 || r * .28, r], a: o.a || [0, 360], sy: o.sy || .85, step: o.step || 4.8, clip: { x: 0, y: 0, w: 200, h: floor }, w: [.15, 2.2] }));
// The desk or floor under it: squashed rings, clipped below the line, and the line itself as a brush.
function deskLight(k, x, y, r, floor, o = {}) {
  k.add(k.glow({ x, y: o.cy || floor - 2, r: [o.r0 || 12, r], a: o.a || [-10, 190], sy: o.sy || .42, step: o.step || 4.6, clip: { x: 0, y: floor, w: 200, h: 112 - floor }, w: [.15, 2] }));
  k.add(k.brush([[0, floor + .4], [60, floor - .4], [130, floor + .4], [200, floor - .2]], { w: 1.8, tip0: .5, tip1: .5 }));
}
// A monitor: bowed ink bezel, paper screen, a neck to the desk. Returns the screen box.
function monitor(k, x, y, w, h, foot, b = 4.5) {
  if (foot) { const cx = x + w / 2; k.add(k.fill(k.shape([[cx - 4, y + h], [cx + 4, y + h], [cx + 9, foot], [cx - 9, foot]], { wob: .3, tension: .5 }))); }
  k.add(k.fill(k.shape([[x, y + 1], [x + w / 2, y - 1.2], [x + w, y + .5], [x + w + 1.5, y + h / 2], [x + w, y + h], [x + w / 2, y + h + 1], [x, y + h], [x - 1.5, y + h / 2]], { wob: .4, tension: .6 })));
  const sx = x + b, sy = y + b, sw = w - 2 * b, sh = h - 2 * b;
  k.add(k.fill(k.shape([[sx, sy + .5], [sx + sw / 2, sy - .8], [sx + sw, sy + .5], [sx + sw + 1, sy + sh / 2], [sx + sw, sy + sh], [sx + sw / 2, sy + sh + .8], [sx, sy + sh], [sx - 1, sy + sh / 2]], { wob: .3, tension: .6 }), 'paper'));
  return { x: sx, y: sy, w: sw, h: sh };
}
// Screen rows: short ink strokes (screen content may be straight).
const rows = (k, x, y, n, gap, len, w = 1.6) => k.brushes(Array.from({ length: n }, (_, i) => { const L = len[0] + k.R() * (len[1] - len[0]); return [[[x, y + i * gap], [x + L / 2, y + i * gap + k.r(.2)], [x + L, y + i * gap]], { w, tip0: .5, tip1: .3, per: 3 }]; }));
// A pointed-arch window, dark panes with rain, mullions rim-lit from the side the light is on.
function archWindow(k, x, y, w, h, side = 1, n = 26) {
  const arch = (x, y, w, h) => [[x, y + h], [x, y + w * .55], [x + w * .14, y + w * .2], [x + w / 2, y], [x + w * .86, y + w * .2], [x + w, y + w * .55], [x + w, y + h]];
  const outer = k.shape(arch(x - 3, y - 3, w + 6, h + 5), { wob: .5, tension: .7, chip: .2 }), inner = k.shape(arch(x, y, w, h), { wob: .3, tension: .7 });
  k.add(k.fill(outer), k.rain({ x: x + 2, y: y + w * .25, w: w - 6, h: h - w * .25 - 2 }, n, { slant: .2, len: [3, 8], sw: .5, op: .8 }));
  k.add(k.rim(inner, side > 0 ? { from: .5, to: .9, w: 1 } : { from: .02, to: .4, w: 1 }));
  k.add(k.brushes([[[[x + w / 2, y + 1], [x + w / 2 + k.r(.4), y + h / 2], [x + w / 2, y + h]], { w: 1.6, tip0: 1, tip1: 1 }], [[[x, y + h * .52], [x + w / 2, y + h * .5], [x + w, y + h * .52]], { w: 1.4, tip0: 1, tip1: 1 }]], 'ink'));
  k.add(k.brushes([[[[x + w / 2 + side * 1.2, y + 3], [x + w / 2 + side * 1.2, y + h - 1]], { w: 1, tip0: .2, tip1: .2 }], [[[x + 2, y + h * .52 - 1.2], [x + w - 2, y + h * .52 - 1.2]], { w: .9, tip0: .2, tip1: .2 }]], 'paper'));
  k.add(k.brush([[x - 6, y + h + 2], [x + w / 2, y + h + 1], [x + w + 6, y + h + 2.4]], { w: 3.4, tip0: .4, tip1: .4 }), k.drips(x - 4, x + w + 4, y + h + 3, 4, { len: [3, 7], w: 1.2 }));
}
// A soft device (pager, phone, badge, printer face) rotated about its centre.
const dev = (k, x, y, w, h, a, c, tone = 'ink', extra = '') => k.fill(k.shape(rot(soft(x - w / 2, y - h / 2, w, h, c), x, y, a), { wob: .2, tension: .9 }), tone, extra);
// An envelope (the lead's): paper body, ink keyline, ink flap, optional flare seal.
function envelope(k, x, y, w, h, a, seal) {
  const s = k.shape(rot(soft(x, y, w, h, 1.2), x + w / 2, y + h / 2, a), { wob: .3, tension: .8 });
  return k.fill(s, 'paper', KL(.8))
    + k.brush(rot([[x + .8, y + .8], [x + w / 2, y + h * .62], [x + w - .8, y + .8]], x + w / 2, y + h / 2, a), { w: .9, tip0: .4, tip1: .4, per: 3 })
    + (seal ? (() => { const [[sx, sy]] = rot([[x + w / 2, y + h * .62]], x + w / 2, y + h / 2, a); return `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="1.8" fill="${FLARE}"${KL(.5)}/>`; })() : '');
}
// A mug: ink body, handle, paper lip on the lit side.
function mug(k, x, y, lit = -1) {
  k.add(k.fill(k.shape([[x - 5.5, y - 13], [x, y - 13.6], [x + 5.5, y - 13], [x + 5, y], [x, y + .8], [x - 5, y]], { wob: .3, tension: .6 })));
  k.add(k.brush([[x - lit * 5, y - 10], [x - lit * 9.5, y - 8.5], [x - lit * 9.4, y - 4], [x - lit * 5, y - 3]], { w: 1.8, tip0: .7, tip1: .7 }));
  k.add(k.brush([[x - 5, y - 13.2], [x, y - 13.8], [x + 5, y - 13.2]], { w: .9, tone: 'paper', tip0: .2, tip1: .2 }), k.brush([[x + lit * 4.4, y - 11], [x + lit * 4, y - 1]], { w: 1, tone: 'paper', tip0: .1, tip1: .1 }));
}
const finish = (k, cx, cy, rx, ry, n = 14) => { k.add(k.stipple(cx, cy, rx, ry, n, { size: .8 })); return k.svg(); };

// ================================================================ SITUATIONS
// Impossible Travel: the scrying map. Home pin, a ghost-trail arc, the Lisbon pin in flare. An hourglass, a badge.
function travel(key) {
  const k = kit.scene({ key, seed: 201, spot: FLARE });
  deskLight(k, 100, 60, 104, 62, { sy: .5, r0: 20 });
  k.add(k.tendrils([[[56, 30], [30, 64], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[146, 26], [176, 64], { sag: 7, curl: 2, w: 1.5, tip: .4, thorns: 1 }]]));
  const s = monitor(k, 50, 5, 100, 54, 64);
  // Continents, inked onto the glass.
  const land = [[[58, 17], [68, 13.5], [80, 15], [86, 19], [80, 26], [74, 29], [70, 35], [64, 30], [58, 23]], [[72, 37], [79, 38], [81, 44], [77, 53], [73, 50], [70.5, 43]],
    [[108, 15], [118, 12.5], [125, 16], [121, 22], [114, 24], [109, 21]], [[109, 28], [122, 27], [129, 33], [126, 44], [120, 52], [115, 43], [108, 34]], [[127, 14], [141, 13], [143, 27], [134, 25], [128, 20]]];
  k.add(`<path d="${land.map(p => k.shape(p, { wob: .4 }).d).join('')}" fill="${INK}"/>`);
  k.add(k.staticNoise({ x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 }, 7, { sw: .45 }));
  // The trail: a dashed ghost-arc, and paper wisps rising off the glass above Lisbon.
  k.add(`<path d="M73 21.5Q92 3 110.5 19" fill="none" stroke="${PAPER}" stroke-width="3.6"/><path d="M73 21.5Q92 3 110.5 19" fill="none" stroke="${INK}" stroke-width="1.3" stroke-dasharray="2.6 2"/>`);
  k.add(`<circle cx="72.6" cy="22.6" r="2.6" fill="${PAPER}"${KL(1.2)}/><circle cx="72.6" cy="22.6" r=".9" fill="${INK}"/>`);
  k.add(`<path d="M111 22.6c-2.6-3.6-3.8-5.4-3.8-7.2a3.8 3.8 0 0 1 7.6 0c0 1.8-1.2 3.6-3.8 7.2z" fill="${FLARE}"${KL(1)}/><circle cx="111" cy="15.4" r="1.2" fill="${INK}"/>`);
  k.add(k.buzz(111, 16, 4, { w: .8, rings: 1 }));
  k.add(k.smoke(84, 4, 4, { n: 2, sway: 3, w: 1 }), k.smoke(118, 4, 4, { n: 2, sway: 3, w: 1 }));
  // Keyboard on the desk.
  k.add(k.fill(k.shape([[78, 68], [100, 67.2], [122, 68], [123, 75], [100, 75.6], [77, 75]], { wob: .3, tension: .5 })), k.stipple(100, 71.4, 20, 2.4, 18, { size: .7, bias: .6 }));
  // The hourglass: ten minutes running out. Paper glass, ink sand, posts as brushes.
  k.add(k.shadow(158, 176, 86, 100, 40, { len: 26, spread: .5, sy: .3 }));
  k.add(k.fill(k.oval(167, 86, 11, 2.6, { n: 8 })), k.fill(k.oval(167, 56, 10, 2.2, { n: 8 })));
  const glass = k.shape([[160, 58], [174, 58], [173, 64], [168.4, 71], [173, 78], [174, 84], [160, 84], [161, 78], [165.6, 71], [161, 64]], { wob: .2, tension: .8 });
  k.add(k.fill(glass, 'paper', KL(1)), k.fill(k.shape([[161.6, 83.4], [163, 79], [167, 76.5], [171, 79], [172.4, 83.4]], { wob: .2 })), k.fill(k.shape([[162.4, 61], [171.6, 61], [168, 67], [166, 67]], { wob: .2 })));
  k.add(k.brushes([[[[167, 67], [167, 76]], { w: .7, tip0: .5, tip1: .5 }], [[[158.6, 57], [158, 71], [158.6, 85]], { w: 2, tip0: 1, tip1: 1 }], [[[175.4, 57], [176, 71], [175.4, 85]], { w: 2, tip0: 1, tip1: 1 }]]));
  k.add(k.hatch(glass, { a: 90, gap: 1.8, bend: 3, w: [.2, 1.1], cover: [.7, 1], broken: .3 }));
  // The badge left on the desk, its lanyard snaking back to the monitor's foot.
  k.add(k.tendril([46, 80], [90, 64], { sag: 7, curl: 3, w: 1.3, tip: .5 }));
  k.add(dev(k, 38, 82, 12, 16, -18, 2, 'paper', KL(1)), `<g transform="rotate(-18 38 82)">${k.fill(k.oval(38, 79, 2.8, 3.2, { n: 7 }))}${k.brush([[34, 86], [42, 86]], { w: 1, per: 2 })}</g>`);
  k.add(k.shadow(30, 46, 90, 100, 40, { len: 14, spread: .4, sy: .2 }));
  return finish(k, 100, 104, 90, 6, 16);
}

// Coffee Run: a pulp tray of four cold brews, a dripping umbrella, rain on the window. Amber straws.
function coffee(key) {
  const k = kit.scene({ key, seed: 202, spot: AMBER });
  wallLight(k, 156, 38, 96, 66, { r0: 26 });
  deskLight(k, 150, 64, 100, 66, { sy: .38 });
  k.add(k.tendrils([[[150, 50], [128, 72], { sag: 4, curl: 2, w: 1.4, tip: .4, thorns: 1 }], [[178, 46], [196, 80], { sag: 8, curl: 2, w: 1.5, tip: .3, thorns: 1 }]]));
  const s = monitor(k, 134, 12, 52, 40, 68);
  k.add(rows(k, s.x + 4, s.y + 5, 5, 5.4, [10, 22], 1.5), k.staticNoise({ x: s.x + 1, y: s.y + 2, w: s.w - 2, h: s.h - 4 }, 4, { sw: .45 }));
  // The tray: a moulded pulp carrier, its rim catching the light.
  k.add(k.shadow(66, 132, 78, 160, 30, { len: 40, spread: .5, sy: .25 }));
  const tray = k.shape([[64, 66], [80, 64], [100, 65.4], [120, 64], [134, 66], [132, 76], [100, 78], [67, 76]], { wob: .5, chip: .2 });
  k.add(k.fill(tray), k.rim(tray, { from: .02, to: .32, w: 1.1 }));
  // Four cups: dark with cold brew, paper lids, condensation running down, straws up into the light.
  const straws = [], tips = [], drops = [];
  [76, 91, 106, 121].forEach((x, i) => {
    const top = 34 + (i % 2) * 2.5, lean = (i - 1.5) * 1.2;
    k.add(k.fill(k.shape([[x - 6.5 + lean, top], [x + lean, top - .6], [x + 6.5 + lean, top], [x + 5, 70], [x, 70.8], [x - 5, 70]], { wob: .3, tension: .7 })));
    k.add(k.fill(k.shape([[x - 7.4 + lean, top + .6], [x - 6 + lean, top - 3.6], [x + lean, top - 4.6], [x + 6 + lean, top - 3.6], [x + 7.4 + lean, top + .6]], { wob: .2, tension: .7 }), 'paper', KL(.9)));
    const sx = x + lean + 1, a = [[sx, top - 3], [sx + 2 + i, top - 14], [sx + 3.6 + i * 1.6, top - 23]];
    straws.push([a, { w: 2.8, tip0: 1, tip1: 1 }]); tips.push([[a[1], a[2]], { w: 1.2, tip0: 1, tip1: 1 }]);
    drops.push([[[x + 3.5 + lean * .6, top + 6], [x + 3.2, top + 14 + k.R() * 10]], { w: .9, tip0: .9, tip1: .02 }], [[[x - 3 + lean * .6, top + 4], [x - 2.6, top + 10 + k.R() * 12]], { w: .7, tip0: .9, tip1: .02 }]);
  });
  k.add(k.brushes(drops, 'paper'), k.stipple(98, 50, 26, 12, 14, { size: .9 }));
  // An umbrella leaning on the desk, still dripping into a puddle.
  k.add(k.brushes([[[[50, 104], [56, 80], [61, 60], [62, 54]], { w: 7, w0: .4, w1: 1, tip0: .02, tip1: .8 }], [[[62, 55], [63, 49], [67, 48], [69, 51]], { w: 2, tip0: 1, tip1: .6 }]]));
  k.add(k.brushes([[[[54, 96], [58.6, 76], [61, 62]], { w: .9, tip0: .1, tip1: .1 }]], 'paper'), k.drips(48, 54, 104, 3, { len: [2, 5], w: 1 }));
  k.add(k.fill(k.oval(48, 106.5, 14, 2.2, { n: 9 }), 'paper', KL(.6)), k.brush([[38, 106.4], [58, 106.6]], { w: .6 }));
  k.add(k.brushes(straws), k.brushes(tips, 'spot'));
  return finish(k, 90, 100, 80, 7, 14);
}

// Marketing Blast: the mail queue spews envelopes; they pile on the desk and take wing like bats.
function blast(key) {
  const k = kit.scene({ key, seed: 203, spot: FLARE });
  deskLight(k, 100, 54, 110, 56, { sy: .52, r0: 18, a: [0, 180] });
  k.add(k.tendrils([[[62, 24], [36, 58], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[138, 30], [168, 58], { sag: 6, curl: 2, w: 1.5, tip: .4, thorns: 1 }]]));
  const s = monitor(k, 60, 4, 80, 46, 0);
  // The queue: every row an envelope glyph with a flare seal, then a red-hot line.
  const marks = [], lines = [], seals = [];
  for (let i = 0; i < 6; i++) { const y = s.y + 4 + i * 5.6; marks.push(`M${s.x + 3} ${f1(y - 1.6)}h5.6v3.4h-5.6zM${s.x + 3} ${f1(y - 1.6)}l2.8 2 2.8-2`); lines.push([[[s.x + 12, y], [s.x + 30, y + k.r(.3)], [s.x + 18 + 22 + k.R() * 22, y]], { w: 1.6, tip0: .5, tip1: .2, per: 3 }]); seals.push(`M${s.x + 5.8} ${f1(y + .4)}h.1`); }
  k.add(`<path d="${marks.join('')}" fill="none" stroke="${INK}" stroke-width=".8"/>`, k.brushes(lines), `<path d="${seals.join('')}" stroke="${FLARE}" stroke-width="2"/>`);
  k.add(k.staticNoise({ x: s.x, y: s.y + 1, w: s.w, h: s.h - 2 }, 5, { sw: .45 }));
  // The scream: vibration arcs off both sides of the screen.
  k.add(k.buzz(100, 26, 44, { tone: 'paper', w: 1.2, rings: 2 }));
  // A flood of envelopes pours over the bezel's lip and piles on the desk.
  k.add(k.shadow(64, 140, 96, 100, 40, { len: 14, spread: .4, sy: .5 }));
  k.add(k.fill(k.shape([[62, 96], [76, 82], [92, 72], [108, 70], [126, 78], [140, 94], [100, 99]], { wob: .6 })));
  let pile = '';
  [[68, 84, 15, 10, -24, 0], [86, 86, 16, 10, 12, 1], [104, 84, 15, 10, -8, 0], [122, 86, 16, 10, 20, 0], [76, 74, 14, 9, 28, 0], [96, 70, 15, 10, -14, 1], [114, 72, 14, 9, 8, 0], [90, 58, 13, 8.5, -30, 0], [104, 56, 13, 8.5, 18, 0], [98, 48, 12, 8, -6, 1], [130, 92, 13, 8, 34, 0], [56, 92, 13, 8, -38, 0]].forEach(([x, y, w, h, a, seal]) => { pile += envelope(k, x - w / 2, y - h / 2, w, h, a, seal); });
  k.add(pile);
  // Some take wing: an envelope body with ink bat-wings, flapping off into the dark.
  // Some take wing: an envelope body with paper bat-wings (ink ribs), flapping off into the dark.
  let wings = '', ribs = [], bats = '';
  [[34, 22, -18, 1], [166, 16, 14, 1.1], [22, 50, 10, .8], [180, 46, -12, .85]].forEach(([x, y, a, sc]) => {
    const w = 10 * sc, h = 6.4 * sc;
    [-1, 1].forEach(sd => {
      const X = t => x + sd * w * t;
      wings += k.shape([[X(.3), y - h * .2], [X(.9), y - h * 1.3], [X(1.75), y - h * .7], [X(1.45), y + h * .05], [X(1.15), y - h * .2], [X(.9), y + h * .3], [X(.6), y + h * .05]], { wob: .2, tension: .7 }).d;
      ribs.push([[[X(.4), y - h * .2], [X(.9), y - h * 1.1], [X(1.6), y - h * .66]], { w: .8 * sc, tip0: .6, tip1: .1 }], [[[X(.9), y - h * 1.1], [X(1.15), y - h * .2]], { w: .6 * sc, tip0: .4, tip1: .1 }]);
    });
    bats += envelope(k, x - w / 2, y - h / 2, w, h, a, 0);
  });
  k.add(`<path d="${wings}" fill="${PAPER}"/>`, k.brushes(ribs), bats);
  return finish(k, 100, 104, 90, 6, 16);
}

// Patch Tuesday: four bars crawling, one done in amber; the tower goes quiet; a tall window of rain; steam.
function patch(key) {
  const k = kit.scene({ key, seed: 204, spot: AMBER });
  wallLight(k, 50, 34, 104, 66, { r0: 30 });
  deskLight(k, 54, 64, 104, 66, { sy: .36 });
  archWindow(k, 116, 4, 62, 58, -1, 40);
  k.add(k.tendrils([[[30, 54], [12, 78], { sag: 5, curl: 2, w: 1.5, tip: .4, thorns: 1 }], [[74, 52], [92, 84], { sag: 8, curl: 3, w: 1.6, tip: .3, thorns: 2 }]]));
  const s = monitor(k, 16, 12, 66, 44, 69);
  // Four progress bars: ink trough, ink fill; the finished one in amber on its ink keyline.
  [[1, 1], [.62, 0], [.38, 0], [.18, 0]].forEach(([p, done], i) => {
    const y = s.y + 6 + i * 8, x0 = s.x + 4, L = s.w - 8;
    k.add(k.fill(k.shape(soft(x0, y - 2.4, L, 4.8, 1.6), { wob: .1, tension: .9 }), 'paper', KL(.9)));
    k.add(k.fill(k.shape(soft(x0 + 1, y - 1.4, Math.max(2, (L - 2) * p), 2.8, 1), { wob: .1, tension: .9 }), done ? 'spot' : 'ink', done ? KL(.6) : ''));
  });
  k.add(k.staticNoise({ x: s.x + 1, y: s.y + 1, w: s.w - 2, h: s.h - 2 }, 4, { sw: .45 }));
  // The steaming mug on the sill of the desk, its steam rising as ink into the lit wall.
  k.add(k.shadow(90, 104, 78, 50, 34, { len: 20, spread: .3, sy: .3 }));
  mug(k, 97, 78, -1);
  k.add(k.smoke(97, 62, 26, { n: 3, sway: 4, w: 1.3, tone: 'ink' }));
  // A pen and an unrolled change log on the desk.
  k.add(k.fill(k.shape([[24, 80], [52, 76], [56, 82], [52, 90], [26, 92], [22, 86]], { wob: .4 }), 'paper', KL(.9)), rows(k, 28, 82, 3, 3, [10, 18], 1));
  k.add(k.brush([[44, 96], [62, 88]], { w: 2.2, tip0: 1, tip1: .02 }));
  return finish(k, 100, 104, 90, 6, 12);
}

// CISO Wants a Briefing: five blank slides on the big screen; the phone on the desk lights up with a crown.
function ciso(key) {
  const k = kit.scene({ key, seed: 205, spot: FLARE });
  deskLight(k, 100, 54, 96, 56, { sy: .5, r0: 18, a: [0, 180] });
  k.add(k.tendrils([[[48, 24], [22, 58], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[152, 26], [180, 58], { sag: 6, curl: 2, w: 1.5, tip: .4, thorns: 1 }]]));
  const s = monitor(k, 40, 4, 120, 46, 60);
  // The deck: a title bar and five empty slides waiting, each a pale pane with an ink keyline.
  k.add(k.brush([[s.x + 4, s.y + 5], [s.x + 40, s.y + 4.6]], { w: 3, tip0: .4, tip1: .4 }), rows(k, s.x + 4, s.y + 10, 1, 0, [22, 30], 1.1));
  let sl = '';
  for (let i = 0; i < 5; i++) { const x = s.x + 4 + i * (s.w - 8) / 5; sl += k.fill(k.shape(soft(x + .8, s.y + 16, (s.w - 8) / 5 - 2.6, 15, 1.2), { wob: .2, tension: .9 }), 'paper', KL(1.1)); }
  k.add(sl, k.brushes([0, 1, 2, 3, 4].map(i => { const x = s.x + 7 + i * (s.w - 8) / 5; return [[[x, s.y + 20], [x + 8, s.y + 20]], { w: 1, per: 2 }]; })));
  k.add(k.staticNoise({ x: s.x, y: s.y + 1, w: s.w, h: s.h - 2 }, 6, { sw: .45 }));
  // The phone, close to us on the desk: a long shadow toward the viewer, a cord, a crown in a countdown ring.
  const px = 100, py = 80, a = -14;
  k.add(k.brush([[px, py], [px + 4, py + 14], [px + 10, py + 30]], { w: 22, tip0: 1, tip1: .4, nib: .05 }));
  k.add(k.tendril([px - 10, py + 8], [px - 40, py + 26], { sag: 6, curl: 3, w: 1.4, tip: .4 }));
  let g = `<g transform="rotate(${a} ${px} ${py})">` + dev(k, px, py, 26, 42, 0, 4.5);
  g += dev(k, px, py - 1, 19.5, 32, 0, 2, 'paper', ` stroke="${FLARE}" stroke-width="1.3"`);
  g += `<circle cx="${px}" cy="${py - 4}" r="7.4" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M${px} ${py - 11.4}a7.4 7.4 0 1 1-6.4 3.7" fill="none" stroke="${FLARE}" stroke-width="1.4"/>`;
  g += `<path d="M${px - 4.2} ${py - 1.6}l-.8-5.4 2.6 2.2 2.4-3.6 2.4 3.6 2.6-2.2-.8 5.4z" fill="${INK}"/>`;
  g += k.brushes([[[[px - 5, py + 8], [px + 5, py + 8]], { w: 1.4, per: 2 }], [[[px - 3.4, py + 11], [px + 3.4, py + 11]], { w: 1, per: 2 }]]) + k.buzz(px, py - 2, 13, { w: 1.1, rings: 2, tone: 'paper' });
  k.add(g + '</g>');
  // A clicker and a cold mug beside it.
  mug(k, 160, 76, 1);
  k.add(dev(k, 44, 74, 6, 16, 28, 2.6), `<circle cx="42.2" cy="69.6" r=".9" fill="${PAPER}"/>`);
  return finish(k, 100, 104, 90, 6, 12);
}

// Threat Intel Drop: the feed arrives (one row struck through, an amber check); the printer unrolls
// a scroll down to the floor; a raven, the messenger, waits on the printer.
function intel(key) {
  const k = kit.scene({ key, seed: 206, spot: AMBER });
  wallLight(k, 62, 32, 92, 62, { r0: 28 });
  deskLight(k, 66, 60, 96, 62, { sy: .4 });
  k.add(k.tendrils([[[30, 50], [10, 80], { sag: 5, curl: 2, w: 1.5, tip: .4, thorns: 1 }], [[94, 44], [122, 62], { sag: 5, curl: 2, w: 1.5, tip: .4, thorns: 1 }]]));
  const s = monitor(k, 24, 8, 74, 46, 67);
  // Download bar, then indicator rows; one row struck through with the amber check.
  k.add(k.fill(k.shape(soft(s.x + 3, s.y + 2.4, s.w - 6, 4, 1.4), { wob: .1, tension: .9 }), 'paper', KL(.8)), k.fill(k.shape(soft(s.x + 4, s.y + 3.2, (s.w - 8) * .72, 2.4, 1), { wob: .1, tension: .9 })));
  k.add(rows(k, s.x + 4, s.y + 12, 5, 5, [24, 44], 1.4));
  const ry = s.y + 12 + 2 * 5;
  k.add(k.brush([[s.x + 2, ry], [s.x + 52, ry - .4]], { w: 1.2, tip0: .2, tip1: .2 }));
  k.add(`<path d="M${s.x + 54} ${ry - .4}l2.6 2.8 5.4-6.4" fill="none" stroke="${INK}" stroke-width="3.4"/><path d="M${s.x + 54} ${ry - .4}l2.6 2.8 5.4-6.4" fill="none" stroke="${AMBER}" stroke-width="1.6"/>`);
  k.add(k.staticNoise({ x: s.x, y: s.y + 8, w: s.w, h: s.h - 10 }, 4, { sw: .45 }));
  // The printer: a squat ink hulk on the desk, its paper slot catching the light.
  k.add(k.shadow(116, 176, 62, 60, 30, { len: 30, spread: .4, sy: .3 }));
  const pr = k.shape([[116, 46], [146, 42], [176, 46], [178, 56], [176, 63], [146, 64], [114, 63], [113, 56]], { wob: .5, chip: .2 });
  k.add(k.fill(pr), k.rim(pr, { from: .62, to: 1, w: 1.1 }), k.brush([[124, 51], [144, 50], [164, 51]], { w: 1.8, tone: 'paper', tip0: .4, tip1: .4 }));
  k.add(`<circle cx="170" cy="58" r="1" fill="${PAPER}"/>`);
  // The printout: a long scroll out of the slot, over the desk's edge, curling on the floor.
  const sp = [[136, 51], [134, 60], [130, 70], [128, 82], [132, 94], [142, 102], [152, 100]];
  k.add(k.brush(sp, { w: 17, tip0: 1, tip1: 1, nib: .04 }), k.brush(sp, { w: 13.6, tone: 'paper', tip0: 1, tip1: 1, nib: .04 }));
  k.add(k.brushes([0, 1, 2, 3, 4, 5, 6].map(i => { const y = 60 + i * 5.4, x = 128 + Math.abs(y - 78) * .18; return [[[x - 3, y], [x + 4 + k.R() * 3, y]], { w: 1, per: 2 }]; })));
  k.add(k.fill(k.oval(153, 98, 5.4, 4.4, { n: 8 })), k.fill(k.oval(153, 98, 2.6, 2, { n: 7 }), 'paper'));
  // The raven, the messenger, perched on the monitor in profile: beak toward the screen, tail down its back.
  k.add('<g transform="translate(26 28.4) scale(1.3)">');
  const raven = k.shape([[78, 7], [82, 2], [88, 0], [93, 2], [96, 6], [102, 10], [108, 18], [98, 12], [90, 11], [82, 10]], { wob: .3 });
  k.add(k.fill(raven), k.brush([[79, 5], [74, 6.4], [70, 8.6]], { w: 2.8, tip0: 1, tip1: .02 }), k.brushes([[[[84, 10], [83, 13]], { w: 1.2 }], [[[89, 11], [89, 13.4]], { w: 1.2 }]]));
  k.add(k.brushes([[[[86, .4], [93, 2.4], [100, 9], [107, 17]], { w: .9, tip0: .1, tip1: .1 }]], 'paper'), `<circle cx="81.4" cy="4.4" r=".6" fill="${PAPER}"/>`, '</g>');
  return finish(k, 80, 100, 70, 7, 12);
}

// Pentest Day: a stranger in a hi-vis vest crouched in the server crypt, plugged into a rack niche,
// lit from below by their own laptop. The red-team badge on the lanyard is the flare.
function pentest(key) {
  const k = kit.scene({ key, seed: 207, spot: FLARE });
  wallLight(k, 128, 72, 100, 86, { r0: 16, a: [180, 360], sy: .9 });
  deskLight(k, 132, 84, 110, 86, { sy: .3, r0: 6, step: 5.6 });
  // Rack niches: pointed arches of the crypt, LED votives inside.
  const niche = (x, w, top) => [[x, 86], [x, top + w * .6], [x + w * .2, top + w * .2], [x + w / 2, top], [x + w * .8, top + w * .2], [x + w, top + w * .6], [x + w, 86]];
  [[4, 34, 4], [150, 34, 6], [60, 26, 10]].forEach(([x, w, top], i) => {
    const n = k.shape(niche(x - 3, w + 6, top - 4), { wob: .6, chip: .3 });
    k.add(k.fill(n));
    const inner = k.shape(niche(x + 3, w - 6, top + 4), { wob: .3 });
    k.add(k.fill(inner, 'paper'), k.hatch(inner, { a: 90, gap: 3.2, bend: 3, w: [2, .5], broken: 0, cover: i === 2 ? [0, .6] : i ? [0, .5] : [0, .6] }));
    let leds = '';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) if (k.R() < .4) leds += `M${f1(x + 7 + c * (w - 14) / 2)} ${f1(top + 20 + r * 9)}h1.4`;
    k.add(`<path d="${leds}" stroke="${INK}" stroke-width="2.6"/><path d="${leds}" stroke="${PAPER}" stroke-width="1"/>`);
  });
  k.add(k.drips(4, 196, 4, 4, { len: [3, 9], w: 1.4 }));
  // The laptop on the floor, screen facing the intruder: its back to us, a sliver of glare on its edge.
  k.add(k.tendrils([[[176, 70], [134, 86], { sag: 8, curl: 2, w: 1.6, tip: .5, thorns: 1 }], [[160, 60], [112, 92], { sag: 10, curl: 3, w: 1.2, tip: .4 }]]));
  k.add(k.fill(k.shape([[118, 88], [140, 88], [143, 92], [116, 92]], { wob: .2, tension: .6 })), k.fill(k.shape([[124, 70], [140, 72], [140, 88.6], [126, 88]], { wob: .3, tension: .6 })));
  k.add(k.brush([[123.6, 70.4], [125, 79], [125.6, 88]], { w: 1.4, tone: 'paper', tip0: .3, tip1: .3 }));
  // The intruder: a hard hat, a hunched back, one knee down; the vest's reflective bands blaze in the light.
  k.add(k.shadow(76, 118, 92, 128, 74, { len: 42, spread: .5, sy: .18 }));
  const back = k.shape([[86, 42], [100, 36], [112, 40], [118, 52], [120, 66], [116, 80], [112, 90], [92, 92], [80, 88], [76, 72], [78, 56]], { wob: .5 });
  k.add(k.fill(back), k.brushes([[[[84, 86], [72, 90], [68, 94]], { w: 9, tip0: 1, tip1: .5 }], [[[108, 84], [114, 92], [110, 94]], { w: 8, tip0: 1, tip1: .5 }]]));
  k.add(k.hatch(back, { a: 74, gap: 2.8, bend: -4, w: [.2, 1.4], tone: 'paper', broken: .35, cover: [.74, 1] }));
  // Vest bands: two paper chevrons wrapping the back, ink-keyed so they hold in greyscale.
  k.add(k.brushes([[[[80, 64], [96, 62], [110, 58], [119, 60]], { w: 3.4, tip0: .3, tip1: .6 }], [[[79, 76], [96, 75], [110, 72], [117.6, 74]], { w: 3.4, tip0: .3, tip1: .6 }], [[[100, 40], [104, 56], [106, 90]], { w: 2.6, tip0: .4, tip1: .4 }]], 'paper'));
  // Head and hard hat, the arm reaching to the keys.
  k.add(k.fill(k.oval(112, 33, 8, 7.4, { n: 9 })), k.fill(k.shape([[101, 30], [104, 22], [113, 19], [121, 23], [123, 30]], { wob: .3, tension: .8 })), k.brush([[98, 30.6], [112, 29.4], [126, 30.6]], { w: 2.4, tip0: .3, tip1: .3 }));
  k.add(k.brushes([[[[105, 21], [113, 19.4], [120, 23], [122.6, 29]], { w: 1.2, tip0: .1, tip1: .1 }], [[[119, 36], [120, 40]], { w: .9 }]], 'paper'));
  const arm = [[114, 48], [122, 60], [126, 72], [124, 80]];
  k.add(k.brush(arm, { w: 7, tone: 'paper', tip0: .6, tip1: .4 }), k.brush(arm, { w: 4.6, tip0: .8, tip1: .4 }));
  // The lanyard and the red-team badge, swinging from the chest.
  k.add(k.brush([[116, 40], [119, 50], [118, 56]], { w: .9, tone: 'paper', tip0: .3, tip1: .3 }));
  k.add(dev(k, 118, 60, 7, 9.6, 10, 1.6, 'spot', KL(1.2)), k.brush(rot([[116.4, 62.4], [119.6, 62.4]], 118, 60, 10), { w: .9, per: 2 }));
  return finish(k, 120, 100, 70, 6, 14);
}

// Budget Approved: the email says yes; the war chest stands open with two new familiars rising out,
// and the purchase order hangs over its lip with an amber wax seal.
function budget(key) {
  const k = kit.scene({ key, seed: 208, spot: AMBER });
  wallLight(k, 46, 30, 104, 60, { r0: 26 });
  deskLight(k, 60, 58, 110, 60, { sy: .42 });
  k.add(k.tendrils([[[20, 46], [6, 74], { sag: 5, curl: 2, w: 1.4, tip: .4, thorns: 1 }], [[70, 42], [86, 66], { sag: 4, curl: 2, w: 1.4, tip: .4 }]]));
  const s = monitor(k, 12, 8, 66, 42, 64);
  // The approval: a dialog with a big ink check and a button.
  const dlg = k.shape(soft(s.x + 6, s.y + 4, s.w - 12, s.h - 8, 2), { wob: .2, tension: .9 });
  k.add(k.fill(dlg, 'paper', KL(1.2)), `<path d="M${s.x + 12} ${s.y + 15}l4.4 4.6 9-10.4" fill="none" stroke="${INK}" stroke-width="3"/>`, rows(k, s.x + 30, s.y + 10, 3, 4, [12, 20], 1.2));
  k.add(k.fill(k.shape(soft(s.x + s.w - 30, s.y + s.h - 13, 20, 5.4, 2), { wob: .1, tension: .9 })));
  // The chest: an iron-banded war chest, lid thrown back, its shadow toward us.
  k.add(k.shadow(86, 162, 98, 46, 30, { len: 30, spread: .4, sy: .3 }));
  const lid = k.shape([[92, 62], [96, 46], [112, 38], [136, 37], [152, 42], [160, 58], [126, 60]], { wob: .5, chip: .2 });
  k.add(k.fill(lid), k.rim(lid, { from: .02, to: .3, w: 1.1 }));
  const box = k.shape([[86, 64], [124, 61], [162, 64], [161, 82], [158, 98], [124, 100], [90, 98], [87, 82]], { wob: .6, chip: .3 });
  k.add(k.fill(box), k.rim(box, { from: .72, to: .98, w: 1.2 }), k.hatch(box, { a: 90, gap: 2.4, bend: 4, w: [1.4, .2], tone: 'paper', broken: .4, cover: [0, .3] }));
  k.add(k.brushes([[[[86.6, 74], [124, 72], [161.4, 74]], { w: 1.2, tip0: .2, tip1: .2 }], [[[88, 90], [124, 89], [160, 90]], { w: 1, tip0: .2, tip1: .2 }]], 'paper'));
  k.add(k.fill(k.shape(soft(119, 69, 10, 9, 2), { wob: .2, tension: .9 }), 'paper', KL(1)), k.fill(k.oval(124, 73, 1.6, 2, { n: 6 })));
  // Two familiars rising out of it: round iron bodies, rotor wings, one paper lens each.
  [[108, 22, 8.4, 1], [142, 16, 7.4, -1]].forEach(([x, y, r, sd]) => {
    k.add(k.brushes([[[[x - r * 2.2, y - r * .9], [x, y - r * 1.3], [x + r * 2.2, y - r * .9]], { w: 1.6, tip0: .1, tip1: .1 }], [[[x, y - r], [x, y - r * 1.4]], { w: 1.4 }],
      [[[x - r * .5, y + r * .8], [x - r * .9, y + r * 1.8]], { w: 1.2, tip0: 1, tip1: .02 }], [[[x + r * .5, y + r * .8], [x + r * .9, y + r * 1.8]], { w: 1.2, tip0: 1, tip1: .02 }]]));
    const b = k.oval(x, y, r, r * .86, { n: 9 });
    k.add(k.fill(b, 'ink', ` stroke="${PAPER}" stroke-width=".8"`));
    k.add(`<circle cx="${x + sd * 2}" cy="${y}" r="${f1(r * .46)}" fill="${PAPER}"${KL(1.4)}/><circle cx="${x + sd * 2}" cy="${y}" r="${f1(r * .18)}" fill="${INK}"/>`);
  });
  // The purchase order draped over the front edge, sealed in amber wax.
  const po = k.shape([[134, 62], [152, 63], [154, 76], [151, 90], [138, 92], [136, 78]], { wob: .4, tension: .8 });
  k.add(k.fill(po, 'paper', KL(1)), rows(k, 139, 68, 4, 4, [8, 11], 1));
  k.add(k.fill(k.oval(145, 88, 5, 4.6, { n: 9, lump: .14 }), 'spot', KL(1.1)), k.brush([[143, 87], [147, 89]], { w: 1, per: 2 }), k.drips(142, 148, 92, 2, { len: [2, 4], w: 1.2, tone: 'spot' }));
  return finish(k, 100, 104, 90, 6, 12);
}

// ================================================================ DOMAINS (places)
// Identity: the keep's gate after hours. Elevator doors as a pointed-arch gate, turnstiles as posts
// with badge-reader sigils; one reader burns flare: denied.
function identity(key) {
  const k = kit.scene({ key, seed: 211, spot: FLARE });
  wallLight(k, 26, 70, 150, 88, { r0: 18, a: [-90, 30], sy: .9 });
  deskLight(k, 30, 88, 150, 90, { sy: .26, r0: 8, a: [-10, 60] });
  // Pillars lean in at the edges.
  k.add(k.fill(k.shape([[150, -4], [204, -4], [204, 116], [170, 116], [160, 50]], { wob: .6, chip: .2 })), k.brush([[150, -2], [160, 50], [170, 114]], { w: 1.2, tone: 'paper', tip0: .1, tip1: .5 }));
  // The gate: a tall pointed arch, two steel leaves with a seam, rivet rows, the floor sigil above.
  const arch = k.shape([[64, 90], [64, 34], [74, 16], [100, 4], [126, 16], [136, 34], [136, 90]], { wob: .6, tension: .8, chip: .2 });
  k.add(k.fill(arch));
  const leaves = k.shape([[70, 90], [70, 36], [79, 20], [100, 10], [121, 20], [130, 36], [130, 90]], { wob: .3, tension: .8 });
  k.add(k.fill(leaves, 'paper'), k.hatch(leaves, { a: 90, gap: 2.2, bend: 5, w: [.3, 1.8], broken: .3, cover: [.2, 1] }));
  k.add(k.brush([[100, 11], [100.4, 50], [100, 90]], { w: 2.2, tip0: 1, tip1: 1 }), k.brushes([[[[70, 50], [100, 49], [130, 50]], { w: 1.2, tip0: 1, tip1: 1 }]]));
  k.add(k.fill(k.oval(100, 26, 6, 6, { n: 9 }), 'paper', KL(1.4)), k.brush([[100, 26], [103, 22]], { w: 1.2 }));
  // Turnstiles: three organic posts with arms and reader heads.
  [[46, 0], [100, 1], [154, 0]].forEach(([x, deny]) => {
    k.add(k.shadow(x - 7, x + 7, 98, 26, 70, { len: 26, spread: .5, sy: .2 }));
    const post = k.shape([[x - 7, 68], [x - 5, 64], [x + 5, 64], [x + 7, 68], [x + 6, 98], [x - 6, 98]], { wob: .4, tension: .8 });
    k.add(k.fill(post), k.rim(post, { from: .74, to: .98, w: 1 }));
    k.add(k.brushes([[[[x + 6, 74], [x + 18, 76], [x + 26, 79]], { w: 2.2, tip0: 1, tip1: .5 }], [[[x - 6, 74], [x - 15, 77], [x - 20, 80]], { w: 2, tip0: 1, tip1: .5 }]]));
    k.add(dev(k, x, 60, 9, 8, 0, 2, 'paper', KL(1)), deny ? `<circle cx="${x}" cy="60" r="1.9" fill="${FLARE}"${KL(.6)}/>` : `<circle cx="${x}" cy="60" r="1.4" fill="${INK}"/>`);
  });
  // The reception terminal, the torch, at the left edge.
  k.add(k.fill(k.shape([[-2, 76], [14, 74], [24, 77], [24, 112], [-2, 112]], { wob: .4 })), k.fill(k.shape([[2, 56], [12, 54], [14, 74], [3, 75]], { wob: .3, tension: .6 })), k.fill(k.shape([[12, 54], [17, 57], [18, 72], [14, 74]], { wob: .2 }), 'paper'));
  k.add(k.tendrils([[[22, 80], [60, 100], { sag: 6, curl: 2, w: 1.3, tip: .3, thorns: 1 }]]));
  return finish(k, 100, 102, 90, 6, 16);
}

// Endpoint: one laptop on the altar, its glow the torch; a rain window; a cold mug.
function endpoint(key) {
  const k = kit.scene({ key, seed: 212, spot: AMBER });
  wallLight(k, 96, 50, 72, 72, { r0: 22 });
  deskLight(k, 96, 70, 96, 72, { sy: .36 });
  archWindow(k, 148, 6, 36, 46, -1, 20);
  // Cables root out of the laptop's back, over the altar and down its face.
  k.add(k.tendrils([[[84, 68], [44, 96], { sag: 6, curl: 3, w: 1.8, tip: .4, thorns: 2 }], [[110, 70], [148, 100], { sag: 8, curl: 3, w: 1.6, tip: .3, thorns: 2 }], [[96, 72], [96, 108], { sag: 0, curl: 3, w: 1.2, tip: .3 }]]));
  k.add(k.drips(10, 190, 73, 5, { len: [3, 8], w: 1.3 }));
  // The laptop: a lid of ink with its screen of paper, the base in perspective, an amber charge LED.
  const base = k.shape([[70, 71], [96, 70], [122, 71], [134, 82], [96, 84], [58, 82]], { wob: .3, tension: .6 });
  k.add(k.fill(base), k.brush([[59, 82.4], [96, 84.4], [133, 82.4]], { w: 1.3, tone: 'paper', tip0: .2, tip1: .2 }));
  k.add(k.fill(k.shape([[76, 33], [96, 31.4], [118, 33], [120, 52], [119, 72], [96, 73], [75, 72], [74, 52]], { wob: .4, tension: .6 })));
  const sc = k.shape([[79, 37], [96, 35.6], [115, 37], [116.4, 52], [115.6, 69], [96, 69.6], [79.4, 69], [78, 52]], { wob: .3, tension: .6 });
  k.add(k.fill(sc, 'paper'), `<path d="M83 43l3 2.4-3 2.4" fill="none" stroke="${INK}" stroke-width="1.3"/>`, rows(k, 89, 45.4, 1, 0, [5, 6], 1.4), rows(k, 83, 52, 3, 4.4, [12, 26], 1.2));
  k.add(k.staticNoise({ x: 80, y: 38, w: 34, h: 30 }, 5, { sw: .45 }), k.smoke(90, 33, 16, { n: 2, sway: 4, w: 1, tone: 'ink' }));
  k.add(k.stipple(96, 76.4, 26, 3, 20, { size: .8, bias: .6 }), `<circle cx="128" cy="80" r="1.1" fill="${AMBER}"${KL(.5)}/>`);
  // A cold mug at left, rim-lit from the screen.
  mug(k, 48, 72, 1);
  k.add(k.stipple(100, 100, 80, 8, 14, { size: .8 }));
  return k.svg();
}

// Network: the patch wall as an ossuary of ports; copper hangs like vines, fibre catches the light.
function network(key) {
  const k = kit.scene({ key, seed: 213, spot: AMBER });
  wallLight(k, 34, 86, 128, 96, { r0: 14, sy: 1 });
  deskLight(k, 34, 96, 140, 98, { sy: .22, r0: 6, a: [-20, 40] });
  // Two panels across the top: chipped ink shelves with port niches (paper), a few amber link lights.
  let ports = '', leds = '';
  [[4, 196, 8], [10, 190, 24]].forEach(([x0, x1, y], j) => {
    const pn = k.shape([[x0, y - 6], [100, y - 7], [x1, y - 6], [x1 + 1, y + 6], [100, y + 7], [x0 - 1, y + 6]], { wob: .5, chip: .4 });
    k.add(k.fill(pn), k.rim(pn, { from: .5, to: 1, w: .9 }));
    for (let x = x0 + 6; x < x1 - 4; x += 8) { ports += `M${f1(x)} ${f1(y - 1.4)}h3.2v3h-3.2z`; if (k.R() < .12) leds += `M${f1(x + 1.6)} ${f1(y - 4)}h.1`; }
  });
  k.add(`<path d="${ports}" fill="${PAPER}"/>`);
  // Copper: heavy loops sagging out of the ports, down past the light, roots on the floor.
  const L = [];
  for (let i = 0; i < 13; i++) { const x = 10 + i * 14 + k.r(3), y = i % 2 ? 26 : 10, x2 = x + k.r(26), y2 = 66 + k.R() * 36; L.push([[x + 1.6, y + 1], [x2, y2], { sag: 4, curl: 5, w: 2 + k.R() * 1.4, tip: .5, thorns: i % 4 === 0 ? 1 : 0, segs: 5 }]); }
  k.add(k.tendrils(L));
  // A few loops droop between panels like vines.
  k.add(k.tendrils([[[30, 12], [80, 26], { sag: 16, curl: 2, w: 1.6, tip: 1 }], [[120, 10], [170, 28], { sag: 20, curl: 2, w: 1.8, tip: 1 }], [[64, 28], [148, 28], { sag: 26, curl: 3, w: 2.2, tip: 1 }]]));
  // Fibre: hair-thin strands catching the light, across the dark side.
  k.add(k.brushes([[[[112, 28], [130, 56], [152, 72], [184, 84]], { w: .8, tip0: .1, tip1: .02 }], [[[140, 12], [156, 44], [176, 62], [198, 70]], { w: .7, tip0: .1, tip1: .02 }], [[[170, 28], [178, 52], [196, 60]], { w: .6, tip0: .1, tip1: .02 }]], 'paper'));
  k.add(`<path d="${leds}" stroke="${AMBER}" stroke-width="1.8"/>`);
  // The crash cart's console, the torch, low at left.
  k.add(k.fill(k.shape([[10, 98], [56, 96], [54, 112], [12, 112]], { wob: .4 })), k.fill(k.shape([[16, 70], [40, 67], [43, 95], [17, 96]], { wob: .3, tension: .6 })), k.fill(k.shape([[40, 67], [48, 71], [48, 91], [43, 95]], { wob: .2 }), 'paper'));
  return finish(k, 120, 106, 70, 4, 10);
}

// Cloud: the rack aisle as a nave. Pointed arches recede to a lit console at the far end; votive LEDs;
// the cable tray is the vault, cables hanging from its ribs; the floor holds one reflection.
function cloud(key) {
  const k = kit.scene({ key, seed: 214, spot: AMBER });
  // The far light down the aisle: a narrow pool on the floor running toward us.
  k.add(k.glow({ x: 100, y: 52, r: [6, 112], a: [0, 360], sy: .7, step: 4, clip: { x: 0, y: 0, w: 200, h: 60 }, w: [.15, 2.2] }));
  k.add(k.glow({ x: 100, y: 60, r: [4, 120], a: [20, 160], sy: .5, step: 4.4, clip: { x: 0, y: 60, w: 200, h: 52 }, w: [.15, 2] }));
  // Rack walls converging: ink masses, their inner edges lit.
  const lw = k.shape([[-4, -4], [64, -4], [86, 38], [88, 64], [62, 84], [-4, 116]], { wob: .6 }), rw = k.shape([[204, -4], [136, -4], [114, 38], [112, 64], [138, 84], [204, 116]], { wob: .6 });
  k.add(k.fill(lw), k.fill(rw), k.hatch(lw, { a: 62, gap: 2.4, bend: 3, w: [.2, 1.2], tone: 'paper', broken: .4, cover: [.0, .16] }), k.hatch(rw, { a: -62, gap: 2.4, bend: -3, w: [.2, 1.2], tone: 'paper', broken: .4, cover: [.84, 1] }));
  k.add(k.brushes([[[[62, -2], [86, 38], [88, 64], [62, 84]], { w: 1.4, tip0: .1, tip1: .3 }], [[[138, -2], [114, 38], [112, 64], [138, 84]], { w: 1.4, tip0: .1, tip1: .3 }]], 'paper'));
  // Niche arches on the rack faces, receding, with votive LED rows.
  let leds = '', amb = '';
  [[[0, 8, 34, 96, 28], [36, 20, 58, 76, 18], [62, 30, 80, 64, 10]], [[200, 8, 166, 96, 28], [164, 20, 142, 76, 18], [138, 30, 120, 64, 10]]].forEach(side => side.forEach(([x0, y0, x1, y1, w]) => {
    const m = (x0 + x1) / 2, sgn = x1 > x0 ? 1 : -1;
    k.add(k.brush([[x0 + sgn * 2, y1], [x0 + sgn * 2, y0 + w * .6], [m, y0], [x1 - sgn * 2, y0 + w * .6], [x1 - sgn * 2, y1 - (y1 - y0) * .1]], { w: 1, tone: 'paper', tip0: .1, tip1: .1, per: 4 }));
    for (let r = y0 + w * .7; r < y1 - 4; r += w * .3) for (let c = 0; c < 3; c++) { const x = x0 + (x1 - x0) * (.3 + c * .2); if (k.R() < .5) { if (k.R() < .1) amb += `M${f1(x)} ${f1(r)}h.1`; else leds += `M${f1(x)} ${f1(r)}h${f1(w * .05)}`; } }
  }));
  k.add(`<path d="${leds}" stroke="${PAPER}" stroke-width="1.1"/>`, `<path d="${amb}" stroke="${AMBER}" stroke-width="1.8"/>`);
  // The vault: cable-tray ribs arching across, cables drooping from them like roots.
  k.add(k.brushes([[[[30, 8], [100, -4], [170, 8]], { w: 4, tip0: 1, tip1: 1 }], [[[60, 22], [100, 12], [140, 22]], { w: 2.6, tip0: 1, tip1: 1 }], [[[78, 32], [100, 26], [122, 32]], { w: 1.6, tip0: 1, tip1: 1 }]]));
  k.add(k.tendrils([[[56, 4], [70, 30], { sag: 4, curl: 2, w: 1.4, tip: .2 }], [[132, 4], [124, 34], { sag: 4, curl: 2, w: 1.4, tip: .2 }], [[92, 14], [96, 30], { sag: 2, curl: 1.4, w: 1, tip: .2 }]]));
  // The console at the end of the aisle: the torch.
  k.add(k.fill(k.shape([[92, 44], [108, 44], [109, 55], [91, 55]], { wob: .3, tension: .6 })), k.fill(k.shape([[94, 46], [106, 46], [106.6, 53], [93.4, 53]], { wob: .2, tension: .6 }), 'paper'), k.fill(k.shape([[96, 55], [104, 55], [106, 62], [94, 62]], { wob: .2 })));
  // Floor: cables rooting along the aisle edges, grit.
  k.add(k.tendrils([[[64, 84], [92, 64], { sag: 4, curl: 2, w: 1.6, tip: .3, thorns: 1 }], [[136, 84], [108, 64], { sag: 4, curl: 2, w: 1.6, tip: .3, thorns: 1 }]]));
  k.add(k.brush([[96, 66], [97, 80], [94, 100]], { w: 1.4, tone: 'ink', tip0: .1, tip1: .02 }));
  return finish(k, 100, 92, 30, 10, 12);
}

// ================================================================ FALLBACKS
// fp (challenge): one flagged alert on the scrying glass, a lens held over it. One attempt.
function fp(key) {
  const k = kit.scene({ key, seed: 215, spot: FLARE });
  deskLight(k, 96, 58, 110, 60, { sy: .5, r0: 18, a: [0, 180] });
  k.add(k.tendrils([[[50, 26], [24, 62], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[146, 30], [168, 62], { sag: 6, curl: 2, w: 1.5, tip: .4, thorns: 1 }]]));
  const s = monitor(k, 44, 4, 104, 52, 66);
  k.add(rows(k, s.x + 5, s.y + 6, 3, 5, [30, 60], 1.4), rows(k, s.x + 5, s.y + 30, 3, 5, [30, 60], 1.4));
  const fy = s.y + 22;
  k.add(k.fill(k.shape(soft(s.x + 2, fy - 3.4, s.w - 4, 6.8, 2), { wob: .2, tension: .9 })), `<path d="M${s.x + 6} ${fy + 2}l2.8-4.8 2.8 4.8z" fill="${FLARE}"/>`, k.brush([[s.x + 15, fy], [s.x + 60, fy]], { w: 2, tone: 'spot', tip0: .5, tip1: .2, per: 3 }));
  k.add(k.staticNoise({ x: s.x, y: s.y + 1, w: s.w, h: s.h - 2 }, 5, { sw: .45 }));
  // The lens: a heavy ink ring, its glass paper, the flagged row magnified inside; the handle to the desk.
  const lx = 128, ly = 30;
  k.add(k.brush([[lx + 8, ly + 9], [lx + 18, ly + 26], [lx + 24, ly + 38]], { w: 6, tip0: .8, tip1: 1 }), k.brush([[lx + 10, ly + 13], [lx + 18, ly + 28]], { w: 1, tone: 'paper', tip0: .2, tip1: .2 }));
  k.add(`<circle cx="${lx}" cy="${ly}" r="11.4" fill="${PAPER}" stroke="${INK}" stroke-width="4"/><path d="M${lx - 10} ${ly - 4.6}h20v9.2h-20z" fill="${INK}"/><path d="M${lx - 7} ${ly + 3}l4-7 4 7z" fill="${FLARE}"/><path d="M${lx + 1} ${ly}h7" stroke="${FLARE}" stroke-width="2.6"/>`);
  k.add(k.brush([[lx - 8.6, ly - 6], [lx - 4, ly - 9.6]], { w: 1, tone: 'paper' }));
  k.add(k.fill(k.shape([[76, 66], [100, 65.2], [124, 66], [125, 73], [100, 73.6], [75, 73]], { wob: .3, tension: .5 })), k.stipple(100, 69.4, 22, 2.4, 18, { size: .7, bias: .6 }));
  k.add(k.shadow(144, 160, 70, 96, 40, { len: 16, spread: .4, sy: .3 }));
  return finish(k, 100, 100, 90, 8, 14);
}

// event: the 2 AM desk, quiet. The tower clock on the lit wall reads two; notes stuck to the bezel.
function event(key) {
  const k = kit.scene({ key, seed: 216, spot: AMBER });
  wallLight(k, 82, 40, 72, 66, { r0: 28 });
  deskLight(k, 84, 64, 92, 66, { sy: .38 });
  k.add(k.tendrils([[[56, 50], [30, 80], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[110, 48], [136, 84], { sag: 7, curl: 3, w: 1.4, tip: .3, thorns: 1 }]]));
  const s = monitor(k, 52, 16, 62, 40, 70);
  k.add(rows(k, s.x + 4, s.y + 5, 5, 5.4, [12, 34], 1.4), k.staticNoise({ x: s.x, y: s.y + 1, w: s.w, h: s.h - 2 }, 4, { sw: .45 }));
  // Notes on the bezel, one in amber.
  k.add(dev(k, 52, 22, 10, 10, -12, 1, 'paper', KL(1)), dev(k, 116, 46, 10, 10, 10, 1, 'spot', KL(1)), k.brush(rot([[113, 45], [119, 45]], 116, 46, 10), { w: .9, per: 2 }));
  // The tower clock: a chipped stone ring, a paper face, ink hands at two, ticks.
  const cx = 150, cy = 26;
  k.add(k.fill(k.oval(cx, cy, 17, 17, { n: 12, lump: .04 })), k.fill(k.oval(cx, cy, 12.6, 12.6, { n: 11, lump: .03 }), 'paper'));
  let t = '';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = i % 3 ? 10 : 8.6; t += `M${f1(cx + Math.sin(a) * r0)} ${f1(cy - Math.cos(a) * r0)}L${f1(cx + Math.sin(a) * 11.6)} ${f1(cy - Math.cos(a) * 11.6)}`; }
  k.add(`<path d="${t}" stroke="${INK}" stroke-width="1.2"/>`, k.brushes([[[[cx, cy], [cx + 5.4, cy - 3.2]], { w: 2.2, tip0: 1, tip1: .3 }], [[[cx, cy], [cx + .2, cy - 9.6]], { w: 1.4, tip0: 1, tip1: .1 }]]), `<circle cx="${cx}" cy="${cy}" r="1.4" fill="${INK}"/>`);
  k.add(k.drips(cx - 10, cx + 10, cy + 16, 3, { len: [3, 8], w: 1.4 }));
  // A cold mug and a scatter of pens.
  mug(k, 136, 78, -1);
  k.add(k.brushes([[[[58, 88], [76, 82]], { w: 2, tip0: 1, tip1: .02 }], [[[64, 92], [84, 90]], { w: 1.8, tip0: 1, tip1: .02 }]]));
  k.add(k.shadow(130, 142, 78, 84, 40, { len: 18, spread: .3, sy: .3 }));
  return finish(k, 100, 102, 90, 6, 14);
}

// esc (choice): the desk phone rattling on its cradle, its coiled cord a tendril into the dark.
function esc(key) {
  const k = kit.scene({ key, seed: 217, spot: FLARE });
  wallLight(k, 34, 42, 100, 64, { r0: 22 });
  deskLight(k, 40, 62, 116, 64, { sy: .4 });
  k.add(k.tendrils([[[22, 52], [6, 80], { sag: 5, curl: 2, w: 1.5, tip: .4 }]]));
  const s = monitor(k, 8, 18, 50, 36, 68);
  k.add(rows(k, s.x + 3, s.y + 4, 4, 5.6, [10, 26], 1.4), k.staticNoise({ x: s.x, y: s.y + 1, w: s.w, h: s.h - 2 }, 3, { sw: .45 }));
  // The phone: a heavy body, its handset lifted off the cradle by the ringing; the line light in flare.
  k.add(k.shadow(76, 132, 86, 34, 40, { len: 36, spread: .5, sy: .3 }));
  const body = k.shape([[76, 86], [80, 66], [92, 60], [116, 60], [128, 66], [132, 86], [104, 88]], { wob: .5 });
  k.add(k.fill(body), k.rim(body, { from: .5, to: .74, w: 1.1 }));
  k.add(k.fill(k.shape(soft(90, 70, 26, 12, 2), { wob: .2, tension: .9 }), 'paper', KL(1.2)));
  let keys = '';
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) keys += `M${93 + c * 6} ${74 + r * 4.4}h3`;
  k.add(`<path d="${keys}" stroke="${INK}" stroke-width="2"/>`, `<circle cx="124" cy="72" r="2.4" fill="${FLARE}"${KL(.8)}/>`);
  const hs = [[78, 54], [84, 46], [104, 42], [124, 46], [130, 54]];
  k.add(k.brush(hs, { w: 10, tone: 'paper', tip0: 1, tip1: 1, nib: .05 }), k.brush(hs, { w: 7, tip0: 1, tip1: 1, nib: .05 }));
  k.add(k.fill(k.oval(79, 55, 6.6, 4, { rot: 20 })), k.fill(k.oval(129, 55, 6.6, 4, { rot: -20 })), k.brush([[84, 44.6], [104, 40.6], [122, 44.4]], { w: 1, tone: 'paper', tip0: .1, tip1: .1 }));
  k.add(k.buzz(104, 50, 30, { w: 1.2, rings: 2, tone: 'paper' }), k.brushes([[[[90, 36], [92, 30]], { w: 1.2, tip0: .1, tip1: .1 }], [[[104, 34], [104, 27]], { w: 1.2, tip0: .1, tip1: .1 }], [[[118, 36], [116, 30]], { w: 1.2, tip0: .1, tip1: .1 }]], 'paper'));
  // The coiled cord: a looping tendril off the handset into the dark at right.
  let coil = [];
  for (let i = 0; i < 9; i++) { const x = 132 + i * 6.4, y = 62 + i * 3; coil.push([[[x, y], [x + 4, y - 4], [x + 6.6, y + 2], [x + 3, y + 5]], { w: 1.4, tip0: 1, tip1: 1, per: 3 }]); }
  k.add(k.brushes(coil), k.brush([[130, 56], [133, 61]], { w: 1.6 }));
  // A note pinned under the phone: the two choices, two lines.
  k.add(dev(k, 64, 92, 18, 12, -8, 1.2, 'paper', KL(1)), rows(k, 57, 89, 2, 4, [10, 13], 1.1));
  return finish(k, 120, 104, 70, 6, 12);
}

// gear (kit drop): a clockwork owl, the crew's familiar, perched on its charging stand over an open tool roll.
function gear(key) {
  const k = kit.scene({ key, seed: 218, spot: CYAN });
  wallLight(k, 160, 40, 96, 70, { r0: 24 });
  deskLight(k, 156, 68, 100, 70, { sy: .38 });
  k.add(k.tendrils([[[156, 54], [132, 76], { sag: 5, curl: 2, w: 1.4, tip: .4, thorns: 1 }], [[110, 70], [70, 100], { sag: 8, curl: 3, w: 1.8, tip: .4, thorns: 2 }]]));
  const s = monitor(k, 146, 16, 48, 36, 72);
  k.add(rows(k, s.x + 3, s.y + 4, 4, 5.4, [10, 24], 1.4), k.staticNoise({ x: s.x, y: s.y + 1, w: s.w, h: s.h - 2 }, 3, { sw: .45 }));
  // The tool roll: a paper cloth on the altar, tools in its pockets in ink.
  const roll = k.shape([[48, 76], [86, 72], [126, 74], [130, 86], [90, 90], [46, 88]], { wob: .5 });
  k.add(k.fill(roll, 'paper', KL(1.2)), k.hatch(roll, { a: 90, gap: 3.2, bend: 2, w: [.4, 1.2], broken: .5 }));
  k.add(k.brushes([[[[56, 86], [60, 78]], { w: 3, tip0: 1, tip1: .3 }], [[[66, 86], [70, 74], [69, 70]], { w: 2, tip0: 1, tip1: .02 }], [[[118, 86], [114, 76]], { w: 4, tip0: 1, tip1: .5 }]]));
  // The perch: a bent iron stand rooted in the roll, a cradle at the top.
  k.add(k.shadow(84, 116, 82, 160, 40, { len: 30, spread: .5, sy: .3 }));
  k.add(k.brushes([[[[100, 80], [98, 66], [101, 54]], { w: 3.4, tip0: 1, tip1: .6 }], [[[86, 81], [100, 78], [114, 81]], { w: 3, tip0: .6, tip1: .6 }], [[[90, 54], [101, 56], [112, 54]], { w: 2.4, tip0: .4, tip1: .4 }]]));
  // The owl: a feathered iron body, ear tufts, folded wings rim-lit from the screen; one lens.
  const owl = k.shape([[94, 24], [98, 16], [102, 20], [106, 16], [110, 24], [114, 36], [112, 48], [104, 55], [96, 54], [90, 46], [89, 34]], { wob: .4 });
  k.add(k.fill(owl), k.rim(owl, { from: .08, to: .38, w: 1.2 }), k.hatch(owl, { a: 0, gap: 2.2, bend: -3, w: [.3, 1], tone: 'paper', broken: .5, cover: [.55, .9] }));
  k.add(k.brushes([[[[110, 32], [116, 42], [114, 52]], { w: 3, tip0: .4, tip1: .02 }], [[[92, 32], [88, 42], [91, 50]], { w: 2.4, tip0: .4, tip1: .02 }], [[[97, 54], [96, 57]], { w: 1.2 }], [[[104, 54], [105, 57]], { w: 1.2 }]]));
  k.add(`<circle cx="102" cy="30" r="5.4" fill="${INK}" stroke="${PAPER}" stroke-width="1"/><circle cx="102" cy="30" r="2.6" fill="${CYAN}"${KL(1.6)}/><circle cx="103" cy="29" r=".6" fill="${PAPER}"/>`);
  k.add(k.smoke(98, 16, 10, { n: 1, sway: 2, w: .8, tone: 'ink' }));
  return finish(k, 100, 102, 90, 6, 14);
}

const art = {
  sit_travel: travel('sit_travel'), sit_coffee: coffee('sit_coffee'), sit_blast: blast('sit_blast'), sit_patch: patch('sit_patch'),
  sit_ciso: ciso('sit_ciso'), sit_intel: intel('sit_intel'), sit_pentest: pentest('sit_pentest'), sit_budget: budget('sit_budget'),
  Identity: identity('Identity'), Endpoint: endpoint('Endpoint'), Network: network('Network'), Cloud: cloud('Cloud'),
  fp: fp('fp'), event: event('event'), esc: esc('esc'), gear: gear('gear'),
};
fs.writeFileSync(path.join(__dirname, 'ink-art.json'), JSON.stringify({ art, print: {} }, null, 1) + '\n');
console.log(Object.fromEntries(Object.entries(art).map(([k, v]) => [k, +(v.length / 1024).toFixed(1)])));
