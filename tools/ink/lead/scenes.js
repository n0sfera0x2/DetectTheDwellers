// The four lead scenes, drawn with ink-kit. Writes ink-art.json: { art: {...}, print: {...} }.
// Usage: node scenes.js
'use strict';
const fs = require('fs'), path = require('path');
const kit = require('../ink-kit');
const { FLARE, CYAN } = kit;

const { soft, rot } = kit;

// A curled envelope: soft paper body, ink keyline, ink flap. seal: a flare dot.
function envelope(k, x, y, w, h, a, seal) {
  const s = k.shape(rot(soft(x, y, w, h, 1.2), x + w / 2, y + h / 2, a), { wob: .3, tension: .8 });
  return k.fill(s, 'paper', ` stroke="#07060A" stroke-width=".8"`)
    + k.brush(rot([[x + .8, y + .8], [x + w / 2, y + h * .62], [x + w - .8, y + .8]], x + w / 2, y + h / 2, a), { w: .9, tip0: .4, tip1: .4, per: 3 })
    + (seal ? (() => { const [[sx, sy]] = rot([[x + w / 2, y + h * .62]], x + w / 2, y + h / 2, a); return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.9" fill="${FLARE}" stroke="#07060A" stroke-width=".5"/>`; })() : '');
}

// ---------- Mailer Daemon: a hunched daemon made of mail, at the reception altar ----------
function mailer(key) {
  const k = kit.scene({ key, seed: 11, spot: FLARE });
  // The torch: the reception monitor throws light up the wall and across the floor.
  k.add(k.glow({ x: 30, y: 64, r: [24, 132], a: [-82, 26], clip: { x: 0, y: 0, w: 200, h: 89 }, w: [.15, 2.2], step: 4.8 }));
  k.add(k.glow({ x: 34, y: 86, r: [8, 140], a: [-8, 40], sy: .32, step: 5.5, clip: { x: 0, y: 89, w: 200, h: 23 }, w: [.2, 1.8] }));
  k.add(k.brush([[0, 89], [60, 88.6], [130, 89.4], [200, 88.8]], { w: 1.6, tip0: .6, tip1: .6 }));
  // The altar: desk and monitor, the lit screen edge, static on it, wisps rising off it.
  k.add(k.fill(k.shape([[-2, 75], [18, 72], [38, 75], [40, 92], [38, 113], [-2, 113]], { wob: .5, tension: .7 })));
  k.add(k.brush([[0, 74], [20, 72], [38, 75]], { w: 1.1, tone: 'paper', tip0: .3, tip1: .1 }));
  k.add(k.drips(4, 36, 76, 4, { len: [3, 8], w: 1.3, tone: 'paper' }));
  k.add(k.fill(k.shape([[6, 52], [16, 48.5], [25, 47], [27, 60], [27, 73], [17, 73.5], [8, 74]], { wob: .3, tension: .5 })));
  k.add(k.fill(k.shape([[25, 47], [30, 50], [32, 56], [31.5, 70], [27, 73]], { wob: .2, tension: .6 }), 'paper'));
  k.add(k.staticNoise({ x: 26.5, y: 52, w: 5, h: 18 }, 5, { sw: .5 }));
  k.add(k.smoke(15, 46, 30, { n: 2, sway: 5, w: 1.1 }));
  // Roots of cable from the altar crawl across the floor to the daemon's feet.
  k.add(k.tendrils([[[30, 78], [98, 95], { sag: 7, curl: 2, w: 1.7, tip: .4, thorns: 1 }], [[34, 82], [128, 96], { sag: 9, curl: 2.5, w: 1.3, tip: .3, thorns: 1 }]]));
  // Its shadow, thrown away from the light.
  k.add(k.shadow(96, 136, 92, 30, 64, { len: 54, spread: .5, sy: .2 }));
  // The tail: a barbed cable curling up against the lit wall.
  k.add(k.tendril([132, 80], [160, 60], { sag: 10, curl: 2, w: 2.8, tip: .4, segs: 4 }));
  k.add(k.fill(k.shape([[155, 63], [158, 52], [165, 61], [160, 60]], { wob: .2, tension: .3 })));
  // The sack: mid-tone paper with curved hatching that wraps it, an ink keyline, mail bursting out.
  const sack = k.oval(141, 39, 22, 20, { n: 11, lump: .1, rot: -12 });
  k.add(envelope(k, 120, 7, 15, 10, -28), envelope(k, 137, 2, 17, 12, 10, true), envelope(k, 153, 13, 13, 9, 38));
  k.add(k.fill(sack, 'paper', ` stroke="#07060A" stroke-width="1.6"`));
  k.add(k.hatch(sack, { a: -62, gap: 2.1, bend: 5, w: [.3, 1.9], broken: .25 }));
  k.add(k.fill(k.shape([[121, 21], [128, 15], [135, 20], [128, 27]], { wob: .3 })));
  // The body: one hunched mass of ink, coat rags hanging from it, legs and clawed feet.
  const body = k.shape([[98, 44], [112, 34], [127, 39], [135, 54], [137, 72], [133, 87], [122, 89], [110, 87], [99, 88], [94, 74], [95, 56]], { wob: .5 });
  k.add(k.fill(body));
  k.add(k.drips(97, 134, 86, 6, { len: [3, 8], w: 2.4 }));
  k.add(k.brushes([[[[104, 86], [102, 91], [95, 94]], { w: 4, tip0: 1, tip1: .3 }], [[[124, 86], [127, 91], [133, 94]], { w: 4, tip0: 1, tip1: .3 }],
    [[[96, 94], [90, 95]], { w: 1.4, tip0: 1, tip1: .1 }], [[[96, 93.5], [91, 92]], { w: 1.2, tip0: 1, tip1: .1 }]]));
  // Arm over the shoulder, claws gripping the sack's neck. A paper gap separates it from the body.
  const armUp = [[110, 46], [116, 36], [122, 28], [127, 23]];
  k.add(k.brush(armUp, { w: 7, tone: 'paper', tip0: .6, tip1: .5 }), k.brush(armUp, { w: 4.6, tip0: .7, tip1: .4 }));
  k.add(k.brushes([[[[126, 23], [131, 20], [133, 24]], { w: 1.6, tip0: 1, tip1: .1 }], [[[126, 24], [130, 26], [131, 29]], { w: 1.4, tip0: 1, tip1: .1 }]]));
  // The other arm hangs toward the light, claws past its knees, with its own paper gap.
  const armDn = [[101, 50], [94, 60], [89, 70], [86, 79]];
  k.add(k.brush(armDn, { w: 6.6, tone: 'paper', tip0: .7, tip1: .4 }), k.brush(armDn, { w: 4.4, tip0: .8, tip1: .4 }));
  k.add(k.brushes([[[[86, 78], [83, 83], [84, 86]], { w: 1.5, tip0: 1, tip1: .1 }], [[[87, 79], [87, 84], [89, 86]], { w: 1.4, tip0: 1, tip1: .1 }], [[[85, 78], [81, 81], [80, 84]], { w: 1.3, tip0: 1, tip1: .1 }]]));
  // Neck, head and mail cap, horns through the cap, a rim of monitor light, and the eyes in the void.
  k.add(k.brush([[103, 46], [96, 42], [90, 41]], { w: 7, tip0: 1, tip1: .8 }));
  k.add(k.fill(k.shape([[80, 37], [89, 33], [96, 37], [95, 45], [88, 48.5], [80, 45]], { wob: .3 })));
  k.add(k.fill(k.shape([[79, 34], [84, 29], [93, 28.5], [98, 33], [90, 35.5]], { wob: .2 })));
  k.add(k.brush([[73, 37], [82, 34.6], [92, 35]], { w: 2.2, tip0: .2, tip1: .8 }));
  k.add(k.brushes([[[[84, 30], [80, 22], [82, 14]], { w: 2.8, tip0: 1, tip1: .02 }], [[[93, 29.5], [97, 22], [95, 14]], { w: 2.8, tip0: 1, tip1: .02 }]]));
  k.add(k.brushes([[[[73.5, 36.4], [79, 32.5], [85, 29.4], [92, 28.6]], { w: 1, tip0: .2, tip1: .1 }], [[[80, 38.6], [79.6, 43], [83, 47]], { w: .9, tip0: .2, tip1: .1 }], [[[81, 21], [80.6, 16]], { w: .7, tip0: .3, tip1: .1 }]], 'paper'));
  k.add(`<ellipse cx="84.6" cy="40.4" rx="2" ry="1" fill="${FLARE}"/><ellipse cx="89.6" cy="40.9" rx="1.7" ry=".95" fill="${FLARE}"/>`);
  // Grit on the floor and a stray envelope blown across it.
  k.add(k.stipple(118, 100, 70, 8, 12, { size: .8 }));
  return k.svg();
}

// ---------- The Persistent Operator: from the floor, looking up, backlit by the reliquary of screens ----------
function boss(key, view) {
  const k = kit.scene({ key, w: 400, h: 170, seed: 23, spot: FLARE });
  // Light around the screen wall and down onto the floor, as engraved arcs.
  k.add(k.glow({ x: 200, y: 66, r: [70, 150], a: [0, 360], sy: .78, step: 3.6, clip: { x: 0, y: 0, w: 400, h: 131 }, w: [.2, 2.4] }));
  k.add(k.glow({ x: 200, y: 128, r: [10, 200], a: [0, 180], sy: .2, step: 3.4, clip: { x: 0, y: 131, w: 400, h: 40 }, w: [.2, 2] }));
  // The reliquary: a pointed arch of ink holding fifteen screens, each a soft-cornered pane of light.
  k.add(k.fill(k.shape([[112, 134], [110, 64], [122, 30], [150, 10], [200, -4], [250, 10], [278, 30], [290, 64], [288, 134], [200, 136]], { wob: .8, tension: .8 })));
  const inner = k.shape([[115, 131], [114, 65], [125, 33], [151, 14], [200, 1], [249, 14], [275, 33], [286, 65], [285, 131], [200, 132]], { wob: .6, tension: .8 });
  k.add(k.fill(inner, 'paper'));
  // Mullions: the screens are panes of the window, divided by bent ink bars like leading in old glass.
  k.add(k.brushes([150, 184, 216, 250].map((x, i) => [[[x + (i < 2 ? 4 : -4), 12 + Math.abs(x - 200) * .25], [x + k.r(1), 70], [x, 131]], { w: 2.6, tip0: .6, tip1: 1 }])
    .concat([[[[118, 64], [160, 62], [200, 63], [240, 62], [283, 64]], { w: 2.4, tip0: 1, tip1: 1 }], [[[[118, 98], [160, 96.5], [200, 97.5], [240, 96.5], [283, 98]], { w: 2.4, tip0: 1, tip1: 1 }]]])));
  k.add(k.staticNoise({ x: 120, y: 30, w: 30, h: 98 }, 9, { sw: .9 }), k.staticNoise({ x: 252, y: 30, w: 30, h: 98 }, 9, { sw: .9 }), k.staticNoise({ x: 154, y: 20, w: 92, h: 40 }, 5, { sw: .5 }));
  k.add(k.hatch(inner, { a: 90, gap: 2.4, bend: 6, w: [1.4, .2], broken: .4, cover: [0, .14] }), k.hatch(inner, { a: 90, gap: 2.4, bend: -6, w: [.2, 1.4], broken: .4, cover: [.86, 1] }));
  k.add(k.drips(118, 282, 133, 7, { len: [3, 9], w: 1.6 }));
  // Pillars leaning in toward the top (the camera is on the floor), with cable vines climbing their edges.
  k.add(k.fill(k.shape([[-4, -4], [90, -4], [84, 60], [76, 174], [-4, 174]], { wob: .6, tension: .6 })));
  k.add(k.fill(k.shape([[310, -4], [404, -4], [404, 174], [324, 174], [316, 60]], { wob: .6, tension: .6 })));
  k.add(k.brushes([[[[90, -2], [86, 60], [78, 172]], { w: 1.2, tip0: .1, tip1: .6 }], [[[310, -2], [314, 60], [322, 172]], { w: 1.2, tip0: .1, tip1: .6 }]], 'paper'));
  k.add(k.tendrils([[[86, 168], [82, 20], { sag: 0, curl: 5, w: 1.1, tip: .2, thorns: 2, segs: 5 }], [[316, 168], [318, 30], { sag: 0, curl: 5, w: 1.1, tip: .2, thorns: 2, segs: 5 }]], 'paper'));
  // Badge reader on the right pillar: the one light on its side, in flare.
  k.add(k.fill(k.shape(soft(296, 96, 10, 16, 2), { wob: .3 }), 'paper'), k.fill(k.shape(soft(298, 98, 6, 12, 1.4), { wob: .2 })));
  k.add(`<circle cx="301" cy="101.5" r="1.5" fill="${FLARE}"/>`);
  // Cables run from the reliquary's foot across the floor and into the hem: it lives off your network.
  k.add(k.tendrils([[[128, 134], [168, 120], { sag: 10, curl: 3, w: 2.4, tip: .5, thorns: 2 }], [[272, 134], [234, 120], { sag: 10, curl: 3, w: 2.4, tip: .5, thorns: 2 }], [[150, 140], [190, 124], { sag: 14, curl: 2, w: 1.6, tip: .4 }]]));
  // The long shadow, down the floor to your feet.
  k.add(k.shadow(158, 244, 154, 200, 70, { len: 80, spread: .9, sy: .35 }));
  // The figure: a tattered cloak, legs planted wide, arms hanging, a small hat high up.
  const cloak = k.shape([[178, 35], [200, 31], [222, 35], [244, 46], [253, 70], [257, 98], [264, 120], [248, 116], [238, 123], [224, 115], [210, 121], [200, 113], [190, 121], [176, 115], [162, 123], [152, 116], [136, 120], [143, 98], [147, 70], [156, 46]], { wob: .7 });
  k.add(k.fill(cloak), k.drips(140, 262, 116, 8, { len: [4, 13], w: 2.6 }));
  k.add(k.brushes([[[[180, 112], [174, 136], [166, 156]], { w: 15, w1: .7, tip0: 1, tip1: .6 }], [[[220, 112], [228, 136], [236, 156]], { w: 15, w1: .7, tip0: 1, tip1: .6 }],
    [[[160, 47], [150, 72], [143, 103]], { w: 10, tip0: 1, tip1: .5 }], [[[240, 47], [253, 72], [261, 99]], { w: 10, tip0: 1, tip1: .5 }]]));
  k.add(k.fill(k.oval(163, 156, 11, 3.4, { n: 8 })), k.fill(k.oval(239, 156, 11, 3.4, { n: 8 })));
  k.add(k.fill(k.shape([[186, 25], [189, 11], [200, 6], [211, 11], [214, 25]], { wob: .3, tension: .8 })));
  k.add(k.brush([[168, 26], [184, 23], [200, 22], [216, 23], [232, 26]], { w: 5, tip0: .1, tip1: .1 }));
  k.add(k.fill(k.oval(200, 31, 11, 8, { n: 8 })));
  // Backlight rims the hat, the shoulders and the cloak's edges; ink smoke rises off the shoulders.
  k.add(k.brushes([[[[170, 24.6], [186, 21.6], [189, 11], [200, 5.4], [211, 11], [214, 21.6], [230, 24.6]], { w: 1.2, tip0: .1, tip1: .1 }],
    [[[147, 72], [151, 52], [164, 39], [181, 34]], { w: 1.3, tip0: .1, tip1: .1 }], [[[219, 34], [238, 40], [250, 54], [256, 76]], { w: 1.3, tip0: .1, tip1: .1 }],
    [[[143, 98], [139, 112], [137, 119]], { w: .9, tip0: .2, tip1: .1 }]], 'paper'));
  k.add(k.smoke(170, 40, 30, { n: 2, sway: 8, w: 1.6, tone: 'ink' }), k.smoke(232, 40, 30, { n: 2, sway: 8, w: 1.6, tone: 'ink' }));
  k.add(`<ellipse cx="195" cy="31" rx="2" ry="1.1" fill="${FLARE}"/><ellipse cx="205.6" cy="31.4" rx="1.9" ry="1.05" fill="${FLARE}"/>`);
  // A fan of cloned badges in the right hand; the middle one carries the live chip.
  [-44, -22, 0, 22, 44].forEach((a, i) => {
    let g = k.fill(k.shape(rot(soft(256.5, 80, 11, 16, 2), 262, 104, a), { wob: .2, tension: .9 }), 'paper', ' stroke="#07060A" stroke-width=".9"');
    const [[cx, cy]] = rot([[262, 86]], 262, 104, a);
    g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.6" fill="#07060A"/>`;
    const [[lx, ly]] = rot([[262, 92]], 262, 104, a);
    g += i === 2 ? `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.5" fill="${FLARE}" stroke="#07060A" stroke-width=".5"/>` : k.brush(rot([[259.5, 92], [264.5, 92]], 262, 104, a), { w: .8, per: 2 });
    k.add(g);
  });
  k.add(k.fill(k.oval(261, 102, 5, 4, { n: 7 })));
  return k.svg(view ? { view } : undefined);
}

// ---------- Pager Storm: the altar of the desk, every device on it going off ----------
function pager(key) {
  const k = kit.scene({ key, seed: 37, spot: FLARE });
  // The desk, lit from the monitor's foot in engraved ellipses. Nothing behind but dark.
  k.add(k.glow({ x: 100, y: 58, r: [22, 104], a: [0, 180], sy: .5, step: 4.2, clip: { x: 0, y: 60, w: 200, h: 52 }, w: [.15, 2] }));
  k.add(k.brush([[0, 60.4], [70, 59.6], [130, 60.4], [200, 59.8]], { w: 1.8, tip0: .5, tip1: .5 }));
  // Cables hang from behind the monitor and root into the desk.
  k.add(k.tendrils([[[66, 30], [44, 62], { sag: 6, curl: 2, w: 1.6, tip: .5, thorns: 1 }], [[134, 34], [158, 62], { sag: 6, curl: 2, w: 1.6, tip: .5, thorns: 1 }], [[70, 46], [30, 70], { sag: 10, curl: 2, w: 1.2, tip: .3 }]]));
  // The monitor: the torch. Every alert row is a flare stroke behind an ink marker.
  k.add(k.fill(k.shape([[62, 8], [100, 5.5], [138, 7], [141, 32], [139, 57], [100, 58.5], [61, 57], [59, 32]], { wob: .4, tension: .6 })));
  k.add(k.fill(k.shape([[67, 12], [100, 10], [133, 11.5], [135, 32], [133, 52], [100, 53.5], [67, 52], [65, 32]], { wob: .3, tension: .6 }), 'paper'));
  k.add(k.brush([[70, 15], [130, 14.6]], { w: 3, tip0: .4, tip1: .4 }));
  const rows = [], marks = [];
  for (let i = 0; i < 8; i++) { const y = 20 + i * 4, L = 26 + k.R() * 28; marks.push([[[71, y], [73, y]], { w: 2.2, tip0: .9, tip1: .9, per: 2 }]); rows.push([[[76, y], [76 + L / 2, y + k.r(.3)], [76 + L, y]], { w: 2, tip0: .5, tip1: .2, per: 3 }]); }
  k.add(k.brushes(rows, 'spot'), k.brushes(marks));
  k.add(k.staticNoise({ x: 68, y: 18, w: 64, h: 32 }, 6, { sw: .5 }));
  k.add(k.fill(k.shape([[95, 57], [105, 57], [109, 63], [91, 63]], { wob: .3, tension: .5 })));
  // Keyboard, and a cold mug with its handle.
  k.add(k.fill(k.shape([[80, 65.5], [100, 64.8], [121, 65.5], [122, 72], [100, 72.6], [79, 72]], { wob: .3, tension: .5 })));
  k.add(k.stipple(100, 68.6, 19, 2.4, 22, { size: .7, bias: .6 }));
  k.add(k.fill(k.shape([[169, 57.5], [175, 56.8], [181, 57.5], [180.5, 70], [175, 71], [170, 70]], { wob: .3, tension: .6 })));
  k.add(k.brush([[180, 60], [185, 62], [184.5, 67], [180, 68]], { w: 1.8, tip0: .7, tip1: .7 }), k.brush([[169.6, 57.6], [175, 56.8], [180.6, 57.6]], { w: .9, tone: 'paper' }));
  // Five pagers and phones going off: soft ink silhouettes, long shadows away from the screen, a cord
  // trailing back toward the monitor, a paper screen with an ink glyph and a flare rim, and buzz marks.
  const L = [100, 40];
  [[36, 78, -14, 0], [64, 94, 8, 1], [100, 90, -4, 0], [136, 94, 10, 1], [164, 78, 14, 0]].forEach(([x, y, a, phone]) => {
    const w = phone ? 11 : 19, h = phone ? 18 : 11, dx = x - L[0], dy = y - L[1], m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m;
    k.add(k.brush([[x, y], [x + ux * 10, y + uy * 10], [x + ux * 22, y + uy * 22]], { w: w * .95, tip0: 1, tip1: .35, nib: .05 }));
    k.add(k.tendril([x - ux * 4, y - uy * 4], [x - ux * 16 + k.r(4), y - uy * 16], { sag: 3, curl: 2, w: 1.1, tip: .3 }));
    let g = `<g transform="rotate(${a} ${x} ${y})">` + k.fill(k.shape(soft(x - w / 2, y - h / 2, w, h, phone ? 2.6 : 2.4), { wob: .3, tension: .9 }));
    const [sx, sy, sw, sh] = phone ? [x - 3.7, y - 6.6, 7.4, 9.6] : [x - 7.4, y - 3.4, 10.4, 5.2];
    g += k.fill(k.shape(soft(sx, sy, sw, sh, 1.2), { wob: .15, tension: .9 }), 'paper', ` stroke="${FLARE}" stroke-width="1.1"`);
    g += phone ? k.brush([[x, sy + 2], [x, sy + 5.6]], { w: 1.5, per: 2, tip0: .8, tip1: .5 }) + `<circle cx="${x}" cy="${(sy + 7.6).toFixed(1)}" r=".75" fill="#07060A"/>` : k.brush([[sx + 2, y - .8], [sx + 6.4, y - .8]], { w: 1.4, per: 2, tip0: .8, tip1: .8 }) + `<circle cx="${(sx + 8.2).toFixed(1)}" cy="${y - .8}" r=".7" fill="#07060A"/>`;
    g += k.buzz(x, y, w / 2, { w: 1, rings: 1 });
    k.add(g + '</g>');
  });
  k.add(k.stipple(100, 104, 90, 6, 18, { size: .8 }));
  return k.svg();
}

// ---------- The Hunter: hooded, leaning into the screen, the spike under the crosshair ----------
function hunter(key) {
  const k = kit.scene({ key, seed: 51, spot: CYAN });
  // The screen lights the wall behind it and the desk under it.
  k.add(k.glow({ x: 130, y: 40, r: [34, 90], a: [0, 360], sy: .82, step: 4.2, clip: { x: 0, y: 0, w: 200, h: 86 }, w: [.15, 2.2] }));
  k.add(k.glow({ x: 140, y: 84, r: [8, 88], a: [-10, 190], sy: .3, step: 5, clip: { x: 0, y: 86, w: 200, h: 26 }, w: [.2, 1.8] }));
  k.add(k.brush([[0, 86.4], [80, 85.6], [200, 86.2]], { w: 1.6, tip0: .5, tip1: .5 }));
  // Cables root down from the monitor into the desk and over its edge.
  k.add(k.tendrils([[[128, 62], [112, 94], { sag: 5, curl: 2, w: 1.5, tip: .4, thorns: 2 }], [[160, 62], [182, 100], { sag: 6, curl: 2.5, w: 1.6, tip: .3, thorns: 2 }]]));
  k.add(k.drips(150, 196, 87, 3, { len: [3, 9], w: 1.2 }));
  // The monitor and its screen: a graph with one spike, the crosshair on it in cyan over an ink keyline.
  k.add(k.fill(k.shape([[112, 13], [144, 10.5], [176, 12], [178, 38], [176, 64], [144, 65.5], [111, 64], [110, 38]], { wob: .4, tension: .6 })));
  k.add(k.fill(k.shape([[116, 17], [144, 15], [172, 16.5], [173.5, 38], [172, 60], [144, 61.4], [116, 60], [114.6, 38]], { wob: .3, tension: .6 }), 'paper'));
  k.add(k.brush([[118, 54], [126, 52], [133, 55], [139, 51], [145, 53], [149, 26], [153, 54], [160, 50], [170, 51.5]], { w: 1.6, tip0: .3, tip1: .3, per: 4 }));
  k.add(k.staticNoise({ x: 117, y: 19, w: 54, h: 30 }, 5, { sw: .5 }));
  k.add(`<circle cx="149" cy="30" r="8.4" fill="none" stroke="#07060A" stroke-width="3"/><circle cx="149" cy="30" r="8.4" fill="none" stroke="${CYAN}" stroke-width="1.5"/>`);
  k.add(`<path d="M149 17v6M149 37v6M136 30h6M156 30h6" stroke="#07060A" stroke-width="2.8"/><path d="M149 17v6M149 37v6M136 30h6M156 30h6" stroke="${CYAN}" stroke-width="1.3"/>`);
  k.add(k.fill(k.shape([[139, 64], [149, 64], [152, 72], [136, 72]], { wob: .3, tension: .5 })));
  // Keyboard under the reaching hand.
  k.add(k.fill(k.shape([[106, 76], [128, 75.2], [150, 76], [151, 81], [128, 81.8], [105, 81]], { wob: .3, tension: .5 })), k.stipple(128, 78.4, 20, 2, 18, { size: .7, bias: .6 }));
  // The Hunter: hooded, cloaked, leaning in, one arm reaching for the keys. Rim-lit by the screen.
  const cloak = k.shape([[74, 50], [92, 48], [106, 56], [112, 66], [106, 72], [100, 68], [102, 86], [106, 114], [40, 114], [46, 90], [56, 64]], { wob: .6 });
  k.add(k.fill(cloak), k.brush([[96, 58], [108, 66], [118, 74], [124, 77]], { w: 6, tip0: 1, tip1: .5 }));
  const hood = k.shape([[64, 40], [72, 30], [84, 23], [97, 25], [105, 33], [107, 44], [101, 51], [88, 55], [76, 52], [70, 46]], { wob: .4 });
  k.add(k.fill(hood));
  k.add(k.brushes([[[[84, 23.6], [97, 25.4], [104, 33], [106.4, 43], [101, 50.6]], { w: 1.4, tip0: .1, tip1: .1 }], [[[100, 54], [109, 62], [118, 71.6], [124, 75.4]], { w: 1.2, tip0: .1, tip1: .1 }], [[[103, 70], [102, 86], [105, 112]], { w: .9, tip0: .2, tip1: .1 }]], 'paper'));
  // The face is a void under the hood; one cyan reflection of the screen in it.
  k.add(k.fill(k.oval(100, 41, 3.4, 5, { n: 8 })), `<path d="M100.6 39.4v3.2" stroke="${CYAN}" stroke-width="1.3"/>`);
  return k.svg();
}

const out = {
  art: { mailer: mailer('mailer'), sit_pager: pager('sit_pager'), HUN: hunter('HUN'), apt: boss('apt', { w: 200, h: 112 }), _boss: { apt: boss('Bapt') } },
  print: { boss_apt: boss('{{SID}}') },
};
fs.writeFileSync(path.join(__dirname, 'ink-art.json'), JSON.stringify(out, null, 1) + '\n');
const sz = { mailer: out.art.mailer.length, sit_pager: out.art.sit_pager.length, HUN: out.art.HUN.length, apt: out.art.apt.length, '_boss.apt': out.art._boss.apt.length, boss_apt: out.print.boss_apt.length };
console.log(sz);
module.exports = out;
