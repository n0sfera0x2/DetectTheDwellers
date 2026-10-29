// STORY batch: the nine story situations (pass 8), drawn with the shared ink-kit in the world batch's hand.
// Each scene shows the read-aloud beat, plus one small Recon hint (a magnifier, an eye, a map pin, a flag,
// a padlock, a key ring) so the Recon twist reads visually.
// Usage: node scenes.js  -> writes ink-art.json { art: {...}, print: {} } and prints sizes.
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../ink-kit');
const { FLARE, AMBER, INK, PAPER, soft, rot } = kit;
const KL = (w = .8) => ` stroke="${INK}" stroke-width="${w}"`;
const f1 = n => (Math.round(n * 10) / 10).toString();
const P = (x, y, a, l) => [x + Math.cos(a * Math.PI / 180) * l, y + Math.sin(a * Math.PI / 180) * l];

// ---------------------------------------------------------------- shared helpers (as in world/)
const wallLight = (k, x, y, r, floor, o = {}) => k.add(k.glow({ x, y, r: [o.r0 || r * .28, r], a: o.a || [0, 360], sy: o.sy || .85, step: o.step || 5.4, clip: { x: 0, y: 0, w: 200, h: floor }, w: [.15, 2.2] }));
function deskLight(k, x, y, r, floor, o = {}) {
  k.add(k.glow({ x, y: o.cy || floor - 2, r: [o.r0 || 12, r], a: o.a || [-10, 190], sy: o.sy || .42, step: o.step || 5.2, clip: { x: 0, y: floor, w: 200, h: 112 - floor }, w: [.15, 2] }));
  k.add(k.brush([[0, floor + .4], [60, floor - .4], [130, floor + .4], [200, floor - .2]], { w: 1.8, tip0: .5, tip1: .5 }));
}
const rows = (k, x, y, n, gap, len, w = 1.6) => k.brushes(Array.from({ length: n }, (_, i) => { const L = len[0] + k.R() * (len[1] - len[0]); return [[[x, y + i * gap + k.r(.2)], [x + L, y + i * gap]], { w, tip0: .5, tip1: .3, per: 2 }]; }));
const dev = (k, x, y, w, h, a, c, tone = 'ink', extra = '') => k.fill(k.shape(rot(soft(x - w / 2, y - h / 2, w, h, c), x, y, a), { wob: .2, tension: .9 }), tone, extra);
function archWindow(k, x, y, w, h, side = 1, n = 26) {
  const arch = (x, y, w, h) => [[x, y + h], [x, y + w * .55], [x + w * .14, y + w * .2], [x + w / 2, y], [x + w * .86, y + w * .2], [x + w, y + w * .55], [x + w, y + h]];
  const outer = k.shape(arch(x - 3, y - 3, w + 6, h + 5), { wob: .5, tension: .7, chip: .2 }), inner = k.shape(arch(x, y, w, h), { wob: .3, tension: .7 });
  k.add(k.fill(outer), k.rain({ x: x + 2, y: y + w * .25, w: w - 6, h: h - w * .25 - 2 }, n, { slant: .2, len: [3, 8], sw: .5, op: .8 }));
  k.add(k.rim(inner, side > 0 ? { from: .5, to: .9, w: 1 } : { from: .02, to: .4, w: 1 }));
  k.add(k.brushes([[[[x + w / 2, y + 1], [x + w / 2 + k.r(.4), y + h / 2], [x + w / 2, y + h]], { w: 1.6, tip0: 1, tip1: 1 }], [[[x, y + h * .52], [x + w / 2, y + h * .5], [x + w, y + h * .52]], { w: 1.4, tip0: 1, tip1: 1 }]], 'ink'));
  k.add(k.brush([[x - 6, y + h + 2], [x + w / 2, y + h + 1], [x + w + 6, y + h + 2.4]], { w: 3.4, tip0: .4, tip1: .4 }), k.drips(x - 4, x + w + 4, y + h + 3, 4, { len: [3, 7], w: 1.2 }));
}
function mug(k, x, y, lit = -1) {
  k.add(k.fill(k.shape([[x - 5.5, y - 13], [x, y - 13.6], [x + 5.5, y - 13], [x + 5, y], [x, y + .8], [x - 5, y]], { wob: .3, tension: .6 })));
  k.add(k.brush([[x - lit * 5, y - 10], [x - lit * 9.5, y - 8.5], [x - lit * 9.4, y - 4], [x - lit * 5, y - 3]], { w: 1.8, tip0: .7, tip1: .7 }));
  k.add(k.brush([[x - 5, y - 13.2], [x, y - 13.8], [x + 5, y - 13.2]], { w: .9, tone: 'paper', tip0: .2, tip1: .2 }), k.brush([[x + lit * 4.4, y - 11], [x + lit * 4, y - 1]], { w: 1, tone: 'paper', tip0: .1, tip1: .1 }));
}
const finish = (k, cx, cy, rx, ry, n = 14) => { k.add(k.stipple(cx, cy, rx, ry, n, { size: .8 })); return k.svg(); };

// ---------------------------------------------------------------- story props
// A wall clock: ink bezel, paper face, ticks, two hands set to hh:mm.
function clock(k, x, y, r, hh, mm) {
  k.add(k.fill(k.oval(x, y, r + 2.2, r + 2.2, { n: 10, lump: .04 })), k.fill(k.oval(x, y, r, r, { n: 10, lump: .02, wob: .15 }), 'paper'));
  let t = '';
  for (let i = 0; i < 12; i += 3) { const [a, b] = [P(x, y, i * 30, r * .72), P(x, y, i * 30, r * .94)]; t += `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; }
  k.add(`<path d="${t}" stroke="${INK}" stroke-width=".9"/>`);
  const ha = ((hh % 12) + mm / 60) * 30 - 90, ma = mm * 6 - 90;
  k.add(k.brushes([[[[x, y], P(x, y, ha, r * .52)], { w: 1.8, tip0: 1, tip1: .4, per: 2 }], [[[x, y], P(x, y, ma, r * .8)], { w: 1.2, tip0: 1, tip1: .2, per: 2 }]]));
}
// The Recon magnifier: lens ring (optionally carrying the spot colour on its ink keyline), a paper lens, a handle.
function magnifier(k, x, y, r, ang, len, spot = false) {
  const hs = P(x, y, ang, r + 1.5), he = P(x, y, ang, r + len);
  k.add(k.brush([hs, P(x, y, ang, r + len * .5), he], { w: 6.4, tone: 'paper', tip0: 1, tip1: 1 }), k.brush([hs, P(x, y, ang, r + len * .5), he], { w: 4.2, w0: .6, w1: 1, tip0: 1, tip1: .8 }));
  k.add(k.fill(k.oval(x, y, r + 3.6, r + 3.6, { n: 12, lump: .02, wob: .1 }), 'paper'), k.fill(k.oval(x, y, r + 2.6, r + 2.6, { n: 12, lump: .02, wob: .1 })));
  if (spot) k.add(k.fill(k.oval(x, y, r + 1.7, r + 1.7, { n: 12, lump: .015, wob: .1 }), 'spot'), k.fill(k.oval(x, y, r + .7, r + .7, { n: 12, lump: .015, wob: .1 })));
  const lens = k.oval(x, y, r, r, { n: 12, lump: .015, wob: .1 });
  k.add(k.fill(lens, 'paper'));
  return lens;
}
// A watching eye sigil: paper almond, ink keyline, ink iris, a paper glint.
const eye = (k, x, y, s, a = 0) => k.fill(k.shape(rot([[x - s, y], [x - s * .4, y - s * .5], [x + s * .4, y - s * .5], [x + s, y], [x + s * .4, y + s * .5], [x - s * .4, y + s * .5]], x, y, a), { wob: .1, tension: .8 }), 'paper', KL(1.1))
  + k.fill(k.oval(x, y, s * .38, s * .38, { n: 8, lump: .03, wob: .1 })) + `<circle cx="${f1(x + s * .12)}" cy="${f1(y - s * .12)}" r="${f1(s * .1)}" fill="${PAPER}"/>`;
// A key: ring, shaft, two teeth, rotated by a about the ring.
function keyGlyph(k, x, y, a, len, tone = 'paper', kl = 1) {
  const pts = q => rot(q, x, y, a);
  const ring = k.shape(pts([[x - 3.6, y], [x - 2.6, y - 2.6], [x, y - 3.6], [x + 2.6, y - 2.6], [x + 3.6, y], [x + 2.6, y + 2.6], [x, y + 3.6], [x - 2.6, y + 2.6]]), { wob: .1 });
  const body = k.brushes([[pts([[x + 3, y], [x + len * .5, y], [x + len, y]]), { w: 2.2, tip0: 1, tip1: 1, per: 2 }], [pts([[x + len - .6, y], [x + len - .6, y + 3.6]]), { w: 1.8, tip0: 1, tip1: 1, per: 2 }], [pts([[x + len - 4, y], [x + len - 4, y + 2.6]]), { w: 1.6, tip0: 1, tip1: 1, per: 2 }]], tone);
  return (kl ? k.brushes([[pts([[x + 3, y], [x + len * .5, y], [x + len + .8, y]]), { w: 4, tip0: 1, tip1: 1, per: 2 }], [pts([[x + len - .6, y], [x + len - .6, y + 4.6]]), { w: 3.6, tip0: 1, tip1: 1, per: 2 }], [pts([[x + len - 4, y], [x + len - 4, y + 3.6]]), { w: 3.4, tip0: 1, tip1: 1, per: 2 }]]) : '')
    + k.fill(ring, tone, KL(1.4)) + k.fill(k.oval(x, y, 1.3, 1.3, { n: 6, wob: .05 })) + body;
}
// A padlock: shackle arc, ink body with a paper rim, paper keyhole.
function padlock(k, x, y, s = 1) {
  k.add(k.brush([[x - 3.6 * s, y], [x - 3.8 * s, y - 5 * s], [x, y - 8 * s], [x + 3.8 * s, y - 5 * s], [x + 3.6 * s, y]], { w: 4 * s, tone: 'paper', tip0: 1, tip1: 1 }), k.brush([[x - 3.6 * s, y], [x - 3.8 * s, y - 5 * s], [x, y - 8 * s], [x + 3.8 * s, y - 5 * s], [x + 3.6 * s, y]], { w: 2.2 * s, tip0: 1, tip1: 1 }));
  const b = k.shape(soft(x - 6 * s, y - 1 * s, 12 * s, 10 * s, 2 * s), { wob: .15, tension: .9 });
  k.add(k.fill(b, 'ink', ` stroke="${PAPER}" stroke-width=".9"`), k.fill(k.oval(x, y + 3 * s, 1.4 * s, 1.4 * s, { n: 6, wob: .05 }), 'paper'), k.brush([[x, y + 3.6 * s], [x, y + 6.4 * s]], { w: 1.4 * s, tone: 'paper', tip0: 1, tip1: .4, per: 2 }));
}

// ================================================================ THE NINE
// The Badge That Wasn't: 03:10 at the server-room gate. A gloved hand holds a dead man's badge to the
// reader, and the reader burns flare: granted. Recon: the badge log pinned by the gate, a magnifier hung over it.
function insider(key) {
  const k = kit.scene({ key, seed: 301, spot: FLARE });
  wallLight(k, 110, 40, 62, 88, { r0: 12 });
  deskLight(k, 108, 86, 74, 88, { sy: .3, r0: 8, a: [-40, 220] });
  // The gate: a pointed arch, an iron-banded leaf, a barred grille with rack votives behind it.
  const arch = k.shape([[24, 88], [24, 30], [34, 12], [56, 2], [78, 12], [88, 30], [88, 88]], { wob: .6, tension: .8, chip: .25 });
  k.add(k.fill(arch), k.drips(26, 86, 88, 4, { len: [2, 6], w: 1.2 }));
  const leaf = k.shape([[31, 88], [31, 32], [39, 17], [56, 9], [73, 17], [81, 32], [81, 88]], { wob: .3, tension: .8 });
  k.add(k.fill(leaf, 'paper'), k.hatch(leaf, { a: 90, gap: 2.2, bend: 5, w: [.3, 1.9], broken: .3, cover: [.25, 1] }));
  k.add(k.brushes([[[[31, 44], [56, 43], [81, 44.6]], { w: 2.6, tip0: 1, tip1: 1 }], [[[31, 72], [56, 71], [81, 72.6]], { w: 2.6, tip0: 1, tip1: 1 }], [[[56, 10], [56.4, 50], [56, 88]], { w: 1.6, tip0: 1, tip1: 1 }]]));
  const grille = k.oval(56, 28, 8, 7, { n: 9 });
  k.add(k.fill(grille), `<path d="M52 25h1.2M59 27h1.2M53.6 31h1.2M58 32.4h1.2" stroke="${PAPER}" stroke-width="1.4"/>`, k.brushes([[[[53, 21.6], [53.2, 34.6]], { w: 1, tip0: 1, tip1: 1, per: 2 }], [[[59, 21.6], [59.2, 34.6]], { w: 1, tip0: 1, tip1: 1, per: 2 }]], 'paper'));
  k.add(k.fill(k.oval(76, 58, 3, 3.4, { n: 7 }), 'paper', KL(1.6)));
  // The reader on the jamb: an ink box, a lit paper screen, the flare ward. Cables up and down the wall.
  k.add(k.tendrils([[[112, 50], [126, 88], { sag: 4, curl: 2, w: 1.5, tip: .4, thorns: 1 }], [[110, 30], [118, 0], { sag: 3, curl: 2, w: 1.3, tip: .5 }]]));
  k.add(dev(k, 110, 40, 15, 22, 0, 3), dev(k, 110, 36, 9.6, 8.6, 0, 1.5, 'paper'), k.staticNoise({ x: 106, y: 33, w: 8, h: 6 }, 3, { sw: .45 }));
  k.add(`<circle cx="110" cy="46.6" r="2.4" fill="${FLARE}"${KL(.9)}/>`, k.buzz(110, 46.6, 3.6, { w: .8, rings: 1 }));
  // The arm out of the dark, bottom right: a sleeve rim-lit along its top, a gloved fist, the badge.
  const sleeve = k.shape([[204, 116], [204, 66], [178, 58], [152, 54], [134, 54], [128, 62], [138, 72], [160, 84], [178, 104], [182, 116]], { wob: .6 });
  k.add(k.fill(sleeve), k.rim(sleeve, { from: .2, to: .5, w: 1.3 }), k.hatch(sleeve, { a: 30, gap: 2.6, bend: 3, w: [.3, 1.2], tone: 'paper', broken: .4, cover: [.0, .22] }));
  k.add(k.brush([[124, 55], [123, 50.6], [126, 46.6]], { w: 6, tone: 'paper', tip0: 1, tip1: 1 }), k.brushes([[[[124, 55], [123, 50.6], [126, 46.6]], { w: 3.8, tip0: 1, tip1: .8 }], [[[129, 54], [129, 49], [131.6, 46.4]], { w: 3.6, tip0: 1, tip1: .8 }]]));
  const badge = k.shape(rot(soft(116, 40, 13, 17, 2), 122.5, 48.5, -16), { wob: .15, tension: .9 });
  k.add(k.fill(badge, 'paper', KL(1.3)));
  k.add(`<g transform="rotate(-16 122.5 48.5)">${k.fill(k.oval(122.5, 45, 3, 3.4, { n: 7 }))}${k.fill(k.shape([[117.6, 52], [122.5, 49], [127.4, 52]], { wob: .1 }))}${k.brushes([[[[118, 54.6], [127, 54.6]], { w: 1, per: 2 }], [[[117.6, 41], [127.6, 51]], { w: 1.3, tip0: .6, tip1: .6, per: 2 }]])}</g>`);
  k.add(k.brush([[126, 57], [121, 64], [124, 76], [118, 84]], { w: 1.1, tone: 'paper', tip0: .4, tip1: .02 }));
  k.add(k.fill(k.oval(127, 56, 7, 5.6, { n: 9, rot: -20 })), k.rim(k.oval(127, 56, 7, 5.6, { n: 9, rot: -20 }), { from: .5, to: .75, w: 1 }));
  // Time on the wall; the Recon hint: the badge log pinned left of the gate, a magnifier hung over it.
  clock(k, 12, 14, 7, 3, 10);
  const log = k.shape(rot(soft(2, 40, 17, 26, 1), 10.5, 53, 4), { wob: .3, tension: .9 });
  k.add(k.fill(log, 'paper', KL(1)), rows(k, 4.6, 45, 6, 3.6, [7, 12], 1), `<circle cx="11" cy="40.6" r="1.2" fill="${INK}"/>`);
  const lens = magnifier(k, 13, 60, 5.4, 115, 13);
  k.add(rows(k, 9.4, 58, 2, 4, [6, 7], 1.9));
  return finish(k, 100, 102, 90, 6, 14);
}

// Lateral Whispers: five hosts stand in a row like tombstones; ghost-trail arcs hop from top to top,
// and something rises from the middle one with flare eyes. Recon: the path, mapped, with a pin.
function lateral(key) {
  const k = kit.scene({ key, seed: 302, spot: FLARE });
  wallLight(k, 100, 44, 68, 84, { r0: 10 });
  deskLight(k, 100, 82, 92, 84, { sy: .3, r0: 10, a: [-20, 200] });
  // Network links between the host bases, creeping over the floor.
  k.add(k.tendrils([[[28, 86], [58, 88], { sag: 5, curl: 2, w: 1.3, tip: .6, thorns: 1 }], [[64, 88], [96, 90], { sag: 5, curl: 2, w: 1.3, tip: .6 }], [[106, 90], [138, 88], { sag: 5, curl: 2, w: 1.3, tip: .6 }], [[144, 88], [174, 86], { sag: 5, curl: 2, w: 1.3, tip: .6, thorns: 1 }]]));
  const hosts = [[24, 46, 18], [61, 38, 20], [100, 30, 26], [139, 38, 20], [176, 46, 18]];
  const tops = [];
  hosts.forEach(([x, top, w], i) => {
    k.add(k.shadow(x - w / 2, x + w / 2, 86, 100, 40, { len: 18, spread: .4, sy: .3 }));
    const b = k.shape([[x - w / 2, 87], [x - w / 2 - .6, top + w * .45], [x - w * .32, top + w * .12], [x, top], [x + w * .32, top + w * .12], [x + w / 2 + .6, top + w * .45], [x + w / 2, 87]], { wob: .5, tension: .8, chip: .2 });
    k.add(k.fill(b), k.rim(b, x < 100 ? { from: .55, to: .78, w: 1.1 } : x > 100 ? { from: .2, to: .43, w: 1.1 } : { from: .1, to: .4, w: 1 }));
    const sx = x - w * .3, sy = top + w * .4;
    k.add(dev(k, x, sy + 5, w * .62, 9, 0, 1.4, 'paper', KL(.6)), rows(k, sx + 1.6, sy + 2.6, 2, 3.4, [w * .2, w * .4], 1));
    let leds = ''; for (let j = 0; j < 3; j++) leds += `M${f1(x - 3 + j * 3)} ${f1(sy + 18 + (i % 2) * 2)}h1`;
    k.add(`<path d="${leds}" stroke="${PAPER}" stroke-width="1.2"/>`, k.drips(x - w / 2, x + w / 2, top + w * .5, 2, { len: [2, 5], w: 1 }));
    tops.push([x, top]);
  });
  // The hops: the walked arcs are paper with an ink dash; the next hop is a dotted paper whisper.
  const arc = (a, b, h) => `M${a[0]} ${a[1]}Q${(a[0] + b[0]) / 2} ${Math.min(a[1], b[1]) - h} ${b[0]} ${b[1]}`;
  const walked = arc([28, tops[0][1] - 2], [57, tops[1][1] - 2], 18) + arc([65, tops[1][1] - 2], [92, 22], 20);
  k.add(`<path d="${walked}" fill="none" stroke="${PAPER}" stroke-width="3.4"/><path d="${walked}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="2.6 2"/>`);
  k.add(`<path d="${arc([108, 22], [137, tops[3][1] - 2], 20)}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-dasharray="1.4 3.4"/><path d="${arc([108, 22], [137, tops[3][1] - 2], 20)}" fill="none" stroke="${PAPER}" stroke-width="1.1" stroke-dasharray="1.4 3.4"/>`);
  // The thing coming back: a hooded wisp rising out of the middle host, rim-lit, flare eyes.
  const wisp = k.shape([[92, 31], [90, 20], [93, 10], [100, 5], [107, 10], [110, 20], [108, 31], [104, 27], [100, 32], [96, 27]], { wob: .4 });
  k.add(k.fill(wisp, 'ink', ` stroke="${PAPER}" stroke-width="1.1"`), k.smoke(100, 32, 8, { n: 2, sway: 3, w: 1, tone: 'ink' }));
  k.add(k.fill(k.oval(100, 15, 4.6, 3.6, { n: 8 }), 'ink', ` stroke="${PAPER}" stroke-width=".6"`), `<circle cx="98.2" cy="15.2" r="1.1" fill="${FLARE}"/><circle cx="101.8" cy="15.2" r="1.1" fill="${FLARE}"/>`);
  // Recon: the mapped path on a curling parchment, five dots, the pin on the middle one.
  const map = k.shape(rot([[6, 92], [30, 90], [56, 91], [58, 108], [32, 110], [4, 109]], 30, 100, -3), { wob: .5 });
  k.add(k.fill(map, 'paper', KL(1.1)), k.hatch(map, { a: 80, gap: 2, bend: 2, w: [.2, 1.1], broken: .4, cover: [.82, 1] }));
  k.add(`<path d="M11 104Q17 96 22 101T34 99T46 100" fill="none" stroke="${INK}" stroke-width=".9" stroke-dasharray="1.6 1.4"/><path d="M11 104h.1M22 101h.1M34 99h.1M46 100h.1M52 103h.1" stroke="${INK}" stroke-width="2.4"/>`);
  k.add(`<path d="M34 99c-2-3-3-4.6-3-6a3 3 0 0 1 6 0c0 1.4-1 3-3 6z" fill="${INK}"/><circle cx="34" cy="93" r="1" fill="${PAPER}"/>`);
  return finish(k, 120, 102, 70, 6, 12);
}

// The CEO's Inbox: her empty throne of a chair, a plane crossing the rain in the window, 04:00 on the clock.
// The wire request lies on the desk with a forged flare seal. Recon: a little flag stuck in it.
function ceo(key) {
  const k = kit.scene({ key, seed: 303, spot: FLARE });
  wallLight(k, 162, 52, 92, 72, { r0: 14 });
  deskLight(k, 156, 72, 112, 74, { sy: .4, r0: 10, a: [-10, 200] });
  archWindow(k, 12, 10, 34, 48, 1, 22);
  k.add(k.brushes([[[[17, 32], [28, 27.6], [41, 22]], { w: 3, tip0: .4, tip1: .7, per: 3 }], [[[31, 26.4], [26, 19], [23, 16.4]], { w: 2.2, tip0: 1, tip1: .3, per: 3 }], [[[29, 28], [33, 34], [35, 37]], { w: 2, tip0: 1, tip1: .3, per: 3 }], [[[19, 31], [17, 26]], { w: 1.6, tip0: 1, tip1: .3, per: 2 }]], 'paper'));
  clock(k, 62, 20, 7, 4, 0);
  // The throne: a high-backed chair, finials, studs; rim-lit from the laptop on the right.
  const back = k.shape([[78, 76], [76, 30], [80, 14], [88, 6], [100, 3], [112, 6], [120, 14], [124, 30], [122, 76]], { wob: .6, chip: .15 });
  k.add(k.fill(back), k.rim(back, { from: .32, to: .62, w: 1.3 }), k.hatch(back, { a: 90, gap: 2.4, bend: 4, w: [.2, 1], tone: 'paper', broken: .45, cover: [0, .18] }));
  k.add(k.brushes([[[[86, 7], [84, 0]], { w: 3, tip0: 1, tip1: .02 }], [[[114, 7], [116, 0]], { w: 3, tip0: 1, tip1: .02 }]]));
  k.add(`<path d="M90 22h.1M100 19h.1M110 22h.1M90 38h.1M100 35h.1M110 38h.1M90 54h.1M100 51h.1M110 54h.1" stroke="${PAPER}" stroke-width="1.6"/>`);
  // The laptop: lid up, the inbox; the wire request row is flare.
  k.add(k.tendrils([[[160, 70], [196, 92], { sag: 6, curl: 2, w: 1.4, tip: .4, thorns: 1 }]]));
  k.add(k.fill(k.shape([[136, 72], [180, 72], [186, 77], [130, 77]], { wob: .2, tension: .6 })), k.fill(k.shape([[140, 44], [176, 42.6], [178, 72], [138, 72]], { wob: .3, tension: .6 })));
  const scr = k.shape([[143, 47], [173, 46], [174.6, 69], [141.6, 69.4]], { wob: .2, tension: .6 });
  k.add(k.fill(scr, 'paper'), rows(k, 146, 51, 4, 4.4, [12, 22], 1.3), k.brush([[146, 68.6 - 3], [158, 65.4], [170, 65.6]], { w: 3.6, tip0: .5, tip1: .5, per: 3 }), k.brush([[147, 65.6], [158, 65.4], [169, 65.6]], { w: 1.6, tone: 'spot', tip0: .5, tip1: .5, per: 3 }));
  // The desk's front edge, dripping into the dark.
  k.add(k.brush([[0, 98], [100, 97], [200, 98.6]], { w: 3.6, tip0: .6, tip1: .6 }), k.drips(10, 190, 99, 5, { len: [3, 9], w: 1.3 }));
  // The wire request on the desk: rows, a scrawled signature, the forged flare seal.
  k.add(k.shadow(84, 124, 94, 156, 50, { len: 12, spread: .3, sy: .3 }));
  const sheet = k.shape(rot(soft(82, 76, 40, 18, 1), 102, 85, -4), { wob: .3, tension: .9 });
  k.add(k.fill(sheet, 'paper', KL(1)), rows(k, 87, 80, 3, 3.4, [16, 26], 1.1));
  k.add(k.brush([[88, 91], [92, 88], [94, 91.6], [98, 87.6], [101, 91], [106, 89]], { w: 1.1, tip0: .3, tip1: .1, per: 3 }));
  k.add(`<circle cx="114" cy="89" r="3.2" fill="${FLARE}"${KL(1.1)}/>`, k.brush([[112.6, 88], [115.4, 90]], { w: .8, per: 2 }));
  // Recon: you flagged the sender. A pin flag in the letter's corner.
  k.add(k.brush([[86, 79], [85.6, 70], [86, 62]], { w: 1.4, tip0: 1, tip1: 1 }), k.fill(k.shape([[86.4, 62], [96, 64.4], [86.4, 68.4]], { wob: .1, tension: .5 }), 'paper', KL(1)));
  k.add(k.fill(k.oval(56, 104, 30, 3, { n: 9 })));
  return finish(k, 100, 106, 90, 4, 10);
}

// Ghost in the Change Window: the firewall is a brick wall. A hooded ghost with no shadow reaches a long arm
// to the rule terminal set in the wall and rewrites a line in flare; a breach opens beside it.
// Recon: an eye carved in the stone, watching the change.
function change(key) {
  const k = kit.scene({ key, seed: 304, spot: FLARE });
  wallLight(k, 34, 46, 94, 88, { r0: 14 });
  deskLight(k, 40, 86, 130, 88, { sy: .3, r0: 10, a: [-30, 120] });
  // Mortar: hand-wobbled courses and staggered joints.
  let m = '';
  for (let r = 0; r < 9; r++) {
    const y = 6 + r * 9.4 + k.r(.6);
    m += `M0 ${f1(y)}Q50 ${f1(y + k.r(1.2))} 100 ${f1(y + k.r(.8))}T200 ${f1(y + k.r(1))}`;
    for (let x = (r % 2) * 11 + 4; x < 200; x += 22) m += `M${f1(x + k.r(1.4))} ${f1(y)}l${f1(k.r(.6))} 9.4`;
  }
  k.add(`<path d="${m}" fill="none" stroke="${INK}" stroke-width="1.3"/>`);
  // The breach: bricks gone, chipped, darkness beyond.
  const hole = k.shape([[150, 30], [162, 24], [176, 26], [186, 36], [184, 54], [170, 62], [154, 58], [146, 44]], { wob: .8, chip: .5 });
  k.add(k.fill(hole), k.rim(hole, { from: .55, to: .95, w: 1.1 }), k.drips(150, 182, 60, 3, { len: [3, 8], w: 1.2 }));
  // Fallen bricks on the floor.
  k.add(k.fill(k.shape(rot(soft(156, 88, 12, 6, 1), 162, 91, 14), { wob: .4 }), 'ink', ` stroke="${PAPER}" stroke-width=".7"`), k.fill(k.shape(rot(soft(172, 92, 11, 5.6, 1), 177, 95, -8), { wob: .4 }), 'ink', ` stroke="${PAPER}" stroke-width=".7"`));
  // The rule terminal, set into the wall: the torch. One rule rewritten in flare.
  k.add(k.tendrils([[[30, 60], [12, 88], { sag: 4, curl: 2, w: 1.4, tip: .4, thorns: 1 }]]));
  k.add(dev(k, 34, 44, 38, 30, 0, 3), dev(k, 34, 43, 30, 22, 0, 1.6, 'paper'));
  k.add(rows(k, 21.6, 36, 4, 4.4, [12, 22], 1.3), k.brush([[22, 53.6], [34, 53.4], [46, 53.6]], { w: 3.4, tip0: .6, tip1: .6, per: 3 }), k.brush([[22.6, 53.6], [34, 53.4], [45.4, 53.6]], { w: 1.5, tone: 'spot', tip0: .6, tip1: .6, per: 3 }));
  // The ghost: a hood, a robe that frays to rags above the floor, and no shadow at all.
  const robe = k.shape([[96, 12], [104, 6], [114, 10], [120, 24], [124, 44], [128, 66], [126, 80], [114, 76], [104, 82], [94, 76], [84, 80], [86, 58], [88, 32]], { wob: .6 });
  k.add(k.fill(robe), k.rim(robe, { from: .82, to: 1, w: 1.4 }), k.hatch(robe, { a: 84, gap: 2.4, bend: -4, w: [.2, 1.1], tone: 'paper', broken: .45, cover: [.78, 1] }));
  k.add(k.brushes([[[[86, 78], [85, 84], [87, 90]], { w: 2.6, tip0: 1, tip1: .02 }], [[[100, 80], [99, 86], [101, 93]], { w: 2.6, tip0: 1, tip1: .02 }], [[[114, 77], [115, 84], [113, 89]], { w: 2.4, tip0: 1, tip1: .02 }], [[[124, 79], [126, 85]], { w: 2, tip0: 1, tip1: .02 }]]));
  k.add(k.smoke(106, 86, 10, { n: 2, sway: 4, w: 1, tone: 'paper' }));
  const arm = [[94, 30], [78, 40], [62, 48], [48, 52]];
  k.add(k.brush(arm, { w: 7.4, tone: 'paper', tip0: .8, tip1: .3 }), k.brush(arm, { w: 5, w0: 1, w1: .5, tip0: .8, tip1: .2 }));
  k.add(k.brushes([[[[48, 52], [44, 53.4]], { w: 1.2, tip0: 1, tip1: .1, per: 2 }], [[[49, 51], [45, 50]], { w: 1, tip0: 1, tip1: .1, per: 2 }]]));
  k.add(k.fill(k.oval(106, 22, 5.6, 6.6, { n: 9 }), 'ink', ` stroke="${PAPER}" stroke-width=".8"`), `<circle cx="104" cy="21.6" r="1.1" fill="${FLARE}"/><circle cx="108.4" cy="21.6" r="1.1" fill="${FLARE}"/>`);
  // Recon: an eye cut into a brick, watching the change land.
  k.add(eye(k, 72, 11, 6));
  return finish(k, 100, 102, 90, 6, 14);
}

// Dark Web Chatter: a listing nailed up in the night market, your keep's crest on it and a key for sale
// with a price tag dangling. The seller lurks at the edge. Recon (amber): the magnifier, reading it all.
function chatter(key) {
  const k = kit.scene({ key, seed: 305, spot: AMBER });
  wallLight(k, 30, 72, 116, 88, { r0: 12, a: [-110, 40] });
  deskLight(k, 30, 86, 120, 88, { sy: .3, r0: 8, a: [-30, 120] });
  // The board: rough planks on a post.
  const board = k.shape([[60, 6], [140, 4], [142, 76], [58, 78]], { wob: .8, chip: .4 });
  k.add(k.brush([[100, 70], [99.4, 90], [100, 100]], { w: 7, tip0: 1, tip1: 1 }), k.fill(board), k.rim(board, { from: .74, to: .98, w: 1.2 }));
  k.add(k.brushes([[[[60, 30], [100, 29], [140, 30]], { w: .8, tone: 'paper', tip0: .2, tip1: .2 }], [[[60, 54], [100, 53], [140, 54.6]], { w: .8, tone: 'paper', tip0: .2, tip1: .2 }]], 'paper'));
  // The listing: crest, rows, a key drawn on it.
  const sheet = k.shape(rot(soft(68, 10, 62, 56, 1.2), 99, 38, -2), { wob: .4, tension: .9 });
  k.add(k.fill(sheet, 'paper', KL(1)), k.hatch(sheet, { a: 0, gap: 2.4, bend: 2, w: [1, .2], broken: .5, cover: [0, .14] }));
  k.add(k.fill(k.shape([[74, 30], [74, 20], [78, 15], [82, 20], [82, 30]], { wob: .1, tension: .7 })), k.brushes([[[[72, 31], [84, 31]], { w: 1.2, per: 2 }]]));
  k.add(rows(k, 88, 17, 4, 4, [26, 36], 1.3), rows(k, 74, 37, 3, 4, [44, 52], 1));
  k.add(keyGlyph(k, 82, 54, -4, 22, 'ink', 0));
  k.add(`<circle cx="70.6" cy="12" r="1.3" fill="${INK}"/><circle cx="128" cy="11" r="1.3" fill="${INK}"/>`);
  // The price tag on a string, a coin sign scrawled on it.
  k.add(k.brush([[116, 56], [121, 64], [124, 70]], { w: 1.8, tip0: 1, tip1: 1 }), k.brush([[116, 56], [121, 64], [124, 70]], { w: .7, tone: 'paper', tip0: 1, tip1: 1 }));
  const tag = k.shape(rot([[118, 70], [124, 66], [136, 66], [136, 80], [124, 80]], 124, 70, 18), { wob: .2, tension: .5 });
  k.add(k.fill(tag, 'paper', KL(1.2)), `<circle cx="124" cy="70.4" r="1" fill="${INK}"/>`);
  k.add(k.brushes([[[[133, 73], [130, 71.6], [128.6, 74.4], [132, 76.6], [131, 79.6], [127.6, 78.4]], { w: 1.4, tip0: .4, tip1: .3, per: 4 }], [[[130.6, 69.6], [129.6, 81]], { w: .9, tip0: .6, tip1: .6, per: 2 }]]));
  // The seller, hooded, at the right edge: rim-lit along the near side.
  k.add(k.shadow(150, 196, 104, 30, 70, { len: 30, spread: .4, sy: .2 }));
  const hood = k.shape([[160, 28], [170, 16], [184, 14], [196, 22], [202, 44], [204, 112], [150, 112], [152, 80], [158, 56]], { wob: .6 });
  k.add(k.fill(hood), k.rim(hood, { from: .82, to: 1, w: 1.4 }), k.rim(hood, { from: 0, to: .14, w: 1 }), k.hatch(hood, { a: 80, gap: 2.4, bend: -4, w: [.2, 1], tone: 'paper', broken: .45, cover: [.8, 1] }));
  k.add(k.brush([[160, 66], [148, 72], [138, 74]], { w: 6, tone: 'paper', tip0: .8, tip1: .5 }), k.brush([[160, 66], [148, 72], [138, 74]], { w: 4, tip0: .8, tip1: .5 }));
  // The forum on a crate at the left: the torch.
  k.add(k.fill(k.shape([[8, 86], [10, 72], [52, 71], [54, 86]], { wob: .5, chip: .3 })), k.fill(k.shape([[14, 72], [16, 54], [46, 53], [48, 72]], { wob: .3, tension: .6 })));
  k.add(k.fill(k.shape([[18.6, 69], [19.6, 57.4], [43, 56.6], [44, 69]], { wob: .2, tension: .6 }), 'paper'), rows(k, 22, 60.6, 3, 3, [12, 18], 1.1));
  // Recon: the amber magnifier held over the listing.
  const lens = magnifier(k, 82, 46, 9, 128, 16, true);
  k.add(k.brushes([[[[76, 43], [88, 43]], { w: 2.4, tip0: .6, tip1: .4, per: 2 }], [[[76, 48], [86, 48]], { w: 2.4, tip0: .6, tip1: .4, per: 2 }]]));
  k.add(k.brush([[76, 39], [79, 37.4]], { w: 1, tone: 'ink', tip0: .3, tip1: .3, per: 2 }));
  return finish(k, 80, 104, 70, 6, 14);
}

// The Janitor's USB: the break-room table under the vending machine's glow. A stick labelled SALARIES,
// three coffee rings, three tally marks on the fridge. Recon: a padlock on the laptop's port.
function usb(key) {
  const k = kit.scene({ key, seed: 306, spot: FLARE });
  wallLight(k, 24, 34, 98, 62, { r0: 22 });
  deskLight(k, 40, 62, 150, 62, { sy: .36, r0: 14, a: [-20, 180] });
  // Vending machine: the torch. Paper glass, rows of snacks in ink.
  k.add(k.fill(k.shape([[2, 0], [46, -1], [48, 62], [0, 62]], { wob: .4, chip: .2 })), k.fill(k.shape(soft(7, 6, 28, 46, 2), { wob: .2, tension: .9 }), 'paper'));
  let snacks = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) snacks += k.oval(11 + c * 6.6, 12 + r * 11, 2.2, 3, { n: 7 }).d;
  k.add(`<path d="${snacks}" fill="${INK}"/>`, k.brushes([0, 1, 2, 3].map(r => [[[8, 16.4 + r * 11], [34, 16.2 + r * 11]], { w: 1, tip0: 1, tip1: 1, per: 2 }])), dev(k, 41, 22, 4, 10, 0, 1, 'paper'));
  // The fridge at the right, a note with three tally marks.
  const fridge = k.shape([[158, 0], [202, -2], [202, 62], [156, 62]], { wob: .5, chip: .2 });
  k.add(k.fill(fridge), k.brush([[162, 18], [161.6, 30], [162, 42]], { w: 2.4, tone: 'paper', tip0: 1, tip1: 1 }), k.brush([[160, 4], [158.6, 60]], { w: 1, tone: 'paper', tip0: .2, tip1: .2 }));
  k.add(dev(k, 180, 24, 14, 14, 6, 1, 'paper', KL(.8)), k.brushes([[[[175.6, 19], [175.4, 28]], { w: 1.2, tip0: 1, tip1: .4, per: 2 }], [[[179, 19.4], [178.8, 28.4]], { w: 1.2, tip0: 1, tip1: .4, per: 2 }], [[[182.4, 19.8], [182.2, 28.8]], { w: 1.2, tip0: 1, tip1: .4, per: 2 }]]));
  // The table's front edge, dark below.
  k.add(k.fill(k.shape([[-4, 98], [100, 96], [204, 98], [204, 116], [-4, 116]], { wob: .6 })), k.drips(6, 194, 99, 6, { len: [3, 9], w: 1.3 }));
  // Three coffee rings.
  k.add(`<g fill="none" stroke="${INK}"><ellipse cx="64" cy="74" rx="7" ry="2.6" stroke-width="1.2" stroke-dasharray="14 3"/><ellipse cx="138" cy="70" rx="6.6" ry="2.4" stroke-width="1" stroke-dasharray="10 2 6 3"/><ellipse cx="146" cy="88" rx="7.4" ry="2.8" stroke-width="1.3" stroke-dasharray="18 4"/></g>`);
  mug(k, 40, 88, -1);
  // The stick: ink body, paper plug with two holes, a scrawled paper label, the flare activity light.
  k.add(k.shadow(84, 126, 86, 40, 50, { len: 14, spread: .3, sy: .3 }));
  const st = k.shape(rot(soft(84, 72, 34, 13, 3.6), 101, 78.5, -8), { wob: .2, tension: .9 });
  k.add(k.fill(st), k.rim(st, { from: .02, to: .3, w: 1.1 }));
  k.add(dev(k, 124, 75.4, 10, 8.4, -8, .8, 'paper', KL(1.1)), `<g transform="rotate(-8 124 75.4)"><path d="M122 73.6h1.6M125 73.6h1.6" stroke="${INK}" stroke-width="1.6"/></g>`);
  k.add(dev(k, 101, 78, 18, 7.4, -8, 1, 'paper'), `<g transform="rotate(-8 101 78)">${k.brush([[93.6, 77], [96, 76], [98, 78.6], [101, 76.4], [104, 79], [107, 76.6], [109, 78.4]], { w: 1.2, tip0: .3, tip1: .3, per: 3 })}</g>`);
  k.add(`<circle cx="88" cy="80.6" r="1.8" fill="${FLARE}"${KL(.7)}/>`);
  // Recon: the laptop at the right, closed, its port padlocked.
  k.add(k.shadow(160, 196, 82, 40, 50, { len: 10, spread: .3, sy: .3 }));
  k.add(k.fill(k.shape([[160, 76], [196, 75], [198, 82], [158, 83]], { wob: .3, tension: .6 }), 'ink', ` stroke="${PAPER}" stroke-width=".8"`));
  padlock(k, 172, 84, .9);
  return finish(k, 100, 92, 90, 4, 14);
}

// Old Case, New IOC: the March case pinned open on the wall, stamped closed; a fresh hash note pinned beside
// it, tied to the case photo with a flare thread. The cabinet drawer below hangs open.
// Recon: the magnifier lying on the open case.
function ioc(key) {
  const k = kit.scene({ key, seed: 307, spot: FLARE });
  wallLight(k, 186, 52, 92, 84, { r0: 10 });
  deskLight(k, 180, 84, 64, 86, { sy: .3, r0: 8, a: [100, 250] });
  // The laptop on a stool at the right edge: the torch.
  k.add(k.fill(k.shape([[176, 112], [178, 86], [204, 84], [204, 112]], { wob: .5 })), k.fill(k.shape([[180, 86], [184, 64], [204, 62], [204, 86]], { wob: .3, tension: .6 })), k.fill(k.shape([[183.6, 82], [186.4, 67], [204, 65.6], [204, 82]], { wob: .2, tension: .6 }), 'paper'), rows(k, 189, 70, 3, 3.6, [8, 12], 1.1));
  // The open case folder pinned up: two leaves, a photo of the laptop, rows; the right leaf stamped CLOSED.
  const left = k.shape(rot(soft(50, 8, 46, 52, 1.2), 73, 34, -3), { wob: .4, tension: .9 }), right = k.shape(rot(soft(96, 8, 46, 52, 1.2), 119, 34, 2), { wob: .4, tension: .9 });
  k.add(k.fill(k.shape([[46, 6], [146, 4], [148, 64], [46, 64]], { wob: .6 })), k.fill(left, 'paper', KL(1)), k.fill(right, 'paper', KL(1)));
  k.add(k.hatch(left, { a: 0, gap: 2.4, bend: 2, w: [1.2, .2], broken: .5, cover: [.0, .18] }));
  k.add(dev(k, 64, 22, 18, 14, -3, 1, 'ink'), k.fill(k.shape([[58.4, 25], [70, 24.4], [71, 27], [57.6, 27.6]], { wob: .1, tension: .6 }), 'paper'), k.fill(k.shape([[59, 17], [68.6, 16.6], [69.4, 23.4], [59.4, 24]], { wob: .1, tension: .6 }), 'paper'));
  k.add(rows(k, 56, 36, 5, 4, [24, 34], 1.1), rows(k, 102, 14, 6, 4, [24, 36], 1.1));
  k.add(`<g transform="rotate(-12 120 46)"><path d="M104 40.4Q120 39.6 136 40.4L136.4 52Q120 52.6 103.6 52Z" fill="none" stroke="${INK}" stroke-width="1.8"/></g>`, `<g transform="rotate(-12 120 46)">${rows(k, 107, 46.2, 1, 0, [24, 26], 2.4)}</g>`);
  k.add(`<circle cx="52" cy="8" r="1.6" fill="${INK}"${KL(.1)}/><circle cx="142" cy="7" r="1.6" fill="${INK}"/>`);
  // The new IOC: a hash note with a flare pin, a flare thread to the old photo.
  const note = k.shape(rot(soft(154, 18, 26, 18, 1), 167, 27, 6), { wob: .3, tension: .9 });
  k.add(`<path d="M164 20Q118 34 66 22" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M164 20Q118 34 66 22" fill="none" stroke="${FLARE}" stroke-width="1.1"/>`);
  k.add(k.fill(note, 'paper', KL(1.1)), rows(k, 157, 25, 3, 3.6, [16, 20], 1.1), `<circle cx="165" cy="19.6" r="2.2" fill="${FLARE}"${KL(.9)}/>`, `<circle cx="66" cy="21.6" r="1.8" fill="${FLARE}"${KL(.8)}/>`);
  // The filing cabinet below, its top drawer pulled out, folder tabs standing up.
  k.add(k.shadow(66, 136, 106, 186, 52, { len: 30, spread: .4, sy: .2 }));
  const cab = k.shape([[64, 66], [136, 66], [138, 112], [62, 112]], { wob: .5, chip: .2 });
  k.add(k.fill(cab), k.rim(cab, { from: .12, to: .4, w: 1.1 }));
  const drawer = k.shape(soft(58, 80, 84, 16, 2.4), { wob: .3, tension: .9 });
  // Folders standing in the drawer, each its own height and lean, ink tabs on top.
  let fold = '', ftab = [];
  for (let i = 0; i < 7; i++) { const x = 63 + i * 11, h = 12 + (i * 5 % 7), a = k.r(5); fold += k.shape(rot(soft(x, 82 - h, 9.4, h + 2, .8), x + 4.7, 82, a), { wob: .2, tension: .9 }).d; ftab.push([rot([[x + 2 + (i % 3) * 2, 81 - h], [x + 5 + (i % 3) * 2, 81 - h]], x + 4.7, 82, a), { w: 2.2, tip0: 1, tip1: 1, per: 2 }]); }
  k.add(`<path d="${fold}" fill="${PAPER}"${KL(1)}/>`, k.brushes(ftab));
  k.add(k.fill(drawer, 'ink', ` stroke="${PAPER}" stroke-width=".9"`), k.brush([[92, 89], [100, 88.4], [108, 89]], { w: 2.2, tone: 'paper', tip0: 1, tip1: 1 }));
  // Recon: the magnifier lying across the open case.
  magnifier(k, 90, 46, 7.4, 140, 12);
  k.add(rows(k, 85, 44, 2, 4.4, [9, 10], 2.2));
  return finish(k, 100, 108, 90, 3, 10);
}

// Honeytoken Tripped: the honey pot on its altar, a fake key stuck in it, the tripwire bell ringing, and
// amber honey footprints leading off into the dark. Recon: the watching camera's eye.
function honey(key) {
  const k = kit.scene({ key, seed: 308, spot: AMBER });
  wallLight(k, 26, 44, 88, 84, { r0: 14 });
  deskLight(k, 34, 84, 104, 86, { sy: .3, r0: 10, a: [-30, 160] });
  // The CCTV screen on the left wall: the torch.
  k.add(k.tendrils([[[26, 58], [10, 86], { sag: 4, curl: 2, w: 1.4, tip: .4, thorns: 1 }]]));
  k.add(dev(k, 26, 44, 34, 26, 0, 3), dev(k, 26, 43, 26, 18, 0, 1.6, 'paper'), k.fill(k.oval(26, 46, 4, 6, { n: 8 })), k.fill(k.oval(26, 39, 2.6, 2.4, { n: 7 })), k.staticNoise({ x: 14, y: 36, w: 24, h: 14 }, 5, { sw: .45 }));
  // Recon: the camera on its bracket, its lens a watching eye.
  k.add(k.brush([[46, 2], [50, 8], [56, 10]], { w: 2.2, tip0: 1, tip1: 1 }), dev(k, 62, 13, 18, 9, 18, 2.6), eye(k, 70, 17, 4.4, 18));
  // The altar: a chipped slab on a column, drips.
  k.add(k.shadow(76, 124, 88, 26, 44, { len: 40, spread: .4, sy: .2 }));
  const col = k.shape([[84, 62], [116, 62], [118, 88], [82, 88]], { wob: .6, chip: .3 });
  k.add(k.fill(col), k.hatch(col, { a: 90, gap: 2.6, bend: 3, w: [1.2, .2], tone: 'paper', broken: .4, cover: [.62, 1] }));
  const slab = k.shape([[74, 56], [126, 55], [128, 63], [72, 64]], { wob: .5, chip: .4 });
  k.add(k.fill(slab), k.rim(slab, { from: .68, to: .98, w: 1.2 }), k.drips(76, 124, 63, 4, { len: [2, 6], w: 1.2 }));
  // The pot: round belly, a paper rim, the lid knocked askew, honey welling over in amber.
  const pot = k.shape([[86, 32], [114, 32], [120, 44], [114, 56], [86, 56], [80, 44]], { wob: .4 });
  k.add(k.fill(pot), k.rim(pot, { from: .55, to: .9, w: 1.3 }), k.hatch(pot, { a: 90, gap: 2.4, bend: 4, w: [1, .2], tone: 'paper', broken: .4, cover: [.7, 1] }));
  k.add(k.brushes([[[[84, 46], [100, 49], [116, 46]], { w: 1, tip0: .3, tip1: .3 }], [[[84, 40], [100, 43], [116, 40]], { w: 1, tip0: .3, tip1: .3 }]], 'paper'));
  k.add(k.fill(k.oval(100, 31, 15, 3.4, { n: 9 }), 'paper', KL(1.4)), k.fill(k.oval(100, 31, 11, 1.8, { n: 8 })));
  const lid = k.shape(rot([[82, 24], [100, 22], [118, 24], [114, 28], [86, 28]], 100, 25, -14), { wob: .3 });
  k.add(k.fill(lid, 'ink', ` stroke="${PAPER}" stroke-width=".9"`), k.brush(rot([[100, 22], [100, 18]], 100, 25, -14), { w: 3, tip0: 1, tip1: 1, per: 2 }));
  const ooze = [[[[90, 32], [89, 38], [90, 44]], { w: 3.6, tip0: 1, tip1: .3 }], [[[104, 33], [105, 41], [104, 52]], { w: 4, tip0: 1, tip1: .3 }], [[[112, 32], [113, 36]], { w: 3, tip0: 1, tip1: .4 }], [[[96, 32], [102, 30.4], [110, 32]], { w: 3, tip0: .6, tip1: .6 }]];
  k.add(k.brushes(ooze.map(([p, o]) => [p, { ...o, w: o.w + 1.8 }])), k.brushes(ooze, 'spot'));
  // The honeytoken: a fake admin key stuck in the honey.
  k.add(keyGlyph(k, 118, 12, 124, 18, 'paper'));
  // The tripwire to the bell on the right wall, ringing.
  k.add(`<path d="M116 40Q140 30 150 22" fill="none" stroke="${PAPER}" stroke-width="2"/><path d="M116 40Q140 30 150 22" fill="none" stroke="${INK}" stroke-width=".8"/>`);
  k.add(k.brush([[150, 6], [150, 12]], { w: 1.4 }), k.fill(k.shape([[144, 24], [146, 14], [150, 11], [154, 14], [156, 24], [158, 26], [142, 26]], { wob: .2, tension: .8 }), 'ink', ` stroke="${PAPER}" stroke-width="1"`), k.fill(k.oval(150, 27.6, 1.8, 1.8, { n: 6 }), 'spot', KL(.6)), k.buzz(150, 19, 9, { tone: 'paper', w: 1, rings: 2 }));
  // Honey footprints leading away to the right, into the dark: now you know where they are.
  let prints = '';
  [[132, 98, -6], [146, 104, 4], [160, 97, -4], [174, 103, 6], [188, 96, -2]].forEach(([x, y, a]) => { prints += k.shape(rot([[x - 3.6, y], [x - 1.6, y - 1.8], [x + 2, y - 1.6], [x + 3.6, y], [x + 2, y + 1.6], [x - 1.6, y + 1.8]], x, y, a), { wob: .1, tension: .8 }).d; });
  k.add(`<path d="${prints}" fill="${AMBER}"${KL(1)}/>`);
  return finish(k, 90, 102, 80, 6, 14);
}

// Vendor Breach Notice: 04:12, a raven lands on the sill of the rain window with the vendor's letter in its
// beak, the flare seal cracked. Recon: the rotated key ring hanging on its nail, a turn-arrow chalked by it.
function vendor(key) {
  const k = kit.scene({ key, seed: 309, spot: FLARE });
  wallLight(k, 30, 84, 124, 86, { r0: 14, a: [-90, 10] });
  deskLight(k, 16, 90, 84, 92, { sy: .3, r0: 8, a: [-60, 60] });
  // The monitor at bottom left: the torch.
  k.add(k.fill(k.shape([[-4, 64], [24, 62], [28, 88], [-4, 90]], { wob: .4, tension: .6 })), k.fill(k.shape([[-2, 67.6], [20.6, 66.4], [24, 85.6], [-2, 86.4]], { wob: .2, tension: .6 }), 'paper'), rows(k, 2, 71.4, 3, 4, [10, 14], 1.2));
  k.add(`<path d="M14 82.6h6" stroke="${FLARE}" stroke-width="1.6"/>`, k.tendrils([[[18, 90], [52, 106], { sag: 5, curl: 2, w: 1.4, tip: .4, thorns: 1 }]]));
  archWindow(k, 152, 6, 38, 58, -1, 22);
  clock(k, 46, 20, 8.4, 4, 12);
  // Recon: the key ring on a nail, three fresh keys, a chalked turn-arrow.
  k.add(k.fill(k.oval(70, 44, 1.6, 1.6, { n: 6 })), k.brush([[70, 44], [70, 48]], { w: 1, per: 2 }), k.fill(k.oval(70, 52, 4.2, 4.2, { n: 9 }), 'none', ` stroke="${INK}" stroke-width="1.4"`));
  k.add(keyGlyph(k, 68, 57, 96, 11, 'paper'), keyGlyph(k, 72, 57, 76, 12, 'paper'));
  k.add(`<path d="M58 52a12 12 0 1 0 2-6" fill="none" stroke="${INK}" stroke-width="1.1" stroke-dasharray="2.4 1.6"/>`, k.brush([[58.6, 46], [60.4, 45.4], [60, 47.6]], { w: 1.2, tip0: .4, tip1: .4, per: 2 }));
  // The sill (a long ledge across the room), and the raven on it: rim-lit, wings half folded, letter held.
  k.add(k.brush([[84, 74], [140, 73], [196, 74.4]], { w: 4.4, tip0: .5, tip1: .5 }), k.drips(86, 194, 75, 5, { len: [3, 8], w: 1.2 }));
  k.add(k.shadow(98, 130, 74, 16, 82, { len: 22, spread: .3, sy: .2 }));
  const raven = k.shape([[98, 40], [104, 32], [112, 30], [120, 36], [126, 48], [138, 60], [146, 70], [130, 70], [118, 70], [104, 66], [98, 54]], { wob: .5 });
  k.add(k.fill(raven), k.rim(raven, { from: .84, to: 1, w: 1.3 }), k.rim(raven, { from: 0, to: .1, w: 1.2 }), k.hatch(raven, { a: 30, gap: 2.4, bend: -3, w: [.2, 1], tone: 'paper', broken: .5, cover: [.72, .92] }));
  k.add(k.brushes([[[[110, 46], [122, 52], [134, 64]], { w: 1, tip0: .3, tip1: .02 }], [[[108, 52], [118, 58], [126, 66]], { w: .9, tip0: .3, tip1: .02 }]], 'paper'));
  k.add(k.brushes([[[[106, 70], [105, 74.6]], { w: 1.4, per: 2 }], [[[114, 70], [115, 74.6]], { w: 1.4, per: 2 }]]));
  k.add(k.brush([[100, 36], [92, 38], [86, 40]], { w: 3.6, tip0: 1, tip1: .1 }), `<circle cx="104" cy="35.6" r="1.4" fill="${FLARE}"/>`);
  // The letter in its beak, swinging: the seal cracked in two.
  const env = k.shape(rot(soft(70, 38, 22, 15, 1.2), 81, 45.5, -14), { wob: .3, tension: .8 });
  k.add(k.fill(env, 'paper', KL(1)), k.brush(rot([[71, 39], [81, 47], [91, 39]], 81, 45.5, -14), { w: 1, tip0: .4, tip1: .4, per: 3 }));
  k.add(`<g transform="rotate(-14 81 45.5)"><path d="M78.2 47.6a2.6 2.6 0 0 1 2.4-2.8l.6 2.4-.8 1.2.6 1.6a2.6 2.6 0 0 1-2.8-2.4z" fill="${FLARE}"${KL(.7)}/><path d="M82 44.8a2.6 2.6 0 0 1 1.8 4.8l-.4-1.6.8-1.2z" fill="${FLARE}"${KL(.7)}/></g>`);
  return finish(k, 100, 104, 90, 6, 14);
}

const art = {
  sit_insider: insider('sit_insider'), sit_lateral: lateral('sit_lateral'), sit_ceo: ceo('sit_ceo'),
  sit_change: change('sit_change'), sit_chatter: chatter('sit_chatter'), sit_usb: usb('sit_usb'),
  sit_ioc: ioc('sit_ioc'), sit_honey: honey('sit_honey'), sit_vendor: vendor('sit_vendor'),
};
fs.writeFileSync(path.join(__dirname, 'ink-art.json'), JSON.stringify({ art, print: {} }, null, 1) + '\n');
console.log(Object.fromEntries(Object.entries(art).map(([k, v]) => [k, +(v.length / 1024).toFixed(1)])));
