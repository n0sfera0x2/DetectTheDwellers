// Builds the print deck into dist/deck/: six Letter sheets of fronts and six of mirrored backs.
// Print at 100%, duplex, flip on the long edge.
const fs = require('fs'), path = require('path');
const { deck } = require('./cards');
const OUT = path.join(__dirname, '..', 'dist', 'deck');
const FONTS = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&amp;family=Chakra+Petch:wght@600;700&amp;family=Share+Tech+Mono&amp;family=Rajdhani:wght@500;600;700&amp;display=swap';

function page(cards, caption) {
  return `<div style="width: 816px; height: 1056px; position: relative; overflow: hidden; background: #FFFFFF; font-family: 'Spectral', Georgia, serif; color: #0E0E0E">\n<div style="position: absolute; left: 46px; top: 22px; width: 724px; height: 1012px; box-sizing: border-box; padding: 1px; background: #484848; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, 336px); gap: 1px">\n${cards.map(c => c + '\n').join('')}</div>\n<div style="position: absolute; left: 46px; top: 1038px; font-size: 9px; line-height: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #767676">${caption}</div>\n</div>`;
}
const doc = (title, body) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${title}</title>\n<link href="${FONTS}" rel="stylesheet">\n<style>body{margin:0} @page{size:8.5in 11in;margin:0} @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

function build() {
  const items = deck();
  if (items.length !== 54) throw new Error(`deck has ${items.length} cards, expected 54`);
  fs.mkdirSync(OUT, { recursive: true });
  const sheets = [];
  for (let s = 0; s < 6; s++) {
    const ch = items.slice(s * 9, s * 9 + 9), fr = ch.map(c => c[0]), bk = ch.map(c => c[1]);
    const mirrored = [0, 1, 2].flatMap(r => bk.slice(r * 3, r * 3 + 3).reverse()); // backs mirror left-right for long-edge duplex
    const f = `sheet-${s + 1}-fronts.html`, b = `sheet-${s + 1}-backs.html`;
    fs.writeFileSync(path.join(OUT, f), doc(`Detect the Dwellers sheet ${s + 1} fronts`, page(fr, `Detect the Dwellers · sheet ${s + 1} of 6 · fronts · print at 100%`)));
    fs.writeFileSync(path.join(OUT, b), doc(`Detect the Dwellers sheet ${s + 1} backs`, page(mirrored, `Detect the Dwellers · sheet ${s + 1} of 6 · backs · duplex, flip on long edge`)));
    sheets.push([f, b]);
  }
  const links = sheets.map(([f, b], i) => `<li>Sheet ${i + 1}: <a href="${f}">fronts</a> · <a href="${b}">backs</a></li>`).join('\n');
  fs.writeFileSync(path.join(OUT, 'index.html'), doc('Detect the Dwellers · print deck', `<main style="font-family: system-ui, sans-serif; padding: 24px; max-width: 640px"><h1>Detect the Dwellers · print deck</h1><p>54 poker-size cards on six Letter sheets. Print each fronts page, then its backs page on the reverse: 100% scale, duplex, flip on the long edge. Dark full-bleed cards print best at a print shop.</p><ol style="list-style: none; padding: 0">\n${links}\n</ol></main>`));
  return items;
}
if (require.main === module) { build(); console.log('built dist/deck/ (6 sheets, 54 cards)'); }
module.exports = { build };
