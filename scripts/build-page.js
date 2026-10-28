// Builds the playable single-file page into dist/index.html:
// ui/head.html + <script> ui/ui.js (with card data, art and engine inlined) + ui/tail.html
// The two type families (Chakra Petch, IBM Plex Mono) are embedded from fonts/ as base64 @font-face,
// so the page renders the same with no network. Only the weights head.html uses: Chakra 500/700, Plex Mono 400/600.
const fs = require('fs'), path = require('path');
const pyjson = require('./pyjson');
const R = p => path.join(__dirname, '..', p);
const read = p => fs.readFileSync(R(p), 'utf8');
const D = JSON.parse(read('data/cards.json')), ART = JSON.parse(read('data/art.json'));
const FONTS = [['Chakra Petch', 'ChakraPetch', [500, 700]], ['IBM Plex Mono', 'IBMPlexMono', [400, 600]]];
const fontCSS = FONTS.flatMap(([family, file, weights]) => weights.map(w =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(R(`fonts/${file}-${w}.woff2`)).toString('base64')}) format("woff2")}`)).join('\n');
const js = read('ui/ui.js')
  .replace('__DATA__', () => pyjson(D))
  .replace('__ART__', () => pyjson(ART, true))
  .replace('__ENGINE__', () => read('src/engine.js').replace(/\n$/, ''));
const html = read('ui/head.html').replace('/*__FONTS__*/', () => fontCSS) + '<script>\n' + js + read('ui/tail.html');
fs.mkdirSync(R('dist'), { recursive: true });
fs.writeFileSync(R('dist/index.html'), html);
console.log(`built dist/index.html (${Math.round(html.length / 1024)} kB)`);
