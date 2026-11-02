// Chapter dice prototype: the same cut-down shift played several ways, to decide whether d6s (Escape the Dark
// Castle's chapter dice) beat the current d20 + bonus ≥ Defense system.
//   d20: today's rules. Hit = d20 + bonus ≥ Defense; 18–20 is two hits and blocks; a 14+ crew die can guard.
//   n6 (default, exact numbers, 2026-10-30): the mob card prints the dice to set under it, clustered round a main
//        number (1 2 2 2 3). A rolled die takes out a die showing exactly its number; a double counts as two dice
//        showing its number (or guards). Four players add a 6 under every mob. The persistence row rolls 2d6.
//   d6 (SYS=d6, the earlier symbol system): pip d6s read 1–2 Detect, 3–4 Contain, 5–6 Eradicate; a mob's hits are
//        a row of symbols (DICE=custom: the custom symbol dice before that).
// Shared: the real mobs, bosses, keywords, damage, persistence row ranges, kit economy, one bot brain that scores
// every legal dice allocation the same way in every system.
// Throwaway: nothing in src/, data/ or ui/ reads this. Usage: node prototypes/chapter-dice/sim.js
const D = require('../../data/cards.json');

const SYM = ['D', 'C', 'E']; // Detect, Contain, Eradicate
// A mob's symbol row: its main response first. Domain sets the mix (identity is found, network is cut off...).
const MIX = { Identity: 'DCE', Endpoint: 'ECD', Network: 'CDE', Cloud: 'DEC' };
function symbolsFor(domain, n) { const [a, b, c] = MIX[domain] || 'DCE', pat = [a, a, b, c, b, a, c, a, b, c, a, b, c]; return pat.slice(0, n); }
// Two ways to make the dice. Default (the standard-d6 refactor, 2026-10-30): every die is a normal pip d6 that
// reads 1–2 Detect, 3–4 Contain, 5–6 Eradicate. What differs per analyst is which numbers are doubles for them.
// DICE=custom: the earlier custom symbol dice (tuned faces: Hunter and Responder with a third double), with the d20 row.
const KEY = ['D', 'D', 'C', 'C', 'E', 'E'];
const pipDie = dbl => KEY.map((s, i) => [s, dbl.includes(i + 1) ? 2 : 1]);
// Doubles by analyst. Every other die (the solo crew die, the Triage agent die) doubles only on a 6.
// Signature doubles (2026-10-31): each analyst has one number of their own, plus the 6 everyone has. Was three numbers
// each (Hunter 1 2 6, Responder 3 4 6, Engineer 2 4 6): half of every analyst's faces, too swingy. Which number
// goes where moved solo wins by a few points at most; the gaps come from the abilities.
const DOUBLES = { HUN: [4, 6], RES: [3, 6], ENG: [1, 6], SOA: [2, 6], PAT: [3, 6], CREW: [6], AGENT: [6] };
const CUSTOM = process.env.DICE === 'custom';
const CUSTOM_DICE = {
  HUN: [['D', 2], ['D', 2], ['D', 1], ['C', 1], ['E', 1], ['E', 2]],
  RES: [['C', 2], ['C', 2], ['C', 1], ['D', 1], ['E', 1], ['D', 2]],
  ENG: [['E', 2], ['E', 2], ['E', 1], ['D', 1], ['C', 1], ['C', 2]],
  SOA: [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 1]],
  PAT: [['C', 1], ['D', 1], ['E', 1], ['C', 2], ['D', 1], ['E', 2]],
};
// DOUBLES_JSON overrides the double numbers (pip dice only): {"HUN":[1,2,6],...,"CREW":[6],"AGENT":[6]}.
if (process.env.DOUBLES_JSON) Object.assign(DOUBLES, JSON.parse(process.env.DOUBLES_JSON));
const DICE = {};
for (const id of ['HUN', 'RES', 'ENG', 'SOA', 'PAT']) DICE[id] = CUSTOM ? CUSTOM_DICE[id] : pipDie(DOUBLES[id]);
// DICE_JSON overrides whole dice as [symbol, count] faces (mostly for the custom dice).
if (process.env.DICE_JSON) Object.assign(DICE, JSON.parse(process.env.DICE_JSON));
const CREW_DIE = CUSTOM ? [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 2]] : pipDie(DOUBLES.CREW);
const AGENT_DIE = CUSTOM ? [['D', 1], ['C', 1], ['E', 1], ['D', 1], ['C', 1], ['E', 1]] : pipDie(DOUBLES.AGENT);
// Solo: two of your own dice plus the crew die (SOLO=mixed, the default). SOLO=own rolls three of your own dice.
const SOLO = process.env.SOLO || 'mixed';
// The row. The d20 system always rolls the d20. The d6 system rolls 2d6 (amber pair) by default, or the d20 with
// DICE=custom or ROW=d20. On 2d6 a row mob comes back if the sum is at most its number, 2–rowTop(d20 top).
const ROW = process.env.ROW || (CUSTOM ? 'd20' : '2d6');
// ROWMAP=tier (default) keeps four tiers apart: d20 top 12+ → 2–8, 10–11 → 2–7, 8–9 → 2–6, 7 or less → 2–5.
// ROWMAP=near picks the k whose 2d6 odds are closest to N/20 (rejected: it collapses every mob to 2–6 or 2–7).
const P2 = k => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b <= k) c++; return c / 36; };
const rowTopNear = N => { let best = 2; for (let k = 2; k <= 12; k++) if (Math.abs(P2(k) - N / 20) < Math.abs(P2(best) - N / 20)) best = k; return best; };
// ROWSHIFT lowers every tier by that much. Default 3 (2026-10-30): with every beaten mob going back to the row, the
// old tiers (8/7/6/5) spiral (shift 2 needs 97 HP for half the games); shift 3 gives 2–5/2–4/2–3 and ~6 comebacks a game.
const ROWSHIFT = +(process.env.ROWSHIFT ?? 3);
const rowTop = N => process.env.ROWMAP === 'near' ? rowTopNear(N) : (N >= 12 ? 8 : N >= 10 ? 7 : N >= 8 ? 6 : 5) - ROWSHIFT;
// PERSIST=always (n6 default, 2026-10-30): a beaten mob always goes back to the row; nothing removes it for good.
// PERSIST=once: the earlier rule, a mob that came back once is gone for good when beaten.
const PERSIST = process.env.PERSIST || 'always';
// NEAR=1 brings back the Hunter's and Responder's one-higher-or-lower matches (n6). Off by default since 2026-10-30.
const NEAR = process.env.NEAR === '1';
// REROLL (n6): 'all' (default, 2026-10-30) lets every player reroll one of their own dice once a round. 'perks'
// gives it to the Hunter (own dice) and the Responder (any crew die) only: solo spread 25 pts, rejected. '0' off.
// The bot rerolls a die that can't do anything.
const REROLL = process.env.REROLL || 'all';
// Situations (n6, 2026-10-30): SIT=1 (default) flips a situation card before every flip after the first, the boss's
// included. SIT=0 turns them off. SITPICK forces options to test whether a choice is real: SITPICK=insider:run,chatter:0.
// Conditions: Rattled (no doubles next fight), Exposed (+1 damage each round anything hits you next fight), Focused
// (once, turn one of your dice to any number).
const SIT = process.env.SIT !== '0';
const SITPICK = Object.fromEntries((process.env.SITPICK || '').split(',').filter(Boolean).map(x => x.split(':')));
// PERKS=new (default, 2026-10-30): the Engineer turns one of their dice to its opposite face once a round; the Hunter's
// 1s match any number on a mob that has come back. PERKS=old: doubles only. FOCUSGAIN: how much better a Focused
// turn must make the round before the bot spends it.
const NEWPERKS = (process.env.PERKS || 'new') === 'new';
const FOCUSGAIN = +(process.env.FOCUSGAIN || 8);
// ENGFLIP: how often the Engineer may turn a die, 'fight' (default: once a round was +14 pts solo) or 'round'.
const ENGFLIP = process.env.ENGFLIP || 'round'; // once a round since 2026-10-31: the turned die counts as one, so no guard loop
// EVASIVE=wild (2026-10-31): only a double hits an Evasive mob, and any double matches it (+19 pts solo, rejected).
// EVASIVE=one: a double of its number takes two as usual; any other double takes one. EVASIVE=exact: a double of
// its number (an analyst without that double could never hit it: ~1.5% of solo games stalled in an unwinnable fight).
const EVASIVE = process.env.EVASIVE || 'one';
// Analyst perks with a decision (defaults 2026-10-31, at HP 14). RESPERK=stand: once a fight, after the roll, pick a
// mob: it deals no damage this round (+6 pts solo). SOAPERK=keep: once a fight, burn an agent and keep it in the
// tray, in place of the extra draw (SOADRAW=0). PATPERK=nudge: once a fight, turn one of your dice one up or down, in
// place of the heals (healing after fights moved the Fixer under 1 pt; choose = heal or draw an agent, no gain).
// ENGDBL=0: the die the Engineer turns counts as one die (ENG solo 64% → 59%). 'old' is each earlier perk.
const NEWITEMS = (process.env.ITEMS || 'new') === 'new'; // the item deck (see KIT below)
const RESPERK = process.env.RESPERK || 'stand', SOAPERK = process.env.SOAPERK || (NEWITEMS ? 'slot' : 'keep'), PATPERK = process.env.PATPERK || 'nudge';
// Baselining (2026-10-31): every alarm prints a harder "Baseline it" condition. When it first flips, on point may set
// BASEDICE more threat dice (its main number's opposite side, 7 − main). Beat it with them and it is baselined: it
// tucks under an agent, which gains its ability while that agent stays in the tray (burning or discarding the agent
// ends it). It still goes back on the row (BASEROW=out: it leaves for good; +12 pts at 2p, no real choice).
// BASES lists which alarms have it: spray (once a round, reroll one more die), druid (comebacks don't hit on
// arrival), mailer (the highest-Damage alarm deals 1 less), imp (on point rolls one more die), wyrmling (add 1 to
// every row roll), mimic (after every won fight, heal 3 split across the crew). BASEPICK=always|never|bot.
const BASE = process.env.BASE !== '0', BASEPICK = process.env.BASEPICK || 'bot', BASEDICE = +(process.env.BASEDICE || 3); // 3 since 2026-11-01 (was 4)
const BASES = (process.env.BASES || 'imp,druid,wyrmling,mimic').split(','); // since 2026-11-01 the Mailer and Sprayer have no Baseline line
const aug = (G, id) => G.aug && G.aug.some(a => a.id === id && G.tray.includes(a.host));
// Items (2026-10-31, ITEMS=new default): the kit deck is items. Agents are passive (always on while held); consumables
// are used once. Each analyst holds 2 (the Soarcerer 3); solo holds 4. Deck: 6 agents (Triage, Containment ×2;
// Enrichment, Recovery ×1) and 10 consumables (×2 each): Surge Playbook (on point rolls 3 more dice), Threat Intel
// Feed (every die matches anything this round), Isolation Script (one die off every alarm), Shift Coffee (heal 6
// split), Change Freeze (skip a row roll). ITEMS=old: the 8 two-sided agent cards and the shared tray of 5.
const USE = NEWITEMS && process.env.TWOSIDED !== '1' ? { triage: 'surge', enrich: 'intel', contain: 'isolate', recover: 'coffee' } : { triage: 'triage', enrich: 'enrich', contain: 'contain', recover: 'recover' };
const AGENTS = ['triage', 'enrich', 'contain', 'recover'], isAgent = t => AGENTS.includes(t);
const KIT = NEWITEMS ? (process.env.KITJSON ? JSON.parse(process.env.KITJSON) : ['triage', 'triage', 'contain', 'contain', 'enrich', 'recover', 'surge', 'surge', 'intel', 'intel', 'isolate', 'isolate', 'coffee', 'coffee', 'freeze', 'freeze']) : ['triage', 'enrich', 'contain', 'recover'];
const slotsOf = G => NEWITEMS ? (G.n === 1 ? +(process.env.SOLOSLOTS || 4) : CREWSLOTS * G.n) + (on(G, 'SOA') && !(G.n === 1 && process.env.SOASOLO === '0') ? 1 : 0) : D.sharedKit + (on(G, 'SOA') ? D.perks.SOA.slot : 0);
// Each item has a holder (G.trayK, parallel to G.tray): 2 slots each (the Soarcerer 3), solo 4. Since 2026-11-01 agents
// work for the whole crew (Containment cuts the highest-Damage alarm for everyone, Recovery heals the crew, Enrichment
// turns any crew die) and TRIAGE=crew: a Triage Agent's holder rolls one more of their own dice. PERSONAL=1: the old
// personal agents (Triage rolls an agent die for its holder, Containment cuts what reaches its holder, Recovery heals it).
const TRIAGE = process.env.TRIAGE || (NEWITEMS ? 'crew' : 'agent'); // crew: the holder's own die (it can pair, guard and hit the boss); agent: an agent die
const CREWSLOTS = +(process.env.CREWSLOTS || 2); // agent slots per player in a crew
const PERSONAL = NEWITEMS && process.env.PERSONAL === '1'; // crew-wide agents since 2026-11-01; PERSONAL=1: agents work only for their holder
const slotsK = (G, k) => G.n === 1 ? slotsOf(G) : CREWSLOTS + (G.team[k] === 'SOA' && process.env.SOASLOT !== '0' ? 1 : 0);
// CONSFREE=1: consumables don't take a slot (slots hold agents); you keep any number of consumables.
const CONSFREE = NEWITEMS && process.env.CONSFREE !== '0';
const held = (G, k) => G.trayK.filter((x, i) => x === k && !(CONSFREE && !isAgent(G.tray[i]))).length;
const activeK = (G, t, k) => G.play.some(m => m.boss && m.kw === 'ai') ? 0 : G.tray.filter((x, i) => x === t && G.trayK[i] === k).length;
function dropItem(G, i) { const [t] = G.tray.splice(i, 1); G.trayK.splice(i, 1); return t; }
// Change Freeze: the bot skips a row roll when two or more alarms wait on the row.
function rowRoll(G, strike) { if (G.tray.includes('freeze') && G.row.length >= +(process.env.FREEZEMIN || (NEWITEMS ? 1 : 2))) { burn(G, 'freeze'); G.stats.freeze = (G.stats.freeze || 0) + 1; return []; } return rollRow(G, strike); }
// n6 (exact numbers, 2026-10-30): the mob card prints the dice to set under it, e.g. 1 2 2 3 + 6. A rolled die takes
// out a die showing exactly its number. A double counts as two dice showing its number, or guards (never both).
// A crew of four adds the card's + die; solo plays the two-player dice. Hunter (vs comebacks) and
// Responder (vs the biggest hitter) match one higher or lower too. N6DICE: dice per analyst (on point +1).
// Bigger crews (2026-10-30, clustered dice): one more threat die showing 6 per player past three. Past two (the
// first exact-numbers rule) left 3p at 36% and 4p at 19% once doubles stopped taking "any one more".
const XFROM = +(process.env.XFROM || 3);
const N6DICE = +(process.env.N6DICE || 1), N6SOLO = +(process.env.N6SOLO || 3);
// Clustered dice (2026-10-30): each mob has a main number and its dice bunch around it, e.g. main 2 prints
// 1 2 2 2 3. Repeats make a double on the main number (it counts as two of that number) worth the most. MAIN
// spreads the prototype's six mobs and the boss across the faces; any other mob takes a main from its id.
// Self-contained: web/build.js lifts this function into the page.
function numbersFor(id, n) {
  const MAIN = { mailer: 2, spray: 4, imp: 1, druid: 3, wyrmling: 5, mimic: 6, wyrm: 3 };
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // Main twice, the one below, the one above, then main again: 2 dice 2 2, 3 dice 1 2 2, 4 dice 1 2 2 3, 5 dice 1 2 2 2 3. At the
  // edges both neighbours are the inside one (main 1: 1 2 2 1 1).
  const m = MAIN[id] || 1 + h % 6, lo = m > 1 ? m - 1 : m + 1, hi = m < 6 ? m + 1 : m - 1, pat = [m, m, lo, hi, m];
  return Array.from({ length: n }, (_, i) => pat[i % 5]);
}
// The dice a mob shows for this crew: its printed dice (one fewer than its d20 hits; the boss two fewer than its
// two-player hits), then a 6 once per player past three.
function slotsFor(m, crew) { const base = numbersFor(m.id, m.base), extra = 6; return [...base, ...Array(Math.max(0, crew - 2)).fill(extra)].slice(0, base.length + Math.max(0, crew - XFROM)); }

function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const needFor = (sys, m, n) => sys === 'd6' ? symbolsFor(m.domain, m.hits) : sys === 'n6' ? slotsFor(m, n) : null;
function newGame(sys, team, opt) {
  const r = opt.rnd, n = team.length;
  const mk = (m, boss) => {
    const base = boss ? m.hitsBase + D.bossAdd[2] - +(process.env.BOSSLESS ?? 2) : m.hits - +(process.env.MOBLESS ?? (sys === 'n6' ? 2 : 1)); // n6: two fewer than the d20 hits since 2026-10-31
    const hits = sys === 'n6' ? base + Math.max(0, n - XFROM) : boss ? m.hitsBase + D.bossAdd[n] : Math.max(1, m.hits + (D.mobAdd[n] || 0));
    const domain = boss ? 'Identity' : m.domain, o = { id: m.id, name: m.name, boss, def: m.def, dmg: m.dmg, kw: boss ? m.id : m.ability, persist: m.persist, hits, left: hits, base, domain, back: 0, up: 0 };
    o.need = needFor(sys, o, n); return o;
  };
  const mobs = shuffle(D.mobs, r).slice(0, opt.deal || 6).map(m => mk(m));
  return { sys, team, n, r, hp: team.map(() => opt.hp), max: opt.hp, feed: mobs, boss: mk(D.bosses[Math.floor(r() * 3)], true),
    row: [], play: [], trayK: [], kit: shuffle(NEWITEMS ? KIT.slice() : KIT.flatMap(t => [t, t]), r), discard: [], tray: [], point: 0, over: false, win: false,
    stats: { rounds: 0, choice: 0, back: 0, sit: {}, ran: 0, focus: 0, flipped: 0 }, smart: opt.smart !== false,
    cond: team.map(() => ({ rattled: false, exposed: false, focused: false })), sits: shuffle(SITS, r), pending: [], addSix: 0, runNext: false, aug: [] };
}
const d20 = G => 1 + Math.floor(G.r() * 20), d6 = G => Math.floor(G.r() * 6);
const on = (G, id) => G.team.includes(id);
const active = (G, t) => G.play.some(m => m.boss && m.kw === 'ai') ? 0 : G.tray.filter(x => x === t).length;
const dmgOf = (G, m) => m.boss && m.kw === 'wyrm' && m.left > m.hits - 2 ? m.dmg + 2 : m.dmg + (m.kw === 'ramp' ? m.up : 0);
function hurt(G, k, n) { if (n <= 0 || G.over) return; G.hp[k] = Math.max(0, G.hp[k] - n); if (!G.hp[k]) { G.over = true; G.win = false; } }

// Row roll: anything in range comes back at full hits; the two highest-Damage comebacks strike on arrival.
function rollRow(G, strike) {
  if (!G.row.length) return []; const two = G.sys !== 'd20' && ROW === '2d6', r = two ? 2 + d6(G) + d6(G) + (aug(G, 'wyrmling') ? 1 : 0) : d20(G), back = G.row.filter(m => two ? r <= rowTop(m.persist[1]) : r >= m.persist[0] && r <= m.persist[1]);
  G.row = G.row.filter(m => !back.includes(m)); back.forEach(m => { m.left = m.hits; m.need = needFor(G.sys, m, G.n); m.back++; m.up = 0; });
  G.stats.back += back.length;
  if (strike && !aug(G, 'druid')) for (const m of back.slice().sort((a, b) => b.dmg - a.dmg).slice(0, 2)) G.team.forEach((_, k) => hurt(G, k, dmgOf(G, m)));
  return back;
}
function enter(G, m) { G.play.push(m); if (m.kw === 'beacon') for (const b of rollRow(G, true)) enter(G, b); }

// The dice of one round: crew dice (one each, two on point, three solo), plus a die per running Triage Agent.
function roll(G) {
  const dice = [];
  if (G.sys === 'n6') {
    const raw = [];
    G.team.forEach((id, k) => { const nd = (G.n === 1 ? N6SOLO : N6DICE + (k === G.point ? 1 : 0)) + (k === G.point && aug(G, 'imp') ? 1 : 0); for (let i = 0; i < nd; i++) raw.push({ k, crew: true, v: 1 + d6(G), dbl: G.cond[k].rattled ? [] : G.n === 1 && i === nd - 1 && SOLO === 'mixed' ? DOUBLES.CREW : DOUBLES[id] }); });
    if (TRIAGE === 'crew') G.team.forEach((id, k) => { for (let i = 0; i < activeK(G, 'triage', k); i++) raw.push({ k, crew: true, v: 1 + d6(G), dbl: G.cond[k].rattled ? [] : DOUBLES[id] }); });
    // DBLMODE=pair (proposal, 2026-10-31): no number is a double by itself; two of your own dice showing the same
    // number are a double (they take two of it, as they would anyway, or together they guard).
    if (process.env.DBLMODE === 'pair') raw.forEach(r => { r.dbl = process.env.PAIR6 === '1' ? [6] : []; }); // PAIR6=1: a 6 is a double on its own too
    if (REROLL !== '0') rerolls(G, raw);
    if (process.env.DBLMODE === 'pair') for (let i = 0; i < raw.length; i++) { const j = raw.findIndex((r, x) => x > i && r.k === raw[i].k && r.v === raw[i].v && !r.paired && !raw[i].paired); if (j > 0 && !(process.env.PAIR6 === '1' && raw[i].v === 6)) { raw[i].dbl = [raw[i].v]; raw[i].paired = true; raw.splice(j, 1); } }
    if (process.env.PAIRADD !== '0') /* since 2026-10-31: two of your own dice showing the same number are a double */ for (let i = 0; i < raw.length; i++) { const r = raw[i]; if (!r.crew || r.dbl.includes(r.v) || G.cond[r.k].rattled) continue; const j = raw.findIndex((x, y) => y > i && x.crew && x.k === r.k && x.v === r.v && !x.dbl.includes(x.v)); if (j > 0) { raw[i] = { ...r, dbl: [r.v] }; raw.splice(j, 1); G.stats.pairs = (G.stats.pairs || 0) + 1; } }
    if (process.env.RATTLED !== 'fight') G.cond.forEach(c => { c.rattled = false; }); // Rattled lasts one roll
    if (TRIAGE === 'crew') { /* rolled with the crew dice, above */ } else if (PERSONAL) G.team.forEach((_, k) => { for (let i = 0; i < activeK(G, 'triage', k); i++) raw.push({ k, crew: false, v: 1 + d6(G), dbl: DOUBLES.AGENT }); });
    else for (let i = 0; i < active(G, 'triage'); i++) raw.push({ k: G.point, crew: false, v: 1 + d6(G), dbl: DOUBLES.AGENT });
    return choose(G, raw);
  }
  G.team.forEach((id, k) => { const nd = G.n === 1 ? D.soloDice : k === G.point ? 2 : 1;
    for (let i = 0; i < nd; i++) dice.push(G.sys === 'd20' ? { k, crew: true, r: d20(G) } : { k, crew: true, f: (SOLO === 'mixed' && G.n === 1 && i === nd - 1 ? CREW_DIE : DICE[id])[d6(G)] }); });
  for (let i = 0; i < active(G, 'triage'); i++) dice.push(G.sys === 'd20' ? { k: G.point, crew: false, r: d20(G) } : { k: G.point, crew: false, f: AGENT_DIE[d6(G)] });
  return dice;
}
// n6 rerolls: a die is dead if it isn't a double (doubles can always guard) and no mob in play shows its number.
function rerolls(G, raw) {
  const dead = r => !r.dbl.includes(r.v) && !(hunts(G, r.k, r.v) && G.play.some(m => m.back)) && !G.play.some(m => m.need.includes(r.v) && m.kw !== 'hardened');
  const go = r => { if (r) { r.v = 1 + d6(G); G.stats.rerolls = (G.stats.rerolls || 0) + 1; } };
  // all: everyone may reroll one of their own dice once a round (a shared rule instead of two perks).
  if (REROLL === 'all') { G.team.forEach((_, k) => go(raw.find(r => r.k === k && dead(r)))); if (aug(G, 'spray')) go(raw.find(dead)); return; }
  const h = G.team.indexOf('HUN'); if (h >= 0) go(raw.find(r => r.k === h && dead(r)));
  if (on(G, 'RES')) go(raw.find(dead));
}
// The Hunter's 1s are wild on a mob that has come back (PERKS=new).
const hunts = (G, k, v) => NEWPERKS && G.sys === 'n6' && G.team[k] === 'HUN' && v === 1;
// HUNANY=1: the Hunter's 1s match any number on any alarm, not only one that came back.
const huntsAny = () => process.env.HUNANY !== '0'; // default since 2026-10-31 (+11 pts solo); HUNANY=0: came-back alarms only
// n6 choices made after the roll: the Engineer's opposite-face turn and a Focused player's any-number turn. The bot
// tries each and keeps the best round (a Focused turn only when it gains FOCUSGAIN).
function choose(G, raw) {
  // A die the Engineer turned can't guard (it hits): otherwise a turn makes a double, and a guard, every round.
  const build = rs => { const dice = []; rs.forEach(r => { const at = dice.length; n6die(G, dice, r.k, r.crew, r.dbl, r.v); if (r.flip) dice.slice(at).forEach(d => { d.noguard = true; }); }); return dice; };
  if (!G.smart) return build(raw);
  const set = (rs, i, v) => rs.map((x, j) => j === i ? { ...x, v } : x), e = G.team.indexOf('ENG');
  const cands = [{ raw, focus: -1 }];
  if (NEWPERKS && e >= 0 && !G.engUsed) raw.forEach((r, i) => { if (r.crew && r.k === e) cands.push({ raw: raw.map((x, j) => j === i ? { ...x, v: 7 - x.v, flip: true, dbl: process.env.ENGDBL === '1' ? x.dbl : [] } : x), focus: -1, flip: true }); });
  // PATPERK=nudge: once a fight the Fixer turns one of their dice one up or one down.
  const pf = G.team.indexOf('PAT');
  if (PATPERK === 'nudge' && pf >= 0 && !G.patUsed) for (const c of cands.slice()) c.raw.forEach((r, i) => { if (r.crew && r.k === pf) for (const v of [r.v - 1, r.v + 1]) if (v >= 1 && v <= 6) cands.push({ raw: set(c.raw, i, v), focus: c.focus, flip: c.flip, nudge: true }); });
  for (const c of cands.slice()) c.raw.forEach((r, i) => { if (r.crew && G.cond[r.k].focused) for (let v = 1; v <= 6; v++) if (v !== r.v) cands.push({ raw: set(c.raw, i, v), focus: r.k, flip: c.flip }); });
  if (cands.length === 1) return build(raw);
  cands.forEach(c => { c.s = allocations(G, build(c.raw)).reduce((a, b) => Math.max(a, b.score), -Infinity) - (c.focus >= 0 ? FOCUSGAIN : 0) - (c.nudge ? +(process.env.NUDGEGAIN || 4) : 0); });
  const pick = cands.reduce((a, b) => b.s > a.s ? b : a);
  if (pick.focus >= 0) { G.cond[pick.focus].focused = false; G.stats.focus++; }
  if (pick.nudge) { G.patUsed = true; G.stats.nudge = (G.stats.nudge || 0) + 1; }
  if (pick.flip) { G.stats.flipped++; if (ENGFLIP === 'fight') G.engUsed = true; }
  return build(pick.raw);
}
// n6: roll one die into the list. A double counts as two dice showing that number: two entries, the second with
// half: 1 and pair pointing at the first. The pair guards as one (the first half guards; the second then sits out).
function n6die(G, dice, k, crew, dbl, v = 1 + d6(G)) {
  if (!dbl.includes(v)) { dice.push({ k, crew, f: [v, 1] }); return; }
  const a = { k, crew, f: [v, 2], half: 0 }; dice.push(a, { k, crew, f: [v, 2], half: 1, pair: a });
}
// What one die can do: a list of { mob, hits removed } targets, and whether it can guard. d20 doubles block on their own.
function options(G, d, m, enrichLeft) {
  if (!d.crew && (m.boss || m.kw === 'noagent')) return 0;
  if (G.sys === 'd20') {
    const id = G.team[d.k], dbl = d.crew && d.r >= (id === 'ENG' ? D.perks.ENG.dbl : 18);
    if (m.kw === 'hardened' && d.r < 12) return 0;
    let b = (d.boost || 0) + (d.crew ? active(G, 'enrich') * D.enrichBonus + (id === 'HUN' && m.back ? D.perks.HUN.back : 0) + (id === 'RES' && m === top(G) ? D.perks.RES.top : 0) : D.triageBonus);
    return dbl || d.r >= 18 ? 2 : d.r !== 1 && d.r + b >= m.def ? 1 : 0;
  }
  if (G.sys === 'n6') return matchAt(G, d, m, m.need, enrichLeft) < 0 ? 0 : 1;
  // d6: the face must match a symbol still needed. Hunter: any face is wild against comebacks; Responder: Contain
  // faces are wild against the biggest hitter. A running Enrichment Agent turns one die a round into any symbol.
  const [s, c] = d.f, id = d.crew ? G.team[d.k] : null;
  if (m.kw === 'hardened' && c < 2) return 0;
  const wild = d.wildAll || (id === 'HUN' && m.back) || (id === 'RES' && s === 'C' && m === top(G)) || enrichLeft;
  const need = wild ? m.need.length : m.need.filter(x => x === s).length;
  return Math.min(c, need);
}
// n6: which slot this die takes: an exact match first; Hunter/Responder one off; wild (Enrichment) anything.
function matchAt(G, d, m, need, wild) {
  const v = d.f[0], id = d.crew ? G.team[d.k] : null;
  if (m.kw === 'hardened' && d.f[1] < 2) return -1;
  if (m.kw === 'hardened' && EVASIVE === 'wild') return need.length ? 0 : -1;
  // EVASIVE=one: a double of another number still takes out one of its dice (the pair's second half can't).
  if (m.kw === 'hardened' && EVASIVE === 'one' && !need.includes(d.f[0])) return need.length && !d.half ? 0 : -1;
  if (wild || d.wildAll || (d.crew && (m.back || huntsAny()) && hunts(G, d.k, v))) return need.length ? 0 : -1;
  const i = need.indexOf(v); if (i >= 0) return i;
  const adj = NEAR && ((id === 'HUN' && m.back) || (id === 'RES' && m === top(G)));
  return adj ? need.findIndex(x => Math.abs(x - v) === 1) : -1;
}
const GUARDANY = process.env.GUARDANY !== '0'; // since 2026-10-31: a guard covers any player (skill gap 16 → 27 pts at 2p)
const top = G => G.play.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a))[0];
const canGuard = (G, d) => d.crew && (G.sys === 'd20' ? d.r >= D.guard.min && d.r < (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18) : d.f[1] === 2 && !d.half && !d.noguard);
const autoBlock = (G, d) => G.sys === 'd20' && d.crew && d.r >= (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18);

// Damage the crew takes at the end of the round, given who is blocking.
function incoming(G, blocks) {
  const out = G.team.map(() => 0); const cut = PERSONAL ? 0 : active(G, 'contain'), top1 = G.team.map(() => 0);
  const dm = new Map(G.play.map(m => [m, dmgOf(G, m)]));
  for (let i = 0; i < cut; i++) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], Math.max(1, t[1] - D.containCut)); }
  if (aug(G, 'mailer')) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], t[1] - 1); }
  for (const m of G.play) {
    const d = dm.get(m), pierce = m.kw === 'noblock';
    if (m.kw === 'onpoint') { if (pierce || !blocks[G.point]) { out[G.point] += d * 2; top1[G.point] = Math.max(top1[G.point], d * 2); } continue; }
    let ts = G.team.map((_, k) => k); if (m.kw === 'lowest') { const lo = Math.min(...G.hp); ts = ts.filter(k => G.hp[k] === lo); }
    for (const k of ts) if (pierce || !blocks[k]) { out[k] += d; top1[k] = Math.max(top1[k], d); }
  }
  // Personal Containment: what reaches its holder from their biggest hitter is 2 less per card, never below 1.
  if (PERSONAL && G.trayK) G.team.forEach((_, k) => { const c = activeK(G, 'contain', k); if (c && top1[k] > 1) out[k] -= Math.min(top1[k] - 1, c * D.containCut); });
  if (G.cond) G.cond.forEach((c, k) => { if (c.exposed && out[k] > 0) out[k]++; });
  return out;
}
// Every legal way to use this round's dice: each die goes on a mob it can hit, guards, or sits out.
// Returns the end states with the bot's score. The same scorer judges both systems.
function allocations(G, dice) {
  if (Math.pow(G.play.length + 2, dice.length) > +(process.env.ENUM || 200000)) return greedy(G, dice);
  const res = [], hasEnrich = G.sys !== 'd20' && active(G, 'enrich') > 0;
  const rec = (i, left, blocks, enrichUsed, plan) => {
    if (i === dice.length) { res.push({ plan: plan.slice(), left: new Map(left), blocks: blocks.slice(), score: score(G, left, blocks) }); return; }
    const d = dice[i]; let any = false;
    // A guarding pair, or a double spent taking a die of another number off an Evasive mob: its second half sits out.
    if (d.pair && plan.some(p => dice[p[0]] === d.pair && (p[1] === 'guard' || p[1].kw === 'hardened' && !p[1].need.includes(d.f[0])))) { plan.push([i, 'idle', false]); rec(i + 1, left, blocks, enrichUsed, plan); plan.pop(); return; }
    for (const m of G.play) {
      const L = left.get(m); if (!L.n) continue;
      for (const useE of hasEnrich && !enrichUsed && d.crew ? [false, true] : [false]) {
        const h = G.sys === 'd20' ? Math.min(options(G, d, m), L.n) : options(G, d, { ...m, need: L.need }, useE);
        if (!h) continue; any = true;
        const nl = new Map(left); nl.set(m, takeHits(G, m, L, d, h, useE));
        const nb = blocks.slice(); if (autoBlock(G, d)) nb[d.k] = true;
        plan.push([i, m, useE]); rec(i + 1, nl, nb, enrichUsed || useE, plan); plan.pop();
      }
    }
    if (canGuard(G, d)) for (const t of GUARDANY ? G.team.map((_, k) => k) : [d.k]) if (!blocks[t]) { const nb = blocks.slice(); nb[t] = true; plan.push([i, 'guard']); rec(i + 1, left, nb, enrichUsed, plan); plan.pop(); any = true; }
    const nb = blocks.slice(); if (autoBlock(G, d)) nb[d.k] = true;
    plan.push([i, 'idle', any]); rec(i + 1, left, nb, enrichUsed, plan); plan.pop();
  };
  rec(0, new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), G.team.map(() => false), false, []);
  return res;
}
// Too many dice to enumerate (big Triage turns): place dice one at a time, each where it scores best.
function greedy(G, dice) {
  let left = new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), blocks = G.team.map(() => false);
  const guarded = new Set();
  for (const d of dice) {
    if (d.pair && guarded.has(d.pair)) continue;
    if (autoBlock(G, d)) blocks[d.k] = true;
    let best = { s: score(G, left, blocks), left, blocks };
    for (const m of G.play) { const L = left.get(m); if (!L.n) continue; const h = G.sys === 'd20' ? Math.min(options(G, d, m), L.n) : options(G, d, { ...m, need: L.need }, false); if (!h) continue;
      const nl = new Map(left); nl.set(m, takeHits(G, m, L, d, h, false)); const sc = score(G, nl, blocks); if (sc > best.s) best = { s: sc, left: nl, blocks }; }
    if (canGuard(G, d)) for (const t of GUARDANY ? G.team.map((_, k) => k) : [d.k]) if (!blocks[t]) { const nb = blocks.slice(); nb[t] = true; const sc = score(G, left, nb); if (sc > best.s) best = { s: sc, left, blocks: nb, g: true }; }
    if (best.g) guarded.add(d); left = best.left; blocks = best.blocks;
  }
  return [{ plan: [], left, blocks, score: score(G, left, blocks), greedy: true }];
}
function takeHits(G, m, L, d, h, wild) {
  if (G.sys === 'd20') return { n: L.n - h, need: null };
  if (G.sys === 'n6') { const need = L.need.slice(), i = matchAt(G, d, m, need, wild); if (i >= 0) need.splice(i, 1); return { n: need.length, need }; }
  const need = L.need.slice(); const id = d.crew ? G.team[d.k] : null;
  for (let j = 0; j < h; j++) { let i = need.indexOf(d.f[0]); if (i < 0 && (wild || d.wildAll || (id === 'HUN' && m.back) || (id === 'RES' && d.f[0] === 'C' && m === top(G)))) i = 0; if (i < 0) break; need.splice(i, 1); }
  return { n: need.length, need };
}
// The bot's judgement of an end state: kills weighted by damage, progress, then damage taken (lethal is a disaster).
function score(G, left, blocks) {
  let s = 0; const alive = [];
  for (const m of G.play) { const L = left.get(m), w = dmgOf(G, m) + 1; if (!L.n) s += 10 * w + 5; else { s += (m.left - L.n) * w; alive.push(m); } }
  const saved = G.play; G.play = alive; const inc = incoming(G, blocks); G.play = saved;
  inc.forEach((x, k) => { s -= 3 * x; if (x >= G.hp[k]) s -= 1000; });
  return s;
}

function fight(G, mobs) {
  G.play = []; G.engUsed = false; G.resUsed = false; G.patUsed = false; G.soaKeep = (SOAPERK === 'keep' || G.n === 1 && process.env.SOASOLOKEEP === '1') && on(G, 'SOA'); G.soaRoll = G.n === 1 && (process.env.SOASOLOKEEP || 'roll') === 'roll' && on(G, 'SOA'); mobs.forEach(m => enter(G, m)); let round = 0;
  while (!G.over && G.play.length) {
    round++; G.stats.rounds++; if (round > 200) { G.over = true; G.win = false; G.stats.stall = 1; return; } /* a fight nobody can end */ if (G.play.some(m => m.boss)) G.stats.bossR = (G.stats.bossR || 0) + 1; if (round > 1) for (const b of rowRoll(G, true)) enter(G, b); if (G.over) return;
    const boss = G.play.some(m => m.boss);
    const free = G.soaKeep;
    const used = NEWITEMS && process.env.ITEMBOT !== 'old', dl = G.play.reduce((a, m) => a + m.left, 0); // consumables have no other use: spend them
    // LOOSE=1: spend freely (a held consumable does nothing, and a full hand discards new draws).
    const loose = used && process.env.LOOSE !== '0';
    if (G.tray.includes(USE.contain) && (loose ? dl >= 4 : G.play.length >= (free || used ? 2 : 3) || boss && G.play.length >= 2)) burn(G, USE.contain);
    if (G.tray.includes(USE.recover) && Math.min(...G.hp) <= (loose ? G.max - D.recoverBurn : G.max * (G.soaKeep || used ? 0.6 : 0.4))) burn(G, USE.recover);
    let dice = roll(G);
    // SOLO_REROLL=1: playing solo, once a round reroll one crew die that can't hit anything.
    if (process.env.SOLO_REROLL && G.n === 1 && G.sys === 'd6') { const i = dice.findIndex(d => d.crew && G.play.every(m => !options(G, d, m))); if (i >= 0) dice[i] = { ...dice[i], f: (G.r() < 1 / 3 ? CREW_DIE : DICE[G.team[0]])[d6(G)] }; }
    if ((G.soaKeep || used) && !boss && G.tray.includes(USE.triage) && dl >= +(process.env.SURGEMIN || (loose ? 3 : 5))) { burn(G, USE.triage); for (let i = 0; i < 3; i++) n6die(G, dice, G.point, true, DOUBLES[G.team[G.point]]); }
    if (boss && G.tray.includes(USE.triage)) { burn(G, USE.triage); for (let i = 0; i < 3; i++) { const id = G.team[G.point]; if (G.sys === 'n6') n6die(G, dice, G.point, true, DOUBLES[id]); else dice.push(G.sys === 'd20' ? { k: G.point, crew: true, r: d20(G) } : { k: G.point, crew: true, f: DICE[id][d6(G)] }); } }
    let wildAll = false; if ((boss || used && dl >= +(process.env.INTELMIN || (loose ? 4 : 6))) && G.tray.includes(USE.enrich)) { burn(G, USE.enrich); wildAll = true; }
    if (G.over || !G.play.length) break;
    if (wildAll) dice = dice.map(d => G.sys === 'd20' ? { ...d, r: d.r, boost: 5 } : d);
    const all = allocations(G, wildAll && G.sys !== 'd20' ? dice.map(d => ({ ...d, wildAll: true })) : dice);
    // A real choice: two allocations that use every usable die end in states the bot scores differently.
    const full = all.filter(a => a.plan.every(p => p[1] !== 'idle' || !p[2]));
    if (full.length > 1 && full.reduce((a, b) => Math.max(a, b.score), -Infinity) - full.reduce((a, b) => Math.min(a, b.score), Infinity) > 0.5) G.stats.choice++;
    const pick = G.smart ? all.reduce((a, b) => b.score > a.score ? b : a) : full[Math.floor(G.r() * full.length)] || all[0];
    for (const m of G.play) { const L = pick.left.get(m); m.left = L.n; m.need = L.need; }
    const beaten = G.play.filter(m => !m.left), alive = G.play.filter(m => m.left);
    for (const m of beaten) {
      if (m.boss) { if (m.kw === 'apt' && !m.rose) { m.rose = true; m.left = 2; m.need = G.sys === 'd6' ? ['D', 'C'] : G.sys === 'n6' ? numbersFor(m.id, 2) : null; alive.push(m); continue; } G.over = true; G.win = true; return; }
      if (m.baselining) { m.baselining = false; G.stats.baselined = (G.stats.baselined || 0) + 1; const host = G.tray.filter(isAgent).pop(); G.aug.push({ id: m.id, host: host || null, pend: !host }); if (process.env.BASEROW === 'out') continue; }
      if (G.sys === 'n6' && PERSIST === 'always') { G.row.push(m); continue; }
      const gone = on(G, 'HUN') && m.back > 0; if (!gone && m.back < 1) G.row.push(m);
    }
    G.play = alive;
    let inc = incoming(G, pick.blocks);
    if (RESPERK === 'stand' && on(G, 'RES') && !G.resUsed && G.play.length) { // stand down the mob that would hurt most, when it matters
      const saved = G.play, opts = saved.map(m => { G.play = saved.filter(x => x !== m); const o = incoming(G, pick.blocks); return [m, o]; }); G.play = saved;
      const best = opts.reduce((a, b) => b[1].reduce((x, y) => x + y, 0) < a[1].reduce((x, y) => x + y, 0) ? b : a), cut = inc.reduce((x, y) => x + y, 0) - best[1].reduce((x, y) => x + y, 0);
      if (cut >= +(process.env.RESMIN || 6) || inc.some((x, k) => x >= G.hp[k])) { inc = best[1]; G.resUsed = true; G.stats.stand = (G.stats.stand || 0) + 1; }
    }
    inc.forEach((x, k) => hurt(G, k, x)); if (G.over) return;
    for (const m of G.play) { m.up++; if (m.kw === 'regen' && m.left < m.hits) { m.left++; if (m.need) m.need.push(G.sys === 'n6' ? slotsFor(m, G.n)[m.need.length] : symbolsFor(m.domain, m.hits)[m.need.length]); } }
  }
  // Rattled and Exposed last one fight.
  G.cond.forEach(c => { c.rattled = false; c.exposed = false; });
  // Won fight: heals, then kit.
  if (on(G, 'PAT') && PATPERK !== 'nudge') { if (PATPERK === 'choose' && Math.min(...G.hp) > G.max - +(process.env.PATMIN || 4)) { draw(G, +(process.env.PATDRAW || 1)); G.stats.patDraw = (G.stats.patDraw || 0) + 1; } else spread(G, +(process.env.PATHEAL || D.perks.PAT.fight)); }
  if (aug(G, 'mimic')) spread(G, +(process.env.BASEHEAL || 5));
  if (PERSONAL) G.team.forEach((_, k) => { G.hp[k] = Math.min(G.max, G.hp[k] + activeK(G, 'recover', k) * D.recoverHeal); });
  else spread(G, G.tray.filter(x => x === 'recover').length * (D.recoverHeal + (on(G, 'PAT') && (PATPERK !== 'nudge' || process.env.PATREC === '1') ? D.perks.PAT.recover : 0)));
  draw(G, (process.env.DRAWS ? (G.n === 1 ? +process.env.DRAWS.split(',')[0] : +process.env.DRAWS.split(',')[1] * (process.env.DRAWPER === '1' ? G.n : 1)) : G.n === 1 ? D.kitSolo : D.kitPerFight) + (on(G, 'SOA') ? +(process.env.SOADRAW ?? (SOAPERK === 'keep' || NEWITEMS ? 0 : D.perks.SOA.draw)) + (G.n === 1 ? +(process.env.SOASOLODRAW || 0) : 0) : 0) + (G.bonusDraw || 0)); G.bonusDraw = 0;
}
function spread(G, n) { for (let i = 0; i < n; i++) { const k = G.hp.indexOf(Math.min(...G.hp)); if (G.hp[k] >= G.max) return; G.hp[k]++; } }
function burn(G, t) {
  if (G.aug && !G.soaKeep) { const i = G.aug.findIndex(a => a.host === t); if (i >= 0 && G.tray.filter(x => x === t).length <= 1) G.aug.splice(i, 1); }
  G.stats.used = G.stats.used || {}; G.stats.used[t] = (G.stats.used[t] || 0) + 1;
  const lucky = G.soaRoll && !isAgent(t) && DOUBLES.SOA.includes(1 + d6(G)); // SOASOLOKEEP=roll: a double (2 or 6) keeps it
  if (lucky) G.stats.kept = (G.stats.kept || 0) + 1; else if (G.soaKeep) { G.soaKeep = false; G.stats.kept = (G.stats.kept || 0) + 1; } else { dropItem(G, G.tray.indexOf(t)); G.discard.push(t); }
  if (t === USE.contain) for (const m of G.play.slice()) { if (m.boss) { m.left = Math.max(1, m.left - 1); if (m.need) m.need.pop(); continue; } m.left--; if (m.need) m.need.pop(); if (!m.left) { G.play = G.play.filter(x => x !== m); if (m.back < 1 || (G.sys === 'n6' && PERSIST === 'always')) G.row.push(m); } }
  if (t === USE.recover) spread(G, D.recoverBurn);
}
function draw(G, n) {
  const cap = slotsOf(G);
  for (let i = 0; i < n; i++) { if (!G.kit.length) { G.kit = shuffle(G.discard, G.r); G.discard = []; } const c = G.kit.pop(); if (!c) return; // The bot gives an item to whoever holds fewest (Triage to on point first). Full: an agent replaces a consumable.
    const ks = G.team.map((_, k) => k).filter(k => held(G, k) < slotsK(G, k)).sort((a, b) => held(G, a) - held(G, b) || (b === G.point) - (a === G.point));
    let owner = !NEWITEMS ? (G.tray.length < cap ? 0 : -1) : CONSFREE && !isAgent(c) ? G.point : ks.length ? ks[0] : -1;
    if (owner < 0 && NEWITEMS && isAgent(c)) { const j = G.tray.findIndex(x => !isAgent(x)); if (j >= 0) { owner = G.trayK[j]; G.discard.push(dropItem(G, j)); } }
    if (owner >= 0) { G.tray.push(c); G.trayK.push(owner); if (isAgent(c)) (G.aug || []).filter(a => a.pend).forEach(a => { a.host = c; a.pend = false; }); } else G.discard.push(c); }
}
// ---- Situations (n6) ------------------------------------------------------------------------------------------
// One flips before every flip after the first (the boss's too), once who's on point is picked. Six cards, one each.
const SITS = ['insider', 'pager', 'usb', 'chatter', 'lateral', 'patch'];
const rollN = (G, n) => Array.from({ length: n }, () => 1 + d6(G));
function situation(G) {
  const s = G.sits.pop(); if (!s) return;
  const p = G.point, f = SITPICK[s], lo = Math.min(...G.hp), next = G.feed[G.feed.length - 1]; let pick;
  if (s === 'insider') { // Stay or run: hold the room (on point is Exposed; win the fight, draw an agent) or the next mob goes on the row unfought.
    pick = !next ? 'stay' : f || (next.dmg <= 1 || G.hp[p] <= 8 ? 'run' : 'stay');
    if (pick === 'stay') { G.cond[p].exposed = true; G.bonusDraw = 1; } else { G.runNext = true; if (process.env.RUNHIT !== '0') G.team.forEach((_, k) => hurt(G, k, next.dmg)); }
  }
  if (s === 'pager') { // Ride it out (everyone loses 2) or mute it (the next mob sets one more threat die, a 6).
    pick = f || (lo <= 8 ? 'mute' : 'ride');
    if (pick === 'ride') G.team.forEach((_, k) => hurt(G, k, 2)); else G.addSix++;
  }
  if (s === 'usb') { // A grab: on point rolls 3. Any pair: draw an agent and become Focused. No pair: Rattled.
    pick = f || 'grab';
    if (pick === 'grab') { const r = rollN(G, 3); if (new Set(r).size < 3) { draw(G, +(process.env.USBDRAW || 2)); G.cond[p].focused = true; pick = 'grab won'; } else { G.cond[p].rattled = true; pick = 'grab lost'; } }
  }
  if (s === 'chatter') { // A grab: on point rolls 0–4 dice. Any 6: draw two agents. No 6: lose 1 HP per die rolled.
    const k = f != null ? +f : G.hp[p] > 12 ? 3 : G.hp[p] > 6 ? 2 : 0; pick = 'roll ' + k;
    if (k) { if (rollN(G, k).includes(6)) { draw(G, 2); pick += ' won'; } else { hurt(G, p, k); pick += ' lost'; } }
  }
  if (s === 'lateral') { pick = 'event'; G.pending.push(...rollRow(G, true)); } // Roll for the row now; comebacks join the next fight.
  if (s === 'patch') { // Take a breather (everyone heals 2) or raid the supply closet (draw an agent).
    pick = f || (lo <= G.max - 4 ? 'heal' : 'agent');
    if (pick === 'heal') G.hp = G.hp.map(h => Math.min(G.max, h + 2)); else draw(G, 1);
  }
  const t = G.stats.sit[s] = G.stats.sit[s] || {}; t[pick] = (t[pick] || 0) + 1;
}
function play(sys, team, opt) {
  const G = newGame(sys, team, opt);
  for (const q of G.team.map((_, i) => i).slice(0, G.n === 1 ? D.quickStartSolo : D.quickStartAgent)) draw(G, 1);
  if (G.n === 1 && NEWITEMS) draw(G, +(process.env.QSOLO || 2) - 1); // QSOLO: items a solo player starts with (2 since 2026-11-01)
  const sits = SIT && G.sys === 'n6';
  for (let f = 0; !G.over; f++) {
    G.point = G.hp.indexOf(Math.max(...G.hp));
    if (sits && f) { situation(G); if (G.over) break; }
    let m = G.feed.pop();
    if (m && G.runNext) { G.row.push(m); G.stats.ran++; m = G.feed.pop(); } G.runNext = false;
    const boss = !m; if (boss) { m = G.boss; G.stats.boss = 1; }
    if (BASE && m && !boss && !m.back && BASES.includes(m.id) && (BASEPICK === 'always' || BASEPICK === 'bot' && Math.min(...G.hp) >= G.max * +(process.env.BASEHP || 0.8))) {
      const v = 7 - numbersFor(m.id, 1)[0], nb = BASEDICE + (process.env.BASEPLUS !== '1' ? 0 : Math.max(0, G.n - XFROM)); m.need.push(...Array(nb).fill(v)); m.left += nb; m.baselining = true; G.stats.baselines = (G.stats.baselines || 0) + 1; }
    if (G.addSix) { m.need.push(...Array(G.addSix).fill(6)); m.left += G.addSix; G.addSix = 0; }
    const back = rowRoll(G, !boss); if (G.over) break;
    fight(G, [m, ...G.pending, ...back]); G.pending = [];
    if (boss) break;
  }
  return G;
}

module.exports = { SITS, play, rng, DICE, symbolsFor, numbersFor, slotsFor, XFROM, ROWSHIFT, pipDie, rowTop, KEY, DOUBLES };

if (require.main === module) {
  const N = +(process.env.N || 600), TEAMS = { 1: [['HUN'], ['RES'], ['ENG'], ['SOA']], 2: [['HUN', 'RES'], ['ENG', 'SOA'], ['HUN', 'ENG'], ['RES', 'SOA'], ['HUN', 'SOA'], ['RES', 'ENG']], 4: [['HUN', 'RES', 'ENG', 'SOA']] }; // the Fixer is gone (2026-10-31)
  const run = (sys, teams, hp, smart = true) => { let w = 0, rounds = 0, choice = 0, back = 0, early = 0, seed = 5; for (let g = 0; g < N; g++) { const G = play(sys, teams[g % teams.length], { hp, rnd: rng(seed++ * 2654435761), smart }); w += G.win; rounds += G.stats.rounds; choice += G.stats.choice; back += G.stats.back; early += !G.win && !G.stats.boss; } return { win: w / N, choice: choice / rounds, rounds: rounds / N, back: back / N, early: early / Math.max(1, N - w) }; };
  // Tune HP per system so the smart bot wins about half its two-player games: spreads only compare at equal odds.
  const tune = sys => { let lo = 5, hi = 200; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (run(sys, TEAMS[2], mid).win < 0.5) lo = mid; else hi = mid; } return hi; };
  const pct = x => Math.round(x * 100) + '%';
  for (const sys of (process.env.SYS || 'd20,n6').split(',')) {
    const hp = process.env.HP ? +process.env.HP : tune(sys); console.log(`\n== ${sys} · HP ${hp} ${process.env.HP ? '(set by HP)' : '(tuned to ~50% at 2p)'} ==`);
    for (const n of [1, 2, 4]) { const s = run(sys, TEAMS[n], hp), r = run(sys, TEAMS[n], hp, false); console.log(`${n}p  win ${pct(s.win)} | random placement ${pct(r.win)} (skill gap ${Math.round((s.win - r.win) * 100)} pts) | rounds with a real dice choice ${pct(s.choice)} | rounds ${s.rounds.toFixed(1)} | comebacks ${s.back.toFixed(1)} | losses before the boss ${pct(s.early)}`); }
    const solo = ['HUN', 'RES', 'ENG', 'SOA'].map(id => [id, run(sys, [[id]], hp).win]);
    console.log('solo by analyst: ' + solo.map(([id, w]) => `${id} ${pct(w)}`).join(' · ') + `  (spread ${Math.round((Math.max(...solo.map(x => x[1])) - Math.min(...solo.map(x => x[1]))) * 100)} pts)`);
    const ids = ['HUN', 'RES', 'ENG', 'SOA'], pairs = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pairs.push([[ids[i], ids[j]], run(sys, [[ids[i], ids[j]]], hp).win]);
    pairs.sort((a, b) => a[1] - b[1]); console.log(`pairs: ${pct(pairs[0][1])} (${pairs[0][0].join('+')}) to ${pct(pairs[pairs.length - 1][1])} (${pairs[pairs.length - 1][0].join('+')})`);
  }
}
