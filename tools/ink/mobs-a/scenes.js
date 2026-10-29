// MOBS-A: seven mob scenes in Ink & Static, drawn with the lead's ink-kit.
// Usage: node scenes.js  -> writes ink-art.json { art: {...}, print: {} }
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../ink-kit');
const { FLARE, soft, rot } = kit;
const INK = '#07060A';
const f1 = n => (Math.round(n * 10) / 10).toString();

// ---------- shared pieces ----------
// The desk-altar with its monitor at one side (L or R): the scene's only light. Mirrors mailer()'s altar.
function altar(k, side) {
  const M = side === 'R' ? p => p.map(([x, y]) => [200 - x, y]) : p => p;
  k.add(k.fill(k.shape(M([[-2, 75], [18, 72], [38, 75], [40, 92], [38, 113], [-2, 113]]), { wob: .5, tension: .7 })));
  k.add(k.brush(M([[0, 74], [20, 72], [38, 75]]), { w: 1.1, tone: 'paper', tip0: .3, tip1: .1 }));
  const dx = side === 'R' ? 160 : 4;
  k.add(k.drips(dx, dx + 32, 76, 4, { len: [3, 8], w: 1.3, tone: 'paper' }));
  k.add(k.fill(k.shape(M([[6, 52], [16, 48.5], [25, 47], [27, 60], [27, 73], [17, 73.5], [8, 74]]), { wob: .3, tension: .5 })));
  k.add(k.fill(k.shape(M([[25, 47], [30, 50], [32, 56], [31.5, 70], [27, 73]]), { wob: .2, tension: .6 }), 'paper'));
  k.add(k.staticNoise({ x: side === 'R' ? 168.5 : 26.5, y: 52, w: 5, h: 18 }, 5, { sw: .5 }));
  k.add(k.smoke(side === 'R' ? 185 : 15, 46, 30, { n: 2, sway: 5, w: 1.1 }));
}
// Wall and floor light thrown from the altar's screen.
function torch(k, side, { r = 132, fr = 140, floorY = 89 } = {}) {
  const L = side === 'R';
  k.add(k.glow({ x: L ? 170 : 30, y: 64, r: [24, r], a: L ? [154, 262] : [-82, 26], clip: { x: 0, y: 0, w: 200, h: floorY }, w: [.15, 2.2], step: 5.2 }));
  k.add(k.glow({ x: L ? 166 : 34, y: 86, r: [8, fr], a: L ? [140, 188] : [-8, 40], sy: .32, step: 6.6, clip: { x: 0, y: floorY, w: 200, h: 112 - floorY }, w: [.2, 1.8] }));
  k.add(k.brush([[0, floorY], [60, floorY - .4], [130, floorY + .4], [200, floorY - .2]], { w: 1.6, tip0: .6, tip1: .6 }));
}
// An arm with a paper gap under it so it separates from the mass behind.
const limb = (k, p, w, o = {}) => k.brush(p, { w: w + 2.2, tone: 'paper', tip0: o.tip0 ?? .7, tip1: o.tip1 ?? .4 }) + k.brush(p, { w, tip0: o.tip0 ?? .8, tip1: o.tip1 ?? .4 });
// Claws: short needle strokes fanning from a point.
const claws = (k, x, y, dirs, w = 1.4, tone = 'ink') => k.brushes(dirs.map(([dx, dy, bx = 0, by = 0]) => [[[x, y], [x + dx * .55 + bx, y + dy * .55 + by], [x + dx, y + dy]], { w, tip0: 1, tip1: .05, per: 3 }]), tone);
// A pointed arch (rack niche / door) as an organic shape.
const arch = (x, y0, w, y1) => [[x, y1], [x - .4, y0 + w * .5], [x + w * .2, y0 + w * .12], [x + w / 2, y0 - w * .25], [x + w * .8, y0 + w * .12], [x + w + .4, y0 + w * .5], [x + w, y1]];
const eyes = (a, b, rx = 1.9, ry = 1) => `<ellipse cx="${a[0]}" cy="${a[1]}" rx="${rx}" ry="${ry}" fill="${FLARE}"/><ellipse cx="${b[0]}" cy="${b[1]}" rx="${rx * .9}" ry="${ry * .95}" fill="${FLARE}"/>`;

// ---------- Macro Gremlin: a gargoyle-imp perched on a cursed .docm page, claws in the Enable Content bar ----------
function macro(key) {
  const k = kit.scene({ key, seed: 61, spot: FLARE });
  torch(k, 'R', { r: 112, fr: 120 });
  altar(k, 'R');
  // The page arrived through the mail cables: they root from the altar into its foot.
  k.add(k.tendrils([[[168, 78], [118, 93], { sag: 6, curl: 2, w: 1.7, tip: .4, thorns: 1 }], [[164, 84], [96, 97], { sag: 8, curl: 2.5, w: 1.3, tip: .3, thorns: 1 }]]));
  k.add(k.shadow(72, 128, 92, 170, 64, { len: 58, spread: .5, sy: .22 }));
  // The page: a tall leaf of parchment, dog-eared, its shadow side hatched round the curl.
  const page = k.shape(rot([[75, 39], [98, 37.5], [117, 37], [126, 45], [127, 66], [128.5, 91], [100, 92.5], [72, 91], [73.5, 64]], 100, 64, -3), { wob: .4, tension: .75, chip: .12 });
  k.add(k.fill(page, 'paper', ` stroke="${INK}" stroke-width="1.8"`));
  k.add(k.hatch(page, { a: 92, gap: 2.2, bend: 5, w: [.2, 1.5], broken: .35, cover: [.72, 1] }));
  k.add(k.fill(k.shape(rot([[117, 37], [118.6, 44], [126, 45]], 100, 64, -3), { wob: .1, tension: .4 })));
  // Lines of text, broken round the gear cut.
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const y = 51 + i * 5.4, gap = Math.abs(y - 67) < 12;
    const segs = gap ? [[79, 86 + k.r(1)], [113 + k.r(1), 120 + k.r(2)]] : [[79, 98 + k.R() * 22]];
    segs.forEach(([a, b]) => rows.push([rot([[a, y], [(a + b) / 2, y + k.r(.4)], [b, y]], 100, 64, -3), { w: 1.3, tip0: .5, tip1: .2, per: 3 }]));
  }
  k.add(k.brushes(rows));
  // The gear cut clean through the page: a toothed hole into the dark.
  const gp = [];
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, rr = (i % 4 < 2) ? 10.4 : 7.6; gp.push([100 + Math.cos(a) * rr, 67 + Math.sin(a) * rr]); }
  k.add(k.fill(k.shape(gp, { wob: .25, tension: .35 })), `<circle cx="100" cy="67" r="2.6" fill="none" stroke="#F3E9E2" stroke-width="1.2"/>`);
  // Enable Content: a flare bar on an ink keyline across the top of the page.
  const bar = k.shape(rot(soft(78, 42, 42, 6.2, 2.6), 100, 64, -3), { wob: .2, tension: .9 });
  k.add(k.fill(bar), k.fill(k.shape(rot(soft(80, 43.5, 38, 3.2, 1.4), 100, 64, -3), { wob: .1, tension: .9 }), 'spot'));
  k.add(k.brushes([[rot([[83, 45.1], [92, 45.1]], 100, 64, -3), { w: 1.1, per: 2, tip0: .6, tip1: .6 }], [rot([[108, 45.1], [116, 45.1]], 100, 64, -3), { w: 1.1, per: 2, tip0: .6, tip1: .6 }]]));
  // The tail comes out of the gear hole, over the page and up to the rump: it lives inside the file.
  const tail = [[104, 70], [114, 64], [122, 54], [123, 42], [117, 31]];
  k.add(k.brush(tail, { w: 5.4, tone: 'paper', tip0: .2, tip1: .6 }), k.brush(tail, { w: 3.6, w0: .4, w1: 1, tip0: .1, tip1: .8 }));
  k.add(k.fill(k.shape([[102, 72], [99, 66], [106, 68.5]], { wob: .1, tension: .3 })));
  // The gremlin: a crouched gargoyle on the page's top edge, spines like gear teeth down its back.
  const body = k.shape([[89, 35], [92, 26], [101, 19], [111, 19], [119, 25], [121, 33], [117, 38], [104, 38.5], [94, 39]], { wob: .4 });
  k.add(k.brushes([[[104, 19.5], [106, 13]], [[110, 19], [114, 13]], [[115.5, 21], [121, 17]], [[119, 26], [125, 24]]].map(p => [p, { w: 2.6, tip0: 1, tip1: .02, per: 3 }])));
  k.add(k.fill(body));
  k.add(k.rim(body, { from: .38, to: .62, w: 1.1 }));
  // Haunches and feet hooked over the top edge.
  k.add(k.brushes([[[[113, 34], [116, 38], [113, 41.5]], { w: 5, tip0: 1, tip1: .5 }], [[[97, 35], [96, 38.5], [99, 41]], { w: 4, tip0: 1, tip1: .5 }]]));
  k.add(claws(k, 113, 41, [[-2, 4], [1, 4.4], [3, 3.4]], 1.2), claws(k, 99, 40.5, [[-1.5, 4], [1.5, 4.2]], 1.1));
  // Arms reach down the page front and dig claws into the bar.
  k.add(limb(k, [[93, 30], [86, 36], [83, 42], [84.5, 46]], 3.4, { tip0: .9, tip1: .5 }));
  k.add(claws(k, 84.5, 45.5, [[-2.4, 4.2], [0, 5], [2.4, 4.4]], 1.3));
  // Head low and forward, long ears swept back, eyes in the void.
  k.add(k.fill(k.oval(87, 25, 7, 6, { n: 9, lump: .06, rot: -10 })));
  k.add(k.brushes([[[[86, 21], [78, 15], [68, 13.5]], { w: 3.6, tip0: 1, tip1: .02 }], [[[91, 20], [93, 13], [99, 8]], { w: 3.2, tip0: 1, tip1: .02 }]]));
  k.add(k.brush([[81, 21], [74, 16], [69, 14.4]], { w: .7, tone: 'paper', tip0: .3, tip1: .05 }));
  k.add(eyes([84.4, 26.4], [89.2, 26.6], 1.8, 1));
  k.add(k.stipple(70, 102, 60, 7, 14, { size: .8 }));
  return k.svg();
}

// ---------- Password Sprayer: a crouched hooded thing with a tank on its back, spraying stars at the doors ----------
function asterisk(k, x, y, s, a) {
  return [0, 60, 120].map(d => { const t = (a + d) * Math.PI / 180, c = Math.cos(t) * s, n = Math.sin(t) * s; return [[[x - c, y - n], [x + c, y + n]], { w: s * .55, tip0: .5, tip1: .5, per: 1 }]; });
}
function spray(key) {
  const k = kit.scene({ key, seed: 73, spot: FLARE });
  torch(k, 'L', { fr: 118 });
  altar(k, 'L');
  // Three locked doors down the corridor: pointed arches, each with a badge reader.
  const doors = [[134, 34, 20], [160, 30, 22], [188, 28, 22]];
  doors.forEach(([x, y, w]) => { const d = k.shape(arch(x, y, w, 90), { wob: .4, tension: .8 }); k.add(k.fill(d), k.rim(d, { from: .02, to: .4, w: .9 })); });
  doors.forEach(([x, , w]) => k.add(k.fill(k.shape(soft(x + w - 6, 58, 3.6, 6, 1.2), { wob: .1, tension: .9 }), 'paper')));
  // The cone of guesses: asterisks fanning out from the nozzle across the doors. One sticks.
  const pap = [];
  for (let i = 0; i < 9; i++) {
    const t = (i + .5) / 9, x = 134 + t * 64 + k.r(3), y = 46 + (k.R() - .5) * (8 + t * 46), s = 1.6 + t * 1.5;
    if (Math.abs(x - 171) < 4 && Math.abs(y - 62) < 6) continue;
    pap.push(...asterisk(k, x, y, s, k.R() * 60));
  }
  k.add(k.brushes([[[[130, 44], [136, 41], [142, 42]], { w: 1, tip0: .2, tip1: .1 }], [[[131, 47], [137, 48], [141, 51]], { w: .9, tip0: .2, tip1: .1 }]]));
  k.add(k.brushes(pap, 'paper'));
  k.add(k.brushes(asterisk(k, 171, 61.5, 3.6, 10).map(([p, o]) => [p, { ...o, w: 3.4 }])), k.brushes(asterisk(k, 171, 61.5, 3.2, 10).map(([p, o]) => [p, { ...o, w: 1.5 }]), 'spot'));
  // Cables from the altar crawl to its feet; its shadow runs away from the light toward the doors.
  k.add(k.tendrils([[[30, 78], [82, 93], { sag: 6, curl: 2, w: 1.7, tip: .4, thorns: 1 }], [[34, 83], [112, 96], { sag: 8, curl: 2.5, w: 1.2, tip: .3 }]]));
  k.add(k.shadow(74, 120, 92, 30, 64, { len: 60, spread: .5, sy: .2 }));
  // The tank on its back: a hatched iron belly full of Summer2026!, hose over the shoulder.
  const tank = k.oval(78, 54, 10, 14, { n: 10, lump: .05, rot: -14 });
  k.add(k.fill(tank, 'paper', ` stroke="${INK}" stroke-width="1.6"`), k.hatch(tank, { a: -20, gap: 2.5, bend: 5, w: [1.6, .3], broken: .25 }));
  k.add(k.brushes([[[[70, 46], [79, 43], [86, 46]], { w: 1.6, tip0: .8, tip1: .8 }], [[[69, 62], [78, 60], [87, 63]], { w: 1.6, tip0: .8, tip1: .8 }]]));
  // The body: crouched, hunched, a ragged cloak dragging on the floor.
  const body = k.shape([[86, 44], [94, 36], [106, 33], [116, 38], [120, 50], [118, 66], [122, 80], [124, 89], [110, 90], [98, 88], [86, 90], [76, 88], [80, 72], [84, 60]], { wob: .5 });
  k.add(k.fill(body), k.drips(78, 122, 88, 6, { len: [3, 7], w: 2.2 }));
  k.add(k.rim(body, { from: .82, to: 1.05, w: 1.2 }));
  k.add(k.brushes([[[[100, 88], [97, 92], [92, 94]], { w: 4, tip0: 1, tip1: .3 }], [[[116, 88], [120, 92], [126, 94]], { w: 4, tip0: 1, tip1: .3 }]]));
  // Hood: peaked, drooping back, its void facing the doors; flare eyes inside.
  const hood = k.shape([[92, 34], [84, 26], [96, 22], [108, 22], [117, 27], [122, 35], [121, 43], [114, 46], [104, 44]], { wob: .3 });
  k.add(k.fill(hood), k.brush([[95, 23], [86, 24], [80, 30]], { w: 3, tip0: .9, tip1: .02 }));
  k.add(k.brushes([[[[84, 26], [96, 21.6], [108, 21.6], [117, 26.6]], { w: 1.1, tip0: .1, tip1: .1 }], [[[78, 31], [84, 25.6]], { w: .7, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(eyes([115.6, 35.4], [119.6, 35.8], 1.7, .95));
  // Hose from the tank over the shoulder to the can.
  k.add(k.tendril([84, 42], [122, 50], { sag: -10, curl: 1, w: 1.8, tip: .8, segs: 4 }));
  // The arm out, the can in its claws, the nozzle aimed at the doors.
  k.add(limb(k, [[110, 46], [117, 50], [123, 50]], 5, { tip0: 1, tip1: .6 }));
  const can = k.shape(rot(soft(121, 40, 8, 14, 2.6), 125, 47, 70), { wob: .2, tension: .9 });
  k.add(k.fill(can, 'ink', ` stroke="#F3E9E2" stroke-width=".9"`), k.fill(k.shape(soft(130, 42.5, 3, 4, 1), { wob: .1 })));
  k.add(claws(k, 121, 51, [[2, 3.5], [4.5, 2.6]], 1.2));
  k.add(k.stipple(130, 101, 60, 7, 14, { size: .8 }));
  return k.svg();
}

// ---------- MFA Banshee: a wailing shroud whose head is a buzzing handset, Approve lit on its face ----------
function banshee(key) {
  const k = kit.scene({ key, seed: 89, spot: FLARE });
  torch(k, 'R', { r: 120, fr: 120 });
  altar(k, 'R');
  k.add(k.tendrils([[[168, 80], [116, 94], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }]]));
  // It floats: its shadow pools on the flagstones under the hem, thrown left.
  k.add(k.fill(k.oval(88, 97, 28, 3.6, { n: 9, lump: .12 })));
  k.add(k.shadow(76, 116, 94, 170, 64, { len: 44, spread: .6, sy: .18 }));
  // Ghost prompts flung out by the wail: small cards drifting round it.
  [[50, 66, -18], [144, 44, 14], [58, 40, -8], [140, 76, 20]].forEach(([x, y, a]) => {
    k.add(k.fill(k.shape(rot(soft(x - 7, y - 4.5, 14, 9, 1.8), x, y, a), { wob: .2, tension: .9 }), 'paper', ` stroke="${INK}" stroke-width="1"`));
    k.add(k.brushes([[rot([[x - 4.5, y - 1.6], [x + 3, y - 1.6]], x, y, a), { w: .9, per: 2, tip0: .6, tip1: .4 }], [rot([[x - 1, y + 2], [x + 4.5, y + 2]], x, y, a), { w: 2.2, per: 2, tip0: .9, tip1: .9 }]]));
  });
  // Hair: long cable streams blown back from the handset, its roots in the floor behind.
  k.add(k.tendrils([[[93, 18], [52, 22], { sag: -4, curl: 4, w: 2.6, tip: .1, segs: 5 }], [[92, 22], [44, 48], { sag: 6, curl: 4, w: 2.4, tip: .1, segs: 5 }], [[94, 26], [58, 62], { sag: 8, curl: 3, w: 2, tip: .1, segs: 5 }], [[106, 16], [130, 8], { sag: -2, curl: 2, w: 1.6, tip: .1 }]]));
  // The shroud, tattered at the hem, trailing into ink rags that reach the floor.
  const shroud = k.shape([[90, 44], [100, 41], [111, 45], [117, 56], [121, 70], [127, 84], [118, 81], [111, 90], [101, 83], [92, 91], [84, 82], [72, 87], [77, 72], [82, 56]], { wob: .5 });
  k.add(k.fill(shroud), k.drips(76, 124, 84, 6, { len: [4, 10], w: 2.4 }));
  k.add(k.rim(shroud, { from: .1, to: .38, w: 1.2 }));
  // Arms flung up, claws spread: the wail.
  k.add(limb(k, [[88, 50], [78, 42], [70, 32], [66, 24]], 3.6), limb(k, [[112, 50], [122, 42], [130, 32], [135, 24]], 3.6));
  k.add(claws(k, 66, 24.5, [[-4, -3], [-1.5, -5], [1.5, -5]], 1.3), claws(k, 135, 24.5, [[4, -3], [1.5, -5], [-1.5, -5]], 1.3));
  // The neck and head: a tilted handset, the screen the only face it has.
  k.add(k.brush([[100, 44], [100.5, 40], [101, 36]], { w: 7, tip0: 1, tip1: 1 }));
  const A = -14, C = [100, 27];
  k.add(k.fill(k.shape(rot(soft(91, 12, 18, 30, 4), C[0], C[1], A), { wob: .2, tension: .9 }), 'ink', ` stroke="#F3E9E2" stroke-width=".8"`));
  k.add(k.fill(k.shape(rot(soft(93.4, 16, 13.2, 21, 1.6), C[0], C[1], A), { wob: .1, tension: .9 }), 'paper'));
  k.add(k.brushes([[rot([[95.6, 19.6], [103.6, 19.6]], C[0], C[1], A), { w: 1, per: 2, tip0: .6, tip1: .4 }], [rot([[95.6, 22.6], [101.4, 22.6]], C[0], C[1], A), { w: .8, per: 2, tip0: .6, tip1: .4 }], [rot([[95.6, 25.2], [104, 25.2]], C[0], C[1], A), { w: .8, per: 2, tip0: .6, tip1: .4 }]]));
  k.add(k.fill(k.shape(rot(soft(95, 29.6, 10, 4.6, 1.6), C[0], C[1], A), { wob: .1, tension: .9 })), k.fill(k.shape(rot(soft(96, 30.4, 8, 3, 1.1), C[0], C[1], A), { wob: .05, tension: .9 }), 'spot'));
  // The badge count on its corner: an ink seal with a paper 9.
  const [[bx, by]] = rot([[109, 13]], C[0], C[1], A);
  k.add(`<circle cx="${f1(bx)}" cy="${f1(by)}" r="4" fill="${INK}" stroke="#F3E9E2" stroke-width=".8"/><circle cx="${f1(bx - .2)}" cy="${f1(by - .9)}" r="1.15" fill="none" stroke="#F3E9E2" stroke-width=".8"/>`);
  k.add(k.brush([[bx + .9, by - .8], [bx + .8, by + 1], [bx - .4, by + 2.2]], { w: .8, tone: 'paper', per: 2, tip0: .8, tip1: .3 }));
  // The buzz: arcs shaking off either side of the handset.
  k.add(`<g transform="rotate(${A} ${C[0]} ${C[1]})">${k.buzz(C[0], C[1], 10, { w: 1.3, rings: 3 })}</g>`);
  k.add(k.stipple(70, 104, 64, 6, 14, { size: .8 }));
  return k.svg();
}

// ---------- Vibe Coded App: a leaning golem of slabs, one crack down it, keys dangling, the deploy light on top ----------
function vibe(key) {
  const k = kit.scene({ key, seed: 97, spot: FLARE });
  torch(k, 'L', { r: 112, fr: 120 });
  // The crypt of racks behind, in the dark: arched niches with votive LEDs.
  [[148, 24, 20], [172, 20, 22]].forEach(([x, y, w]) => k.add(k.fill(k.shape(arch(x, y, w, 89), { wob: .4, tension: .8 }), 'none', ` stroke="#F3E9E2" stroke-width=".7"`)));
  k.add(k.stipple(158, 58, 3, 24, 8, { size: 1.1, bias: .2 }), k.stipple(183, 54, 3, 26, 8, { size: 1.1, bias: .2 }));
  altar(k, 'L');
  k.add(k.tendrils([[[30, 78], [86, 94], { sag: 6, curl: 2, w: 1.7, tip: .4, thorns: 1 }], [[112, 92], [150, 100], { sag: 4, curl: 2, w: 1.5, tip: .2, thorns: 1 }]]));
  k.add(k.shadow(78, 124, 92, 30, 64, { len: 62, spread: .5, sy: .22 }));
  // Chips fallen off it, on the floor.
  k.add(k.fill(k.shape([[128, 93], [131, 91.5], [133, 94], [129, 95]], { wob: .2 })), k.fill(k.shape([[66, 95], [69, 93.6], [70.5, 96.4]], { wob: .2 })));
  // Feet.
  k.add(k.fill(k.oval(90, 89, 8, 3.6, { n: 8 })), k.fill(k.oval(112, 89.4, 8, 3.6, { n: 8 })));
  // The stack: lumpy slabs, each pushed a little further right than the one under it.
  const slabs = [[100, 80, 20, 8, -2], [103, 66, 18, 7, 5], [106, 53, 20, 7, -6], [111, 40, 16, 6.6, 8], [115, 28.5, 14, 6, -4], [118, 18, 9, 5, 6]];
  const S = slabs.map(([x, y, rx, ry, a]) => k.oval(x, y, rx, ry, { n: 10, lump: .07, rot: a }));
  k.add(k.fill(S.map(s => s.d).join(''), 'ink', ` stroke="#F3E9E2" stroke-width="1"`));
  k.add(k.hatch(S[2], { a: 100, gap: 2, bend: 3, w: [.2, .9], tone: 'paper', broken: .4, cover: [0, .26] }));
  S.slice(0, 5).forEach(s => k.add(k.rim(s, { from: .5, to: .78, w: 1.3 })));
  // The crack, all the way down.
  k.add(k.brush([[119, 14], [115, 22], [118, 29], [110, 38], [113, 46], [104, 54], [107, 62], [99, 70], [102, 78], [96, 87]], { w: 1.6, tone: 'paper', tip0: .2, tip1: .1, per: 3 }));
  // Arms: the left one droops toward the light, the right one braces, both hung with keys on strings.
  k.add(limb(k, [[86, 54], [76, 62], [70, 72], [69, 80]], 6, { tip0: 1, tip1: .6 }), limb(k, [[124, 44], [136, 50], [143, 60]], 5.6, { tip0: 1, tip1: .6 }));
  k.add(claws(k, 69, 79.5, [[-2.6, 3.2], [0, 4], [2.4, 3.2]], 1.4), claws(k, 143, 59.5, [[-1.5, 3.6], [1.2, 3.8], [3.6, 2.4]], 1.3));
  const keyAt = (x, y, l, a) => {
    k.add(k.brush([[x, y], [x + .6, y + l * .5], [x + .2, y + l]], { w: .7, tip0: 1, tip1: 1, per: 3 }));
    const cy = y + l + 2.6, g = `<g transform="rotate(${a} ${x} ${y + l})"><circle cx="${f1(x)}" cy="${f1(cy)}" r="2.4" fill="#F3E9E2" stroke="${INK}" stroke-width=".9"/><circle cx="${f1(x)}" cy="${f1(cy)}" r=".8" fill="${INK}"/>`
      + k.brushes([[[[x, cy + 2.2], [x, cy + 9]], { w: 2.2, tip0: 1, tip1: 1, per: 2 }], [[[x, cy + 7.6], [x + 2.6, cy + 7.6]], { w: 1.8, tip0: 1, tip1: 1, per: 2 }], [[[x, cy + 5], [x + 2, cy + 5]], { w: 1.6, tip0: 1, tip1: 1, per: 2 }]], 'paper')
      + k.brushes([[[[x, cy + 2.4], [x, cy + 8.6]], { w: .9, per: 2, tip0: .6, tip1: .6 }]]) + '</g>';
    k.add(g);
  };
  keyAt(143, 62, 6, -8); keyAt(87, 59.6, 9, 6); keyAt(126, 46, 11, -4);
  // The deploy light on top, a single eye: flare on ink.
  k.add(`<circle cx="118.6" cy="15.6" r="3.2" fill="${INK}"/><circle cx="118.6" cy="15.6" r="2" fill="${FLARE}"/>`);
  k.add(k.stipple(130, 102, 64, 7, 14, { size: .8 }));
  return k.svg();
}

// ---------- PowerShell Wraith: a hooded wraith rising as smoke out of the terminal on the altar ----------
function wraith(key) {
  const k = kit.scene({ key, seed: 103, spot: FLARE });
  // The terminal lights the wall all round it: the wraith stands in its own light.
  k.add(k.glow({ x: 100, y: 64, r: [16, 86], a: [0, 360], sy: .9, step: 5, clip: { x: 0, y: 0, w: 200, h: 79 }, w: [.15, 2.3] }));
  // The altar: a long slab across the room, lit along its top, dripping.
  const slab = k.shape([[-4, 80], [60, 78.4], [140, 78.6], [204, 80], [204, 116], [-4, 116]], { wob: .5, tension: .7 });
  k.add(k.fill(slab), k.glow({ x: 100, y: 79, r: [6, 80], a: [0, 180], sy: .14, step: 3, clip: { x: 0, y: 79, w: 200, h: 7 }, w: [.2, 1.4] }));
  k.add(k.brush([[0, 79.6], [60, 78.4], [140, 78.6], [200, 79.8]], { w: 1.4, tip0: .5, tip1: .5 }));
  k.add(k.drips(10, 190, 86, 9, { len: [3, 10], w: 1.4, tone: 'paper' }));
  // Cables root down the altar face from the terminal.
  k.add(k.tendrils([[[90, 82], [62, 108], { sag: 4, curl: 2, w: 1.6, tip: .3, thorns: 1 }], [[110, 82], [146, 106], { sag: 4, curl: 2, w: 1.6, tip: .3, thorns: 1 }]], 'paper'));
  // The disk: a drive on the altar the smoke never touches, platter hatched grey.
  k.add(k.fill(k.oval(152, 82.6, 15, 2.2, { n: 8 })));
  k.add(k.fill(k.shape(soft(140, 68, 24, 13, 2.4), { wob: .2, tension: .9 }), 'ink', ` stroke="${INK}" stroke-width="1"`));
  const plat = k.oval(150, 74.4, 7.4, 4.6, { n: 9, lump: .03 });
  k.add(k.fill(plat, 'paper'), k.hatch(plat, { a: 0, gap: 1.6, bend: 3, w: [.3, .9], broken: .3 }), `<circle cx="150" cy="74.4" r="1.2" fill="${INK}"/>`, k.brush([[150.6, 74], [158, 70.6]], { w: 1, per: 2, tip0: .6, tip1: .2 }));
  // The smoke-robe: ink wisps rising off the terminal's top edge, braiding into the body.
  const strands = [];
  for (let i = 0; i < 6; i++) { const x = 84 + i * 6.4 + k.r(1); strands.push([[[x, 56], [x + k.r(5), 48], [100 + (x - 100) * .55 + k.r(2), 40]], { w: 3.6 + k.R() * 1.6, tip0: .4, tip1: .9, per: 4 }]); }
  k.add(k.brushes(strands));
  const torso = k.shape([[89, 25], [100, 22], [111, 25], [118, 33], [115, 42], [108, 47], [100, 49], [92, 47], [85, 42], [82, 33]], { wob: .4 });
  k.add(k.fill(torso));
  // Arms of smoke spread wide, unravelling into clawed wisps.
  const armL = [[88, 30], [76, 25], [62, 24], [50, 30]], armR = [[112, 30], [124, 25], [138, 24], [150, 30]];
  k.add(k.brushes([[armL, { w: 6, w0: 1, w1: .5, tip0: 1, tip1: .3 }], [armR, { w: 6, w0: 1, w1: .5, tip0: 1, tip1: .3 }]]));
  k.add(k.brushes([[[[50, 30], [44, 33], [41, 39]], { w: 1.8, tip0: 1, tip1: .02 }], [[[51, 30], [46, 37], [46, 43]], { w: 1.6, tip0: 1, tip1: .02 }], [[[52, 30], [51, 38], [54, 43]], { w: 1.4, tip0: 1, tip1: .02 }],
    [[[150, 30], [156, 33], [159, 39]], { w: 1.8, tip0: 1, tip1: .02 }], [[[149, 30], [154, 37], [154, 43]], { w: 1.6, tip0: 1, tip1: .02 }], [[[148, 30], [149, 38], [146, 43]], { w: 1.4, tip0: 1, tip1: .02 }]]));
  k.add(k.smoke(70, 22, 14, { n: 2, sway: 4, w: 1.2, tone: 'ink' }), k.smoke(132, 22, 14, { n: 2, sway: 4, w: 1.2, tone: 'ink' }));
  // Hood: a peaked cowl, the opening edged in light, the face a void with the eyes.
  const hood = k.shape([[87, 27], [89, 15], [96, 8], [102, 2], [106, 8], [112, 16], [113, 27], [106, 31], [100, 32], [94, 31]], { wob: .3 });
  k.add(k.fill(hood));
  k.add(k.brush([[93.6, 27.6], [92.6, 19.6], [96, 14.6], [100, 13.4], [104, 14.6], [107.4, 19.6], [106.4, 27.6]], { w: 1.2, tone: 'paper', tip0: .1, tip1: .1 }));
  k.add(eyes([96.6, 21.6], [103.4, 21.6], 1.8, 1));
  k.add(k.smoke(102, 3, 10, { n: 1, sway: 3, w: 1.2, tone: 'ink' }));
  // The terminal itself, facing us: ink frame, lit pane, the prompt in flare on an ink keyline.
  k.add(k.fill(k.shape([[94, 72], [106, 72], [109, 80], [91, 80]], { wob: .2, tension: .5 })));
  k.add(k.fill(k.shape([[76, 52], [100, 50.6], [124, 52], [125.4, 62], [124, 73], [100, 74], [76, 73], [74.6, 62]], { wob: .3, tension: .6 })));
  k.add(k.fill(k.shape([[79.4, 55.2], [100, 54], [120.6, 55.2], [121.6, 62], [120.6, 70], [100, 70.8], [79.4, 70], [78.4, 62]], { wob: .2, tension: .6 }), 'paper'));
  k.add(k.brushes([[[[82, 58.4], [92, 58.4], [100, 58.6]], { w: .9, per: 3, tip0: .5, tip1: .2 }], [[[82, 61.6], [97, 61.6], [116, 61.4]], { w: .9, per: 3, tip0: .5, tip1: .2 }]]));
  const prompt = [[[[83, 64.4], [86.4, 66.6], [83, 68.8]], { w: 2.6, tip0: .8, tip1: .8, per: 2 }], [[[88.4, 69], [93.4, 69]], { w: 2.6, tip0: .8, tip1: .8, per: 2 }]];
  k.add(k.brushes(prompt), k.brushes(prompt.map(([p, o]) => [p, { ...o, w: 1.3 }]), 'spot'));
  k.add(k.staticNoise({ x: 96, y: 64, w: 22, h: 5 }, 4, { sw: .5 }));
  return k.svg();
}

// ---------- Living-off-the-Land Scavenger: an antlered druid with your tools in its sack and a staff in leaf ----------
function druid(key) {
  const k = kit.scene({ key, seed: 109, spot: FLARE });
  torch(k, 'R');
  // Rack niches on the far wall, the light catching their arches, votive LEDs inside.
  [[6, 30, 22], [36, 34, 20]].forEach(([x, y, w]) => k.add(k.fill(k.shape(arch(x, y, w, 89), { wob: .4, chip: .2, tension: .8 }))));
  k.add(k.stipple(17, 58, 3, 24, 9, { size: 1.1, bias: .2 }), k.stipple(46, 62, 3, 22, 8, { size: 1.1, bias: .2 }));
  k.add(k.tendrils([[[58, 40], [62, 89], { sag: 0, curl: 3, w: 1.2, tip: .3, thorns: 2, segs: 5 }]]));
  altar(k, 'R');
  k.add(k.tendrils([[[168, 80], [124, 92], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }]]));
  k.add(k.shadow(76, 134, 92, 170, 64, { len: 58, spread: .5, sy: .22 }));
  // The sack of borrowed tools, slung behind: a screwdriver, a wrench and a scroll poking out.
  k.add(k.brushes([[[[118, 34], [121, 20], [123, 13]], { w: 1.6, tip0: 1, tip1: 1 }], [[[123.5, 14], [124.4, 9]], { w: 3.4, tip0: 1, tip1: 1, per: 2 }]]));
  k.add(k.brush([[126, 34], [131, 22], [134, 16]], { w: 2.4, tip0: 1, tip1: 1 }), k.brushes([[[[132, 17.5], [130.4, 12.4]], { w: 2.2, tip0: 1, tip1: .3, per: 2 }], [[[135, 16.8], [138.6, 12.6]], { w: 2.2, tip0: 1, tip1: .3, per: 2 }]]));
  const scroll = k.shape(rot(soft(108, 18, 7, 18, 3), 111.5, 27, -20), { wob: .2, tension: .9 });
  k.add(k.fill(scroll, 'paper', ` stroke="${INK}" stroke-width="1.1"`), k.brushes([[rot([[109.6, 22], [113.4, 22]], 111.5, 27, -20), { w: .7, per: 2 }], [rot([[109.6, 25], [113.4, 25]], 111.5, 27, -20), { w: .7, per: 2 }]]));
  const sack = k.oval(124, 44, 13, 14, { n: 10, lump: .1, rot: 10 });
  k.add(k.fill(sack), k.rim(sack, { from: .85, to: 1.15, w: 1.3 }));
  k.add(k.fill(k.shape([[116, 32], [122, 30], [130, 32], [126, 36], [120, 36]], { wob: .3 })));
  // The cloak, stooped, walking left; the hem drags and roots into the floor.
  const cloak = k.shape([[88, 36], [100, 32], [112, 37], [118, 50], [122, 66], [128, 80], [134, 90], [120, 88], [110, 92], [98, 89], [86, 92], [78, 88], [82, 68], [84, 50]], { wob: .5 });
  k.add(k.fill(cloak), k.drips(80, 132, 88, 6, { len: [3, 8], w: 2.2 }));
  k.add(k.rim(cloak, { from: .12, to: .4, w: 1.2 }));
  k.add(k.tendrils([[[96, 90], [70, 99], { sag: 2, curl: 2, w: 1.4, tip: .2, thorns: 1 }], [[124, 90], [150, 101], { sag: 3, curl: 2, w: 1.3, tip: .2, thorns: 1 }], [[110, 91], [114, 103], { sag: 1, curl: 1.5, w: 1.2, tip: .2 }]]));
  k.add(k.brushes([[[[92, 88], [88, 92], [82, 94]], { w: 4, tip0: 1, tip1: .3 }]]));
  // The staff: a crooked rail wound with cable, coming into leaf at the top.
  const staff = [[70, 95], [69, 70], [67, 46], [68, 26], [64, 14]];
  k.add(k.brush(staff, { w: 2.8, w0: 1, w1: .7, tip0: 1, tip1: .2 }));
  const wind = [];
  for (let y = 86; y > 30; y -= 7) wind.push([[[71.6, y], [68.4, y - 2.2], [66, y - 4]], { w: .9, per: 2, tip0: .4, tip1: .4 }]);
  k.add(k.brushes(wind, 'paper'));
  const leaves = [];
  [[64, 15, -40], [66, 21, 30], [65, 28, -55], [68, 33, 40], [63, 9, -10]].forEach(([x, y, a]) => { const t = a * Math.PI / 180, L = 7; leaves.push([[[x, y], [x + Math.cos(t) * L * .5 - Math.sin(t) * 1.4, y + Math.sin(t) * L * .5 - 1.2], [x + Math.cos(t) * L, y + Math.sin(t) * L]], { w: 3.2, tip0: .02, tip1: .02, per: 3 }]); });
  k.add(k.brushes(leaves));
  // The arm reaching forward to grip the staff.
  k.add(limb(k, [[90, 44], [80, 47], [70, 50]], 4.4, { tip0: 1, tip1: .7 }));
  k.add(claws(k, 70, 50, [[-1, -3.6], [-2.6, -1], [-2, 2.6]], 1.3));
  // Hood with its void to the left, antlers of twig and cable out of the crown.
  const hood = k.shape([[86, 34], [83, 26], [90, 19], [100, 17], [108, 22], [110, 31], [104, 38], [94, 41]], { wob: .3 });
  k.add(k.brushes([[[[98, 18], [94, 10], [88, 4]], { w: 2.4, tip0: 1, tip1: .02 }], [[[95, 11], [99, 5]], { w: 1.4, tip0: 1, tip1: .02 }], [[[92.4, 8], [86.4, 9]], { w: 1.2, tip0: 1, tip1: .02 }],
    [[[104, 19], [110, 10], [118, 6]], { w: 2.4, tip0: 1, tip1: .02 }], [[[109, 11], [108, 4]], { w: 1.4, tip0: 1, tip1: .02 }], [[[113.4, 8], [118, 11]], { w: 1.2, tip0: 1, tip1: .02 }]]));
  k.add(k.fill(hood), k.rim(hood, { from: .3, to: .62, w: 1.1 }));
  k.add(eyes([88.6, 29.4], [92.6, 29.8], 1.7, .95));
  k.add(k.stipple(100, 103, 70, 6, 14, { size: .8 }));
  return k.svg();
}

// ---------- DNS Beacon Drone: a bat-drone hovering in the rack nave, sonar arcs pinging subdomain tags ----------
function bat(key) {
  const k = kit.scene({ key, seed: 113, spot: FLARE });
  torch(k, 'L', { r: 118, fr: 120 });
  // The nave: rack arches on the right, cables hanging from the vault like vines.
  [[150, 26, 22], [176, 22, 24]].forEach(([x, y, w]) => k.add(k.fill(k.shape(arch(x, y, w, 89), { wob: .4, chip: .2, tension: .8 }), 'ink', ` stroke="#F3E9E2" stroke-width=".6"`)));
  k.add(k.stipple(161, 58, 3, 22, 8, { size: 1.1, bias: .2 }), k.stipple(188, 56, 3, 24, 8, { size: 1.1, bias: .2 }));
  k.add(k.tendrils([[[70, -2], [64, 18], { sag: 0, curl: 2, w: 1.4, tip: .2, thorns: 1 }], [[132, -2], [138, 14], { sag: 0, curl: 2, w: 1.4, tip: .2, thorns: 1 }]]));
  altar(k, 'L');
  // Its shadow slides over the floor below it, away from the light.
  k.add(k.fill(k.shape([[96, 95], [116, 92.6], [146, 94], [126, 98.4], [104, 98]], { wob: .5, tension: .7 })));
  // The tether: a cable from its belly down into the floor jack, sagging.
  k.add(k.tendril([100, 48], [110, 92], { sag: 4, curl: 4, w: 1.6, tip: .7, segs: 5 }), k.fill(k.oval(110, 92, 4, 1.6, { n: 7 })));
  k.add(k.tendrils([[[30, 79], [108, 93], { sag: 6, curl: 2, w: 1.6, tip: .5, thorns: 1 }]]));
  // Sonar: arcs out of both sides, each ring pinging a tag.
  const arcs = (cx, dir, tone) => k.brushes([18, 26, 34].map((r, i) => [[-38, -14, 0, 14, 38].map(d => { const a = (d + (dir < 0 ? 180 : 0)) * Math.PI / 180; return [cx + Math.cos(a) * r, 36 + Math.sin(a) * r * .9]; }), { w: 1.5 - i * .25, tip0: .05, tip1: .05, per: 3 }]), tone);
  k.add(arcs(54, -1, 'ink'), arcs(146, 1, 'paper'));
  const tag = (x, y, a, light) => k.fill(k.shape(rot([[x - 7, y - 3], [x + 4, y - 3], [x + 7, y], [x + 4, y + 3], [x - 7, y + 3]], x, y, a), { wob: .2, tension: .5 }), light ? 'paper' : 'ink', ` stroke="${light ? INK : '#F3E9E2'}" stroke-width=".9"`)
    + k.brush(rot([[x - 5, y], [x + 1.6, y]], x, y, a), { w: .9, tone: light ? 'ink' : 'paper', per: 2, tip0: .6, tip1: .3 }) + `<circle cx="${f1(rot([[x + 4, y]], x, y, a)[0][0])}" cy="${f1(rot([[x + 4, y]], x, y, a)[0][1])}" r=".8" fill="${light ? INK : '#F3E9E2'}"/>`;
  k.add(tag(14, 22, -16, 1), tag(18, 58, 10, 1), tag(186, 14, 14, 0), tag(188, 62, -10, 0));
  // Wings: two scalloped membranes, paper bones lit from below.
  const wingL = [[90, 36], [80, 28], [66, 22], [50, 25], [40, 32], [48, 38], [52, 46], [60, 43], [66, 51], [74, 46], [82, 49], [90, 44]];
  const W = [wingL, wingL.map(([x, y]) => [200 - x, y])].map(p => k.shape(p, { wob: .5, tension: .85 }));
  W.forEach(w => k.add(k.fill(w)));
  const bones = s => [[[s(90), 38], [s(78), 33], [s(66), 24]], [[s(66), 24], [s(56), 34], [s(52), 45]], [[s(66), 24], [s(64), 36], [s(66), 50]], [[s(66), 24], [s(48), 28], [s(41), 32]], [[s(84), 40], [s(80), 46], [s(82), 48.6]]].map(p => [p, { w: .8, tip0: .3, tip1: .05, per: 3 }]);
  k.add(k.brushes(bones(x => x).concat(bones(x => 200 - x)), 'paper'));
  k.add(k.brushes([[[[40, 32], [52, 25.6], [66, 22.4], [80, 28]], { w: 1.1, tip0: .1, tip1: .1 }], [[[90, 44], [82, 49], [74, 46], [66, 51], [60, 43], [52, 46]], { w: .8, tip0: .1, tip1: .1 }]], 'paper'));
  // Rotors at the wingtips: ink hubs, blurred blades as paper and ink arcs.
  [[40, 30], [160, 30]].forEach(([x, y]) => {
    k.add(`<ellipse cx="${x}" cy="${y - 3}" rx="11" ry="2.6" fill="none" stroke="${INK}" stroke-width="2.4"/><ellipse cx="${x}" cy="${y - 3}" rx="11" ry="2.6" fill="none" stroke="#F3E9E2" stroke-width=".7" stroke-dasharray="7 4"/>`);
    k.add(k.brush([[x, y + 1], [x, y - 3]], { w: 2.6, tip0: 1, tip1: 1, per: 2 }), `<circle cx="${x}" cy="${y - 3}" r="1.6" fill="${INK}"/>`);
  });
  // The body: a puck with bat ears, a rim of LEDs, eyes in flare.
  const body = k.oval(100, 39, 13, 9.6, { n: 11, lump: .06 });
  k.add(k.brushes([[[[92, 33], [89, 25], [88, 18]], { w: 5, tip0: 1, tip1: .02 }], [[[108, 33], [111, 25], [112, 18]], { w: 5, tip0: 1, tip1: .02 }]]));
  k.add(k.fill(body), k.rim(body, { from: .3, to: .7, w: 1.2 }));
  k.add(k.fill(k.oval(100, 47, 5, 3, { n: 7 })));
  k.add(`<path d="M90.6 43.4h.1M94.4 44.6h.1M98.2 45.2h.1M101.8 45.2h.1M105.6 44.6h.1M109.4 43.4h.1" stroke="#F3E9E2" stroke-width="1.5" stroke-linecap="round"/>`);
  k.add(eyes([95.6, 37], [104.4, 37], 2, 1.1));
  k.add(k.stipple(130, 103, 60, 6, 12, { size: .8 }));
  return k.svg();
}

const out = { art: { macro: macro('macro'), spray: spray('spray'), banshee: banshee('banshee'), vibe: vibe('vibe'), wraith: wraith('wraith'), druid: druid('druid'), bat: bat('bat') }, print: {} };
fs.writeFileSync(path.join(__dirname, 'ink-art.json'), JSON.stringify(out, null, 1) + '\n');
console.log(Object.fromEntries(Object.entries(out.art).map(([k, v]) => [k, (v.length / 1024).toFixed(1) + ' KB'])));
module.exports = out;
