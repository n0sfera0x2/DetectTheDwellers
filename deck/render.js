// Standalone card faces for export: one face at trim plus 1/8 in bleed on every side (264 × 360 CSS px,
// 2.75 × 3.75 in). The card markup is the same deck/cards.js template the sheets use, set 12 px in from
// each edge on its own ground colour, so the trim area renders exactly as it does on a sheet. No face has
// art or a frame line that reaches the trim edge, so the bleed is the card's flat ground: paper on fronts,
// the night ground on backs.
const fs = require('fs'), path = require('path');
const { PAPER } = require('./cards');
const FONT_DIR = path.join(__dirname, '..', 'fonts');

// Trim, bleed and safe zone in CSS px at 96 dpi. Safe zone: 1/8 in inside trim (216 × 312).
const CW = 240, CH = 336, BLEED = 12, SAFE = 12;

// Chakra Petch and IBM Plex Mono, embedded so every page renders with no network. Only the weights the
// cards and captions use; test/deck.test.js fails if rendered text asks for a face that isn't here.
const FACES = [['Chakra Petch', 500], ['Chakra Petch', 700], ['IBM Plex Mono', 600]];
let fontCss;
const fonts = () => fontCss || (fontCss = FACES.map(([fam, w]) => {
  const b64 = fs.readFileSync(path.join(FONT_DIR, `${fam.replace(/ /g, '')}-${w}.woff2`)).toString('base64');
  return `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}).join('\n'));

// Each card's ground, read from its shell, so a bleed matches the card it belongs to.
const groundOf = html => (html.match(/^<div class="card" style="[^"]*?background: (#[0-9A-Fa-f]{6})/) || [, PAPER])[1];

// Bleed edge (red), trim (black dashes on a white line, so it shows on dark backs too) and safe zone (green) for one face with bleed, as an overlay.
const guides = (b = BLEED) => `<svg class="guides" width="${CW + 2 * b}" height="${CH + 2 * b}" viewBox="0 0 ${CW + 2 * b} ${CH + 2 * b}" style="position: absolute; left: 0; top: 0; pointer-events: none" aria-hidden="true">`
  + `<rect x="0.5" y="0.5" width="${CW + 2 * b - 1}" height="${CH + 2 * b - 1}" fill="none" stroke="#E0002A" stroke-width="1"/>`
  + `<rect x="${b}" y="${b}" width="${CW}" height="${CH}" fill="none" stroke="#FFF" stroke-width="0.75"/><rect x="${b}" y="${b}" width="${CW}" height="${CH}" fill="none" stroke="#000" stroke-width="0.75" stroke-dasharray="4 3"/>`
  + `<rect x="${b + SAFE}" y="${b + SAFE}" width="${CW - 2 * SAFE}" height="${CH - 2 * SAFE}" fill="none" stroke="#00A050" stroke-width="0.75"/></svg>`;

// One face with bleed, as a positioned block: ground across the whole 264 × 360, card at (12, 12).
const bleedFace = (html, withGuides = false) => `<div class="bleed" style="position: relative; width: ${CW + 2 * BLEED}px; height: ${CH + 2 * BLEED}px; overflow: hidden; background: ${groundOf(html)}; font-family: 'Chakra Petch', sans-serif; font-weight: 500"><div style="position: absolute; left: ${BLEED}px; top: ${BLEED}px">${html}</div>${withGuides ? guides() : ''}</div>`;

// A whole HTML document for one face with bleed, fonts embedded. The exporter screenshots its body.
const faceDoc = (html, { title = 'Detect the Dwellers card', withGuides = false } = {}) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${title}</title>\n<style>${fonts()}\nhtml,body{margin:0;width:${CW + 2 * BLEED}px;height:${CH + 2 * BLEED}px;overflow:hidden}</style>\n</head>\n<body>\n${bleedFace(html, withGuides)}\n</body>\n</html>\n`;

module.exports = { CW, CH, BLEED, SAFE, FACES, fonts, groundOf, guides, bleedFace, faceDoc };
