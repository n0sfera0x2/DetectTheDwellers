// Shared card markup for the chapter dice prototype. The paper build (paper/build.js) prints these cards and the
// web build (web/build.js) puts the very same markup on the table, so a card reads identically in both.
// Works in Node (require) and in the browser (inlined by web/build.js with a data object as D).
// Throwaway prototype code: nothing outside prototypes/ may import this.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../data/cards.json'), require('./sim').symbolsFor);
  else root.CDCards = factory(root.CD_DATA, root.CD_SYMBOLS);
})(typeof self !== 'undefined' ? self : this, function (D, symbolsFor) {
  const C = { bg: '#F6F2EC', ink: '#1A1418', mut: '#5A4B43', rule: '#D8CEC3', D: '#005F73', C: '#8A4510', E: '#A8360F', fl: '#FF5A2A' };
  const NAME = { D: 'Detect', C: 'Contain', E: 'Eradicate' };
  // The three response symbols: an eye, a shield, a bolt. Distinct shapes first, colour second.
  const PATH = {
    D: '<path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2.3" fill="currentColor"/>',
    C: '<path d="M8 1.3l5.6 2.1v4.3c0 3.5-2.4 5.9-5.6 7-3.2-1.1-5.6-3.5-5.6-7V3.4z" fill="currentColor"/>',
    E: '<path d="M9.6 1L3 9.2h4.6L6.4 15 13 6.8H8.4z" fill="currentColor"/>',
  };
  const icon = (s, px) => `<svg viewBox="0 0 16 16" width="${px}" height="${px}" style="color:${C[s]};display:inline-block;vertical-align:middle">${PATH[s]}</svg>`;
  // Standard pip d6s. One key for every die: 1–2 Detect, 3–4 Contain, 5–6 Eradicate. What differs per analyst is
  // which numbers are doubles for them; every other die (the solo crew die, the Triage agent die) doubles on a 6.
  // Same numbers as sim.js DOUBLES (web/spec.js checks they agree).
  const KEY = ['D', 'D', 'C', 'C', 'E', 'E'];
  const KEY_RANGE = { D: '1–2', C: '3–4', E: '5–6' };
  const DOUBLES = { HUN: [1, 2, 6], RES: [3, 4, 6], ENG: [2, 4, 6], SOA: [1, 6], PAT: [3, 6], CREW: [6], AGENT: [6] };
  const symOf = n => KEY[n - 1];
  const isDouble = (id, n) => (DOUBLES[id] || DOUBLES.CREW).includes(n);
  // The persistence row on 2d6: a row mob comes back if the sum is at most its number. The data's d20 ranges map by
  // tier (top 12+ → 8, 10–11 → 7, 8–9 → 6, 7 or less → 5). Same as sim.js rowTop.
  const rowTop = N => N >= 12 ? 8 : N >= 10 ? 7 : N >= 8 ? 6 : 5;
  const cls = id => D.classes.find(c => c.id === id);
  // A real die face: rounded square with pips. Positions on a 16-unit face.
  const PIPS = { 1: [[8, 8]], 2: [[4.6, 4.6], [11.4, 11.4]], 3: [[4.6, 4.6], [8, 8], [11.4, 11.4]], 4: [[4.6, 4.6], [11.4, 4.6], [4.6, 11.4], [11.4, 11.4]],
    5: [[4.6, 4.6], [11.4, 4.6], [8, 8], [4.6, 11.4], [11.4, 11.4]], 6: [[4.6, 4.2], [11.4, 4.2], [4.6, 8], [11.4, 8], [4.6, 11.8], [11.4, 11.8]] };
  const pip = (n, px) => `<svg class="pip" viewBox="0 0 16 16" width="${px}" height="${px}" style="display:inline-block;vertical-align:middle" role="img" aria-label="${n}"><rect x=".7" y=".7" width="14.6" height="14.6" rx="3.2" fill="#fff" stroke="${C.ink}" stroke-width="1.1"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.45" fill="${C.ink}"/>`).join('')}</svg>`;
  // A rolled number as it reads: the pip face, then its symbol (twice for a double).
  const dieFace = (n, dbl, px) => `<span class="df">${pip(n, px)}<span class="dfs">${icon(symOf(n), px * 0.62)}${dbl ? icon(symOf(n), px * 0.62) : ''}</span></span>`;
  // A symbol-only face [symbol, count], for a die an Enrichment Agent turned to another symbol.
  const face = ([s, n], px) => n === 2 ? `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:0">${icon(s, px * 0.62)}${icon(s, px * 0.62)}</span>` : icon(s, px);

  // ---- Cards (2.5 × 3.5 in) ----------------------------------------------------------------------------------
  const row = (syms, px = 20) => syms.map(s => icon(s, px)).join('');
  const extra = (domain, hits, k) => symbolsFor(domain, hits + k).slice(hits);
  const kw = { beacon: 'Beacon', noblock: 'Piercing', onpoint: 'Targeted', hardened: 'Evasive', regen: 'Regen', ramp: 'Escalating' };
  const kwText = { beacon: 'Roll the row when it arrives or comes back.', noblock: 'Blocks don’t stop it.', onpoint: 'Only on point takes its damage, doubled.', hardened: 'Only a double can hit it.', regen: 'Gets one symbol back at the end of each round.', ramp: '+1 Damage every round it stays up.' };
  // The key, printed on every mob so a table can read it without the rules.
  const keyStrip = `<div class="key">${['D', 'C', 'E'].map(x => `<span>${icon(x, 12)}${KEY_RANGE[x]}</span>`).join('')}</div>`;
  function mobCard(m) {
    const syms = symbolsFor(m.domain, m.hits);
    return `<div class="card"><div class="tag">${m.domain} · back on 2–${rowTop(m.persist[1])}</div><div class="nm">${m.name}</div>
  <div class="dmg">Damage <b>${m.dmg}</b></div><div class="syms">${row(syms, 22)}</div>
  <div class="add">3 players add ${row(extra(m.domain, m.hits, D.mobAdd[3]), 13)} · 4 players add ${row(extra(m.domain, m.hits, D.mobAdd[4]), 13)}</div>${keyStrip}
  <div class="kw"><b>${kw[m.ability]}.</b> ${kwText[m.ability]}</div><div class="fl">${m.flavor}</div></div>`;
  }
  function bossCard(b) {
    const base = b.hitsBase + D.bossAdd[2], syms = symbolsFor('Identity', base);
    return `<div class="card boss"><div class="tag">Boss · arrives at 05:59</div><div class="nm">${b.name}</div><div class="dmg">Damage <b>${b.dmg}</b></div>
  <div class="syms">${row(syms, 18)}</div><div class="add">3 players add ${row(extra('Identity', base, D.bossAdd[3] - D.bossAdd[2]), 13)} · 4 players add ${row(extra('Identity', base, D.bossAdd[4] - D.bossAdd[2]), 13)}</div>${keyStrip}
  <div class="kw"><b>${b.abilityName}.</b> +2 Damage until it has lost two symbols. Agent dice can’t hit it.</div></div>`;
  }
  const PERK = {
    HUN: 'Any number you roll is wild against a mob that came back from the row. A comeback you finish is gone for good.',
    RES: 'Your Contain numbers (3–4) are wild against the highest-Damage mob, boss included.',
    ENG: 'Every even number is a double for you: hit twice or guard, more often.',
    SOA: `The tray holds one more agent (${D.sharedKit + 1}). Every won fight draws one more agent card.`,
    PAT: `After every fight, heal ${D.perks.PAT.fight} HP split across the crew. Recovery Agents heal ${D.perks.PAT.recover} more.`,
  };
  const analystCard = id => `<div class="card"><div class="tag">Analyst · standard d6</div><div class="nm">${cls(id).name}</div>
  <div class="small">Your doubles</div><div class="dbls">${DOUBLES[id].map(n => `<div class="dface">${dieFace(n, true, 26)}</div>`).join('')}</div>
  <div class="note">Any other number takes one symbol.</div><div class="kw">${PERK[id]}</div></div>`;
  const AGENT = {
    triage: ['Triage Agent', 'Rolls an agent die every round.', 'On point rolls 3 more crew dice this round.'],
    enrich: ['Enrichment Agent', 'Once a round, turn one crew die to any symbol.', 'Every die is wild this round.'],
    contain: ['Containment Agent', `The highest-Damage mob deals ${D.containCut} less, never below 1.`, 'Remove one symbol from every mob (the boss keeps at least one).'],
    recover: ['Recovery Agent', `After every fight, heal ${D.recoverHeal} HP split across the crew.`, `Heal ${D.recoverBurn} HP split across the crew.`],
  };
  const agentCard = t => `<div class="card agent"><div class="tag">Agent</div><div class="nm">${AGENT[t][0]}</div>
  <div class="mode"><b>Run it</b> ${AGENT[t][1]}</div><div class="mode"><b>Or burn it</b> ${AGENT[t][2]}</div></div>`;
  const legend = `<div class="card"><div class="tag">Reference · every die</div><div class="nm">Dice</div>
  <div class="keyref">${['D', 'C', 'E'].map(x => { const ns = [1, 2, 3, 4, 5, 6].filter(n => symOf(n) === x); return `<div>${ns.map(n => pip(n, 22)).join('')}<span>${icon(x, 18)}<b>${NAME[x]}</b></span></div>`; }).join('')}</div>
  <div class="note">Your analyst card shows your doubles. Other dice (crew die, agent dice): only a ${pip(6, 13)} is a double.</div>
  <div class="kw">A double: two of that symbol from one mob, <b>or</b> guard. Never both.</div>
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
.syms{display:flex;flex-wrap:wrap;gap:3px;background:#fff;border:1px solid ${C.rule};padding:6px}.add{font-size:10.5px;color:${C.mut}}
.kw{font-size:12px;line-height:1.35;background:#FCE6DC;border:1px solid ${C.fl};padding:5px 7px}.fl{font-size:10.5px;line-height:1.35;color:${C.mut};margin-top:auto;border-top:1px solid ${C.rule};padding-top:5px}
.key{display:flex;gap:10px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:600;color:${C.mut};border-top:1px solid ${C.rule};border-bottom:1px solid ${C.rule};padding:3px 0}.key span{display:inline-flex;align-items:center;gap:3px}
.dbls{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.dface{background:#fff;border:1px solid ${C.rule};height:40px;display:flex;align-items:center;justify-content:center}
.df{display:inline-flex;align-items:center;gap:4px}.dfs{display:inline-flex;flex-direction:column;line-height:0;gap:1px}
.note{font-size:11px;line-height:1.35;color:${C.mut}}.note svg{vertical-align:-2px}
.keyref{display:flex;flex-direction:column;gap:4px}.keyref div{display:flex;align-items:center;gap:4px;background:#fff;border:1px solid ${C.rule};padding:4px 6px}.keyref span{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px}
.mode{font-size:12px;line-height:1.35}.mode b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;color:${C.D}}.small{font-size:11px;font-weight:700}`;

  return { C, NAME, PATH, icon, KEY, KEY_RANGE, DOUBLES, symOf, isDouble, rowTop, pip, dieFace, cls, face, row, extra, kw, kwText, keyStrip, mobCard, bossCard, PERK, analystCard, AGENT, agentCard, legend,
    MOB_IDS, BOSS_ID, ANALYST_IDS, AGENT_IDS, mobs, boss, CARD_CSS };
});
