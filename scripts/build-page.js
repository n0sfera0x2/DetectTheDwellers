// Builds the playable single-file page into dist/index.html:
// ui/head.html + <script> ui/ui.js (with card data, art and engine inlined) + ui/tail.html
// The two type families (Chakra Petch, IBM Plex Mono) are embedded from fonts/ as base64 @font-face,
// so the page renders the same with no network. Only the weights head.html uses: Chakra 500/700, Plex Mono 400/600.
const fs = require('fs'), path = require('path');
const pyjson = require('./pyjson');
const R = p => path.join(__dirname, '..', p);
const read = p => fs.readFileSync(R(p), 'utf8');
const D = JSON.parse(read('data/cards.json')), ART = JSON.parse(read('data/art.json'));
// The print card back (art-print.json) doubles as the web's face-down feed card, so web and print share one back.
const PRINT = JSON.parse(read('data/art-print.json'));
if (PRINT.back && !ART._back) ART._back = PRINT.back.replace(/\{\{SID\}\}/g, 'web');
const FONTS = [['Chakra Petch', 'ChakraPetch', [500, 700]], ['IBM Plex Mono', 'IBMPlexMono', [400, 600]]];
const fontCSS = FONTS.flatMap(([family, file, weights]) => weights.map(w =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(R(`fonts/${file}-${w}.woff2`)).toString('base64')}) format("woff2")}`)).join('\n');
// The two embedded families ship under the SIL Open Font License 1.1 (fonts/README.md); the page names them up top.
const FONT_NOTICE = `<!--
  Detect the Dwellers embeds two font families, each under the SIL Open Font License 1.1:
  Chakra Petch: Copyright 2018 The Chakra Petch Project Authors (https://github.com/m4rc1e/Chakra-Petch.git)
  IBM Plex Mono: Copyright 2017 IBM Corp. with Reserved Font Name "Plex"
  Licence text: https://openfontlicense.org (and fonts/ in the source repo).
-->
`;
const VERSION = JSON.parse(read('package.json')).version;
const js = read('ui/ui.js')
  .replace('__VERSION__', () => VERSION)
  .replace('__DATA__', () => pyjson(D))
  .replace('__ART__', () => pyjson(ART, true))
  .replace('__ENGINE__', () => read('src/engine.js').replace(/\n$/, ''));
const html = read('ui/head.html').replace(/^<!doctype html>\n/i, m => m + FONT_NOTICE).replace('/*__FONTS__*/', () => fontCSS) + '<script>\n' + js + read('ui/tail.html');
fs.mkdirSync(R('dist'), { recursive: true });
fs.writeFileSync(R('dist/index.html'), html);
console.log(`built dist/index.html (${Math.round(html.length / 1024)} kB)`);
