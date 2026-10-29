// Builds the print-and-play PDF, exports/detect-the-dwellers-pnp.pdf, from the seven 9-up Letter sheets:
// fourteen pages in sheet order, each fronts page followed by its mirrored backs page, so a duplex print
// (flip on the long edge) puts every back behind its front. Crop marks and the outer bleed are kept.
// Print at 100% (actual size). Usage: npm run export:pdf
const fs = require('fs'), path = require('path');
const { build } = require('../deck/build');
const { launch, fontsReady } = require('../deck/browser');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'exports'), PDF = path.join(OUT, 'detect-the-dwellers-pnp.pdf');

// Page count and first page size (points) read from the PDF's page objects.
function inspect(buf) {
  const s = buf.toString('latin1');
  const pages = (s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  const box = s.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return { pages, size: box ? [box[3] - box[1], box[4] - box[2]].map(Number) : null };
}

async function buildPdf() {
  build();
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    await page.goto('file://' + path.join(ROOT, 'dist', 'deck', 'all-sheets.html'));
    if (!(await fontsReady(page))) throw new Error('embedded fonts did not load');
    await page.pdf({ path: PDF, width: '8.5in', height: '11in', margin: { top: 0, right: 0, bottom: 0, left: 0 }, printBackground: true, scale: 1, preferCSSPageSize: true });
  } finally { await browser.close(); }
  const info = inspect(fs.readFileSync(PDF));
  if (info.pages !== 14) throw new Error(`PDF has ${info.pages} pages, expected 14`);
  if (!info.size || Math.round(info.size[0]) !== 612 || Math.round(info.size[1]) !== 792) throw new Error(`PDF page is ${info.size}, expected 612 × 792 pt (Letter)`);
  return info;
}

if (require.main === module) buildPdf().then(i => console.log(`exports/detect-the-dwellers-pnp.pdf: ${i.pages} pages, ${i.size.join(' × ')} pt (Letter)`)).catch(err => { console.error(err); process.exit(1); });
module.exports = { buildPdf, inspect };
