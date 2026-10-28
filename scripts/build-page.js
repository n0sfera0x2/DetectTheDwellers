// Builds the playable single-file page into dist/index.html:
// ui/head.html + <script> ui/ui.js (with card data, art and engine inlined) + ui/tail.html
const fs = require('fs'), path = require('path');
const pyjson = require('./pyjson');
const R = p => path.join(__dirname, '..', p);
const read = p => fs.readFileSync(R(p), 'utf8');
const D = JSON.parse(read('data/cards.json')), ART = JSON.parse(read('data/art.json'));
const js = read('ui/ui.js')
  .replace('__DATA__', () => pyjson(D))
  .replace('__ART__', () => pyjson(ART, true))
  .replace('__ENGINE__', () => read('src/engine.js').replace(/\n$/, ''));
const html = read('ui/head.html') + '<script>\n' + js + read('ui/tail.html');
fs.mkdirSync(R('dist'), { recursive: true });
fs.writeFileSync(R('dist/index.html'), html);
console.log(`built dist/index.html (${Math.round(html.length / 1024)} kB)`);
