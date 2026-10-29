// Batch BOSSES: the Lockjaw Syndicate, the Rogue AI, the three win scenes, the title hero and the print card back.
// Drawn with the lead's ink-kit. Writes ink-art.json: { art: {...}, print: {...} } keyed as data/art.json.
// Usage: node scenes.js
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../ink-kit');
const { FLARE, CYAN, INK, soft, rot } = kit;
const SMALL = { w: 200, h: 112 };
const f1 = n => (Math.round(n * 10) / 10).toString();

// ---------- helpers ----------
// Seven-segment digits as brush strokes: an ink stroke under a spot stroke, so the shape survives greyscale.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function countdown(k, text, x, y, dw, dh, { ink = 3.4, spot = 1.6, sl = 1.6 } = {}) {
  const segs = [], dots = [];
  let cx = x;
  for (const ch of text) {
    if (ch === ':') { dots.push([cx + 1.6, y + dh * .3], [cx + 1.2, y + dh * .72]); cx += 5.5; continue; }
    const P = (u, v) => [cx + u * dw + (1 - v) * sl, y + v * dh], m = .14;
    const S = { a: [P(m, 0), P(1 - m, 0)], b: [P(1, m), P(1, .5 - m)], c: [P(1, .5 + m), P(1, 1 - m)], d: [P(m, 1), P(1 - m, 1)], e: [P(0, .5 + m), P(0, 1 - m)], f: [P(0, m), P(0, .5 - m)], g: [P(m, .5), P(1 - m, .5)] };
    for (const s of SEG[ch]) segs.push(S[s]);
    cx += dw + 3.4;
  }
  const d = segs.map(([a, b]) => `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`).join('') + dots.map(([a, b]) => `M${f1(a)} ${f1(b)}h.1`).join('');
  return `<path d="${d}" stroke="${INK}" stroke-width="${ink}"/><path d="${d}" stroke="${k.colour('spot')}" stroke-width="${spot}"/>`;
}
// Scales along a body curve: small paper arcs on one side of the path (the side facing the light), as one stroked path.
function scales(k, pts, { off = 6, every = 2, side = 1, size = 2.2, w = .8, from = .1, to = .9 } = {}) {
  const s = kit.sample(pts, false, -3); let d = '';
  for (let i = 1; i < s.length - 1; i += every) {
    const t = i / (s.length - 1); if (t < from || t > to) continue;
    const a = s[i - 1], b = s[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, nx = -uy * side, ny = ux * side;
    const o = typeof off === 'function' ? off(t) : off, c = [s[i][0] + nx * o, s[i][1] + ny * o];
    d += `M${f1(c[0] - ux * size)} ${f1(c[1] - uy * size)}Q${f1(c[0] - nx * size * 1.4)} ${f1(c[1] - ny * size * 1.4)} ${f1(c[0] + ux * size)} ${f1(c[1] + uy * size)}`;
  }
  return `<path d="${d}" fill="none" stroke="${k.colour('paper')}" stroke-width="${w}"/>`;
}
// Spines along a body curve: tapered barbs on one side.
function spines(k, pts, { off = 6, every = 3, side = -1, len = 5, w = 2.4, from = .1, to = .9, lean = .6 } = {}) {
  const s = kit.sample(pts, false, -3), out = [];
  for (let i = 1; i < s.length - 1; i += every) {
    const t = i / (s.length - 1); if (t < from || t > to) continue;
    const a = s[i - 1], b = s[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, nx = -uy * side, ny = ux * side;
    const o = typeof off === 'function' ? off(t) : off, L = typeof len === 'function' ? len(t) : len, c = [s[i][0] + nx * (o - 1), s[i][1] + ny * (o - 1)];
    out.push([[c, [c[0] + nx * L - ux * L * lean, c[1] + ny * L - uy * L * lean]], { w, tip0: 1, tip1: .02, per: 3 }]);
  }
  return out;
}
// The points of a sagging, wriggling cable from a to b (as the kit's tendril builds them), for drawing twice.
function cablePts(k, a, b, { sag = 8, curl = 3, segs = 4 } = {}) {
  const p = [a];
  for (let i = 1; i < segs; i++) { const t = i / segs, nx = -(b[1] - a[1]), ny = b[0] - a[0], m = Math.hypot(nx, ny) || 1, c = Math.sin(t * Math.PI) * sag, wig = k.r(curl); p.push([a[0] + (b[0] - a[0]) * t + nx / m * wig, a[1] + (b[1] - a[1]) * t + c + ny / m * wig]); }
  return p.concat([b]);
}
// A lancet window: ink frame, then either the night (ink, paper rain, a paper keyline) or dawn (paper, ink mullions, easing rain, a skyline).
function lancet(k, cx, top, bot, hw, dawn) {
  const outer = k.shape([[cx - hw - 4, bot + 3], [cx - hw - 4, (top + bot) / 2], [cx - hw - 4, top + hw * 1.1], [cx - hw * .62, top + hw * .3], [cx, top - 5], [cx, top - 5], [cx + hw * .62, top + hw * .3], [cx + hw + 4, top + hw * 1.1], [cx + hw + 4, (top + bot) / 2], [cx + hw + 4, bot + 3]], { wob: .5, tension: .8 });
  const inner = k.shape([[cx - hw, bot], [cx - hw, (top + bot) / 2], [cx - hw, top + hw * 1.2], [cx - hw * .58, top + hw * .42], [cx, top], [cx, top], [cx + hw * .58, top + hw * .42], [cx + hw, top + hw * 1.2], [cx + hw, (top + bot) / 2], [cx + hw, bot]], { wob: .3, tension: .8 });
  let g = k.fill(outer);
  if (dawn) {
    g += k.fill(inner, 'paper');
    const sky = [[cx - hw, bot - 9], [cx - hw * .6, bot - 12], [cx - hw * .4, bot - 8], [cx - hw * .1, bot - 15], [cx + hw * .15, bot - 10], [cx + hw * .5, bot - 13], [cx + hw, bot - 9], [cx + hw, bot + .5], [cx - hw, bot + .5]];
    g += k.fill(k.shape(sky, { wob: .4, tension: .5 }));
    g += k.rain({ x: cx - hw + 2, y: top + 8, w: hw * 2 - 6, h: bot - top - 26 }, 5, { tone: 'ink', sw: .5, op: 1, len: [3, 6] });
    g += k.brushes([[[[cx, top + 1], [cx + k.r(.6), (top + bot) / 2], [cx, bot]], { w: 1.8, tip0: .7, tip1: 1 }], [[[cx - hw, top + (bot - top) * .45], [cx, top + (bot - top) * .44], [cx + hw, top + (bot - top) * .45]], { w: 1.6, tip0: 1, tip1: 1 }]]);
  } else {
    g += k.rain({ x: cx - hw + 1, y: top + 4, w: hw * 2 - 3, h: bot - top - 6 }, 9, { tone: 'paper', sw: .45, op: .8, len: [4, 9] });
    g += k.brush([[cx - hw + .6, bot - 1], [cx - hw + .6, top + hw * 1.2], [cx - hw * .56, top + hw * .44], [cx, top + .8], [cx + hw * .56, top + hw * .44], [cx + hw - .6, top + hw * 1.2], [cx + hw - .6, bot - 1]], { w: .8, tone: 'paper', tip0: .2, tip1: .2, per: 3 });
  }
  return g;
}
// A pointed niche in a rack wall: ink arch, a paper rim on the lit edge, a column of LED votives.
function niche(k, x, top, bot, w, { lit = 1, leds = 4, ledTone = 'paper' } = {}) {
  const s = k.shape([[x, bot], [x, top + w * .9], [x + w * .18, top + w * .4], [x + w * .5, top], [x + w * .5, top], [x + w * .82, top + w * .4], [x + w, top + w * .9], [x + w, bot]], { wob: .4, tension: .75 });
  // The lit edge: one tapered paper stroke up the side that faces the light.
  const e = lit > 0 ? x + w - .5 : x + .5, pk = x + w * .5;
  let g = k.fill(s) + k.brush([[e, bot - 2], [e, top + w * .9], [lit > 0 ? x + w * .8 : x + w * .2, top + w * .42], [pk, top + .8]], { w: 1.1, tone: 'paper', tip0: .3, tip1: .05, per: 3 });
  let d = '';
  for (let i = 0; i < leds; i++) d += `M${f1(x + w * .3)} ${f1(top + w * .9 + i * (bot - top - w) / leds)}h${f1(w * .25)}`;
  return g + `<path d="${d}" stroke="${ledTone === 'cyan' ? CYAN : k.colour('paper')}" stroke-width="${ledTone === 'cyan' ? 1.4 : 1.1}"/>`;
}

// ---------- The Lockjaw Syndicate: a wyrm of chain and cable coiled round the ransom altar ----------
function wyrm(key, { view, win = false } = {}) {
  const k = kit.scene({ key, w: 400, h: 170, seed: win ? 71 : 61, spot: win ? CYAN : FLARE });
  const FY = 134;
  // The ransom screen is the torch: engraved light up the crypt wall and out across the flagstones.
  k.add(k.glow({ x: 200, y: 82, r: [40, win ? 172 : 188], a: [0, 360], sy: .74, step: 5, clip: { x: 0, y: 0, w: 400, h: FY }, w: [.5, 3.2] }));
  k.add(k.glow({ x: 200, y: FY - 2, r: [12, 204], a: [0, 180], sy: .2, step: 7, clip: { x: 0, y: FY, w: 400, h: 40 }, w: [.2, 2.1] }));
  // Lancet windows high in the outer walls: night and rain, or dawn.
  k.add(lancet(k, 58, 22, 104, 15, win), lancet(k, 342, 22, 104, 15, win));
  if (win) {
    // Dawn shafts across the floor from the windows.
    k.add(k.glow({ x: 58, y: 104, r: [6, 90], a: [10, 80], sy: .5, step: 4.4, clip: { x: 0, y: FY, w: 400, h: 40 }, w: [.2, 1.8] }));
    k.add(k.glow({ x: 342, y: 104, r: [6, 90], a: [100, 170], sy: .5, step: 4.4, clip: { x: 0, y: FY, w: 400, h: 40 }, w: [.2, 1.8] }));
  }
  // Pillars leaning in from the low camera.
  k.add(k.fill(k.shape([[-6, -6], [26, -6], [22, 70], [16, 176], [-6, 176]], { wob: .5, tension: .6 })), k.fill(k.shape([[374, -6], [406, -6], [406, 176], [384, 176], [378, 70]], { wob: .5, tension: .6 })));
  // The rack crypt: pointed niches either side of the altar, locked, chains slung between them.
  k.add(niche(k, 96, 30, FY, 20, { lit: 1, leds: 5, ledTone: win ? 'cyan' : 'paper' }), niche(k, 122, 40, FY, 16, { lit: 1, leds: 4, ledTone: win ? 'cyan' : 'paper' }));
  k.add(niche(k, 262, 40, FY, 16, { lit: -1, leds: 4, ledTone: win ? 'cyan' : 'paper' }), niche(k, 284, 30, FY, 20, { lit: -1, leds: 5, ledTone: win ? 'cyan' : 'paper' }));
  k.add(k.brush([[-2, FY], [100, FY - .6], [200, FY + .4], [300, FY - .5], [402, FY]], { w: 1.8, tip0: .6, tip1: .6 }));
  if (!win) k.add(k.tendrils([[[98, 58], [156, 64], { sag: 12, curl: 1, w: 1.6, tip: .7, thorns: 2, segs: 5 }], [[302, 58], [244, 64], { sag: 12, curl: 1, w: 1.6, tip: .7, thorns: 2, segs: 5 }]]));
  // The altar: a slab desk with drips, and the ransom monitor on it.
  k.add(k.fill(k.shape([[118, 114], [200, 111], [282, 114], [286, 124], [280, FY + 1], [200, FY + 2], [120, FY + 1], [114, 124]], { wob: .6, tension: .7, chip: .25 })));
  k.add(k.brush([[120, 113.4], [200, 110.6], [280, 113.4]], { w: 1.3, tone: 'paper', tip0: .2, tip1: .2 }), k.drips(124, 278, 116, 7, { len: [3, 10], w: 1.5, tone: 'paper' }));
  k.add(k.fill(k.shape([[191, 104], [209, 104], [214, 113], [186, 113]], { wob: .3, tension: .5 })));
  k.add(k.fill(k.shape([[146, 42], [200, 39], [254, 42], [257, 72], [254, 105], [200, 107], [146, 105], [143, 72]], { wob: .5, tension: .6 })));
  const scr = k.shape([[151, 47.5], [200, 45], [249, 47.5], [251, 72], [249, 100], [200, 102], [151, 100], [149, 72]], { wob: .3, tension: .6 });
  k.add(k.fill(scr, 'paper'));
  if (!win) {
    // The note: a header bar, the countdown in flare over an ink keyline, a progress bar draining.
    k.add(k.brushes([[[[194, 53], [220, 52.6], [244, 53]], { w: 3.4, tip0: .5, tip1: .5 }], [[[194, 59], [226, 58.8]], { w: 1.2, tip0: .5, tip1: .2 }]]));
    k.add(countdown(k, '47:59:58', 164, 67, 8.2, 17, { ink: 4, spot: 2 }));
    k.add(k.fill(k.shape(soft(160, 90, 80, 5, 1.6), { wob: .2, tension: .9 }), 'paper', ` stroke="${INK}" stroke-width="1"`), k.brush([[162, 92.5], [214, 92.5]], { w: 2.6, tip0: 1, tip1: .3, per: 4 }));
    k.add(k.staticNoise({ x: 152, y: 48, w: 96, h: 50 }, 6, { sw: .6 }));
  } else {
    // The clock stopped at zero, the shield check in cyan over an ink keyline, the progress bar full.
    k.add(k.brush([[156, 53], [200, 52.4], [244, 53]], { w: 4, tip0: .5, tip1: .5 }));
    const chk = [[183, 66], [192, 74], [214, 58]];
    k.add(k.brush(chk, { w: 6.4, tip0: .7, tip1: .5, per: 3 }), k.brush(chk, { w: 3, tip0: .7, tip1: .5, per: 3, tone: 'spot' }));
    k.add(countdown(k, '00:00:00', 165, 80, 6.6, 9.5, { ink: 3, spot: 1.4 }));
    k.add(k.fill(k.shape(soft(160, 94, 80, 4.4, 1.5), { wob: .2, tension: .9 })));
    k.add(k.brush([[162, 96.2], [238, 96.2]], { w: 1.9, tone: 'spot', tip0: 1, tip1: 1, per: 6 }));
  }
  // Cables root from the altar into the floor.
  k.add(k.tendrils([[[150, 128], [96, 150], { sag: 6, curl: 2, w: 2, tip: .4, thorns: 1 }], [[252, 128], [316, 152], { sag: 6, curl: 2, w: 2, tip: .4, thorns: 1 }], [[200, 132], [214, 166], { sag: 4, curl: 3, w: 1.6, tip: .3 }]]));
  if (!win) {
    // The tail: risen from behind the altar, curling up the left niches, ending in a key-bit barb.
    const tail = [[150, 122], [128, 112], [112, 92], [108, 70], [116, 52], [128, 46]];
    k.add(k.brush(tail, { w: 14, w0: 1, w1: .4, tip0: 1, tip1: .5, tone: 'paper' }), k.brush(tail, { w: 10, w0: 1, w1: .25, tip0: 1, tip1: .3 }));
    k.add(scales(k, tail, { off: t => 4.4 - t * 3, every: 3, side: -1, size: 1.6, w: .7, from: .12, to: .85 }));
    k.add(k.fill(k.shape([[127, 42], [136, 40], [138, 46], [134, 48], [136, 52], [130, 51], [127, 48]], { wob: .2, tension: .4 })));
    // Its shadow, down the flagstones toward the viewer.
    k.add(k.shadow(130, 270, 156, 200, 82, { len: 26, spread: .7, sy: .5 }));
    // The coil: in from the left, across the altar's foot, up the right side, over the screen to the head.
    // A paper gap under it separates it from the racks and the dark floor.
    const body = [[-14, 160], [40, 154], [100, 150], [160, 152], [222, 152], [272, 144], [298, 120], [302, 88], [290, 56], [266, 34], [246, 24], [232, 20]];
    k.add(k.brush(body, { w: 28, w0: 1, w1: .6, tip0: 1, tip1: 1, tone: 'paper' }), k.brush(body, { w: 23, w0: 1, w1: .55, tip0: 1, tip1: 1 }));
    k.add(scales(k, body, { off: t => 7.6 - t * 3.2, every: 3, side: 1, size: 2.6, w: 1, from: .05, to: .96 }));
    k.add(k.brushes(spines(k, body, { off: t => 11.6 - t * 4.6, every: 4, side: -1, len: t => 8 - t * 3, w: 3, from: .08, to: .96, lean: .7 })));
    // The head in profile, reared over the screen, its jaw biting the bezel, a padlock hung from its teeth. Horns swept back.
    const H = pts => pts.map(([x, y]) => [200 + (x - 200) * 1.35, 24 + (y - 24) * 1.35]);
    k.add(k.brushes([[H([[214, 17], [228, 6], [246, 2]]), { w: 6, tip0: 1, tip1: .02 }], [H([[210, 15], [218, 3], [230, -4]]), { w: 4.4, tip0: 1, tip1: .02 }], [H([[220, 26], [236, 26], [250, 31]]), { w: 4, tip0: 1, tip1: .02 }]]));
    const head = k.shape(H([[226, 18], [214, 11], [198, 10.5], [182, 14], [168, 18], [163, 22], [170, 25], [188, 25.4], [204, 27], [218, 33], [226, 28]]), { wob: .4 });
    const jaw = k.shape(H([[218, 32], [204, 34], [188, 38.5], [174, 43.5], [170, 42], [180, 35.5], [196, 31], [210, 29]]), { wob: .3 });
    k.add(k.fill(head), k.fill(jaw));
    k.add(k.brushes([[H([[166, 18.6], [182, 13.2], [198, 9.8], [214, 10.6]]), { w: 1.5, tip0: .1, tip1: .2 }], [H([[173, 43], [186, 39], [204, 34.8]]), { w: 1.1, tip0: .2, tip1: .1 }]], 'paper'));
    // Teeth: paper fangs down from the upper jaw and up from the lower.
    const T = [];
    for (let i = 0; i < 6; i++) { const x = 168 + i * 6.2; T.push([H([[x, 24.6 + i * .2], [x + .6, 28.4 + i * .3]]), { w: 1.9, tip0: 1, tip1: .02, per: 2 }]); }
    for (let i = 0; i < 5; i++) { const x = 176 + i * 6.4, y = 40.6 - i * 1.6; T.push([H([[x, y], [x + .4, y - 3.2]]), { w: 1.8, tip0: 1, tip1: .02, per: 2 }]); }
    k.add(k.brushes(T, 'paper'));
    // The padlock on a short chain from the jaw, over the note's corner.
    k.add(k.brush([[181, 41.5], [180, 44]], { w: 1.6, tip0: 1, tip1: 1, per: 2 }));
    k.add(k.brush([[173.6, 52], [173.4, 47.4], [179, 44], [184.6, 47.4], [184.8, 52]], { w: 2.6, tip0: 1, tip1: 1, per: 3 }));
    k.add(k.fill(k.shape(soft(170.5, 50.5, 17, 12, 2.6), { wob: .3, tension: .9 })), k.fill(k.oval(179, 55, 1.7, 1.7, { n: 6 }), 'paper'), k.brush([[179, 56], [179, 59.4]], { w: 1.4, tip0: 1, tip1: .3, tone: 'paper', per: 2 }));
    // Smoke off its back; the eye.
    k.add(k.smoke(256, 28, 20, { n: 1, sway: 6, w: 1.8, tone: 'ink' }));
    k.add(`<ellipse cx="204.9" cy="13.4" rx="3.3" ry="1.6" fill="${FLARE}" transform="rotate(-8 204.9 13.4)"/>`);
  } else {
    // What it left: slack chains across the floor and the padlock, sprung open, on the flagstones.
    k.add(k.tendrils([[[60, 156], [176, 150], { sag: 5, curl: 2, w: 2.6, tip: .7, thorns: 4, segs: 6 }], [[230, 152], [340, 158], { sag: 4, curl: 2, w: 2.4, tip: .7, thorns: 4, segs: 6 }]]));
    k.add(k.shadow(186, 214, 160, 200, 82, { len: 10, spread: .6, sy: .5 }));
    k.add(k.brush([[189, 152], [189, 144], [196, 138.6], [203, 142], [204, 147]], { w: 2.6, tip0: 1, tip1: 1, per: 3 }));
    k.add(k.fill(k.shape(soft(184, 151, 20, 13, 3), { wob: .3, tension: .9 })), k.fill(k.oval(194, 156, 1.8, 1.8, { n: 6 }), 'paper'));
    k.add(k.brush([[185, 151.4], [194, 150.8], [203, 151.4]], { w: 1, tone: 'paper', tip0: .2, tip1: .2 }));
  }
  k.add(k.stipple(200, 160, 170, 8, 12, { size: .9 }));
  return k.svg(view ? { view } : undefined);
}

// ---------- The Rogue AI: one great lens hung in the nave of the server crypt, cables for limbs ----------
function ai(key, { view, win = false } = {}) {
  const k = kit.scene({ key, w: 400, h: 170, seed: win ? 91 : 81, spot: win ? CYAN : FLARE });
  const VP = [200, 72], E = win ? [200, 140] : [200, 70];
  // The light: the lens itself (or, after, the dawn window at the end of the nave).
  const L = win ? [200, 62] : E;
  k.add(k.glow({ x: L[0], y: L[1], r: win ? [24, 196] : [44, 196], a: [0, 360], sy: .78, step: 5, clip: { x: 0, y: 0, w: 400, h: 122 }, w: [.5, 3.2] }));
  k.add(k.glow({ x: 200, y: 120, r: [10, 214], a: [0, 180], sy: .22, step: 7, clip: { x: 0, y: 122, w: 400, h: 50 }, w: [.2, 2.2] }));
  // The end of the nave: an ink wall with a lancet window. Rain at night; dawn when the crew held.
  if (win) k.add(k.fill(k.shape([[166, 123], [166, 40], [184, 20], [200, 14], [216, 20], [234, 40], [234, 123]], { wob: .5, tension: .7 })));
  k.add(lancet(k, 200, 34, 104, 17, win));
  // Vault ribs overhead, converging on the far wall: the camera is on the floor.
  k.add(k.brushes([[[[-6, 2], [90, 16], [162, 34]], { w: 7, tip0: 1, tip1: .4 }], [[[406, 2], [310, 16], [238, 34]], { w: 7, tip0: 1, tip1: .4 }],
    [[[60, -4], [130, 12], [176, 28]], { w: 4, tip0: 1, tip1: .3 }], [[[340, -4], [270, 12], [224, 28]], { w: 4, tip0: 1, tip1: .3 }], [[[200, -4], [200, 10], [200, 24]], { w: 3.4, tip0: 1, tip1: .5 }]]));
  // The rack walls: niches receding toward the far wall, LED votives in each, a lit edge facing the nave.
  const left = [[0, -2, 176, 36], [48, 14, 150, 26], [88, 26, 134, 17], [118, 33, 126, 11]];
  for (const [x, t, b, w] of left) k.add(niche(k, x, t, b, w, { lit: 1, leds: x < 60 ? 5 : 4, ledTone: win ? 'cyan' : 'paper' }));
  for (const [x, t, b, w] of left) k.add(niche(k, 400 - x - w, t, b, w, { lit: -1, leds: x < 60 ? 5 : 4, ledTone: win ? 'cyan' : 'paper' }));
  // The floor of the nave: seams brushed toward the far wall, grit.
  k.add(k.brush([[-4, 172], [80, 146], [160, 122.6], [240, 122.6], [320, 146], [404, 172]], { w: 1.6, tip0: .4, tip1: .4 }));
  k.add(k.brushes([[[[180, 123], [150, 150], [116, 174]], { w: 1.2, tip0: .2, tip1: 1 }], [[[220, 123], [250, 150], [284, 174]], { w: 1.2, tip0: .2, tip1: 1 }], [[[164, 132], [236, 132]], { w: .9, tip0: .2, tip1: .2 }], [[[140, 148], [260, 148]], { w: 1.1, tip0: .2, tip1: .2 }]]));
  if (!win) {
    // Cable limbs: from the lens out to the vault, the racks and the floor, plugged in or rooted.
    const limbs = [
      [[170, 46], [96, 14], { sag: -6, curl: 3, w: 6, tip: .3, thorns: 2, segs: 5 }], [[230, 46], [304, 14], { sag: -6, curl: 3, w: 6, tip: .3, thorns: 2, segs: 5 }],
      [[164, 74], [60, 70], { sag: 12, curl: 4, w: 5.4, tip: .4, thorns: 2, segs: 5 }], [[236, 74], [340, 70], { sag: 12, curl: 4, w: 5.4, tip: .4, thorns: 2, segs: 5 }],
      [[172, 98], [92, 160], { sag: 6, curl: 4, w: 6.4, tip: .4, thorns: 2, segs: 5 }], [[228, 98], [308, 160], { sag: 6, curl: 4, w: 6.4, tip: .4, thorns: 2, segs: 5 }],
      [[190, 108], [170, 166], { sag: 2, curl: 3, w: 5, tip: .4, segs: 4 }], [[210, 108], [234, 166], { sag: 2, curl: 3, w: 5, tip: .4, segs: 4 }],
      [[168, 58], [124, 44], { sag: 4, curl: 2, w: 3, tip: .3, segs: 4 }], [[232, 58], [276, 44], { sag: 4, curl: 2, w: 3, tip: .3, segs: 4 }],
    ];
    // Paper gaps under the limbs (the same path, wider), then the ink limbs with barbs.
    const P = limbs.map(([a, b, o]) => [cablePts(k, a, b, o), o]);
    k.add(k.brushes(P.map(([p, o]) => [p, { w: o.w + 3, w0: 1, w1: o.tip + .1, tip0: 1, tip1: .5, per: -16 }]), 'paper'));
    k.add(k.brushes(P.map(([p, o]) => [p, { w: o.w, w0: 1, w1: o.tip, tip0: 1, tip1: .3, per: -16 }]).concat(P.flatMap(([p, o]) => spines(k, p, { off: 0, every: 7, side: 1, len: 3.4, w: o.w * .45, from: .2, to: .8, lean: .5 })))));
    // Plugs where the limbs bite into the racks.
    for (const [x, y, a] of [[60, 70, 10], [340, 70, -10], [124, 44, 20], [276, 44, -20]]) k.add(k.fill(k.shape(rot(soft(x - 4, y - 2.6, 8, 5.2, 1.2), x, y, a), { wob: .2, tension: .9 })));
    // Shadows of the rooted limbs, short, out of the lens's pool.
    k.add(k.shadow(150, 250, 168, 200, 70, { len: 6, spread: .3, sy: .4 }));
    // The housing: a heavy ink bezel with paper rivets, chipped.
    const house = k.oval(E[0], E[1], 44, 42, { n: 12, lump: .04 });
    k.add(k.fill(house), k.rim(house, { from: .5, to: 1, w: 1 }));
    const riv = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = 36, r1 = i % 3 ? 39 : 41.4; riv.push([[[E[0] + Math.cos(a) * r0, E[1] + Math.sin(a) * r0 * .95], [E[0] + Math.cos(a) * r1, E[1] + Math.sin(a) * r1 * .95]], { w: 1.4, tip0: .5, tip1: .2, per: 2 }]); }
    k.add(k.brushes(riv, 'paper'));
    // The lens: paper glass, an iris of six ink blades half open, the pupil in flare with an ink slit.
    const lens = k.oval(E[0], E[1], 32, 31, { n: 12, lump: .02, wob: .2 });
    k.add(k.fill(lens, 'paper'));
    const iris = k.oval(E[0], E[1], 28, 27, { n: 12, lump: .02, wob: .2 }), hole = k.oval(E[0], E[1], 13, 12.6, { n: 9, lump: .03, wob: .2 });
    k.add(`<path d="${iris.d}${hole.d}" fill="${INK}" fill-rule="evenodd"/>`);
    const bl = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3, p = [0, .4, .8, 1].map((t, j) => { const rr = 13 + t * 15, aa = a + t * .9; return [E[0] + Math.cos(aa) * rr, E[1] + Math.sin(aa) * rr]; }); bl.push([p, { w: 1.1, tip0: .3, tip1: .1, per: 3 }]); }
    k.add(k.brushes(bl, 'paper'));
    k.add(`<circle cx="${E[0]}" cy="${E[1]}" r="8.4" fill="${FLARE}" stroke="${INK}" stroke-width="1.2"/>`);
    k.add(k.fill(k.shape([[E[0], E[1] - 7], [E[0] + 2, E[1]], [E[0], E[1] + 7], [E[0] - 2, E[1]]], { wob: .1, tension: .8 })));
    k.add(k.fill(k.oval(E[0] - 4.6, E[1] - 4.4, 1.6, 1.2, { n: 6 }), 'paper'));
    // Static coming off the glass.
    k.add(k.staticNoise({ x: 150, y: 20, w: 100, h: 14 }, 6, { sw: .7 }));
  } else {
    // Pulled down: the lens lies dead on the nave floor, shutter shut, limbs cut and slack.
    k.add(k.tendrils([
      [[96, 14], [124, 92], { sag: 4, curl: 3, w: 3.4, tip: .2, segs: 5 }], [[304, 14], [276, 92], { sag: 4, curl: 3, w: 3.4, tip: .2, segs: 5 }],
      [[60, 70], [80, 150], { sag: 3, curl: 3, w: 3, tip: .2, segs: 4 }], [[340, 70], [320, 150], { sag: 3, curl: 3, w: 3, tip: .2, segs: 4 }],
      [[172, 136], [96, 162], { sag: 4, curl: 3, w: 4.6, tip: .4, thorns: 2, segs: 5 }], [[228, 136], [312, 160], { sag: 4, curl: 3, w: 4.6, tip: .4, thorns: 2, segs: 5 }],
    ]));
    for (const [x, y, a] of [[60, 70, 10], [340, 70, -10]]) k.add(k.fill(k.shape(rot(soft(x - 4, y - 2.6, 8, 5.2, 1.2), x, y, a), { wob: .2, tension: .9 })));
    // Frayed cut ends.
    k.add(k.brushes([[[[124, 92], [121, 97]], { w: 1, tip0: 1, tip1: .02 }], [[[124, 92], [127, 96.6]], { w: 1, tip0: 1, tip1: .02 }], [[[276, 92], [273, 96.6]], { w: 1, tip0: 1, tip1: .02 }], [[[276, 92], [279, 97]], { w: 1, tip0: 1, tip1: .02 }]]));
    k.add(k.shadow(160, 240, 152, 200, 62, { len: 22, spread: .5, sy: .5 }));
    const house = k.oval(E[0], E[1], 32, 18, { n: 12, lump: .05 });
    k.add(k.fill(house), k.rim(house, { from: .55, to: .95, w: 1.3 }));
    const lens = k.oval(E[0], E[1] - 1, 23, 12, { n: 12, lump: .03, wob: .2 });
    k.add(k.fill(lens, INK, ` stroke="#F3E9E2" stroke-width=".8"`));
    const bl = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3, p = [0, .5, 1].map(t => { const rr = t * 22, aa = a + t * 1.1; return [E[0] + Math.cos(aa) * rr, E[1] - 1 + Math.sin(aa) * rr * .52]; }); bl.push([p, { w: .9, tip0: .3, tip1: .1, per: 3 }]); }
    k.add(k.brushes(bl, 'paper'));
  }
  k.add(k.stipple(200, 156, 160, 10, 18, { size: .9 }));
  return k.svg(view ? { view } : undefined);
}

// ---------- The Persistent Operator, after: the lead's reliquary scene with the figure gone and dawn in the upper panes ----------
// Adapted from lead/scenes.js boss(): same seed, same room and camera.
function aptWin(key, view) {
  const k = kit.scene({ key, w: 400, h: 170, seed: 23, spot: CYAN });
  k.add(k.glow({ x: 200, y: 66, r: [70, 150], a: [0, 360], sy: .78, step: 3.6, clip: { x: 0, y: 0, w: 400, h: 131 }, w: [.2, 2.4] }));
  k.add(k.glow({ x: 200, y: 128, r: [10, 200], a: [0, 180], sy: .2, step: 4.4, clip: { x: 0, y: 131, w: 400, h: 40 }, w: [.3, 2.4] }));
  k.add(k.fill(k.shape([[112, 134], [110, 64], [122, 30], [150, 10], [200, -4], [250, 10], [278, 30], [290, 64], [288, 134], [200, 136]], { wob: .8, tension: .8 })));
  const inner = k.shape([[115, 131], [114, 65], [125, 33], [151, 14], [200, 1], [249, 14], [275, 33], [286, 65], [285, 131], [200, 132]], { wob: .6, tension: .8 });
  k.add(k.fill(inner, 'paper'));
  // The upper tier is glass again: a city skyline under the dawn, the last of the rain.
  k.add(k.fill(k.shape([[116, 64], [118, 57], [127, 56], [129, 50], [135, 50], [137, 56], [148, 55], [152, 47], [154, 47], [156, 55], [170, 54], [172, 49], [180, 49], [182, 55], [196, 54], [199, 40], [202, 54], [214, 55], [217, 50], [226, 50], [228, 56], [244, 55], [247, 46], [250, 46], [252, 56], [266, 55], [269, 51], [275, 51], [277, 57], [285, 58], [285, 64]], { wob: .3, tension: .2 })));
  k.add(k.rain({ x: 130, y: 14, w: 140, h: 28 }, 9, { tone: 'ink', sw: .5, op: 1, len: [3, 7] }));
  k.add(k.brushes([150, 184, 216, 250].map((x, i) => [[[x + (i < 2 ? 4 : -4), 12 + Math.abs(x - 200) * .25], [x + k.r(1), 70], [x, 131]], { w: 2.6, tip0: .6, tip1: 1 }])
    .concat([[[[118, 64], [160, 62], [200, 63], [240, 62], [283, 64]], { w: 2.4, tip0: 1, tip1: 1 }], [[[[118, 98], [160, 96.5], [200, 97.5], [240, 96.5], [283, 98]], { w: 2.4, tip0: 1, tip1: 1 }]]])));
  k.add(k.hatch(inner, { a: 90, gap: 2.4, bend: 6, w: [1.6, .2], broken: .4, cover: [0, .2] }), k.hatch(inner, { a: 90, gap: 2.4, bend: -6, w: [.2, 1.6], broken: .4, cover: [.8, 1] }));
  // The screens below: each pane shows a cyan check over an ink keyline.
  const C = [], Ck = [];
  for (const [x, y] of [[134, 82], [167, 81], [200, 81], [233, 81], [266, 82], [134, 115], [167, 114], [200, 114], [233, 114], [266, 115]]) { const p = [[x - 6, y], [x - 1.6, y + 4.4], [x + 7, y - 5]]; C.push([p, { w: 4.6, tip0: .7, tip1: .5, per: 3 }]); Ck.push([p, { w: 2.1, tip0: .7, tip1: .5, per: 3 }]); }
  k.add(k.brushes(C), k.brushes(Ck, 'spot'));
  k.add(k.drips(118, 282, 133, 7, { len: [3, 9], w: 1.6 }));
  k.add(k.fill(k.shape([[-4, -4], [90, -4], [84, 60], [76, 174], [-4, 174]], { wob: .6, tension: .6 })));
  k.add(k.fill(k.shape([[310, -4], [404, -4], [404, 174], [324, 174], [316, 60]], { wob: .6, tension: .6 })));
  k.add(k.brushes([[[[90, -2], [86, 60], [78, 172]], { w: 1.2, tip0: .1, tip1: .6 }], [[[310, -2], [314, 60], [322, 172]], { w: 1.2, tip0: .1, tip1: .6 }]], 'paper'));
  k.add(k.tendrils([[[86, 168], [82, 20], { sag: 0, curl: 5, w: 1.1, tip: .2, thorns: 2, segs: 5 }], [[316, 168], [318, 30], { sag: 0, curl: 5, w: 1.1, tip: .2, thorns: 2, segs: 5 }]], 'paper'));
  // Badge reader: the ward now reads cyan.
  k.add(k.fill(k.shape(soft(296, 96, 10, 16, 2), { wob: .3 }), 'paper'), k.fill(k.shape(soft(298, 98, 6, 12, 1.4), { wob: .2 })));
  k.add(`<circle cx="301" cy="101.5" r="1.5" fill="${CYAN}"/>`);
  k.add(k.tendrils([[[128, 134], [168, 150], { sag: 6, curl: 3, w: 2.4, tip: .5, thorns: 2 }], [[272, 134], [234, 152], { sag: 6, curl: 3, w: 2.4, tip: .5, thorns: 2 }], [[150, 140], [196, 158], { sag: 6, curl: 2, w: 1.6, tip: .4 }]]));
  // What the Operator left on the floor: the hat, and the cloned badges scattered, chips dead.
  k.add(k.shadow(186, 216, 158, 200, 66, { len: 14, spread: .5, sy: .5 }));
  k.add(k.fill(k.shape([[190, 152], [193, 142], [201, 139], [209, 142], [212, 152]], { wob: .3, tension: .8 })), k.brush([[178, 153], [192, 151.4], [201, 151], [212, 151.4], [224, 153.4]], { w: 4, tip0: .1, tip1: .1 }));
  k.add(k.brush([[180, 151.6], [192, 150], [201, 149.6]], { w: .9, tone: 'paper', tip0: .1, tip1: .1 }), k.brush([[193, 142.2], [201, 139.4], [209, 142.2]], { w: .9, tone: 'paper', tip0: .2, tip1: .2 }));
  [[150, 154, -30], [166, 160, 18], [238, 157, 40], [256, 151, -12], [222, 162, 70]].forEach(([x, y, a]) => {
    k.add(k.fill(k.shape(rot(soft(x - 5, y - 7, 10, 14, 2), x, y, a), { wob: .2, tension: .9 }), 'paper', ' stroke="#07060A" stroke-width=".9"'));
    const [[cx, cy]] = rot([[x, y - 3]], x, y, a);
    k.add(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.2" fill="#07060A"/>`);
  });
  k.add(k.stipple(200, 160, 120, 8, 16, { size: .9 }));
  return k.svg(view ? { view } : undefined);
}

// ---------- Title hero: the analyst from behind at the triptych altar, the dwellers' eyes in the rack niches ----------
function hero(key) {
  const k = kit.scene({ key, seed: 101, spot: FLARE });
  k.add(k.glow({ x: 100, y: 46, r: [26, 112], a: [0, 360], sy: .7, step: 5.2, clip: { x: 0, y: 0, w: 200, h: 82 }, w: [.15, 2.2] }));
  k.add(k.glow({ x: 100, y: 80, r: [8, 112], a: [0, 180], sy: .28, step: 6, clip: { x: 0, y: 82, w: 200, h: 30 }, w: [.2, 1.8] }));
  // Rack niches flanking the altar; the eyes watch from the outer two.
  for (const [x, t, b, w, lit] of [[0, 2, 96, 20, 1], [26, 14, 86, 14, 1], [160, 14, 86, 14, -1], [180, 2, 96, 20, -1]]) k.add(niche(k, x, t, b, w, { lit, leds: 4 }));
  k.add(k.brush([[-2, 82], [60, 81.4], [140, 82.4], [202, 81.8]], { w: 1.5, tip0: .5, tip1: .5 }));
  // Cable vines slung across the vault from niche to niche.
  k.add(k.tendrils([[[10, 4], [96, 6], { sag: 9, curl: 2, w: 2.2, tip: .6, thorns: 2 }], [[190, 4], [104, 8], { sag: 7, curl: 2, w: 2, tip: .6, thorns: 2 }]]));
  // The triptych of screens on the desk-altar; the centre one is the torch, the wings dimmer (scanline hatch).
  const panel = (pts, sc) => { k.add(k.fill(k.shape(pts, { wob: .3, tension: .6 }))); const s = k.shape(sc, { wob: .2, tension: .6 }); k.add(k.fill(s, 'paper')); return s; };
  const sL = panel([[46, 30], [70, 26], [72, 46], [70, 66], [47, 64], [45, 47]], [[49, 33], [67, 30], [68.5, 46], [67, 62], [49.5, 60.6], [48.4, 47]]);
  panel([[74, 22], [100, 20.5], [126, 22], [128, 44], [126, 66], [100, 67], [74, 66], [72, 44]], [[78, 26], [100, 25], [122, 26], [123.6, 44], [122, 62], [100, 63], [78, 62], [76.6, 44]]);
  const sR = panel([[130, 26], [154, 30], [155, 47], [153, 64], [130, 66], [128, 46]], [[133, 30], [151, 33], [151.6, 47], [150.5, 60.6], [133, 62], [131.5, 46]]);
  k.add(k.staticNoise({ x: 49, y: 33, w: 22, h: 27 }, 11, { sw: 1.2 }), k.staticNoise({ x: 132, y: 33, w: 22, h: 27 }, 11, { sw: 1.2 }));
  const lines = [];
  for (let i = 0; i < 6; i++) lines.push([[[81, 30 + i * 5], [81 + 12 + k.R() * 22, 30 + i * 5 + k.r(.3)]], { w: 1.4, tip0: .5, tip1: .2, per: 3 }]);
  k.add(k.brushes(lines), k.staticNoise({ x: 78, y: 27, w: 44, h: 34 }, 4, { sw: .5 }));
  k.add(k.tendrils([[[60, 64], [30, 92], { sag: 4, curl: 2, w: 1.4, tip: .4, thorns: 1 }], [[142, 64], [172, 94], { sag: 4, curl: 2, w: 1.4, tip: .4, thorns: 1 }]]));
  k.add(k.smoke(100, 22, 18, { n: 2, sway: 4, w: 1, tone: 'paper' }));
  // The desk-altar slab.
  k.add(k.fill(k.shape([[34, 68], [100, 66], [166, 68], [168, 76], [100, 78], [32, 76]], { wob: .4, tension: .6, chip: .2 })), k.drips(40, 160, 76, 6, { len: [3, 8], w: 1.3, tone: 'paper' }));
  k.add(k.brush([[36, 67.6], [100, 65.6], [164, 67.6]], { w: 1.1, tone: 'paper', tip0: .2, tip1: .2 }));
  // The analyst from behind: a pointed hood, cloaked shoulders rim-lit by the screens, rags hanging into the dark.
  const cloak = k.shape([[56, 114], [60, 96], [68, 84], [80, 77], [89, 72], [90, 60], [93, 47], [100, 38], [107, 47], [110, 60], [111, 72], [120, 77], [132, 84], [140, 96], [144, 114]], { wob: .5 });
  k.add(k.fill(cloak), k.drips(64, 136, 110, 5, { len: [2, 5], w: 2 }));
  k.add(k.brushes([[[[60.6, 96], [68.4, 84.6], [80, 77.6], [89.6, 72]], { w: 1.2, tip0: .1, tip1: .1 }], [[[90.6, 62], [93.6, 47.4], [100, 39.2], [106.4, 47.4], [109.4, 62]], { w: 1.4, tip0: .1, tip1: .1 }], [[[110.4, 72], [120, 77.6], [131.6, 84.6], [139.4, 96]], { w: 1.2, tip0: .1, tip1: .1 }]], 'paper'));
  // The dwellers: two pairs of eyes in the dark niches.
  k.add(`<ellipse cx="7.4" cy="40" rx="1.6" ry=".85" fill="${FLARE}"/><ellipse cx="12.2" cy="40.4" rx="1.5" ry=".8" fill="${FLARE}"/><ellipse cx="187.8" cy="36.6" rx="1.6" ry=".85" fill="${FLARE}"/><ellipse cx="192.6" cy="36.2" rx="1.5" ry=".8" fill="${FLARE}"/>`);
  k.add(k.stipple(100, 100, 90, 8, 14, { size: .8 }));
  return k.svg();
}

// ---------- Card back (240×336, print): the desk-altar at 2 AM, the d20 with a flare face ----------
// cards.js back() lays "Detect the Dwellers" over y 30–84 and two HUD lines over y 270–312, and fades the outer 22 px.
// So the title band and the bottom 80 px stay dark ink, and the scene lives in y 92–262.
function back(key) {
  const k = kit.scene({ key, w: 240, h: 336, seed: 131, spot: FLARE });
  const DY = 196;
  // The monitor lights the wall (kept below the title band) and the desk top.
  k.add(k.glow({ x: 128, y: 158, r: [34, 92], a: [0, 360], sy: .86, step: 4.6, clip: { x: 0, y: 0, w: 240, h: DY }, w: [.2, 2.4] }));
  k.add(k.glow({ x: 128, y: DY - 4, r: [8, 150], a: [0, 180], sy: .26, step: 4.6, clip: { x: 0, y: DY, w: 240, h: 40 }, w: [.15, 1.6] }));
  // A rain window to the left in the dark, and a niche of the rack wall to the right.
  k.add(lancet(k, 44, 112, 176, 13, false));
  k.add(niche(k, 198, 108, DY, 20, { lit: -1, leds: 5 }));
  // Cables hang from the dark ceiling down behind the monitor.
  k.add(k.tendrils([[[96, 94], [104, 124], { sag: 2, curl: 3, w: 1.8, tip: .6, segs: 4 }], [[160, 94], [150, 124], { sag: 2, curl: 3, w: 1.6, tip: .6, segs: 4 }]]));
  // The monitor: the torch.
  k.add(k.fill(k.shape([[86, 120], [128, 117], [170, 120], [173, 148], [170, 176], [128, 178], [86, 176], [83, 148]], { wob: .5, tension: .6 })));
  const scr = k.shape([[91, 125], [128, 122.5], [165, 125], [167, 148], [165, 171], [128, 173], [91, 171], [89, 148]], { wob: .3, tension: .6 });
  k.add(k.fill(scr, 'paper'));
  const lines = [];
  for (let i = 0; i < 6; i++) lines.push([[[98, 132 + i * 6.4], [98 + 16 + k.R() * 40, 132 + i * 6.4 + k.r(.3)]], { w: 1.6, tip0: .5, tip1: .2, per: 3 }]);
  k.add(k.brushes(lines), k.staticNoise({ x: 92, y: 126, w: 72, h: 44 }, 5, { sw: .6 }), k.smoke(128, 120, 20, { n: 2, sway: 5, w: 1.2, tone: 'paper' }));
  k.add(k.fill(k.shape([[121, 176], [135, 176], [140, DY + 6], [116, DY + 6]], { wob: .3, tension: .5 })));
  // The desk front: an ink slab under the lit top, its edge dripping, cables rooting off it.
  k.add(k.fill(k.shape([[14, 228], [120, 226], [228, 228], [226, 240], [218, 266], [30, 266], [16, 240]], { wob: .6, tension: .7, chip: .25 })));
  k.add(k.brush([[16, 227.4], [120, 225.4], [226, 227.4]], { w: 1.6, tone: 'paper', tip0: .2, tip1: .2 }));
  k.add(k.drips(24, 220, 230, 8, { len: [4, 14], w: 1.6, tone: 'paper' }));
  k.add(k.brush([[0, DY], [80, DY - .5], [160, DY + .5], [240, DY]], { w: 1.4, tip0: .5, tip1: .5 }));
  // Keyboard and mug on the lit desk top.
  k.add(k.fill(k.shape([[118, 206], [146, 205.2], [174, 206], [176, 214], [146, 214.8], [116, 214]], { wob: .3, tension: .5 })), k.stipple(146, 210, 26, 2.6, 16, { size: .8, bias: .6 }));
  k.add(k.fill(k.shape([[190, 196], [199, 195.4], [200, 210], [191, 210.6]], { wob: .3, tension: .6 })), k.brush([[199.6, 198], [204, 200], [203.4, 206], [199.6, 207]], { w: 1.8, tip0: .7, tip1: .7 }));
  // The d20 on the desk: an ink icosahedron with paper facet edges, its face in flare with an ink "20", a shadow away from the screen.
  const D = [72, 208], R = 22;
  k.add(k.shadow(D[0] - 18, D[0] + 14, D[1] + 17, 128, 150, { len: 26, spread: .4, sy: .35 }));
  const hex = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return [D[0] + Math.cos(a) * R, D[1] + Math.sin(a) * R]; });
  k.add(k.fill(k.shape(hex, { wob: .4, tension: .25 })));
  const q = 13, tri = [[D[0], D[1] - q], [D[0] + q * .99, D[1] + q * .7], [D[0] - q * .99, D[1] + q * .7]];
  const edges = [[hex[0], tri[0]], [hex[1], tri[1]], [hex[5], tri[2]], [hex[1], tri[0]], [hex[5], tri[0]], [hex[2], tri[1]], [hex[4], tri[2]], [hex[3], tri[1]], [hex[3], tri[2]]];
  k.add(k.brushes(edges.map(([a, b]) => [[a, b], { w: 1, tip0: .5, tip1: .5, per: 2 }]), 'paper'));
  k.add(k.fill(k.shape(tri, { wob: .2, tension: .2 }), 'spot', ` stroke="${INK}" stroke-width="1.4"`));
  const two = [[D[0] - 7, D[1] - 1], [D[0] - 4.8, D[1] - 3.4], [D[0] - 2.2, D[1] - 1.6], [D[0] - 3, D[1] + 1], [D[0] - 7.2, D[1] + 5], [D[0] - 1.6, D[1] + 5]];
  k.add(k.brush(two, { w: 2, tip0: .6, tip1: .6, per: 3 }), k.fill(k.oval(D[0] + 3.6, D[1] + 1.4, 3, 4.2, { n: 8, lump: .03, wob: .1 }), 'none', ` stroke="${INK}" stroke-width="1.8"`));
  k.add(k.brushes([[[[D[0] - R * .87, D[1] - R * .5], [D[0], D[1] - R], [D[0] + R * .87, D[1] - R * .5]], { w: 1.3, tip0: .2, tip1: .2, per: 2 }]], 'paper'));
  return k.svg();
}

const out = {
  art: {
    wyrm: wyrm('wyrm', { view: SMALL }), ai: ai('ai', { view: SMALL }), hero: hero('hero'),
    win_wyrm: wyrm('win_wyrm', { view: SMALL, win: true }), win_apt: aptWin('win_apt', SMALL), win_ai: ai('win_ai', { view: SMALL, win: true }),
    _boss: { wyrm: wyrm('Bwyrm'), ai: ai('Bai') },
    _win: { wyrm: wyrm('Wwyrm', { win: true }), apt: aptWin('Wapt'), ai: ai('Wai', { win: true }) },
  },
  print: { boss_wyrm: wyrm('{{SID}}'), boss_ai: ai('{{SID}}'), back: back('{{SID}}') },
};
fs.writeFileSync(path.join(__dirname, 'ink-art.json'), JSON.stringify(out, null, 1) + '\n');
const flat = { ...Object.fromEntries(Object.entries(out.art).filter(([, v]) => typeof v === 'string')), ...Object.fromEntries(Object.entries(out.art._boss).map(([a, v]) => ['_boss.' + a, v])), ...Object.fromEntries(Object.entries(out.art._win).map(([a, v]) => ['_win.' + a, v])), ...Object.fromEntries(Object.entries(out.print).map(([a, v]) => ['print.' + a, v])) };
for (const [n, s] of Object.entries(flat)) console.log(n.padEnd(16), (s.length / 1024).toFixed(1) + ' KB');
module.exports = out;
