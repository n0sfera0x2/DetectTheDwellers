// Card templates for the print deck. Every card is 240×336 px trim (poker size at 96 dpi).
// Fronts print on a light paper ground to save toner; the art sits in a dark framed "screen".
// The markup and inline styles are snapshot-tested by test/deck.test.js (`npm run golden` after a change).
const D = require('../data/cards.json');
const ART = require('../data/art.json');
const PRINT_ART = require('../data/art-print.json');

// Night palette (the art screens and the backs) and its three accents, used as fills and rules.
const BG = '#07060A', FL = '#FF5A2A', CY = '#38E1FF', AM = '#FF9B54', INK = '#F3E9E2', MUT = '#B9A99E';
// Paper side: ground, ink, and darker shades of the same three accents for text (all ≥4.5:1 on PAPER).
const PAPER = '#F6F2EC', PINK = '#1A1418', PMUT = '#5A4B43', RULE = '#D8CEC3';
const FLT = '#A8360F', CYT = '#005F73', AMT = '#8A4510';
// Two families: Chakra Petch for names and body, IBM Plex Mono for HUD labels and numbers.
const CHK = "'Chakra Petch', sans-serif", MONO = "'IBM Plex Mono', monospace";
// Kit cards use their own scene (kit_<type>) when the art has one, else a domain scene.
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

// The card: paper ground, a cut-corner frame (drawn as two clipped layers so the diagonals show) in the card's accent, and a solid accent tab top left.
const shell = (inner, accent = FL, line = FLT) => `<div class="card" style="width: 240px; height: 336px; box-sizing: border-box; overflow: hidden; position: relative; background: ${PAPER}; color: ${PINK}"><div style="position: absolute; inset: 5px; background: ${line}; clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));"><div style="position: absolute; inset: 1px; background: ${PAPER}; clip-path: polygon(0 0, calc(100% - 15.6px) 0, 100% 15.6px, 100% 100%, 15.6px 100%, 0 calc(100% - 15.6px));"></div></div><div style="position: absolute; left: 5px; top: 5px; width: 30px; height: 4px; background: ${accent}"></div><div style="position: relative; height: 336px; box-sizing: border-box; padding: 13px 15px 16px; display: flex; flex-direction: column; gap: 5px">${inner}</div></div>`;
// The art panel is a dark console screen set into the card, one fixed height per card type so a sheet of
// mobs lines up; any spare height goes above the flavour line, never into the art.
const art = (svg, h = 104) => `<div style="width: 210px; height: ${h}px; flex: none; overflow: hidden; background: ${BG}; color: ${INK}; border: 3px solid ${BG}; outline: 1px solid ${RULE}; box-sizing: border-box">${scene(svg)}</div>`;
const hud = (t, c = AMT, size = 9.5) => `<span style="font-family: ${MONO}; font-weight: 600; font-size: ${size}px; line-height: ${size + 3}px; letter-spacing: 0.04em; text-transform: uppercase; color: ${c}">${e(t)}</span>`;
// A solid accent label with ink text: the bright accents stay bright and the text stays readable.
const tag = (t, fill) => `<span style="align-self: flex-start; font-family: ${MONO}; font-weight: 600; font-size: 9.5px; line-height: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: ${PINK}; background: ${fill}; padding: 0 5px">${e(t)}</span>`;
const nm = (t, size = 18, c = PINK) => `<div style="font-family: ${CHK}; font-weight: 700; font-size: ${size}px; line-height: ${size + 2}px; text-transform: uppercase; letter-spacing: 0.01em; color: ${c}">${e(t)}</div>`;
const tx = (t, size, c = PINK, w = 500) => `<div style="font-family: ${CHK}; font-size: ${size}px; line-height: ${lh(size)}px; font-weight: ${w}; color: ${c}">${e(t)}</div>`;
const stat = (label, v, c = PINK, raw = false) => `<div style="flex: 1; min-width: 0; background: #FFFFFF; border: 1px solid ${RULE}; padding: 2px 5px; line-height: 12px">${hud(label, PMUT, 9.5)}<div style="font-family: ${MONO}; font-weight: 600; font-size: 18px; line-height: 21px; font-variant-numeric: tabular-nums; color: ${c}">${raw ? v : e(v)}</div></div>`;
// One box per hit to tick off. hot boxes (the first ones) are flare: hits taken while the card deals extra damage.
const box = (c, fill) => `<div style="width: 13px; height: 9px; border: 1px solid ${c};${fill ? ` background: ${fill};` : ''} transform: skewX(-14deg)"></div>`;
const boxes = (n, hot = 0, note = '') => `<div style="display: flex; gap: 3px; align-items: center">${box(FLT, FL).repeat(hot)}${box(AMT).repeat(n - hot)}${note ? `<span style="margin-left: auto">${hud(note, FLT)}</span>` : ''}</div>`;
const foot = (t, c = PMUT) => `<div style="margin-top: auto; border-top: 1px solid ${RULE}; padding-top: 4px">${tx(t, 9.5, c, 500)}</div>`;
// Keyword and boss-ability boxes: a full thin flare frame on a flare tint. Line-height is explicit so
// the 10.5px text doesn't inherit the browser's default leading.
const chip = inner => `<div style="border: 1px solid ${FL}; padding: 3px 6px; background: #FCE6DC; display: flex; gap: 6px; align-items: flex-start; line-height: 13px">${inner}</div>`;
const chipText = (n, t) => `<div style="line-height: 13px"><span style="font-family: ${CHK}; font-weight: 700; font-size: 11px; line-height: 13px; text-transform: uppercase; color: ${FLT}">${e(n)}.</span> <span style="font-family: ${CHK}; font-weight: 500; font-size: 10.5px; line-height: 13px; color: ${PINK}">${e(t)}</span></div>`;
const ability = (n, t) => chip(chipText(n, t));
const kwicon = (k, size = 14, c = FLT) => `<svg viewBox="0 0 16 16" width="${size}" height="${size}" style="flex: none" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${D.keywords[k].icon}</svg>`;
const kwchip = m => chip(`${kwicon(m.kw, 15)}${chipText(D.keywords[m.kw].name, D.keywords[m.kw].text)}`);
const row = (a, b) => `<div style="display: flex; justify-content: space-between; align-items: baseline">${a}${b}</div>`;
const HP = D.hp.full[1], QHP = D.hp.quick[1], IHP = D.hp.intro[1];

// Mob hits by crew size, from data: printed hits (the 2-player value) + mobAdd[n], never below 1 (the engine's mobHits).
const CREW = Object.keys(D.mobAdd).map(Number).sort((a, b) => a - b);
const mobHits = (h, n) => Math.max(1, h + D.mobAdd[n]);
// One strip, read left to right: the crew-size column the table plays with. No hit boxes on mobs: one row of
// boxes can only match one crew size, and would read as wrong at the other three. Track hits with coins.
const hitstrip = m => `<div style="display: flex; align-items: baseline; justify-content: space-between; background: #FFFFFF; border: 1px solid ${RULE}; padding: 0 5px; line-height: 15px">${hud('Hits', PMUT)}${CREW.map(n => `<span style="display: inline-flex; align-items: baseline; gap: 3px">${hud(`${n}p`, PMUT)}<span style="font-family: ${MONO}; font-weight: 600; font-size: 13px; line-height: 15px; font-variant-numeric: tabular-nums; color: ${PINK}">${mobHits(m.hits, n)}</span></span>`).join('')}</div>`;
function mob(m) {
  return shell(`${art(ART[m.id], 94)}${row(tag(m.domain, FL), hud(`back ${m.persist[0]}–${m.persist[1]}`, AMT))}${nm(m.name, 14.5)}<div style="display: flex; gap: 4px">${stat('Defense', m.def, FLT)}${stat('Damage', m.dmg)}</div>${hitstrip(m)}\n${kwchip(m)}${foot(m.flavor)}`);
}
function sit(s) {
  const kind = { challenge: 'one attempt', choice: 'choose one', event: 'event' }[s.type];
  // Each situation has its own scene (sit_<id>), the same one the web game shows; older art falls back to its type.
  // Art height is fixed per card type (the largest the longest card allows) so every situation lines up;
  // the rule box takes whatever height the copy leaves free, so a short card has no blank band.
  const big = !s.opts && s.rule.length < 48;
  return shell(`${art(ART['sit_' + s.id] || ART[s.type === 'challenge' ? 'fp' : 'event'], 128)}${row(tag('Situation', CY), hud(kind, CYT))}${nm(s.name, 17)}${tx(s.text, 12, PMUT, 500)}\n<div style="flex: 1 0 auto; background: #FFFFFF; border: 1px solid ${CYT}; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; gap: 3px">${tx(s.rule, big ? 15 : 12.5, PINK, 700).replace('<div style="', '<div style="text-wrap: pretty; ')}${(s.opts || []).map(o => tx('• ' + o.label, 12, PINK, 500)).join('')}</div>`, CY, CYT);
}
// Story cards: a situation with a payoff for the crew that did its homework. Amber frame and a "Story" tag
// set them apart from plain situations; the read-aloud line and the normal rule sit as usual (the rule box takes the spare height), and a
// separate cyan "With Recon" box holds the Recon line, which replaces the whole rule when a Recon Agent
// is running in the tray. The art panel is shorter than a plain situation's to make room for it.
const EYE = `<svg viewBox="0 0 16 16" width="13" height="13" style="flex: none" fill="none" stroke="${CYT}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8C3.3 4.8 5.5 3.5 8 3.5s4.7 1.3 6.5 4.5c-1.8 3.2-4 4.5-6.5 4.5S3.3 11.2 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>`;
function story(s) {
  const kind = { challenge: 'one attempt', choice: 'choose one', event: 'event' }[s.type];
  const rule = `<div style="flex: 1 0 auto; background: #FFFFFF; border: 1px solid ${RULE}; padding: 3px 7px 4px; display: flex; flex-direction: column; justify-content: center; gap: 1px">${tx(s.rule, s.opts ? 11 : 12, PINK, 700).replace('<div style="', '<div style="text-wrap: pretty; ')}${(s.opts || []).map(o => tx('• ' + o.label, 10.5, PINK, 500)).join('')}</div>`;
  const recon = `<div style="background: #DDF6FB; border: 1.5px solid ${CY}; padding: 3px 7px 4px; display: flex; flex-direction: column; gap: 1px"><div style="display: flex; gap: 5px; align-items: center; line-height: 13px">${EYE}${hud('With Recon', CYT)}</div>${tx(s.reconText, 11, PINK, 500).replace('<div style="', '<div style="text-wrap: pretty; ')}</div>`;
  return shell(`${art(ART['sit_' + s.id] || ART[s.type === 'challenge' ? 'fp' : 'event'], 82)}${row(tag('Story', AM), hud(kind, AMT))}${nm(s.name, 14.5)}${tx(s.text, 10.5, PMUT, 500)}\n${rule}${recon}`, AM, AMT);
}
// Ransom demand (the engine's dmgOf): Lockjaw deals +2 until it has taken two hits. The card says so
// beside the printed Damage, and its first two hit boxes are flare (the ability box says why), so the table sees when it drops.
const RAMP = { wyrm: { add: 2, hits: 2 } };
function boss(b) {
  const r = RAMP[b.id];
  const dmg = r ? `${b.dmg}<span style="font-size: 11px; color: ${FLT}"> +${r.add}</span>` : b.dmg;
  return shell(`${art(PRINT_ART['boss_' + b.id], 74)}${row(tag('Boss', FL), hud(b.domain, AMT))}${nm(b.name, 17, FLT)}<div style="display: flex; gap: 4px">${stat('Defense', b.def, FLT)}${stat("Hits", `${b.hitsBase}+`)}${stat('Damage', dmg, PINK, true)}</div>${boxes(b.hitsBase, r ? r.hits : 0)}\n${ability(b.abilityName, b.abilityText)}${foot('Hits: printed + 1 per analyst. Arrives last, with a Row roll (no arrival hits). Agents can’t hit it.')}`);
}
// How to play each analyst, in a line or two. The shared fight rules live on the "A fight" reference card.
const MOVE = {
  HUN: 'Comebacks return at full hits, but you get +5 on them. When the row roll lands, those mobs are yours.',
  RES: 'Find the mob with the biggest Damage. Put your best die on it first: a mob you finish never hits back.',
  ENG: 'Every die you roll is a 1 in 4 shot at a double: two hits and a block. Take point and roll two.',
  SOA: `The crew holds ${['four', 'five', 'six', 'seven'][D.sharedKit - 3]} kit cards, not ${['three', 'four', 'five', 'six'][D.sharedKit - 3]}. Keep agents running and hold a spare to burn when a fight turns.`,
  PAT: 'When the crew is hurting, go off-shift. No roll, no damage, and the 3 HP go where they’re needed.',
};
function analyst(c) {
  const move = MOVE[c.id] ? `<div style="margin-top: auto; background: #FFFFFF; border: 1px solid ${CYT}; padding: 5px 8px 6px; display: flex; flex-direction: column; gap: 2px">${hud('Your move', CYT)}${tx(MOVE[c.id], 11.5, PINK, 500)}</div>` : '';
  return shell(`${art(ART[c.id], 118)}${row(tag('Analyst', CY), hud(c.trait, CYT))}${nm(c.name, 24)}<div style="font-family: ${CHK}; font-weight: 700; font-size: 14px; line-height: 18px; text-wrap: pretty; color: ${CYT}">${e(c.perk)}</div>\n${move}`, CY, CYT);
}
function kit(k) {
  const part = (label, c, t) => `<div style="border-top: 1px solid ${RULE}; padding-top: 2px">${hud(label, c)}${tx(t, 11, PINK, 500)}</div>`;
  return shell(`${art(ART['kit_' + k.type] || ART[AART[k.type]], 88)}${row(tag('Kit', CY), hud('AI agent', CYT))}${nm(k.name, 17, CYT)}${part('Run it', CYT, k.text)}${part('Or burn it', AMT, k.burn)}\n${foot(`Crew kit tray: ${D.sharedKit} cards (${D.sharedKit + 1} with the Soarcerer). Burn once, then discard.`)}`, CY, CYT);
}
// Two tracks, two coins: one on the tens, one on the ones. Your HP is the two added together, so the card
// holds any HP up to 99 at a size a coin can sit on. The start line is read from data.
function tracker() {
  const cell = (v, h) => `<div style="height: ${h}px; background: #FFFFFF; border: 1px solid ${RULE}; display: flex; align-items: center; justify-content: center; font-family: ${MONO}; font-weight: 600; font-size: 13px; line-height: 15px; font-variant-numeric: tabular-nums; color: ${AMT}">${v}</div>`;
  const track = (label, vals, cols, h) => `<div style="display: flex; flex-direction: column; gap: 2px">${hud(label, CYT)}<div style="display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 2px">${vals.map(v => cell(v, h)).join('')}</div></div>`;
  const tens = Array.from({ length: 10 }, (_, i) => 90 - i * 10), ones = Array.from({ length: 10 }, (_, i) => 9 - i);
  return shell(`${row(tag('HP tracker', CY), hud('two coins', CYT))}${nm('Analyst HP', 16)}<div>${tx(`Start: Recruit ${HP.Recruit} · Analyst ${HP.Analyst} · Veteran ${HP.Veteran}`, 10.5, CYT, 700)}${tx(`Quick Shift ${QHP} · First Shift ${IHP}`, 10.5, CYT, 700)}</div>${track('Tens', tens, 5, 32)}${track('Ones', ones, 5, 32)}${foot('HP = tens + ones. 47: one coin on 40, one on 7. Anyone at 0 and the shift is lost.', PINK)}`, CY, CYT);
}
function rowmat() {
  const slots = `<div style="height: 40px; border: 1px dashed ${AMT}; display: flex; align-items: center; justify-content: center">${hud('mob', AMT)}</div>`.repeat(6);
  return shell(`${tag('Persistence row', AM)}${nm('Roll every flip', 18, AMT)}${tx('Beaten mobs sit here, every time. Every flip, make the Row roll: one d20. Any mob whose range matches comes back at full hits. The two with the highest Damage hit everyone as they arrive. Bosses roll for the row too: the boss card says when.', 11, PINK, 500)}<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px">${slots}</div>\n${tx(`Setup: deal ${D.deal.full} situations, ${D.storyDeal.full} of them story cards (Quick Shift ${D.deal.quick} with ${D.storyDeal.quick}, and the crew starts with ${D.quickStartAgent} agents). Boss face down underneath. The shift runs 22:00 to 06:00; the boss comes at 05:59. Survive until dawn.`, 10, PMUT, 500).replace('<div style="', '<div style="margin-top: auto; ')}`, AM, AMT);
}
// Reference rows: a mono run-in label, then the rule, so each row spends its width on words.
const runin = (label, t, c = FLT, size = 10) => `<div style="font-family: ${CHK}; font-weight: 500; font-size: ${size}px; line-height: ${lh(size)}px; color: ${PINK}"><span style="font-family: ${MONO}; font-weight: 600; font-size: 9.5px; letter-spacing: 0.04em; text-transform: uppercase; color: ${c}">${e(label)}</span> ${e(t)}</div>`;
const refrow = inner => `<div style="display: flex; gap: 6px; align-items: flex-start; border-top: 1px solid ${RULE}; padding-top: 2px">${inner}</div>`;
function fight() {
  const rows = [['On point', 'Pick before each flip. They read the card aloud, roll 2 dice, take the kit draw.'], ['Story', 'Recon Agent in the tray? Use the card’s Recon line instead.', CYT], ['Mob hits', 'Use the number for your crew size. Boss: printed + 1 per analyst.'], ['Off-shift', 'One analyst may skip their roll: no damage, +1 HP.'],
    ['Roll', 'Everyone rolls, agents too. Put each die on a mob it beats: d20 + bonus ≥ Defense.'], ['18–20', 'Double: two hits, and you block this round. Engineer: 16–20.'], ['Hits', 'Mobs still up hit everyone who didn’t block.'], ['Won', 'Draw two kit cards. Beaten mobs go to the persistence row.', AMT]];
  return shell(`${tag('Reference', CY)}${nm('A fight', 18)}${rows.map(([a, b, c]) => refrow(runin(a, b, c))).join('')}`, CY, CYT);
}
function glossary() {
  const rows = Object.entries(D.keywords).map(([k, v]) => refrow(`${kwicon(k, 14)}${runin(v.name, v.text)}`)).join('');
  return shell(`${tag('Reference', CY)}${nm('Mob keywords', 16)}${rows}`, CY, CYT);
}
function firstshift() {
  const names = Object.fromEntries([...D.mobs, ...D.situations].map(x => [x.id, x.name]));
  const order = D.intro.deck.map((c, i) => `<div style="display: flex; gap: 6px; align-items: baseline; border-top: 1px solid ${RULE}; padding-top: 2px">${hud(String(i + 1), CYT)}${tx(names[c], 11, PINK, 700)}</div>`).join('');
  const b = D.bosses.find(x => x.id === D.intro.boss).name;
  const kitNames = D.intro.kit.map(t => D.kit.find(k => k.type === t).name.replace(' Agent', ''));
  return shell(`${tag('Your first game', CY)}${nm('First Shift', 18)}${tx('Pull these six and stack them face down, 1 on top:', 10, PMUT, 500)}${order}\n${tx(`Boss underneath: ${b}. Put the ${kitNames.join(' and ')} Agents on top of the kit deck. Start at ${D.hp.intro[1]} HP each.`, 10, PINK, 500)}${foot('Then play normally. It teaches one idea per card.')}`, CY, CYT);
}
// One back for every card. The back scene (the d20 glowing on a console at 2 AM) fills the card but is
// masked out to the flat night ground over the outer 22 px, so every card edge and the bleed are one
// colour. No frame, rule or tab sits near an edge, so a few millimetres of duplex misregistration
// can't show. It names no card type.
const FADE = 'transparent, #000 22px, #000 calc(100% - 22px), transparent';
function back() {
  return `<div class="card" style="width: 240px; height: 336px; box-sizing: border-box; overflow: hidden; position: relative; background: ${BG}"><div style="position: absolute; inset: 0; mask-image: linear-gradient(to right, ${FADE}), linear-gradient(to bottom, ${FADE}); mask-composite: intersect">${scene(PRINT_ART.back)}</div>`
    + `<div style="position: absolute; left: 24px; right: 24px; top: 30px; text-align: center; font-family: ${CHK}; font-weight: 700; font-size: 26px; line-height: 27px; letter-spacing: 0.02em; text-transform: uppercase; color: ${INK}">Detect the<br>Dwellers</div>`
    + `<div style="position: absolute; left: 24px; right: 24px; bottom: 42px; text-align: center">${hud('SOC night shift · 02:14', CY)}</div><div style="position: absolute; left: 24px; right: 24px; bottom: 24px; text-align: center">${hud('An original game by Binary Defense', MUT, 8.5)}</div></div>`;
}

// The 63 cards in print order, each as [front, back].
function deck() {
  SID = 0;
  return [
    ...D.mobs.map(m => [mob(m), back()]), ...D.situations.map(s => [s.story ? story(s) : sit(s), back()]),
    ...D.bosses.map(b => [boss(b), back()]), ...D.classes.map(c => [analyst(c), back()]),
    ...D.kit.map(k => [kit(k), back()]),
    ...[0, 1, 2, 3].map(() => [tracker(), back()]),
    [rowmat(), glossary()], [fight(), firstshift()],
  ];
}
// What each card in deck() is, in the same order: id, name and type. Copies of one card share an id
// (kit is 8 types × 2, the HP tracker is 4 copies), which is how the singles export counts quantities.
function meta() {
  return [
    ...D.mobs.map(m => ({ id: m.id, name: m.name, type: 'mob' })), ...D.situations.map(s => ({ id: s.id, name: s.name, type: s.story ? 'story' : 'situation' })),
    ...D.bosses.map(b => ({ id: b.id, name: b.name, type: 'boss' })), ...D.classes.map(c => ({ id: c.id, name: c.name, type: 'analyst' })),
    ...D.kit.map(k => ({ id: 'kit_' + k.type, name: k.name, type: 'kit' })),
    ...[0, 1, 2, 3].map(() => ({ id: 'hp_tracker', name: 'Analyst HP', type: 'hp tracker' })),
    { id: 'ref_row', name: 'Persistence row / Mob keywords', type: 'reference' }, { id: 'ref_fight', name: 'A fight / First Shift', type: 'reference' },
  ];
}
module.exports = { deck, meta, mob, sit, story, boss, analyst, kit, tracker, rowmat, fight, glossary, firstshift, back, PAPER, BG };
