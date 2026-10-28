// Card templates for the print deck. Every card is 240×336 px (poker size at 96 dpi).
// The markup and inline styles match the published print sheets exactly; test/deck.test.js guards that.
const D = require('../data/cards.json');
const ART = require('../data/art.json');
const PRINT_ART = require('../data/art-print.json');

const BG = '#07060A', FL = '#FF5A2A', CY = '#38E1FF', AM = '#FF9B54', INK = '#F3E9E2', MUT = '#B9A99E';
const ORB = "'Orbitron', sans-serif", CHK = "'Chakra Petch', sans-serif", MONO = "'Share Tech Mono', monospace", RAJ = "'Rajdhani', sans-serif";
// The Kit cards borrow a domain scene for art.
const AART = { triage: 'Network', hunt: 'Identity', contain: 'Endpoint', enrich: 'Cloud', patch: 'Endpoint', recover: 'Identity', decoy: 'Network', recon: 'Cloud' };

const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const lh = n => (Math.round(n * 1.25 * 10) / 10).toFixed(1);

// Every SVG gradient id has to be unique on a sheet, so each art instance gets its own suffix.
let SID = 0;
function scene(svg) {
  const n = ++SID;
  if (svg.includes('{{SID}}')) return svg.replace(/\{\{SID\}\}/g, n);
  const ids = [...new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]))].sort((a, b) => b.length - a.length);
  for (const id of ids) svg = svg.replace(new RegExp(`(id="|url\\(#)${id}(?=[")])`, 'g'), `$1${id}-${n}`);
  return svg;
}

const shell = (inner, accent = FL) => `<div style="width: 240px; height: 336px; box-sizing: border-box; overflow: hidden; position: relative; background: ${BG};"><div style="position: absolute; inset: 5px; border: 1px solid ${accent}; clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));"></div><div style="position: absolute; left: 5px; top: 5px; width: 26px; height: 3px; background: ${CY}"></div><div style="position: relative; height: 336px; box-sizing: border-box; padding: 13px 15px 12px; display: flex; flex-direction: column; gap: 5px">${inner}</div></div>`;
const art = (svg, h = 104) => `<div style="width: 210px; height: ${h}px; flex: none; overflow: hidden; border: 1px solid ${AM}; box-sizing: border-box">${scene(svg)}</div>`;
const hud = (t, c = AM, size = 9) => `<span style="font-family: ${MONO}; font-size: ${size}px; line-height: ${size + 3}px; letter-spacing: 0.06em; text-transform: uppercase; color: ${c}">${e(t)}</span>`;
const nm = (t, size = 18, c = INK) => `<div style="font-family: ${CHK}; font-weight: 700; font-size: ${size}px; line-height: ${size + 2}px; text-transform: uppercase; letter-spacing: 0.02em; color: ${c}">${e(t)}</div>`;
const tx = (t, size, c = INK, w = 600, it = false) => `<div style="font-family: ${RAJ}; font-size: ${size}px; line-height: ${lh(size)}px; font-weight: ${w}; color: ${c}; ${it ? 'font-style: italic;' : ''}">${e(t)}</div>`;
const stat = (label, v, c = INK) => `<div style="flex: 1; border: 1px solid rgba(255,155,84,0.4); padding: 2px 5px">${hud(label, MUT, 7.5)}<div style="font-family: ${ORB}; font-weight: 900; font-size: 18px; line-height: 20px; color: ${c}">${e(v)}</div></div>`;
const boxes = n => `<div style="display: flex; gap: 3px">${`<div style="width: 13px; height: 9px; border: 1px solid ${AM}; transform: skewX(-14deg)"></div>`.repeat(n)}</div>`;
const foot = (t, c = MUT) => `<div style="margin-top: auto; border-top: 1px solid rgba(255,155,84,0.35); padding-top: 4px">${tx(t, 9.5, c, 600)}</div>`;
const ability = (n, t) => `<div style="border-left: 3px solid ${FL}; padding: 3px 6px; background: rgba(255,90,42,0.1)"><span style="font-family: ${CHK}; font-weight: 700; font-size: 10.5px; text-transform: uppercase; color: ${FL}">${e(n)}.</span> <span style="font-family: ${RAJ}; font-weight: 600; font-size: 10.5px; line-height: 13px; color: ${INK}">${e(t)}</span></div>`;
const kwicon = (k, size = 14, c = FL) => `<svg viewBox="0 0 16 16" width="${size}" height="${size}" style="flex: none" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${D.keywords[k].icon}</svg>`;
const kwchip = m => { const k = D.keywords[m.kw]; return `<div style="border-left: 3px solid ${FL}; padding: 3px 6px; background: rgba(255,90,42,0.1); display: flex; gap: 6px; align-items: flex-start">${kwicon(m.kw, 15)}<div><span style="font-family: ${CHK}; font-weight: 700; font-size: 11px; text-transform: uppercase; color: ${FL}">${e(k.name)}.</span> <span style="font-family: ${RAJ}; font-weight: 600; font-size: 10.5px; line-height: 13px; color: ${INK}">${e(k.text)}</span></div></div>`; };
const P = D.persist.routine;
const HP = D.hp.full[1], QHP = D.hp.quick[1];

function mob(m) {
  const meta = `<div style="display: flex; justify-content: space-between">${hud(m.domain)}${hud(`back ${P[0]}–${P[1]}`, CY)}</div>`;
  return shell(`${art(ART[m.id], 86)}${meta}${nm(m.name, 14.5)}<div style="display: flex; gap: 4px">${stat('Defense', m.def, FL)}${stat('Hits', m.hits)}${stat('Damage', m.dmg)}</div>${boxes(m.hits)}\n${kwchip(m)}${tx(m.flavor, 9.5, MUT, 500, true)}${foot('Hits: printed + analysts − 2. Beaten: back to the row. Coming back: hits everyone, then needs 1 hit.')}`);
}
function sit(s) {
  const kind = { challenge: 'one attempt', choice: 'choose one', event: 'event' }[s.type];
  return shell(`${art(ART[s.type === 'challenge' ? 'fp' : 'event'])}${hud('Situation · ' + kind, CY)}${nm(s.name, 18)}${tx(s.text, 11, MUT, 500, true)}\n<div style="border: 1px solid rgba(56,225,255,0.5); padding: 5px 7px">${tx(s.rule, 12, INK, 700)}${(s.opts || []).map(o => tx('• ' + o.label, 11.5, INK, 600)).join('')}</div>`, CY);
}
function boss(b) {
  return shell(`${art(PRINT_ART['boss_' + b.id], 90)}${hud('Boss · ' + b.domain, FL)}${nm(b.name, 18, FL)}<div style="display: flex; gap: 4px">${stat('Defense', b.def, FL)}${stat('Hits', `${b.hitsBase} + 1/analyst`)}${stat('Damage', b.dmg)}</div>${boxes(b.hitsBase)}\n${ability(b.abilityName, b.abilityText)}${foot('Arrives after the last situation, with a persist roll for the row. Agents never touch the boss.')}`);
}
function analyst(c) {
  return shell(`${art(ART[c.id])}${hud('Analyst', CY)}${nm(c.name, 24)}${hud(c.trait, CY, 10)}<div style="font-family: ${ORB}; font-weight: 700; font-size: 13px; line-height: 17px; color: ${CY}">${e(c.perk)}</div>\n${foot('Everyone rolls 1 d20 a round; on point rolls 2. Natural 18–20: two hits and a block. The crew shares one kit tray of 4.', INK)}`, CY);
}
function kit(k) {
  return shell(`${art(ART[AART[k.type]])}${hud('Kit · AI agent', CY)}${nm(k.name, 18, CY)}<div style="border-left: 2px solid ${CY}; padding-left: 6px">${hud('Run it', CY, 9)}${tx(k.text, 12, INK, 600)}</div><div style="border-left: 2px solid ${FL}; padding-left: 6px">${hud('Or burn it', FL, 9)}${tx(k.burn, 12, INK, 600)}</div>\n${foot(`Crew kit tray: ${D.sharedKit} cards (${D.sharedKit + 1} with the Soarcerer). Burn once, then discard.`)}`, CY);
}
function tracker() {
  const top = HP.Recruit, cells = Array.from({ length: top + 1 }, (_, i) => `<div style="height: 20px; border: 1px solid rgba(255,155,84,0.45); display: flex; align-items: center; justify-content: center; font-family: ${ORB}; font-size: 8px; color: ${AM}">${top - i}</div>`).join('');
  return shell(`${hud('HP tracker · coin on your HP', CY)}${nm('Analyst HP', 16)}${tx(`Start: Recruit ${HP.Recruit} · Analyst ${HP.Analyst} · Veteran ${HP.Veteran} · Quick Shift ${QHP}`, 10.5, CY, 700)}<div style="display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 2px">${cells}</div>${foot('Anyone at 0 and the shift is lost.', INK)}`, CY);
}
function rowmat() {
  const slots = `<div style="height: 30px; border: 1px dashed rgba(255,155,84,0.6); display: flex; align-items: center; justify-content: center">${hud('mob', AM, 8)}</div>`.repeat(6);
  return shell(`${hud('Persistence row', FL)}${nm(`Back on ${P[0]}–${P[1]}`, 18, FL)}${tx('Beaten mobs sit here, every time. Every flip, roll a d20 for the row. Anything that matches comes back, hits everyone, and joins the fight with 1 hit.', 10.5, INK, 600)}<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px">${slots}</div>\n${tx(`Setup: deal ${D.deal.full} situations (Quick Shift ${D.deal.quick}, and the crew starts with ${D.quickStartAgent} agents). Boss face down underneath.`, 9.5, MUT, 600)}`, FL);
}
function fight() {
  const rows = [['On point', "Before each flip, pick who's on point. They roll 2 dice and take the kit draw."], ['Mob hits', 'Printed hits + analysts − 2, never below 1. Boss: printed + 1 per analyst.'], ['Off-shift', 'One analyst may skip their roll: no damage, +1 HP.'],
    ['Roll', 'Everyone rolls at once; agents roll too. Assign each die to a mob it beats: d20 + bonus ≥ Defense.'], ['18–20', 'Double: two hits, and you block this round. Engineer: 16–20.'], ['Hits', "Every mob still up hits everyone who didn't block."], ['Won', 'Draw a kit card. Beaten mobs go to the row.']];
  return shell(`${hud('Reference', CY)}${nm('A fight', 18)}${rows.map(([a, b]) => `<div style="display: flex; gap: 6px; border-top: 1px solid rgba(255,155,84,0.3); padding-top: 3px"><div style="width: 50px; flex: none">${hud(a, FL, 8.5)}</div>${tx(b, 10.5, INK, 600)}</div>`).join('')}`, CY);
}
function glossary() {
  const rows = Object.entries(D.keywords).map(([k, v]) => `<div style="display: flex; gap: 6px; align-items: flex-start; border-top: 1px solid rgba(255,155,84,0.3); padding-top: 3px">${kwicon(k, 14)}<div>${hud(v.name, FL, 8.5)}${tx(v.text, 10, INK, 600)}</div></div>`).join('');
  return shell(`${hud('Reference', CY)}${nm('Mob keywords', 16)}${rows}`, CY);
}
function firstshift() {
  const names = Object.fromEntries([...D.mobs, ...D.situations].map(x => [x.id, x.name]));
  const order = D.intro.deck.map((c, i) => `<div style="display: flex; gap: 6px; border-top: 1px solid rgba(56,225,255,0.3); padding-top: 2px">${hud(String(i + 1), CY, 9)}${tx(names[c], 11, INK, 700)}</div>`).join('');
  const b = D.bosses.find(x => x.id === D.intro.boss).name;
  const kitNames = D.intro.kit.map(t => D.kit.find(k => k.type === t).name.replace(' Agent', ''));
  return shell(`${hud('Your first game', CY)}${nm('First Shift', 18)}${tx('Pull these six and stack them face down, 1 on top:', 10, MUT, 600)}${order}\n${tx(`Boss underneath: ${b}. Put the ${kitNames.join(' and ')} Agents on top of the kit deck. Start at ${D.hp.intro[1]} HP each.`, 10, INK, 600)}${foot('Then play normally. It teaches one idea per card.')}`, CY);
}
function back(label) {
  return `<div style="width: 240px; height: 336px; box-sizing: border-box; overflow: hidden; position: relative; background: ${BG}"><div style="position: absolute; inset: 0">${scene(PRINT_ART.back)}</div><div style="position: absolute; inset: 5px; border: 1px solid ${AM}"></div>`
    + `<div style="position: absolute; left: 0; right: 0; top: 44px; text-align: center; font-family: ${ORB}; font-weight: 900; font-size: 24px; line-height: 25px; text-transform: uppercase; color: ${INK}; text-shadow: -2px 0 rgba(56,225,255,0.8), 2px 0 rgba(255,90,42,0.9)">Detect the<br>Dwellers</div>`
    + `<div style="position: absolute; left: 0; right: 0; top: 104px; text-align: center">${hud(label, CY, 11)}</div><div style="position: absolute; left: 0; right: 0; bottom: 16px; text-align: center">${hud('An original game by Binary Defense', AM, 7.5)}</div></div>`;
}

// The 54 cards in print order, each as [front, back].
function deck() {
  SID = 0;
  return [
    ...D.mobs.map(m => [mob(m), back('Situation')]), ...D.situations.map(s => [sit(s), back('Situation')]),
    ...D.bosses.map(b => [boss(b), back('Boss')]), ...D.classes.map(c => [analyst(c), back('Analyst')]),
    ...D.kit.map(k => [kit(k), back('Kit')]),
    ...[0, 1, 2, 3].map(() => [tracker(), back('HP tracker')]),
    [rowmat(), glossary()], [fight(), firstshift()],
  ];
}
module.exports = { deck, mob, sit, boss, analyst, kit, tracker, rowmat, fight, glossary, firstshift, back };
