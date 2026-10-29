// Exports every card as a print-ready single for MakePlayingCards / The Game Crafter style uploads:
//   exports/cards_singles/NN_slug.png  one per distinct front, 825 × 1125 (2.75 × 3.75 in at 300 dpi, 1/8 in bleed)
//   exports/cards_singles/card_back.png  the shared back; the two double-sided references get NN_slug_back.png
//   exports/manifest.csv               index, id, name, type, quantity, front file, back file
//   exports/detect-the-dwellers-singles.zip  the singles plus the manifest
// Copies print from one image: the 16 kit cards are 8 fronts × 2, the 4 HP trackers one front × 4.
// Quantities add up to 54. Faces render from deck/cards.js through deck/render.js at 96 dpi CSS layout,
// with deviceScaleFactor 300/96 so the pixels come out at 300 dpi. Usage: npm run export:cards
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { deck, meta } = require('../deck/cards');
const { faceDoc, CW, CH, BLEED } = require('../deck/render');
const { launch, fontsReady } = require('../deck/browser');

const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'exports'), SINGLES = path.join(OUT, 'cards_singles');
const DPI = 300, SCALE = DPI / 96, PX = [Math.round((CW + 2 * BLEED) * SCALE), Math.round((CH + 2 * BLEED) * SCALE)]; // 825 × 1125

// Card markup with its scene art taken out (the art differs per copy only in its unique SVG ids).
const bare = html => html.replace(/<svg viewBox="0 0 (?!16 16)[^"]*"[\s\S]*?<\/svg>/g, '<ART/>');
const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// The upload list: one entry per distinct card, in deck order, with how many copies it prints.
function plan() {
  const items = deck(), info = meta(), commonBack = bare(items[0][1]), out = [], byId = new Map();
  items.forEach(([front, back], i) => {
    const m = info[i], seen = byId.get(m.id);
    if (seen) {
      if (bare(front) !== bare(seen.front) || bare(back) !== bare(seen.back)) throw new Error(`copies of ${m.id} differ (card ${i + 1})`);
      seen.quantity++;
      return;
    }
    const n = String(out.length + 1).padStart(2, '0'), s = slug(m.name);
    const own = bare(back) !== commonBack;
    const e = { index: out.length + 1, ...m, quantity: 1, front, back, frontFile: `${n}_${s}.png`, backFile: own ? `${n}_${s}_back.png` : 'card_back.png' };
    byId.set(m.id, e); out.push(e);
  });
  const total = out.reduce((a, e) => a + e.quantity, 0);
  if (total !== 54) throw new Error(`manifest counts ${total} cards, expected 54`);
  return out;
}

const csvCell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const manifestCsv = entries => ['index,id,name,type,quantity,front_file,back_file',
  ...entries.map(e => [e.index, e.id, e.name, e.type, e.quantity, e.frontFile, e.backFile].map(csvCell).join(','))].join('\n') + '\n';

// A minimal zip writer (deflate, no dependency). files: [{ name, data: Buffer }].
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) {
  const parts = [], central = [];
  let offset = 0;
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const { name, data } of files) {
    const nm = Buffer.from(name), z = zlib.deflateRawSync(data), crc = crc32(data);
    const head = (sig, extra) => { const h = Buffer.alloc(extra); h.writeUInt32LE(sig, 0); return h; };
    const lh = head(0x04034b50, 30);
    lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(z.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26);
    const ch = head(0x02014b50, 46);
    ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(z.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(offset, 42);
    parts.push(lh, nm, z); central.push(ch, nm);
    offset += lh.length + nm.length + z.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

// Renders one face (card markup) with bleed to a PNG buffer at 300 dpi. page: from openPage().
async function renderFace(page, html) {
  await page.setContent(faceDoc(html));
  if (!(await fontsReady(page))) throw new Error('embedded fonts did not load');
  return page.screenshot({ type: 'png' });
}
const openPage = browser => browser.newPage({ viewport: { width: CW + 2 * BLEED, height: CH + 2 * BLEED }, deviceScaleFactor: SCALE });

async function exportCards() {
  const entries = plan();
  fs.rmSync(SINGLES, { recursive: true, force: true });
  fs.mkdirSync(SINGLES, { recursive: true });
  const browser = await launch(), files = [];
  try {
    const page = await openPage(browser);
    const write = async (name, html) => { const png = await renderFace(page, html); fs.writeFileSync(path.join(SINGLES, name), png); files.push({ name: `cards_singles/${name}`, data: png }); };
    for (const e of entries) {
      await write(e.frontFile, e.front);
      if (!files.some(f => f.name === `cards_singles/${e.backFile}`)) await write(e.backFile, e.back);
    }
  } finally { await browser.close(); }
  const csv = manifestCsv(entries);
  fs.writeFileSync(path.join(OUT, 'manifest.csv'), csv);
  files.push({ name: 'manifest.csv', data: Buffer.from(csv) });
  fs.writeFileSync(path.join(OUT, 'detect-the-dwellers-singles.zip'), zip(files));
  return { entries, files };
}

if (require.main === module) exportCards().then(({ entries, files }) => {
  console.log(`exported ${files.length - 1} PNGs (${PX.join(' × ')}) for ${entries.length} distinct cards, ${entries.reduce((a, e) => a + e.quantity, 0)} total, to exports/`);
  console.log('exports/manifest.csv · exports/detect-the-dwellers-singles.zip');
}).catch(err => { console.error(err); process.exit(1); });
module.exports = { plan, manifestCsv, zip, renderFace, openPage, PX };
