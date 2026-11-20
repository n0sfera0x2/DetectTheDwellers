// Detect the Dwellers: the pixel die (2026-11-20). The body is PixelLab's blank die (sprites/src/die_blank.png),
// traced into this 32 × 32 map so the page can recolour it: # outline, b body, h highlight, m and s shade. The pips
// are drawn on the front face (x 4–22, y 7–24) as 4 × 4 blocks, so every number reads exactly.
//
// pixDie(n, px) returns an <svg class="pip"> like cards.js pip(): the body cells are <rect>s (the page's
// `.pip rect{fill}` rules recolour the die: amber row dice, grey taken dice) and the pips are <path class="p">.
// The web page uses it; the print cards keep the vector pips.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CDDie = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MAP = [
    '......####################......',
    '....########################....',
    '...##########################...',
    '..####bhhhhhhhhhhhhhhhhhhh####..',
    '.####hhhhhhhhhhhhhhhhhhhh#s####.',
    '.###h####################mms###.',
    '###hh###################m##mm###',
    '###hhbbbbbbbbbbbbbbbbbb##mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '###hbbbbbbbbbbbbbbbbbbbm#mmmm###',
    '####bbbbbbbbbbbbbbbbbbmm#mmmm###',
    '#####mmmmmmmmmmmmmmmmmm###mmm###',
    '.###m###################mm#m###.',
    '.####mmmmmmmmmmmmmmmmmmmmmm####.',
    '..####mmmmmmmmmmmmmmmmmmmm####..',
    '...##########################...',
    '....########################....',
    '......####################......',
  ];
  // Runs of one class per row → SVG path data ("M x y h w v1 h-w z" per run), so the die is a handful of elements.
  const runs = test => MAP.map((row, y) => { let d = '', x = 0;
    while (x < row.length) { if (!test(row[x])) { x++; continue; } let e = x; while (e < row.length && test(row[e])) e++; d += `M${x} ${y}h${e - x}v1h-${e - x}z`; x = e; }
    return d; }).join('');
  const BODY = MAP.map((row, y) => { const out = []; let x = 0;
    while (x < row.length) { if (!'bhms'.includes(row[x])) { x++; continue; } let e = x; while (e < row.length && 'bhms'.includes(row[e])) e++; out.push(`<rect x="${x}" y="${y}" width="${e - x}" height="1"/>`); x = e; }
    return out.join(''); }).join('');
  const OUTLINE = runs(c => c === '#'), HI = runs(c => c === 'h'), MID = runs(c => c === 'm'), DARK = runs(c => c === 's');
  // Pips are 4 × 4 blocks on the front face: columns from x 5, 11, 17 and rows from y 9, 14, 19.
  const C = { l: 5, c: 11, r: 17 }, R = { t: 9, m: 14, b: 19 };
  const AT = { 1: [['c', 'm']], 2: [['l', 't'], ['r', 'b']], 3: [['l', 't'], ['c', 'm'], ['r', 'b']], 4: [['l', 't'], ['r', 't'], ['l', 'b'], ['r', 'b']],
    5: [['l', 't'], ['r', 't'], ['c', 'm'], ['l', 'b'], ['r', 'b']], 6: [['l', 't'], ['r', 't'], ['l', 'm'], ['r', 'm'], ['l', 'b'], ['r', 'b']] };
  const pips = n => (AT[n] || []).map(([c, r]) => `M${C[c]} ${R[r]}h4v4h-4z`).join('');

  /** A pixel die showing n (1–6), px wide; the same class and label as cards.js pip(). */
  function pixDie(n, px) {
    return `<svg class="pip px" viewBox="0 0 32 32" width="${px}" height="${px}" shape-rendering="crispEdges" style="display:inline-block;vertical-align:middle" role="img" aria-label="${n}">`
      + `<g fill="#F3E9E2">${BODY}</g><path d="${HI}" fill="#fff" fill-opacity=".55"/><path d="${MID}" fill="#000" fill-opacity=".22"/><path d="${DARK}" fill="#000" fill-opacity=".4"/>`
      + `<path d="${OUTLINE}" fill="#1A1012"/><path class="p" d="${pips(n)}" fill="#1A1012"/></svg>`;
  }
  return { pixDie, MAP };
});
