// Builds the chapter dice web prototype: ONE self-contained page, web/index.html, that runs from file://.
// Inlines the game data it needs, the mob dice (sim.js numbersFor), the shared card markup (../cards.js), the engine
// (engine.js), the page script (ui.js), the fonts (deck/render.js) and the Ink & Static scenes it shows (data/art.json,
// data/art-print.json): the cards' scenes from cards.js artKeys(), plus the page's own (hero, win, card back).
// Usage: node prototypes/chapter-dice/web/build.js
const fs = require('fs'), path = require('path');
const D = require('../../../data/cards.json');
const { fonts } = require('../../../deck/render');
const ART = require('../../../data/art.json'), PRINT = require('../../../data/art-print.json');
const { CARD_CSS, MOB_IDS, BOSS_ID, artKeys } = require('../cards');

const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
// Only what the prototype uses from the game data.
const keys = ['mobAdd', 'bossAdd', 'quickStartAgent', 'quickStartSolo', 'sharedKit', 'kitPerFight', 'kitSolo', 'containCut', 'recoverHeal', 'recoverBurn', 'perks', 'soloDice'];
const data = { classes: D.classes.map(c => ({ id: c.id, name: c.name })), mobs: D.mobs.filter(m => MOB_IDS.includes(m.id)), bosses: D.bosses.filter(b => b.id === BOSS_ID) };
keys.forEach(k => { data[k] = D[k]; });
data.keywords = Object.fromEntries(Object.entries(D.keywords).map(([k, v]) => [k, { icon: v.icon }]));
// The scenes: what the cards use, the hero for the crew pick, the boss's win room and the print card back.
const ak = artKeys(), art = {};
ak.art.forEach(k => { art[k] = ART[k]; }); ak.print.forEach(k => { art[k] = PRINT[k]; });
art.hero = ART.hero; art.back = PRINT.back; art.win = (ART._win && ART._win[BOSS_ID]) || ART['win_' + BOSS_ID] || ART[BOSS_ID];
Object.entries(art).forEach(([k, v]) => { if (!v) throw new Error('missing art: ' + k); });
// numbersFor, lifted from the sim so the page's mob dice are the sim's and the paper's.
const sim = read('../sim.js'), nf = sim.match(/^function numbersFor\([\s\S]*?\n}\n/m)[0];
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
<div id="app"></div><div id="live" class="sr" aria-live="polite" aria-atomic="true"></div>
<script>window.CD_DATA = ${safe(JSON.stringify(data))};
${nf}window.CD_NUMBERS = numbersFor;
window.CD_ART = ${safe(JSON.stringify(art))};</script>
<script>${safe(read('../cards.js'))}</script>
<script>${safe(read('engine.js'))}</script>
<script>${safe(read('ui.js'))}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(`wrote prototypes/chapter-dice/web/index.html (${Math.round(html.length / 1024)} KB)`);
