// Builds the chapter dice web prototype: ONE self-contained page, web/index.html, that runs from file://.
// Inlines the game data it needs, the symbol rows (sim.js), the shared card markup (../cards.js), the engine
// (engine.js), the page script (ui.js) and the fonts (deck/render.js). Usage: node prototypes/chapter-dice/web/build.js
const fs = require('fs'), path = require('path');
const D = require('../../../data/cards.json');
const { fonts } = require('../../../deck/render');
const { CARD_CSS, MOB_IDS, BOSS_ID } = require('../cards');

const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
// Only what the prototype uses from the game data.
const keys = ['mobAdd', 'bossAdd', 'quickStartAgent', 'quickStartSolo', 'sharedKit', 'kitPerFight', 'kitSolo', 'containCut', 'recoverHeal', 'recoverBurn', 'perks', 'soloDice'];
const data = { classes: D.classes.map(c => ({ id: c.id, name: c.name })), mobs: D.mobs.filter(m => MOB_IDS.includes(m.id)), bosses: D.bosses.filter(b => b.id === BOSS_ID) };
keys.forEach(k => { data[k] = D[k]; });
// symbolsFor and its MIX table, lifted from the sim so the page's symbol rows are the sim's and the paper's.
const sim = read('../sim.js'), mix = sim.match(/^const MIX = .*$/m)[0], sf = sim.match(/^function symbolsFor\(.*$/m)[0];
const safe = s => s.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07060A">
<title>Chapter Dice Table</title>
<style>${fonts()}
${CARD_CSS}
${read('ui.css')}</style>
</head>
<body>
<div id="app"></div>
<script>window.CD_DATA = ${safe(JSON.stringify(data))};
${mix}
${sf}
window.CD_SYMBOLS = symbolsFor;</script>
<script>${safe(read('../cards.js'))}</script>
<script>${safe(read('engine.js'))}</script>
<script>${safe(read('ui.js'))}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(`wrote prototypes/chapter-dice/web/index.html (${Math.round(html.length / 1024)} KB)`);
