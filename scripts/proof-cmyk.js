// Soft-proofs the print deck in CMYK before anything goes to a printer. The deck is designed in RGB, and the
// neon cyan and flare orange sit outside what process ink can print. This shows how far each one moves.
//   exports/cmyk_proof/<card>.png   each single from exports/cards_singles, sent to CMYK and back to sRGB
//   exports/cmyk_proof/index.html  the original and the proof side by side, card by card
//   exports/cmyk_proof/palette.md  every deck colour, its proofed value and the shift (CIE76 ΔE)
// It uses macOS `sips` and its Generic CMYK profile, a stand-in until the printer names theirs: set CMYK_PROFILE
// to the printer's .icc (a FOGRA or SWOP profile) for a real proof. Run `npm run export:cards` first.
// Usage: npm run proof:cmyk
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { launch } = require('../deck/browser');

const ROOT = path.join(__dirname, '..'), SINGLES = path.join(ROOT, 'exports', 'cards_singles'), OUT = path.join(ROOT, 'exports', 'cmyk_proof');
const SYS = '/System/Library/ColorSync/Profiles', CMYK = process.env.CMYK_PROFILE || path.join(SYS, 'Generic CMYK Profile.icc'), SRGB = path.join(SYS, 'sRGB Profile.icc');
// Shifts past this ΔE are visible side by side; past 10 the colour reads as a different colour (B: starting
// thresholds, to recheck against a printed proof).
const NOTICE = 5, BIG = 10;

// The deck palette, read from the card templates so it can't drift from them.
function palette() {
  const src = fs.readFileSync(path.join(ROOT, 'deck', 'cards.js'), 'utf8'), out = [];
  for (const m of src.matchAll(/\b([A-Z]{2,5}) = '(#[0-9A-Fa-f]{6})'/g)) out.push({ name: m[1], hex: m[2].toUpperCase() });
  return out;
}
// sRGB → CMYK → sRGB through the profiles.
function roundTrip(src, dest) {
  const tif = dest.replace(/\.png$/, '.cmyk.tiff');
  execFileSync('sips', ['-m', CMYK, src, '-s', 'format', 'tiff', '--out', tif], { stdio: 'ignore' });
  execFileSync('sips', ['-m', SRGB, tif, '-s', 'format', 'png', '--out', dest], { stdio: 'ignore' });
  fs.unlinkSync(tif);
}
// CIE76 ΔE between two sRGB hex colours.
function lab(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const x = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
const hex = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

(async () => {
  if (process.platform !== 'darwin') throw new Error('proof:cmyk uses macOS sips; on other systems, proof with the printer’s tool');
  if (!fs.existsSync(CMYK)) throw new Error(`no CMYK profile at ${CMYK}: set CMYK_PROFILE to an .icc file`);
  if (!fs.existsSync(SINGLES)) throw new Error('no exports/cards_singles: run `npm run export:cards` first');
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

  // The palette as a strip of flat swatches, proofed the same way the cards are, then read back pixel by pixel.
  const pal = palette(), browser = await launch(), page = await browser.newPage({ viewport: { width: pal.length * 40, height: 40 } });
  await page.setContent(`<body style="margin:0;display:flex">${pal.map(p => `<div style="width:40px;height:40px;background:${p.hex}"></div>`).join('')}</body>`);
  const strip = path.join(OUT, 'palette.src.png'), proofed = path.join(OUT, 'palette.png');
  await page.screenshot({ path: strip }); roundTrip(strip, proofed);
  await page.goto('file://' + proofed);
  const got = await page.evaluate(n => { const img = document.images[0], c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    return Array.from({ length: n }, (_, i) => Array.from(x.getImageData(i * 40 + 20, 20, 1, 1).data.slice(0, 3))); }, pal.length);
  await browser.close(); fs.unlinkSync(strip);
  const rows = pal.map((p, i) => ({ ...p, proof: hex(got[i]), d: dE(p.hex, hex(got[i])) })).sort((a, b) => b.d - a.d);
  const verdict = d => d > BIG ? 'reads as a different colour' : d > NOTICE ? 'visibly duller' : 'holds';
  fs.writeFileSync(path.join(OUT, 'palette.md'), `# CMYK soft proof: deck palette\n\nProfile: ${path.basename(CMYK)}. ΔE is CIE76 between the design colour and its CMYK round trip.\n\n| Colour | Design | Proof | ΔE | Verdict |\n| --- | --- | --- | --- | --- |\n`
    + rows.map(r => `| ${r.name} | ${r.hex} | ${r.proof} | ${r.d.toFixed(1)} | ${verdict(r.d)} |`).join('\n') + '\n');

  // Every single, proofed, and a side-by-side page to flip through.
  const cards = fs.readdirSync(SINGLES).filter(f => f.endsWith('.png')).sort();
  for (const f of cards) roundTrip(path.join(SINGLES, f), path.join(OUT, f));
  fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>CMYK soft proof</title><body style="font-family:system-ui;background:#888;margin:24px">`
    + `<h1>CMYK soft proof · ${path.basename(CMYK)}</h1><p>Left: the RGB export. Right: after CMYK and back. See palette.md for the numbers.</p>`
    + cards.map(f => `<figure style="display:inline-block;margin:0 24px 24px 0"><img src="../cards_singles/${f}" width="275"> <img src="${f}" width="275"><figcaption>${f}</figcaption></figure>`).join('') + '</body>');

  for (const r of rows) console.log(`${r.name.padEnd(6)} ${r.hex} → ${r.proof}  ΔE ${r.d.toFixed(1).padStart(5)}  ${verdict(r.d)}`);
  console.log(`\nproofed ${cards.length} singles into exports/cmyk_proof/ (open index.html)`);
})().catch(e => { console.error(e.message); process.exit(1); });
