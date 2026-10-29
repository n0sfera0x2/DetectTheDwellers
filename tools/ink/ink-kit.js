// ink-kit: the shared hand for Ink & Static scenes (Detect the Dwellers).
// Seeded and deterministic. Every coordinate is rounded to one decimal. No gradients, no filters.
//
//   const kit = require('./ink-kit');
//   const k = kit.scene({ key: 'mailer', w: 200, h: 112, seed: 11, spot: kit.FLARE });
//   const body = k.shape([[90,40],[120,34],[130,70],[96,84]], { wob: .8 });
//   k.add(k.glow({ x: 30, y: 66, r: [30, 120], a: [-80, 20] }), k.fill(body), k.rim(body, { from: .55, to: .95 }));
//   const svg = k.svg();   // the finished <svg> string
//
// See STYLE.md for the full API and the rules.
'use strict';

const INK = '#07060A', PAPER = '#F3E9E2', FLARE = '#FF5A2A', CYAN = '#3DE0FF', AMBER = '#FFB547';
const TAU = Math.PI * 2, rad = d => d * Math.PI / 180;

function rng(seed) {
  let s = seed | 0;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const f = n => { const v = Math.round(n * 10) / 10; return String(Object.is(v, -0) ? 0 : v); };
const pt = ([x, y]) => f(x) + ' ' + f(y);
// Compact number list: drop leading zeros, no separator before a minus sign.
const g = n => f(n).replace(/^(-?)0\./, '$1.');
const nums = a => a.map(g).reduce((s, v, i) => s + (i && v[0] !== '-' ? ' ' : '') + v, '');
// A polyline in relative coordinates (deltas between rounded points, so nothing drifts).
function relPoly(p, closed = true) {
  const q = p.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), d = [];
  for (let i = 1; i < q.length; i++) d.push(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
  return 'M' + nums(q[0]) + 'l' + nums(d) + (closed ? 'z' : '');
}

// Catmull-Rom through the points, as cubic beziers. closed: loop back to the start.
function splineD(p, closed = true, tension = 1) {
  const n = p.length, gp = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
  const R1 = q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10];
  let cur = R1(p[0]), d = 'M' + nums(cur) + 'c';
  const out = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = gp(i - 1), p1 = gp(i), p2 = gp(i + 1), p3 = gp(i + 2), t = tension / 6;
    const c1 = R1([p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t]), c2 = R1([p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t]), e = R1(p2);
    out.push(c1[0] - cur[0], c1[1] - cur[1], c2[0] - cur[0], c2[1] - cur[1], e[0] - cur[0], e[1] - cur[1]);
    cur = e;
  }
  return d + nums(out) + (closed ? 'z' : '');
}
// Sample the same Catmull-Rom curve as a polyline of about n points per segment.
function sample(p, closed = false, per = 6) {
  const n = p.length, g = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))], o = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const k = per > 0 ? per : Math.max(1, Math.min(6, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / -per)));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) o.push(p[n - 1]);
  return o;
}
const bbox = p => { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
const lerp = (a, b, t) => a + (b - a) * t;

function scene({ key, w = 200, h = 112, seed = 1, spot = FLARE, grain = .2 }) {
  const R = rng(seed), S = key, body = [], clips = [];
  const r = (a = 1) => (R() * 2 - 1) * a;            // signed noise
  const id = n => `${n}-${S}`;
  const colour = t => ({ ink: INK, paper: PAPER, spot }[t] || (/^(h1|h2|h3|st)$/.test(t) ? `url(#${id(t)})` : t));

  // --- shapes -------------------------------------------------------------------------------
  // An organic closed contour through hand-placed points. wob: baked wobble; chip: chance of a chipped notch.
  function shape(pts, { wob = .6, chip = 0, tension = 1 } = {}) {
    let p = pts.map(([x, y]) => [x + r(wob), y + r(wob)]);
    if (chip) { const o = []; p.forEach((q, i) => { o.push(q); const nx = p[(i + 1) % p.length]; if (R() < chip) { const m = [lerp(q[0], nx[0], .5), lerp(q[1], nx[1], .5)], dx = nx[0] - q[0], dy = nx[1] - q[1], L = Math.hypot(dx, dy) || 1; o.push([m[0] - dx / L * .8, m[1] - dy / L * .8], [m[0] - dy / L * 1.4, m[1] + dx / L * 1.4], [m[0] + dx / L * .8, m[1] + dy / L * .8]); } }); p = o; }
    return { d: splineD(p, true, tension), pts: p, bb: bbox(p) };
  }
  // A lumpy oval (sacks, heads, pools). lump: radius wobble as a fraction.
  function oval(cx, cy, rx, ry, { n = 10, lump = .08, rot = 0, wob = .3 } = {}) {
    const p = Array.from({ length: n }, (_, i) => { const a = i / n * TAU, k = 1 + r(lump), x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k, c = Math.cos(rad(rot)), s = Math.sin(rad(rot)); return [cx + x * c - y * s, cy + x * s + y * c]; });
    return shape(p, { wob });
  }
  const fill = (s, tone = 'ink', extra = '') => `<path d="${s.d || s}" fill="${colour(tone)}"${extra}/>`;

  // --- brush --------------------------------------------------------------------------------
  // A tapered brush stroke along a curve: width w, thinning to tip0/tip1 (fractions of w) at the ends,
  // with a nib wobble. Returns a filled path. Thick in shadow, thin toward the light: pass w0/w1 to slope it.
  function brushD(pts, { w = 2, w0 = 1, w1 = 1, tip0 = .1, tip1 = .05, per = -7, nib = .12 } = {}) {
    const s = sample(pts, false, per), n = s.length, L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      const env = Math.min(1, t / .25 + tip0, (1 - t) / .3 + tip1), hw = Math.max(.08, w * lerp(w0, w1, t) * env * (1 + r(nib)) / 2);
      L.push([s[i][0] - dy / m * hw, s[i][1] + dx / m * hw]); Rr.push([s[i][0] + dy / m * hw, s[i][1] - dx / m * hw]);
    }
    return relPoly(L.concat(Rr.reverse()));
  }
  const brush = (pts, o = {}) => `<path d="${brushD(pts, o)}" fill="${colour(o.tone || 'ink')}"/>`;
  // Several brush strokes in one element (same tone).
  const brushes = (list, tone = 'ink') => `<path d="${list.map(([p, o]) => brushD(p, o)).join('')}" fill="${colour(tone)}"/>`;
  // A rim of light: a paper brush stroke laid along part of a shape's contour (from/to are 0..1 of the way round).
  function rim(s, { from = 0, to = .3, w = 1.2, tone = 'paper', inset = .4 } = {}) {
    const p = sample(s.pts, true, 3), n = p.length, i0 = Math.floor(from * n), i1 = Math.floor(to * n), seg = [];
    for (let i = i0; i <= i1; i++) seg.push(p[i % n]);
    const c = [s.bb.x + s.bb.w / 2, s.bb.y + s.bb.h / 2];
    const q = seg.filter((_, i) => i % 2 === 0).map(([x, y]) => { const dx = c[0] - x, dy = c[1] - y, m = Math.hypot(dx, dy) || 1; return [x + dx / m * inset, y + dy / m * inset]; });
    return q.length > 1 ? brush(q, { w, tone, tip0: 0, tip1: 0, per: 3 }) : '';
  }

  // --- hatching -----------------------------------------------------------------------------
  // Form-following hatch clipped to a shape: parallel strokes at angle a, each bowed by bend (positive bows
  // toward the light side), weight rising from w[0] to w[1] across the shape, randomly broken.
  function hatch(s, { a = -38, gap = 2.2, bend = 3, w = [.4, 1], tone = 'ink', broken = .2, cover = [0, 1] } = {}) {
    const cid = id('c' + clips.length); clips.push(`<clipPath id="${cid}"><path d="${s.d}"/></clipPath>`);
    const { x, y, w: bw, h: bh } = s.bb, cx = x + bw / 2, cy = y + bh / 2, D = Math.hypot(bw, bh) / 2 + 2;
    const ux = Math.cos(rad(a)), uy = Math.sin(rad(a)), nx = -uy, ny = ux, groups = {};
    for (let o = -D + cover[0] * 2 * D; o <= -D + cover[1] * 2 * D; o += gap) {
      const t = (o + D) / (2 * D), sw = f(lerp(w[0], w[1], t)), px = cx + nx * o, py = cy + ny * o;
      let a0 = -D;
      while (a0 < D) {
        const len = R() < broken ? 3 + R() * 6 : 2 * D, a1 = Math.min(D, a0 + len);
        const p0 = [px + ux * a0, py + uy * a0], p1 = [px + ux * a1, py + uy * a1], m = [(p0[0] + p1[0]) / 2 + nx * bend * (a1 - a0) / (2 * D), (p0[1] + p1[1]) / 2 + ny * bend * (a1 - a0) / (2 * D)];
        (groups[sw] = groups[sw] || []).push('M' + pt(p0) + 'Q' + pt(m) + ' ' + pt(p1));
        a0 = a1 + 1.2 + R() * 2;
      }
    }
    const paths = Object.entries(groups).map(([sw, ds]) => `<path d="${ds.join('')}" stroke-width="${sw}"/>`).join('');
    return `<g clip-path="url(#${cid})" fill="none" stroke="${colour(tone)}">${paths}</g>`;
  }
  // The torch: a pool of paper light from (x, y) out to r[1], swept from angle a[0] to a[1] (degrees, y down),
  // squashed vertically by sy, with broken ink rings whose weight grows with distance: falloff drawn as
  // engraving, not a gradient. The rings are dashed ellipses clipped to the pool, which keeps the bytes low.
  // clip: optional {x, y, w, h} box the light stays inside (a wall above a floor line).
  function glow({ x, y, r: [r0, r1], a: [a0, a1] = [0, 360], sy = 1, step = 4.6, w = [.15, 1.8], broken = .35, clip, edge = .06 }) {
    const full = a1 - a0 >= 360, n = 9, p = full ? [] : [[x, y]];
    for (let i = 0; i <= (full ? n - 1 : n); i++) { const a = rad(a0 + (a1 - a0) * i / n), k = r1 * (1 + r(edge)); p.push([x + Math.cos(a) * k, y + Math.sin(a) * k * sy]); }
    const pool = splineD(p, true, .6), cid = id('c' + clips.length);
    clips.push(`<clipPath id="${cid}">${clip ? `<rect x="${clip.x}" y="${clip.y}" width="${clip.w}" height="${clip.h}"/>` : `<path d="${pool}"/>`}</clipPath>`);
    let rings = '';
    for (let rr = r0; rr <= r1 * 1.02; rr += step) {
      const t = Math.min(1, (rr - r0) / (r1 - r0)), dash = [];
      for (let j = 0; j < 2; j++) { const on = R() < broken ? 4 + R() * 9 : 16 + R() * 34, off = 1.5 + R() * 4; dash.push(Math.round(on), Math.round(off)); }
      rings += (sy === 1 ? `<circle r="${f(rr)}"` : `<ellipse rx="${f(rr)}" ry="${f(rr * sy)}"`) + ` stroke-width="${g(lerp(w[0], w[1], t * t))}" stroke-dasharray="${dash.join(' ')}"/>`;
    }
    const body = `<path d="${pool}" fill="${PAPER}"/><g fill="none" stroke="${INK}" transform="translate(${f(x)} ${f(y)})">${rings}</g>`;
    return `<g clip-path="url(#${cid})">${body}</g>`;
  }

  // --- grit ---------------------------------------------------------------------------------
  // Stipple: n dots scattered in an oval (cx, cy, rx, ry), denser toward the centre when bias > 1.
  function stipple(cx, cy, rx, ry, n = 40, { tone = 'paper', size = .7, bias = 1.4 } = {}) {
    let d = '';
    for (let i = 0; i < n; i++) { const a = R() * TAU, k = Math.pow(R(), bias); d += `M${pt([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])}h.1`; }
    return `<path d="${d}" stroke="${colour(tone)}" stroke-width="${size}"/>`;
  }
  // Drips hanging from a ledge: n tapered strokes downward from points along [x0, x1] at y.
  const drips = (x0, x1, y, n = 4, { len = [3, 10], w = 1.2, tone = 'ink' } = {}) => brushes(Array.from({ length: n }, () => { const x = lerp(x0, x1, R()), l = lerp(len[0], len[1], R()); return [[[x, y - .5], [x + r(.4), y + l * .6], [x + r(.6), y + l]], { w, tip0: .9, tip1: .02 }]; }), tone);

  // --- connectors ---------------------------------------------------------------------------
  // A cable, vine or tendril from a to b, sagging by sag, wriggling by curl, tapering from w to tip.
  // thorns: number of small barbs or leaves along it. Returns brush strokes as one path.
  function tendrilD(a, b, { sag = 8, curl = 3, w = 1.6, tip = .2, thorns = 0, segs = 4 } = {}) {
    const p = [a];
    for (let i = 1; i < segs; i++) { const t = i / segs, nx = -(b[1] - a[1]), ny = b[0] - a[0], m = Math.hypot(nx, ny) || 1; const c = Math.sin(t * Math.PI) * sag, wig = r(curl); p.push([lerp(a[0], b[0], t) + nx / m * wig, lerp(a[1], b[1], t) + c + ny / m * wig]); }
    p.push(b);
    let d = brushD(p, { w, w0: 1, w1: tip, tip0: 1, tip1: .3, per: -9 });
    const s = sample(p, false, 4);
    for (let i = 0; i < thorns; i++) { const j = 2 + Math.floor(R() * (s.length - 4)), q = s[j], nq = s[j + 1], dx = nq[0] - q[0], dy = nq[1] - q[1], m = Math.hypot(dx, dy) || 1, side = R() < .5 ? 1 : -1, L = 2 + R() * 3; d += brushD([q, [q[0] + dx / m * L * .6 - dy / m * L * side, q[1] + dy / m * L * .6 + dx / m * L * side]], { w: w * .7, tip0: 1, tip1: .02, per: 3 }); }
    return d;
  }
  const tendril = (a, b, o = {}) => `<path d="${tendrilD(a, b, o)}" fill="${colour(o.tone || 'ink')}"/>`;
  const tendrils = (list, tone = 'ink') => `<path d="${list.map(([a, b, o]) => tendrilD(a, b, o || {})).join('')}" fill="${colour(tone)}"/>`;

  // --- atmosphere ---------------------------------------------------------------------------
  // Rain: n thin streaks in a box, slanted by slant. Paper over ink, ink over paper.
  function rain({ x, y, w: bw, h: bh }, n = 30, { slant = .18, len = [4, 9], tone = 'paper', sw = .35, op = .6 } = {}) {
    let d = '';
    for (let i = 0; i < n; i++) { const px = x + R() * bw, py = y + R() * bh, l = lerp(len[0], len[1], R()); d += `M${pt([px, py])}l${f(l * slant)} ${f(l)}`; }
    return `<path d="${d}" stroke="${colour(tone)}" stroke-width="${sw}" opacity="${op}"/>`;
  }
  // Smoke or ectoplasm: wisps rising from (x, y) to height hgt, swaying, as tapered strokes.
  const smoke = (x, y, hgt, { n = 3, sway = 6, w = 1.4, tone = 'paper' } = {}) => brushes(Array.from({ length: n }, (_, i) => { const p = [[x + r(1), y]]; for (let k = 1; k <= 4; k++) p.push([x + Math.sin(k * 1.3 + i * 2 + R()) * sway * k / 4 + r(1), y - hgt * k / 4 * (.7 + R() * .3)]); return [p, { w: w * (1 - i * .2), tip0: .3, tip1: .02 }]; }), tone);
  // Static: short broken horizontal dashes in a box (scanline noise on screens and in the air).
  function staticNoise({ x, y, w: bw, h: bh }, n = 12, { tone = 'ink', sw = .5 } = {}) {
    let d = '';
    for (let i = 0; i < n; i++) d += `M${pt([x + R() * bw * .8, y + R() * bh])}h${f(1 + R() * bw * .25)}`;
    return `<path d="${d}" stroke="${colour(tone)}" stroke-width="${sw}"/>`;
  }
  // Buzz or vibration marks: pairs of tapered arcs either side of (x, y), half-width hw.
  const buzz = (x, y, hw, { tone = 'ink', w = 1, rings = 2 } = {}) => brushes([-1, 1].flatMap(sd => Array.from({ length: rings }, (_, i) => { const o = hw + 2 + i * 2.4, hh = 3 + i * 1.6; return [[[x + sd * o, y - hh], [x + sd * (o + 1.6), y], [x + sd * o, y + hh]], { w, tip0: .1, tip1: .1, per: 3 }]; })), tone);

  // --- shadow -------------------------------------------------------------------------------
  // A cast shadow from a footprint [x0, x1] on the floor line y, thrown away from the light at (lx, ly),
  // length len, splaying by spread. Organic edge.
  function shadow(x0, x1, y, lx, ly, { len = 30, spread = .4, sy = .25 } = {}) {
    const cx = (x0 + x1) / 2, dx = cx - lx, dy = Math.max(1, y - ly), m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m;
    const far = [cx + ux * len, y + uy * len * sy], half = (x1 - x0) / 2 * (1 + spread);
    return fill(shape([[x0, y], [cx, y - .6], [x1, y], [far[0] + half * .5, far[1] + r(1)], [far[0], far[1] + 1.2], [far[0] - half * .5, far[1] + r(1)]], { wob: .4, tension: .7 }));
  }

  // --- assembly -----------------------------------------------------------------------------
  const add = (...els) => { body.push(...els.filter(Boolean)); };
  function defs() {
    const hp = (n, sz, d, sw) => `<pattern id="${id(n)}" width="${sz}" height="${sz}" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="${sz}" height="${sz}" fill="${PAPER}"/><path d="${d}" stroke="${INK}" stroke-width="${sw}"/></pattern>`;
    const st = (n, tf) => `<pattern id="${id(n)}" width="7" height="7" patternUnits="userSpaceOnUse"${tf}><path d="M1 1.2h.6M4.6 2.4h.6M2.8 4.6h.6M6 5.6h.6M.4 6.2h.5M3.6.2h.5" stroke="${PAPER}" stroke-width=".7" stroke-linecap="round"/></pattern>`;
    const used = n => body.some(e => e.includes(`#${id(n)})`));
    return '<defs>' + (used('h1') ? hp('h1', 3.2, 'M0 .4h3.2', .55) : '') + (used('h2') ? hp('h2', 2.2, 'M0 .5h2.2', .9) : '') + (used('h3') ? hp('h3', 2, 'M0 .5h2M.5 0v2', .85) : '')
      + (used('st') ? st('st', '') : '') + (grain ? st('gr', ' patternTransform="rotate(23) scale(.55)"') : '') + clips.join('') + '</defs>';
  }
  // view: {w, h} renders the same drawing into a smaller frame as a centre crop that keeps the full height
  // (a 400×170 boss becomes its 200×112 card scene). Patterns and clips scale with it.
  function svg({ view } = {}) {
    const W = view ? view.w : w, H = view ? view.h : h, k = H / h, tf = view ? ` transform="matrix(${+k.toFixed(4)} 0 0 ${+k.toFixed(4)} ${f((W - w * k) / 2)} 0)"` : '';
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs()}<rect width="${W}" height="${H}" fill="${INK}"/><g stroke-linecap="round" stroke-linejoin="round"${tf}>${body.join('')}</g>${grain ? `<rect width="${W}" height="${H}" fill="url(#${id('gr')})" opacity="${grain}"/>` : ''}</svg>`;
  }
  return { w, h, S, R, r, id, colour, shape, oval, fill, brush, brushes, brushD, rim, hatch, glow, stipple, drips, tendril, tendrils, tendrilD, rain, smoke, staticNoise, buzz, shadow, add, svg, splineD, sample };
}

// Point helpers for scene code.
// soft: the outline of a device (screen, pager, badge, rack unit) with rounded corners, for k.shape(..., { tension: .9 }).
const soft = (x, y, w, h, c = 2) => [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]];
// rot: rotate points about (cx, cy) by deg.
const rot = (pts, cx, cy, deg) => { const a = rad(deg), c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };

module.exports = { scene, rng, splineD, sample, soft, rot, INK, PAPER, FLARE, CYAN, AMBER };
