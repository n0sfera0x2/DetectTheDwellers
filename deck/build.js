// Builds the print deck into dist/deck/: eight Letter sheets of fronts and eight of mirrored backs.
// Print at 100%, duplex, flip on the long edge.
//
// Sheet math (96 px = 1 in). Letter is 816 × 1056. Nine poker cards (240 × 336 trim) in a 3 × 3 block
// make 720 × 1008. A separate 1/8 in (12 px) bleed around every card would need 3 × 360 = 1080 px of
// height, more than the sheet, so the cards butt edge to edge and share cut lines. The 12 px bleed runs
// around the outside of the block (744 × 1032, left 36, top 12) in the side's ground colour, so a cut a
// hair off lands on the same ground. Crop marks sit outside the bleed, on every cut line. The block is
// centred left-right (48 px each side), so the mirrored backs register with the fronts on a long-edge flip.
//
// Also writes all-sheets.html (the sixteen pages in one file, which scripts/build-pdf.js prints) and
// preview.html (deck/preview.js: every card with bleed, trim and safe-zone guides).
const fs = require('fs'), path = require('path');
const { deck, meta } = require('./cards');
const { FACES, fonts, groundOf } = require('./render');
const preview = require('./preview');
const OUT = path.join(__dirname, '..', 'dist', 'deck');

const SHEETS = 8; // 72 cards, nine to a sheet (the eighth is the marker sheet)
const W = 816, H = 1056, CW = 240, CH = 336, BLEED = 12;
const X0 = (W - 3 * CW) / 2, Y0 = (H - 3 * CH) / 2; // trim block origin: 48, 24

function cropMarks() {
  const xs = [0, 1, 2, 3].map(i => X0 + i * CW), ys = [0, 1, 2, 3].map(i => Y0 + i * CH);
  const gap = 3, len = 14, l = [];
  for (const x of xs) l.push([x, Y0 - BLEED - gap - 9, x, Y0 - BLEED - gap], [x, Y0 + 3 * CH + BLEED + gap, x, Y0 + 3 * CH + BLEED + gap + 9]);
  for (const y of ys) l.push([X0 - BLEED - gap - len, y, X0 - BLEED - gap, y], [X0 + 3 * CW + BLEED + gap, y, X0 + 3 * CW + BLEED + gap + len, y]);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; left: 0; top: 0" aria-hidden="true">${l.map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#000" stroke-width="0.75"/>`).join('')}</svg>`;
}

function page(cards, caption) {
  // Each card's ground runs out only across the block's outer edges, so neighbours never paint into each other.
  const bleed = cards.map((c, i) => {
    const col = i % 3, row = Math.floor(i / 3), l = col === 0 ? BLEED : 0, r = col === 2 ? BLEED : 0, t = row === 0 ? BLEED : 0, b = row === 2 ? BLEED : 0;
    return `<div style="position: absolute; left: ${X0 + col * CW - l}px; top: ${Y0 + row * CH - t}px; width: ${CW + l + r}px; height: ${CH + t + b}px; background: ${groundOf(c)}"></div>`;
  }).join('');
  return `<div class="sheet" style="width: ${W}px; height: ${H}px; position: relative; overflow: hidden; background: #FFFFFF; font-family: 'Chakra Petch', sans-serif; font-weight: 500; color: #1A1418">\n`
    + `${bleed}\n`
    + `<div class="cards" style="position: absolute; left: ${X0}px; top: ${Y0}px; width: ${3 * CW}px; height: ${3 * CH}px; display: grid; grid-template-columns: repeat(3, ${CW}px); grid-template-rows: repeat(3, ${CH}px)">\n${cards.map(c => c + '\n').join('')}</div>\n`
    + `${cropMarks()}\n`
    + `<div style="position: absolute; left: 6px; top: 0; height: ${H}px; writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; white-space: nowrap; font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 9.5px; line-height: 12px; letter-spacing: 0.04em; color: #5A4B43">${caption}</div>\n</div>`;
}
const doc = (title, body, embed = true) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${title}</title>\n<style>${embed ? fonts() + '\n' : ''}body{margin:0} @page{size:8.5in 11in;margin:0} @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

function build() {
  const items = deck();
  if (items.length !== SHEETS * 9) throw new Error(`deck has ${items.length} cards, expected ${SHEETS * 9}`);
  fs.mkdirSync(OUT, { recursive: true });
  const sheets = [], pages = [];
  const note = 'trim 2.5 × 3.5 in · shared cut lines · 1/8 in bleed · cut on crop marks';
  for (let s = 0; s < SHEETS; s++) {
    const ch = items.slice(s * 9, s * 9 + 9), fr = ch.map(c => c[0]), bk = ch.map(c => c[1]);
    const mirrored = [0, 1, 2].flatMap(r => bk.slice(r * 3, r * 3 + 3).reverse()); // backs mirror left-right for long-edge duplex
    const f = `sheet-${s + 1}-fronts.html`, b = `sheet-${s + 1}-backs.html`;
    const pf = page(fr, `Detect the Dwellers · sheet ${s + 1} of ${SHEETS} · fronts · print at 100% · ${note}`);
    const pb = page(mirrored, `Detect the Dwellers · sheet ${s + 1} of ${SHEETS} · backs · flip on long edge · ${note}`);
    fs.writeFileSync(path.join(OUT, f), doc(`Detect the Dwellers sheet ${s + 1} fronts`, pf));
    fs.writeFileSync(path.join(OUT, b), doc(`Detect the Dwellers sheet ${s + 1} backs`, pb));
    sheets.push([f, b]);
    const idx = ch.map((_, i) => s * 9 + i), midx = [0, 1, 2].flatMap(r => idx.slice(r * 3, r * 3 + 3).reverse());
    pages.push({ html: pf, cards: fr, slots: idx, side: 'f', label: `Sheet ${s + 1} fronts` }, { html: pb, cards: mirrored, slots: midx, side: 'b', label: `Sheet ${s + 1} backs` });
  }
  // All sixteen pages in sheet order (fronts, then its backs), one Letter page each: scripts/build-pdf.js prints this.
  fs.writeFileSync(path.join(OUT, 'all-sheets.html'), doc('Detect the Dwellers · all sheets', pages.map(p => p.html.replace('<div class="sheet" style="', '<div class="sheet" style="break-after: page; ')).join('\n')));
  fs.writeFileSync(path.join(OUT, 'preview.html'), preview(items, meta(), pages, { X0, Y0, BLEED }));
  const links = sheets.map(([f, b], i) => `<li>Sheet ${i + 1}: <a href="${f}">fronts</a> · <a href="${b}">backs</a></li>`).join('\n');
  fs.writeFileSync(path.join(OUT, 'index.html'), doc('Detect the Dwellers · print deck', `<main style="font-family: system-ui, sans-serif; padding: 24px; max-width: 640px"><h1>Detect the Dwellers · print deck</h1><p>${SHEETS * 9} poker-size cards (2.5 × 3.5 in) on ${SHEETS} Letter sheets; sheet ${SHEETS} is the marker cards. Print each fronts page, then its backs page on the reverse: 100% scale, duplex, flip on the long edge. Cut on the crop marks. The cards share cut lines and carry a 1/8 in bleed around each block of nine; a home printer may not reach the outer bleed, which is fine.</p><ol style="list-style: none; padding: 0">\n${links}\n</ol><p><a href="all-sheets.html">All ${SHEETS * 2} pages in one file</a> · <a href="preview.html">Print preview</a>: every card with bleed, trim and safe-zone guides.</p></main>`, false));
  return items;
}
if (require.main === module) { build(); console.log(`built dist/deck/ (${SHEETS} sheets, ${SHEETS * 9} cards)`); }
module.exports = { build, FACES, SHEETS };
