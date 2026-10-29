// MOBS-B: the heavy-hitter mobs, drawn with the lead's ink-kit. Writes ink-art.json: { art: {...}, print: {} }.
// Usage: node scenes.js
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../ink-kit');
const { FLARE, soft, rot } = kit;
const INK = '#07060A';

// A limb: a wider paper gap under the ink stroke, so it separates from the mass behind it.
const limb = (k, pts, w, o = {}) => k.brush(pts, { w: w + 2.4, tone: 'paper', tip0: .7, tip1: .5, ...o }) + k.brush(pts, { w, tip0: .8, tip1: .4, ...o });
const eyes = (a, b, rx = 1.9, ry = 1) => [a, b].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${FLARE}"/>`).join('');
// Claws: short needle strokes fanning from a point.
const claws = (k, x, y, dirs, w = 1.4) => k.brushes(dirs.map(([dx, dy, cx = 0, cy = 0]) => [[[x, y], [x + dx * .55 + cx, y + dy * .55 + cy], [x + dx, y + dy]], { w, tip0: 1, tip1: .05 }]));

// ---------- OAuth Consent Grifter: a lanky horned grifter holding up the consent dialog, the only light ----------
function imp(key) {
  const k = kit.scene({ key, seed: 201, spot: FLARE });
  // The dialog it holds up is the torch: it lights the wall behind the grifter and the floor.
  k.add(k.glow({ x: 50, y: 40, r: [22, 124], a: [-120, 70], clip: { x: 0, y: 0, w: 200, h: 90 }, w: [.15, 2.4], step: 4.8 }));
  k.add(k.glow({ x: 56, y: 90, r: [6, 112], a: [-5, 185], sy: .26, step: 5.4, clip: { x: 0, y: 90, w: 200, h: 22 }, w: [.2, 1.9] }));
  k.add(k.brush([[0, 90.4], [70, 89.6], [140, 90.5], [200, 89.8]], { w: 1.6, tip0: .6, tip1: .6 }));
  // The keep behind: a crypt arch of racks, dim, with a vine of cable climbing it.
  k.add(k.fill(k.shape([[150, 92], [152, 40], [164, 14], [182, 2], [202, -2], [204, 92]], { wob: .6, tension: .8, chip: .3 })));
  k.add(k.brushes([[[[150, 90], [152, 40], [164, 14], [183, 1]], { w: 1.1, tip0: .1, tip1: .1 }]], 'paper'));
  k.add(k.stipple(176, 50, 8, 26, 12, { size: .9, bias: .4 }));
  // Permission strings: cables hang from the dialog and root into the floor.
  k.add(k.tendrils([[[40, 56], [26, 94], { sag: 2, curl: 2, w: 1.4, tip: .4, thorns: 1 }], [[58, 57], [70, 96], { sag: 3, curl: 2.5, w: 1.2, tip: .3, thorns: 1 }], [[48, 57], [44, 100], { sag: 2, curl: 3, w: .9, tip: .3 }]]));
  // The long shadow, away from the dialog.
  k.add(k.shadow(98, 132, 91, 50, 40, { len: 62, spread: .6, sy: .22 }));
  // Coat tails, tattered, swept behind.
  const coat = k.shape([[100, 30], [118, 26], [130, 40], [134, 58], [142, 72], [150, 88], [138, 84], [132, 90], [122, 82], [112, 88], [104, 78], [98, 60], [97, 42]], { wob: .6 });
  k.add(k.fill(coat), k.drips(110, 146, 84, 4, { len: [3, 8], w: 1.8 }));
  // Long legs, digitigrade, with clawed feet.
  k.add(k.brushes([[[[106, 72], [100, 81], [106, 86], [101, 90.6]], { w: 5.4, tip0: 1, tip1: .5 }], [[[122, 74], [128, 82], [122, 87], [126, 90.6]], { w: 5.4, tip0: 1, tip1: .5 }]]));
  k.add(claws(k, 101, 90.6, [[-7, .6], [-6, -1.8]], 1.6), claws(k, 126, 90.6, [[7, .6], [6, -1.6]], 1.6));
  // The torso: narrow, hunched forward toward the dialog.
  k.add(k.fill(k.shape([[100, 26], [112, 20], [124, 26], [126, 44], [120, 64], [110, 72], [100, 64], [97, 44]], { wob: .4 })));
  // Arm up: holds the dialog high by its corner, a paper gap against the body.
  k.add(limb(k, [[104, 28], [92, 20], [80, 17], [68, 21]], 4.6));
  k.add(claws(k, 69, 21, [[-4, -3.4], [-5.4, 0], [-3.4, 3.4]], 1.3));
  const dlg = k.shape(rot(soft(18, 18, 52, 38, 3), 44, 37, -5), { wob: .3, tension: .9 });
  k.add(k.fill(dlg, 'paper', ` stroke="${INK}" stroke-width="2"`));
  k.add(k.brush(rot([[21, 22.5], [67, 22.5]], 44, 37, -5), { w: 3.2, tip0: .5, tip1: .5 }));
  k.add(k.brushes([[26, 29, 40], [26, 33, 34], [26, 37, 38], [26, 41, 24]].map(([x, y, l]) => [rot([[x, y], [x + l, y]], 44, 37, -5), { w: 1.2, tip0: .4, tip1: .2, per: 2 }])));
  k.add(k.staticNoise({ x: 22, y: 26, w: 44, h: 22 }, 4, { sw: .4 }));
  k.add(k.fill(k.shape(rot(soft(44, 45, 20, 7, 2), 44, 37, -5), { wob: .2, tension: .9 }), 'spot', ` stroke="${INK}" stroke-width="1.2"`));
  // The other arm reaches across, one long claw already on Accept.
  k.add(limb(k, [[104, 38], [94, 50], [80, 53], [66, 50]], 4.4));
  k.add(k.brushes([[[[67, 50], [62, 49], [56, 47.5]], { w: 1.6, tip0: 1, tip1: .05 }], [[[67, 51], [63, 53.4], [60, 55]], { w: 1.3, tip0: 1, tip1: .05 }]]));
  // A long skull leaning out over the dialog, ram horns curling back.
  k.add(k.fill(k.shape([[99, 21], [102, 10], [110, 5.4], [119, 8], [121, 17], [111, 25]], { wob: .3 })));
  k.add(k.brushes([[[[106, 7.4], [99, 3], [92, 4.4], [91, 11], [96.6, 13]], { w: 4.2, tip0: 1, tip1: .1 }], [[[115, 7], [123, 2.6], [131, 4], [133, 10.6], [128, 13.4]], { w: 4.2, tip0: 1, tip1: .1 }]]));
  // Rim light from the dialog along skull, horn, chest and coat.
  k.add(k.brushes([[[[99.6, 20], [102.4, 10.6], [109, 6]], { w: 1.1, tip0: .2, tip1: .1 }], [[[97.6, 44], [98, 58], [102, 66]], { w: 1, tip0: .2, tip1: .1 }],
    [[[92.4, 6], [92, 11], [96, 12.4]], { w: .8, tip0: .2, tip1: .1 }], [[[103.4, 76], [101.6, 84]], { w: .8, tip0: .3, tip1: .1 }]], 'paper'));
  k.add(eyes([105.4, 14.6], [110.6, 15.2], 1.7, 1));
  k.add(k.stipple(130, 102, 60, 7, 14, { size: .8 }));
  return k.svg();
}

// ---------- Rootkit Implant: a server chest on the floor, lid prised open; the lid is a screen, the mouth has teeth ----------
function mimic(key) {
  const k = kit.scene({ key, seed: 202, spot: FLARE });
  // The lid's screen lights the wall above and spills over the floor.
  k.add(k.glow({ x: 100, y: 36, r: [28, 88], a: [0, 360], sy: .8, clip: { x: 0, y: 0, w: 200, h: 88 }, w: [.15, 2.4], step: 4.8 }));
  k.add(k.glow({ x: 100, y: 88, r: [20, 90], a: [0, 180], sy: .24, step: 5.2, clip: { x: 0, y: 88, w: 200, h: 24 }, w: [.2, 1.9] }));
  k.add(k.brush([[0, 88.5], [60, 87.8], [140, 88.6], [200, 88]], { w: 1.6, tip0: .6, tip1: .6 }));
  // Rack pillars of the crypt either side, chipped.
  k.add(k.fill(k.shape([[-4, -4], [26, -4], [30, 40], [24, 92], [-4, 92]], { wob: .6, chip: .4, tension: .7 })), k.fill(k.shape([[174, -4], [204, -4], [204, 92], [176, 92], [170, 40]], { wob: .6, chip: .4, tension: .7 })));
  k.add(k.brushes([12, 20, 28, 36, 44, 52, 60].map(y => [[[6, y], [16, y + .3]], { w: 1.2, tip0: .8, tip1: .8, per: 2 }]).concat([12, 20, 28, 36, 44, 52, 60].map(y => [[[184, y], [194, y + .3]], { w: 1.2, tip0: .8, tip1: .8, per: 2 }])), 'paper'));
  // The lid: hinged at the back, prised open. Its face is the torch, a process list of svchosts.
  const lid = k.shape([[64, 52], [62, 30], [66, 10], [100, 6], [134, 9], [139, 30], [137, 52], [100, 54]], { wob: .5, tension: .7, chip: .2 });
  k.add(k.fill(lid));
  const pane = k.shape([[69, 46], [67, 30], [71, 14], [100, 11.5], [129, 13.5], [133, 30], [131, 46], [100, 47]], { wob: .3, tension: .7 });
  k.add(k.fill(pane, 'paper'));
  k.add(k.brush([[71, 17], [100, 15.6], [129, 17]], { w: 2.6, tip0: .4, tip1: .4 }), `<path d="M75 16.4h.1M79 16.3h.1M83 16.2h.1" stroke="#F3E9E2" stroke-width="1.5"/>`);
  k.add(k.brushes([22, 26.5, 31, 35.5, 40].map((y, i) => [[[74, y], [74 + 22 + (i === 2 ? 2 : 0), y]], { w: 1.3, tip0: .5, tip1: .5, per: 2 }]).concat([22, 26.5, 31, 35.5, 40].map(y => [[[104, y], [104 + 8 + k.R() * 14, y]], { w: 1, tip0: .5, tip1: .2, per: 2 }]))));
  k.add(k.staticNoise({ x: 70, y: 19, w: 60, h: 26 }, 5, { sw: .45 }));
  // The chest: a bulging server case, mouth wide, its front chipped and hatched.
  k.add(k.shadow(60, 142, 89, 100, 36, { len: 16, spread: .5, sy: .5 }));
  const chest = k.shape([[56, 58], [100, 52], [144, 58], [146, 74], [142, 90], [100, 92], [58, 90], [54, 74]], { wob: .6, tension: .8, chip: .3 });
  k.add(k.fill(chest));
  // The gullet: black, with teeth on both lips silhouetted against the screen.
  const gul = k.shape([[60, 52], [100, 44], [140, 52], [130, 68], [100, 72], [70, 68]], { wob: .4 });
  k.add(k.fill(gul));
  const up = [], dn = [];
  for (let i = 0; i < 9; i++) { const x = 66 + i * 8.5, t = (x - 100) / 38; up.push([[[x, 67 - t * t * 5], [x + .8, 56 - t * t * 6 - (i % 2) * 3]], { w: 5.2, tip0: 1, tip1: .02, per: 2 }]); }
  for (let i = 0; i < 8; i++) { const x = 70 + i * 8.5, t = (x - 100) / 38; dn.push([[[x, 47 + t * t * 4], [x - .6, 56 + t * t * 2 + (i % 2) * 2.4]], { w: 4.6, tip0: 1, tip1: .02, per: 2 }]); }
  k.add(k.brushes(up.concat(dn), 'paper'));
  k.add(k.brushes(up.concat(dn).map(([p, o]) => [p, { ...o, w: o.w * .42 }])));
  // Chest front: drive-bay ridges as curved hatch, a power LED, and drips off its lip.
  k.add(k.hatch(chest, { a: 0, gap: 3.2, bend: 2.5, w: [.3, 1.1], tone: 'paper', broken: .5, cover: [.56, .9] }));
  k.add(k.drips(64, 136, 72, 6, { len: [3, 9], w: 1.8 }));
  // Hooks: two hooked arms reach up out of the mouth and prise the lid open by its edges.
  k.add(limb(k, [[70, 60], [58, 48], [54, 34], [60, 26]], 4.2), limb(k, [[130, 60], [143, 48], [146, 34], [140, 26]], 4.2));
  k.add(k.brushes([[[[60, 26], [64, 21], [68, 22], [67, 26]], { w: 2.2, tip0: 1, tip1: .05 }], [[[140, 26], [136, 21], [132, 22], [133, 26]], { w: 2.2, tip0: 1, tip1: .05 }]]));
  // The tongue: a fat cable lolling out over the lip and across the floor.
  k.add(k.tendril([102, 66], [146, 104], { sag: 12, curl: 3, w: 6.4, tip: .35, segs: 5 }), k.tendril([96, 66], [40, 100], { sag: 10, curl: 3, w: 2.2, tip: .3, thorns: 2 }));
  k.add(k.brushes([[[[58, 60], [100, 54.4], [142, 60]], { w: .9, tip0: .1, tip1: .1 }], [[[55.6, 62], [55, 74], [58, 88]], { w: .8, tip0: .2, tip1: .1 }]], 'paper'));
  // The eyes, deep in the gullet.
  k.add(eyes([93.6, 61.4], [106.4, 61.6], 2.2, 1.2));
  k.add(k.stipple(100, 101, 80, 7, 16, { size: .8 }));
  return k.svg();
}

// ---------- Kerberoast Enforcer: a plated brute roasting a service ticket on a spit over an RC4 fire ----------
function ogre(key) {
  const k = kit.scene({ key, seed: 203, spot: FLARE });
  // The monitor at the right edge is the torch; the brute stands against its light.
  k.add(k.glow({ x: 182, y: 48, r: [18, 134], a: [110, 290], clip: { x: 0, y: 0, w: 200, h: 90 }, w: [.15, 2.6], step: 5.6 }));
  k.add(k.glow({ x: 176, y: 90, r: [6, 124], a: [0, 180], sy: .24, step: 6.2, clip: { x: 0, y: 90, w: 200, h: 22 }, w: [.2, 2] }));
  k.add(k.brush([[0, 90], [80, 89.4], [150, 90.4], [200, 89.8]], { w: 1.6, tip0: .6, tip1: .6 }));
  // The altar: desk and monitor at the right edge.
  k.add(k.fill(k.shape([[164, 74], [184, 71.5], [204, 72], [204, 113], [166, 113], [162, 92]], { wob: .5, tension: .7 })), k.drips(166, 196, 76, 3, { len: [3, 8], w: 1.3, tone: 'paper' }));
  k.add(k.fill(k.shape([[176, 42], [190, 40], [204, 40], [204, 72], [176, 71]], { wob: .3, tension: .5 })));
  k.add(k.fill(k.shape([[170, 45], [176, 42], [177, 57], [176, 71], [170, 67]], { wob: .2, tension: .6 }), 'paper'), k.staticNoise({ x: 170.5, y: 47, w: 5, h: 18 }, 4, { sw: .5 }));
  // Ticket smoke drifts up the dark left wall; cables run from the altar under the brute's feet.
  k.add(k.tendrils([[[168, 80], [128, 94], { sag: 6, curl: 2, w: 1.6, tip: .4, thorns: 1 }], [[172, 86], [96, 98], { sag: 8, curl: 2, w: 1.2, tip: .3 }]]));
  k.add(k.shadow(74, 140, 91, 182, 48, { len: 70, spread: .5, sy: .2 }));
  // The brazier: a cracked chassis bowl on three legs, the fire in flare with an ink keyline.
  k.add(k.brushes([[[[30, 80], [26, 86], [24, 91]], { w: 2.2, tip0: 1, tip1: .3 }], [[[46, 80], [50, 86], [53, 91]], { w: 2.2, tip0: 1, tip1: .3 }]]));
  const bowl = k.shape([[22, 72], [38, 74], [56, 72], [52, 80], [38, 83], [26, 80]], { wob: .4, chip: .4 });
  const fire = k.shape([[25, 73], [27, 64], [31, 68], [33, 57], [37, 64], [40, 52], [43, 63], [47, 59], [48, 67], [52, 62], [53, 73], [38, 75]], { wob: .5, tension: .7 });
  k.add(k.fill(fire, 'spot', ` stroke="${INK}" stroke-width="1.6"`), k.brushes([[[[35, 72], [37, 66], [39, 61]], { w: 2.2, tip0: 1, tip1: .05 }], [[[43, 72], [45, 68], [46, 65]], { w: 1.6, tip0: 1, tip1: .05 }]]));
  k.add(k.fill(bowl), k.brush([[23, 72.4], [38, 74.2], [55, 72.4]], { w: .9, tone: 'paper', tip0: .2, tip1: .2 }));
  // The spit, the ticket on it charring, and smoke off it.
  k.add(k.smoke(40, 44, 40, { n: 3, sway: 7, w: 1.3 }));
  k.add(k.brush([[16, 50.6], [50, 49.8], [80, 50.6]], { w: 2, tip0: .5, tip1: 1 }));
  const tk = k.shape(rot([[30, 42], [50, 42], [50, 46], [48, 48], [50, 50], [50, 56], [30, 56], [30, 50], [32, 48], [30, 46]], 40, 49, -8), { wob: .2, tension: .3 });
  k.add(k.fill(tk, 'paper', ` stroke="${INK}" stroke-width="1"`));
  k.add(k.brushes([[[[33, 46], [43, 44.8]], { w: 1, per: 2, tip0: .5, tip1: .3 }], [[[33, 50], [40, 49]], { w: 1, per: 2, tip0: .5, tip1: .3 }]]));
  // The brute: one broad hunched mass, legs planted, plate pauldrons of rack panels.
  const body = k.shape([[76, 34], [90, 20], [116, 17], [138, 24], [148, 44], [146, 70], [136, 88], [114, 84], [98, 88], [84, 84], [74, 66], [72, 48]], { wob: .6 });
  k.add(k.fill(body), k.drips(84, 132, 84, 5, { len: [3, 8], w: 2.6 }));
  k.add(k.brushes([[[[92, 82], [88, 88], [82, 91]], { w: 9, tip0: 1, tip1: .5 }], [[[122, 82], [128, 88], [136, 91]], { w: 9, tip0: 1, tip1: .5 }]]));
  // The far pauldron, a hatched mid-tone plate, slatted like rack panels, rim-lit by the screen.
  const pr = k.shape([[114, 19], [134, 15], [148, 24], [153, 40], [143, 44], [126, 34]], { wob: .4, chip: .4 });
  k.add(k.fill(pr, 'paper', ` stroke="${INK}" stroke-width="1.4"`), k.hatch(pr, { a: 20, gap: 2.3, bend: 3, w: [.4, 1.7], broken: .3 }));
  k.add(k.brushes([[[[120, 24], [134, 20], [147, 29]], { w: 1.8, tip0: .3, tip1: .3 }], [[[124, 31], [138, 27], [150, 36]], { w: 1.8, tip0: .3, tip1: .3 }]]));
  const pl = k.shape([[74, 34], [86, 22], [100, 22], [100, 32], [90, 42], [76, 44]], { wob: .4, chip: .4 });
  k.add(k.fill(pl, 'paper', ` stroke="${INK}" stroke-width="1.4"`), k.hatch(pl, { a: -30, gap: 2.3, bend: -3, w: [1.8, .6], broken: .3 }));
  // The near arm, thick, holding the spit's end; a fist on the crank.
  k.add(limb(k, [[86, 36], [78, 46], [76, 52]], 9));
  k.add(k.fill(k.oval(78, 51.5, 5.4, 4.6, { n: 8 })));
  // The far arm hangs, a huge fist at the knee.
  k.add(limb(k, [[142, 42], [152, 56], [153, 68]], 9), k.fill(k.oval(153, 71, 6, 5.4, { n: 8 })));
  // Helm: low between the shoulders, horns out and forward, one visor slit.
  k.add(k.fill(k.shape([[94, 30], [96, 18], [106, 13], [116, 18], [118, 30], [106, 34]], { wob: .3 })));
  k.add(k.brushes([[[[96, 20], [86, 16], [80, 8], [84, 2]], { w: 4.6, tip0: 1, tip1: .02 }], [[[116, 20], [126, 15], [131, 7], [128, 1]], { w: 4.6, tip0: 1, tip1: .02 }]]));
  k.add(k.brushes([[[[116.4, 19], [124, 15.4], [130, 7]], { w: .9, tip0: .2, tip1: .1 }], [[[147, 46], [147.6, 60], [144, 74]], { w: 1.1, tip0: .2, tip1: .1 }], [[[106, 13.4], [114, 16], [117.4, 26]], { w: .9, tip0: .2, tip1: .1 }],
    [[[157.4, 58], [158, 68], [157, 74]], { w: 1, tip0: .2, tip1: .1 }]], 'paper'));
  k.add(k.brush([[99, 24.4], [106, 25], [113, 24.4]], { w: 1.8, tone: 'spot', tip0: .4, tip1: .4, per: 3 }));
  k.add(k.stipple(70, 102, 60, 7, 8, { size: .8 }));
  return k.svg();
}

// ---------- LSASS Siphon: a segmented leech rearing off the floor, latched onto the credential vault ----------
function leech(key) {
  const k = kit.scene({ key, seed: 204, spot: FLARE });
  // A DC console on the left wall is the torch.
  k.add(k.glow({ x: 22, y: 34, r: [16, 112], a: [-70, 80], clip: { x: 0, y: 0, w: 200, h: 90 }, w: [.15, 2.5], step: 4.8 }));
  k.add(k.glow({ x: 24, y: 90, r: [6, 104], a: [-5, 120], sy: .24, step: 5.4, clip: { x: 0, y: 90, w: 200, h: 22 }, w: [.2, 1.9] }));
  k.add(k.brush([[0, 90.2], [70, 89.6], [140, 90.4], [200, 89.8]], { w: 1.6, tip0: .6, tip1: .6 }));
  k.add(k.fill(k.shape([[-4, 18], [10, 16], [18, 18], [19, 34], [18, 50], [8, 51], [-4, 50]], { wob: .3, tension: .6 })));
  k.add(k.fill(k.shape([[18, 18], [23, 21], [24, 34], [23, 47], [18, 50]], { wob: .2, tension: .6 }), 'paper'), k.staticNoise({ x: 18.5, y: 22, w: 4, h: 24 }, 5, { sw: .5 }));
  k.add(k.tendrils([[[10, 50], [32, 96], { sag: 4, curl: 2, w: 1.5, tip: .4, thorns: 1 }]]));
  // The vault: a round door set in the right wall, bolted, chipped, with a dial.
  k.add(k.fill(k.shape([[142, 92], [140, 30], [156, 14], [204, 8], [204, 92]], { wob: .6, chip: .3, tension: .7 })));
  const door = k.oval(166, 50, 25, 26, { n: 12, lump: .03 });
  k.add(k.fill(door, 'paper', ` stroke="${INK}" stroke-width="2.4"`), k.hatch(door, { a: 60, gap: 2.2, bend: 6, w: [.4, 1.9], broken: .3 }));
  k.add(k.brushes(Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return [[[166 + Math.cos(a) * 21, 50 + Math.sin(a) * 22], [166 + Math.cos(a) * 25, 50 + Math.sin(a) * 26]], { w: 2.6, tip0: 1, tip1: 1, per: 2 }]; })));
  k.add(k.fill(k.oval(163, 50, 8, 8, { n: 9 }), 'paper', ` stroke="${INK}" stroke-width="1.6"`));
  k.add(k.shadow(54, 104, 91, 22, 34, { len: 46, spread: .6, sy: .22 }));
  // The leech: a thick spine from a coil on the floor, rearing up and over, its mouth on the dial.
  const spine = [[60, 90], [74, 84], [86, 66], [93, 40], [107, 22], [124, 24], [138, 36], [150, 48]];
  k.add(k.brush([[52, 92], [70, 93], [88, 90], [100, 92]], { w: 8, tip0: .2, tip1: .6 }));
  k.add(k.brush(spine, { w: 25, w0: 1, w1: .55, tip0: 1, tip1: 1, nib: .06 }));
  // Ring segments: paper bands across the body, following its curve; thicker on the lit side.
  const s = k.sample(spine, false, 3), rings = [];
  for (let i = 3; i < s.length - 2; i += 2) {
    const [x, y] = s[i], [ax, ay] = s[i - 1], [bx, by] = s[i + 1], dx = bx - ax, dy = by - ay, m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m, t = i / s.length, hw = 11 * (1 - t * .45) - 1;
    rings.push([[[x + nx * hw, y + ny * hw], [x + dx / m * 1.8, y + dy / m * 1.8], [x - nx * hw, y - ny * hw]], { w: 1.4, w0: .3, w1: 1, tip0: .1, tip1: .1, per: 4 }]);
  }
  k.add(k.brushes(rings, 'paper'));
  // The sucker: a flared lip of teeth clamped round the dial.
  k.add(k.fill(k.oval(152, 49, 6, 10, { n: 9, rot: -10 })));
  k.add(k.brushes(Array.from({ length: 7 }, (_, i) => { const a = (-70 + i * 23) * Math.PI / 180; return [[[152 + Math.cos(a) * 4, 49 + Math.sin(a) * 8], [155 + Math.cos(a) * 6, 49 + Math.sin(a) * 11]], { w: 1.6, tip0: 1, tip1: .05, per: 2 }]; }), 'paper'));
  // Rim light along the top of the back, toward the console.
  k.add(k.brushes([[[[84, 62], [88, 46], [96, 31], [108, 18.6]], { w: 1.2, tip0: .1, tip1: .1 }], [[[50, 89], [58, 87]], { w: .8, tip0: .2, tip1: .2 }]], 'paper'));
  // Keys drain along its back, from the vault down to a heap on the floor.
  const key1 = (x, y, a) => {
    const P = rot([[x - 3, y], [x + 4, y], [x + 4, y + 1.6]], x, y, a);
    return [[P[0], P[1]], { w: 1.3, tip0: 1, tip1: 1, per: 2 }];
  };
  const keys = [[122, 13, 20], [112, 12, 0], [102, 17, -40], [93, 26, -60], [86, 40, -72], [80, 56, -66], [74, 70, -50], [44, 92, 10], [38, 95, -20], [48, 96, 30]];
  k.add(k.brushes(keys.map(([x, y, a]) => key1(x, y, a)), 'paper'));
  k.add(keys.map(([x, y, a]) => { const [[cx, cy]] = rot([[x - 3.6, y]], x, y, a); return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.5" fill="none" stroke="#F3E9E2" stroke-width=".9"/>`; }).join(''));
  // The bite drips.
  k.add(k.drips(146, 154, 58, 3, { len: [4, 10], w: 1.6 }));
  k.add(eyes([131, 30.4], [136.4, 34.4], 1.6, .9));
  k.add(k.stipple(110, 102, 70, 7, 14, { size: .8 }));
  return k.svg();
}

// ---------- PsExec Swarm: a hydra rooted in a rack-crypt, five cable necks, service-box heads, one cut neck sprouting two ----------
function hydra(key) {
  const k = kit.scene({ key, seed: 205, spot: FLARE });
  // The monitor at bottom right lights the wall; the heads stand against it.
  k.add(k.glow({ x: 176, y: 70, r: [14, 134], a: [130, 300], clip: { x: 0, y: 0, w: 200, h: 90 }, w: [.15, 2.5], step: 4.8 }));
  k.add(k.glow({ x: 172, y: 90, r: [6, 124], a: [0, 180], sy: .24, step: 5.4, clip: { x: 0, y: 90, w: 200, h: 22 }, w: [.2, 1.9] }));
  k.add(k.brush([[0, 90], [70, 89.5], [150, 90.4], [200, 89.8]], { w: 1.6, tip0: .6, tip1: .6 }));
  k.add(k.fill(k.shape([[168, 62], [190, 60], [204, 60], [204, 84], [168, 84]], { wob: .3, tension: .5 })), k.fill(k.shape([[163, 64], [168, 62], [168.5, 74], [168, 84], [163, 81]], { wob: .2, tension: .6 }), 'paper'));
  k.add(k.fill(k.shape([[156, 86], [180, 84], [204, 85], [204, 113], [158, 113]], { wob: .5, tension: .7 })));
  // The rack: a pointed crypt niche the trunk grows out of, with votive LED rows.
  k.add(k.fill(k.shape([[74, 92], [72, 64], [80, 48], [100, 40], [120, 48], [128, 64], [126, 92]], { wob: .5, tension: .8, chip: .4 })));
  k.add(k.brushes([[[[73, 90], [72.6, 64], [80, 48.6], [100, 40.6], [120, 48.6], [127.4, 64], [127, 90]], { w: 1, tip0: .1, tip1: .1, per: 4 }]], 'paper'));
  k.add(`<path d="${[56, 62, 68, 74, 80, 86].map(y => `M80 ${y}h.1M84 ${y}h.1M116 ${y}h.1M120 ${y}h.1`).join('')}" stroke="#F3E9E2" stroke-width="1.2"/>`);
  k.add(k.shadow(76, 126, 91, 176, 70, { len: 60, spread: .6, sy: .2 }));
  // The trunk and the necks: tapered cable brushes with paper gaps, rooted into the rack and floor.
  k.add(k.tendrils([[[90, 88], [62, 98], { sag: 4, curl: 2, w: 3, tip: .3, thorns: 1 }], [[110, 88], [142, 100], { sag: 4, curl: 2, w: 3, tip: .3, thorns: 1 }]]));
  k.add(k.brush([[100, 92], [100, 78], [100, 64]], { w: 16, tip0: 1, tip1: 1 }));
  const necks = [[[94, 68], [80, 66], [70, 54], [58, 52], [48, 42]], [[97, 64], [84, 52], [88, 38], [78, 28], [72, 18]], [[100, 64], [106, 48], [96, 34], [104, 22], [101, 12]], [[103, 64], [118, 54], [116, 40], [126, 32], [132, 20]], [[106, 68], [120, 66], [130, 58], [140, 54]]];
  necks.forEach(n => k.add(k.brush(n, { w: 10.4, w0: 1, w1: .7, tone: 'paper', tip0: 1, tip1: 1 })));
  k.add(k.brushes(necks.map(n => [n, { w: 7.6, w0: 1, w1: .7, tip0: 1, tip1: 1 }])));
  // The cut neck: a raw stump dripping, with two new heads sprouting from it.
  k.add(k.fill(k.oval(141, 54, 2.4, 4, { n: 7 }), 'paper', ` stroke="${INK}" stroke-width=".8"`), k.drips(136, 142, 58, 3, { len: [3, 7], w: 1.6 }));
  const sprouts = [[[138, 52], [146, 42], [152, 36]], [[138, 57], [148, 62], [156, 62]]];
  k.add(k.brushes(sprouts.map(p => [p, { w: 5.4, tone: 'paper', tip0: 1, tip1: 1 }]), 'paper'), k.brushes(sprouts.map(p => [p, { w: 3.6, tip0: 1, tip1: 1 }])));
  // Heads: blunt service-box skulls with a jaw, each with a paper rim and one flare LED eye.
  const head = (x, y, s, a) => {
    const P = (pts) => rot(pts.map(([px, py]) => [x + px * s, y + py * s]), x, y, a);
    let o = k.fill(k.shape(P([[-6, -4], [0, -5.6], [9, -4.6], [12, -1.4], [11, 1.8], [3, 3], [-5, 4.6], [-7, 0]]), { wob: .2, tension: .8 }), 'ink', ` stroke="#F3E9E2" stroke-width=".9"`);
    o += k.fill(k.shape(P([[-2, 4.2], [5, 3], [10, 2.6], [8, 5.4], [0, 7.2]]), { wob: .2, tension: .7 }));
    o += k.brushes([[P([[2, 3.4], [2.6, 5.6]]), { w: 1, tip0: 1, tip1: .05, per: 2 }], [P([[6, 2.8], [6.4, 4.8]]), { w: 1, tip0: 1, tip1: .05, per: 2 }]], 'paper');
    const [[ex, ey]] = P([[1.6, -1.4]]);
    return o + `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(1.5 * s).toFixed(1)}" fill="${FLARE}"/>`;
  };
  k.add(head(46, 40, 1.25, 205), head(71, 16, 1.25, 245), head(101, 10, 1.3, 275), head(133, 18, 1.25, -50), head(155, 34, .9, -35), head(159, 62, .9, 15));
  k.add(k.brushes([[[[91, 90], [92.6, 78], [96, 68]], { w: 1, tip0: .2, tip1: .1 }]], 'paper'));
  k.add(k.stipple(100, 102, 80, 7, 14, { size: .8 }));
  return k.svg();
}

// ---------- Golden Ticket Ghost: an empty royal mantle hovering at the turnstile, a forged ticket on its lanyard ----------
function specter(key) {
  const k = kit.scene({ key, seed: 206, spot: FLARE });
  // The guard's monitor on the left is the torch.
  k.add(k.glow({ x: 24, y: 58, r: [14, 132], a: [-90, 60], clip: { x: 0, y: 0, w: 200, h: 90 }, w: [.15, 2.5], step: 4.8 }));
  k.add(k.glow({ x: 26, y: 90, r: [6, 124], a: [-5, 140], sy: .24, step: 5.4, clip: { x: 0, y: 90, w: 200, h: 22 }, w: [.2, 1.9] }));
  k.add(k.brush([[0, 90.2], [70, 89.6], [140, 90.4], [200, 89.8]], { w: 1.6, tip0: .6, tip1: .6 }));
  k.add(k.fill(k.shape([[-4, 70], [16, 68], [34, 71], [36, 92], [34, 113], [-4, 113]], { wob: .5, tension: .7 })));
  k.add(k.fill(k.shape([[-4, 46], [12, 44], [20, 44], [21, 56], [20, 68], [8, 69], [-4, 68]], { wob: .3, tension: .5 })), k.fill(k.shape([[20, 44], [25, 47], [26, 57], [25, 66], [20, 68]], { wob: .2, tension: .6 }), 'paper'));
  // The keep gate: a pointed arch behind, its portcullis raised, the teeth hanging.
  k.add(k.fill(k.shape([[154, 92], [154, 36], [144, 16], [118, 2], [100, 0], [80, 3], [56, 18], [48, 40], [48, 92], [42, 92], [40, 30], [70, -6], [140, -6], [162, 30], [162, 92]], { wob: .5, tension: .8, chip: .2 })));
  k.add(k.brushes([60, 72, 84, 116, 128, 140].map(x => [[[x, 2], [x + k.r(.5), 10], [x, 15]], { w: 2.2, tip0: 1, tip1: .02 }])));
  k.add(k.brushes([[[[50, 10], [70, 7], [88, 6]], { w: 2.4, tip0: .5, tip1: .3 }], [[[112, 6], [130, 7], [150, 10]], { w: 2.4, tip0: .3, tip1: .5 }]]));
  // The turnstile: a post with a reader and three bent arms.
  k.add(k.shadow(112, 132, 91, 24, 58, { len: 40, spread: .4, sy: .2 }));
  k.add(k.fill(k.shape([[114, 92], [113, 66], [116, 60], [126, 60], [129, 66], [128, 92]], { wob: .3, tension: .6 })));
  k.add(k.brushes([[[[114, 68], [104, 70], [92, 72]], { w: 2.8, tip0: 1, tip1: .8 }], [[[118, 70], [108, 78], [102, 86]], { w: 2.6, tip0: 1, tip1: .8 }], [[[126, 68], [134, 74], [140, 82]], { w: 2.6, tip0: 1, tip1: .8 }]]));
  k.add(k.brush([[116, 62.4], [126, 62.4]], { w: 1.2, tone: 'paper', tip0: .4, tip1: .4, per: 2 }));
  // Smoke where its legs should be, pouring through the turnstile and pooling on the floor.
  k.add(k.brushes([[[[92, 60], [96, 74], [92, 84], [80, 92], [68, 94]], { w: 5, tip0: 1, tip1: .05 }], [[[104, 62], [104, 76], [110, 86], [124, 94], [138, 95]], { w: 4.4, tip0: 1, tip1: .05 }], [[[98, 62], [100, 78], [98, 92]], { w: 3, tip0: 1, tip1: .1 }]]));
  // The mantle: a stiff high-collared royal cloak with nobody in it. The lit wall shows through the hollow.
  const mantle = k.shape([[82, 26], [90, 18], [110, 18], [118, 26], [126, 36], [130, 52], [124, 58], [118, 54], [112, 62], [104, 56], [96, 62], [88, 54], [80, 58], [72, 52], [74, 36]], { wob: .5 });
  k.add(k.fill(mantle), k.drips(76, 126, 56, 5, { len: [3, 9], w: 2 }));
  const hollow = k.shape([[90, 26], [100, 23], [110, 26], [112, 40], [106, 52], [100, 54], [94, 52], [88, 40]], { wob: .3 });
  k.add(k.fill(hollow, 'paper'), k.hatch(hollow, { a: 90, gap: 2, bend: 4, w: [1.6, .3], broken: .3 }));
  // Ermine flecks on the mantle, a rim of the guard light down its left edge.
  k.add(k.stipple(82, 42, 5, 10, 10, { size: 1, bias: .5 }), k.stipple(120, 42, 5, 10, 10, { size: 1, bias: .5 }));
  k.add(k.brushes([[[[89, 18.6], [82, 26], [74.6, 36], [72.6, 52]], { w: 1.2, tip0: .1, tip1: .1 }]], 'paper'));
  // A standing collar fans up round an empty neck: ink ribs on paper, a void inside it, the eyes hanging there.
  const fan = k.shape([[86, 27], [78, 14], [84, 6], [100, 3], [116, 6], [122, 14], [114, 27], [100, 24]], { wob: .3, tension: .8 });
  k.add(k.fill(fan, 'paper', ` stroke="${INK}" stroke-width="1.4"`));
  k.add(k.brushes([[80, 13], [84, 7], [92, 4.4], [100, 3.6], [108, 4.4], [116, 7], [120, 13]].map(([x, y]) => [[[100 + (x - 100) * .45, 24], [x, y]], { w: 1.5, tip0: 1, tip1: .2, per: 2 }])));
  k.add(k.fill(k.shape([[90, 25], [91, 14], [100, 10], [109, 14], [110, 25], [100, 27]], { wob: .3 })));
  // The crown floats above the void, slightly askew.
  k.add(k.fill(k.shape(rot([[91, 9], [92, 1], [96, 5], [100, -1], [104, 5], [108, 1], [109, 9], [100, 10.4]], 100, 5, 6), { wob: .2, tension: .5 }), 'paper', ` stroke="${INK}" stroke-width="1"`));
  k.add(eyes([96.6, 17.4], [103.4, 17.4], 1.6, .95));
  // The lanyard: a loop round the neck nobody has, the forged ticket hanging in the hollow, and offset copies.
  k.add(k.brush([[93, 27], [96, 36], [100, 40], [104, 36], [107, 27]], { w: 1.2, tip0: .3, tip1: .3 }));
  [[-5, -3], [5, -2]].forEach(([dx, dy]) => k.add(k.fill(k.shape(soft(92 + dx, 39 + dy, 16, 11, 1.4), { wob: .2, tension: .9 }), 'none', ` stroke="${INK}" stroke-width=".7" stroke-dasharray="2 1.6"`)));
  const tkt = k.shape(soft(92, 39, 16, 11, 1.6), { wob: .2, tension: .9 });
  k.add(k.fill(tkt, 'paper', ` stroke="${INK}" stroke-width="1.2"`), k.brushes([[[[95, 42.6], [102, 42.4]], { w: 1, per: 2, tip0: .5, tip1: .5 }], [[[95, 46], [99, 45.8]], { w: 1, per: 2, tip0: .5, tip1: .5 }]]));
  k.add(`<circle cx="104.4" cy="46.2" r="2.4" fill="${FLARE}" stroke="${INK}" stroke-width=".7"/>`, k.brush([[103, 44.4], [104.6, 46.4], [105.6, 48.4]], { w: .7, tip0: .5, tip1: .5, per: 2 }));
    k.add(k.stipple(110, 102, 70, 7, 14, { size: .8 }));
  return k.svg();
}

// ---------- Exfil Courier: a young wyrm hauling the 40 GB parcel; its shadow on the wall is already full-grown ----------
function wyrmling(key) {
  const k = kit.scene({ key, seed: 207, spot: FLARE });
  // The transfer monitor low on the left is the torch: it throws the wyrm's shadow huge up the wall.
  k.add(k.glow({ x: 18, y: 70, r: [14, 150], a: [-80, 20], clip: { x: 0, y: 0, w: 200, h: 90 }, w: [.15, 2.4], step: 5 }));
  k.add(k.glow({ x: 22, y: 90, r: [6, 130], a: [-5, 100], sy: .24, step: 5.4, clip: { x: 0, y: 90, w: 200, h: 22 }, w: [.2, 1.9] }));
  k.add(k.brush([[0, 90.2], [70, 89.6], [140, 90.4], [200, 89.8]], { w: 1.6, tip0: .6, tip1: .6 }));
  k.add(k.fill(k.shape([[-4, 80], [16, 78], [30, 81], [32, 96], [30, 113], [-4, 113]], { wob: .5, tension: .7 })));
  k.add(k.fill(k.shape([[-4, 60], [8, 58], [16, 59], [17, 69], [16, 79], [6, 80], [-4, 79]], { wob: .3, tension: .5 })), k.fill(k.shape([[16, 59], [21, 62], [22, 69], [21, 76], [16, 79]], { wob: .2, tension: .6 }), 'paper'));
  k.add(k.brushes([[[[17.6, 64], [19.4, 64]], { w: 1.3, per: 2 }], [[[17.6, 68], [20.2, 68]], { w: 1.3, per: 2 }], [[[17.6, 72], [18.6, 72]], { w: 1.3, per: 2 }]]));
  // The grown wyrm's shadow on the lit wall: wings up, jaws open on the bucket.
  const sh = k.shape([[86, 90], [80, 62], [64, 34], [66, 12], [74, 22], [80, 4], [88, 16], [96, 4], [104, 30], [114, 46], [122, 36], [128, 26], [136, 20], [148, 17], [162, 22], [150, 27], [160, 33], [146, 34], [138, 40], [134, 52], [142, 66], [160, 72], [180, 70], [168, 78], [146, 84], [136, 90]], { wob: .8, tension: .8 });
  k.add(k.fill(sh), k.drips(70, 100, 50, 3, { len: [3, 9], w: 1.6 }));
  // The cloud bucket, hanging from a cable out of the dark ceiling, just past the shadow's jaws.
  k.add(k.tendril([176, -2], [176, 31], { sag: 0, curl: 1.5, w: 1.2, tip: .7, segs: 3 }));
  const bk = k.shape([[167, 36], [185, 36], [183, 51], [179, 53], [173, 53], [169, 51]], { wob: .3, tension: .7 });
  k.add(k.fill(bk, 'paper', ` stroke="${INK}" stroke-width="1.6"`), k.hatch(bk, { a: 90, gap: 1.8, bend: 2, w: [.3, 1.4], broken: .3 }), k.brush([[167, 36], [176, 30], [185, 36]], { w: 1, tip0: .5, tip1: .5 }));
  // The courier: an S of a body from a patch cable plugged in at the left, up to a wedge head.
  k.add(k.tendril([22, 86], [48, 90], { sag: 3, curl: 1, w: 2, tip: 1, segs: 3 }));
  k.add(k.shadow(50, 100, 91, 18, 70, { len: 30, spread: .4, sy: .2 }));
  const body = [[46, 90], [64, 92], [82, 86], [92, 74], [100, 60], [110, 50], [120, 44]];
  k.add(k.brush(body, { w: 17.4, w0: .45, w1: .9, tone: 'paper', tip0: .3, tip1: 1, nib: .04 }), k.brush(body, { w: 14, w0: .45, w1: .9, tip0: .2, tip1: 1, nib: .06 }));
  // Spine ridge: small barbs along the top, and a paper rim on the lit side.
  const s = k.sample(body, false, 3);
  k.add(k.brushes(s.filter((_, i) => i > 3 && i < s.length - 2 && i % 2 === 0).map(([x, y], i) => [[[x - 1, y - 4], [x - 3, y - 8]], { w: 1.8, tip0: 1, tip1: .02, per: 2 }])));
  k.add(k.brushes([[[[48, 87.6], [64, 88.4], [80, 82.6], [89, 71]], { w: .9, tip0: .1, tip1: .1 }]], 'paper'));
  // Young wings, folded half-open.
  k.add(k.fill(k.shape([[104, 54], [108, 40], [100, 30], [114, 35], [119, 28], [121, 42], [112, 52]], { wob: .3, tension: .7 }), 'ink', ' stroke="#F3E9E2" stroke-width=".9"'), k.brush([[102, 32], [110, 37], [114, 47]], { w: .8, tone: 'paper', tip0: .2, tip1: .2 }));
  // The parcel on its back: a bound bundle, hatched mid-tone, strapped round its body, with a flare tag.
  const pk = k.shape(rot([[74, 62], [92, 60], [94, 72], [90, 78], [74, 79], [71, 70]], 84, 70, -18), { wob: .4, tension: .7 });
  k.add(k.fill(pk, 'paper', ` stroke="${INK}" stroke-width="1.4"`), k.hatch(pk, { a: 55, gap: 2.2, bend: 3, w: [.3, 1.6], broken: .3 }));
  k.add(k.brushes([[rot([[83, 59], [84, 70], [83, 80]], 84, 70, -18), { w: 2.2, tip0: 1, tip1: 1 }], [rot([[71, 70], [83, 69], [95, 67]], 84, 70, -18), { w: 2, tip0: 1, tip1: 1 }]]));
  k.add(k.fill(k.shape([[70, 58], [76, 57], [77, 61], [71, 62]], { wob: .1, tension: .6 }), 'spot', ` stroke="${INK}" stroke-width=".8"`), k.brush([[76, 57.6], [80, 60]], { w: .7, per: 2 }));
  // The head: a plain wedge, rim-lit, eyes forward toward the bucket.
  k.add(k.fill(k.shape([[112, 42], [121, 36.6], [134, 38.6], [142, 43], [133, 48], [119, 51]], { wob: .3, tension: .7 }), 'ink', ' stroke="#F3E9E2" stroke-width="1.2"'));
  k.add(k.brushes([[[[115, 41.4], [122, 37.6], [133, 39.4]], { w: .9, tip0: .2, tip1: .1 }]], 'paper'));
  k.add(eyes([126, 41.6], [130, 42.2], 1.4, .8));
  k.add(k.stipple(110, 102, 70, 7, 14, { size: .8 }));
  return k.svg();
}

const out = { art: { imp: imp('imp'), mimic: mimic('mimic'), ogre: ogre('ogre'), leech: leech('leech'), hydra: hydra('hydra'), specter: specter('specter'), wyrmling: wyrmling('wyrmling') }, print: {} };
fs.writeFileSync(path.join(__dirname, 'ink-art.json'), JSON.stringify(out, null, 1) + '\n');
console.log(Object.fromEntries(Object.entries(out.art).map(([k, v]) => [k, +(v.length / 1024).toFixed(1)])));
module.exports = out;
