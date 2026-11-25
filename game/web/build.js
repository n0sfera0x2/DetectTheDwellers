// Builds the game's web page: ONE self-contained page, web/index.html, that runs from file://.
// Inlines the game data it needs, the mob dice (sim.js numbersFor), the shared card markup (../cards.js), the engine
// (engine.js), the page script (ui.js), the fonts (deck/render.js) and the Ink & Static scenes it shows (data/art.json,
// data/art-print.json): the cards' scenes from cards.js artKeys() (mobs, boss, analysts, items: agents and consumables, situations), plus the page's own (hero, win, card back).
// Usage: node game/web/build.js
const fs = require('fs'), path = require('path');
const D = require('../../data/cards.json');
const { fonts } = require('../../deck/render');
const ART = { ...require('../../data/art.json'), ...require('../art/art.json') }, // + the consumables' scenes (../art/scenes.js)
  PRINT = require('../../data/art-print.json');
const SPR = require('../art/sprites'); // the pixel sprites (2026-11-20)
// Adventure view's backdrops (2026-11-20, PixelLab): the SOC for a fight, the server aisle for the boss.
const bg = f => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../art/backdrops', f)).toString('base64');
const ADV_BG = `:root{--bg-soc:url(${bg('soc.png')});--bg-aisle:url(${bg('aisle.png')})}`;
// The omen's face (2026-11-20): IM Fell English Italic, OFL (fonts/IMFellEnglish-OFL.txt), for an alarm's flavour line.
// Binary Defense's body face (2026-11-20): Epilogue, the brand's free fallback for PP Neue Machina. OFL, fonts/Epilogue-OFL.txt.
const BRAND_FONT = `@font-face{font-family:'Epilogue';font-style:normal;font-weight:300 400;font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(__dirname, '../../fonts/Epilogue-Variable.woff2')).toString('base64')}) format('woff2')}`;
const OMEN_FONT = `@font-face{font-family:'IM Fell English';font-style:italic;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(__dirname, '../../fonts/IMFellEnglish-Italic.woff2')).toString('base64')}) format('woff2')}`;
const { CARD_CSS, MOB_IDS, BOSS_ID, BOSS_IDS, SIT_IDS, ANALYST_IDS, ANALYST_ART, artKeys } = require('../cards');

const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
// Only what the game uses from the shared data.
const keys = ['mobAdd', 'bossAdd', 'kitPerFight', 'kitSolo', 'containCut', 'recoverHeal', 'recoverBurn', 'soloDice'];
// The four analysts only (the Fixer is gone).
const data = { classes: D.classes.filter(c => ANALYST_IDS.includes(c.id)).map(c => ({ id: c.id, name: c.name })), mobs: D.mobs.filter(m => MOB_IDS.includes(m.id)), bosses: D.bosses.filter(b => BOSS_IDS.includes(b.id)),
  situations: D.situations.filter(s => SIT_IDS.includes(s.id)).map(({ id, name, text }) => ({ id, name, text })) }; // name and story line for the situation cards
keys.forEach(k => { data[k] = D[k]; });
data.keywords = Object.fromEntries(Object.entries(D.keywords).map(([k, v]) => [k, { icon: v.icon }]));
// The scenes: what the cards use, the hero for the crew pick, the boss's win room and the print card back.
const ak = artKeys(), art = {};
ak.art.forEach(k => { art[k] = ART[k]; }); ak.print.forEach(k => { art[k] = PRINT[k]; });
art.hero = ART.hero; art.back = PRINT.back; art.win = (ART._win && ART._win[BOSS_ID]) || ART['win_' + BOSS_ID] || ART[BOSS_ID];
// Review 2's analysts borrow portraits (cards.js ANALYST_ART): the page looks them up by analyst id.
Object.entries(ANALYST_ART).forEach(([id, k]) => { art[id] = ART[k]; });
// Each boss's win room (the random boss, 2026-11-02).
BOSS_IDS.forEach(id => { art['win_' + id] = (ART._win && ART._win[id]) || ART['win_' + id] || ART[id]; });
Object.entries(art).forEach(([k, v]) => { if (!v) throw new Error('missing art: ' + k); });
// Since 2026-11-20 every one of these has a pixel sprite (art/sprites.js), so the page drops the ink scene it replaces:
// alarms, analysts, bosses (and their print scenes), items (kit_*, cons_*), situations, the hero, the back, the wins.
for (const k of Object.keys(art)) { const id = k.startsWith('boss_') ? k.slice(5) : k; if (SPR.IDS.includes(id) || /^(kit_|cons_)/.test(k) || k === 'win') delete art[k]; }
// numbersFor, lifted from the sim so the page's mob dice are the sim's and the paper's.
const sim = read('../sim.js'), nf = sim.match(/^function numbersFor\([\s\S]*?\n}\n/m)[0];
// The audio (2026-11-25, ElevenLabs, game/audio): every sound effect inlined as an MP3 data URL; the music stays in
// files (audio/music/<id>.mp3 next to the published page, ../audio/music/ in the repo) and the page loads it by name.
const AUD = path.join(__dirname, '../audio'), AP = require('../audio/prompts.json');
const sfx = {}; for (const id of Object.keys(AP.sfx)) { const f = path.join(AUD, 'sfx', id + '.mp3'); if (fs.existsSync(f)) sfx[id] = 'data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64'); }
const music = { ids: Object.keys(AP.music).filter(id => fs.existsSync(path.join(AUD, 'music', id + '.mp3'))), loop: Object.fromEntries(Object.entries(AP.music).map(([id, m]) => [id, !!m.loop])) };
const safe = s => s.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07060A">
<title>Detect the Dwellers · A Binary Defense Adventure</title>
<style>${fonts()}
${OMEN_FONT}
${BRAND_FONT}
${CARD_CSS}
${SPR.css()}
${read('ui.css')}
${ADV_BG}</style>
</head>
<body>
<div id="app"></div><div id="live" class="sr" aria-live="polite" aria-atomic="true"></div>
<script>window.CD_DATA = ${safe(JSON.stringify(data))};
${nf}window.CD_NUMBERS = numbersFor;
window.CD_ART = ${safe(JSON.stringify(art))};
window.CD_SPRITES = ${JSON.stringify(SPR.IDS)};
window.CD_SFX = ${JSON.stringify(sfx)};
window.CD_MUSIC = ${JSON.stringify(music)};</script>
<script>${safe(read('../art/die.js'))}</script>
<script>${safe(read('../cards.js'))}</script>
<script>${safe(read('engine.js'))}</script>
<script>${safe(read('ui.js'))}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(`wrote game/web/index.html (${Math.round(html.length / 1024)} KB)`);
