// Shared card markup for the chapter dice prototype. The paper build (paper/build.js) prints these cards and the
// web build (web/build.js) puts the very same markup on the table, so a card reads identically in both.
// Works in Node (require) and in the browser (inlined by web/build.js with a data object as D).
// Throwaway prototype code: nothing outside prototypes/ may import this.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../data/cards.json'), require('./sim').numbersFor);
  else root.CDCards = factory(root.CD_DATA, root.CD_NUMBERS);
})(typeof self !== 'undefined' ? self : this, function (D, numbersFor) {
  const C = { bg: '#F6F2EC', ink: '#1A1418', mut: '#5A4B43', rule: '#D8CEC3', cy: '#005F73', fl: '#FF5A2A', ex: '#A8360F' };
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
  // The dice printed on a mob or boss card: the base dice (sim.js numbersFor, printed low to high so they're quick
  // to set out) and the one extra number a crew adds per player past two. Base = printed hits for a mob, the boss's
  // two-player hits for a boss. Solo plays the two-player dice.
  const diceFor = (m, boss) => {
    const base = boss ? m.hitsBase + D.bossAdd[2] : m.hits;
    return { base: numbersFor(m.id, base).slice().sort((a, b) => a - b), extra: numbersFor(m.id + '+', 1)[0] };
  };
  // The dice a crew of n sets under the card: the base dice, then the extra number once per player past two.
  const slotsFor = (m, boss, n) => { const d = diceFor(m, boss); return [...d.base, ...Array(Math.max(0, n - 2)).fill(d.extra)]; };
  // A real die face: rounded square with pips. Positions on a 16-unit face.
  const PIPS = { 1: [[8, 8]], 2: [[4.6, 4.6], [11.4, 11.4]], 3: [[4.6, 4.6], [8, 8], [11.4, 11.4]], 4: [[4.6, 4.6], [11.4, 4.6], [4.6, 11.4], [11.4, 11.4]],
    5: [[4.6, 4.6], [11.4, 4.6], [8, 8], [4.6, 11.4], [11.4, 11.4]], 6: [[4.6, 4.2], [11.4, 4.2], [4.6, 8], [11.4, 8], [4.6, 11.8], [11.4, 11.8]] };
  const pip = (n, px) => `<svg class="pip" viewBox="0 0 16 16" width="${px}" height="${px}" style="display:inline-block;vertical-align:middle" role="img" aria-label="${n}"><rect x=".7" y=".7" width="14.6" height="14.6" rx="3.2" fill="#fff" stroke="${C.ink}" stroke-width="1.1"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.45" fill="${C.ink}"/>`).join('')}</svg>`;

  // ---- Cards (2.5 × 3.5 in) ----------------------------------------------------------------------------------
  const kw = { beacon: 'Beacon', noblock: 'Piercing', onpoint: 'Targeted', hardened: 'Evasive', regen: 'Regen', ramp: 'Escalating' };
  const kwText = { beacon: 'Roll the row when it arrives or comes back.', noblock: 'Blocks don’t stop it.', onpoint: 'Only on point takes its damage, doubled.', hardened: 'Only a double can hit it.', regen: 'At the end of each round, put back one die it lost.', ramp: '+1 Damage every round it stays up.' };
  // The dice strip along the bottom edge: the dice to set under the card, then the one extra number per player past
  // two. On the table the physical dice sit just below it.
  const strip = (d, px) => `<div class="dice"><div class="set">${d.base.map(n => pip(n, px)).join('')}</div>
  <div class="plus"><b>+</b>${pip(d.extra, 18)}<span>per player past 2</span></div></div>`;
  function mobCard(m) {
    return `<div class="card"><div class="tag">${m.domain} · back on 2–${rowTop(m.persist[1])}</div><div class="nm">${m.name}</div>
  <div class="dmg">Damage <b>${m.dmg}</b></div><div class="kw"><b>${kw[m.ability]}.</b> ${kwText[m.ability]}</div><div class="fl">${m.flavor}</div>
  ${strip(diceFor(m), 28)}</div>`;
  }
  function bossCard(b) {
    return `<div class="card boss"><div class="tag">Boss · arrives at 05:59</div><div class="nm">${b.name}</div><div class="dmg">Damage <b>${b.dmg}</b></div>
  <div class="kw"><b>${b.abilityName}.</b> +2 Damage until it has lost two dice. Agent dice can’t hit it.</div>
  ${strip(diceFor(b, true), 30)}</div>`;
  }
  const PERK = {
    HUN: 'Against a mob that came back from the row, your dice also match one higher or one lower. A comeback you finish is gone for good.',
    RES: 'Against the highest-Damage mob (boss included), your dice also match one higher or one lower.',
    ENG: 'Every even number is a double for you.',
    SOA: `The tray holds one more agent (${D.sharedKit + 1}). Every won fight draws one more agent card.`,
    PAT: `After every fight, heal ${D.perks.PAT.fight} HP split across the crew. Recovery Agents heal ${D.perks.PAT.recover} more.`,
  };
  const analystCard = id => `<div class="card"><div class="tag">Analyst · standard d6</div><div class="nm">${cls(id).name}</div>
  <div class="small">Your doubles</div><div class="dbls">${DOUBLES[id].map(n => `<div class="dface">${pip(n, 30)}</div>`).join('')}</div>
  <div class="note">A double takes its match and any one more die from the same mob, or guards.</div><div class="kw">${PERK[id]}</div></div>`;
  const AGENT = {
    triage: ['Triage Agent', 'Rolls an agent die every round.', 'On point rolls 3 more crew dice this round.'],
    enrich: ['Enrichment Agent', 'Once a round, turn one crew die to any number.', 'Every die matches anything this round.'],
    contain: ['Containment Agent', `The highest-Damage mob deals ${D.containCut} less, never below 1.`, 'Remove one die from every mob (the boss keeps at least one).'],
    recover: ['Recovery Agent', `After every fight, heal ${D.recoverHeal} HP split across the crew.`, `Heal ${D.recoverBurn} HP split across the crew.`],
  };
  const agentCard = t => `<div class="card agent"><div class="tag">Agent</div><div class="nm">${AGENT[t][0]}</div>
  <div class="mode"><b>Run it</b> ${AGENT[t][1]}</div><div class="mode"><b>Or burn it</b> ${AGENT[t][2]}</div></div>`;
  const legend = `<div class="card"><div class="tag">Reference · every die</div><div class="nm">Dice</div>
  <div class="ex">${pip(4, 24)}<span>takes out a</span>${pip(4, 24)}<span>under a mob</span></div>
  <div class="note">A die takes out one die under a mob showing <b>exactly</b> its number.</div>
  <div class="kw">A double: its match <b>and</b> any one more die from the same mob, <b>or</b> guard. Never both.</div>
  <div class="note">Your analyst card shows your doubles. Other dice (crew die, agent dice): only a ${pip(6, 14)} is a double.</div>
  <div class="note">3–4 players: add the card’s + die once per player past 2.</div>
  <div class="note">Row: roll 2 amber dice; a row mob comes back if the sum is at most its number.</div></div>`;

  // The prototype's card set: six mobs, the Lockjaw Syndicate, five analysts, four agent types (two each).
  const MOB_IDS = ['mailer', 'spray', 'imp', 'druid', 'wyrmling', 'mimic'];
  const BOSS_ID = 'wyrm', ANALYST_IDS = ['HUN', 'RES', 'ENG', 'SOA', 'PAT'], AGENT_IDS = ['triage', 'enrich', 'contain', 'recover'];
  const mobs = () => MOB_IDS.map(id => D.mobs.find(m => m.id === id));
  const boss = () => D.bosses.find(b => b.id === BOSS_ID);

  // The card face CSS, shared by print and web. Page and sheet layout stay in each build.
  const CARD_CSS = `.card{border:1px dashed #999;background:${C.bg};padding:12px;display:flex;flex-direction:column;gap:6px;overflow:hidden}
.tag{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:${C.mut}}
.nm{font-weight:700;font-size:17px;line-height:1.1;text-transform:uppercase}.dmg{font-family:'IBM Plex Mono',monospace;font-size:11px;text-transform:uppercase;color:${C.mut}}.dmg b{font-size:20px;color:${C.ink}}
.kw{font-size:12px;line-height:1.35;background:#FCE6DC;border:1px solid ${C.fl};padding:5px 7px}.fl{font-size:10.5px;line-height:1.35;color:${C.mut};border-top:1px solid ${C.rule};padding-top:5px}
.dice{margin:auto -12px -12px;padding:7px 10px 9px;background:#fff;border-top:2px solid ${C.ink};display:flex;flex-direction:column;align-items:center;gap:5px}
.dice .set{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}.boss .dice .set{max-width:180px}
.dice .plus{display:flex;align-items:center;gap:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:${C.mut}}.dice .plus b{font-size:14px;color:${C.ink}}
.dbls{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.dface{background:#fff;border:1px solid ${C.rule};height:42px;display:flex;align-items:center;justify-content:center}
.ex{display:flex;align-items:center;gap:5px;font-size:11px;color:${C.mut};background:#fff;border:1px solid ${C.rule};padding:5px 7px}
.note{font-size:11px;line-height:1.35;color:${C.mut}}.note svg{vertical-align:-2px}.note b{color:${C.ink}}
.mode{font-size:12px;line-height:1.35}.mode b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;color:${C.cy}}.small{font-size:11px;font-weight:700}`;

  return { C, DOUBLES, isDouble, rowTop, pip, cls, diceFor, slotsFor, kw, kwText, strip, mobCard, bossCard, PERK, analystCard, AGENT, agentCard, legend,
    MOB_IDS, BOSS_ID, ANALYST_IDS, AGENT_IDS, mobs, boss, CARD_CSS };
});
