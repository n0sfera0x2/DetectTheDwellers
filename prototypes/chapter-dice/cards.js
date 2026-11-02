// Shared card markup for the chapter dice prototype. The paper build (paper/build.js) prints these cards and the
// web build (web/build.js) puts the very same markup on the table, so a card reads identically in both.
// Works in Node (require) and in the browser (inlined by web/build.js with a data object as D and the scenes it
// needs as CD_ART). The cards wear the real game's Ink & Static look (deck/cards.js): paper ground, a cut-corner frame
// in the card's accent, a solid tab, and the art set in as a dark screen of fixed height per card type.
// Throwaway prototype code: nothing outside prototypes/ may import this.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../data/cards.json'), require('./sim').numbersFor, { ...require('../../data/art.json'), ...require('./art/art.json') }, require('../../data/art-print.json')); // art/art.json: the consumables' own scenes (art/scenes.js)
  else root.CDCards = factory(root.CD_DATA, root.CD_NUMBERS, root.CD_ART || {}, root.CD_ART || {});
})(typeof self !== 'undefined' ? self : this, function (D, numbersFor, ART, PRINT) {
  const C = { bg: '#F6F2EC', ink: '#1A1418', mut: '#5A4B43', rule: '#D8CEC3', cy: '#005F73', fl: '#FF5A2A', ex: '#A8360F', E: '#A8360F', am: '#8A4510' };
  // Ink & Static scenes, as the real game picks them: a mob by its id, the boss by its print scene (art-print.json
  // boss_<id>) else its art.json scene, an analyst by class id, an agent by kit_<type>. Print scenes mark their
  // ids with {{SID}}; one fixed suffix keeps the markup identical on paper and web (card parity).
  const SCENE = {
    mob: id => ART[id] || '', boss: id => String(PRINT['boss_' + id] || ART[id] || '').replace(/\{\{SID\}\}/g, 'cd'),
    analyst: id => ART[id] || '', agent: t => ART['kit_' + t] || '', sit: id => ART['sit_' + id] || '',
  };
  // The art.json / art-print.json keys the cards use, so web/build.js inlines only those.
  const artKeys = () => ({ art: [...MOB_IDS, ...ANALYST_IDS, ...[...AGENT_IDS, ...CONS_IDS].map(t => ITEM[t][2]), ...SIT_IDS.map(id => 'sit_' + id), BOSS_ID], print: ['boss_' + BOSS_ID] });
  const art = svg => `<div class="art">${svg}</div>`;
  const tab = '<i class="tab"></i>';
  const hd = (tg, hud) => `<div class="hd"><span class="tg">${tg}</span>${hud ? `<span class="hud">${hud}</span>` : ''}</div>`;
  // Exact numbers (2026-10-30). Every die is a standard pip d6 and reads as its number. A mob card prints the dice to
  // set under it; a rolled die takes out a die showing exactly its number. Which numbers are doubles depends on the
  // analyst; every other die (the solo crew die, the Triage agent die) doubles only on a 6.
  // Same numbers as sim.js DOUBLES (web/spec.js checks they agree).
  // Signature doubles (2026-10-31): one number of your own plus the 6 everyone has.
  const DOUBLES = { HUN: [4, 6], RES: [3, 6], ENG: [1, 6], SOA: [2, 6], CREW: [6], AGENT: [6] };
  const isDouble = (id, n) => (DOUBLES[id] || DOUBLES.CREW).includes(n);
  // The persistence row on 2d6: a row mob comes back if the sum is at most its number. The data's d20 ranges map by
  // tier (top 12+ → 5, 10–11 → 4, 8–9 → 3, 7 or less → 2): every beaten mob goes back to the row, so the odds sit
  // three lower than they did when a comeback was gone for good. Same as sim.js rowTop (ROWSHIFT 3).
  const rowTop = N => N >= 12 ? 5 : N >= 10 ? 4 : N >= 8 ? 3 : 2;
  const cls = id => D.classes.find(c => c.id === id);
  // The dice printed on a mob or boss card: the base dice (sim.js numbersFor, clustered round the mob's main number,
  // printed low to high so they're quick to set out) and the + die a crew adds per player past three: always a 6.
  // Base = one fewer than the mob's d20 hits; the boss two fewer than its two-player hits (same as sim.js).
  // Solo and 3 players play the base dice.
  const PAST = 3;
  const diceFor = (m, boss) => {
    const base = boss ? m.hitsBase + D.bossAdd[2] - 2 : m.hits - 2; // two fewer than the d20 hits since 2026-10-31 (same as sim.js)
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
  const kwText = { beacon: 'Roll the row when it arrives or comes back.', noblock: 'Blocks don’t stop it.', onpoint: 'Only on point takes its damage, doubled.', hardened: 'Only a double can hit it. A double of another number takes out one die.', regen: 'At the end of each round, put back one die it lost.', ramp: '+1 Damage every round it stays up.' };
  // The dice strip along the bottom edge: the dice to set under the card, then the + die per player past three. On
  // the table the physical dice sit just below it.
  const strip = (d, px) => `<div class="dice"><div class="set">${d.base.map(n => pip(n, px)).join('')}</div>
  <div class="plus"><b>+</b>${pip(d.extra, 18)}<span>per player past ${PAST}</span></div></div>`;
  // The keyword's icon from the game data, as the printed d20 mob cards show it.
  const kwIcon = m => { const k = D.keywords && D.keywords[m.kw]; return k ? `<svg class="kwi" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#A8360F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${k.icon}</svg>` : ''; };
  const nmRow = (name, dmg) => `<div class="nr"><div class="nm">${name}</div><div class="dmg"><span>Damage</span><b>${dmg}</b></div></div>`;
  // Baselining (2026-10-31): an alarm prints a harder "Baseline it" condition: set more threat dice showing its main
  // number's opposite side (7 − main). Beat it with them and tuck it under an agent: that agent's card gains the line
  // below while it stays in the tray. Since 2026-11-01: 3 dice (was 4), and only the four heavier alarms have a line
  // (the Mailer Daemon and Password Sprayer cost more than their lines gave back). Same as sim.js BASES and BASEDICE.
  const BASE_N = 3;
  const BASE = {
    imp: 'On point rolls one more die.',
    druid: 'Comebacks don’t hit on arrival.',
    wyrmling: 'Add 1 to every row roll.',
    mimic: 'After every won fight, heal 5 split across the crew.',
  };
  const baseDie = id => 7 - numbersFor(id, 1)[0];
  const baseLine = m => BASE[m.id] ? `<div class="base"><span class="bh"><b>Baseline it</b>${Array(BASE_N).fill(pip(baseDie(m.id), 14)).join('')}</span><span class="bt">${BASE[m.id]}</span></div>` : '';
  function mobCard(m) {
    return `<div class="card mob">${tab}${art(SCENE.mob(m.id))}${hd(m.domain, `back on 2–${rowTop(m.persist[1])}`)}${nmRow(m.name, m.dmg)}
  <div class="kw">${kwIcon(m)}<span><b>${kw[m.ability]}.</b> ${kwText[m.ability]}</span></div><div class="fl">${m.flavor}</div>
  ${strip(diceFor(m), 24)}${baseLine(m)}</div>`;
  }
  function bossCard(b) {
    return `<div class="card boss">${tab}${art(SCENE.boss(b.id))}${hd('Boss', 'arrives at 05:59')}${nmRow(b.name, b.dmg)}
  <div class="kw"><span><b>${b.abilityName}.</b> +2 Damage until it has lost two dice.</span></div>
  ${strip(diceFor(b, true), 24)}</div>`;
  }
  const PERK = {
    HUN: 'Your 1s match any number on any alarm.',
    RES: 'Once a fight, after you roll, pick an alarm: it deals no damage this round.',
    ENG: 'Once a round, turn one of your dice to its opposite side (1↔6, 2↔5, 3↔4). It counts as one die.',
    SOA: 'You hold one more agent: 3 (solo 5). Solo: when you use a consumable, roll a die. On a 2 or 6, keep it.',
  };
  const analystCard = id => `<div class="card analyst cy">${tab}${art(SCENE.analyst(id))}${hd('Analyst', 'standard d6')}<div class="nm">${cls(id).name}</div>
  <div class="small">Your doubles</div><div class="dbls">${DOUBLES[id].map(n => `<div class="dface">${pip(n, 26)}</div>`).join('')}</div>
  <div class="note">A double counts as two dice showing its number, or guards anyone.</div><div class="perk">${PERK[id]}</div></div>`;
  // Items (2026-10-31): the deck is items. Agents are passive: each player holds 2 (the Soarcerer 3; solo 4, or 5).
  // Since 2026-11-01 they work for the whole crew, and Triage rolls one more die of its holder's own. Consumables
  // don't take a slot: keep them in hand and use each once. [name, rule, art key].
  const AGENT = {
    triage: ['Triage Agent', 'Every round, roll one more of your own dice.', 'kit_triage'],
    enrich: ['Enrichment Agent', 'Once a round, turn any crew die to any number.', 'kit_enrich'],
    contain: ['Containment Agent', `The highest-Damage alarm deals ${D.containCut} less to everyone, never below 1.`, 'kit_contain'],
    recover: ['Recovery Agent', `After every won fight, heal ${D.recoverHeal} HP split across the crew.`, 'kit_recover'],
  };
  const CONS = {
    surge: ['Surge Playbook', 'After the roll: roll 3 more dice.', 'cons_surge'],
    intel: ['Threat Intel Feed', 'After the roll: every die matches anything this round.', 'cons_intel'],
    isolate: ['Isolation Script', 'Remove one die from every alarm (the boss keeps at least one).', 'cons_isolate'],
    coffee: ['Shift Coffee', `Heal ${D.recoverBurn} HP split across the crew.`, 'cons_coffee'],
    freeze: ['Change Freeze', 'Skip the next row roll.', 'cons_freeze'],
  };
  const ITEM = { ...AGENT, ...CONS }, isAgent = t => !!AGENT[t];
  const agentCard = t => isAgent(t)
    ? `<div class="card agent cy">${tab}${art(ART[AGENT[t][2]] || '')}${hd('Agent', 'passive')}<div class="nm">${AGENT[t][0]}</div><div class="mode"><b>While you hold it</b> ${AGENT[t][1]}</div></div>`
    : `<div class="card agent use">${tab}${art(ART[CONS[t][2]] || '')}${hd('Consumable', 'use once')}<div class="nm">${CONS[t][0]}</div><div class="mode"><b>Use it</b> ${CONS[t][1]}</div></div>`;
  const legend = `<div class="card ref am">${tab}${hd('Reference', 'every die')}<div class="nm">Dice</div>
  <div class="ex">${pip(4, 24)}<span>takes out a</span>${pip(4, 24)}<span>exactly</span></div>
  <div class="ex">${pip(2, 24)}<span>double takes</span>${pip(2, 24)}${pip(2, 24)}<span>anywhere</span></div>
  <div class="kw">A double counts as <b>two</b> dice showing its number, <b>or</b> guards anyone.</div>
  <div class="note">Your doubles are on your analyst card. The solo crew die: only a ${pip(6, 14)}. <b>Two of yours on one number: a double.</b></div>
  <div class="note"><b>Once a round, reroll one of your own dice.</b></div>
  <div class="note">4 players: add the alarm’s + die.</div>
  <div class="note">Row: 2 amber dice; back if the sum is at most its number.</div></div>`;

  // The shift tracker (2026-11-01): the table's memory for every once-a-round, once-a-fight and waiting effect. Coins
  // go on its boxes when something is used; a row is cleared when its round or fight ends. Paper only: the web tracks it.
  const box = t => `<span class="bx">${t}</span>`;
  const tracker = `<div class="card ref trk am">${tab}${hd('Reference', 'coins')}<div class="nm">Shift tracker</div>
  <div class="note">Put a coin on a box when you use it. Clear a row when its round or fight ends.</div>
  <div class="trow"><b>This round</b>${[1, 2, 3, 4].map(n => box('Reroll ' + n)).join('')}${box('Engineer turn')}${box('Enrichment')}</div>
  <div class="trow"><b>This fight</b>${box('Responder stand')}${box('Hold the room: win, draw 1')}</div>
  <div class="trow"><b>Waiting</b>${box('Change Freeze: skip the next row roll')}${box(`Mute: next alarm + ${pip(6, 12)}`)}</div>
  <div class="note"><b>Escalating:</b> a coin on the alarm each round it stays up. <b>Regen:</b> set taken dice aside in a line; it puts back the last.</div></div>`;
  // Situations (2026-10-30): one flips before every flip after the first (the boss's too), once who's on point is
  // picked. The real game's situations (names, scenes and story lines from the data) with rules rewritten for the
  // dice. Each offers a choice, except the event. Same rules as sim.js situation(). [label, rule] per option.
  const SIT_IDS = ['insider', 'pager', 'usb', 'chatter', 'lateral', 'patch'];
  const SIT = {
    insider: { kind: 'Stay or run', rule: 'Turn the top alarm face up, then choose.', opts: [['Hold the room', 'On point takes Exposed. Win the fight: draw an item.'], ['Fall back', 'It hits everyone once and goes on the row unfought. Not the boss.']] },
    pager: { kind: 'Stay or run', opts: [['Ride it out', 'Everyone loses 2 HP.'], ['Mute it', `The next alarm sets one more threat die: a ${pip(6, 13)}.`]] },
    usb: { kind: 'Grab', opts: [['Grab it', 'On point rolls 3 dice. Any pair: draw 2 items and take Focused. No pair: take Rattled.'], ['Leave it', 'Nothing happens.']] },
    chatter: { kind: 'Grab', opts: [['Dig in', `On point picks 1–4 dice and rolls them. Any ${pip(6, 13)}: draw 2 items. None: lose 1 HP per die.`], ['Let it go', 'Nothing happens.']] },
    lateral: { kind: 'Event', rule: 'Roll the row now. Anything that comes back hits on arrival and joins the next fight.' },
    patch: { kind: 'Choice', opts: [['Take a breather', 'Everyone heals 2 HP.'], ['Raid the supply closet', 'Draw an item.']] },
  };
  const sitData = id => D.situations.find(s => s.id === id);
  const sitCard = id => { const s = SIT[id], d = sitData(id);
    return `<div class="card sit am">${tab}${art(SCENE.sit(id))}${hd(s.kind, 'situation')}<div class="nm">${d.name}</div><div class="fl">${d.text}</div>
  ${s.rule ? `<div class="srule">${s.rule}</div>` : ''}${(s.opts || []).map(([l, r]) => `<div class="opt"><b>${l}</b>${r}</div>`).join('')}</div>`; };
  // Conditions: a card a player keeps in front of them. One of each; a player can't hold two of the same.
  const COND_IDS = ['rattled', 'exposed', 'focused'];
  const COND = {
    rattled: ['Rattled', 'Your next roll has no doubles. Then discard this.'],
    exposed: ['Exposed', 'Your next fight: each round anything hits you, take 1 more. Discard this after the fight.'],
    focused: ['Focused', 'Once, after you roll, turn one of your dice to any number. Then discard this.'],
  };
  const condCard = id => `<div class="card cond ${id === 'focused' ? 'cy' : ''}">${tab}${hd('Condition', id === 'focused' ? 'keep it' : 'bad')}<div class="nm">${COND[id][0]}</div><div class="ctext">${COND[id][1]}</div></div>`;

  // The prototype's card set: six alarms, the Lockjaw Syndicate, four analysts, 16 items (6 agents, 10 consumables).
  const MOB_IDS = ['mailer', 'spray', 'imp', 'druid', 'wyrmling', 'mimic'];
  const BOSS_ID = 'wyrm', ANALYST_IDS = ['HUN', 'RES', 'ENG', 'SOA'], AGENT_IDS = ['triage', 'enrich', 'contain', 'recover'], CONS_IDS = ['surge', 'intel', 'isolate', 'coffee', 'freeze'];
  // The item deck, as sim.js KIT: Triage and Containment ×2, Enrichment and Recovery ×1, each consumable ×2.
  const ITEM_DECK = ['triage', 'triage', 'contain', 'contain', 'enrich', 'recover', ...CONS_IDS.flatMap(t => [t, t])];
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
.nm{font-weight:700;font-size:16px;line-height:1.1;text-transform:uppercase;letter-spacing:.01em;text-wrap:balance}.card.boss .nm{color:${C.ex}}.card.agent .nm{color:${C.cy}}.card.agent.use .nm{color:${C.ex}}
.dmg{flex:none;display:flex;flex-direction:column;align-items:flex-end;background:#fff;border:1px solid ${C.rule};padding:1px 6px 2px;line-height:1}
.dmg span{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:10px;line-height:12px;letter-spacing:.04em;text-transform:uppercase;color:${C.mut}}.dmg b{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:19px;line-height:20px;color:${C.ink};font-variant-numeric:tabular-nums}
.kw{display:flex;gap:6px;align-items:flex-start;font-size:11px;line-height:1.3;background:#FCE6DC;border:1px solid ${C.fl};padding:3px 6px}.kw b{font-weight:700;text-transform:uppercase;font-size:11px;color:${C.ex}}.kw .kwi{flex:none;margin-top:1px}
.fl{font-size:10px;line-height:1.35;color:${C.mut};border-top:1px solid ${C.rule};padding-top:4px}
.card.mob .art{height:74px}.card.mob .dice{flex-direction:row;justify-content:center;gap:8px;padding:5px 8px 6px}.card.mob .plus span{max-width:54px;line-height:1.1;font-size:8.5px}
.base{margin:-6.5px -7.5px 6.5px;padding:3px 8px 4px;background:#EAF6F8;border-top:1px dashed ${C.ink};font-size:9.5px;line-height:1.25;display:flex;flex-direction:column;gap:1px}.base .bh{display:flex;align-items:center;gap:2px}.base .bh b{font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-right:4px;color:${C.ink}}
.dice{margin:auto -7.5px 6.5px;padding:6px 8px 7px;background:#fff;border-top:2px solid ${C.ink};display:flex;flex-direction:column;align-items:center;gap:4px;clip-path:polygon(0 0,100% 0,100% 100%,15px 100%,0 calc(100% - 15px))}
.dice .set{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}.boss .dice .set{max-width:150px}
.dice .plus{display:flex;align-items:center;gap:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:${C.mut}}.dice .plus b{font-size:14px;color:${C.ink}}
.dbls{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.dface{background:#fff;border:1px solid ${C.rule};height:34px;display:flex;align-items:center;justify-content:center}
.perk{font-size:11px;line-height:1.33;font-weight:600;background:#fff;border:1px solid ${C.cy};padding:4px 7px;margin-top:auto;margin-bottom:11px}
.ex{display:flex;align-items:center;gap:5px;font-size:11px;color:${C.mut};background:#fff;border:1px solid ${C.rule};padding:5px 7px}
.note{font-size:11px;line-height:1.35;color:${C.mut}}.note svg{vertical-align:-2px}.note b{color:${C.ink}}
.trow{display:flex;flex-wrap:wrap;gap:3px;align-items:center;font-size:10px;line-height:1.25}.trow b{width:100%;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:${C.am}}
.bx{background:#fff;border:1px solid ${C.rule};padding:2px 5px;color:${C.ink}}.bx svg{vertical-align:-2px}.card.trk{gap:6px}
.card.ref .kw{display:block}.card.ref .kw b{text-transform:none;font-size:inherit}
.card.sit .art{height:74px}.card.sit .fl{border-top:0;padding-top:0}.card.sit .nm{color:${C.am}}
.srule{font-size:11px;line-height:1.3;font-weight:600}
.opt{font-size:11px;line-height:1.3;background:#fff;border:1px solid ${C.rule};padding:3px 6px}.opt b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:${C.am}}
.card.cond{justify-content:flex-start;gap:10px;padding-top:20px}.card.cond .nm{font-size:22px}.card.cond.cy .nm{color:${C.cy}}.card:not(.cy).cond .nm{color:${C.ex}}.ctext{font-size:14px;line-height:1.35;font-weight:600}
.mode{font-size:12px;line-height:1.35;border-top:1px solid ${C.rule};padding-top:4px}.mode b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:${C.cy}}.mode:last-child b{color:${C.am}}.small{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}`;

  return { BASE, BASE_N, baseDie, SIT_IDS, SIT, sitCard, COND_IDS, COND, condCard, C, PAST, DOUBLES, isDouble, rowTop, pip, cls, diceFor, slotsFor, kw, kwText, strip, mobCard, bossCard, PERK, analystCard, AGENT, CONS, ITEM, isAgent, ITEM_DECK, CONS_IDS, agentCard, legend, tracker,
    MOB_IDS, BOSS_ID, ANALYST_IDS, AGENT_IDS, mobs, boss, CARD_CSS, SCENE, artKeys };
});
