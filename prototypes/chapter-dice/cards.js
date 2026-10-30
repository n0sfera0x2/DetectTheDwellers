// Shared card markup for the chapter dice prototype. The paper build (paper/build.js) prints these cards and the
// web build (web/build.js) puts the very same markup on the table, so a card reads identically in both.
// Works in Node (require) and in the browser (inlined by web/build.js with a data object as D and the scenes it
// needs as CD_ART). The cards wear the real game's Ink & Static look (deck/cards.js): paper ground, a cut-corner frame
// in the card's accent, a solid tab, and the art set in as a dark screen of fixed height per card type.
// Throwaway prototype code: nothing outside prototypes/ may import this.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../data/cards.json'), require('./sim').numbersFor, require('../../data/art.json'), require('../../data/art-print.json'));
  else root.CDCards = factory(root.CD_DATA, root.CD_NUMBERS, root.CD_ART || {}, root.CD_ART || {});
})(typeof self !== 'undefined' ? self : this, function (D, numbersFor, ART, PRINT) {
  const C = { bg: '#F6F2EC', ink: '#1A1418', mut: '#5A4B43', rule: '#D8CEC3', cy: '#005F73', fl: '#FF5A2A', ex: '#A8360F', E: '#A8360F', am: '#8A4510' };
  // Ink & Static scenes, as the real game picks them: a mob by its id, the boss by its print scene (art-print.json
  // boss_<id>) else its art.json scene, an analyst by class id, an agent by kit_<type>. Print scenes mark their
  // ids with {{SID}}; one fixed suffix keeps the markup identical on paper and web (card parity).
  const SCENE = {
    mob: id => ART[id] || '', boss: id => String(PRINT['boss_' + id] || ART[id] || '').replace(/\{\{SID\}\}/g, 'cd'),
    analyst: id => ART[id] || '', agent: t => ART['kit_' + t] || '',
  };
  // The art.json / art-print.json keys the cards use, so web/build.js inlines only those.
  const artKeys = () => ({ art: [...MOB_IDS, ...ANALYST_IDS, ...AGENT_IDS.map(t => 'kit_' + t), BOSS_ID], print: ['boss_' + BOSS_ID] });
  const art = svg => `<div class="art">${svg}</div>`;
  const tab = '<i class="tab"></i>';
  const hd = (tg, hud) => `<div class="hd"><span class="tg">${tg}</span>${hud ? `<span class="hud">${hud}</span>` : ''}</div>`;
  // Exact numbers (2026-10-30). Every die is a standard pip d6 and reads as its number. A mob card prints the dice to
  // set under it; a rolled die takes out a die showing exactly its number. Which numbers are doubles depends on the
  // analyst; every other die (the solo crew die, the Triage agent die) doubles only on a 6.
  // Same numbers as sim.js DOUBLES (web/spec.js checks they agree).
  const DOUBLES = { HUN: [1, 2, 6], RES: [3, 4, 6], ENG: [2, 4, 6], SOA: [1, 6], PAT: [3, 6], CREW: [6], AGENT: [6] };
  const isDouble = (id, n) => (DOUBLES[id] || DOUBLES.CREW).includes(n);
  // The persistence row on 2d6: a row mob comes back if the sum is at most its number. The data's d20 ranges map by
  // tier (top 12+ → 8, 10–11 → 7, 8–9 → 6, 7 or less → 5). Same as sim.js rowTop.
  const rowTop = N => N >= 12 ? 8 : N >= 10 ? 7 : N >= 8 ? 6 : 5;
  const cls = id => D.classes.find(c => c.id === id);
  // The dice printed on a mob or boss card: the base dice (sim.js numbersFor, clustered round the mob's main number,
  // printed low to high so they're quick to set out) and the + die a crew adds per player past three: always a 6.
  // Base = one fewer than the mob's d20 hits; the boss two fewer than its two-player hits (same as sim.js).
  // Solo and 3 players play the base dice.
  const PAST = 3;
  const diceFor = (m, boss) => {
    const base = boss ? m.hitsBase + D.bossAdd[2] - 2 : m.hits - 1;
    return { base: numbersFor(m.id, base).slice().sort((a, b) => a - b), extra: 6 };
  };
  // The dice a crew of n sets under the card: the base dice, then the + die once per player past three.
  const slotsFor = (m, boss, n) => { const d = diceFor(m, boss); return [...d.base, ...Array(Math.max(0, n - PAST)).fill(d.extra)]; };
  // A real die face: rounded square with pips. Positions on a 16-unit face.
  const PIPS = { 1: [[8, 8]], 2: [[4.6, 4.6], [11.4, 11.4]], 3: [[4.6, 4.6], [8, 8], [11.4, 11.4]], 4: [[4.6, 4.6], [11.4, 4.6], [4.6, 11.4], [11.4, 11.4]],
    5: [[4.6, 4.6], [11.4, 4.6], [8, 8], [4.6, 11.4], [11.4, 11.4]], 6: [[4.6, 4.2], [11.4, 4.2], [4.6, 8], [11.4, 8], [4.6, 11.8], [11.4, 11.8]] };
  const pip = (n, px) => `<svg class="pip" viewBox="0 0 16 16" width="${px}" height="${px}" style="display:inline-block;vertical-align:middle" role="img" aria-label="${n}"><rect x=".7" y=".7" width="14.6" height="14.6" rx="3.2" fill="#fff" stroke="${C.ink}" stroke-width="1.1"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.45" fill="${C.ink}"/>`).join('')}</svg>`;

  // ---- Cards (2.5 × 3.5 in) ----------------------------------------------------------------------------------
  const kw = { beacon: 'Beacon', noblock: 'Piercing', onpoint: 'Targeted', hardened: 'Evasive', regen: 'Regen', ramp: 'Escalating' };
  const kwText = { beacon: 'Roll the row when it arrives or comes back.', noblock: 'Blocks don’t stop it.', onpoint: 'Only on point takes its damage, doubled.', hardened: 'Only a double can hit it.', regen: 'At the end of each round, put back one die it lost.', ramp: '+1 Damage every round it stays up.' };
  // The dice strip along the bottom edge: the dice to set under the card, then the + die per player past three. On
  // the table the physical dice sit just below it.
  const strip = (d, px) => `<div class="dice"><div class="set">${d.base.map(n => pip(n, px)).join('')}</div>
  <div class="plus"><b>+</b>${pip(d.extra, 18)}<span>per player past ${PAST}</span></div></div>`;
  // The keyword's icon from the game data, as the printed d20 mob cards show it.
  const kwIcon = m => { const k = D.keywords && D.keywords[m.kw]; return k ? `<svg class="kwi" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#A8360F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${k.icon}</svg>` : ''; };
  const nmRow = (name, dmg) => `<div class="nr"><div class="nm">${name}</div><div class="dmg"><span>Damage</span><b>${dmg}</b></div></div>`;
  function mobCard(m) {
    return `<div class="card mob">${tab}${art(SCENE.mob(m.id))}${hd(m.domain, `back on 2–${rowTop(m.persist[1])}`)}${nmRow(m.name, m.dmg)}
  <div class="kw">${kwIcon(m)}<span><b>${kw[m.ability]}.</b> ${kwText[m.ability]}</span></div><div class="fl">${m.flavor}</div>
  ${strip(diceFor(m), 24)}</div>`;
  }
  function bossCard(b) {
    return `<div class="card boss">${tab}${art(SCENE.boss(b.id))}${hd('Boss', 'arrives at 05:59')}${nmRow(b.name, b.dmg)}
  <div class="kw"><span><b>${b.abilityName}.</b> +2 Damage until it has lost two dice. Agent dice can’t hit it.</span></div>
  ${strip(diceFor(b, true), 24)}</div>`;
  }
  const PERK = {
    HUN: 'Against a mob that came back from the row, your dice also match one higher or one lower. A comeback you finish is gone for good.',
    RES: 'Against the highest-Damage mob (boss included), your dice also match one higher or one lower.',
    ENG: 'Every even number is a double for you.',
    SOA: `The tray holds one more agent (${D.sharedKit + 1}). Every won fight draws one more agent card.`,
    PAT: `After every fight, heal ${D.perks.PAT.fight} HP split across the crew. Recovery Agents heal ${D.perks.PAT.recover} more.`,
  };
  const analystCard = id => `<div class="card analyst cy">${tab}${art(SCENE.analyst(id))}${hd('Analyst', 'standard d6')}<div class="nm">${cls(id).name}</div>
  <div class="small">Your doubles</div><div class="dbls">${DOUBLES[id].map(n => `<div class="dface">${pip(n, 26)}</div>`).join('')}</div>
  <div class="note">A double counts as two dice showing its number, or guards.</div><div class="perk">${PERK[id]}</div></div>`;
  const AGENT = {
    triage: ['Triage Agent', 'Rolls an agent die every round.', 'On point rolls 3 more crew dice this round.'],
    enrich: ['Enrichment Agent', 'Once a round, turn one crew die to any number.', 'Every die matches anything this round.'],
    contain: ['Containment Agent', `The highest-Damage mob deals ${D.containCut} less, never below 1.`, 'Remove one die from every mob (the boss keeps at least one).'],
    recover: ['Recovery Agent', `After every fight, heal ${D.recoverHeal} HP split across the crew.`, `Heal ${D.recoverBurn} HP split across the crew.`],
  };
  const agentCard = t => `<div class="card agent cy">${tab}${art(SCENE.agent(t))}${hd('Agent', 'AI agent')}<div class="nm">${AGENT[t][0]}</div>
  <div class="mode"><b>Run it</b> ${AGENT[t][1]}</div><div class="mode"><b>Or burn it</b> ${AGENT[t][2]}</div></div>`;
  const legend = `<div class="card ref am">${tab}${hd('Reference', 'every die')}<div class="nm">Dice</div>
  <div class="ex">${pip(4, 24)}<span>takes out a</span>${pip(4, 24)}<span>under a mob</span></div>
  <div class="note">A die takes out one die under a mob showing <b>exactly</b> its number.</div>
  <div class="ex">${pip(2, 24)}<span>double takes</span>${pip(2, 24)}${pip(2, 24)}<span>anywhere</span></div>
  <div class="kw">A double counts as <b>two</b> dice showing its number, <b>or</b> guards. Never both.</div>
  <div class="note">Your analyst card shows your doubles. Other dice (crew die, agent dice): only a ${pip(6, 14)} is a double.</div>
  <div class="note">4 players: add the card’s + die.</div>
  <div class="note">Row: roll 2 amber dice; a row mob comes back if the sum is at most its number.</div></div>`;

  // The prototype's card set: six mobs, the Lockjaw Syndicate, five analysts, four agent types (two each).
  const MOB_IDS = ['mailer', 'spray', 'imp', 'druid', 'wyrmling', 'mimic'];
  const BOSS_ID = 'wyrm', ANALYST_IDS = ['HUN', 'RES', 'ENG', 'SOA', 'PAT'], AGENT_IDS = ['triage', 'enrich', 'contain', 'recover'];
  const mobs = () => MOB_IDS.map(id => D.mobs.find(m => m.id === id));
  const boss = () => D.bosses.find(b => b.id === BOSS_ID);

  // The card face CSS, shared by print and web. Page and sheet layout stay in each build.
  const CARD_CSS = `.card{--pl:${C.ex};--pa:${C.fl};position:relative;isolation:isolate;box-sizing:border-box;border:1px dashed #999;background:${C.bg};color:${C.ink};padding:13px 14px 0;display:flex;flex-direction:column;gap:5px;overflow:hidden;font-family:'Chakra Petch',sans-serif}
.card::before,.card::after{content:"";position:absolute;z-index:-1;pointer-events:none}
.card::before{inset:5px;background:var(--pl);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))}
.card::after{inset:6.5px;background:${C.bg};clip-path:polygon(0 0,calc(100% - 15.4px) 0,100% 15.4px,100% 100%,15.4px 100%,0 calc(100% - 15.4px))}
.card.cy{--pl:${C.cy};--pa:#38E1FF}.card.am{--pl:${C.am};--pa:#FF9B54}
.card>.tab{position:absolute;left:5px;top:5px;width:30px;height:4px;background:var(--pa)}
.card .art{position:relative;flex:none;aspect-ratio:auto;height:92px;margin:0 -1px;overflow:hidden;background:#07060A;color:#F3E9E2;border:3px solid #07060A;outline:1px solid ${C.rule}}
.card .art svg{position:absolute;inset:0;display:block;width:100%;height:100%}
.card.boss .art{height:74px}.card.analyst .art{height:82px}.card.agent .art{height:128px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-top:1px}
.tg{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:10px;line-height:13px;letter-spacing:.04em;text-transform:uppercase;color:${C.ink};background:var(--pa);padding:0 5px;white-space:nowrap}
.hud{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:10px;line-height:13px;letter-spacing:.04em;text-transform:uppercase;color:${C.am};white-space:nowrap}.card.cy .hud{color:${C.cy}}
.nr{display:flex;align-items:center;gap:8px}.nr .nm{flex:1;min-width:0}
.nm{font-weight:700;font-size:16px;line-height:1.1;text-transform:uppercase;letter-spacing:.01em;text-wrap:balance}.card.boss .nm{color:${C.ex}}.card.agent .nm{color:${C.cy}}
.dmg{flex:none;display:flex;flex-direction:column;align-items:flex-end;background:#fff;border:1px solid ${C.rule};padding:1px 6px 2px;line-height:1}
.dmg span{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:10px;line-height:12px;letter-spacing:.04em;text-transform:uppercase;color:${C.mut}}.dmg b{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:19px;line-height:20px;color:${C.ink};font-variant-numeric:tabular-nums}
.kw{display:flex;gap:6px;align-items:flex-start;font-size:11px;line-height:1.3;background:#FCE6DC;border:1px solid ${C.fl};padding:3px 6px}.kw b{font-weight:700;text-transform:uppercase;font-size:11px;color:${C.ex}}.kw .kwi{flex:none;margin-top:1px}
.fl{font-size:10px;line-height:1.35;color:${C.mut};border-top:1px solid ${C.rule};padding-top:4px}
.dice{margin:auto -7.5px 6.5px;padding:6px 8px 7px;background:#fff;border-top:2px solid ${C.ink};display:flex;flex-direction:column;align-items:center;gap:4px;clip-path:polygon(0 0,100% 0,100% 100%,15px 100%,0 calc(100% - 15px))}
.dice .set{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}.boss .dice .set{max-width:150px}
.dice .plus{display:flex;align-items:center;gap:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:${C.mut}}.dice .plus b{font-size:14px;color:${C.ink}}
.dbls{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.dface{background:#fff;border:1px solid ${C.rule};height:34px;display:flex;align-items:center;justify-content:center}
.perk{font-size:11px;line-height:1.33;font-weight:600;background:#fff;border:1px solid ${C.cy};padding:4px 7px;margin-top:auto;margin-bottom:11px}
.ex{display:flex;align-items:center;gap:5px;font-size:11px;color:${C.mut};background:#fff;border:1px solid ${C.rule};padding:5px 7px}
.note{font-size:11px;line-height:1.35;color:${C.mut}}.note svg{vertical-align:-2px}.note b{color:${C.ink}}
.card.ref .kw{display:block}.card.ref .kw b{text-transform:none;font-size:inherit}
.mode{font-size:12px;line-height:1.35;border-top:1px solid ${C.rule};padding-top:4px}.mode b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:${C.cy}}.mode:last-child b{color:${C.am}}.small{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}`;

  return { C, PAST, DOUBLES, isDouble, rowTop, pip, cls, diceFor, slotsFor, kw, kwText, strip, mobCard, bossCard, PERK, analystCard, AGENT, agentCard, legend,
    MOB_IDS, BOSS_ID, ANALYST_IDS, AGENT_IDS, mobs, boss, CARD_CSS, SCENE, artKeys };
});
