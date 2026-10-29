// CREW batch: the four remaining analysts (RES, ENG, SOA, PAT) and the eight kit familiars (kit_*), drawn with
// the lead's ink-kit. Cyan spot throughout. Writes ink-art.json: { art: {...}, print: {} }.
// Usage: node scenes.js
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../ink-kit');
const { CYAN, PAPER, soft, rot } = kit;
const INK = '#07060A';
const n1 = v => (Math.round(v * 10) / 10).toString();

// ---------- shared helpers ----------
// The lens: a cyan dot on an ink ring, with a paper ring outside so it reads on an ink body.
const lens = (x, y, r, paperRing = true) => (paperRing ? `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r + 2)}" fill="${PAPER}"/>` : '')
  + `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r + 1.1)}" fill="${INK}"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${CYAN}"/><circle cx="${n1(x - r * .25)}" cy="${n1(y - r * .25)}" r="${n1(r * .32)}" fill="${INK}"/>`;
// Cyan stroke on an ink keyline (for paper grounds).
const cy = (d, w = 1.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n1(w * 2.1)}"/><path d="${d}" fill="none" stroke="${CYAN}" stroke-width="${w}"/>`;
// A monitor: ink bezel, paper screen. Returns the inner box.
function monitor(k, x, y, w, h, { b = 4, neck = true } = {}) {
  k.add(k.fill(k.shape([[x, y + 1], [x + w / 2, y - 1.4], [x + w, y + .6], [x + w + 1.4, y + h / 2], [x + w, y + h], [x + w / 2, y + h + 1.2], [x - .4, y + h], [x - 1.4, y + h / 2]], { wob: .4, tension: .6 })));
  const i = { x: x + b, y: y + b, w: w - 2 * b, h: h - 2 * b };
  k.add(k.fill(k.shape([[i.x, i.y + .6], [i.x + i.w / 2, i.y - .6], [i.x + i.w, i.y + .4], [i.x + i.w + .8, i.y + i.h / 2], [i.x + i.w, i.y + i.h], [i.x + i.w / 2, i.y + i.h + .6], [i.x, i.y + i.h], [i.x - .8, i.y + i.h / 2]], { wob: .3, tension: .6 }), 'paper'));
  if (neck) { const cx = x + w / 2, yb = y + h; k.add(k.fill(k.shape([[cx - 4, yb], [cx + 4, yb], [cx + 7, yb + 7], [cx - 7, yb + 7]], { wob: .3, tension: .5 }))); }
  return i;
}
// Desk altar: an ink slab from x0 to x1 with its top at y, a paper lip and drips.
function altar(k, x0, x1, y, { lip = true, drips = 4 } = {}) {
  k.add(k.fill(k.shape([[x0, y + 1], [(x0 + x1) / 2, y - .6], [x1, y + .8], [x1 + 1, y + 16], [x1 + 2, 114], [x0 - 2, 114], [x0 - 1, y + 16]], { wob: .5, tension: .7 })));
  if (lip) k.add(k.brush([[x0 + 2, y + .4], [(x0 + x1) / 2, y - .5], [x1 - 2, y + .6]], { w: 1.1, tone: 'paper', tip0: .2, tip1: .2 }));
  if (drips) k.add(k.drips(x0 + 3, x1 - 3, y + 1.6, drips, { len: [3, 8], w: 1.2, tone: 'paper' }));
}
// Wall + floor light from a screen at (x, y), split at the floor line fy.
function torch(k, x, y, fy, { r = [22, 120], a = [0, 360], sy = .85, fr = [8, 130], fa = [-10, 190], step = 4.6 } = {}) {
  k.add(k.glow({ x, y, r, a, sy, step, clip: { x: 0, y: 0, w: 200, h: fy }, w: [.15, 2.2] }));
  k.add(k.glow({ x, y: fy - 2, r: fr, a: fa, sy: .3, step: step + .6, clip: { x: 0, y: fy, w: 200, h: 112 - fy }, w: [.2, 1.8] }));
  k.add(k.brush([[0, fy + .4], [70, fy - .4], [140, fy + .3], [200, fy - .2]], { w: 1.6, tip0: .5, tip1: .5 }));
}
const grow = (s, ax, ay) => `<g transform="matrix(${s} 0 0 ${s} ${n1(ax * (1 - s))} ${n1(ay * (1 - s))})">`;
const limb = (k, p, w, gap = 2.4, o = {}) => k.brush(p, { w: w + gap, tone: 'paper', tip0: .7, tip1: .5, ...o }) + k.brush(p, { w, tip0: .8, tip1: .4, ...o });

// =====================================================================================
// ANALYSTS
// =====================================================================================

// ---------- Responder: standing, phone to the ear, pointing at the alert; go-bag at the feet ----------
function responder(key) {
  const k = kit.scene({ key, seed: 61, spot: CYAN });
  torch(k, 162, 40, 90, { r: [24, 92], fr: [8, 110], fa: [100, 200], step: 4.8 });
  // The altar and its screen: one alert, a warning sigil in cyan on an ink keyline.
  altar(k, 130, 204, 72, { drips: 3 });
  const s = monitor(k, 140, 16, 46, 44);
  k.add(k.brushes([0, 1, 2, 3].map(i => [[[s.x + 4, s.y + 24 + i * 4], [s.x + 14 + (i % 2) * 6, s.y + 24 + i * 4]], { w: 1.4, tip0: .6, tip1: .4, per: 2 }])));
  k.add(cy(`M${s.x + 19} ${s.y + 17}L${s.x + 26} ${s.y + 4}L${s.x + 33} ${s.y + 17}Z`, 1.3), k.brush([[s.x + 26, s.y + 8], [s.x + 26, s.y + 12.4]], { w: 1.6, per: 2 }), `<circle cx="${s.x + 26}" cy="${s.y + 15}" r=".9" fill="${INK}"/>`);
  k.add(k.staticNoise({ x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 }, 4, { sw: .5 }));
  // Cables from the altar across the floor to the go-bag.
  k.add(k.tendrils([[[134, 84], [134, 100], { sag: 3, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[158, 66], [176, 104], { sag: 5, curl: 2, w: 1.4, tip: .3, thorns: 1 }]]));
  k.add(k.shadow(70, 130, 106, 162, 40, { len: 60, spread: .6, sy: .14 }));
  // Go-bag at the feet: hatched mid-tone, ink keyline, a strap and a buckle.
  const bag = k.shape([[118, 92], [128, 89], [137, 92], [139, 100], [136, 106], [118, 106.6], [114, 101]], { wob: .5 });
  k.add(k.fill(bag, 'paper', ` stroke="${INK}" stroke-width="1.4"`), k.hatch(bag, { a: 70, gap: 1.8, bend: 3, w: [.3, 1.6], broken: .3 }));
  k.add(k.brush([[120, 93], [126, 84], [133, 92]], { w: 1.6, tip0: .8, tip1: .8 }), k.brush([[114.6, 98], [138.6, 97.4]], { w: 1.8, tip0: 1, tip1: 1 }));
  // The figure, drawn large: the frame cuts it at the shins.
  k.add(grow(1.25, 100, 18));
  // The coat: long, tattered at the hem, legs planted.
  const coat = k.shape([[92, 30], [104, 29], [111, 36], [113, 52], [114, 70], [118, 88], [108, 92], [98, 88], [88, 92], [78, 90], [82, 70], [84, 50], [86, 36]], { wob: .5 });
  k.add(k.fill(coat), k.drips(80, 116, 88, 5, { len: [3, 8], w: 2.2 }));
  k.add(k.brushes([[[[92, 88], [90, 96], [86, 101]], { w: 6, tip0: 1, tip1: .5 }], [[[104, 88], [107, 96], [110, 101]], { w: 6, tip0: 1, tip1: .5 }]]));
  k.add(k.fill(k.oval(84, 101, 5.5, 2, { n: 7 })), k.fill(k.oval(112, 101, 5.5, 2, { n: 7 })));
  // Pointing arm, out at the alert, a paper gap where it leaves the shoulder.
  const point = [[106, 38], [118, 34], [130, 30], [139, 27.5]];
  k.add(limb(k, point, 4.6, 2.4, { tip1: .55 }));
  k.add(k.brush([[138, 27.6], [145, 25.6]], { w: 1.8, tip0: 1, tip1: .2 }));
  // Head in profile, short hair, a high collar.
  k.add(k.fill(k.shape([[90, 30], [94, 25], [104, 25], [108, 31], [104, 36], [92, 36]], { wob: .3 })));
  const head = k.shape([[92, 12], [100, 9.5], [106, 13], [108, 18], [107.4, 22], [105, 26.5], [99, 28], [93, 26], [90, 19]], { wob: .3 });
  k.add(k.fill(head));
  // Phone arm: elbow out behind, hand at the ear, the handset a small device with a paper edge.
  const phoneArm = [[90, 36], [80, 30], [86, 22], [92, 19]];
  k.add(limb(k, phoneArm, 4.4, 2.2));
  k.add(k.fill(k.shape(rot(soft(90, 12, 5, 14, 1.6), 92.5, 19, 18), { wob: .2, tension: .9 }), 'ink', ` stroke="${PAPER}" stroke-width=".8"`));
  // Rim light from the screen on the face, shoulder and pointing arm.
  k.add(k.brushes([[[[101, 10], [106, 13], [108, 18], [107, 22.6], [105, 26.4]], { w: 1.2, tip0: .1, tip1: .1 }], [[[106, 30], [111, 36], [113, 52], [114.4, 70]], { w: 1.1, tip0: .1, tip1: .1 }],
    [[[114, 72], [118, 87.6]], { w: .8, tip0: .2, tip1: .1 }], [[[120, 31.6], [130, 28.4], [138, 26.4]], { w: .8, tip0: .2, tip1: .1 }]], 'paper'));
  k.add(`<path d="M104.6 18.4v2.6" stroke="${CYAN}" stroke-width="1.2"/>`, '</g>');
  k.add(k.stipple(60, 104, 50, 6, 12, { size: .8 }));
  return k.svg();
}

// ---------- Engineer: detection as code; wired into the open rack behind ----------
function engineer(key) {
  const k = kit.scene({ key, seed: 71, spot: CYAN });
  torch(k, 60, 38, 74, { r: [26, 104], fr: [6, 110], fa: [-20, 120], step: 4.8 });
  // The open rack behind: a pointed-arch niche, its door swung open, votive LEDs in rows.
  const rack = k.shape([[134, 76], [133, 34], [140, 16], [152, 6], [164, 16], [171, 34], [172, 76]], { wob: .6, chip: .2, tension: .8 });
  k.add(k.fill(rack));
  k.add(k.brushes([[[[136, 74], [135.4, 34], [141.6, 17.4], [152, 8]], { w: 1, tip0: .1, tip1: .1 }]], 'paper'));
  const leds = [];
  for (let r = 0; r < 6; r++) { const y = 26 + r * 8; for (let c = 0; c < 3; c++) if (k.R() < .75) leds.push(`M${n1(145 + c * 5 + k.r(.4))} ${y}h.1`); }
  k.add(`<path d="${leds.join('')}" stroke="${PAPER}" stroke-width="1.6"/>`);
  k.add(k.brushes([[[[142, 20], [162, 20]], { w: 1, tip0: 1, tip1: 1 }], [[[140, 70], [166, 70]], { w: 1, tip0: 1, tip1: 1 }]], 'paper'));
  // The door, hanging open on its hinge, stone-chipped.
  k.add(k.fill(k.shape([[172, 76], [172, 34], [178, 20], [186, 16], [188, 34], [187, 80]], { wob: .6, chip: .3 })), k.brushes([[[[173.4, 74], [173.4, 34], [178.6, 21], [186, 17]], { w: 1, tip0: .1, tip1: .1 }]], 'paper'));
  // Cables spill from the rack like vines: one down to the floor, one into the Engineer's collar.
  k.add(k.tendrils([[[148, 64], [130, 104], { sag: 6, curl: 3, w: 2, tip: .4, thorns: 2 }], [[156, 66], [168, 108], { sag: 4, curl: 3, w: 1.6, tip: .3, thorns: 1 }], [[140, 30], [112, 34], { sag: 8, curl: 2, w: 1.8, tip: .6, thorns: 1 }]]));
  // The altar and the screen: braces and rules, the one rule that fires in cyan.
  altar(k, 18, 100, 64, { drips: 4 });
  const s = monitor(k, 34, 14, 50, 42);
  k.add(k.brushes([[[[s.x + 6, s.y + 3], [s.x + 3, s.y + 6], [s.x + 4, s.y + 17], [s.x + 1.4, s.y + 17], [s.x + 4, s.y + 18], [s.x + 3, s.y + 29], [s.x + 6, s.y + 31]], { w: 1.4, tip0: .4, tip1: .4, per: 3 }],
    [[[s.x + s.w - 6, s.y + 3], [s.x + s.w - 3, s.y + 6], [s.x + s.w - 4, s.y + 17], [s.x + s.w - 1.4, s.y + 17], [s.x + s.w - 4, s.y + 18], [s.x + s.w - 3, s.y + 29], [s.x + s.w - 6, s.y + 31]], { w: 1.4, tip0: .4, tip1: .4, per: 3 }]]));
  const rows = [[10, 22], [14, 30], [10, 18], [14, 26], [10, 24]].map(([x0, L], i) => [[[s.x + x0, s.y + 6 + i * 5], [s.x + x0 + L * .5, s.y + 6 + i * 5 + k.r(.3)], [s.x + x0 + L * .9, s.y + 6 + i * 5]], { w: 1.3, tip0: .6, tip1: .3, per: 2 }]);
  k.add(k.brushes(rows.filter((_, i) => i !== 2)));
  const hot = rows[2][0];
  k.add(cy(`M${n1(hot[0][0])} ${n1(hot[0][1])}H${n1(hot[2][0] + 2)}`, 1.3));
  k.add(k.staticNoise({ x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 }, 4, { sw: .5 }));
  // Keyboard under the hands.
  k.add(k.fill(k.shape([[48, 66], [66, 65.4], [84, 66], [85, 70.6], [66, 71.2], [47, 70.6]], { wob: .3, tension: .5 }), 'ink', ` stroke="${PAPER}" stroke-width=".7"`));
  // The Engineer: upright on a high stool, in profile facing the screen, a leather apron, goggles pushed up.
  k.add(k.shadow(96, 126, 100, 60, 38, { len: 40, spread: .5, sy: .25 }));
  k.add(k.brushes([[[[108, 82], [110, 92], [106, 101]], { w: 3, tip0: 1, tip1: .6 }], [[[118, 82], [122, 92], [124, 101]], { w: 3, tip0: 1, tip1: .6 }], [[[104, 92], [124, 92]], { w: 1.6, tip0: 1, tip1: 1 }]]));
  k.add(k.fill(k.shape([[104, 76], [126, 75], [127, 82], [104, 83]], { wob: .4, tension: .7 })));
  const body = k.shape([[100, 34], [110, 33], [119, 40], [124, 56], [126, 76], [114, 80], [100, 79], [96, 66], [92, 52], [94, 40]], { wob: .5 });
  k.add(k.fill(body));
  k.add(k.brushes([[[[100, 79], [94, 84], [88, 89]], { w: 6, tip0: 1, tip1: .5 }], [[[96, 80], [82, 82], [80, 92]], { w: 5, tip0: 1, tip1: .6 }]]));
  k.add(k.fill(k.oval(86, 91, 5, 2, { n: 7 })), k.fill(k.oval(77, 93, 5, 2, { n: 7 })));
  // Apron: a hatched mid-tone panel on the front, strings to the waist.
  const apron = k.shape([[95, 44], [100, 42], [99, 60], [101, 77], [94, 79], [92, 64], [92, 50]], { wob: .3 });
  k.add(k.fill(apron, 'paper'), k.hatch(apron, { a: 80, gap: 1.7, bend: 2, w: [1.3, .3], broken: .3 }));
  // Arms forward to the keys, with paper gaps.
  k.add(limb(k, [[104, 40], [96, 52], [86, 60], [76, 64]], 5, 2.4));
  k.add(k.brushes([[[[76, 64], [70, 65.6]], { w: 2.4, tip0: 1, tip1: .3 }], [[[77, 63], [72, 62.4]], { w: 1.6, tip0: 1, tip1: .1 }]]));
  // Neck, head, goggles on the brow.
  k.add(k.brush([[106, 36], [102, 31], [100, 28]], { w: 8, tip0: 1, tip1: .8 }));
  const head = k.shape([[92, 18], [98, 13], [106, 14], [110, 20], [109, 27], [103, 32], [95, 31], [90, 25]], { wob: .3 });
  k.add(k.fill(head));
  k.add(`<circle cx="94.6" cy="17.6" r="3.4" fill="${INK}" stroke="${PAPER}" stroke-width=".9"/>`, k.brush([[96, 15], [104, 13], [110, 17]], { w: 2, tip0: 1, tip1: .6 }));
  k.add(k.brushes([[[[91.6, 21], [90.4, 25], [93, 29], [96, 31]], { w: 1.1, tip0: .1, tip1: .1 }], [[[99, 34], [94.6, 40], [92.4, 52]], { w: .9, tip0: .1, tip1: .1 }], [[[96, 39.6], [90, 50], [84, 57.6], [77, 61.8]], { w: .9, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(`<path d="M93.4 22.6v2.4" stroke="${CYAN}" stroke-width="1.2"/>`);
  k.add(k.stipple(140, 104, 50, 5, 10, { size: .8 }));
  return k.svg();
}

// ---------- Soarcerer: from behind, arms raised, conducting a playbook circle of summoned nodes ----------
function soarcerer(key) {
  const k = kit.scene({ key, seed: 81, spot: CYAN });
  torch(k, 112, 52, 88, { r: [20, 84], sy: .85, fr: [8, 100], step: 4.8 });
  // The altar with its screen, behind the figure, to the right.
  altar(k, 100, 186, 78, { drips: 3 });
  const s = monitor(k, 120, 50, 40, 26, { b: 3.4 });
  k.add(k.staticNoise({ x: s.x, y: s.y + 1, w: s.w, h: s.h - 2 }, 5, { sw: .6 }));
  // The summoning circle: a broken ring around a flow of five playbook nodes, joined by tapered strokes.
  const C = [128, 24], R = 22;
  k.add(k.brush(k.sample([0, 1, 2, 3, 4, 5, 6, 7].map(i => [C[0] + Math.cos(i / 8 * Math.PI * 2 - .4) * R, C[1] + Math.sin(i / 8 * Math.PI * 2 - .4) * R * .62]), true, 2).slice(0, 13), { w: 1.4, tip0: .1, tip1: .1 }));
  k.add(k.brush(k.sample([0, 1, 2, 3, 4, 5, 6, 7].map(i => [C[0] + Math.cos(i / 8 * Math.PI * 2 - .4) * R, C[1] + Math.sin(i / 8 * Math.PI * 2 - .4) * R * .62]), true, 2).slice(9, 16), { w: 1.2, tip0: .1, tip1: .1 }));
  const N = [[108, 22], [124, 13], [124, 31], [142, 22], [156, 13]];
  k.add(k.brushes([[N[0], N[1]], [N[0], N[2]], [N[1], N[3]], [N[2], N[3]], [N[3], N[4]]].map(([a, b]) => [[a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1], b], { w: 1.4, tip0: .6, tip1: .3, per: 3 }])));
  // Each node is a sigil: ink ring, cyan core. The decision node is a diamond.
  k.add(N.map(([x, y], i) => i === 3 ? `<path d="M${x} ${y - 5}l5 5-5 5-5-5z" fill="${INK}"/><path d="M${x} ${y - 2.6}l2.6 2.6-2.6 2.6-2.6-2.6z" fill="${CYAN}"/>` : `<circle cx="${x}" cy="${y}" r="3.8" fill="${INK}"/><circle cx="${x}" cy="${y}" r="2" fill="${CYAN}"/>`).join(''));
  // Threads of static rise from the screen into the circle: the agents being called up.
  k.add(k.smoke(140, 48, 18, { n: 2, sway: 4, w: 1, tone: 'ink' }));
  // Cables from the altar foot root across the floor to the hem.
  k.add(k.tendrils([[[104, 96], [86, 100], { sag: 3, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[150, 90], [184, 108], { sag: 4, curl: 2, w: 1.4, tip: .3, thorns: 1 }]]));
  k.add(k.shadow(50, 112, 106, 136, 60, { len: 50, spread: .7, sy: .2 }));
  k.add(grow(1.15, 86, 34));
  // The figure from behind: a tall peaked hood, a robe flaring to a ragged hem, wide sleeves falling from raised arms.
  const robe = k.shape([[78, 46], [86, 42], [96, 46], [100, 60], [104, 80], [110, 98], [100, 96], [92, 101], [84, 96], [74, 100], [64, 97], [70, 80], [74, 60]], { wob: .6 });
  k.add(k.fill(robe), k.drips(66, 108, 96, 6, { len: [3, 9], w: 2.2 }));
  // Arms up in a V, sleeves hanging off them as bells of cloth.
  k.add(k.fill(k.shape([[78, 48], [66, 36], [58, 24], [62, 22], [66, 30], [72, 38], [82, 44], [80, 56], [70, 52]], { wob: .5 })));
  k.add(k.fill(k.shape([[94, 48], [104, 36], [110, 24], [106, 22], [100, 30], [92, 38], [86, 44], [88, 56], [98, 52]], { wob: .5 })));
  k.add(k.brushes([[[[60, 23], [57, 16], [54, 12]], { w: 2.4, tip0: 1, tip1: .3 }], [[[107, 23], [109, 16], [112, 12]], { w: 2.4, tip0: 1, tip1: .3 }],
    [[[55, 13], [52, 9]], { w: 1.1, tip0: 1, tip1: .1 }], [[[55, 13], [57, 8]], { w: 1.1, tip0: 1, tip1: .1 }], [[[111, 13], [110, 8]], { w: 1.1, tip0: 1, tip1: .1 }], [[[111, 13], [115, 9]], { w: 1.1, tip0: 1, tip1: .1 }]]));
  k.add(k.fill(k.shape([[80, 44], [84, 36], [86, 26], [88, 18], [92, 30], [94, 38], [94, 46], [87, 48]], { wob: .3 })));
  // Back-light rims on the hood, the shoulders and the robe's lit edge.
  k.add(k.brushes([[[[88, 19], [91.4, 30], [93.6, 38], [93.6, 45]], { w: 1.1, tip0: .1, tip1: .1 }], [[[96, 47], [100, 60], [104, 80], [109, 97]], { w: 1.1, tip0: .1, tip1: .1 }],
    [[[93, 44], [101, 35], [106.6, 24.6]], { w: .9, tip0: .1, tip1: .1 }], [[[80, 44], [70, 36], [62.6, 25]], { w: .9, tip0: .1, tip1: .1 }]], 'paper'));
  k.add('</g>');
  // Wisps of the call between the raised hands and the circle.
  k.add(k.tendrils([[[115.4, 8.8], [124, 13], { sag: -2, curl: 1, w: .9, tip: .2 }], [[49.6, 8.6], [106, 21], { sag: -14, curl: 2, w: .9, tip: .2 }]]));
  k.add(k.stipple(130, 104, 60, 6, 12, { size: .8 }));
  return k.svg();
}

// ---------- Fixer: the medic of the keep, striding in with a med case and two coffees ----------
function fixer(key) {
  const k = kit.scene({ key, seed: 91, spot: CYAN });
  torch(k, 172, 42, 88, { r: [22, 100], fr: [8, 120], fa: [100, 200], step: 4.8 });
  altar(k, 150, 206, 72, { drips: 2 });
  const s = monitor(k, 156, 22, 38, 38, { b: 3.6 });
  // The crew's vitals on the screen: three lines, one dipping.
  k.add(k.brushes([0, 1, 2].map(i => [[[s.x + 2, s.y + 7 + i * 8], [s.x + 10, s.y + 7 + i * 8], [s.x + 13, s.y + 3 + i * 8], [s.x + 16, s.y + 11 + i * 8], [s.x + 19, s.y + 7 + i * 8], [s.x + s.w - 2, s.y + 7 + i * 8]], { w: 1.2, tip0: .4, tip1: .4, per: 2 }])));
  k.add(k.tendrils([[[154, 82], [128, 100], { sag: 4, curl: 2, w: 1.6, tip: .4, thorns: 1 }]]));
  k.add(k.shadow(68, 126, 98, 172, 42, { len: 64, spread: .6, sy: .16 }));
  k.add(grow(1.15, 108, 20));
  // The coat flares back in the stride, ragged at the hem.
  const coat = k.shape([[98, 34], [110, 34], [116, 44], [118, 62], [120, 78], [112, 82], [100, 80], [88, 84], [74, 86], [66, 82], [78, 70], [88, 54], [92, 40]], { wob: .6 });
  k.add(k.fill(coat), k.drips(68, 118, 80, 6, { len: [3, 8], w: 2.2 }));
  // Striding legs.
  k.add(k.brushes([[[[110, 78], [116, 88], [122, 97]], { w: 6, tip0: 1, tip1: .5 }], [[[96, 78], [90, 88], [80, 96]], { w: 6, tip0: 1, tip1: .5 }]]));
  k.add(k.fill(k.oval(126, 97.6, 5.5, 2, { n: 7 })), k.fill(k.oval(78, 96.6, 5, 2, { n: 7, rot: -14 })));
  // The med case swings from the back hand: hatched mid-tone, a cyan cross on an ink plate.
  k.add(limb(k, [[96, 42], [88, 54], [84, 64]], 4.6, 2.4));
  const kase = k.shape([[70, 66], [86, 64.6], [90, 68], [89.6, 80], [86, 82.6], [71, 83], [67.6, 80], [67.4, 69]], { wob: .4, tension: .8 });
  k.add(k.brush([[78, 66], [80, 60.6], [86, 61]], { w: 1.8, tip0: .8, tip1: .8 }));
  k.add(k.fill(kase, 'paper', ` stroke="${INK}" stroke-width="1.4"`), k.hatch(kase, { a: 80, gap: 1.8, bend: 3, w: [1.4, .3], broken: .3 }));
  k.add(`<circle cx="78.6" cy="73.8" r="5.4" fill="${INK}"/><path d="M78.6 70.4v6.8M75.2 73.8h6.8" stroke="${CYAN}" stroke-width="2.2"/>`);
  // The front arm carries two coffees, steam rising off them.
  k.add(limb(k, [[110, 40], [118, 48], [126, 50], [132, 48]], 4.6, 2.4));
  [[132, 37], [139, 39]].forEach(([x, y]) => k.add(k.fill(k.shape([[x - 3.2, y], [x + 3.2, y], [x + 2.4, y + 10], [x - 2.4, y + 10]], { wob: .2, tension: .5 }), 'ink', ` stroke="${PAPER}" stroke-width=".8"`)));
  k.add(k.brushes([[[[128.4, 37], [135.6, 36.6]], { w: 2, tip0: 1, tip1: 1 }], [[[135.6, 39], [142.6, 38.6]], { w: 2, tip0: 1, tip1: 1 }]]));
  k.add(k.smoke(132, 35, 14, { n: 2, sway: 3, w: 1, tone: 'ink' }), k.smoke(139, 37, 12, { n: 1, sway: 3, w: 1, tone: 'ink' }));
  // Hood, wide-brimmed hat and the beaked mask of a plague doctor; one cyan lens.
  k.add(k.fill(k.shape([[96, 36], [100, 22], [110, 18], [116, 26], [114, 36], [106, 40]], { wob: .3 })));
  k.add(k.fill(k.shape([[112, 24], [120, 26], [130, 32], [133, 36], [124, 35], [114, 32]], { wob: .3 })));
  k.add(k.brush([[86, 18], [98, 15.6], [110, 15], [122, 17.4]], { w: 3, tip0: .3, tip1: .2 }));
  k.add(k.fill(k.shape([[98, 16], [100, 8], [106, 5], [112, 8], [113, 16]], { wob: .3, tension: .8 })));
  k.add(k.brushes([[[[107, 5.4], [112.4, 8.4], [113, 15]], { w: .9, tip0: .1, tip1: .1 }], [[[114, 18.6], [116.6, 25], [124, 28.4], [131, 33.4]], { w: 1, tip0: .1, tip1: .1 }],
    [[[110.6, 35], [116, 44], [118.2, 62], [120, 77]], { w: 1, tip0: .1, tip1: .1 }], [[[120, 46.8], [126, 48.6]], { w: .8, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(lens(112.4, 25, 1.9, false).replace(`r="${n1(1.9 + 1.1)}" fill="${INK}"`, `r="3.1" fill="${INK}" stroke="${PAPER}" stroke-width=".8"`));
  k.add('</g>', k.stipple(60, 104, 50, 5, 12, { size: .8 }));
  return k.svg();
}

// =====================================================================================
// KIT AGENTS: familiars and constructs, each one lens, each at work
// =====================================================================================

// Triage: a three-armed homunculus on a cable stalk, sorting tickets into three stacks.
function triage(key) {
  const k = kit.scene({ key, seed: 101, spot: CYAN });
  torch(k, 2, 40, 80, { r: [16, 134], a: [-90, 90], sy: .8, fr: [6, 160], fa: [-10, 60], step: 5 });
  altar(k, 18, 186, 80, { drips: 4 });
  // The screen it feeds from, at the left edge: the torch.
  monitor(k, -12, 22, 30, 40, { b: 3.4 });
  const stack = (x, n, a) => { let g = ''; for (let i = 0; i < n; i++) g += k.fill(k.shape(rot(soft(x - 9, 74 - i * 3.2, 18, 4, 1), x, 76 - i * 3.2, a + k.r(5)), { wob: .2, tension: .9 }), 'paper', ` stroke="${INK}" stroke-width="1"`); return g; };
  k.add(stack(46, 4, -3), stack(100, 3, 2), stack(154, 5, 4));
  // The stalk: a cable rooted in the altar, rising to the body.
  k.add(k.tendrils([[[100, 68], [100, 46], { sag: 0, curl: 2, w: 4, tip: .7, segs: 3 }], [[96, 82], [70, 94], { sag: 3, curl: 2, w: 1.6, tip: .3, thorns: 1 }], [[104, 82], [136, 96], { sag: 3, curl: 2, w: 1.6, tip: .3, thorns: 1 }]]));
  // Body: a teardrop of ink with the lens for a face.
  const body = k.shape([[100, 16], [112, 22], [116, 34], [110, 46], [100, 50], [90, 46], [84, 34], [88, 22]], { wob: .4 });
  k.add(k.fill(body));
  k.add(k.brushes([[[[102, 17], [111, 22], [115, 33]], { w: 1, tip0: .1, tip1: .1 }]], 'paper'));
  // Three arms: down-left onto a stack, down-right onto a stack, and one up holding a ticket.
  k.add(limb(k, [[88, 38], [72, 44], [58, 52], [48, 60]], 3, 2));
  k.add(limb(k, [[112, 38], [128, 44], [142, 52], [152, 58]], 3, 2));
  k.add(limb(k, [[106, 20], [116, 12], [126, 8]], 2.6, 2));
  k.add(k.fill(k.shape(rot(soft(122, 0, 18, 6, 1), 131, 3, -10), { wob: .2, tension: .9 }), 'paper', ` stroke="${INK}" stroke-width="1"`));
  k.add(k.fill(k.shape(rot(soft(40, 58, 16, 4.4, 1), 48, 60, 14), { wob: .2, tension: .9 }), 'paper', ` stroke="${INK}" stroke-width="1"`));
  k.add(k.fill(k.shape(rot(soft(146, 56, 16, 4.4, 1), 154, 58, -10), { wob: .2, tension: .9 }), 'paper', ` stroke="${INK}" stroke-width="1"`));
  k.add(k.brushes([[[[128, 2.4], [136, 1.6]], { w: .8, per: 2 }], [[[44, 59], [51, 60.4]], { w: .8, per: 2 }], [[[149, 56.6], [157, 56]], { w: .8, per: 2 }]]));
  k.add(lens(100, 32, 4.6));
  k.add(k.stipple(100, 104, 80, 5, 12, { size: .8 }));
  return k.svg();
}

// Hunt: a lantern-hound of cable and plate, nose down; its lens throws the searchlight onto a trail.
function hunt(key) {
  const k = kit.scene({ key, seed: 111, spot: CYAN });
  const L = [124, 56];
  // The lens is the light: a pool on the wall around the head, and a beam down the floor ahead.
  k.add(k.glow({ x: L[0], y: L[1], r: [8, 74], sy: .8, step: 5, clip: { x: 0, y: 0, w: 200, h: 82 }, w: [.15, 2.2] }));
  k.add(k.glow({ x: L[0], y: L[1], r: [10, 96], a: [8, 58], sy: 1, step: 5.2, clip: { x: 0, y: 82, w: 200, h: 30 }, w: [.2, 1.6] }));
  k.add(k.brush([[0, 82.4], [80, 81.6], [200, 82.2]], { w: 1.6, tip0: .5, tip1: .5 }));
  // A rack niche in the dark behind, where its tail plugs in.
  k.add(k.fill(k.shape([[8, 82], [8, 30], [16, 16], [26, 8], [36, 16], [42, 30], [42, 82]], { wob: .6, chip: .2, tension: .8 }), 'ink', ` stroke="${PAPER}" stroke-width=".8"`));
  k.add(`<path d="M20 34h.1M27 34h.1M20 44h.1M34 44h.1M27 54h.1M20 64h.1M34 64h.1" stroke="${PAPER}" stroke-width="1.6"/>`);
  // The trail: footprints, ink on the lit floor, leading off right.
  const fp = [];
  [[140, 88, -20], [150, 96, 10], [162, 90, -16], [174, 99, 8], [188, 93, -12]].forEach(([x, y, a]) => fp.push(k.fill(k.oval(x, y, 4.2, 2.2, { n: 7, rot: a })), `<circle cx="${x + 5.6}" cy="${y - 2}" r="1.1" fill="${INK}"/><circle cx="${x + 5.8}" cy="${y + 1}" r="1.1" fill="${INK}"/>`));
  k.add(fp.join(''));
  k.add(k.shadow(56, 116, 86, L[0], L[1] - 20, { len: 40, spread: .4, sy: .25 }));
  // Tail: a cable back into the rack.
  k.add(k.tendril([62, 50], [38, 50], { sag: -8, curl: 2, w: 3, tip: .5, thorns: 1 }));
  // Body and legs.
  const body = k.shape([[60, 46], [76, 38], [96, 38], [112, 42], [118, 52], [110, 62], [92, 62], [72, 64], [60, 58]], { wob: .5 });
  k.add(k.fill(body));
  k.add(k.hatch(body, { a: 100, gap: 2, bend: 3, w: [.3, .9], tone: 'paper', broken: .5, cover: [.7, 1] }));
  k.add(k.brushes([[[[66, 58], [62, 70], [64, 84]], { w: 5, tip0: 1, tip1: .5 }], [[[76, 60], [80, 72], [76, 84]], { w: 4.4, tip0: 1, tip1: .5 }],
    [[[98, 60], [96, 72], [100, 84]], { w: 5, tip0: 1, tip1: .5 }], [[[108, 58], [114, 70], [112, 84]], { w: 4.4, tip0: 1, tip1: .5 }]]));
  // Head down on a long neck, ears like blades, the lens in the snout.
  k.add(k.brush([[106, 44], [116, 46], [122, 52]], { w: 9, tip0: 1, tip1: .8 }));
  k.add(k.fill(k.shape([[114, 44], [122, 42], [130, 48], [134, 58], [128, 62], [120, 58]], { wob: .3 })));
  k.add(k.brushes([[[[118, 44], [113, 38], [106, 35]], { w: 3.4, tip0: 1, tip1: .02 }], [[[122, 43], [119, 36], [113, 31]], { w: 3, tip0: 1, tip1: .02 }]]));
  k.add(k.brushes([[[[76, 38], [96, 37.6], [112, 41.6], [118, 51]], { w: 1.1, tip0: .1, tip1: .1 }], [[[123, 42.6], [130, 48], [133.6, 57]], { w: 1, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(lens(127.6, 54, 3.2));
  k.add(k.stipple(150, 100, 40, 6, 10, { size: .8, tone: 'ink' }));
  return k.svg();
}

// Containment: a bat-winged drone lowers a gothic cage over the blob.
function contain(key) {
  const k = kit.scene({ key, seed: 121, spot: CYAN });
  torch(k, 26, 50, 88, { r: [18, 122], a: [-90, 90], sy: .85, fr: [8, 120], fa: [-10, 60], step: 5 });
  altar(k, -4, 40, 70, { drips: 2 });
  const s = monitor(k, 6, 30, 32, 30, { b: 3.4 });
  k.add(k.staticNoise({ x: s.x, y: s.y, w: s.w, h: s.h }, 4, { sw: .5 }));
  k.add(k.shadow(84, 120, 98, 26, 50, { len: 50, spread: .5, sy: .2 }));
  // The blob: an ink mass with paper eyes, pseudopods reaching for the floor's cables.
  const blob = k.shape([[86, 96], [84, 86], [90, 76], [102, 72], [114, 76], [120, 86], [118, 97], [102, 99]], { wob: .8 });
  k.add(k.fill(blob), k.brushes([[[[86, 94], [78, 97], [72, 99]], { w: 3, tip0: 1, tip1: .1 }], [[[118, 95], [128, 98], [134, 97]], { w: 3, tip0: 1, tip1: .1 }]]));
  k.add(`<ellipse cx="98" cy="84" rx="1.6" ry="1" fill="${PAPER}"/><ellipse cx="105" cy="84.4" rx="1.4" ry=".9" fill="${PAPER}"/>`);
  // The cage: a domed birdcage of bent bars, its foot ring just above the floor.
  const bars = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6, x = 78 + t * 46, top = 34 + Math.pow(Math.abs(t - .5) * 2, 2) * 14; bars.push([[[101, 30], [101 + (x - 101) * .7, top + 4], [x, top + 18], [x + k.r(.6), 90]], { w: 1.5, tip0: .6, tip1: .9, per: 4 }]); }
  k.add(k.brushes(bars));
  k.add(k.brushes([[[[76, 90], [101, 92.4], [126, 90]], { w: 3.2, tip0: .7, tip1: .7 }], [[[80, 58], [101, 60], [122, 58]], { w: 2, tip0: .5, tip1: .5 }]]));
  k.add(k.brush([[78, 90.6], [101, 93], [124, 90.6]], { w: .8, tone: 'paper', tip0: .3, tip1: .3 }));
  // Chain up to the drone.
  k.add(k.brush([[101, 30], [101, 22]], { w: 1.4, per: 2 }), `<circle cx="101" cy="28" r="1.8" fill="none" stroke="${INK}" stroke-width="1"/>`);
  // The drone: a bat-winged body with the lens, wings spread against the light.
  k.add(k.fill(k.shape([[100, 6], [74, 2], [62, 8], [70, 10], [66, 16], [76, 14], [80, 20], [92, 16], [100, 22], [108, 16], [120, 20], [124, 14], [134, 16], [130, 10], [138, 8], [126, 2]], { wob: .4, tension: .8 })));
  k.add(k.fill(k.oval(100, 12, 9, 8, { n: 9 })));
  k.add(lens(100, 13, 3.2));
  k.add(k.brushes([[[[63, 8], [74, 2.6], [96, 5]], { w: .9, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(k.stipple(150, 104, 40, 5, 10, { size: .8 }));
  return k.svg();
}

// Enrichment: a spider familiar in a web of cable, linking out to four tag cards.
function enrich(key) {
  const k = kit.scene({ key, seed: 131, spot: CYAN });
  torch(k, 100, 82, 96, { r: [18, 84], a: [180, 360], sy: .82, fr: [6, 80], step: 5 });
  // The screen it feeds from: low, in the middle, the torch.
  altar(k, 60, 140, 96, { drips: 3, lip: true });
  monitor(k, 80, 72, 40, 22, { b: 3, neck: false });
  // Four luggage tags: IP, hash, geo, whois.
  const tags = [[30, 18, -12], [148, 14, 10], [24, 62, 8], [154, 60, -8]];
  tags.forEach(([x, y, a], i) => {
    const pts = rot([[x, y + 2], [x + 4, y], [x + 22, y], [x + 22, y + 13], [x + 4, y + 13], [x, y + 11]], x + 11, y + 6.5, a);
    let g = k.fill(k.shape(pts, { wob: .2, tension: .5 }), 'paper', ` stroke="${INK}" stroke-width="1.2"`);
    const [[hx, hy]] = rot([[x + 3.6, y + 6.5]], x + 11, y + 6.5, a);
    g += `<circle cx="${n1(hx)}" cy="${n1(hy)}" r="1.1" fill="${INK}"/>`;
    const [cx, cyy] = rot([[x + 14, y + 6.5]], x + 11, y + 6.5, a)[0];
    const glyph = [
      `M${n1(cx - 5)} ${n1(cyy)}h1.2M${n1(cx - 2)} ${n1(cyy)}h1.2M${n1(cx + 1)} ${n1(cyy)}h1.2M${n1(cx + 4)} ${n1(cyy)}h1.2`,
      `M${n1(cx - 2)} ${n1(cyy - 4)}l-1 8M${n1(cx + 2)} ${n1(cyy - 4)}l-1 8M${n1(cx - 4)} ${n1(cyy - 1.4)}h8M${n1(cx - 4.6)} ${n1(cyy + 1.6)}h8`,
      `M${n1(cx)} ${n1(cyy + 4)}l-3-4.4a3.4 3.4 0 1 1 6 0z`,
      `M${n1(cx - 2.6)} ${n1(cyy - 1.6)}a2.6 2.6 0 1 1 3 2.6v1.6M${n1(cx + .4)} ${n1(cyy + 3.6)}v.4`][i];
    g += `<path d="${glyph}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
    k.add(g);
  });
  // The web: cable strands from the spider out to each tag, and its thread down to the screen.
  const S = [100, 40];
  k.add(k.tendrils([[S, [50, 25], { sag: 4, curl: 1, w: 1.4, tip: .5 }], [S, [150, 22], { sag: 4, curl: 1, w: 1.4, tip: .5 }], [S, [46, 66], { sag: 6, curl: 1, w: 1.4, tip: .5 }], [S, [154, 64], { sag: 6, curl: 1, w: 1.4, tip: .5 }],
    [S, [100, 72], { sag: 0, curl: 1.5, w: 1.6, tip: .6, thorns: 1 }], [[100, 0], S, { sag: 0, curl: 1, w: 1.2, tip: .8 }]]));
  k.add(k.brushes([[[[64, 30], [80, 18], [100, 14], [120, 18], [136, 30]], { w: .9, tip0: .2, tip1: .2 }], [[[60, 52], [76, 62], [100, 64], [124, 62], [140, 52]], { w: .9, tip0: .2, tip1: .2 }]]));
  // Eight legs, jointed, a paper gap at each knee.
  const legs = [[-1, -1], [-1, -.35], [-1, .3], [-1, .9], [1, -1], [1, -.35], [1, .3], [1, .9]].map(([sx, t]) => [[S[0] + sx * 6, S[1] + t * 3], [S[0] + sx * 18, S[1] + t * 12 - 10], [S[0] + sx * 28, S[1] + t * 22 + 2]]);
  k.add(k.brushes(legs.map(p => [p, { w: 3, tip0: 1, tip1: .1 }])));
  const body = k.oval(S[0], S[1] + 2, 10, 9, { n: 9 });
  k.add(k.fill(body), k.fill(k.oval(S[0], S[1] - 7, 6, 5, { n: 8 })));
  k.add(k.rim(body, { from: .8, to: 1.15, w: 1 }));
  k.add(lens(S[0], S[1] - 7, 2.6));
  return k.svg();
}

// Patch: a crab construct clamps a stitched patch over the crack in the screen.
function patch(key) {
  const k = kit.scene({ key, seed: 141, spot: CYAN });
  torch(k, 132, 36, 80, { r: [26, 88], sy: .85, fr: [8, 100], step: 4.8 });
  altar(k, 70, 200, 76, { drips: 4 });
  const s = monitor(k, 100, 6, 64, 54, { b: 4.4 });
  // The crack: a jagged ink split across the screen, with splinters.
  k.add(k.brushes([[[[s.x + 2, s.y + 30], [s.x + 14, s.y + 24], [s.x + 22, s.y + 28], [s.x + 30, s.y + 16], [s.x + 40, s.y + 20], [s.x + s.w - 2, s.y + 6]], { w: 2, tip0: .1, tip1: .1, per: 2 }],
    [[[s.x + 22, s.y + 28], [s.x + 26, s.y + 38]], { w: 1, tip0: .6, tip1: .02, per: 2 }], [[[s.x + 40, s.y + 20], [s.x + 46, s.y + 30]], { w: 1, tip0: .6, tip1: .02, per: 2 }]]));
  k.add(k.staticNoise({ x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 }, 6, { sw: .5 }));
  // The patch: a stitched paper plate, already half over the crack, cyan stitches on ink.
  const pp = rot(soft(122, 14, 20, 16, 2), 132, 22, -8);
  k.add(k.fill(k.shape(pp, { wob: .3, tension: .9 }), 'paper', ` stroke="${INK}" stroke-width="2.2"`));
  const st = [[124, 16], [140, 14], [142, 29], [126, 31]].map(([x, y]) => rot([[x, y]], 132, 22, -8)[0]);
  k.add(cy(st.map(([x, y]) => `M${n1(x - 1.6)} ${n1(y - 1.6)}l3.2 3.2M${n1(x + 1.6)} ${n1(y - 1.6)}l-3.2 3.2`).join(''), 1));
  // Thread from the patch to the crab's needle claw.
  k.add(k.tendrils([[[124, 28], [96, 40], { sag: 6, curl: 1, w: .9, tip: .6 }], [[78, 78], [58, 98], { sag: 3, curl: 2, w: 1.6, tip: .3, thorns: 1 }]]));
  k.add(k.shadow(60, 100, 92, 132, 36, { len: 30, spread: .5, sy: .3 }));
  // The crab: a lumpy shell, legs on the altar and the floor, one claw up pressing the patch, one holding the needle.
  const shell = k.shape([[60, 64], [66, 54], [80, 50], [94, 54], [100, 64], [94, 72], [80, 75], [66, 72]], { wob: .5, chip: .3 });
  k.add(k.brushes([[[[64, 68], [54, 74], [50, 90]], { w: 3, tip0: 1, tip1: .2 }], [[[68, 72], [62, 80], [62, 92]], { w: 3, tip0: 1, tip1: .2 }], [[[90, 72], [94, 76], [98, 78]], { w: 3, tip0: 1, tip1: .2 }], [[[84, 74], [86, 82], [84, 92]], { w: 3, tip0: 1, tip1: .2 }]]));
  k.add(k.fill(shell), k.hatch(shell, { a: 90, gap: 2, bend: 4, w: [.3, 1], tone: 'paper', broken: .5, cover: [.72, 1] }));
  k.add(limb(k, [[90, 56], [100, 44], [112, 34], [120, 28]], 4, 2.2));
  k.add(k.fill(k.shape([[116, 30], [120, 22], [128, 20], [126, 26], [122, 26], [124, 32]], { wob: .3 })));
  k.add(limb(k, [[68, 56], [66, 44], [74, 36], [86, 36]], 3.6, 2));
  k.add(k.brushes([[[[84, 36], [90, 33], [95, 32]], { w: 2.4, tip0: .8, tip1: .1 }], [[[84, 36.6], [90, 38], [94, 41]], { w: 2, tip0: .8, tip1: .1 }]]), k.brush([[89, 38], [97, 40]], { w: .9, tone: 'paper', tip0: .5, tip1: .02 }));
  k.add(k.brushes([[[[66, 54.4], [80, 50.4], [94, 54.6], [99.4, 63]], { w: 1.1, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(lens(80, 61, 3.4));
  k.add(k.stipple(40, 102, 36, 6, 10, { size: .8 }));
  return k.svg();
}

// Recovery: a jellyfish spirit of cable drips healing into a vial; the heartbeat steadies on the screen.
function recover(key) {
  const k = kit.scene({ key, seed: 151, spot: CYAN });
  torch(k, 50, 54, 84, { r: [22, 100], sy: .85, fr: [8, 110], fa: [-10, 120], step: 4.8 });
  altar(k, 14, 190, 80, { drips: 5 });
  const s = monitor(k, 22, 30, 54, 38, { b: 4 });
  // Heartbeat across the screen, the last beat in cyan on an ink keyline.
  k.add(k.brush([[s.x + 2, s.y + 18], [s.x + 10, s.y + 18], [s.x + 13, s.y + 10], [s.x + 16, s.y + 25], [s.x + 19, s.y + 18], [s.x + 26, s.y + 18]], { w: 1.4, tip0: .4, tip1: .9, per: 2 }));
  k.add(cy(`M${s.x + 26} ${s.y + 18}h3l3-10 3 16 3-6h${s.w - 40}`, 1.2));
  // The vial on the altar: an ink flask, filled two thirds with cyan, a cork, drips falling in.
  const vial = k.shape([[118, 54], [126, 54], [126, 62], [134, 70], [133, 80], [122, 82.4], [111, 80], [110, 70], [118, 62]], { wob: .3, tension: .8 });
  k.add(k.fill(vial, 'ink', ` stroke="${PAPER}" stroke-width="1"`));
  k.add(k.fill(k.shape([[113, 70], [131, 69.6], [131, 78.6], [122, 80.4], [113, 78.6]], { wob: .3, tension: .8 }), 'spot'));
  k.add(k.fill(k.shape([[117, 50], [127, 50], [126.6, 55], [117.4, 55]], { wob: .2, tension: .5 })));
  k.add(`<circle cx="121" cy="44" r="1.2" fill="${CYAN}" stroke="${INK}" stroke-width=".6"/><circle cx="122.6" cy="38" r=".9" fill="${CYAN}" stroke="${INK}" stroke-width=".5"/>`);
  // The jellyfish: a ribbed bell, the lens under it, cable tentacles trailing to the vial, the screen and the floor.
  const C = [122, 18];
  k.add(k.tendrils([[[C[0] - 10, C[1] + 6], [80, 46], { sag: 8, curl: 3, w: 2, tip: .3 }], [[C[0] - 4, C[1] + 8], [119, 36], { sag: 2, curl: 3, w: 1.8, tip: .2 }], [[C[0] + 4, C[1] + 8], [140, 44], { sag: 4, curl: 3, w: 1.8, tip: .2 }],
    [[C[0] + 10, C[1] + 6], [168, 84], { sag: 6, curl: 4, w: 2, tip: .3, thorns: 1 }], [[136, 80], [168, 100], { sag: 3, curl: 2, w: 1.4, tip: .3, thorns: 1 }]]));
  const bell = k.shape([[C[0] - 18, C[1] + 6], [C[0] - 15, C[1] - 6], [C[0], C[1] - 12], [C[0] + 15, C[1] - 6], [C[0] + 18, C[1] + 6], [C[0] + 12, C[1] + 9], [C[0] + 6, C[1] + 6], [C[0], C[1] + 9.6], [C[0] - 6, C[1] + 6], [C[0] - 12, C[1] + 9]], { wob: .4 });
  k.add(k.fill(bell));
  k.add(k.hatch(bell, { a: 80, gap: 2.4, bend: -5, w: [.9, .2], tone: 'paper', broken: .4, cover: [0, .3] }));
  k.add(k.rim(bell, { from: .02, to: .3, w: 1 }));
  k.add(lens(C[0], C[1] + 1, 3.4));
  k.add(k.stipple(100, 100, 80, 6, 12, { size: .8 }));
  return k.svg();
}

// Decoy: an angler imp holds out a honeypot jar on a cable rod; a bug flies in for it.
function decoy(key) {
  const k = kit.scene({ key, seed: 161, spot: CYAN });
  torch(k, 168, 44, 86, { r: [20, 100], sy: .85, fr: [8, 120], fa: [100, 200], step: 4.8 });
  altar(k, 150, 204, 74, { drips: 2 });
  monitor(k, 156, 26, 38, 36, { b: 3.6 });
  k.add(k.staticNoise({ x: 160, y: 30, w: 30, h: 28 }, 5, { sw: .5 }));
  k.add(k.shadow(50, 96, 98, 168, 44, { len: 50, spread: .5, sy: .18 }));
  // The rod: a cable from the imp's hand arching out, the jar swinging from it.
  k.add(k.tendril([84, 44], [130, 20], { sag: -10, curl: 1, w: 2.6, tip: .5, segs: 4 }), k.brush([[130, 20], [131, 30], [130.6, 40]], { w: 1, per: 3, tip0: .5, tip1: .5 }));
  // The honeypot: paper glass, ink keyline, honey (ink) to the brim, drips off the lip, a lid.
  const jar = k.shape([[124, 44], [137, 44], [141, 52], [140, 64], [131, 67], [121, 64], [120, 52]], { wob: .3, tension: .8 });
  k.add(k.fill(jar, 'paper', ` stroke="${INK}" stroke-width="1.8"`), k.fill(k.shape([[121.6, 53], [139.4, 52.4], [139, 63], [131, 65.6], [122.4, 63]], { wob: .3, tension: .8 })));
  k.add(k.fill(k.shape([[122, 39.6], [139, 39.6], [140, 44.6], [121, 44.6]], { wob: .2, tension: .5 })), k.drips(123, 139, 66, 3, { len: [3, 9], w: 1.6 }));
  k.add(k.brush([[124.6, 47], [125, 51]], { w: 1, tone: 'paper' }));
  // The bug: an ink beetle with paper wings, flying in from the right toward the jar.
  k.add('<g transform="translate(-8 -58)">');
  k.add(k.fill(k.oval(160, 74, 4.6, 3, { n: 8, rot: 20 })), k.fill(k.oval(155.4, 72.4, 2.2, 2, { n: 6 })));
  k.add(k.fill(k.shape([[160, 72], [164, 64], [168, 66], [164, 73]], { wob: .2 }), 'paper', ` stroke="${INK}" stroke-width=".8"`), k.fill(k.shape([[158, 72], [158, 64], [154, 66], [156, 72]], { wob: .2 }), 'paper', ` stroke="${INK}" stroke-width=".8"`));
  k.add(k.brushes([[[[153.6, 71], [150, 68.6]], { w: .8, tip1: .1 }], [[[153.6, 73], [150, 74]], { w: .8, tip1: .1 }], [[[170, 82], [178, 86], [186, 84]], { w: .8, tip0: .3, tip1: .1 }], [[[168, 77], [176, 78]], { w: .8, tip0: .3, tip1: .1 }]]), '</g>');
  // The imp: hunched on its haunches, cable tail into the floor, long arm up holding the rod.
  k.add(k.tendril([56, 84], [26, 102], { sag: 4, curl: 3, w: 3, tip: .3, thorns: 2 }));
  const body = k.shape([[60, 48], [72, 40], [84, 44], [90, 58], [88, 76], [80, 90], [64, 92], [52, 84], [52, 66]], { wob: .5 });
  k.add(k.fill(body), k.drips(56, 86, 88, 4, { len: [3, 6], w: 2 }));
  k.add(k.brushes([[[[58, 90], [54, 96], [48, 98]], { w: 5, tip0: 1, tip1: .3 }], [[[78, 90], [82, 96], [90, 98]], { w: 5, tip0: 1, tip1: .3 }]]));
  k.add(limb(k, [[80, 54], [86, 46], [84, 40]], 4, 2.2));
  // Head: a round lantern-head with the lens, two cable antennae.
  const head = k.oval(74, 34, 10, 9, { n: 9 });
  k.add(k.fill(head));
  k.add(k.brushes([[[[68, 27], [62, 18], [56, 14]], { w: 2, tip0: 1, tip1: .02 }], [[[78, 26], [80, 16], [86, 10]], { w: 2, tip0: 1, tip1: .02 }]]));
  k.add(k.brushes([[[[76, 25.4], [82.6, 29], [84, 36], [81, 41.6]], { w: 1, tip0: .1, tip1: .1 }], [[[86, 46], [90, 58], [88, 74]], { w: .9, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(lens(77, 34, 3.4));
  k.add(k.stipple(110, 102, 60, 6, 10, { size: .8 }));
  return k.svg();
}

// Recon: a mechanical owl perched on a rack spire, the radar scope behind it, blips on the sweep.
function recon(key) {
  const k = kit.scene({ key, seed: 171, spot: CYAN });
  const C = [100, 46], R = 38;
  // The scope is the light: a disc of paper with engraved range rings, its glow spilling down the wall.
  k.add(k.glow({ x: C[0], y: C[1], r: [R + 4, 68], sy: .82, step: 4.4, clip: { x: 0, y: 0, w: 200, h: 92 }, w: [.6, 2.6] }));
  k.add(k.glow({ x: C[0], y: 90, r: [8, 76], a: [0, 180], sy: .25, step: 5.6, clip: { x: 0, y: 92, w: 200, h: 20 }, w: [.2, 1.8] }));
  k.add(k.brush([[0, 92.4], [80, 91.6], [200, 92.2]], { w: 1.6, tip0: .5, tip1: .5 }));
  // Scope bezel and face.
  const bez = k.oval(C[0], C[1], R + 4, R + 4, { n: 14, lump: .02 });
  k.add(k.fill(bez, 'ink'));
  k.add(k.fill(k.oval(C[0], C[1], R, R, { n: 14, lump: .015 }), 'paper'));
  k.add(`<g fill="none" stroke="${INK}"><circle cx="${C[0]}" cy="${C[1]}" r="12" stroke-width=".8" stroke-dasharray="14 3"/><circle cx="${C[0]}" cy="${C[1]}" r="24" stroke-width="1" stroke-dasharray="22 4"/><circle cx="${C[0]}" cy="${C[1]}" r="34" stroke-width="1.2" stroke-dasharray="30 5"/></g>`);
  // The sweep: a wedge of hatching trailing the beam.
  const wedge = k.shape([C, [C[0] + R * Math.cos(-1.1), C[1] + R * Math.sin(-1.1)], [C[0] + R * Math.cos(-.75), C[1] + R * Math.sin(-.75)], [C[0] + R * Math.cos(-.4), C[1] + R * Math.sin(-.4)]], { wob: 0, tension: .2 });
  k.add(k.hatch(wedge, { a: -55, gap: 1.7, bend: 0, w: [.3, 1.4], broken: .2 }));
  k.add(k.brush([C, [C[0] + R * Math.cos(-1.1) * .97, C[1] + R * Math.sin(-1.1) * .97]], { w: 1.8, tip0: .8, tip1: .4, per: 2 }));
  // Blips: ink dots with a ring, one freshly found in cyan.
  k.add(`<circle cx="124" cy="30" r="3.4" fill="${INK}"/><circle cx="124" cy="30" r="1.8" fill="${CYAN}"/><circle cx="72" cy="34" r="1.8" fill="${INK}"/><circle cx="116" cy="66" r="1.6" fill="${INK}"/><circle cx="80" cy="60" r="1.4" fill="${INK}"/>`);
  // The rack spire it perches on: a pointed arch rising from the floor, chipped, LED votives, cables at its foot.
  k.add(k.tendrils([[[90, 92], [52, 104], { sag: 4, curl: 2, w: 1.8, tip: .3, thorns: 1 }], [[110, 92], [150, 106], { sag: 4, curl: 2, w: 1.8, tip: .3, thorns: 1 }], [[86, 44], [64, 18], { sag: -4, curl: 2, w: 1.4, tip: .4 }]]));
  k.add(k.fill(k.shape([[84, 94], [85, 72], [90, 64], [100, 60], [110, 64], [115, 72], [116, 94]], { wob: .5, chip: .3, tension: .8 })));
  k.add(`<path d="M93 76h.1M100 76h.1M107 76h.1M93 84h.1M107 84h.1" stroke="${PAPER}" stroke-width="1.6"/>`);
  // The owl: tufted, wings folded, talons on the spire, one lens and one shuttered eye.
  const owl = k.shape([[100, 30], [108, 32], [113, 42], [112, 54], [106, 63], [94, 63], [88, 54], [87, 42], [92, 32]], { wob: .4 });
  k.add(k.fill(owl));
  k.add(k.brushes([[[[92, 34], [88, 26], [86, 22]], { w: 3.6, tip0: 1, tip1: .02 }], [[[108, 34], [112, 26], [114, 22]], { w: 3.6, tip0: 1, tip1: .02 }]]));
  k.add(k.hatch(owl, { a: 0, gap: 2.2, bend: 3, w: [.9, .3], tone: 'paper', broken: .5, cover: [.55, .9] }));
  k.add(k.brushes([[[[94, 62], [92, 66]], { w: 1.4, tip0: 1, tip1: .1 }], [[[98, 62], [98, 66.6]], { w: 1.4, tip0: 1, tip1: .1 }], [[[102, 62], [102, 66.6]], { w: 1.4, tip0: 1, tip1: .1 }], [[[106, 62], [108, 66]], { w: 1.4, tip0: 1, tip1: .1 }]]));
  k.add(lens(95, 41, 3.6), `<circle cx="106" cy="41" r="4.4" fill="${PAPER}"/><circle cx="106" cy="41" r="3.4" fill="${INK}"/>`, k.brush([[103, 41.4], [109, 41]], { w: 1, tone: 'paper', per: 2 }));
  k.add(k.fill(k.shape([[98.6, 46], [101.4, 46], [100, 50]], { wob: .1, tension: .3 }), 'paper'));
  k.add(k.stipple(100, 104, 80, 5, 12, { size: .8 }));
  return k.svg();
}

const out = {
  art: {
    RES: responder('RES'), ENG: engineer('ENG'), SOA: soarcerer('SOA'), PAT: fixer('PAT'),
    kit_triage: triage('kit_triage'), kit_hunt: hunt('kit_hunt'), kit_contain: contain('kit_contain'), kit_enrich: enrich('kit_enrich'),
    kit_patch: patch('kit_patch'), kit_recover: recover('kit_recover'), kit_decoy: decoy('kit_decoy'), kit_recon: recon('kit_recon'),
  },
  print: {},
};
fs.writeFileSync(path.join(__dirname, 'ink-art.json'), JSON.stringify(out, null, 1) + '\n');
console.log(Object.fromEntries(Object.entries(out.art).map(([k, v]) => [k, (v.length / 1024).toFixed(1) + ' KB'])));
module.exports = out;
