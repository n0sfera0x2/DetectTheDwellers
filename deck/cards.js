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
const hitstrip = hitsAt => `<div style="display: flex; align-items: baseline; justify-content: space-between; background: #FFFFFF; border: 1px solid ${RULE}; padding: 0 5px; line-height: 15px">${hud('Hits', PMUT)}${CREW.map(n => `<span style="display: inline-flex; align-items: baseline; gap: 3px">${hud(`${n}p`, PMUT)}<span style="font-family: ${MONO}; font-weight: 600; font-size: 13px; line-height: 15px; font-variant-numeric: tabular-nums; color: ${PINK}">${hitsAt(n)}</span></span>`).join('')}</div>`;
function mob(m) {
  const tags = tag(m.domain, FL);
  return shell(`${art(ART[m.id], 94)}${row(tags, hud(`back ${m.persist[0]}–${m.persist[1]}`, AMT))}${nm(m.name, 14.5)}<div style="display: flex; gap: 4px">${stat('Defense', m.def, FLT)}${stat('Damage', m.dmg)}</div>${hitstrip(n => mobHits(m.hits, n))}\n${kwchip(m)}${foot(m.flavor)}`);
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
// Story cards are an advanced module: the tag line says so, in place of the situation kind (the rule says it).
function story(s) {
  const rule = `<div style="flex: 1 0 auto; background: #FFFFFF; border: 1px solid ${RULE}; padding: 3px 7px 4px; display: flex; flex-direction: column; justify-content: center; gap: 1px">${tx(s.rule, s.opts ? 11 : 12, PINK, 700).replace('<div style="', '<div style="text-wrap: pretty; ')}${(s.opts || []).map(o => tx('• ' + o.label, 10.5, PINK, 500)).join('')}</div>`;
  const recon = `<div style="background: #DDF6FB; border: 1.5px solid ${CY}; padding: 3px 7px 4px; display: flex; flex-direction: column; gap: 1px"><div style="display: flex; gap: 5px; align-items: center; line-height: 13px">${EYE}${hud('With Recon', CYT)}</div>${tx(s.reconText, 11, PINK, 500).replace('<div style="', '<div style="text-wrap: pretty; ')}</div>`;
  return shell(`${art(ART['sit_' + s.id] || ART[s.type === 'challenge' ? 'fp' : 'event'], 82)}${row(tag('Story', AM), hud('Advanced · Full Shift', AMT))}${nm(s.name, 14.5)}${tx(s.text, 10.5, PMUT, 500)}\n${rule}${recon}`, AM, AMT);
}
// Boss hits by crew size, from data: hitsBase + bossAdd[n] (the engine's boss setup). Printed as a strip like the
// mobs, with no hit boxes. Ransom demand (the engine's dmgOf): Lockjaw deals +2 until it has taken two hits; the card
// says so beside the printed Damage, and the ability box says when it drops.
const RAMP = { wyrm: 2 };
const bossHits = (b, n) => b.hitsBase + D.bossAdd[n];
// The ability's last sentence is its row trigger, an advanced module: it gets a "Full Shift:" lead-in so a
// core game (First Shift, Quick Shift) knows to skip it. The rest of the ability always applies.
function bossAbility(b) {
  const cut = b.abilityText.lastIndexOf('. ', b.abilityText.length - 2);
  const core = b.abilityText.slice(0, cut + 1), adv = b.abilityText.slice(cut + 2);
  const advLine = `<div style="line-height: 13px"><span style="font-family: ${MONO}; font-weight: 600; font-size: 9.5px; line-height: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: ${AMT}">Full Shift:</span> <span style="font-family: ${CHK}; font-weight: 500; font-size: 10.5px; line-height: 13px; color: ${PINK}">${e(adv)}</span></div>`;
  return `<div style="border: 1px solid ${FL}; padding: 3px 6px; background: #FCE6DC; display: flex; flex-direction: column; gap: 1px; line-height: 13px">${chipText(b.abilityName, core)}${advLine}</div>`;
}
function boss(b) {
  const r = RAMP[b.id];
  const dmg = r ? `${b.dmg}<span style="font-size: 11px; color: ${FLT}"> +${r}</span>` : b.dmg;
  return shell(`${art(PRINT_ART['boss_' + b.id], 56)}${row(tag('Boss', FL), hud(b.domain, AMT))}${nm(b.name, 17, FLT)}<div style="display: flex; gap: 4px">${stat('Defense', b.def, FLT)}${stat('Damage', dmg, PINK, true)}</div>${hitstrip(n => bossHits(b, n))}\n${bossAbility(b)}${foot('Arrives last, with a Row roll (no arrival hits). Agents can’t hit it.')}`);
}
// How to play each analyst: a playstyle in two or three lines, numbers from D.perks. The perk and the agent link
// are printed from the class data above it; the shared fight rules live on the "A fight" reference card.
const PK = D.perks, WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const MOVE = {
  HUN: `Work the row. Hit comebacks first: your +${PK.HUN.back} lands them, and every one you finish stays gone, so the row runs dry.`,
  RES: `Stand in front of the worst of it. Your +${PK.RES.top} lands on the biggest hitter, boss included. Keep Containment running.`,
  ENG: `Roll volume. One die in ${Math.round(20 / (21 - PK.ENG.dbl))} is a double, so take point and roll two. Triage and Hunt Agents roll at +${PK.ENG.agentPlus} for you.`,
  SOA: `Run the tray. The crew holds ${WORD[D.sharedKit + PK.SOA.slot]} agents and draws ${WORD[D.kitPerFight + PK.SOA.draw]} kit cards a win (${WORD[D.kitSolo + PK.SOA.draw]} solo). Keep them running; burn a spare when a fight turns.`,
  PAT: `Keep the crew standing. You heal ${PK.PAT.fight} after every fight, each Recovery Agent heals ${D.recoverHeal + PK.PAT.recover}, and your off-shift helps everyone.`,
};
function analyst(c) {
  const agent = c.agent ? `<div style="display: flex; gap: 6px; align-items: flex-start; border-top: 1px solid ${RULE}; padding-top: 4px">${tag('Agents', CY)}${tx(c.agent, 11, PINK, 700)}</div>` : '';
  const move = MOVE[c.id] ? `<div style="margin-top: auto; background: #FFFFFF; border: 1px solid ${CYT}; padding: 4px 8px 5px; display: flex; flex-direction: column; gap: 1px">${hud('Your move', CYT)}${tx(MOVE[c.id], 10.5, PINK, 500)}</div>` : '';
  return shell(`${art(ART[c.id], 86)}${row(tag('Analyst', CY), hud(c.trait, CYT))}${nm(c.name, 22)}<div style="font-family: ${CHK}; font-weight: 700; font-size: 12.5px; line-height: 15.5px; text-wrap: pretty; color: ${CYT}">${e(c.perk)}</div>${agent}\n${move}`, CY, CYT);
}
function kit(k) {
  const part = (label, c, t) => `<div style="border-top: 1px solid ${RULE}; padding-top: 2px">${hud(label, c)}${tx(t, 11, PINK, 500)}</div>`;
  return shell(`${art(ART['kit_' + k.type] || ART[AART[k.type]], 88)}${row(tag('Kit', CY), hud('AI agent', CYT))}${nm(k.name, 17, CYT)}${part('Run it', CYT, k.text)}${part('Or burn it', AMT, k.burn)}\n${foot(`Crew kit tray: ${D.sharedKit} cards (${D.sharedKit + D.perks.SOA.slot} with the Soarcerer). Burn once, then discard.`)}`, CY, CYT);
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
  return shell(`${tag('Persistence row', AM)}${nm('Roll every flip', 18, AMT)}${tx('Beaten mobs sit here, every time. Every flip, make the Row roll: one d20. Any mob whose range matches comes back at full hits. The two with the highest Damage hit everyone as they arrive. Tuck a Came back card under each comeback.', 11, PINK, 500)}<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px">${slots}</div>\n${tx(`Core rules: deal ${D.deal.quick} situations, no story cards; the crew starts with ${D.quickStartAgent} agents (Quick Shift). Full Shift adds the advanced modules: deal ${D.deal.full}, ${D.storyDeal.full} of them story cards, and boss row triggers. Boss face down underneath; it comes at 05:59.`, 10, PMUT, 500).replace('<div style="', '<div style="margin-top: auto; ')}`, AM, AMT);
}
// Reference rows: a mono run-in label, then the rule, so each row spends its width on words.
const runin = (label, t, c = FLT, size = 10) => `<div style="font-family: ${CHK}; font-weight: 500; font-size: ${size}px; line-height: ${lh(size)}px; color: ${PINK}"><span style="font-family: ${MONO}; font-weight: 600; font-size: 9.5px; letter-spacing: 0.04em; text-transform: uppercase; color: ${c}">${e(label)}</span> ${e(t)}</div>`;
const refrow = inner => `<div style="display: flex; gap: 6px; align-items: flex-start; border-top: 1px solid ${RULE}; padding-top: 2px">${inner}</div>`;
function fight() {
  const rows = [['On point', 'Pick before each flip. They read the card aloud, roll 2 dice, take the kit draw.'], ['Story', 'Full Shift. Recon Agent in the tray? Use the Recon line.', CYT], ['Off-shift', `One analyst may skip their roll: no damage, +1 HP. The Fixer heals ${D.perks.PAT.rest}, split.`],
    ['Roll', 'Everyone rolls, agents too. Put each die on a mob it beats: d20 + bonus ≥ Defense.'], ['18–20', `Double: two hits, and you block this round. Engineer: ${D.perks.ENG.dbl}–20.`], ['Guard', `A crew die showing ${D.guard.min}+ can guard instead of hitting: you block this round.`], ['Hits back', 'Mobs still up hit everyone who didn’t block.'], ['Won', `Draw ${WORD[D.kitPerFight]} kit cards (solo: ${WORD[D.kitSolo]}). Kit deck empty? Shuffle the burned agents in.`, AMT]];
  return shell(`${tag('Reference', CY)}${nm('A fight', 18)}${rows.map(([a, b, c]) => refrow(runin(a, b, c))).join('')}`, CY, CYT);
}
// The eight keywords.
function glossary() {
  const rows = Object.entries(D.keywords).map(([k, v]) => refrow(`${kwicon(k, 14)}${runin(v.name, v.text)}`)).join('');
  return shell(`${tag('Reference', CY)}${nm('Mob keywords', 16)}${rows}`, CY, CYT);
}
function firstshift() {
  const names = Object.fromEntries([...D.mobs, ...D.situations].map(x => [x.id, x.name]));
  const order = D.intro.deck.map((c, i) => `<div style="display: flex; gap: 6px; align-items: baseline; border-top: 1px solid ${RULE}; padding-top: 2px">${hud(String(i + 1), CYT)}${tx(names[c], 11, PINK, 700)}${D.intro.comeback === i + 1 ? `<span style="margin-left: auto; line-height: 13px">${hud(`+ ${names[D.intro.deck[0]].replace(/^MFA /, '')} back`, AMT)}</span>` : ''}</div>`).join('');
  const b = D.bosses.find(x => x.id === D.intro.boss).name;
  const kitNames = D.intro.kit.map(t => D.kit.find(k => k.type === t).name.replace(' Agent', ''));
  // The scripted comeback (D.intro.comeback): on that flip the row isn't rolled, the first card's mob comes back.
  const cb = D.intro.comeback, first = names[D.intro.deck[0]], sitName = names[D.intro.deck[cb - 1]];
  const short = first.replace(/^MFA /, '');
  const comeback = cb ? `<div style="background: #FFFFFF; border: 1px solid ${AMT}; padding: 2px 6px 3px">${runin(`Flip ${cb}`, `Don’t roll for the row. The ${short} comes back, hits everyone for 1, and you fight it after ${sitName}.`, AMT)}</div>` : '';
  return shell(`${tag('Your first game', CY)}${nm('First Shift', 18)}${tx('Stack these six face down, 1 on top:', 10, PMUT, 500)}${order}\n${tx(`Boss underneath: ${b}. Put the ${kitNames.join(' and ')} Agents on top of the kit deck. Start at ${D.hp.intro[1]} HP each.`, 10, PINK, 500)}${comeback}${foot('Then play normally: one new idea per card.')}`, CY, CYT);
}
// Marker cards: print-only aids for state the web build tracks itself. Same paper shell as every front.
// Came back (6 copies, amber): tucked under a comeback so only its top band shows above the mob card. The
// band is solid amber with "BACK" large; the usage text sits on the lower part, hidden while it's tucked.
const LOOP = `<svg viewBox="0 0 16 16" width="22" height="22" style="flex: none" fill="none" stroke="${PINK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M12 1.5v3h-3"/></svg>`;
function cameBack() {
  const band = `<div style="flex: none; height: 44px; background: ${AM}; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; box-sizing: border-box"><span style="font-family: ${CHK}; font-weight: 700; font-size: 32px; line-height: 36px; letter-spacing: 0.12em; color: ${PINK}">BACK</span>${LOOP}</div>`;
  const rows = [['Hunter', `+${PK.HUN.back} against it. Finish it and it’s gone for good.`, CYT], ['Hunt Agent', 'Rolls at it. A Hunt burn beats it.', CYT], ['Beaten', 'It goes back to the row. This card goes with it.', AMT], ['Gone', 'Out of the shift: take this card off.', AMT]];
  const tuck = `<div style="border-top: 1px dashed ${AMT}; padding-top: 2px; text-align: center; line-height: 12px">${hud('Mob card covers from here', AMT)}</div>`;
  return shell(`${band}${tuck}<div style="flex: 1 0 auto"></div>${row(tag('Marker', AM), hud('6 in the deck', AMT))}${nm('Came back', 17, AMT)}${tx('Tuck this under a mob the Row roll brings back, so BACK shows above it. It stays a comeback for the rest of the shift.', 10.5, PINK, 500)}${rows.map(([a, b, c]) => refrow(runin(a, b, c))).join('')}`, AM, AMT);
}
// A coin track: one row of white cells, a coin sits on one.
const coinCells = (vals, c = PINK) => `<div style="display: grid; grid-template-columns: repeat(${vals.length}, minmax(0, 1fr)); gap: 2px">${vals.map(v => `<div style="height: 28px; background: #FFFFFF; border: 1px solid ${RULE}; display: flex; align-items: center; justify-content: center; font-family: ${MONO}; font-weight: 600; font-size: 13px; line-height: 15px; font-variant-numeric: tabular-nums; color: ${c}">${v}</div>`).join('')}</div>`;
function nextMob() {
  const vals = ['−3', '−2', '−1', '+1', '+2', '+3'];
  const half = (label, c) => `<div style="display: flex; flex-direction: column; gap: 2px">${hud(label, c)}${coinCells(vals, c)}</div>`;
  return shell(`${row(tag('Marker', CY), hud('Full Shift', AMT))}${nm('Next mob', 18)}${tx('A story card marked the next mob you flip. Set this beside the feed, with a coin on each change.', 10.5, PINK, 500)}${half('Defense', FLT)}${half('Damage', PINK)}${tx('When that mob flips, it gets the change until it’s beaten. Comebacks don’t count. Then clear the coins.', 10.5, PMUT, 500)}${foot('The web game tracks this for you.')}`, CY, CYT);
}
function roundTrack() {
  const r = D.bosses.find(b => b.id === 'wyrm').name;
  return shell(`${row(tag('Marker', CY), hud('One coin', CYT))}${nm('Round', 18)}${tx('Every fight starts on 1. Move the coin up at the start of each new round.', 10.5, PINK, 500)}${coinCells([1, 2, 3, 4], AMT)}${coinCells([5, 6, 7, 8], AMT)}${refrow(runin('Escalating', '+1 Damage for every round the mob has stayed up.'))}${refrow(runin('Full Shift', `${r}: at the end of every round it’s still up, roll for the row.`, AMT))}${foot('The web game tracks this for you.')}`, CY, CYT);
}
function oncePerFight() {
  const spot = (label, c, t) => `<div style="display: flex; gap: 8px; align-items: center; border-top: 1px solid ${RULE}; padding-top: 5px"><div style="flex: none; width: 36px; height: 36px; border-radius: 50%; border: 1.5px dashed ${c}; background: #FFFFFF"></div><div style="display: flex; flex-direction: column; gap: 1px">${hud(label, c)}${tx(t, 10.5, PINK, 500)}</div></div>`;
  const op = D.bosses.find(b => b.id === 'apt').name;
  // Second wind is once per shift, so its spot sits apart under an amber "Don't clear" rule and keeps its coin all shift.
  const sw = D.secondWind, wind = sw ? `<div style="display: flex; flex-direction: column; gap: 2px; border-top: 1.5px dashed ${AMT}; padding-top: 3px; margin-top: 2px">${row(hud('Once per shift', AMT), hud('Don’t clear', AMT))}${spot('Second wind', AMT, `The first time anyone drops to ${sw.at} HP or less, the crew draws ${sw.kit === 1 ? 'a kit card' : WORD[sw.kit] + ' kit cards'}.`)}</div>` : '';
  return shell(`${row(tag('Marker', CY), hud('Clear after each fight', CYT))}${nm('Once per fight', 18)}${tx('Put a coin on a spot when it happens. It can’t happen again this fight.', 10.5, PINK, 500)}${spot('Decoy used', CYT, 'A running Decoy Agent saved whoever’s on point this fight.')}${spot('Operator risen', FLT, `${op} came back with 2 hits left. Beat it again and it’s done.`)}${wind}${foot('The web game tracks this for you.')}`, CY, CYT);
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

// The 72 cards in print order, each as [front, back]. The nine markers fill the last sheet.
function deck() {
  SID = 0;
  return [
    ...D.mobs.map(m => [mob(m), back()]), ...D.situations.map(s => [s.story ? story(s) : sit(s), back()]),
    ...D.bosses.map(b => [boss(b), back()]), ...D.classes.map(c => [analyst(c), back()]),
    ...D.kit.map(k => [kit(k), back()]),
    ...[0, 1, 2, 3].map(() => [tracker(), back()]),
    [rowmat(), glossary()], [fight(), firstshift()],
    ...[0, 1, 2, 3, 4, 5].map(() => [cameBack(), back()]),
    [nextMob(), back()], [roundTrack(), back()], [oncePerFight(), back()],
  ];
}
// What each card in deck() is, in the same order: id, name and type. Copies of one card share an id
// (kit is 8 types × 2, the HP tracker is 4 copies, the Came back marker 6), which is how the singles export counts quantities.
function meta() {
  return [
    ...D.mobs.map(m => ({ id: m.id, name: m.name, type: 'mob' })), ...D.situations.map(s => ({ id: s.id, name: s.name, type: s.story ? 'story' : 'situation' })),
    ...D.bosses.map(b => ({ id: b.id, name: b.name, type: 'boss' })), ...D.classes.map(c => ({ id: c.id, name: c.name, type: 'analyst' })),
    ...D.kit.map(k => ({ id: 'kit_' + k.type, name: k.name, type: 'kit' })),
    ...[0, 1, 2, 3].map(() => ({ id: 'hp_tracker', name: 'Analyst HP', type: 'hp tracker' })),
    { id: 'ref_row', name: 'Persistence row / Mob keywords', type: 'reference' }, { id: 'ref_fight', name: 'A fight / First Shift', type: 'reference' },
    ...[0, 1, 2, 3, 4, 5].map(() => ({ id: 'marker_back', name: 'Came back', type: 'marker' })),
    { id: 'marker_next', name: 'Next mob', type: 'marker' }, { id: 'marker_round', name: 'Round', type: 'marker' }, { id: 'marker_once', name: 'Once per fight', type: 'marker' },
  ];
}
module.exports = { deck, meta, mob, sit, story, boss, analyst, kit, tracker, rowmat, fight, glossary, firstshift, cameBack, nextMob, roundTrack, oncePerFight, back, PAPER, BG };
