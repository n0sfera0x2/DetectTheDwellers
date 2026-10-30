// Chapter dice prototype: the same cut-down shift played several ways, to decide whether d6s (Escape the Dark
// Castle's chapter dice) beat the current d20 + bonus ≥ Defense system.
//   d20: today's rules. Hit = d20 + bonus ≥ Defense; 18–20 is two hits and blocks; a 14+ crew die can guard.
//   n6 (default, exact numbers, 2026-10-30): the mob card prints the dice to set under it. A rolled die takes out a
//        die showing exactly its number; a double takes its match plus any one more, or guards. Crews of 3–4 add
//        the card's extra number once per player past two. The persistence row rolls 2d6.
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
const DOUBLES = { HUN: [1, 2, 6], RES: [3, 4, 6], ENG: [2, 4, 6], SOA: [1, 6], PAT: [3, 6], CREW: [6], AGENT: [6] };
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
const rowTop = N => process.env.ROWMAP === 'near' ? rowTopNear(N) : (N >= 12 ? 8 : N >= 10 ? 7 : N >= 8 ? 6 : 5);
const KIT = ['triage', 'enrich', 'contain', 'recover'];
// n6 (exact numbers, 2026-10-30): the mob card prints the dice to set under it, e.g. 2 4 5 + 3. A rolled die takes
// out a die showing exactly its number. A double takes its match plus any one more, or guards. Crews of 3–4 add
// the card's extra number once per player past two; solo plays the two-player dice. Hunter (vs comebacks) and
// Responder (vs the biggest hitter) match one higher or lower too. N6DICE: dice per analyst (on point +1).
const N6DICE = +(process.env.N6DICE || 1), N6SOLO = +(process.env.N6SOLO || 3);
function numbersFor(id, n) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [], cnt = [0, 0, 0, 0, 0, 0, 0];
  while (out.length < n) { h = (h * 1103515245 + 12345) >>> 0; const v = 1 + (h >>> 16) % 6; if (cnt[v] < 2) { cnt[v]++; out.push(v); } }
  return out;
}
// The dice a mob shows for this crew: its printed dice, then its extra number once per player past two.
function slotsFor(m, crew) { const base = numbersFor(m.id, m.base), extra = numbersFor(m.id + '+', 1)[0]; return [...base, ...Array(Math.max(0, crew - 2)).fill(extra)]; }

function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const needFor = (sys, m, n) => sys === 'd6' ? symbolsFor(m.domain, m.hits) : sys === 'n6' ? slotsFor(m, n) : null;
function newGame(sys, team, opt) {
  const r = opt.rnd, n = team.length;
  const mk = (m, boss) => {
    const base = boss ? m.hitsBase + D.bossAdd[2] : m.hits;
    const hits = sys === 'n6' ? base + Math.max(0, n - 2) : boss ? m.hitsBase + D.bossAdd[n] : Math.max(1, m.hits + (D.mobAdd[n] || 0));
    const domain = boss ? 'Identity' : m.domain, o = { id: m.id, name: m.name, boss, def: m.def, dmg: m.dmg, kw: boss ? m.id : m.ability, persist: m.persist, hits, left: hits, base, domain, back: 0, up: 0 };
    o.need = needFor(sys, o, n); return o;
  };
  const mobs = shuffle(D.mobs, r).slice(0, opt.deal || 6).map(m => mk(m));
  return { sys, team, n, r, hp: team.map(() => opt.hp), max: opt.hp, feed: mobs, boss: mk(D.bosses[Math.floor(r() * 3)], true),
    row: [], play: [], kit: shuffle(KIT.flatMap(t => [t, t]), r), discard: [], tray: [], point: 0, over: false, win: false,
    stats: { rounds: 0, choice: 0, back: 0 }, smart: opt.smart !== false };
}
const d20 = G => 1 + Math.floor(G.r() * 20), d6 = G => Math.floor(G.r() * 6);
const on = (G, id) => G.team.includes(id);
const active = (G, t) => G.play.some(m => m.boss && m.kw === 'ai') ? 0 : G.tray.filter(x => x === t).length;
const dmgOf = (G, m) => m.boss && m.kw === 'wyrm' && m.left > m.hits - 2 ? m.dmg + 2 : m.dmg + (m.kw === 'ramp' ? m.up : 0);
function hurt(G, k, n) { if (n <= 0 || G.over) return; G.hp[k] = Math.max(0, G.hp[k] - n); if (!G.hp[k]) { G.over = true; G.win = false; } }

// Row roll: anything in range comes back at full hits; the two highest-Damage comebacks strike on arrival.
function rollRow(G, strike) {
  if (!G.row.length) return []; const two = G.sys !== 'd20' && ROW === '2d6', r = two ? 2 + d6(G) + d6(G) : d20(G), back = G.row.filter(m => two ? r <= rowTop(m.persist[1]) : r >= m.persist[0] && r <= m.persist[1]);
  G.row = G.row.filter(m => !back.includes(m)); back.forEach(m => { m.left = m.hits; m.need = needFor(G.sys, m, G.n); m.back++; m.up = 0; });
  G.stats.back += back.length;
  if (strike) for (const m of back.slice().sort((a, b) => b.dmg - a.dmg).slice(0, 2)) G.team.forEach((_, k) => hurt(G, k, dmgOf(G, m)));
  return back;
}
function enter(G, m) { G.play.push(m); if (m.kw === 'beacon') for (const b of rollRow(G, true)) enter(G, b); }

// The dice of one round: crew dice (one each, two on point, three solo), plus a die per running Triage Agent.
function roll(G) {
  const dice = [];
  if (G.sys === 'n6') {
    const die = (k, crew, dbl) => { const v = 1 + d6(G); return { k, crew, f: [v, dbl.includes(v) ? 2 : 1] }; };
    G.team.forEach((id, k) => { const nd = G.n === 1 ? N6SOLO : N6DICE + (k === G.point ? 1 : 0); for (let i = 0; i < nd; i++) dice.push(die(k, true, G.n === 1 && i === nd - 1 && SOLO === 'mixed' ? DOUBLES.CREW : DOUBLES[id])); });
    for (let i = 0; i < active(G, 'triage'); i++) dice.push(die(G.point, false, DOUBLES.AGENT));
    return dice;
  }
  G.team.forEach((id, k) => { const nd = G.n === 1 ? D.soloDice : k === G.point ? 2 : 1;
    for (let i = 0; i < nd; i++) dice.push(G.sys === 'd20' ? { k, crew: true, r: d20(G) } : { k, crew: true, f: (SOLO === 'mixed' && G.n === 1 && i === nd - 1 ? CREW_DIE : DICE[id])[d6(G)] }); });
  for (let i = 0; i < active(G, 'triage'); i++) dice.push(G.sys === 'd20' ? { k: G.point, crew: false, r: d20(G) } : { k: G.point, crew: false, f: AGENT_DIE[d6(G)] });
  return dice;
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
  if (G.sys === 'n6') { const i = matchAt(G, d, m, m.need, enrichLeft); return i < 0 ? 0 : d.f[1] === 2 ? Math.min(2, m.need.length) : 1; }
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
  if (wild || d.wildAll) return need.length ? 0 : -1;
  const i = need.indexOf(v); if (i >= 0) return i;
  const adj = (id === 'HUN' && m.back) || (id === 'RES' && m === top(G));
  return adj ? need.findIndex(x => Math.abs(x - v) === 1) : -1;
}
const top = G => G.play.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a))[0];
const canGuard = (G, d) => d.crew && (G.sys === 'd20' ? d.r >= D.guard.min && d.r < (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18) : d.f[1] === 2);
const autoBlock = (G, d) => G.sys === 'd20' && d.crew && d.r >= (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18);

// Damage the crew takes at the end of the round, given who is blocking.
function incoming(G, blocks) {
  const out = G.team.map(() => 0); const cut = active(G, 'contain');
  const dm = new Map(G.play.map(m => [m, dmgOf(G, m)]));
  for (let i = 0; i < cut; i++) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], Math.max(1, t[1] - D.containCut)); }
  for (const m of G.play) {
    const d = dm.get(m), pierce = m.kw === 'noblock';
    if (m.kw === 'onpoint') { if (pierce || !blocks[G.point]) out[G.point] += d * 2; continue; }
    let ts = G.team.map((_, k) => k); if (m.kw === 'lowest') { const lo = Math.min(...G.hp); ts = ts.filter(k => G.hp[k] === lo); }
    for (const k of ts) if (pierce || !blocks[k]) out[k] += d;
  }
  return out;
}
// Every legal way to use this round's dice: each die goes on a mob it can hit, guards, or sits out.
// Returns the end states with the bot's score. The same scorer judges both systems.
function allocations(G, dice) {
  if (Math.pow(G.play.length + 2, dice.length) > 40000) return greedy(G, dice);
  const res = [], hasEnrich = G.sys !== 'd20' && active(G, 'enrich') > 0;
  const rec = (i, left, blocks, enrichUsed, plan) => {
    if (i === dice.length) { res.push({ plan: plan.slice(), left: new Map(left), blocks: blocks.slice(), score: score(G, left, blocks) }); return; }
    const d = dice[i]; let any = false;
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
    if (canGuard(G, d) && !blocks[d.k]) { const nb = blocks.slice(); nb[d.k] = true; plan.push([i, 'guard']); rec(i + 1, left, nb, enrichUsed, plan); plan.pop(); any = true; }
    const nb = blocks.slice(); if (autoBlock(G, d)) nb[d.k] = true;
    plan.push([i, 'idle', any]); rec(i + 1, left, nb, enrichUsed, plan); plan.pop();
  };
  rec(0, new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), G.team.map(() => false), false, []);
  return res;
}
// Too many dice to enumerate (big Triage turns): place dice one at a time, each where it scores best.
function greedy(G, dice) {
  let left = new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), blocks = G.team.map(() => false);
  for (const d of dice) {
    if (autoBlock(G, d)) blocks[d.k] = true;
    let best = { s: score(G, left, blocks), left, blocks };
    for (const m of G.play) { const L = left.get(m); if (!L.n) continue; const h = G.sys === 'd20' ? Math.min(options(G, d, m), L.n) : options(G, d, { ...m, need: L.need }, false); if (!h) continue;
      const nl = new Map(left); nl.set(m, takeHits(G, m, L, d, h, false)); const sc = score(G, nl, blocks); if (sc > best.s) best = { s: sc, left: nl, blocks }; }
    if (canGuard(G, d) && !blocks[d.k]) { const nb = blocks.slice(); nb[d.k] = true; const sc = score(G, left, nb); if (sc > best.s) best = { s: sc, left, blocks: nb }; }
    left = best.left; blocks = best.blocks;
  }
  return [{ plan: [], left, blocks, score: score(G, left, blocks), greedy: true }];
}
function takeHits(G, m, L, d, h, wild) {
  if (G.sys === 'd20') return { n: L.n - h, need: null };
  if (G.sys === 'n6') { const need = L.need.slice(), i = matchAt(G, d, m, need, wild); if (i >= 0) need.splice(i, 1); if (h === 2 && need.length) need.splice(0, 1); return { n: need.length, need }; }
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
  G.play = []; mobs.forEach(m => enter(G, m)); let round = 0;
  while (!G.over && G.play.length) {
    round++; G.stats.rounds++; if (round > 1) for (const b of rollRow(G, true)) enter(G, b); if (G.over) return;
    const boss = G.play.some(m => m.boss);
    if (G.tray.includes('contain') && (G.play.length >= 3 || boss && G.play.length >= 2)) burn(G, 'contain');
    if (G.tray.includes('recover') && Math.min(...G.hp) <= G.max * 0.4) burn(G, 'recover');
    let dice = roll(G);
    // SOLO_REROLL=1: playing solo, once a round reroll one crew die that can't hit anything.
    if (process.env.SOLO_REROLL && G.n === 1 && G.sys === 'd6') { const i = dice.findIndex(d => d.crew && G.play.every(m => !options(G, d, m))); if (i >= 0) dice[i] = { ...dice[i], f: (G.r() < 1 / 3 ? CREW_DIE : DICE[G.team[0]])[d6(G)] }; }
    if (boss && G.tray.includes('triage')) { burn(G, 'triage'); for (let i = 0; i < 3; i++) { const id = G.team[G.point]; dice.push(G.sys === 'd20' ? { k: G.point, crew: true, r: d20(G) } : G.sys === 'n6' ? (v => ({ k: G.point, crew: true, f: [v, DOUBLES[id].includes(v) ? 2 : 1] }))(1 + d6(G)) : { k: G.point, crew: true, f: DICE[id][d6(G)] }); } }
    let wildAll = false; if (boss && G.tray.includes('enrich')) { burn(G, 'enrich'); wildAll = true; }
    if (G.over || !G.play.length) break;
    if (wildAll) dice = dice.map(d => G.sys === 'd20' ? { ...d, r: d.r, boost: 5 } : d);
    const all = allocations(G, wildAll && G.sys !== 'd20' ? dice.map(d => ({ ...d, wildAll: true })) : dice);
    // A real choice: two allocations that use every usable die end in states the bot scores differently.
    const full = all.filter(a => a.plan.every(p => p[1] !== 'idle' || !p[2]));
    if (full.length > 1 && Math.max(...full.map(a => a.score)) - Math.min(...full.map(a => a.score)) > 0.5) G.stats.choice++;
    const pick = G.smart ? all.reduce((a, b) => b.score > a.score ? b : a) : full[Math.floor(G.r() * full.length)] || all[0];
    for (const m of G.play) { const L = pick.left.get(m); m.left = L.n; m.need = L.need; }
    const beaten = G.play.filter(m => !m.left), alive = G.play.filter(m => m.left);
    for (const m of beaten) {
      if (m.boss) { if (m.kw === 'apt' && !m.rose) { m.rose = true; m.left = 2; m.need = G.sys === 'd6' ? ['D', 'C'] : G.sys === 'n6' ? numbersFor(m.id, 2) : null; alive.push(m); continue; } G.over = true; G.win = true; return; }
      const gone = on(G, 'HUN') && m.back > 0; if (!gone && m.back < 1) G.row.push(m);
    }
    G.play = alive;
    const inc = incoming(G, pick.blocks); inc.forEach((x, k) => hurt(G, k, x)); if (G.over) return;
    for (const m of G.play) { m.up++; if (m.kw === 'regen' && m.left < m.hits) { m.left++; if (m.need) m.need.push(G.sys === 'n6' ? slotsFor(m, G.n)[m.need.length] : symbolsFor(m.domain, m.hits)[m.need.length]); } }
  }
  // Won fight: heals, then kit.
  if (on(G, 'PAT')) spread(G, D.perks.PAT.fight);
  spread(G, G.tray.filter(x => x === 'recover').length * (D.recoverHeal + (on(G, 'PAT') ? D.perks.PAT.recover : 0)));
  draw(G, (G.n === 1 ? D.kitSolo : D.kitPerFight) + (on(G, 'SOA') ? D.perks.SOA.draw : 0));
}
function spread(G, n) { for (let i = 0; i < n; i++) { const k = G.hp.indexOf(Math.min(...G.hp)); if (G.hp[k] >= G.max) return; G.hp[k]++; } }
function burn(G, t) {
  G.tray.splice(G.tray.indexOf(t), 1); G.discard.push(t);
  if (t === 'contain') for (const m of G.play.slice()) { if (m.boss) { m.left = Math.max(1, m.left - 1); if (m.need) m.need.pop(); continue; } m.left--; if (m.need) m.need.pop(); if (!m.left) { G.play = G.play.filter(x => x !== m); if (m.back < 1) G.row.push(m); } }
  if (t === 'recover') spread(G, D.recoverBurn);
}
function draw(G, n) {
  const cap = D.sharedKit + (on(G, 'SOA') ? D.perks.SOA.slot : 0);
  for (let i = 0; i < n; i++) { if (!G.kit.length) { G.kit = shuffle(G.discard, G.r); G.discard = []; } const c = G.kit.pop(); if (!c) return; if (G.tray.length < cap) G.tray.push(c); else G.discard.push(c); }
}
function play(sys, team, opt) {
  const G = newGame(sys, team, opt);
  for (const q of G.team.map((_, i) => i).slice(0, G.n === 1 ? D.quickStartSolo : D.quickStartAgent)) draw(G, 1);
  while (!G.over && G.feed.length) { G.point = G.hp.indexOf(Math.max(...G.hp)); const m = G.feed.pop(); const back = rollRow(G, true); if (G.over) break; fight(G, [m, ...back]); }
  if (!G.over) { const back = rollRow(G, false); fight(G, [G.boss, ...back]); }
  return G;
}

module.exports = { play, rng, DICE, symbolsFor, numbersFor, slotsFor, pipDie, rowTop, KEY, DOUBLES };

if (require.main === module) {
  const N = +(process.env.N || 600), TEAMS = { 1: [['HUN'], ['RES'], ['ENG'], ['SOA'], ['PAT']], 2: [['HUN', 'RES'], ['ENG', 'SOA'], ['RES', 'PAT'], ['HUN', 'PAT'], ['SOA', 'PAT'], ['HUN', 'ENG']], 4: [['HUN', 'RES', 'ENG', 'SOA'], ['HUN', 'RES', 'SOA', 'PAT'], ['RES', 'ENG', 'SOA', 'PAT'], ['HUN', 'RES', 'ENG', 'PAT']] };
  const run = (sys, teams, hp, smart = true) => { let w = 0, rounds = 0, choice = 0, back = 0, seed = 5; for (let g = 0; g < N; g++) { const G = play(sys, teams[g % teams.length], { hp, rnd: rng(seed++ * 2654435761), smart }); w += G.win; rounds += G.stats.rounds; choice += G.stats.choice; back += G.stats.back; } return { win: w / N, choice: choice / rounds, rounds: rounds / N, back: back / N }; };
  // Tune HP per system so the smart bot wins about half its two-player games: spreads only compare at equal odds.
  const tune = sys => { let lo = 5, hi = 200; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (run(sys, TEAMS[2], mid).win < 0.5) lo = mid; else hi = mid; } return hi; };
  const pct = x => Math.round(x * 100) + '%';
  for (const sys of (process.env.SYS || 'd20,n6').split(',')) {
    const hp = process.env.HP ? +process.env.HP : tune(sys); console.log(`\n== ${sys} · HP ${hp} ${process.env.HP ? '(set by HP)' : '(tuned to ~50% at 2p)'} ==`);
    for (const n of [1, 2, 4]) { const s = run(sys, TEAMS[n], hp), r = run(sys, TEAMS[n], hp, false); console.log(`${n}p  win ${pct(s.win)} | random placement ${pct(r.win)} (skill gap ${Math.round((s.win - r.win) * 100)} pts) | rounds with a real dice choice ${pct(s.choice)} | rounds ${s.rounds.toFixed(1)} | comebacks ${s.back.toFixed(1)}`); }
    const solo = ['HUN', 'RES', 'ENG', 'SOA', 'PAT'].map(id => [id, run(sys, [[id]], hp).win]);
    console.log('solo by analyst: ' + solo.map(([id, w]) => `${id} ${pct(w)}`).join(' · ') + `  (spread ${Math.round((Math.max(...solo.map(x => x[1])) - Math.min(...solo.map(x => x[1]))) * 100)} pts)`);
    const ids = ['HUN', 'RES', 'ENG', 'SOA', 'PAT'], pairs = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push([[ids[i], ids[j]], run(sys, [[ids[i], ids[j]]], hp).win]);
    pairs.sort((a, b) => a[1] - b[1]); console.log(`pairs: ${pct(pairs[0][1])} (${pairs[0][0].join('+')}) to ${pct(pairs[pairs.length - 1][1])} (${pairs[pairs.length - 1][0].join('+')})`);
  }
}
